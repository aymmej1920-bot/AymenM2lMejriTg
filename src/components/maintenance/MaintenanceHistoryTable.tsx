import React from 'react';
import DataTable from '../DataTable';
import { Resource, Action, OperationResult, Vehicle, MaintenanceEntry } from '../../types';
// import { usePermissions } from '../../hooks/usePermissions'; // Removed import
import { showLoading, updateToast } from '../../utils/toast';
import { useMaintenanceFilters } from '../../hooks/useMaintenanceFilters';
import { useMaintenanceTableColumns } from '../../hooks/useMaintenanceTableColumns';

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
  maintenanceCurrentPage: number;
  maintenanceItemsPerPage: number;
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
  maintenanceCurrentPage,
  maintenanceItemsPerPage,
}) => {
  // const { canAccess } = usePermissions(); // Removed usePermissions

  // Destructure renderFilters and customFilter from the hook
  const { renderFilters, customFilter } = useMaintenanceFilters({ vehicles, maintenanceEntries });

  const { maintenanceHistoryColumns } = useMaintenanceTableColumns({ vehicles, onAddMaintenance, canAddForm: true }); // canAddForm is always true now

  const canAddMaintenanceEntry = true; // All authenticated users can add their own data
  const canDeleteMaintenanceEntry = true; // All authenticated users can delete their own data

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
      renderFilters={renderFilters} // Pass the renderFilters function directly
      customFilter={customFilter} // Pass the custom filter function
      resourceType="maintenance_entries"
      currentPage={maintenanceCurrentPage}
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