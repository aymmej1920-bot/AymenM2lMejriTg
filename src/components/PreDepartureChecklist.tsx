import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { AlertTriangle, Calendar } from 'lucide-react';
import { PreDepartureChecklist, DataTableColumn, Resource, Action, Vehicle, Driver } from '../types';
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
import ChecklistForm from './checklists/ChecklistForm'; // Import the new form component
import ChecklistStatusIcon from './checklists/ChecklistStatusIcon'; // Import the new status icon component
import { useSupabaseData } from '../hooks/useSupabaseData'; // Import useSupabaseData

interface PreDepartureChecklistProps {
  onAdd: (tableName: Resource, checklist: Omit<PreDepartureChecklist, 'id' | 'user_id' | 'created_at'>, action: Action) => Promise<void>;
  registerRefetch: (resource: Resource, refetch: () => Promise<void>) => void;
}

const PreDepartureChecklistComponent: React.FC<PreDepartureChecklistProps> = ({ onAdd, registerRefetch }) => {
  const { canAccess } = usePermissions();
  
  const { data: preDepartureChecklists, isLoading: isLoadingChecklists, refetch: refetchChecklists } = useSupabaseData<PreDepartureChecklist>('pre_departure_checklists');
  const { data: vehicles, isLoading: isLoadingVehicles } = useSupabaseData<Vehicle>('vehicles');
  const { data: drivers, isLoading: isLoadingDrivers } = useSupabaseData<Driver>('drivers');

  useEffect(() => {
    registerRefetch('pre_departure_checklists', refetchChecklists);
  }, [registerRefetch, refetchChecklists]);

  const [showModal, setShowModal] = useState(false);

  const canAdd = canAccess('pre_departure_checklists', 'add');

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
            className="w-full glass border border-gray-300 rounded-lg px-4 py-3 shadow-sm focus:ring-blue-500 focus:border-blue-500"
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
            className="w-full glass border border-gray-300 rounded-lg px-4 py-3 shadow-sm focus:ring-blue-500 focus:border-blue-500"
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
            onChange={(e) => {
              setStartDate(e.target.value);
            }}
            className="w-full glass border border-gray-300 rounded-lg pl-4 pr-10 py-3 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            placeholder="Date de début"
          />
          <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
        </div>

        <div className="relative">
          <input
            type="date"
            value={endDate}
            onChange={(e) => {
              setEndDate(e.target.value);
            }}
            className="w-full glass border border-gray-300 rounded-lg pl-4 pr-10 py-3 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
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

  const isLoadingCombined = isLoadingChecklists || isLoadingVehicles || isLoadingDrivers;

  return (
    <div className="space-y-6">
      <DataTable
        title="Checklists Avant Départ"
        data={preDepartureChecklists} // Pass all data, DataTable will handle filtering
        columns={columns}
        onAdd={canAdd ? handleAddChecklist : undefined}
        addLabel="Nouvelle Checklist"
        searchPlaceholder="Rechercher une checklist par date, véhicule, conducteur, observations ou problèmes..."
        exportFileName="checklists_avant_depart"
        isLoading={isLoadingCombined}
        renderFilters={renderFilters}
        renderAlerts={renderAlerts}
        customFilter={customFilter}
        resourceType="pre_departure_checklists"
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
            vehicles={vehicles}
            drivers={drivers}
            onAdd={onAdd}
            onClose={handleCloseModal}
            canAdd={canAdd}
            hasChecklistForMonth={hasChecklistForMonth}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PreDepartureChecklistComponent;