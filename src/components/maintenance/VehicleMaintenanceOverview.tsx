import React, { useCallback, useMemo } from 'react';
import DataTable from '../DataTable';
import { Vehicle, DataTableColumn, PreDepartureChecklist } from '../../types';
import { formatDate } from '../../utils/date';
import { Button } from '../ui/button';
import { usePermissions } from '../../hooks/usePermissions';
import { getMaintenanceStatus } from '../../utils/maintenance'; // Import the utility function
import { AlertTriangle, Clock, ClipboardCheck, Wrench } from 'lucide-react'; // Import icons

interface VehicleMaintenanceOverviewProps {
  vehicles: Vehicle[];
  preDepartureChecklists: PreDepartureChecklist[];
  isLoadingFleet: boolean;
  onAddMaintenance: (vehicleId?: string) => void;
  onVehiclesPageChange: (page: number) => void;
  onVehiclesItemsPerPageChange: (count: number) => void;
  totalVehiclesCount: number;
  vehiclesSortColumn: string;
  onVehiclesSortChange: (column: string, direction: 'asc' | 'desc') => void;
  vehiclesSortDirection: 'asc' | 'desc';
  vehiclesCurrentPage: number;
  vehiclesItemsPerPage: number;
}

const VehicleMaintenanceOverview: React.FC<VehicleMaintenanceOverviewProps> = ({
  vehicles,
  preDepartureChecklists,
  isLoadingFleet,
  onAddMaintenance,
  onVehiclesPageChange,
  onVehiclesItemsPerPageChange,
  totalVehiclesCount,
  vehiclesSortColumn,
  onVehiclesSortChange,
  vehiclesSortDirection,
  vehiclesCurrentPage,
  vehiclesItemsPerPage,
}) => {
  const { canAccess } = usePermissions();

  const checklistsWithIssues = useMemo(() => {
    return preDepartureChecklists.filter(cl => cl.issues_to_address && cl.issues_to_address.trim() !== '');
  }, [preDepartureChecklists]);

  const renderMaintenanceAlerts = useCallback(() => {
    const upcomingMaintenanceCount = vehicles.filter(vehicle => {
      const nextService = (vehicle.last_service_mileage || 0) + 10000;
      const kmUntilService = nextService - vehicle.mileage;
      return kmUntilService <= 1000 && kmUntilService > 0;
    }).length;

    const urgentMaintenanceCount = vehicles.filter(vehicle => {
      const nextService = (vehicle.last_service_mileage || 0) + 10000;
      const kmUntilService = nextService - vehicle.mileage;
      return kmUntilService <= 0;
    }).length;

    if (urgentMaintenanceCount === 0 && upcomingMaintenanceCount === 0 && checklistsWithIssues.length === 0) {
      return null;
    }

    return (
      <div className="space-y-4 animate-slide-up">
        {urgentMaintenanceCount > 0 && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-r-lg glass">
            <div className="flex items-center">
              <AlertTriangle className="w-5 h-5 text-red-400 mr-3" />
              <div>
                <h3 className="text-red-800 font-semibold">Maintenance Urgente Requise</h3>
                <p className="text-red-700">
                  {urgentMaintenanceCount} véhicule(s) ont dépassé leur échéance de maintenance.
                </p>
              </div>
            </div>
          </div>
        )}
        {upcomingMaintenanceCount > 0 && (
          <div className="bg-orange-50 border-l-4 border-orange-400 p-4 rounded-r-lg glass">
            <div className="flex items-center">
              <Clock className="w-5 h-5 text-orange-400 mr-3" />
              <div>
                <h3 className="text-orange-800 font-semibold">Maintenance à Venir</h3>
                <p className="text-orange-700">
                  {upcomingMaintenanceCount} véhicule(s) nécessitent une maintenance dans moins de 1000 km.
                </p>
              </div>
            </div>
          </div>
        )}
        {checklistsWithIssues.length > 0 && (
          <div className="bg-purple-50 border-l-4 border-purple-400 p-4 rounded-r-lg glass">
            <div className="flex items-center">
              <ClipboardCheck className="w-5 h-5 text-purple-400 mr-3" />
              <div>
                <h3 className="text-purple-800 font-semibold">Points à Traiter (Checklists)</h3>
                <p className="text-purple-700">
                  {checklistsWithIssues.length} checklist(s) contiennent des problèmes à résoudre.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }, [vehicles, checklistsWithIssues]);

  const vehicleMaintenanceColumns: DataTableColumn<Vehicle>[] = useMemo(() => [
    { key: 'plate', label: 'Véhicule', sortable: true, defaultVisible: true },
    { key: 'mileage', label: 'Km Actuel', sortable: true, defaultVisible: true, render: (item: Vehicle) => `${item.mileage.toLocaleString()} km` },
    { key: 'last_service_date', label: 'Dernière Vidange', sortable: true, defaultVisible: true, render: (item: Vehicle) => formatDate(item.last_service_date) || 'N/A' },
    { key: 'last_service_mileage', label: 'Km Dernière Vidange', sortable: true, defaultVisible: true, render: (item: Vehicle) => `${(item.last_service_mileage || 0).toLocaleString()} km` },
    { 
      key: 'next_service_km', 
      label: 'Prochaine Vidange', 
      sortable: true, 
      defaultVisible: true, 
      render: (item: Vehicle) => {
        const nextServiceKm = (item.last_service_mileage || 0) + 10000;
        return `${nextServiceKm.toLocaleString()} km`;
      }
    },
    { 
      key: 'status', 
      label: 'Statut', 
      sortable: false, 
      defaultVisible: true, 
      render: (item: Vehicle) => {
        const status = getMaintenanceStatus(item);
        const Icon = status.icon;
        return (
          <span className={`px-3 py-1 text-xs rounded-full font-medium flex items-center space-x-1 ${status.class}`}>
            <Icon className="w-4 h-4" />
            <span>{status.text}</span>
          </span>
        );
      }
    },
  ], []);

  const canAddMaintenanceEntry = canAccess('maintenance_entries', 'add');

  return (
    <>
      {renderMaintenanceAlerts()}
      <DataTable
        title="Suivi de Maintenance des Véhicules"
        data={vehicles}
        columns={vehicleMaintenanceColumns}
        onAdd={canAddMaintenanceEntry ? () => onAddMaintenance() : undefined}
        addLabel="Ajouter Maintenance"
        searchPlaceholder="Rechercher un véhicule par plaque, type ou statut..."
        exportFileName="maintenance_vehicules"
        isLoading={isLoadingFleet}
        resourceType="vehicles"
        renderRowActions={(item) => (
          canAddMaintenanceEntry ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onAddMaintenance(item.id)}
              className="text-green-600 hover:text-green-900 transition-colors hover-lift"
            >
              <Wrench className="w-4 h-4" />
            </Button>
          ) : null
        )}
        currentPage={vehiclesCurrentPage}
        onPageChange={onVehiclesPageChange}
        itemsPerPage={vehiclesItemsPerPage}
        onItemsPerPageChange={onVehiclesItemsPerPageChange}
        totalCount={totalVehiclesCount}
        sortColumn={vehiclesSortColumn}
        onSortChange={onVehiclesSortChange}
        sortDirection={vehiclesSortDirection}
      />
    </>
  );
};

export default VehicleMaintenanceOverview;