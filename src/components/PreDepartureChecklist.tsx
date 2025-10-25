import React, { useState, useMemo, useCallback } from 'react';
import { AlertTriangle, Calendar, Search } from 'lucide-react';
import { PreDepartureChecklist, DataTableColumn, Resource, Action, OperationResult } from '../types';
import { formatDate } from '../utils/date';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from './ui/dialog';
import DataTable from './DataTable';
import { usePermissions } from '../hooks/usePermissions';
import ChecklistForm from './checklists/ChecklistForm';
import ChecklistStatusIcon from './checklists/ChecklistStatusIcon';
import { useFleetData } from '../components/FleetDataProvider';
import { showLoading, updateToast } from '../utils/toast';

interface PreDepartureChecklistProps {
  onAdd: (tableName: Resource, checklist: Omit<PreDepartureChecklist, 'id' | 'user_id' | 'created_at'>, action: Action) => Promise<OperationResult>;
  onDelete: (tableName: Resource, data: { id: string }, action: Action) => Promise<OperationResult>;
}

const PreDepartureChecklistComponent: React.FC<PreDepartureChecklistProps> = ({ onAdd, onDelete }) => {
  const { canAccess } = usePermissions();
  
  const { fleetData, isLoadingFleet, getResourcePaginationState, setResourcePaginationState } = useFleetData();
  const preDepartureChecklists = fleetData.pre_departure_checklists;
  const vehicles = fleetData.vehicles;
  const drivers = fleetData.drivers;

  // Get and set pagination/sorting states from FleetDataProvider
  const { currentPage, itemsPerPage, sortColumn, sortDirection, totalCount } = getResourcePaginationState('pre_departure_checklists');

  const onPageChange = useCallback((page: number) => setResourcePaginationState('pre_departure_checklists', { currentPage: page }), [setResourcePaginationState]);
  const onItemsPerPageChange = useCallback((count: number) => setResourcePaginationState('pre_departure_checklists', { itemsPerPage: count }), [setResourcePaginationState]);
  const onSortChange = useCallback((column: string, direction: 'asc' | 'desc') => setResourcePaginationState('pre_departure_checklists', { sortColumn: column, sortDirection: direction }), [setResourcePaginationState]);


  const [showModal, setShowModal] = useState(false);

  const canAddChecklist = canAccess('pre_departure_checklists', 'add');
  const canDeleteChecklist = canAccess('pre_departure_checklists', 'delete');

  // State for filtering
  const [selectedVehicle, setSelectedVehicle] = useState<string>('');
  const [selectedDriver, setSelectedDriver] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const hasChecklistForMonth = useCallback((vehicleId: string, month: number, year: number): boolean => {
    return preDepartureChecklists.some(cl => {
      const clDate = new Date(cl.date);
      return cl.vehicle_id === vehicleId &&
             clDate.getMonth() === month &&
             clDate.getFullYear() === year;
    });
  }, [preDepartureChecklists]);

  const handleAddChecklist = () => {
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
  };

  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();

  const vehiclesMissingChecklist = useMemo(() => {
    return vehicles.filter(vehicle =>
      !hasChecklistForMonth(vehicle.id, currentMonth, currentYear)
    );
  }, [vehicles, hasChecklistForMonth, currentMonth, currentYear]);

  const columns: DataTableColumn<PreDepartureChecklist>[] = useMemo(() => [
    { key: 'date', label: 'Date', sortable: true, defaultVisible: true, render: (item) => formatDate(item.date) },
    {
      key: 'vehicle_id',
      label: 'Véhicule',
      sortable: true,
      defaultVisible: true,
      render: (item) => vehicles.find(v => v.id === item.vehicle_id)?.plate || 'N/A',
    },
    {
      key: 'driver_id',
      label: 'Conducteur',
      sortable: true,
      defaultVisible: true,
      render: (item) => drivers.find(d => d.id === item.driver_id)?.name || 'N/A',
    },
    { key: 'tire_pressure_ok', label: 'Pneus', sortable: true, defaultVisible: true, render: (item) => <ChecklistStatusIcon status={item.tire_pressure_ok} /> },
    { key: 'lights_ok', label: 'Feux', sortable: true, defaultVisible: true, render: (item) => <ChecklistStatusIcon status={item.lights_ok} /> },
    { key: 'oil_level_ok', label: 'Huile', sortable: true, defaultVisible: true, render: (item) => <ChecklistStatusIcon status={item.oil_level_ok} /> },
    { key: 'fluid_levels_ok', label: 'Fluides', sortable: true, defaultVisible: true, render: (item) => <ChecklistStatusIcon status={item.fluid_levels_ok} /> },
    { key: 'brakes_ok', label: 'Freins', sortable: true, defaultVisible: true, render: (item) => <ChecklistStatusIcon status={item.brakes_ok} /> },
    { key: 'wipers_ok', label: 'Essuie-glaces', sortable: true, defaultVisible: true, render: (item) => <ChecklistStatusIcon status={item.wipers_ok} /> },
    { key: 'horn_ok', label: 'Klaxon', sortable: true, defaultVisible: true, render: (item) => <ChecklistStatusIcon status={item.horn_ok} /> },
    { key: 'mirrors_ok', label: 'Rétroviseurs', sortable: true, defaultVisible: true, render: (item) => <ChecklistStatusIcon status={item.mirrors_ok} /> },
    { key: 'ac_working_ok', label: 'Climatiseur', sortable: true, defaultVisible: true, render: (item) => <ChecklistStatusIcon status={item.ac_working_ok} /> },
    { key: 'windows_working_ok', label: 'Vitres', sortable: true, defaultVisible: true, render: (item) => <ChecklistStatusIcon status={item.windows_working_ok} /> },
    { key: 'observations', label: 'Observations', sortable: true, defaultVisible: true, render: (item) => item.observations || '-' },
    { key: 'issues_to_address', label: 'À Traiter', sortable: true, defaultVisible: true, render: (item) => item.issues_to_address || '-' },
  ], [vehicles, drivers]);

  const renderAlerts = useCallback(() => {
    if (vehiclesMissingChecklist.length === 0) return null;
    return (
      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r-lg glass">
        <div className="flex items-center">
          <AlertTriangle className="w-5 h-5 text-yellow-400 mr-3" />
          <div>
            <h3 className="text-yellow-800 font-semibold">Checklists Mensuelles Manquantes</h3>
            <p className="text-yellow-700">
              {vehiclesMissingChecklist.length} véhicule(s) n'ont pas de checklist pour ce mois-ci :{' '}
              <span className="font-medium">{vehiclesMissingChecklist.map(v => v.plate).join(', ')}</span>.
            </p>
          </div>
        </div>
      </div>
    );
  }, [vehiclesMissingChecklist]);

  const renderFilters = useCallback((searchTerm: string, setSearchTerm: (term: string) => void) => {
    return (
      <>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher une checklist..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all glass"
          />
        </div>
        <div>
          <select
            value={selectedVehicle}
            onChange={(e) => {
              setSelectedVehicle(e.target.value);
            }}
            className="w-full glass border border-gray-300 rounded-lg px-4 py-3 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
            value={selectedDriver}
            onChange={(e) => {
              setSelectedDriver(e.target.value);
            }}
            className="w-full glass border border-gray-300 rounded-lg px-4 py-3 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Tous les conducteurs</option>
            {drivers.map(driver => (
              <option key={driver.id} value={driver.id}>
                {driver.name}
              </option>
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
            className="w-full glass border border-gray-300 rounded-lg pl-4 pr-10 py-3 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Date de fin"
          />
          <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
        </div>
      </>
    );
  }, [vehicles, drivers, selectedVehicle, selectedDriver, startDate, endDate]);

  const customFilter = useCallback((checklist: PreDepartureChecklist) => {
    const matchesVehicle = selectedVehicle ? checklist.vehicle_id === selectedVehicle : true;
    const matchesDriver = selectedDriver ? checklist.driver_id === selectedDriver : true;

    const checklistDate = new Date(checklist.date);
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;

    const matchesDateRange = 
      (!start || checklistDate >= start) &&
      (!end || checklistDate <= end);

    return matchesVehicle && matchesDriver && matchesDateRange;
  }, [selectedVehicle, selectedDriver, startDate, endDate]);

  return (
    <div className="space-y-6">
      <DataTable
        title="Checklists Avant Départ"
        data={preDepartureChecklists}
        columns={columns}
        onAdd={canAddChecklist ? handleAddChecklist : undefined}
        onDelete={canDeleteChecklist ? async (id) => {
          const loadingToastId = showLoading('Suppression de la checklist...');
          const result = await onDelete('pre_departure_checklists', { id }, 'delete');
          if (result.success) {
            updateToast(loadingToastId, result.message || 'Checklist supprimée avec succès !', 'success');
          } else {
            updateToast(loadingToastId, result.error || 'Erreur lors de la suppression de la checklist.', 'error');
          }
        } : undefined}
        addLabel="Nouvelle Checklist"
        searchPlaceholder="Rechercher une checklist par date, véhicule, conducteur, observations ou problèmes..."
        exportFileName="checklists_avant_depart"
        isLoading={isLoadingFleet}
        renderAlerts={renderAlerts} {/* Pass renderAlerts here */}
        renderFilters={renderFilters}
        customFilter={customFilter}
        resourceType="pre_departure_checklists"
        // Pagination and sorting props
        currentPage={currentPage}
        onPageChange={onPageChange}
        itemsPerPage={itemsPerPage}
        onItemsPerPageChange={onItemsPerPageChange}
        totalCount={totalCount}
        sortColumn={sortColumn}
        onSortChange={onSortChange}
        sortDirection={sortDirection}
      />

      <Dialog open={showModal} onOpenChange={handleCloseModal}>
        <DialogContent className="sm:max-w-xl glass animate-scale-in">
          <DialogHeader>
            <DialogTitle>Nouvelle Checklist Avant Départ</DialogTitle>
            <DialogDescription>
              Remplissez les détails de la checklist avant le départ du véhicule.
            </DialogDescription>
          </DialogHeader>
          <ChecklistForm
            onAdd={onAdd}
            onClose={handleCloseModal}
            canAdd={canAddChecklist}
            hasChecklistForMonth={hasChecklistForMonth}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PreDepartureChecklistComponent;