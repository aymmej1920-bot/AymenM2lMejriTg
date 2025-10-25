import React, { useState, useMemo, useCallback } from 'react';
import { Search, Calendar } from 'lucide-react';
import DataTable from '../DataTable';
import { MaintenanceEntry, DataTableColumn, Resource, Action, OperationResult, Vehicle } from '../../types';
import { formatDate } from '../../utils/date';
import { usePermissions } from '../../hooks/usePermissions';
import { showLoading, updateToast } from '../../utils/toast';

interface MaintenanceHistoryTableProps {
  maintenanceEntries: MaintenanceEntry[];
  vehicles: Vehicle[];
  isLoadingFleet: boolean;
  onAddMaintenance: (vehicleId?: string) => void;
  onDelete: (tableName: Resource, data: { id: string }, action: Action) => Promise<OperationResult>;
  onMaintenancePageChange: (page: number) => void;
  onMaintenanceItemsPerPageChange: (count: number) => void;
  totalMaintenanceEntriesCount: number;
  maintenanceSortColumn: string;
  onMaintenanceSortChange: (column: string, direction: 'asc' | 'desc') => void;
  maintenanceSortDirection: 'asc' | 'desc';
}

const MaintenanceHistoryTable: React.FC<MaintenanceHistoryTableProps> = ({
  maintenanceEntries,
  vehicles,
  isLoadingFleet,
  onAddMaintenance,
  onDelete,
  onMaintenancePageChange,
  onMaintenanceItemsPerPageChange,
  totalMaintenanceEntriesCount,
  maintenanceSortColumn,
  onMaintenanceSortChange,
  maintenanceSortDirection,
}) => {
  const { canAccess } = usePermissions();

  const [selectedVehicleFilter, setSelectedVehicleFilter] = useState<string>('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const uniqueMaintenanceTypes = useMemo(() => {
    const types = new Set(maintenanceEntries.map(m => m.type));
    return Array.from(types);
  }, [maintenanceEntries]);

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

  const canAddMaintenanceEntry = canAccess('maintenance_entries', 'add');
  const canDeleteMaintenanceEntry = canAccess('maintenance_entries', 'delete');

  return (
    <DataTable
      title="Historique des Entrées de Maintenance"
      data={maintenanceEntries}
      columns={maintenanceHistoryColumns}
      onAdd={canAddMaintenanceEntry ? () => onAddMaintenance() : undefined}
      onDelete={canDeleteMaintenanceEntry ? async (id) => {
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
      currentPage={maintenanceSortColumn}
      onPageChange={onMaintenancePageChange}
      itemsPerPage={maintenanceItemsPerPage}
      onItemsPerPageChange={onMaintenanceItemsPerPageChange}
      totalCount={totalMaintenanceEntriesCount}
      sortColumn={maintenanceSortColumn}
      onSortChange={onMaintenanceSortChange}
      sortDirection={maintenanceSortDirection}
    />
  );
};

export default MaintenanceHistoryTable;