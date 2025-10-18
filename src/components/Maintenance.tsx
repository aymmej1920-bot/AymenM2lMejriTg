import React, { useState, useMemo, useEffect } from 'react';
import { Plus, Wrench, AlertTriangle, Clock, ClipboardCheck, ChevronUp, ChevronDown, Search } from 'lucide-react';
import { FleetData, MaintenanceEntry, PreDepartureChecklist } from '../types';
import { showSuccess } from '../utils/toast';
import { formatDate } from '../utils/date';
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

type MaintenanceEntryFormData = z.infer<typeof maintenanceEntrySchema>;

interface MaintenanceProps {
  data: FleetData;
  userRole: 'admin' | 'direction' | 'utilisateur';
  onAdd: (maintenanceEntry: Omit<MaintenanceEntry, 'id' | 'user_id' | 'created_at'>) => void;
  onUpdate: (vehicle: { id: string; last_service_date: string; last_service_mileage: number; mileage: number }) => void;
  preDepartureChecklists: PreDepartureChecklist[];
}

const Maintenance: React.FC<MaintenanceProps> = ({ data, onAdd, onUpdate, preDepartureChecklists }) => {
  const [showModal, setShowModal] = useState(false);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');

  const { register, handleSubmit, reset, formState: { errors } } = useForm<MaintenanceEntryFormData>({
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

  // State for filtering, sorting, and pagination
  const [searchTerm, setSearchTerm] = useState('');
  const [sortColumn, setSortColumn] = useState<keyof MaintenanceEntry>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10; // You can adjust this value

  // Filtered and sorted data for Maintenance History
  const filteredAndSortedMaintenanceEntries = useMemo(() => {
    let filtered = data.maintenance.filter(entry => {
      const vehicle = data.vehicles.find(v => v.id === entry.vehicle_id);
      return (
        entry.date.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (vehicle?.plate || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.mileage.toString().includes(searchTerm) ||
        entry.cost.toString().includes(searchTerm)
      );
    });

    filtered.sort((a, b) => {
      const aValue = a[sortColumn];
      const bValue = b[sortColumn];

      // Handle null/undefined values first (though not expected for these columns)
      if (aValue === null || aValue === undefined) {
        return sortDirection === 'asc' ? -1 : 1;
      }
      if (bValue === null || bValue === undefined) {
        return sortDirection === 'asc' ? 1 : -1;
      }

      // Special handling for vehicle_id to sort by plate
      if (sortColumn === 'vehicle_id') {
        const aVehicle = data.vehicles.find(v => v.id === a.vehicle_id);
        const bVehicle = data.vehicles.find(v => v.id === b.vehicle_id);
        const aPlate = aVehicle?.plate || '';
        const bPlate = bVehicle?.plate || '';
        return sortDirection === 'asc' ? aPlate.localeCompare(bPlate) : bPlate.localeCompare(aPlate);
      }

      // For date strings (like 'date'), compare them directly as strings
      if (sortColumn === 'date' && typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
      }
      
      // General number comparison
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
      }
      
      // General string comparison (fallback for other string columns)
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
      }
      
      // Fallback for other types
      return 0;
    });
    return filtered;
  }, [data.maintenance, data.vehicles, searchTerm, sortColumn, sortDirection]);

  // Paginated data for Maintenance History
  const totalPages = Math.ceil(filteredAndSortedMaintenanceEntries.length / itemsPerPage);
  const currentMaintenanceEntries = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredAndSortedMaintenanceEntries.slice(startIndex, endIndex);
  }, [filteredAndSortedMaintenanceEntries, currentPage, itemsPerPage]);

  const handleAddMaintenance = (vehicleId?: string) => {
    setSelectedVehicleId(vehicleId || '');
    setShowModal(true);
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

  const getMaintenanceStatus = (vehicle: any) => {
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

  const handleSort = (column: keyof MaintenanceEntry) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const renderSortIcon = (column: keyof MaintenanceEntry) => {
    if (sortColumn === column) {
      return sortDirection === 'asc' ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />;
    }
    return null;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-4xl font-bold text-gray-800">Suivi Maintenance & Vidanges</h2>
          <Button
            key="add-maintenance-button"
            onClick={() => handleAddMaintenance()}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg flex items-center space-x-2 transition-all duration-300"
          >
            <Plus className="w-5 h-5" />
            <span>Ajouter Maintenance</span>
          </Button>
      </div>

      {/* Alertes maintenance */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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

        {/* New Alert for Checklist Issues */}
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
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
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

      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Véhicule</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Km Actuel</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Dernière Vidange</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Km Dernière Vidange</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Prochaine Vidange</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.vehicles.map((vehicle) => {
              const nextServiceKm = (vehicle.last_service_mileage || 0) + 10000;
              const status = getMaintenanceStatus(vehicle);
              const StatusIcon = status.icon;
              
              return (
                <tr key={vehicle.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{vehicle.plate}</td>
                  <td className="px-6 py-4 text-sm font-semibold">{vehicle.mileage.toLocaleString()} km</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{formatDate(vehicle.last_service_date) || 'N/A'}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{(vehicle.last_service_mileage || 0).toLocaleString()} km</td>
                  <td className="px-6 py-4 text-sm font-semibold">{nextServiceKm.toLocaleString()} km</td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`px-3 py-1 text-xs rounded-full font-medium ${status.class} flex items-center space-x-1`}>
                      <StatusIcon className="w-3 h-3" />
                      <span>{status.text}</span>
                    </span>
                  </td>
                    <td className="px-6 py-4 text-sm">
                      <Button
                        key={vehicle.id + "-maintenance"}
                        onClick={() => handleAddMaintenance(vehicle.id)}
                        className="text-blue-600 hover:text-blue-900 transition-colors flex items-center space-x-1"
                        variant="ghost"
                        size="icon"
                      >
                        <Wrench className="w-4 h-4" />
                        <span>Maintenance</span>
                      </Button>
                    </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Historique des maintenances */}
      {data.maintenance.length > 0 && (
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800">Historique des Maintenances</h3>
          </div>

          {/* Search Input for History */}
          <div className="relative px-6 py-4">
            <Search className="absolute left-9 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher dans l'historique par véhicule, type, date ou coût..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1); // Reset to first page on new search
              }}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('date')}>
                    <div className="flex items-center">
                      Date {renderSortIcon('date')}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('vehicle_id')}>
                    <div className="flex items-center">
                      Véhicule {renderSortIcon('vehicle_id')}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('type')}>
                    <div className="flex items-center">
                      Type {renderSortIcon('type')}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('mileage')}>
                    <div className="flex items-center">
                      Kilométrage {renderSortIcon('mileage')}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('cost')}>
                    <div className="flex items-center">
                      Coût {renderSortIcon('cost')}
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {currentMaintenanceEntries.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                      Aucun enregistrement de maintenance trouvé.
                    </td>
                  </tr>
                ) : (
                  currentMaintenanceEntries.map((maintenance) => {
                    const vehicle = data.vehicles.find(v => v.id === maintenance.vehicle_id);
                    return (
                      <tr key={maintenance.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatDate(maintenance.date)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {vehicle?.plate || 'Véhicule inconnu'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{maintenance.type}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {maintenance.mileage.toLocaleString()} km
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600">
                          {maintenance.cost.toFixed(2)} TND
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls for History */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center space-x-2 mt-4 py-4">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Précédent
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`px-4 py-2 rounded-lg ${
                    currentPage === page ? 'bg-blue-600 text-white' : 'bg-gray-200 hover:bg-gray-300'
                  }`}
                >
                  {page}
                </button>
              ))}
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Suivant
              </button>
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Enregistrer une Maintenance</DialogTitle>
            <DialogDescription>
              Ajoutez un nouvel enregistrement de maintenance pour un véhicule.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
            <div>
              <label htmlFor="vehicle_id" className="block text-sm font-medium mb-2 text-gray-900">Véhicule</label>
              <select
                id="vehicle_id"
                {...register('vehicle_id')}
                className="w-full bg-gray-100 border border-gray-600 rounded-lg px-4 py-3 shadow-sm focus:ring-blue-500 focus:border-blue-500"
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
              <label htmlFor="type" className="block text-sm font-medium mb-2 text-gray-900">Type de maintenance</label>
              <select
                id="type"
                {...register('type')}
                className="w-full bg-gray-100 border border-gray-600 rounded-lg px-4 py-3 shadow-sm focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="Vidange">Vidange</option>
                <option value="Révision">Révision</option>
                <option value="Réparation">Réparation</option>
                <option value="Pneus">Changement pneus</option>
              </select>
              {errors.type && <p className="text-red-500 text-sm mt-1">{errors.type.message}</p>}
            </div>
            <div>
              <label htmlFor="date" className="block text-sm font-medium mb-2 text-gray-900">Date</label>
              <input
                id="date"
                type="date"
                {...register('date')}
                className="w-full bg-gray-100 border border-gray-600 rounded-lg px-4 py-3 shadow-sm focus:ring-blue-500 focus:border-blue-500"
              />
              {errors.date && <p className="text-red-500 text-sm mt-1">{errors.date.message}</p>}
            </div>
            <div>
              <label htmlFor="mileage" className="block text-sm font-medium mb-2 text-gray-900">Kilométrage</label>
              <input
                id="mileage"
                type="number"
                {...register('mileage', { valueAsNumber: true })}
                className="w-full bg-gray-100 border border-gray-600 rounded-lg px-4 py-3 shadow-sm focus:ring-blue-500 focus:border-blue-500"
              />
              {errors.mileage && <p className="text-red-500 text-sm mt-1">{errors.mileage.message}</p>}
            </div>
            <div>
              <label htmlFor="cost" className="block text-sm font-medium mb-2 text-gray-900">Coût (TND)</label>
              <input
                id="cost"
                type="number"
                step="0.01"
                {...register('cost', { valueAsNumber: true })}
                className="w-full bg-gray-100 border border-gray-600 rounded-lg px-4 py-3 shadow-sm focus:ring-blue-500 focus:border-blue-500"
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
              <Button
                type="submit"
              >
                Sauvegarder
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Maintenance;