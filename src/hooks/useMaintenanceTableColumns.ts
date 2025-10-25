import React, { useMemo } from 'react';
import { MaintenanceEntry, DataTableColumn, Vehicle } from '../types';
import { formatDate } from '../utils/date';
import { getDaysSinceEntry } from '../utils/date'; // Assuming this utility exists

interface UseMaintenanceTableColumnsProps {
  vehicles: Vehicle[];
  onAddMaintenance: (vehicleId?: string) => void; // Keep this if needed for row actions
  canAddForm: boolean; // Keep this if needed for row actions
}

export const useMaintenanceTableColumns = ({ vehicles }: UseMaintenanceTableColumnsProps) => {
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
    { key: 'days_since_entry', label: 'Jours depuis l\'entrée', sortable: true, defaultVisible: true, render: (item: MaintenanceEntry) => getDaysSinceEntry(item.date) },
  ], [vehicles]);

  return { maintenanceHistoryColumns };
};