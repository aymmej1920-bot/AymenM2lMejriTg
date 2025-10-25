import React, { useState, useCallback } from 'react';
import { Resource, Action, OperationResult } from '../types';
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

interface MaintenanceProps {
  onAdd: (tableName: Resource, maintenanceEntry: any, action: Action) => Promise<OperationResult>;
  onUpdate: (tableName: Resource, data: any, action: Action) => Promise<OperationResult>;
  onDelete: (tableName: Resource, data: { id: string }, action: Action) => Promise<OperationResult>;
}

const Maintenance: React.FC<MaintenanceProps> = ({ onAdd, onUpdate, onDelete }) => {
  const { fleetData, isLoadingFleet, getResourcePaginationState, setResourcePaginationState } = useFleetData();
  const { vehicles, maintenance: maintenanceEntries, pre_departure_checklists: preDepartureChecklists } = fleetData;

  const [showModal, setShowModal] = useState(false);
  const [initialVehicleIdForForm, setInitialVehicleIdForForm] = useState<string | undefined>(undefined);

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

  const handleAddMaintenance = (vehicleId?: string) => {
    setInitialVehicleIdForForm(vehicleId);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setInitialVehicleIdForForm(undefined);
  };

  return (
    <div className="space-y-6">
      <VehicleMaintenanceOverview
        vehicles={vehicles}
        preDepartureChecklists={preDepartureChecklists}
        isLoadingFleet={isLoadingFleet}
        onAddMaintenance={handleAddMaintenance}
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
        onAddMaintenance={handleAddMaintenance}
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

      <Dialog open={showModal} onOpenChange={handleCloseModal}>
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
            onClose={handleCloseModal}
            initialVehicleId={initialVehicleIdForForm}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Maintenance;