import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Plus, Wrench, AlertTriangle, Clock, ClipboardCheck, Calendar } from 'lucide-react';
import { FleetData, MaintenanceEntry, PreDepartureChecklist, DataTableColumn, Vehicle } from '../types';
import { showSuccess } from '../utils/toast';
import { formatDate } from '../utils/date'; // Removed getDaysSinceEntry
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { maintenanceEntrySchema } from '../types/formSchemas'; // Import the schema
import { Button } from './ui/button'; // Import shadcn Button
import { z } from 'zod'; // Import z
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from './ui/dialog'; // Import shadcn/ui Dialog components
import DataTable from './DataTable'; // Import the new DataTable component
import { usePermissions } from '../hooks/usePermissions'; // Import usePermissions

type MaintenanceEntryFormData = z.infer<typeof maintenanceEntrySchema>;

interface MaintenanceProps {
  data: FleetData;
  onAdd: (maintenanceEntry: Omit<MaintenanceEntry, 'id' | 'user_id' | 'created_at'>) => void;
  onUpdate: (vehicle: { id: string; last_service_date: string; last_service_mileage: number; mileage: number }) => void;
  onDelete: (id: string) => void; // Added onDelete prop
  preDepartureChecklists: PreDepartureChecklist[];
}

const Maintenance: React.FC<MaintenanceProps> = ({ data, onAdd, onUpdate, onDelete, preDepartureChecklists }) => {
  const { canAccess } = usePermissions(); // Use usePermissions hook

  const [showModal, setShowModal] = useState(false);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');

  const { register, handleSubmit, reset, formState: { errors = {} } } = useForm<MaintenanceEntryFormData>({
    resolver: zodResolver(maintenanceEntrySchema),
    defaultValues: {
      vehicle_id: '',
      type: 'Vidange',
      date: new Date().toISOString().split('T')[0],
      mileage: 0,
      cost: 0,
    }
  });

  useEffect(() => {
    if (selectedVehicleId) {
      reset({
        vehicle_id: selectedVehicleId,
        type: 'Vidange',
        date: new Date().toISOString().split('T')[0],
        mileage: data.vehicles.find(v => v.id === selectedVehicleId)?.mileage || 0,
        cost: 0,
      });
    } else {
      reset({
        vehicle_id: '',
        type: 'Vidange',
        date: new Date().toISOString().split('T')[0],
        mileage: 0,
        cost: 0,
      });
    }
  }, [selectedVehicleId, reset, data.vehicles]);

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
    onDelete(id); // Call the onDelete prop
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

  // Filter checklists with issues to address
  const checklistsWithIssues = preDepartureChecklists.filter(cl => cl.issues_to_address && cl.issues_to_address.trim() !== '');

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
            className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 shadow-sm focus:ring-blue-500 focus:border-blue-500"
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
            className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 shadow-sm focus:ring-blue-500 focus:border-blue-500"
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
            className="w-full bg-white border border-gray-300 rounded-lg pl-4 pr-10 py-3 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            placeholder="Date de début"
          />
          <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
        </div>
        <div className="relative">
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full bg-white border border-gray-300 rounded-lg pl-4 pr-10 py-3 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
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

  const renderMaintenanceAlerts = useCallback(() => {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
        <div className="bg-orange-50 border-l-4 border-orange-400 p-6 rounded-r-lg shadow-lg">
          <div className="flex items-center">
            <Clock className="w-6 h-6 text-orange-400 mr-4" />
            <div>
              <h3 className="text-lg font-semibold text-orange-700">Vidanges à Prévoir</h3>
              <p className="text-orange-600">
                {upcomingMaintenanceCount} véhicule(s) approchent des 10,000 km
              </p>
            </div>
          </div>
        </div>

        <div className="bg-red-50 border-l-4 border-red-400 p-6 rounded-r-lg shadow-lg">
          <div className="flex items-center">
            <AlertTriangle className="w-6 h-6 text-red-400 mr-4" />
            <div>
              <h3 className="text-lg font-semibold text-red-700">Maintenance Urgente</h3>
              <p className="text-red-600">
                {urgentMaintenanceCount} véhicule(s) dépassent les limites
              </p>
            </div>
          </div>
        </div>

        {checklistsWithIssues.length > 0 && (
          <div className="bg-purple-50 border-l-4 border-purple-400 p-6 rounded-r-lg shadow-lg">
            <div className="flex items-center">
              <ClipboardCheck className="w-6 h-6 text-purple-400 mr-4" />
              <div>
                <h3 className="text-lg font-semibold text-purple-700">Points à Traiter (Checklists)</h3>
                <p className="text-purple-600">
                  {checklistsWithIssues.length} checklist(s) contiennent des problèmes à résoudre.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }, [upcomingMaintenanceCount, urgentMaintenanceCount, checklistsWithIssues]);

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
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg flex items-center space-x-2 transition-all duration-300"
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
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800">Détail des Points à Traiter</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date Checklist</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Véhicule</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Conducteur</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Points à Traiter</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {checklistsWithIssues.map((checklist) => {
                  const vehicle = data.vehicles.find(v => v.id === checklist.vehicle_id);
                  const driver = data.drivers.find(d => d.id === checklist.driver_id);
                  return (
                    <tr key={checklist.id} className="hover:bg-gray-50">
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
        onAdd={canAddMaintenance ? () => handleAddMaintenance() : undefined} // Re-use existing add handler
        addLabel="Ajouter Maintenance"
        searchPlaceholder="Rechercher un véhicule par plaque, type ou statut..."
        exportFileName="suivi_maintenance_vehicules"
        isLoading={false}
        renderRowActions={(item) => (
          canAddMaintenance ? (
            <Button
              key={item.id + "-maintenance-action"}
              onClick={() => handleAddMaintenance(item.id)}
              className="text-blue-600 hover:text-blue-900 transition-colors flex items-center space-x-1"
              variant="ghost"
              size="icon"
            >
              <Wrench className="w-4 h-4" />
              <span>Maintenance</span>
            </Button>
          ) : null
        )}
        resourceType="vehicles" // Pass resource type
      />

      {/* Historique des maintenances - Now using DataTable */}
      {data.maintenance.length > 0 && (
        <DataTable
          title="Historique des Maintenances"
          data={data.maintenance}
          columns={maintenanceHistoryColumns}
          onAdd={canAddMaintenance ? () => handleAddMaintenance() : undefined} // Re-use existing add handler
          onEdit={canEditMaintenance ? handleEditMaintenance : undefined} // Placeholder for future edit functionality
          onDelete={canDeleteMaintenance ? handleDeleteMaintenance : undefined} // Now correctly wired to the prop
          addLabel="Ajouter Maintenance"
          searchPlaceholder="Rechercher dans l'historique par véhicule, type, date ou coût..."
          exportFileName="historique_maintenance"
          isLoading={false}
          renderFilters={renderMaintenanceHistoryFilters}
          customFilter={customMaintenanceHistoryFilter}
          resourceType="maintenance_entries" // Pass resource type
        />
      )}

      {/* Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-[425px] bg-gray-50">
          <DialogHeader>
            <DialogTitle>Enregistrer une Maintenance</DialogTitle>
            <DialogDescription>
              Ajoutez un nouvel enregistrement de maintenance pour un véhicule.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
            <div>
              <label htmlFor="vehicle_id" className="block text-sm font-semibold mb-2 text-gray-900">Véhicule</label>
              <select
                id="vehicle_id"
                {...register('vehicle_id')}
                className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 shadow-sm focus:ring-blue-500 focus:border-blue-500"
                disabled={!canAddMaintenance}
              >
                <option value="">Sélectionner un véhicule</option>
                {data.vehicles.map(vehicle => (
                  <option key={vehicle.id} value={vehicle.id}>
                    {vehicle.plate} - {vehicle.type}
                  </option>
                ))}
              </select>
              {errors.vehicle_id && <p className="text-red-500 text-sm mt-1">{errors.vehicle_id.message}</p>}
            </div>
            <div>
              <label htmlFor="type" className="block text-sm font-semibold mb-2 text-gray-900">Type de maintenance</label>
              <select
                id="type"
                {...register('type')}
                className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 shadow-sm focus:ring-blue-500 focus:border-blue-500"
                disabled={!canAddMaintenance}
              >
                <option value="Vidange">Vidange</option>
                <option value="Révision">Révision</option>
                <option value="Réparation">Réparation</option>
                <option value="Pneus">Changement pneus</option>
              </select>
              {errors.type && <p className="text-red-500 text-sm mt-1">{errors.type.message}</p>}
            </div>
            <div>
              <label htmlFor="date" className="block text-sm font-semibold mb-2 text-gray-900">Date</label>
              <div className="relative flex items-center">
                <input
                  id="date"
                  type="date"
                  {...register('date')}
                  className="w-full bg-white border border-gray-300 rounded-lg pl-4 pr-10 py-3 shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  disabled={!canAddMaintenance}
                />
                <Calendar className="absolute right-3 w-5 h-5 text-gray-400 pointer-events-none" />
              </div>
              {errors.date && <p className="text-red-500 text-sm mt-1">{errors.date.message}</p>}
            </div>
            <div>
              <label htmlFor="mileage" className="block text-sm font-semibold mb-2 text-gray-900">Kilométrage</label>
              <input
                id="mileage"
                type="number"
                {...register('mileage', { valueAsNumber: true })}
                className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 shadow-sm focus:ring-blue-500 focus:border-blue-500"
                disabled={!canAddMaintenance}
              />
              {errors.mileage && <p className="text-red-500 text-sm mt-1">{errors.mileage.message}</p>}
            </div>
            <div>
              <label htmlFor="cost" className="block text-sm font-semibold mb-2 text-gray-900">Coût (TND)</label>
              <input
                id="cost"
                type="number"
                step="0.01"
                {...register('cost', { valueAsNumber: true })}
                className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 shadow-sm focus:ring-blue-500 focus:border-blue-500"
                disabled={!canAddMaintenance}
              />
              {errors.cost && <p className="text-red-500 text-sm mt-1">{errors.cost.message}</p>}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowModal(false)}
              >
                Annuler
              </Button>
              {canAddMaintenance && (
                <Button
                  type="submit"
                >
                  Sauvegarder
                </Button>
              )}
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Maintenance;