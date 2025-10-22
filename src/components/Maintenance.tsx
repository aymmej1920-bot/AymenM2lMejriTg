import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Plus, Wrench, AlertTriangle, Clock, ClipboardCheck, Calendar } from 'lucide-react';
import { MaintenanceEntry, PreDepartureChecklist, DataTableColumn, Vehicle, Resource, Action, Driver } from '../types';
import { showSuccess } from '../utils/toast';
import { formatDate } from '../utils/date';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { maintenanceEntrySchema } from '../types/formSchemas';
import { Button } from './ui/button';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from './ui/dialog';
import DataTable from './DataTable';
import { usePermissions } from '../hooks/usePermissions';
import { LOCAL_STORAGE_KEYS } from '../utils/constants';
import FormField from './forms/FormField';
import { useSupabaseData } from '../hooks/useSupabaseData'; // Import useSupabaseData

type MaintenanceEntryFormData = z.infer<typeof maintenanceEntrySchema>;

interface MaintenanceProps {
  onAdd: (tableName: Resource, maintenanceEntry: Omit<MaintenanceEntry, 'id' | 'user_id' | 'created_at'>, action: Action) => Promise<void>;
  onUpdate: (tableName: Resource, vehicle: { id: string; last_service_date: string; last_service_mileage: number; mileage: number }, action: Action) => Promise<void>;
  onDelete: (tableName: Resource, data: { id: string }, action: Action) => Promise<void>;
  registerRefetch: (resource: Resource, refetch: () => Promise<void>) => void;
}

const Maintenance: React.FC<MaintenanceProps> = ({ onAdd, onUpdate, onDelete, registerRefetch }) => {
  const { canAccess } = usePermissions();

  const { data: maintenanceEntries, isLoading: isLoadingMaintenance, refetch: refetchMaintenance } = useSupabaseData<MaintenanceEntry>('maintenance_entries');
  const { data: vehicles, isLoading: isLoadingVehicles, refetch: refetchVehicles } = useSupabaseData<Vehicle>('vehicles');
  const { data: preDepartureChecklists, isLoading: isLoadingChecklists } = useSupabaseData<PreDepartureChecklist>('pre_departure_checklists');
  const { data: drivers, isLoading: isLoadingDrivers } = useSupabaseData<Driver>('drivers'); // Fetch drivers here

  useEffect(() => {
    registerRefetch('maintenance_entries', refetchMaintenance);
    registerRefetch('vehicles', refetchVehicles); // Register refetch for vehicles as well, since maintenance updates vehicle data
  }, [registerRefetch, refetchMaintenance, refetchVehicles]);

  const [showModal, setShowModal] = useState(false);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');

  const methods = useForm<MaintenanceEntryFormData>({
    resolver: zodResolver(maintenanceEntrySchema),
    defaultValues: {
      vehicle_id: '',
      type: 'Vidange',
      date: new Date().toISOString().split('T')[0],
      mileage: 0,
      cost: 0,
    }
  });

  const { handleSubmit, reset, watch } = methods;

  // Function to reset form and clear saved data
  const resetFormAndClearStorage = useCallback(() => {
    reset({
      vehicle_id: '',
      type: 'Vidange',
      date: new Date().toISOString().split('T')[0],
      mileage: 0,
      cost: 0,
    });
    localStorage.removeItem(LOCAL_STORAGE_KEYS.MAINTENANCE_FORM_DATA);
  }, [reset]);

  // Effect to load saved form data when modal opens for a new maintenance entry
  useEffect(() => {
    if (showModal && !selectedVehicleId) { // Only for new maintenance entry forms (not pre-filled from vehicle)
      const savedFormData = localStorage.getItem(LOCAL_STORAGE_KEYS.MAINTENANCE_FORM_DATA);
      if (savedFormData) {
        try {
          const parsedData = JSON.parse(savedFormData);
          if (parsedData.date) {
            parsedData.date = new Date(parsedData.date).toISOString().split('T')[0];
          }
          reset(parsedData);
        } catch (e) {
          console.error("Failed to parse saved maintenance form data", e);
          localStorage.removeItem(LOCAL_STORAGE_KEYS.MAINTENANCE_FORM_DATA);
        }
      }
    }
  }, [showModal, selectedVehicleId, reset]);

  // Effect to save form data to localStorage whenever it changes (for new maintenance entry forms)
  useEffect(() => {
    if (showModal && !selectedVehicleId) { // Only save for new maintenance entry forms
      const subscription = watch((value) => {
        localStorage.setItem(LOCAL_STORAGE_KEYS.MAINTENANCE_FORM_DATA, JSON.stringify(value));
      });
      return () => subscription.unsubscribe();
    }
  }, [showModal, selectedVehicleId, watch]);

  // Reset form when selectedVehicleId changes (for pre-filling) or when modal closes (for new mode)
  React.useEffect(() => {
    if (selectedVehicleId) {
      reset({
        vehicle_id: selectedVehicleId,
        type: 'Vidange',
        date: new Date().toISOString().split('T')[0],
        mileage: vehicles.find(v => v.id === selectedVehicleId)?.mileage || 0,
        cost: 0,
      });
    } else {
      resetFormAndClearStorage(); // Use the new reset function
    }
  }, [selectedVehicleId, resetFormAndClearStorage, vehicles]);

  // State for filtering for Maintenance History
  const [selectedVehicleFilter, setSelectedVehicleFilter] = useState<string>('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Get unique types for filter options
  const uniqueMaintenanceTypes = useMemo(() => {
    const types = new Set(maintenanceEntries.map(m => m.type));
    return Array.from(types);
  }, [maintenanceEntries]);

  const handleAddMaintenance = (vehicleId?: string) => {
    setSelectedVehicleId(vehicleId || '');
    setShowModal(true);
  };

  const handleEditMaintenance = (maintenanceEntry: MaintenanceEntry) => {
    // For now, DataTable doesn't support editing, but if it did, this would be the handler
    // This function is currently not used by DataTable, but kept for future expansion
    console.log("Edit maintenance entry:", maintenanceEntry);
    // You would typically set editingFuel and show the modal here
    // setEditingFuel(maintenanceEntry);
    // setShowModal(true);
  };

  const handleDeleteMaintenance = async (id: string) => {
    await onDelete('maintenance_entries', { id }, 'delete');
    showSuccess('Entrée de maintenance supprimée avec succès !');
  };

  const onSubmit = async (maintenanceData: MaintenanceEntryFormData) => {
    await onAdd('maintenance_entries', maintenanceData, 'add');
    showSuccess('Entrée de maintenance ajoutée avec succès !');

    // If it's an oil change, update vehicle info
    if (maintenanceData.type === 'Vidange') {
      await onUpdate('vehicles', {
        id: maintenanceData.vehicle_id,
        last_service_date: maintenanceData.date,
        last_service_mileage: maintenanceData.mileage,
        mileage: maintenanceData.mileage, // Also update current mileage
      }, 'edit');
      showSuccess('Informations du véhicule mises à jour après la vidange !');
    }

    setShowModal(false);
    resetFormAndClearStorage(); // Clear saved data on successful submission
  };

  const handleCloseModal = () => {
    setShowModal(false);
    resetFormAndClearStorage(); // Clear saved data on modal close
  };

  const getMaintenanceStatus = (vehicle: Vehicle) => {
    const nextServiceKm = (vehicle.last_service_mileage || 0) + 10000;
    const kmUntilService = nextServiceKm - vehicle.mileage;
    
    if (kmUntilService <= 0) {
      return { text: 'URGENT', class: 'bg-red-100 text-red-800', icon: AlertTriangle };
    } else if (kmUntilService <= 1000) {
      return { text: 'Bientôt', class: 'bg-orange-100 text-orange-800', icon: Clock };
    } else {
      return { text: 'OK', class: 'bg-green-100 text-green-800', icon: Wrench };
    }
  };

  // Filter checklists with issues to address - MOVED TO COMPONENT SCOPE
  const checklistsWithIssues = useMemo(() => {
    return preDepartureChecklists.filter(cl => cl.issues_to_address && cl.issues_to_address.trim() !== '');
  }, [preDepartureChecklists]);

  const renderMaintenanceAlerts = useCallback(() => {
    const upcomingMaintenanceCount = vehicles.filter(vehicle => {
      const nextService = (vehicle.last_service_mileage || 0) + 10000;
      const kmUntilService = nextService - vehicle.mileage;
      return kmUntilService <= 1000 && kmUntilService > 0;
    }).length;

    const urgentMaintenanceCount = vehicles.filter(vehicle => {
      const nextService = (vehicle.last_service_mileage || 0) + 10000;
      const kmUntilService = nextService - vehicle.mileage;
      return kmUntilService <= 0;
    }).length;

    if (urgentMaintenanceCount === 0 && upcomingMaintenanceCount === 0 && checklistsWithIssues.length === 0) {
      return null;
    }

    return (
      <div className="space-y-4 animate-slide-up">
        {urgentMaintenanceCount > 0 && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-r-lg glass">
            <div className="flex items-center">
              <AlertTriangle className="w-5 h-5 text-red-400 mr-3" />
              <div>
                <h3 className="text-red-800 font-semibold">Maintenance Urgente Requise</h3>
                <p className="text-red-700">
                  {urgentMaintenanceCount} véhicule(s) ont dépassé leur échéance de maintenance.
                </p>
              </div>
            </div>
          </div>
        )}
        {upcomingMaintenanceCount > 0 && (
          <div className="bg-orange-50 border-l-4 border-orange-400 p-4 rounded-r-lg glass">
            <div className="flex items-center">
              <Clock className="w-5 h-5 text-orange-400 mr-3" />
              <div>
                <h3 className="text-orange-800 font-semibold">Maintenance à Venir</h3>
                <p className="text-orange-700">
                  {upcomingMaintenanceCount} véhicule(s) nécessitent une maintenance dans moins de 1000 km.
                </p>
              </div>
            </div>
          </div>
        )}
        {checklistsWithIssues.length > 0 && (
          <div className="bg-purple-50 border-l-4 border-purple-400 p-4 rounded-r-lg glass">
            <div className="flex items-center">
              <ClipboardCheck className="w-5 h-5 text-purple-400 mr-3" />
              <div>
                <h3 className="text-purple-800 font-semibold">Points à Traiter (Checklists)</h3>
                <p className="text-purple-700">
                  {checklistsWithIssues.length} checklist(s) contiennent des problèmes à résoudre.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }, [vehicles, checklistsWithIssues]); // Added checklistsWithIssues to dependencies

  const vehicleMaintenanceColumns: DataTableColumn<Vehicle>[] = useMemo(() => [
    { key: 'plate', label: 'Véhicule', sortable: true, defaultVisible: true },
    { key: 'mileage', label: 'Km Actuel', sortable: true, defaultVisible: true, render: (item) => `${item.mileage.toLocaleString()} km` },
    { key: 'last_service_date', label: 'Dernière Vidange', sortable: true, defaultVisible: true, render: (item) => formatDate(item.last_service_date) || 'N/A' },
    { key: 'last_service_mileage', label: 'Km Dernière Vidange', sortable: true, defaultVisible: true, render: (item) => `${(item.last_service_mileage || 0).toLocaleString()} km` },
    { 
      key: 'next_service_km', 
      label: 'Prochaine Vidange', 
      sortable: true, 
      defaultVisible: true, 
      render: (item) => {
        const nextServiceKm = (item.last_service_mileage || 0) + 10000;
        return `${nextServiceKm.toLocaleString()} km`;
      }
    },
    { 
      key: 'status', 
      label: 'Statut', 
      sortable: false, 
      defaultVisible: true, 
<dyad-problem-report summary="21 problems">
<problem file="src/components/Maintenance.tsx" line="3" column="10" code="6133">'FleetData' is declared but its value is never read.</problem>
<problem file="src/components/Maintenance.tsx" line="412" column="34" code="2304">Cannot find name 'data'.</problem>
<problem file="src/components/Maintenance.tsx" line="412" column="52" code="7006">Parameter 'd' implicitly has an 'any' type.</problem>
<problem file="src/components/Summary.tsx" line="33" column="32" code="2304">Cannot find name 'useMemo'.</problem>
<problem file="src/components/checklists/ChecklistForm.tsx" line="9" column="10" code="6133">'FleetData' is declared but its value is never read.</problem>
<problem file="src/components/PreDepartureChecklist.tsx" line="3" column="10" code="6133">'FleetData' is declared but its value is never read.</problem>
<problem file="src/pages/Reports.tsx" line="59" column="10" code="2678">Type '&quot;fuel_entries&quot;' is not comparable to type 'keyof FleetData'.</problem>
<problem file="src/pages/Reports.tsx" line="79" column="10" code="2678">Type '&quot;maintenance_entries&quot;' is not comparable to type 'keyof FleetData'.</problem>
<problem file="src/components/UserManagement.tsx" line="24" column="1" code="6133">'useSupabaseData' is declared but its value is never read.</problem>
<problem file="src/components/UserManagement.tsx" line="45" column="9" code="6133">'currentUser' is declared but its value is never read.</problem>
<problem file="src/components/PermissionsOverview.tsx" line="81" column="60" code="2339">Property 'resource-link' does not exist on type 'JSX.IntrinsicElements'.</problem>
<problem file="src/components/PermissionsOverview.tsx" line="81" column="173" code="2339">Property 'resource-link' does not exist on type 'JSX.IntrinsicElements'.</problem>
<problem file="src/App.tsx" line="19" column="10" code="6133">'FleetData' is declared but its value is never read.</problem>
<problem file="src/App.tsx" line="19" column="21" code="6133">'Vehicle' is declared but its value is never read.</problem>
<problem file="src/App.tsx" line="19" column="30" code="6133">'Driver' is declared but its value is never read.</problem>
<problem file="src/App.tsx" line="19" column="38" code="6133">'Tour' is declared but its value is never read.</problem>
<problem file="src/App.tsx" line="19" column="44" code="6133">'FuelEntry' is declared but its value is never read.</problem>
<problem file="src/App.tsx" line="19" column="55" code="6133">'Document' is declared but its value is never read.</problem>
<problem file="src/App.tsx" line="19" column="65" code="6133">'MaintenanceEntry' is declared but its value is never read.</problem>
<problem file="src/App.tsx" line="19" column="83" code="6133">'PreDepartureChecklist' is declared but its value is never read.</problem>
<problem file="src/App.tsx" line="25" column="1" code="6133">'useSupabaseData' is declared but its value is never read.</problem>
</dyad-problem-report><think>**Resolving TypeScript Issues**

I'm currently addressing TypeScript errors, specifically focusing on instances of 'FleetData' being declared but not used. I plan to handle these first, as they seem straightforward. After that, I'll tackle the remaining issues systematically, consulting the relevant documentation as needed.


**Tackling Unused Imports**

I'm removing `FleetData` imports from several files to resolve the "declared but not used" errors. The granular fetching approach means these components no longer require that data. Specifically, I've removed the unused imports from `AlertsWidget.tsx`, `KpisWidget.tsx`, `StatsWidget.tsx`, `VehicleStatusChartWidget.tsx`, `MonthlyFuelConsumptionChartWidget.tsx`, and `RecentActivityWidget.tsx`, along with `Vehicles.tsx`, `Drivers.tsx`, `Tours.tsx`, `FuelManagement.tsx`, `Documents.tsx`, `Maintenance.tsx`, `Check listForm.tsx`, `PreDepartureChecklist.tsx`, and `App.tsx`.


**Updating 'getColumnConfigs'**

I've revised the `getColumnConfigs` function in `Reports.tsx` by adjusting the `dataSource` parameter's type to `Resource`. This fixes the type mismatch errors I was encountering with the string literals in the switch cases. With this change, the function now correctly handles the different data sources. I'm moving on to address the remaining issues systematically.


**Prioritizing & Addressing Errors**

I'm removing unused imports and correcting type mismatches. I'm starting by removing the 'FleetData' imports from various components to resolve the numerous TS6133 errors.  I've also addressed the 'useMemo' import error in 'Summary.tsx'. Next, I'll fix the 'data.drivers' issue and then refactor 'getColumnConfigs' in Reports.tsx to use the correct data types.  Finally, I'll remove any unused imports.


</think>Je vais corriger les erreurs de compilation TypeScript en ajustant les imports et les usages des hooks et des types.

Voici les modifications :

1.  **Suppression des imports `FleetData` et autres types inutilisés :** Dans plusieurs composants, ces imports ne sont plus nécessaires car les données sont maintenant chargées de manière granulaire via `useSupabaseData`.
2.  **Import de `useMemo` :** Ajout de l'import `useMemo` dans `src/components/Dashboard.tsx` et `src/components/Summary.tsx`.
3.  **Correction de l'accès aux données dans `Maintenance.tsx` :** Remplacement de `data.drivers` par `drivers` (qui est maintenant un état local du composant).
4.  **Correction du type `dataSource` dans `Reports.tsx` :** Le type du paramètre `dataSource` dans `getColumnConfigs` sera ajusté à `Resource`.
5.  **Suppression des imports `useSupabaseData` et `currentUser` inutilisés :** Ces imports seront retirés des fichiers où ils ne sont pas directement utilisés.
6.  **Remplacement de `<resource-link>` :** La balise non standard `<resource-link>` sera remplacée par une balise `<a>` standard dans `src/components/PermissionsOverview.tsx`.

Voici les fichiers mis à jour :

<dyad-write path="src/components/dashboard/AlertsWidget.tsx" description="Suppression de l'import FleetData inutilisé.">
import React from 'react';
import { AlertTriangle, ClipboardCheck } from 'lucide-react';
import { PreDepartureChecklist, Vehicle, Document } from '../../types';
import { getDaysUntilExpiration } from '../../utils/date';
import { useSupabaseData } from '../../hooks/useSupabaseData'; // Import useSupabaseData

interface AlertsWidgetProps {
  // data: FleetData; // No longer needed as data is fetched internally
  // preDepartureChecklists: PreDepartureChecklist[]; // No longer needed
}

const AlertsWidget: React.FC<AlertsWidgetProps> = () => {
  const { data: vehicles, isLoading: isLoadingVehicles } = useSupabaseData<Vehicle>('vehicles');
  const { data: documents, isLoading: isLoadingDocuments } = useSupabaseData<Document>('documents');
  const { data: preDepartureChecklists, isLoading: isLoadingChecklists } = useSupabaseData<PreDepartureChecklist>('pre_departure_checklists');

  const maintenanceAlerts = vehicles.filter(vehicle => {
    const nextService = (vehicle.last_service_mileage || 0) + 10000;
    const kmUntilService = nextService - vehicle.mileage;
    return kmUntilService <= 1000;
  });

  const expiringDocs = documents.filter(doc => {
    const daysLeft = getDaysUntilExpiration(doc.expiration);
    return daysLeft <= 30;
  });

  const checklistsWithIssues = preDepartureChecklists.filter(cl => cl.issues_to_address && cl.issues_to_address.trim() !== '');

  const isLoadingCombined = isLoadingVehicles || isLoadingDocuments || isLoadingChecklists;

  if (isLoadingCombined) {
    return null; // Or a small skeleton loader if preferred
  }

  if (maintenanceAlerts.length === 0 && expiringDocs.length === 0 && checklistsWithIssues.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4 animate-slide-up">
      {maintenanceAlerts.length > 0 && (
        <div className="bg-orange-50 border-l-4 border-orange-400 p-4 rounded-r-lg glass">
          <div className="flex items-center">
            <AlertTriangle className="w-5 h-5 text-orange-400 mr-3" />
            <div>
              <h3 className="text-orange-800 font-semibold">Maintenance Requise</h3>
              <p className="text-orange-700">
                {maintenanceAlerts.length} véhicule(s) nécessitent une maintenance prochainement
              </p>
            </div>
          </div>
        </div>
      )}
      
      {expiringDocs.length > 0 && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-r-lg glass">
          <div className="flex items-center">
            <AlertTriangle className="w-5 h-5 text-red-400 mr-3" />
            <div>
              <h3 className="text-red-800 font-semibold">Documents à Renouveler</h3>
              <p className="text-red-700">
                {expiringDocs.length} document(s) expirent dans moins de 30 jours
              </p>
            </div>
          </div>
        </div>
      )}

      {checklistsWithIssues.length > 0 && (
        <div className="bg-purple-50 border-l-4 border-purple-400 p-4 rounded-r-lg glass">
          <div className="flex items-center">
            <ClipboardCheck className="w-5 h-5 text-purple-400 mr-3" />
            <div>
              <h3 className="text-purple-800 font-semibold">Points à Traiter (Checklists)</h3>
              <p className="text-purple-700">
                {checklistsWithIssues.length} checklist(s) contiennent des problèmes à résoudre.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AlertsWidget;