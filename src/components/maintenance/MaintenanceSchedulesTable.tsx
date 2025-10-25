import React, { useMemo, useState, useCallback } from 'react';
import DataTable from '../DataTable';
import { Resource, Action, OperationResult, Vehicle, MaintenanceSchedule, DataTableColumn } from '../../types';
import { usePermissions } from '../../hooks/usePermissions';
import { showLoading, updateToast } from '../../utils/toast';
import { formatDate } from '../../utils/date';
import { Search, Calendar } from 'lucide-react';
// Removed: import { Button } from '../ui/button';

interface MaintenanceSchedulesTableProps {
  maintenanceSchedules: MaintenanceSchedule[];
  vehicles: Vehicle[];
  isLoadingFleet: boolean;
  onAddSchedule: () => void;
  onEditSchedule: (schedule: MaintenanceSchedule) => void;
  onDelete: (tableName: Resource, data: { id: string }, action: Action) => Promise<OperationResult>;
  onSchedulesPageChange: (page: number) => void;
  onSchedulesItemsPerPageChange: (count: number) => void;
  totalMaintenanceSchedulesCount: number;
  schedulesSortColumn: string;
  onSchedulesSortChange: (column: string, direction: 'asc' | 'desc') => void;
  schedulesSortDirection: 'asc' | 'desc';
  schedulesCurrentPage: number;
  schedulesItemsPerPage: number;
}

const MaintenanceSchedulesTable: React.FC<MaintenanceSchedulesTableProps> = ({
  maintenanceSchedules,
  vehicles,
  isLoadingFleet,
  onAddSchedule,
  onEditSchedule,
  onDelete,
  onSchedulesPageChange,
  onSchedulesItemsPerPageChange,
  totalMaintenanceSchedulesCount,
  schedulesSortColumn,
  onSchedulesSortChange,
  schedulesSortDirection,
  schedulesCurrentPage,
  schedulesItemsPerPage,
}) => {
  const { canAccess } = usePermissions();

  const [selectedVehicleFilter, setSelectedVehicleFilter] = useState<string>('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const uniqueTaskTypes = useMemo(() => {
    const types = new Set(maintenanceSchedules.map(s => s.task_type));
    return Array.from(types);
  }, [maintenanceSchedules]);

  const getStatusBadge = (schedule: MaintenanceSchedule) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let statusText = 'Planifié';
    let statusClass = 'bg-blue-100 text-blue-800';

    let isOverdue = false;
    let isUpcoming = false;

    if (schedule.next_due_date) {
      const nextDueDate = new Date(schedule.next_due_date);
      nextDueDate.setHours(0, 0, 0, 0);
      const daysUntilDue = Math.ceil((nextDueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      if (daysUntilDue < 0) isOverdue = true;
      else if (daysUntilDue <= 30) isUpcoming = true;
    }

    if (schedule.next_due_mileage && schedule.vehicle_id) {
      const currentVehicle = vehicles.find(v => v.id === schedule.vehicle_id);
      if (currentVehicle) {
        const kmUntilDue = schedule.next_due_mileage - currentVehicle.mileage;
        if (kmUntilDue < 0) isOverdue = true;
        else if (kmUntilDue <= 1000) isUpcoming = true;
      }
    }

    if (isOverdue) {
      statusText = 'URGENT';
      statusClass = 'bg-red-100 text-red-800';
    } else if (isUpcoming) {
      statusText = 'À venir';
      statusClass = 'bg-orange-100 text-orange-800';
    }

    return <span className={`px-3 py-1 text-xs rounded-full font-medium ${statusClass}`}>{statusText}</span>;
  };

  const columns: DataTableColumn<MaintenanceSchedule>[] = useMemo(() => [
    { key: 'task_type', label: 'Type de tâche', sortable: true, defaultVisible: true },
    {
      key: 'vehicle_info',
      label: 'Véhicule / Type',
      sortable: false,
      defaultVisible: true,
      render: (item) => {
        const vehicle = item.vehicle_id ? vehicles.find(v => v.id === item.vehicle_id) : null;
        return vehicle ? `${vehicle.plate} (${vehicle.type})` : item.vehicle_type || 'Générique';
      },
    },
    { key: 'interval_km', label: 'Intervalle (Km)', sortable: true, defaultVisible: true, render: (item) => item.interval_km ? `${item.interval_km.toLocaleString()} km` : '-' },
    { key: 'interval_months', label: 'Intervalle (Mois)', sortable: true, defaultVisible: true, render: (item) => item.interval_months ? `${item.interval_months} mois` : '-' },
    { key: 'last_performed_date', label: 'Dernière Date', sortable: true, defaultVisible: true, render: (item) => item.last_performed_date ? formatDate(item.last_performed_date) : '-' },
    { key: 'last_performed_mileage', label: 'Dernier Km', sortable: true, defaultVisible: true, render: (item) => item.last_performed_mileage ? `${item.last_performed_mileage.toLocaleString()} km` : '-' },
    { key: 'next_due_date', label: 'Prochaine Date', sortable: true, defaultVisible: true, render: (item) => item.next_due_date ? formatDate(item.next_due_date) : '-' },
    { key: 'next_due_mileage', label: 'Prochain Km', sortable: true, defaultVisible: true, render: (item) => item.next_due_mileage ? `${item.next_due_mileage.toLocaleString()} km` : '-' },
    { key: 'status', label: 'Statut', sortable: false, defaultVisible: true, render: (item) => getStatusBadge(item) },
    { key: 'notes', label: 'Notes', sortable: true, defaultVisible: false, render: (item) => item.notes || '-' },
  ], [vehicles, maintenanceSchedules]);

  const renderFilters = useCallback((searchTerm: string, setSearchTerm: (term: string) => void) => {
    return (
      <>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher un planning..."
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
            <option value="">Tous les types de tâche</option>
            {uniqueTaskTypes.map(type => (
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
  }, [vehicles, uniqueTaskTypes, selectedVehicleFilter, selectedTypeFilter, startDate, endDate]);

  const customFilter = useCallback((schedule: MaintenanceSchedule): boolean => {
    const matchesVehicle = selectedVehicleFilter ? schedule.vehicle_id === selectedVehicleFilter : true;
    const matchesType = selectedTypeFilter ? schedule.task_type === selectedTypeFilter : true;

    const scheduleDueDate = schedule.next_due_date ? new Date(schedule.next_due_date) : null;
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;

    // Ensure matchesDateRange is always a boolean
    const matchesDateRange = 
      (!start || (scheduleDueDate !== null && scheduleDueDate >= start)) &&
      (!end || (scheduleDueDate !== null && scheduleDueDate <= end));

    return matchesVehicle && matchesType && matchesDateRange;
  }, [selectedVehicleFilter, selectedTypeFilter, startDate, endDate]);

  const canAddSchedule = canAccess('maintenance_schedules', 'add');
  const canEditSchedule = canAccess('maintenance_schedules', 'edit');
  const canDeleteSchedule = canAccess('maintenance_schedules', 'delete');

  return (
    <DataTable
      title="Planification de Maintenance"
      data={maintenanceSchedules}
      columns={columns}
      onAdd={canAddSchedule ? onAddSchedule : undefined}
      onEdit={canEditSchedule ? onEditSchedule : undefined}
      onDelete={canDeleteSchedule ? async (id) => {
        const loadingToastId = showLoading('Suppression du planning de maintenance...');
        const result = await onDelete('maintenance_schedules', { id }, 'delete');
        if (result.success) {
          updateToast(loadingToastId, result.message || 'Planning de maintenance supprimé avec succès !', 'success');
        } else {
          updateToast(loadingToastId, result.error || 'Erreur lors de la suppression du planning de maintenance.', 'error');
        }
      } : undefined}
      addLabel="Ajouter Planning"
      searchPlaceholder="Rechercher un planning par type de tâche, véhicule ou notes..."
      exportFileName="plannings_maintenance"
      isLoading={isLoadingFleet}
      renderFilters={renderFilters}
      customFilter={customFilter}
      resourceType="maintenance_schedules"
      currentPage={schedulesCurrentPage}
      onPageChange={onSchedulesPageChange}
      itemsPerPage={schedulesItemsPerPage}
      onItemsPerPageChange={onSchedulesItemsPerPageChange}
      totalCount={totalMaintenanceSchedulesCount}
      sortColumn={schedulesSortColumn}
      onSortChange={onSchedulesSortChange}
      sortDirection={schedulesSortDirection}
    />
  );
};

export default MaintenanceSchedulesTable;