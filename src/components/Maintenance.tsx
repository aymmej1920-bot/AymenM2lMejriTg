import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Wrench, AlertTriangle, Clock, ClipboardCheck, Search, Calendar } from 'lucide-react';
import { MaintenanceEntry, DataTableColumn, Vehicle, Resource, Action, OperationResult } from '../types';
import { showSuccess, showLoading, updateToast, showError } from '../utils/toast';
import { formatDate } from '../utils/date';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { maintenanceEntrySchema } from '../types/formSchemas';
import { z } from 'zod';
import { Button } from './ui/button';
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
import { useFleetData } from '../components/FleetDataProvider';

type MaintenanceEntryFormData = z.infer<typeof maintenanceEntrySchema>;

interface MaintenanceProps {
  onAdd: (tableName: Resource, maintenanceEntry: Omit<MaintenanceEntry, 'id' | 'user_id' | 'created_at'>, action: Action) => Promise<OperationResult>;
  onUpdate: (tableName: Resource, vehicle: { id: string; last_service_date: string; last_service_mileage: number; mileage: number }, action: Action) => Promise<OperationResult>;
  onDelete: (tableName: Resource, data: { id: string }, action: Action) => Promise<OperationResult>;
}

const Maintenance: React.FC<MaintenanceProps> = ({ onAdd, onUpdate, onDelete }) => {
  const { canAccess } = usePermissions();

  const { fleetData, isLoadingFleet } = useFleetData();
  const maintenanceEntries = fleetData.maintenance;
  const vehicles = fleetData.vehicles;
  const preDepartureChecklists = fleetData.pre_departure_checklists;

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

  useEffect(() => {
    if (showModal && !selectedVehicleId) {
      const savedFormData = localStorage.getItem(LOCAL_STORAGE_KEYS.MAINTENANCE_FORM_DATA);
      if (savedFormData) {
        try {
          const parsedData = JSON.parse(savedFormData);
          if (parsedData.date) {
            parsedData.date = new Date(parsedData.date).toISOString().split('T')[0];
          }
          reset(parsedData);
        } catch (e: unknown) {
          console.error("Failed to parse saved maintenance form data", e instanceof Error ? e.message : String(e));
          localStorage.removeItem(LOCAL_STORAGE_KEYS.MAINTENANCE_FORM_DATA);
        }
      }
    }
  }, [showModal, selectedVehicleId, reset]);

  useEffect(() => {
    if (showModal && !selectedVehicleId) {
      const subscription = watch((value: Partial<MaintenanceEntryFormData>) => {
        localStorage.setItem(LOCAL_STORAGE_KEYS.MAINTENANCE_FORM_DATA, JSON.stringify(value));
      });
      return () => subscription.unsubscribe();
    }
  }, [showModal, selectedVehicleId, watch]);

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
      resetFormAndClearStorage();
    }
  }, [selectedVehicleId, resetFormAndClearStorage, vehicles]);

  const [selectedVehicleFilter, setSelectedVehicleFilter] = useState<string>('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const uniqueMaintenanceTypes = useMemo(() => {
    const types = new Set(maintenanceEntries.map(m => m.type));
    return Array.from(types);
  }, [maintenanceEntries]);

  const handleAddMaintenance = (vehicleId?: string) => {
    setSelectedVehicleId(vehicleId || '');
    setShowModal(true);
  };

  const handleEditMaintenance = (maintenanceEntry: MaintenanceEntry) => {
    console.log("Edit maintenance entry:", maintenanceEntry);
  };

  const onSubmit = async (maintenanceData: MaintenanceEntryFormData) => {
    const loadingToastId = showLoading('Ajout de l\'entrée de maintenance...');
    let result: OperationResult;
    try {
      result = await onAdd('maintenance_entries', maintenanceData, 'add');
      if (result.success) {
        updateToast(loadingToastId, result.message || 'Entrée de maintenance ajoutée avec succès !', 'success');
      } else {
        throw new Error(result.error || 'Erreur lors de l\'ajout de l\'entrée de maintenance.');
      }

      if (maintenanceData.type === 'Vidange') {
        const updateVehicleResult = await onUpdate('vehicles', {
          id: maintenanceData.vehicle_id,
          last_service_date: maintenanceData.date,
          last_service_mileage: maintenanceData.mileage,
          mileage: maintenanceData.mileage,
        }, 'edit');
        if (updateVehicleResult.success) {
          showSuccess('Informations du véhicule mises à jour après la vidange !');
        } else {
          showError(updateVehicleResult.error || 'Erreur lors de la mise à jour des informations du véhicule.');
        }
      }

      setShowModal(false);
      resetFormAndClearStorage();
    } catch (error: unknown) {
      updateToast(loadingToastId, (error instanceof Error ? error.message : String(error)) || 'Erreur lors de l\'opération.', 'error');
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    resetFormAndClearStorage();
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
  }, [vehicles, checklistsWithIssues]);

  const vehicleMaintenanceColumns: DataTableColumn<Vehicle>[] = useMemo(() => [
    { key: 'plate', label: 'Véhicule', sortable: true, defaultVisible: true },
    { key: 'mileage', label: 'Km Actuel', sortable: true, defaultVisible: true, render: (item: Vehicle) => `${item.mileage.toLocaleString()} km` },
    { key: 'last_service_date', label: 'Dernière Vidange', sortable: true, defaultVisible: true, render: (item: Vehicle) => formatDate(item.last_service_date) || 'N/A' },
    { key: 'last_service_mileage', label: 'Km Dernière Vidange', sortable: true, defaultVisible: true, render: (item: Vehicle) => `${(item.last_service_mileage || 0).toLocaleString()} km` },
    { 
      key: 'next_service_km', 
      label: 'Prochaine Vidange', 
      sortable: true, 
      defaultVisible: true, 
      render: (item: Vehicle) => {
        const nextServiceKm = (item.last_service_mileage || 0) + 10000;
        return `${nextServiceKm.toLocaleString()} km`;
      }
    },
    { 
      key: 'status', 
      label: 'Statut', 
      sortable: false, 
      defaultVisible: true, 
      render: (item: Vehicle) => {
        const status = getMaintenanceStatus(item);
        const Icon = status.icon;
        return (
          <span className={`px-3 py-1 text-xs rounded-full font-medium flex items-center space-x-1 ${status.class}`}>
            <Icon className="w-4 h-4" />
            <span>{status.text}</span>
          </span>
        );
      }
    },
  ], [getMaintenanceStatus]);

  const maintenanceHistoryColumns: DataTableColumn<MaintenanceEntry>[] = useMemo(() => [
    { key: 'date', label: 'Date', sortable: true, defaultVisible: true, render: (item: MaintenanceEntry) => formatDate(item.date) },
    {
      key: 'vehicle_id',
      label: 'Véhicule',
      sortable: true,
      defaultVisible: true,
      render: (item: MaintenanceEntry) => vehicles.find(v => v.id === item.vehicle_id)?.plate || 'N/A',
    },
    { key: 'type', label: 'Type', sortable: true, defaultVisible: true },
    { key: 'mileage', label: 'Kilométrage', sortable: true, defaultVisible: true, render: (item: MaintenanceEntry) => `${item.mileage.toLocaleString()} km` },
    { key: 'cost', label: 'Coût', sortable: true, defaultVisible: true, render: (item: MaintenanceEntry) => `${item.cost.toFixed(2)} TND` },
  ], [vehicles]);

  const renderFilters = useCallback((searchTerm: string, setSearchTerm: (term: string) => void) => {
    return (
      <>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher une entrée de maintenance..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all glass"
          />
        </div>
        <div>
          <select
            value={selectedVehicleFilter}
            onChange={(e) => setSelectedVehicleFilter(e.target.value)}
            className="w-full glass border border-gray-300 rounded-lg px-4 py-3 shadow-sm focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Tous les véhicules</option>
            {vehicles.map(vehicle => (
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
            className="w-full glass border border-gray-300 rounded-lg px-4 py-3 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
            className="w-full glass border border-gray-300 rounded-lg pl-4 pr-10 py-3 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Date de début"
          />
          <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
        </div>
        <div className="relative">
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full glass border border-gray-300 rounded-lg pl-4 pr-10 py-3 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Date de fin"
          />
          <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
        </div>
      </>
    );
  }, [vehicles, uniqueMaintenanceTypes, selectedVehicleFilter, selectedTypeFilter, startDate, endDate]);

  const customFilter = useCallback((entry: MaintenanceEntry) => {
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

  const canAddForm = canAccess('maintenance_entries', 'add');
  const canEditForm = canAccess('maintenance_entries', 'edit');

  return (
    <div className="space-y-6">
      {renderMaintenanceAlerts()}

      <DataTable
        title="Suivi de Maintenance des Véhicules"
        data={vehicles}
        columns={vehicleMaintenanceColumns}
        onAdd={canAddForm ? handleAddMaintenance : undefined}
        addLabel="Ajouter Maintenance"
        searchPlaceholder="Rechercher un véhicule par plaque, type ou statut..."
        exportFileName="maintenance_vehicules"
        isLoading={isLoadingFleet}
        resourceType="vehicles"
        renderRowActions={(item) => (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleAddMaintenance(item.id)}
            className="text-green-600 hover:text-green-900 transition-colors hover-lift"
          >
            <Wrench className="w-4 h-4" />
          </Button>
        )}
      />

      <DataTable
        title="Historique des Entrées de Maintenance"
        data={maintenanceEntries}
        columns={maintenanceHistoryColumns}
        onAdd={canAddForm ? handleAddMaintenance : undefined}
        onEdit={canEditForm ? handleEditMaintenance : undefined}
        onDelete={canAccess('maintenance_entries', 'delete') ? async (id) => {
          const loadingToastId = showLoading('Suppression de l\'entrée de maintenance...');
          const result = await onDelete('maintenance_entries', { id }, 'delete');
          if (result.success) {
            updateToast(loadingToastId, result.message || 'Entrée de maintenance supprimée avec succès !', 'success');
          } else {
            updateToast(loadingToastId, result.error || 'Erreur lors de la suppression de l\'entrée de maintenance.', 'error');
          }
        } : undefined}
        addLabel="Nouvelle Entrée"
        searchPlaceholder="Rechercher une entrée de maintenance..."
        exportFileName="historique_maintenance"
        isLoading={isLoadingFleet}
        renderFilters={renderFilters}
        customFilter={customFilter}
        resourceType="maintenance_entries"
      />

      <Dialog open={showModal} onOpenChange={handleCloseModal}>
        <DialogContent className="sm:max-w-[425px] glass animate-scale-in">
          <DialogHeader>
            <DialogTitle>{selectedVehicleId ? 'Ajouter une Maintenance' : 'Ajouter une Entrée de Maintenance'}</DialogTitle>
            <DialogDescription>
              Remplissez les détails de l'entrée de maintenance.
            </DialogDescription>
          </DialogHeader>
          <FormProvider {...methods}>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
              <FormField
                name="vehicle_id"
                label="Véhicule"
                type="select"
                options={[{ value: '', label: 'Sélectionner un véhicule' }, ...vehicles.map(vehicle => ({ value: vehicle.id, label: `${vehicle.plate} - ${vehicle.type}` }))]}
                placeholder="Sélectionner un véhicule"
                disabled={(!canEditForm && !!selectedVehicleId) || (!canAddForm && !selectedVehicleId)}
              />
              <FormField
                name="type"
                label="Type de maintenance"
                type="select"
                options={[
                  { value: 'Vidange', label: 'Vidange' },
                  { value: 'Réparation', label: 'Réparation' },
                  { value: 'Contrôle', label: 'Contrôle' },
                  { value: 'Pneus', label: 'Pneus' },
                  { value: 'Freins', label: 'Freins' },
                  { value: 'Autre', label: 'Autre' },
                ]}
                disabled={(!canEditForm && !!selectedVehicleId) || (!canAddForm && !selectedVehicleId)}
              />
              <FormField
                name="date"
                label="Date"
                type="date"
                disabled={(!canEditForm && !!selectedVehicleId) || (!canAddForm && !selectedVehicleId)}
              />
              <FormField
                name="mileage"
                label="Kilométrage"
                type="number"
                disabled={(!canEditForm && !!selectedVehicleId) || (!canAddForm && !selectedVehicleId)}
              />
              <FormField
                name="cost"
                label="Coût (TND)"
                type="number"
                step="0.01"
                disabled={(!canEditForm && !!selectedVehicleId) || (!canAddForm && !selectedVehicleId)}
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
                {(canAddForm && !selectedVehicleId) || (canEditForm && selectedVehicleId) ? (
                  <Button
                    type="submit"
                    className="hover-lift"
                  >
                    Sauvegarder
                  </Button>
                ) : null}
              </DialogFooter>
            </form>
          </FormProvider>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Maintenance;