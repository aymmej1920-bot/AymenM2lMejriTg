import React, { useState, useMemo, useCallback } from 'react';
import { FleetData, Vehicle, Driver, Tour, FuelEntry, Document, MaintenanceEntry, PreDepartureChecklist, DataTableColumn } from '../types';
import { Calendar, Search } from 'lucide-react'; // Only Calendar and Search are needed for date inputs and search icon
import { formatDate, getDaysUntilExpiration, getDaysSinceEntry } from '../utils/date'; // Import from utils/date
import DataTable from '../components/DataTable'; // Import the new DataTable component

interface ReportsProps {
  data: FleetData;
  userRole: 'admin' | 'direction' | 'utilisateur';
}

const getColumnConfigs = (dataSource: keyof FleetData, allVehicles: Vehicle[], allDrivers: Driver[]): DataTableColumn<any>[] => {
  switch (dataSource) {
    case 'vehicles':
      return [
        { key: 'plate', label: 'Plaque', sortable: true, defaultVisible: true },
        { key: 'type', label: 'Type', sortable: true, defaultVisible: true },
        { key: 'status', label: 'Statut', sortable: true, defaultVisible: true },
        { key: 'mileage', label: 'Kilométrage', sortable: true, defaultVisible: true, render: (item: Vehicle) => `${item.mileage.toLocaleString()} km` },
        { key: 'last_service_date', label: 'Dernière Vidange', sortable: true, defaultVisible: true, render: (item: Vehicle) => formatDate(item.last_service_date) },
        { key: 'last_service_mileage', label: 'Km Dernière Vidange', sortable: true, defaultVisible: true, render: (item: Vehicle) => `${item.last_service_mileage.toLocaleString()} km` },
      ];
    case 'drivers':
      return [
        { key: 'name', label: 'Nom', sortable: true, defaultVisible: true },
        { key: 'license', label: 'Permis', sortable: true, defaultVisible: true },
        { key: 'expiration', label: 'Expiration', sortable: true, defaultVisible: true, render: (item: Driver) => formatDate(item.expiration) },
        { key: 'status', label: 'Statut', sortable: true, defaultVisible: true },
        { key: 'phone', label: 'Téléphone', sortable: true, defaultVisible: true },
      ];
    case 'tours':
      return [
        { key: 'date', label: 'Date', sortable: true, defaultVisible: true, render: (item: Tour) => formatDate(item.date) },
        { key: 'vehicle_id', label: 'Véhicule', sortable: true, defaultVisible: true, render: (item: Tour) => allVehicles.find(v => v.id === item.vehicle_id)?.plate || 'N/A' },
        { key: 'driver_id', label: 'Conducteur', sortable: true, defaultVisible: true, render: (item: Tour) => allDrivers.find(d => d.id === item.driver_id)?.name || 'N/A' },
        { key: 'status', label: 'Statut', sortable: true, defaultVisible: true },
        { key: 'fuel_start', label: 'Fuel Début (%)', sortable: true, defaultVisible: true, render: (item: Tour) => item.fuel_start != null ? `${item.fuel_start}%` : '-' },
        { key: 'km_start', label: 'Km Début', sortable: true, defaultVisible: true, render: (item: Tour) => item.km_start != null ? item.km_start.toLocaleString() : '-' },
        { key: 'fuel_end', label: 'Fuel Fin (%)', sortable: true, defaultVisible: true, render: (item: Tour) => item.fuel_end != null ? `${item.fuel_end}%` : '-' },
        { key: 'km_end', label: 'Km Fin', sortable: true, defaultVisible: true, render: (item: Tour) => item.km_end != null ? item.km_end.toLocaleString() : '-' },
        { key: 'distance', label: 'Distance', sortable: true, defaultVisible: true, render: (item: Tour) => item.distance != null ? `${item.distance.toLocaleString()} km` : '-' },
        {
          key: 'consumption_per_100km',
          label: 'L/100km',
          sortable: false,
          defaultVisible: true,
          render: (item: Tour) => {
            if (item.distance != null && item.distance > 0 && item.fuel_start != null && item.fuel_end != null) {
              const fuelConsumed = item.fuel_start - item.fuel_end;
              if (fuelConsumed > 0) {
                return ((fuelConsumed / item.distance) * 100).toFixed(1);
              }
            }
            return '-';
          },
        },
      ];
    case 'fuel':
      return [
        { key: 'date', label: 'Date', sortable: true, defaultVisible: true, render: (item: FuelEntry) => formatDate(item.date) },
        { key: 'vehicle_id', label: 'Véhicule', sortable: true, defaultVisible: true, render: (item: FuelEntry) => allVehicles.find(v => v.id === item.vehicle_id)?.plate || 'N/A' },
        { key: 'liters', label: 'Litres', sortable: true, defaultVisible: true, render: (item: FuelEntry) => `${item.liters} L` },
        { key: 'price_per_liter', label: 'Prix/L', sortable: true, defaultVisible: true, render: (item: FuelEntry) => `${item.price_per_liter.toFixed(2)} TND` },
        { key: 'total_cost', label: 'Coût Total', sortable: true, defaultVisible: true, render: (item: FuelEntry) => `${(item.liters * item.price_per_liter).toFixed(2)} TND` },
        { key: 'mileage', label: 'Kilométrage', sortable: true, defaultVisible: true, render: (item: FuelEntry) => `${item.mileage.toLocaleString()} km` },
      ];
    case 'documents':
      return [
        { key: 'vehicle_id', label: 'Véhicule', sortable: true, defaultVisible: true, render: (item: Document) => allVehicles.find(v => v.id === item.vehicle_id)?.plate || 'N/A' },
        { key: 'type', label: 'Type Document', sortable: true, defaultVisible: true },
        { key: 'number', label: 'N° Document', sortable: true, defaultVisible: true },
        { key: 'expiration', label: 'Expiration', sortable: true, defaultVisible: true, render: (item: Document) => formatDate(item.expiration) },
        { key: 'days_left', label: 'Jours Restants', sortable: false, defaultVisible: true, render: (item: Document) => {
          const daysLeft = getDaysUntilExpiration(item.expiration);
          return daysLeft < 0 ? 'Expiré' : `${daysLeft} jours`;
        }},
      ];
    case 'maintenance':
      return [
        { key: 'date', label: 'Date', sortable: true, defaultVisible: true, render: (item: MaintenanceEntry) => formatDate(item.date) },
        { key: 'vehicle_id', label: 'Véhicule', sortable: true, defaultVisible: true, render: (item: MaintenanceEntry) => allVehicles.find(v => v.id === item.vehicle_id)?.plate || 'N/A' },
        { key: 'type', label: 'Type', sortable: true, defaultVisible: true },
        { key: 'mileage', label: 'Kilométrage', sortable: true, defaultVisible: true, render: (item: MaintenanceEntry) => `${item.mileage.toLocaleString()} km` },
        { key: 'cost', label: 'Coût', sortable: true, defaultVisible: true, render: (item: MaintenanceEntry) => `${item.cost.toFixed(2)} TND` },
        { key: 'days_since_entry', label: 'Jours depuis l\'entrée', sortable: true, defaultVisible: true, render: (item: MaintenanceEntry) => getDaysSinceEntry(item.date) },
      ];
    case 'pre_departure_checklists':
      return [
        { key: 'date', label: 'Date', sortable: true, defaultVisible: true, render: (item: PreDepartureChecklist) => formatDate(item.date) },
        { key: 'vehicle_id', label: 'Véhicule', sortable: true, defaultVisible: true, render: (item: PreDepartureChecklist) => allVehicles.find(v => v.id === item.vehicle_id)?.plate || 'N/A' },
        { key: 'driver_id', label: 'Conducteur', sortable: true, defaultVisible: true, render: (item: PreDepartureChecklist) => allDrivers.find(d => d.id === item.driver_id)?.name || 'N/A' },
        { key: 'tire_pressure_ok', label: 'Pneus OK', sortable: true, defaultVisible: true, render: (item: PreDepartureChecklist) => item.tire_pressure_ok ? 'Oui' : 'Non' },
        { key: 'lights_ok', label: 'Feux OK', sortable: true, defaultVisible: true, render: (item: PreDepartureChecklist) => item.lights_ok ? 'Oui' : 'Non' },
        { key: 'oil_level_ok', label: 'Huile OK', sortable: true, defaultVisible: true, render: (item: PreDepartureChecklist) => item.oil_level_ok ? 'Oui' : 'Non' },
        { key: 'fluid_levels_ok', label: 'Fluides OK', sortable: true, defaultVisible: true, render: (item: PreDepartureChecklist) => item.fluid_levels_ok ? 'Oui' : 'Non' },
        { key: 'brakes_ok', label: 'Freins OK', sortable: true, defaultVisible: true, render: (item: PreDepartureChecklist) => item.brakes_ok ? 'Oui' : 'Non' },
        { key: 'wipers_ok', label: 'Essuie-glaces OK', sortable: true, defaultVisible: true, render: (item: PreDepartureChecklist) => item.wipers_ok ? 'Oui' : 'Non' },
        { key: 'horn_ok', label: 'Klaxon OK', sortable: true, defaultVisible: true, render: (item: PreDepartureChecklist) => item.horn_ok ? 'Oui' : 'Non' },
        { key: 'mirrors_ok', label: 'Rétroviseurs OK', sortable: true, defaultVisible: true, render: (item: PreDepartureChecklist) => item.mirrors_ok ? 'Oui' : 'Non' },
        { key: 'ac_working_ok', label: 'AC OK', sortable: true, defaultVisible: true, render: (item: PreDepartureChecklist) => item.ac_working_ok ? 'Oui' : 'Non' },
        { key: 'windows_working_ok', label: 'Vitres OK', sortable: true, defaultVisible: true, render: (item: PreDepartureChecklist) => item.windows_working_ok ? 'Oui' : 'Non' },
        { key: 'observations', label: 'Observations', sortable: true, defaultVisible: true, render: (item: PreDepartureChecklist) => item.observations || '-' },
        { key: 'issues_to_address', label: 'Problèmes', sortable: true, defaultVisible: true, render: (item: PreDepartureChecklist) => item.issues_to_address || '-' },
      ];
    default:
      return [];
  }
};

const Reports: React.FC<ReportsProps> = ({ data }) => {
  const [selectedDataSource, setSelectedDataSource] = useState<keyof FleetData | ''>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const dataSources = [
    { id: 'vehicles', name: 'Véhicules' },
    { id: 'drivers', name: 'Conducteurs' },
    { id: 'tours', name: 'Tournées' },
    { id: 'fuel', name: 'Carburant' },
    { id: 'documents', name: 'Documents' },
    { id: 'maintenance', name: 'Maintenance' },
    { id: 'pre_departure_checklists', name: 'Checklists Pré-départ' },
  ];

  const currentData = useMemo(() => {
    if (!selectedDataSource) return [];
    return data[selectedDataSource] || [];
  }, [data, selectedDataSource]);

  const columns = useMemo(() => {
    if (!selectedDataSource) return [];
    return getColumnConfigs(selectedDataSource, data.vehicles, data.drivers);
  }, [selectedDataSource, data.vehicles, data.drivers]);

  const renderFilters = useCallback((searchTerm: string, setSearchTerm: (term: string) => void) => {
    return (
      <>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher dans le rapport..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            disabled={!selectedDataSource}
          />
        </div>
        <div className="relative">
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full bg-white border border-gray-300 rounded-lg pl-4 pr-10 py-3 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Date de début"
            disabled={!selectedDataSource}
          />
          <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
        </div>
        <div className="relative">
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full bg-white border border-gray-300 rounded-lg pl-4 pr-10 py-3 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            placeholder="Date de fin"
            disabled={!selectedDataSource}
          />
          <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
        </div>
      </>
    );
  }, [selectedDataSource, startDate, endDate]);

  const customFilter = useCallback((item: any) => {
    let matchesDateRange = true;
    const itemDateString = (item as any).date || (item as any).expiration || (item as any).created_at; // Common date fields
    
    if (itemDateString) {
      const itemDate = new Date(itemDateString);
      const start = startDate ? new Date(startDate) : null;
      const end = endDate ? new Date(endDate) : null;

      matchesDateRange = 
        (!start || itemDate >= start) &&
        (!end || itemDate <= end);
    }
    return matchesDateRange;
  }, [startDate, endDate]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-4xl font-bold text-gray-800">Rapports Personnalisables</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <select
            id="dataSource"
            value={selectedDataSource}
            onChange={(e) => {
              setSelectedDataSource(e.target.value as keyof FleetData);
              setStartDate(''); // Reset date filters on data source change
              setEndDate('');
            }}
            className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 shadow-sm focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="" disabled>Sélectionner la source de données</option>
            {dataSources.map(source => (
              <option key={source.id} value={source.id}>{source.name}</option>
            ))}
          </select>
        </div>
        {/* The search and date filters are now rendered by DataTable's renderFilters prop */}
      </div>

      {selectedDataSource ? (
        <DataTable
          title={`Rapport: ${dataSources.find(ds => ds.id === selectedDataSource)?.name || ''}`}
          data={currentData}
          columns={columns}
          exportFileName={`rapport_${selectedDataSource}`}
          isLoading={false} // Adjust based on actual loading state if needed
          renderFilters={renderFilters}
          customFilter={customFilter}
          resourceType={selectedDataSource as any} // Added resourceType prop
        />
      ) : (
        <div className="bg-white rounded-xl shadow-lg p-6 text-center text-gray-500">
          Veuillez sélectionner une source de données pour afficher le rapport.
        </div>
      )}
    </div>
  );
};

export default Reports;