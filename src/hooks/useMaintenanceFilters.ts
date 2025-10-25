import { useState, useMemo, useCallback } from 'react';
import { Search, Calendar } from 'lucide-react';
import { MaintenanceEntry, Vehicle } from '../types';

interface UseMaintenanceFiltersProps {
  vehicles: Vehicle[];
  maintenanceEntries: MaintenanceEntry[];
}

export const useMaintenanceFilters = ({ vehicles, maintenanceEntries }: UseMaintenanceFiltersProps) => {
  const [selectedVehicleFilter, setSelectedVehicleFilter] = useState<string>('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const uniqueMaintenanceTypes = useMemo(() => {
    const types = new Set(maintenanceEntries.map(m => m.type));
    return Array.from(types);
  }, [maintenanceEntries]);

  // This renderFilters will now return JSX directly, using the hook's internal states
  // It also accepts DataTable's searchTerm and setSearchTerm for the general search input
  const renderFilters = useCallback((searchTerm: string, setSearchTerm: (term: string) => void) => {
    return (
      <>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher une entrée de maintenance..."
            value={searchTerm} // Use DataTable's searchTerm
            onChange={(e) => setSearchTerm(e.target.value)} // Use DataTable's setSearchTerm
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

  return {
    renderFilters, // This now returns JSX directly, and takes searchTerm/setSearchTerm as args
    customFilter,
  };
};