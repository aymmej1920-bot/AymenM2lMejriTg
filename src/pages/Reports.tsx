import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { FleetData, Vehicle, Driver, Tour, FuelEntry, Document, MaintenanceEntry, PreDepartureChecklist } from '../types';
import { Button } from '../components/ui/button';
import { Download, Search, Settings, ChevronUp, ChevronDown } from 'lucide-react';
import { exportToXLSX } from '../utils/export';
import { showSuccess } from '../utils/toast';
import { formatDate } from '../utils/date';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from '../components/ui/dialog';

interface ReportsProps {
  data: FleetData;
  userRole: 'admin' | 'direction' | 'utilisateur';
}

interface ColumnConfig {
  key: string;
  label: string;
  defaultVisible: boolean;
}

const getColumnConfigs = (dataSource: keyof FleetData): ColumnConfig[] => {
  switch (dataSource) {
    case 'vehicles':
      return [
        { key: 'plate', label: 'Plaque', defaultVisible: true },
        { key: 'type', label: 'Type', defaultVisible: true },
        { key: 'status', label: 'Statut', defaultVisible: true },
        { key: 'mileage', label: 'Kilométrage', defaultVisible: true },
        { key: 'last_service_date', label: 'Dernière Vidange', defaultVisible: true },
        { key: 'last_service_mileage', label: 'Km Dernière Vidange', defaultVisible: true },
      ];
    case 'drivers':
      return [
        { key: 'name', label: 'Nom', defaultVisible: true },
        { key: 'license', label: 'Permis', defaultVisible: true },
        { key: 'expiration', label: 'Expiration', defaultVisible: true },
        { key: 'status', label: 'Statut', defaultVisible: true },
        { key: 'phone', label: 'Téléphone', defaultVisible: true },
      ];
    case 'tours':
      return [
        { key: 'date', label: 'Date', defaultVisible: true },
        { key: 'vehicle_plate', label: 'Véhicule', defaultVisible: true },
        { key: 'driver_name', label: 'Conducteur', defaultVisible: true },
        { key: 'status', label: 'Statut', defaultVisible: true },
        { key: 'fuel_start', label: 'Fuel Début (%)', defaultVisible: true },
        { key: 'km_start', label: 'Km Début', defaultVisible: true },
        { key: 'fuel_end', label: 'Fuel Fin (%)', defaultVisible: true },
        { key: 'km_end', label: 'Km Fin', defaultVisible: true },
        { key: 'distance', label: 'Distance', defaultVisible: true },
      ];
    case 'fuel':
      return [
        { key: 'date', label: 'Date', defaultVisible: true },
        { key: 'vehicle_plate', label: 'Véhicule', defaultVisible: true },
        { key: 'liters', label: 'Litres', defaultVisible: true },
        { key: 'price_per_liter', label: 'Prix/L', defaultVisible: true },
        { key: 'total_cost', label: 'Coût Total', defaultVisible: true },
        { key: 'mileage', label: 'Kilométrage', defaultVisible: true },
      ];
    case 'documents':
      return [
        { key: 'vehicle_plate', label: 'Véhicule', defaultVisible: true },
        { key: 'type', label: 'Type', defaultVisible: true },
        { key: 'number', label: 'Numéro', defaultVisible: true },
        { key: 'expiration', label: 'Expiration', defaultVisible: true },
      ];
    case 'maintenance':
      return [
        { key: 'vehicle_plate', label: 'Véhicule', defaultVisible: true },
        { key: 'type', label: 'Type', defaultVisible: true },
        { key: 'date', label: 'Date', defaultVisible: true },
        { key: 'mileage', label: 'Kilométrage', defaultVisible: true },
        { key: 'cost', label: 'Coût', defaultVisible: true },
      ];
    case 'pre_departure_checklists':
      return [
        { key: 'date', label: 'Date', defaultVisible: true },
        { key: 'vehicle_plate', label: 'Véhicule', defaultVisible: true },
        { key: 'driver_name', label: 'Conducteur', defaultVisible: true },
        { key: 'tire_pressure_ok', label: 'Pneus OK', defaultVisible: true },
        { key: 'lights_ok', label: 'Feux OK', defaultVisible: true },
        { key: 'oil_level_ok', label: 'Huile OK', defaultVisible: true },
        { key: 'fluid_levels_ok', label: 'Fluides OK', defaultVisible: true },
        { key: 'brakes_ok', label: 'Freins OK', defaultVisible: true },
        { key: 'wipers_ok', label: 'Essuie-glaces OK', defaultVisible: true },
        { key: 'horn_ok', label: 'Klaxon OK', defaultVisible: true },
        { key: 'mirrors_ok', label: 'Rétroviseurs OK', defaultVisible: true },
        { key: 'ac_working_ok', label: 'AC OK', defaultVisible: true },
        { key: 'windows_working_ok', label: 'Vitres OK', defaultVisible: true },
        { key: 'observations', label: 'Observations', defaultVisible: true },
        { key: 'issues_to_address', label: 'Problèmes', defaultVisible: true },
      ];
    default:
      return [];
  }
};

const getRowData = (item: any, dataSource: keyof FleetData, allVehicles: Vehicle[], allDrivers: Driver[]) => {
  const commonData = {
    id: item.id,
    created_at: item.created_at,
    user_id: item.user_id,
  };

  switch (dataSource) {
    case 'vehicles':
      const vehicle = item as Vehicle;
      return {
        ...commonData,
        plate: vehicle.plate,
        type: vehicle.type,
        status: vehicle.status,
        mileage: vehicle.mileage,
        last_service_date: formatDate(vehicle.last_service_date),
        last_service_mileage: vehicle.last_service_mileage,
      };
    case 'drivers':
      const driver = item as Driver;
      return {
        ...commonData,
        name: driver.name,
        license: driver.license,
        expiration: formatDate(driver.expiration),
        status: driver.status,
        phone: driver.phone,
      };
    case 'tours':
      const tour = item as Tour;
      const tourVehicle = allVehicles.find(v => v.id === tour.vehicle_id);
      const tourDriver = allDrivers.find(d => d.id === tour.driver_id);
      return {
        ...commonData,
        date: formatDate(tour.date),
        vehicle_plate: tourVehicle?.plate || 'N/A',
        driver_name: tourDriver?.name || 'N/A',
        status: tour.status,
        fuel_start: tour.fuel_start ?? '-',
        km_start: tour.km_start ?? '-',
        fuel_end: tour.fuel_end ?? '-',
        km_end: tour.km_end ?? '-',
        distance: tour.distance ?? '-',
      };
    case 'fuel':
      const fuelEntry = item as FuelEntry;
      const fuelVehicle = allVehicles.find(v => v.id === fuelEntry.vehicle_id);
      return {
        ...commonData,
        date: formatDate(fuelEntry.date),
        vehicle_plate: fuelVehicle?.plate || 'N/A',
        liters: fuelEntry.liters,
        price_per_liter: fuelEntry.price_per_liter,
        total_cost: (fuelEntry.liters * fuelEntry.price_per_liter).toFixed(2),
        mileage: fuelEntry.mileage,
      };
    case 'documents':
      const document = item as Document;
      const docVehicle = allVehicles.find(v => v.id === document.vehicle_id);
      return {
        ...commonData,
        vehicle_plate: docVehicle?.plate || 'N/A',
        type: document.type,
        number: document.number,
        expiration: formatDate(document.expiration),
      };
    case 'maintenance':
      const maintenanceEntry = item as MaintenanceEntry;
      const maintVehicle = allVehicles.find(v => v.id === maintenanceEntry.vehicle_id);
      return {
        ...commonData,
        vehicle_plate: maintVehicle?.plate || 'N/A',
        type: maintenanceEntry.type,
        date: formatDate(maintenanceEntry.date),
        mileage: maintenanceEntry.mileage,
        cost: maintenanceEntry.cost,
      };
    case 'pre_departure_checklists':
      const checklist = item as PreDepartureChecklist;
      const checklistVehicle = allVehicles.find(v => v.id === checklist.vehicle_id);
      const checklistDriver = allDrivers.find(d => d.id === checklist.driver_id);
      return {
        ...commonData,
        date: formatDate(checklist.date),
        vehicle_plate: checklistVehicle?.plate || 'N/A',
        driver_name: checklistDriver?.name || 'N/A',
        tire_pressure_ok: checklist.tire_pressure_ok ? 'Oui' : 'Non',
        lights_ok: checklist.lights_ok ? 'Oui' : 'Non',
        oil_level_ok: checklist.oil_level_ok ? 'Oui' : 'Non',
        fluid_levels_ok: checklist.fluid_levels_ok ? 'Oui' : 'Non',
        brakes_ok: checklist.brakes_ok ? 'Oui' : 'Non',
        wipers_ok: checklist.wipers_ok ? 'Oui' : 'Non',
        horn_ok: checklist.horn_ok ? 'Oui' : 'Non',
        mirrors_ok: checklist.mirrors_ok ? 'Oui' : 'Non',
        ac_working_ok: checklist.ac_working_ok ? 'Oui' : 'Non',
        windows_working_ok: checklist.windows_working_ok ? 'Oui' : 'Non',
        observations: checklist.observations || '-',
        issues_to_address: checklist.issues_to_address || '-',
      };
    default:
      return item;
  }
};

const Reports: React.FC<ReportsProps> = ({ data }) => {
  const [selectedDataSource, setSelectedDataSource] = useState<keyof FleetData>('vehicles');
  const [searchTerm, setSearchTerm] = useState('');
  const [showColumnCustomizeDialog, setShowColumnCustomizeDialog] = useState(false);
  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>({});
  const [columnOrder, setColumnOrder] = useState<string[]>([]);

  const dataSources = [
    { id: 'vehicles', name: 'Véhicules' },
    { id: 'drivers', name: 'Conducteurs' },
    { id: 'tours', name: 'Tournées' },
    { id: 'fuel', name: 'Carburant' },
    { id: 'documents', name: 'Documents' },
    { id: 'maintenance', name: 'Maintenance' },
    { id: 'pre_departure_checklists', name: 'Checklists Pré-départ' },
  ];

  const allPossibleColumns = useMemo(() => getColumnConfigs(selectedDataSource), [selectedDataSource]);

  // Load column preferences from localStorage or set defaults
  useEffect(() => {
    const savedVisibilityRaw = localStorage.getItem(`reportColumnsVisibility_${selectedDataSource}`);
    const savedOrderRaw = localStorage.getItem(`reportColumnsOrder_${selectedDataSource}`);

    const defaultVisibility = allPossibleColumns.reduce((acc, col) => {
      acc[col.key] = col.defaultVisible;
      return acc;
    }, {} as Record<string, boolean>);

    const defaultOrder = allPossibleColumns.map(col => col.key);

    let initialColumnVisibility = defaultVisibility;
    if (savedVisibilityRaw) {
      try {
        const parsed = JSON.parse(savedVisibilityRaw);
        if (typeof parsed === 'object' && parsed !== null) {
          // Merge saved visibility with default to handle new/removed columns
          initialColumnVisibility = { ...defaultVisibility, ...parsed };
        }
      } catch (e) {
        console.error("Error parsing saved column visibility from localStorage", e);
      }
    }

    let initialColumnOrder = defaultOrder;
    if (savedOrderRaw) {
      try {
        const parsed = JSON.parse(savedOrderRaw);
        if (Array.isArray(parsed)) {
          // Filter out any keys from savedOrder that are no longer in allPossibleColumns
          const validParsedOrder = parsed.filter(key => allPossibleColumns.some(col => col.key === key));
          // Add any new keys from allPossibleColumns that are not in savedOrder (at the end)
          const newKeys = allPossibleColumns.map(col => col.key).filter(key => !validParsedOrder.includes(key));
          initialColumnOrder = [...validParsedOrder, ...newKeys];
        }
      } catch (e) {
        console.error("Error parsing saved column order from localStorage", e);
      }
    }

    setColumnVisibility(initialColumnVisibility);
    setColumnOrder(initialColumnOrder);
  }, [selectedDataSource, allPossibleColumns]);

  // Save column preferences to localStorage
  useEffect(() => {
    if (columnOrder.length > 0) { // Only save if there are actual columns
      localStorage.setItem(`reportColumnsVisibility_${selectedDataSource}`, JSON.stringify(columnVisibility));
      localStorage.setItem(`reportColumnsOrder_${selectedDataSource}`, JSON.stringify(columnOrder));
    }
  }, [columnVisibility, columnOrder, selectedDataSource]);

  const currentData = useMemo(() => {
    return data[selectedDataSource] || [];
  }, [data, selectedDataSource]);

  const filteredData = useMemo(() => {
    if (!searchTerm) return currentData;

    const lowerCaseSearchTerm = searchTerm.toLowerCase();

    return currentData.filter(item => {
      const row = getRowData(item, selectedDataSource, data.vehicles, data.drivers);
      return Object.values(row).some(value =>
        (typeof value === 'string' || typeof value === 'number') && String(value).toLowerCase().includes(lowerCaseSearchTerm)
      );
    });
  }, [currentData, searchTerm, selectedDataSource, data.vehicles, data.drivers]);

  const visibleColumns = useMemo(() => {
    return columnOrder
      .map(key => allPossibleColumns.find(col => col.key === key))
      .filter((col): col is ColumnConfig => col !== undefined && columnVisibility[col.key]);
  }, [columnVisibility, columnOrder, allPossibleColumns]);

  const handleToggleColumn = (key: string) => {
    setColumnVisibility(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleMoveColumn = useCallback((key: string, direction: 'up' | 'down') => {
    setColumnOrder(prevOrder => {
      const index = prevOrder.indexOf(key);
      if (index === -1) return prevOrder;

      const newOrder = [...prevOrder];
      const [movedColumn] = newOrder.splice(index, 1);

      if (direction === 'up' && index > 0) {
        newOrder.splice(index - 1, 0, movedColumn);
      } else if (direction === 'down' && index < newOrder.length) {
        newOrder.splice(index + 1, 0, movedColumn);
      }
      return newOrder;
    });
  }, []);

  const handleResetColumns = () => {
    const defaultVisibility = allPossibleColumns.reduce((acc, col) => {
      acc[col.key] = col.defaultVisible;
      return acc;
    }, {} as Record<string, boolean>);
    setColumnVisibility(defaultVisibility);
    setColumnOrder(allPossibleColumns.map(col => col.key));
  };

  const handleExport = () => {
    const headers = visibleColumns.map(col => col.label);
    const dataToExport = filteredData.map(item => {
      const row = getRowData(item, selectedDataSource, data.vehicles, data.drivers);
      const exportedRow: { [key: string]: any } = {};
      visibleColumns.forEach(col => {
        exportedRow[col.label] = row[col.key];
      });
      return exportedRow;
    });

    exportToXLSX(dataToExport, { 
      fileName: `rapport_${selectedDataSource}`, 
      sheetName: dataSources.find(ds => ds.id === selectedDataSource)?.name || 'Rapport',
      headers: headers
    });
    showSuccess('Rapport exporté avec succès au format XLSX !');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-4xl font-bold text-gray-800">Rapports Personnalisables</h2>
        <div className="flex space-x-4">
          <Button
            onClick={() => setShowColumnCustomizeDialog(true)}
            className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-6 py-3 rounded-lg flex items-center space-x-2 transition-all duration-300"
          >
            <Settings className="w-5 h-5" />
            <span>Personnaliser Colonnes</span>
          </Button>
          <Button
            onClick={handleExport}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg flex items-center space-x-2 transition-all duration-300"
          >
            <Download className="w-5 h-5" />
            <span>Exporter XLSX</span>
          </Button>
        </div>
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
                {visibleColumns.map((col) => (
                  <th key={col.key} className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={visibleColumns.length} className="px-6 py-4 text-center text-gray-500">
                    Aucune donnée trouvée pour ce rapport.
                  </td>
                </tr>
              ) : (
                filteredData.map((item, rowIndex) => {
                  const rowData = getRowData(item, selectedDataSource, data.vehicles, data.drivers);
                  return (
                    <tr key={item.id || rowIndex} className="hover:bg-gray-50">
                      {visibleColumns.map((col, cellIndex) => (
                        <td key={cellIndex} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {rowData[col.key]}
                        </td>
                      ))}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={showColumnCustomizeDialog} onOpenChange={setShowColumnCustomizeDialog}>
        <DialogContent className="sm:max-w-[425px] bg-gray-50">
          <DialogHeader>
            <DialogTitle>Personnaliser les Colonnes</DialogTitle>
            <DialogDescription>
              Choisissez les colonnes à afficher et réorganisez-les.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-4">
            {columnOrder.map((key, index) => {
              const col = allPossibleColumns.find(c => c.key === key);
              if (!col) return null;
              return (
                <div key={col.key} className="flex items-center justify-between p-2 border rounded-md bg-gray-100">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={`col-${col.key}`}
                      checked={columnVisibility[col.key]}
                      onChange={() => handleToggleColumn(col.key)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor={`col-${col.key}`} className="text-sm font-medium text-gray-700">
                      {col.label}
                    </label>
                  </div>
                  <div className="flex space-x-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleMoveColumn(col.key, 'up')}
                      disabled={index === 0}
                    >
                      <ChevronUp className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleMoveColumn(col.key, 'down')}
                      disabled={index === columnOrder.length - 1}
                    >
                      <ChevronDown className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleResetColumns}>
              Réinitialiser par défaut
            </Button>
            <Button onClick={() => setShowColumnCustomizeDialog(false)}>
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Reports;