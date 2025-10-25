import { useMemo } from 'react';
import { MaintenanceEntry, DataTableColumn, Vehicle } from '../types';
import { formatDate } from '../utils/date';
import { getDaysSinceEntry } from '../utils/date';

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
    { key: 'description', label: 'Description', sortable: true, defaultVisible: true, render: (item: MaintenanceEntry) => item.description || '-' }, // New column
    { key: 'mileage', label: 'Kilométrage', sortable: true, defaultVisible: true, render: (item: MaintenanceEntry) => `${item.mileage.toLocaleString()} km` },
    { key: 'parts_cost', label: 'Coût Pièces', sortable: true, defaultVisible: true, render: (item: MaintenanceEntry) => `${(item.parts_cost || 0).toFixed(2)} TND` }, // New column
    { key: 'labor_cost', label: 'Coût Main-d\'œuvre', sortable: true, defaultVisible: true, render: (item: MaintenanceEntry) => `${(item.labor_cost || 0).toFixed(2)} TND` }, // New column
    { key: 'cost', label: 'Coût Total', sortable: true, defaultVisible: true, render: (item: MaintenanceEntry) => `${item.cost.toFixed(2)} TND` },
    { key: 'days_since_entry', label: 'Jours depuis l\'entrée', sortable: true, defaultVisible: true, render: (item: MaintenanceEntry) => getDaysSinceEntry(item.date) },
  ], [vehicles]);

  return { maintenanceHistoryColumns };
};