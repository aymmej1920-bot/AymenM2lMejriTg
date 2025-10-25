import React, { useState, useCallback } from 'react';
import { Resource, Action, OperationResult, MaintenanceSchedule, MaintenanceEntry } from '../types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from './ui/dialog';
import { useFleetData } from '../components/FleetDataProvider';
import MaintenanceForm from './maintenance/MaintenanceForm';
import VehicleMaintenanceOverview from './maintenance/VehicleMaintenanceOverview';
import MaintenanceHistoryTable from './maintenance/MaintenanceHistoryTable';
import MaintenanceSchedulesTable from './maintenance/MaintenanceSchedulesTable'; // New import
import MaintenanceScheduleForm from './maintenance/MaintenanceScheduleForm'; // New import
import { Button } from './ui/button'; // Import Button for tabs
import { showLoading, updateToast, dismissToast } from '../utils/toast'; // Import dismissToast
import moment from 'moment'; // Import moment for date calculations

interface MaintenanceProps {
  onAdd: (tableName: Resource, data: any, action: Action) => Promise<OperationResult>;
  onUpdate: (tableName: Resource, data: any, action: Action) => Promise<OperationResult>;
  onDelete: (tableName: Resource, data: { id: string }, action: Action) => Promise<OperationResult>;
}

const Maintenance: React.FC<MaintenanceProps> = ({ onAdd, onUpdate, onDelete }) => {
  const { fleetData, isLoadingFleet, getResourcePaginationState, setResourcePaginationState } = useFleetData();
  const { vehicles, maintenance: maintenanceEntries, pre_departure_checklists: preDepartureChecklists, maintenance_schedules: maintenanceSchedules } = fleetData;

  const [activeTab, setActiveTab] = useState<'history' | 'schedules'>('history'); // New state for tabs
  const [showMaintenanceEntryModal, setShowMaintenanceEntryModal] = useState(false);
  const [showMaintenanceScheduleModal, setShowMaintenanceScheduleModal] = useState(false);
  const [initialVehicleIdForEntryForm, setInitialVehicleIdForEntryForm] = useState<string | undefined>(undefined);
  const [editingSchedule, setEditingSchedule] = useState<MaintenanceSchedule | null>(null);

  // Pagination and sorting states for vehicles
  const {
    currentPage: vehiclesCurrentPage = 1,
    itemsPerPage: vehiclesItemsPerPage = 10,
    sortColumn: vehiclesSortColumn = 'plate',
    sortDirection: vehiclesSortDirection = 'asc',
    totalCount: totalVehiclesCount = 0
  } = getResourcePaginationState('vehicles') || {};
  const onVehiclesPageChange = useCallback((page: number) => setResourcePaginationState('vehicles', { currentPage: page }), [setResourcePaginationState]);
  const onVehiclesItemsPerPageChange = useCallback((count: number) => setResourcePaginationState('vehicles', { itemsPerPage: count }), [setResourcePaginationState]);
  const onVehiclesSortChange = useCallback((column: string, direction: 'asc' | 'desc') => setResourcePaginationState('vehicles', { sortColumn: column, sortDirection: direction }), [setResourcePaginationState]);

  // Pagination and sorting states for maintenance_entries
  const {
    currentPage: maintenanceCurrentPage = 1,
    itemsPerPage: maintenanceItemsPerPage = 10,
    sortColumn: maintenanceSortColumn = 'date',
    sortDirection: maintenanceSortDirection = 'desc',
    totalCount: totalMaintenanceEntriesCount = 0
  } = getResourcePaginationState('maintenance_entries') || {};
  const onMaintenancePageChange = useCallback((page: number) => setResourcePaginationState('maintenance_entries', { currentPage: page }), [setResourcePaginationState]);
  const onMaintenanceItemsPerPageChange = useCallback((count: number) => setResourcePaginationState('maintenance_entries', { itemsPerPage: count }), [setResourcePaginationState]);
  const onMaintenanceSortChange = useCallback((column: string, direction: 'asc' | 'desc') => setResourcePaginationState('maintenance_entries', { sortColumn: column, sortDirection: direction }), [setResourcePaginationState]);

  // Pagination and sorting states for maintenance_schedules
  const {
    currentPage: schedulesCurrentPage = 1,
    itemsPerPage: schedulesItemsPerPage = 10,
    sortColumn: schedulesSortColumn = 'next_due_date',
    sortDirection: schedulesSortDirection = 'asc',
    totalCount: totalMaintenanceSchedulesCount = 0
  } = getResourcePaginationState('maintenance_schedules') || {};
  const onSchedulesPageChange = useCallback((page: number) => setResourcePaginationState('maintenance_schedules', { currentPage: page }), [setResourcePaginationState]);
  const onSchedulesItemsPerPageChange = useCallback((count: number) => setResourcePaginationState('maintenance_schedules', { itemsPerPage: count }), [setResourcePaginationState]);
  const onSchedulesSortChange = useCallback((column: string, direction: 'asc' | 'desc') => setResourcePaginationState('maintenance_schedules', { sortColumn: column, sortDirection: direction }), [setResourcePaginationState]);

  const handleUpdateMaintenanceSchedule = useCallback(async (newMaintenanceEntry: MaintenanceEntry) => {
    const loadingToastId = showLoading('Mise à jour du planning de maintenance lié...');
    try {
        const matchingSchedules = fleetData.maintenance_schedules.filter(schedule => {
            // Match by task type
            if (schedule.task_type !== newMaintenanceEntry.type) return false;

            // Match by specific vehicle_id if specified in schedule
            if (schedule.vehicle_id) {
                return schedule.vehicle_id === newMaintenanceEntry.vehicle_id;
            }

            // Match by vehicle_type if specified in schedule and no specific vehicle_id
            if (schedule.vehicle_type) {
                const vehicle = fleetData.vehicles.find(v => v.id === newMaintenanceEntry.vehicle_id);
                return vehicle?.type === schedule.vehicle_type;
            }

            // If schedule is generic (no vehicle_id or vehicle_type), it matches
            return !schedule.vehicle_id && !schedule.vehicle_type;
        });

        if (matchingSchedules.length === 0) {
            dismissToast(loadingToastId);
            return; // No matching schedule to update
        }

        // For simplicity, let's update the first matching schedule.
        // A more complex scenario might require user choice or a more sophisticated matching algorithm.
        const scheduleToUpdate = matchingSchedules[0];

        let newNextDueDate: string | null = null;
        let newNextDueMileage: number | null = null;

        // Recalculate next due date
        if (scheduleToUpdate.interval_months) {
            newNextDueDate = moment(newMaintenanceEntry.date).add(scheduleToUpdate.interval_months, 'months').format('YYYY-MM-DD');
        }

        // Recalculate next due mileage
        if (scheduleToUpdate.interval_km) {
            newNextDueMileage = newMaintenanceEntry.mileage + scheduleToUpdate.interval_km;
        }

        const updatedSchedule: MaintenanceSchedule = {
            ...scheduleToUpdate,
            last_performed_date: newMaintenanceEntry.date,
            last_performed_mileage: newMaintenanceEntry.mileage,
            next_due_date: newNextDueDate,
            next_due_mileage: newNextDueMileage,
            updated_at: new Date().toISOString(),
        };

        const result = await onUpdate('maintenance_schedules', updatedSchedule, 'edit');
        if (result.success) {
            updateToast(loadingToastId, 'Planning de maintenance lié mis à jour !', 'success');
        } else {
            throw new Error(result.error || 'Erreur lors de la mise à jour du planning de maintenance lié.');
        }
    } catch (error: unknown) {
        updateToast(loadingToastId, `Erreur lors de la mise à jour du planning de maintenance lié: ${error instanceof Error ? error.message : String(error)}`, 'error');
    }
}, [onUpdate, fleetData.vehicles, fleetData.maintenance_schedules]);


  const handleAddMaintenanceEntry = (vehicleId?: string) => {
    setInitialVehicleIdForEntryForm(vehicleId);
    setShowMaintenanceEntryModal(true);
  };

  const handleCloseMaintenanceEntryModal = () => {
    setShowMaintenanceEntryModal(false);
    setInitialVehicleIdForEntryForm(undefined);
  };

  const handleAddMaintenanceSchedule = () => {
    setEditingSchedule(null);
    setShowMaintenanceScheduleModal(true);
  };

  const handleEditMaintenanceSchedule = (schedule: MaintenanceSchedule) => {
    setEditingSchedule(schedule);
    setShowMaintenanceScheduleModal(true);
  };

  const handleCloseMaintenanceScheduleModal = () => {
    setShowMaintenanceScheduleModal(false);
    setEditingSchedule(null);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-4xl font-bold text-gray-800">Gestion de la Maintenance</h2>

      <div className="flex space-x-4 border-b border-gray-200">
        <Button
          variant={activeTab === 'history' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('history')}
          className="hover-lift"
        >
          Historique de Maintenance
        </Button>
        <Button
          variant={activeTab === 'schedules' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('schedules')}
          className="hover-lift"
        >
          Planification de Maintenance
        </Button>
      </div>

      {activeTab === 'history' && (
        <>
          <VehicleMaintenanceOverview
            vehicles={vehicles}
            preDepartureChecklists={preDepartureChecklists}
            isLoadingFleet={isLoadingFleet}
            onAddMaintenance={handleAddMaintenanceEntry}
            onVehiclesPageChange={onVehiclesPageChange}
            onVehiclesItemsPerPageChange={onVehiclesItemsPerPageChange}
            totalVehiclesCount={totalVehiclesCount}
            vehiclesSortColumn={vehiclesSortColumn}
            onVehiclesSortChange={onVehiclesSortChange}
            vehiclesSortDirection={vehiclesSortDirection}
            vehiclesCurrentPage={vehiclesCurrentPage}
            vehiclesItemsPerPage={vehiclesItemsPerPage}
          />

          <MaintenanceHistoryTable
            maintenanceEntries={maintenanceEntries}
            vehicles={vehicles}
            isLoadingFleet={isLoadingFleet}
            onAddMaintenance={handleAddMaintenanceEntry}
            onDelete={onDelete}
            onMaintenancePageChange={onMaintenancePageChange}
            onMaintenanceItemsPerPageChange={onMaintenanceItemsPerPageChange}
            totalMaintenanceEntriesCount={totalMaintenanceEntriesCount}
            maintenanceSortColumn={maintenanceSortColumn}
            onMaintenanceSortChange={onMaintenanceSortChange}
            maintenanceSortDirection={maintenanceSortDirection}
            maintenanceCurrentPage={maintenanceCurrentPage}
            maintenanceItemsPerPage={maintenanceItemsPerPage}
          />
        </>
      )}

      {activeTab === 'schedules' && (
        <MaintenanceSchedulesTable
          maintenanceSchedules={maintenanceSchedules}
          vehicles={vehicles}
          isLoadingFleet={isLoadingFleet}
          onAddSchedule={handleAddMaintenanceSchedule}
          onEditSchedule={handleEditMaintenanceSchedule}
          onDelete={onDelete}
          onSchedulesPageChange={onSchedulesPageChange}
          onSchedulesItemsPerPageChange={onSchedulesItemsPerPageChange}
          totalMaintenanceSchedulesCount={totalMaintenanceSchedulesCount}
          schedulesSortColumn={schedulesSortColumn}
          onSchedulesSortChange={onSchedulesSortChange}
          schedulesSortDirection={schedulesSortDirection}
          schedulesCurrentPage={schedulesCurrentPage}
          schedulesItemsPerPage={schedulesItemsPerPage}
        />
      )}

      <Dialog open={showMaintenanceEntryModal} onOpenChange={handleCloseMaintenanceEntryModal}>
        <DialogContent className="sm:max-w-[425px] glass animate-scale-in">
          <DialogHeader>
            <DialogTitle>Ajouter une Entrée de Maintenance</DialogTitle>
            <DialogDescription>
              Remplissez les détails de l'entrée de maintenance.
            </DialogDescription>
          </DialogHeader>
          <MaintenanceForm
            onAdd={onAdd}
            onUpdateVehicle={onUpdate}
            onClose={handleCloseMaintenanceEntryModal}
            initialVehicleId={initialVehicleIdForEntryForm}
            onUpdateSchedule={handleUpdateMaintenanceSchedule} // Pass the new function here
          />
        </DialogContent>
      </Dialog>

      <Dialog open={showMaintenanceScheduleModal} onOpenChange={handleCloseMaintenanceScheduleModal}>
        <DialogContent className="sm:max-w-[600px] glass animate-scale-in">
          <DialogHeader>
            <DialogTitle>{editingSchedule ? 'Modifier un Planning de Maintenance' : 'Ajouter un Planning de Maintenance'}</DialogTitle>
            <DialogDescription>
              {editingSchedule ? 'Modifiez les détails du planning de maintenance.' : 'Ajoutez un nouveau planning de maintenance récurrent.'}
            </DialogDescription>
          </DialogHeader>
          <MaintenanceScheduleForm
            onAdd={onAdd}
            onUpdate={onUpdate}
            onClose={handleCloseMaintenanceScheduleModal}
            editingSchedule={editingSchedule}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Maintenance;