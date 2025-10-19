import React, { useState, useMemo } from 'react';
import { FleetData, Vehicle, Driver, Tour, FuelEntry, Document, MaintenanceEntry, PreDepartureChecklist } from '../types';
import { Button } from '../components/ui/button';
import { Download, Search } from 'lucide-react';
import { exportToXLSX } from '../utils/export';
import { showSuccess } from '../utils/toast';
import { formatDate } from '../utils/date';

interface ReportsProps {
  data: FleetData;
  userRole: 'admin' | 'direction' | 'utilisateur';
}

const Reports: React.FC<ReportsProps> = ({ data }) => {
  const [selectedDataSource, setSelectedDataSource] = useState<keyof FleetData>('vehicles');
  const [searchTerm, setSearchTerm] = useState('');

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
    return data[selectedDataSource] || [];
  }, [data, selectedDataSource]);

  const filteredData = useMemo(() => {
    if (!searchTerm) return currentData;

    const lowerCaseSearchTerm = searchTerm.toLowerCase();

    return currentData.filter(item => {
      // Generic search across string values of the item
      return Object.values(item).some(value =>
        typeof value === 'string' && value.toLowerCase().includes(lowerCaseSearchTerm)
      );
    });
  }, [currentData, searchTerm]);

  const getHeaders = (dataSource: keyof FleetData) => {
    switch (dataSource) {
      case 'vehicles':
        return ['Plaque', 'Type', 'Statut', 'Kilométrage', 'Dernière Vidange', 'Km Dernière Vidange'];
      case 'drivers':
        return ['Nom', 'Permis', 'Expiration', 'Statut', 'Téléphone'];
      case 'tours':
        return ['Date', 'Véhicule', 'Conducteur', 'Statut', 'Km Début', 'Km Fin', 'Distance'];
      case 'fuel':
        return ['Date', 'Véhicule', 'Litres', 'Prix/L', 'Kilométrage'];
      case 'documents':
        return ['Véhicule', 'Type', 'Numéro', 'Expiration'];
      case 'maintenance':
        return ['Véhicule', 'Type', 'Date', 'Kilométrage', 'Coût'];
      case 'pre_departure_checklists':
        return ['Date', 'Véhicule', 'Conducteur', 'Pneus OK', 'Feux OK', 'Huile OK', 'Fluides OK', 'Freins OK', 'Wipers OK', 'Klaxon OK', 'Rétroviseurs OK', 'AC OK', 'Vitres OK', 'Observations', 'Problèmes'];
      default:
        return [];
    }
  };

  const formatRow = (item: any, dataSource: keyof FleetData) => {
    switch (dataSource) {
      case 'vehicles':
        const vehicle = item as Vehicle;
        return [
          vehicle.plate,
          vehicle.type,
          vehicle.status,
          vehicle.mileage,
          formatDate(vehicle.last_service_date),
          vehicle.last_service_mileage,
        ];
      case 'drivers':
        const driver = item as Driver;
        return [
          driver.name,
          driver.license,
          formatDate(driver.expiration),
          driver.status,
          driver.phone,
        ];
      case 'tours':
        const tour = item as Tour;
        const tourVehicle = data.vehicles.find(v => v.id === tour.vehicle_id);
        const tourDriver = data.drivers.find(d => d.id === tour.driver_id);
        return [
          formatDate(tour.date),
          tourVehicle?.plate || 'N/A',
          tourDriver?.name || 'N/A',
          tour.status,
          tour.km_start ?? '-',
          tour.km_end ?? '-',
          tour.distance ?? '-',
        ];
      case 'fuel':
        const fuelEntry = item as FuelEntry;
        const fuelVehicle = data.vehicles.find(v => v.id === fuelEntry.vehicle_id);
        return [
          formatDate(fuelEntry.date),
          fuelVehicle?.plate || 'N/A',
          fuelEntry.liters,
          fuelEntry.price_per_liter,
          fuelEntry.mileage,
        ];
      case 'documents':
        const document = item as Document;
        const docVehicle = data.vehicles.find(v => v.id === document.vehicle_id);
        return [
          docVehicle?.plate || 'N/A',
          document.type,
          document.number,
          formatDate(document.expiration),
        ];
      case 'maintenance':
        const maintenanceEntry = item as MaintenanceEntry;
        const maintVehicle = data.vehicles.find(v => v.id === maintenanceEntry.vehicle_id);
        return [
          maintVehicle?.plate || 'N/A',
          maintenanceEntry.type,
          formatDate(maintenanceEntry.date),
          maintenanceEntry.mileage,
          maintenanceEntry.cost,
        ];
      case 'pre_departure_checklists':
        const checklist = item as PreDepartureChecklist;
        const checklistVehicle = data.vehicles.find(v => v.id === checklist.vehicle_id);
        const checklistDriver = data.drivers.find(d => d.id === checklist.driver_id);
        return [
          formatDate(checklist.date),
          checklistVehicle?.plate || 'N/A',
          checklistDriver?.name || 'N/A',
          checklist.tire_pressure_ok ? 'Oui' : 'Non',
          checklist.lights_ok ? 'Oui' : 'Non',
          checklist.oil_level_ok ? 'Oui' : 'Non',
          checklist.fluid_levels_ok ? 'Oui' : 'Non',
          checklist.brakes_ok ? 'Oui' : 'Non',
          checklist.wipers_ok ? 'Oui' : 'Non',
          checklist.horn_ok ? 'Oui' : 'Non',
          checklist.mirrors_ok ? 'Oui' : 'Non',
          checklist.ac_working_ok ? 'Oui' : 'Non',
          checklist.windows_working_ok ? 'Oui' : 'Non',
          checklist.observations || '-',
          checklist.issues_to_address || '-',
        ];
      default:
        return Object.values(item).map(value => (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') ? String(value) : '-');
    }
  };

  const handleExport = () => {
    const headers = getHeaders(selectedDataSource);
    const dataToExport = filteredData.map(item => formatRow(item, selectedDataSource));
    
    // Convert array of arrays to array of objects for XLSX export
    const formattedDataForExport = dataToExport.map(row => {
      const obj: { [key: string]: any } = {};
      headers.forEach((header, index) => {
        obj[header] = row[index];
      });
      return obj;
    });

    exportToXLSX(formattedDataForExport, { 
      fileName: `rapport_${selectedDataSource}`, 
      sheetName: dataSources.find(ds => ds.id === selectedDataSource)?.name || 'Rapport' 
    });
    showSuccess('Rapport exporté avec succès au format XLSX !');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-4xl font-bold text-gray-800">Rapports Personnalisables</h2>
        <Button
          onClick={handleExport}
          className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg flex items-center space-x-2 transition-all duration-300"
        >
          <Download className="w-5 h-5" />
          <span>Exporter XLSX</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="dataSource" className="block text-sm font-semibold mb-2 text-gray-900">Sélectionner la source de données</label>
          <select
            id="dataSource"
            value={selectedDataSource}
            onChange={(e) => setSelectedDataSource(e.target.value as keyof FleetData)}
            className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 shadow-sm focus:ring-blue-500 focus:border-blue-500"
          >
            {dataSources.map(source => (
              <option key={source.id} value={source.id}>{source.name}</option>
            ))}
          </select>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher dans le rapport..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {getHeaders(selectedDataSource).map((header, index) => (
                  <th key={index} className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={getHeaders(selectedDataSource).length} className="px-6 py-4 text-center text-gray-500">
                    Aucune donnée trouvée pour ce rapport.
                  </td>
                </tr>
              ) : (
                filteredData.map((item, rowIndex) => (
                  <tr key={item.id || rowIndex} className="hover:bg-gray-50">
                    {formatRow(item, selectedDataSource).map((cell, cellIndex) => (
                      <td key={cellIndex} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Reports;