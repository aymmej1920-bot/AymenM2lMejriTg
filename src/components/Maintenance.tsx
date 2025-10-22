import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Plus, Wrench, AlertTriangle, Clock, ClipboardCheck, Calendar } from 'lucide-react';
import { FleetData, MaintenanceEntry, PreDepartureChecklist, DataTableColumn, Vehicle } from '../types';
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

type MaintenanceEntryFormData = z.infer<typeof maintenanceEntrySchema>;

interface MaintenanceProps {
  data: FleetData;
  onAdd: (maintenanceEntry: Omit<MaintenanceEntry, 'id' | 'user_id' | 'created_at'>) => void;
  onUpdate: (vehicle: { id: string; last_service_date: string; last_service_mileage: number; mileage: number }) => void;
  onDelete: (id: string) => void;
  preDepartureChecklists: PreDepartureChecklist[];
}

const Maintenance: React.FC<MaintenanceProps> = ({ data, onAdd, onUpdate, onDelete, preDepartureChecklists }) => {
  const { canAccess } = usePermissions();

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
        mileage: data.vehicles.find(v => v.id === selectedVehicleId)?.mileage || 0,
        cost: 0,
      });
    } else {
      resetFormAndClearStorage(); // Use the new reset function
    }
  }, [selectedVehicleId, resetFormAndClearStorage, data.vehicles]);

  // State for filtering for Maintenance History
  const [selectedVehicleFilter, setSelectedVehicleFilter] = useState<string>('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Get unique types for filter options
  const uniqueMaintenanceTypes = useMemo(() => {
    const types = new Set(data.maintenance.map(m => m.type));
    return Array.from(types);
  }, [data.maintenance]);

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

  const handleDeleteMaintenance = (id: string) => {
    onDelete(id);
    showSuccess('Entrée de maintenance supprimée avec succès !');
  };

  const onSubmit = (maintenanceData: MaintenanceEntryFormData) => {
    onAdd(maintenanceData);
    showSuccess('Entrée de maintenance ajoutée avec succès !');

    // If it's an oil change, update vehicle info
    if (maintenanceData.type === 'Vidange') {
      onUpdate({
        id: maintenanceData.vehicle_id,
        last_service_date: maintenanceData.date,
        last_service_mileage: maintenanceData.mileage,
        mileage: maintenanceData.mileage, // Also update current mileage
      });
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
    const upcomingMaintenanceCount = data.vehicles.filter(vehicle => {
      const nextService = (vehicle.last_service_mileage || 0) + 10000;
      const kmUntilService = nextService - vehicle.mileage;
      return kmUntilService <= 1000 && kmUntilService > 0;
    }).length;

    const urgentMaintenanceCount = data.vehicles.filter(vehicle => {
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
  }, [data.vehicles, checklistsWithIssues]); // Added checklistsWithIssues to dependencies

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
      render: (item) => {
        const status = getMaintenanceStatus(item);
        const StatusIcon = status.icon;
        return (
          <span className={`px-3 py-1 text-xs rounded-full font-medium ${status.class} flex items-center space-x-1`}>
            <StatusIcon className="w-3 h-3" />
            <span>{status.text}</span>
          </span>
        );
      }
    },
  ], []);

  const maintenanceHistoryColumns: DataTableColumn<MaintenanceEntry>[] = useMemo(() => [
    { key: 'date', label: 'Date', sortable: true, defaultVisible: true, render: (item) => formatDate(item.date) },
    {
      key: 'vehicle_id',
      label: 'Véhicule',
      sortable: true,
      defaultVisible: true,
      render: (item) => data.vehicles.find(v => v.id === item.vehicle_id)?.plate || 'N/A',
    },
    { key: 'type', label: 'Type', sortable: true, defaultVisible: true },
    { key: 'mileage', label: 'Kilométrage', sortable: true, defaultVisible: true, render: (item) => `${item.mileage.toLocaleString()} km` },
    { key: 'cost', label: 'Coût', sortable: true, defaultVisible: true, render: (item) => `${item.cost.toFixed(2)} TND` },
  ], [data.vehicles]);

  const renderMaintenanceHistoryFilters = useCallback((_searchTerm: string, _setSearchTerm: (term: string) => void) => {
    return (
      <>
        <div>
          <select
            value={selectedVehicleFilter}
            onChange={(e) => setSelectedVehicleFilter(e.target.value)}
            className="w-full glass border border-gray-300 rounded-lg px-4 py-3 shadow-sm focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Tous les véhicules</option>
            {data.vehicles.map(vehicle => (
              <option key={vehicle.id} value={vehicle.id}>
                {vehicle.plate} - {vehicle.type}
              </option>
            ))}
          </select>
        </div>
        <div>
          <select
            value={selectedTypeFilter}
            onChange={(e) => setSelectedTypeFilter(e.target.value)}
            className="w-full glass border border-gray-300 rounded-lg px-4 py-3 shadow-sm focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Tous les types</option>
            {uniqueMaintenanceTypes.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>
        <div className="relative">
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full glass border border-gray-300 rounded-lg pl-4 pr-10 py-3 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            placeholder="Date de début"
          />
          <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
        </div>
        <div className="relative">
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full glass border border-gray-300 rounded-lg pl-4 pr-10 py-3 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            placeholder="Date de fin"
          />
          <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
        </div>
      </>
    );
  }, [data.vehicles, uniqueMaintenanceTypes, selectedVehicleFilter, selectedTypeFilter, startDate, endDate]);

  const customMaintenanceHistoryFilter = useCallback((entry: MaintenanceEntry) => {
    const matchesVehicle = selectedVehicleFilter ? entry.vehicle_id === selectedVehicleFilter : true;
    const matchesType = selectedTypeFilter ? entry.type === selectedTypeFilter : true;

    const entryDate = new Date(entry.date);
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;

    const matchesDateRange = 
      (!start || entryDate >= start) &&
      (!end || entryDate <= end);

    return matchesVehicle && matchesType && matchesDateRange;
  }, [selectedVehicleFilter, selectedTypeFilter, startDate, endDate]);

  const canAddMaintenance = canAccess('maintenance_entries', 'add');
  const canEditMaintenance = canAccess('maintenance_entries', 'edit');
  const canDeleteMaintenance = canAccess('maintenance_entries', 'delete');

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-4xl font-bold text-gray-800">Suivi Maintenance & Vidanges</h2>
        {canAddMaintenance && (
          <Button
            key="add-maintenance-button"
            onClick={() => handleAddMaintenance()}
            className="bg-gradient-brand text-white px-6 py-3 rounded-lg flex items-center space-x-2 transition-all duration-300 hover-lift"
          >
            <Plus className="w-5 h-5" />
            <span>Ajouter Maintenance</span>
          </Button>
        )}
      </div>

      {/* Alerts for Maintenance and Checklists */}
      {renderMaintenanceAlerts()}

      {/* Detailed list of checklist issues */}
      {checklistsWithIssues.length > 0 && (
        <div className="glass rounded-xl shadow-lg overflow-hidden animate-fade-in">
          <div className="px-6 py-4 border-b border-gray-200 bg-white/20">
            <h3 className="text-lg font-semibold text-gray-800">Détail des Points à Traiter</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-white/20">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-800 uppercase tracking-wider">Date Checklist</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-800 uppercase tracking-wider">Véhicule</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-800 uppercase tracking-wider">Conducteur</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-800 uppercase tracking-wider">Points à Traiter</th>
                </tr>
              </thead>
              <tbody className="bg-white/10 divide-y divide-gray-200">
                {checklistsWithIssues.map((checklist) => {
                  const vehicle = data.vehicles.find(v => v.id === checklist.vehicle_id);
                  const driver = data.drivers.find(d => d.id === checklist.driver_id);
                  return (
                    <tr key={checklist.id} className="hover:bg-white/20">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatDate(checklist.date)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                        {vehicle?.plate || 'Véhicule inconnu'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {driver?.name || 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-sm text-red-600">
                        {checklist.issues_to_address}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Suivi Maintenance & Vidanges - Now using DataTable */}
      <DataTable
        title="Suivi Maintenance & Vidanges des Véhicules"
        data={data.vehicles}
        columns={vehicleMaintenanceColumns}
        onAdd={canAddMaintenance ? () => handleAddMaintenance() : undefined}
        addLabel="Ajouter Maintenance"
        searchPlaceholder="Rechercher un véhicule par plaque, type ou statut..."
        exportFileName="suivi_maintenance_vehicules"
        isLoading={false}
        renderRowActions={(item: Vehicle) => (
          canAddMaintenance ? (
            <Button
              key={item.id + "-maintenance-action"}
              onClick={() => handleAddMaintenance(item.id)}
              className="text-blue-600 hover:text-blue-900 transition-colors flex items-center space-x-1 hover-lift"
              variant="ghost"
              size="icon"
            >
              <Wrench className="w-4 h-4" />
              <span>Maintenance</span>
            </Button>
          ) : null
        )}
        resourceType="vehicles"
      />

      {/* Historique des Maintenances - Now using DataTable */}
      {data.maintenance.length > 0 && (
        <DataTable
          title="Historique des Maintenances"
          data={data.maintenance}
          columns={maintenanceHistoryColumns}
          onAdd={canAddMaintenance ? () => handleAddMaintenance() : undefined}
          onEdit={canEditMaintenance ? handleEditMaintenance : undefined}
          onDelete={canDeleteMaintenance ? handleDeleteMaintenance : undefined}
          addLabel="Ajouter Maintenance"
          searchPlaceholder="Rechercher dans l'historique par véhicule, type, date ou coût..."
          exportFileName="historique_maintenance"
          isLoading={false}
          renderFilters={renderMaintenanceHistoryFilters}
          customFilter={customMaintenanceHistoryFilter}
          resourceType="maintenance_entries"
        />
      )}

      {/* Modal */}
      <Dialog open={showModal} onOpenChange={handleCloseModal}>
        <DialogContent className="sm:max-w-[425px] glass animate-scale-in">
          <DialogHeader>
            <DialogTitle>Enregistrer une Maintenance</DialogTitle>
            <DialogDescription>
              Ajoutez un nouvel enregistrement de maintenance pour un véhicule.
            </DialogDescription>
          </DialogHeader>
          <FormProvider {...methods}>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
              <FormField
                name="vehicle_id"
                label="Véhicule"
                type="select"
                options={[{ value: '', label: 'Sélectionner un véhicule' }, ...data.vehicles.map(vehicle => ({ value: vehicle.id, label: `${vehicle.plate} - ${vehicle.type}` }))]}
                disabled={!canAddMaintenance}
              />
              <FormField
                name="type"
                label="Type de maintenance"
                type="select"
                options={[
                  { value: 'Vidange', label: 'Vidange' },
                  { value: 'Révision', label: 'Révision' },
                  { value: 'Réparation', label: 'Réparation' },
                  { value: 'Pneus', label: 'Changement pneus' },
                ]}
                disabled={!canAddMaintenance}
              />
              <FormField
                name="date"
                label="Date"
                type="date"
                disabled={!canAddMaintenance}
              />
              <FormField
                name="mileage"
                label="Kilométrage"
                type="number"
                disabled={!canAddMaintenance}
              />
              <FormField
                name="cost"
                label="Coût (TND)"
                type="number"
                step="0.01"
                disabled={!canAddMaintenance}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCloseModal}
                  className="hover-lift"
                >
                  Annuler
                </Button>
                {canAddMaintenance && (
                  <Button
                    type="submit"
                    className="hover-lift"
                  >
                    Sauvegarder
                  </Button>
                )}
              </DialogFooter>
            </form>
          </FormProvider>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Maintenance;