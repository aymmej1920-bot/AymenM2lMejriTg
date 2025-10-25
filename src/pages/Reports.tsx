import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { FleetData, Vehicle, Driver, DataTableColumn, Resource, ReportGroupingOption, ReportAggregationType, ReportAggregationField, ReportChartType, ReportOption, ProcessedReportData } from '../types';
import { Calendar, Search, Table, BarChart2 } from 'lucide-react'; // Removed LineChart, PieChart
import { formatDate, getDaysUntilExpiration, getDaysSinceEntry } from '../utils/date';
import DataTable from '../components/DataTable';
import { useFleetData } from '../components/FleetDataProvider';
import { Button } from '../components/ui/button';
import ReportCharts from '../components/reports/ReportCharts';
import moment from 'moment';

interface ReportsProps {
  userRole: 'admin' | 'direction' | 'utilisateur';
}

const getColumnConfigs = (dataSource: Resource, allVehicles: Vehicle[], allDrivers: Driver[]): DataTableColumn<any>[] => {
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
        { key: 'date', label: 'Date', sortable: true, defaultVisible: true, render: (item: any) => formatDate(item.date) },
        { key: 'vehicle_id', label: 'Véhicule', sortable: true, defaultVisible: true, render: (item: any) => allVehicles.find(v => v.id === item.vehicle_id)?.plate || 'N/A' },
        { key: 'driver_id', label: 'Conducteur', sortable: true, defaultVisible: true, render: (item: any) => allDrivers.find(d => d.id === item.driver_id)?.name || 'N/A' },
        { key: 'status', label: 'Statut', sortable: true, defaultVisible: true },
        { key: 'fuel_start', label: 'Fuel Début (%)', sortable: true, defaultVisible: true, render: (item: any) => item.fuel_start != null ? `${item.fuel_start}%` : '-' },
        { key: 'km_start', label: 'Km Début', sortable: true, defaultVisible: true, render: (item: any) => item.km_start != null ? item.km_start.toLocaleString() : '-' },
        { key: 'fuel_end', label: 'Fuel Fin (%)', sortable: true, defaultVisible: true, render: (item: any) => item.fuel_end != null ? `${item.fuel_end}%` : '-' },
        { key: 'km_end', label: 'Km Fin', sortable: true, defaultVisible: true, render: (item: any) => item.km_end != null ? item.km_end.toLocaleString() : '-' },
        { key: 'distance', label: 'Distance', sortable: true, defaultVisible: true, render: (item: any) => item.distance != null ? `${item.distance.toLocaleString()} km` : '-' },
        {
          key: 'consumption_per_100km',
          label: 'L/100km',
          sortable: false,
          defaultVisible: true,
          render: (item: any) => {
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
    case 'fuel_entries':
      return [
        { key: 'date', label: 'Date', sortable: true, defaultVisible: true, render: (item: any) => formatDate(item.date) },
        { key: 'vehicle_id', label: 'Véhicule', sortable: true, defaultVisible: true, render: (item: any) => allVehicles.find(v => v.id === item.vehicle_id)?.plate || 'N/A' },
        { key: 'liters', label: 'Litres', sortable: true, defaultVisible: true, render: (item: any) => `${item.liters} L` },
        { key: 'price_per_liter', label: 'Prix/L', sortable: true, defaultVisible: true, render: (item: any) => `${item.price_per_liter.toFixed(2)} TND` },
        { key: 'total_cost', label: 'Coût Total', sortable: true, defaultVisible: true, render: (item: any) => `${(item.liters * item.price_per_liter).toFixed(2)} TND` },
        { key: 'mileage', label: 'Kilométrage', sortable: true, defaultVisible: true, render: (item: any) => `${item.mileage.toLocaleString()} km` },
      ];
    case 'documents':
      return [
        { key: 'vehicle_id', label: 'Véhicule', sortable: true, defaultVisible: true, render: (item: any) => allVehicles.find(v => v.id === item.vehicle_id)?.plate || 'N/A' },
        { key: 'type', label: 'Type Document', sortable: true, defaultVisible: true },
        { key: 'number', label: 'N° Document', sortable: true, defaultVisible: true },
        { key: 'expiration', label: 'Expiration', sortable: true, defaultVisible: true, render: (item: any) => formatDate(item.expiration) },
        { key: 'days_left', label: 'Jours Restants', sortable: false, defaultVisible: true, render: (item: any) => {
          const daysLeft = getDaysUntilExpiration(item.expiration);
          return daysLeft < 0 ? 'Expiré' : `${daysLeft} jours`;
        }},
      ];
    case 'maintenance_entries': // Corrected to 'maintenance_entries'
      return [
        { key: 'date', label: 'Date', sortable: true, defaultVisible: true, render: (item: any) => formatDate(item.date) },
        { key: 'vehicle_id', label: 'Véhicule', sortable: true, defaultVisible: true, render: (item: any) => allVehicles.find(v => v.id === item.vehicle_id)?.plate || 'N/A' },
        { key: 'type', label: 'Type', sortable: true, defaultVisible: true },
        { key: 'mileage', label: 'Kilométrage', sortable: true, defaultVisible: true, render: (item: any) => `${item.mileage.toLocaleString()} km` },
        { key: 'cost', label: 'Coût', sortable: true, defaultVisible: true, render: (item: any) => `${item.cost.toFixed(2)} TND` },
        { key: 'days_since_entry', label: 'Jours depuis l\'entrée', sortable: true, defaultVisible: true, render: (item: any) => getDaysSinceEntry(item.date) },
      ];
    case 'pre_departure_checklists':
      return [
        { key: 'date', label: 'Date', sortable: true, defaultVisible: true, render: (item: any) => formatDate(item.date) },
        { key: 'vehicle_id', label: 'Véhicule', sortable: true, defaultVisible: true, render: (item: any) => allVehicles.find(v => v.id === item.vehicle_id)?.plate || 'N/A' },
        { key: 'driver_id', label: 'Conducteur', sortable: true, defaultVisible: true, render: (item: any) => allDrivers.find(d => d.id === item.driver_id)?.name || 'N/A' },
        { key: 'tire_pressure_ok', label: 'Pneus OK', sortable: true, defaultVisible: true, render: (item: any) => item.tire_pressure_ok ? 'Oui' : 'Non' },
        { key: 'lights_ok', label: 'Feux OK', sortable: true, defaultVisible: true, render: (item: any) => item.lights_ok ? 'Oui' : 'Non' },
        { key: 'oil_level_ok', label: 'Huile OK', sortable: true, defaultVisible: true, render: (item: any) => item.oil_level_ok ? 'Oui' : 'Non' },
        { key: 'fluid_levels_ok', label: 'Fluides OK', sortable: true, defaultVisible: true, render: (item: any) => item.fluid_levels_ok ? 'Oui' : 'Non' },
        { key: 'brakes_ok', label: 'Freins OK', sortable: true, defaultVisible: true, render: (item: any) => item.brakes_ok ? 'Oui' : 'Non' },
        { key: 'wipers_ok', label: 'Essuie-glaces OK', sortable: true, defaultVisible: true, render: (item: any) => item.wipers_ok ? 'Oui' : 'Non' },
        { key: 'horn_ok', label: 'Klaxon OK', sortable: true, defaultVisible: true, render: (item: any) => item.horn_ok ? 'Oui' : 'Non' },
        { key: 'mirrors_ok', label: 'Rétroviseurs OK', sortable: true, defaultVisible: true, render: (item: any) => item.mirrors_ok ? 'Oui' : 'Non' },
        { key: 'ac_working_ok', label: 'AC OK', sortable: true, defaultVisible: true, render: (item: any) => item.ac_working_ok ? 'Oui' : 'Non' },
        { key: 'windows_working_ok', label: 'Vitres OK', sortable: true, defaultVisible: true, render: (item: any) => item.windows_working_ok ? 'Oui' : 'Non' },
        { key: 'observations', label: 'Observations', sortable: true, defaultVisible: true, render: (item: any) => item.observations || '-' },
        { key: 'issues_to_address', label: 'Problèmes', sortable: true, defaultVisible: true, render: (item: any) => item.issues_to_address || '-' },
      ];
    default:
      return [];
  }
};

const Reports: React.FC<ReportsProps> = ({ userRole }) => {
  void userRole;

  const [selectedDataSource, setSelectedDataSource] = useState<keyof FleetData | ''>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [viewMode, setViewMode] = useState<'table' | 'chart'>('table');

  // New states for dynamic reporting
  const [groupByColumn, setGroupByColumn] = useState<ReportGroupingOption>('none');
  const [aggregationType, setAggregationType] = useState<ReportAggregationType>('none');
  const [aggregationField, setAggregationField] = useState<ReportAggregationField | ''>('');
  const [chartType, setChartType] = useState<ReportChartType>('BarChart');

  const { fleetData, isLoadingFleet, getResourcePaginationState, setResourcePaginationState } = useFleetData();
  const { vehicles, drivers } = fleetData;

  const {
    currentPage = 1,
    itemsPerPage = 10,
    sortColumn = '',
    sortDirection = 'asc',
    totalCount = 0
  } = getResourcePaginationState(selectedDataSource as Resource) || {};

  const onPageChange = useCallback((page: number) => {
    if (selectedDataSource) {
      setResourcePaginationState(selectedDataSource as Resource, { currentPage: page });
    }
  }, [setResourcePaginationState, selectedDataSource]);

  const onItemsPerPageChange = useCallback((count: number) => {
    if (selectedDataSource) {
      setResourcePaginationState(selectedDataSource as Resource, { itemsPerPage: count });
    }
  }, [setResourcePaginationState, selectedDataSource]);

  const onSortChange = useCallback((column: string, direction: 'asc' | 'desc') => {
    if (selectedDataSource) {
      setResourcePaginationState(selectedDataSource as Resource, { sortColumn: column, sortDirection: direction });
    }
  }, [setResourcePaginationState, selectedDataSource]);

  const dataSources: { id: keyof FleetData; name: string; groupableColumns: ReportOption[]; aggregatableFields: ReportOption[]; chartTypes: ReportChartType[] }[] = [
    {
      id: 'vehicles',
      name: 'Véhicules',
      groupableColumns: [
        { label: 'Aucun', value: 'none' },
        { label: 'Type', value: 'type' },
        { label: 'Statut', value: 'status' },
      ],
      aggregatableFields: [
        { label: 'Nombre de véhicules', value: 'count' },
        { label: 'Kilométrage moyen', value: 'mileage' },
      ],
      chartTypes: ['BarChart', 'PieChart'],
    },
    {
      id: 'drivers',
      name: 'Conducteurs',
      groupableColumns: [
        { label: 'Aucun', value: 'none' },
        { label: 'Statut', value: 'status' },
      ],
      aggregatableFields: [
        { label: 'Nombre de conducteurs', value: 'count' },
      ],
      chartTypes: ['BarChart', 'PieChart'],
    },
    {
      id: 'tours',
      name: 'Tournées',
      groupableColumns: [
        { label: 'Aucun', value: 'none' },
        { label: 'Date (Mois)', value: 'date_month' },
        { label: 'Date (Année)', value: 'date_year' },
        { label: 'Véhicule', value: 'vehicle_id' },
        { label: 'Conducteur', value: 'driver_id' },
        { label: 'Statut', value: 'status' },
      ],
      aggregatableFields: [
        { label: 'Nombre de tournées', value: 'count' },
        { label: 'Distance totale', value: 'distance' },
      ],
      chartTypes: ['BarChart', 'LineChart'],
    },
    {
      id: 'fuel_entries',
      name: 'Carburant',
      groupableColumns: [
        { label: 'Aucun', value: 'none' },
        { label: 'Date (Mois)', value: 'date_month' },
        { label: 'Date (Année)', value: 'date_year' },
        { label: 'Véhicule', value: 'vehicle_id' },
      ],
      aggregatableFields: [
        { label: 'Nombre d\'entrées', value: 'count' },
        { label: 'Litres totaux', value: 'liters' },
        { label: 'Coût total', value: 'total_cost' },
        { label: 'Kilométrage moyen', value: 'mileage' },
      ],
      chartTypes: ['BarChart', 'LineChart', 'PieChart'],
    },
    {
      id: 'documents',
      name: 'Documents',
      groupableColumns: [
        { label: 'Aucun', value: 'none' },
        { label: 'Type', value: 'type' },
        { label: 'Véhicule', value: 'vehicle_id' },
      ],
      aggregatableFields: [
        { label: 'Nombre de documents', value: 'count' },
      ],
      chartTypes: ['BarChart', 'PieChart'],
    },
    {
      id: 'maintenance', // Corrected from 'maintenance_entries'
      name: 'Maintenance',
      groupableColumns: [
        { label: 'Aucun', value: 'none' },
        { label: 'Date (Mois)', value: 'date_month' },
        { label: 'Date (Année)', value: 'date_year' },
        { label: 'Véhicule', value: 'vehicle_id' },
        { label: 'Type', value: 'type' },
      ],
      aggregatableFields: [
        { label: 'Nombre d\'entrées', value: 'count' },
        { label: 'Coût total', value: 'cost' }, // Changed from 'total_cost' to 'cost'
        { label: 'Kilométrage moyen', value: 'mileage' },
      ],
      chartTypes: ['BarChart', 'LineChart', 'PieChart'],
    },
    {
      id: 'pre_departure_checklists',
      name: 'Checklists Pré-départ',
      groupableColumns: [
        { label: 'Aucun', value: 'none' },
        { label: 'Date (Mois)', value: 'date_month' },
        { label: 'Date (Année)', value: 'date_year' },
        { label: 'Véhicule', value: 'vehicle_id' },
        { label: 'Conducteur', value: 'driver_id' },
      ],
      aggregatableFields: [
        { label: 'Nombre de checklists', value: 'count' },
      ],
      chartTypes: ['BarChart'],
    },
  ];

  const currentDataSourceConfig = useMemo(() => {
    return dataSources.find(ds => ds.id === selectedDataSource);
  }, [selectedDataSource]);

  const currentData = useMemo(() => {
    if (!selectedDataSource) return [];
    return fleetData[selectedDataSource] || [];
  }, [fleetData, selectedDataSource]);

  const customFilter = useCallback((item: any) => {
    let matchesDateRange = true;
    const itemDateString = (item as any).date || (item as any).expiration || (item as any).created_at;
    
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

  const processedReportData = useMemo(() => {
    let filtered = currentData.filter(customFilter);

    if (groupByColumn === 'none' || aggregationType === 'none' || !aggregationField) {
      // For raw data, ensure it has an 'id' for DataTable
      return filtered.map((item, index) => ({ ...item, id: item.id || `raw-${index}` }));
    }

    const groupedData: Record<string, any[]> = {};

    filtered.forEach((item: any) => {
      let groupKey: string;
      let dateValue: Date | null = null;

      if (item.date) {
        dateValue = new Date(item.date);
      } else if (item.expiration) {
        dateValue = new Date(item.expiration);
      } else if (item.created_at) {
        dateValue = new Date(item.created_at);
      }

      if (groupByColumn === 'date_month' && dateValue) {
        groupKey = moment(dateValue).format('YYYY-MM');
      } else if (groupByColumn === 'date_year' && dateValue) {
        groupKey = moment(dateValue).format('YYYY');
      } else if (groupByColumn === 'vehicle_id') {
        groupKey = vehicles.find(v => v.id === item.vehicle_id)?.plate || 'Inconnu';
      } else if (groupByColumn === 'driver_id') {
        groupKey = drivers.find(d => d.id === item.driver_id)?.name || 'Inconnu';
      } else if (groupByColumn === 'type' && item.type) {
        groupKey = item.type;
      } else if (groupByColumn === 'status' && item.status) {
        groupKey = item.status;
      } else {
        groupKey = 'Non groupé';
      }

      if (!groupedData[groupKey]) {
        groupedData[groupKey] = [];
      }
      groupedData[groupKey].push(item);
    });

    const aggregatedData: ProcessedReportData[] = Object.keys(groupedData).map(key => {
      const groupItems = groupedData[key];
      let aggregatedValue: number | string = 0;

      if (aggregationType === 'count') {
        aggregatedValue = groupItems.length;
      } else if (aggregationType === 'sum' || aggregationType === 'avg') {
        let sum = 0;
        groupItems.forEach(item => {
          let valueToAdd = 0;
          if (aggregationField === 'total_cost') {
            if (selectedDataSource === 'fuel_entries') {
              valueToAdd = (item.liters || 0) * (item.price_per_liter || 0);
            } else if (selectedDataSource === 'maintenance_entries') { // Corrected
              valueToAdd = item.cost || 0;
            }
          } else if (aggregationField === 'distance' && selectedDataSource === 'tours') {
            valueToAdd = item.distance || 0;
          } else if (aggregationField === 'mileage' && (selectedDataSource === 'vehicles' || selectedDataSource === 'fuel_entries' || selectedDataSource === 'maintenance_entries')) { // Corrected
            valueToAdd = item.mileage || 0;
          } else if (aggregationField === 'liters' && selectedDataSource === 'fuel_entries') {
            valueToAdd = item.liters || 0;
          } else if (aggregationField === 'cost' && selectedDataSource === 'maintenance_entries') { // Corrected
            valueToAdd = item.cost || 0;
          }
          sum += valueToAdd;
        });

        if (aggregationType === 'sum') {
          aggregatedValue = sum;
        } else if (aggregationType === 'avg') {
          aggregatedValue = groupItems.length > 0 ? sum / groupItems.length : 0;
        }
      }

      return {
        id: key, // Add id for DataTable
        name: key, // The group key (e.g., '2023-01', 'Camionnette', 'John Doe')
        value: aggregatedValue,
        rawItems: groupItems, // Keep raw items for potential drill-down or detailed table view
      };
    });

    return aggregatedData.sort((a, b) => a.name.localeCompare(b.name)); // Sort by group key
  }, [currentData, customFilter, groupByColumn, aggregationType, aggregationField, selectedDataSource, vehicles, drivers]);

  const columns = useMemo(() => {
    if (groupByColumn !== 'none' && aggregationType !== 'none' && aggregationField) {
      // Columns for aggregated data
      return [
        { key: 'name', label: currentDataSourceConfig?.groupableColumns.find(opt => opt.value === groupByColumn)?.label || 'Groupe', sortable: true, defaultVisible: true },
        { key: 'value', label: currentDataSourceConfig?.aggregatableFields.find(opt => opt.value === aggregationField)?.label || 'Valeur', sortable: true, defaultVisible: true, render: (item: ProcessedReportData) => typeof item.value === 'number' ? item.value.toFixed(2) : item.value },
      ];
    }
    // Columns for raw data
    return getColumnConfigs(selectedDataSource as Resource, vehicles, drivers);
  }, [selectedDataSource, vehicles, drivers, groupByColumn, aggregationType, aggregationField, currentDataSourceConfig]);

  // Effect to reset aggregation/grouping/chart options when data source changes
  useEffect(() => {
    if (selectedDataSource) {
      setGroupByColumn('none');
      setAggregationType('none');
      setAggregationField('');
      setChartType(currentDataSourceConfig?.chartTypes[0] || 'BarChart'); // Default to first available chart type
      // Reset pagination and sorting for the new data source
      const newColumns = getColumnConfigs(selectedDataSource as Resource, vehicles, drivers);
      setResourcePaginationState(selectedDataSource as Resource, { 
        currentPage: 1, 
        sortColumn: newColumns[0]?.key as string || 'id', // Ensure a default sortColumn
        sortDirection: 'asc' 
      });
    }
  }, [selectedDataSource, currentDataSourceConfig, vehicles, drivers, setResourcePaginationState]);

  // Effect to reset aggregationField when aggregationType or groupByColumn changes
  useEffect(() => {
    if (aggregationType === 'none' || aggregationType === 'count') {
      setAggregationField('');
    }
  }, [aggregationType, groupByColumn]);


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
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all glass"
            disabled={!selectedDataSource}
          />
        </div>
        <div className="relative">
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full glass border border-gray-300 rounded-lg pl-4 pr-10 py-3 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
            className="w-full glass border border-gray-300 rounded-lg pl-4 pr-10 py-3 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Date de fin"
            disabled={!selectedDataSource}
          />
          <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
        </div>
      </>
    );
  }, [selectedDataSource, startDate, endDate]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <h2 className="text-4xl font-bold text-gray-800">Rapports Personnalisables</h2>
        <div className="flex space-x-2">
          <Button
            variant={viewMode === 'table' ? 'default' : 'outline'}
            onClick={() => setViewMode('table')}
            disabled={!selectedDataSource}
            className="hover-lift"
          >
            <Table className="w-4 h-4 mr-2" /> Vue Tableau
          </Button>
          <Button
            variant={viewMode === 'chart' ? 'default' : 'outline'}
            onClick={() => setViewMode('chart')}
            disabled={!selectedDataSource || !currentDataSourceConfig?.chartTypes.length || groupByColumn === 'none' || aggregationType === 'none' || aggregationField === ''}
            className="hover-lift"
          >
            <BarChart2 className="w-4 h-4 mr-2" /> Vue Graphique
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <select
            id="dataSource"
            value={selectedDataSource}
            onChange={(e) => {
              const newDataSource = e.target.value as keyof FleetData;
              setSelectedDataSource(newDataSource);
              setStartDate('');
              setEndDate('');
              setViewMode('table');
            }}
            className="w-full glass border border-gray-300 rounded-lg px-4 py-3 shadow-sm focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="" disabled>Sélectionner la source de données</option>
            {dataSources.map(source => (
              <option key={source.id} value={source.id}>{source.name}</option>
            ))}
          </select>
        </div>
        {renderFilters('', () => {})}
        
        {selectedDataSource && (
          <>
            <div>
              <select
                id="groupByColumn"
                value={groupByColumn}
                onChange={(e) => setGroupByColumn(e.target.value as ReportGroupingOption)}
                className="w-full glass border border-gray-300 rounded-lg px-4 py-3 shadow-sm focus:ring-blue-500 focus:border-blue-500"
                disabled={!selectedDataSource}
              >
                {currentDataSourceConfig?.groupableColumns.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
            <div>
              <select
                id="aggregationType"
                value={aggregationType}
                onChange={(e) => setAggregationType(e.target.value as ReportAggregationType)}
                className="w-full glass border border-gray-300 rounded-lg px-4 py-3 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={!selectedDataSource || groupByColumn === 'none'}
              >
                <option value="none" disabled>Sélectionner l'agrégation</option>
                <option value="count">Compter</option>
                {(selectedDataSource === 'fuel_entries' || selectedDataSource === 'maintenance_entries' || selectedDataSource === 'tours' || selectedDataSource === 'vehicles') && ( // Corrected
                  <>
                    <option value="sum">Somme</option>
                    <option value="avg">Moyenne</option>
                  </>
                )}
              </select>
            </div>
            {aggregationType !== 'none' && aggregationType !== 'count' && (
              <div>
                <select
                  id="aggregationField"
                  value={aggregationField}
                  onChange={(e) => setAggregationField(e.target.value as ReportAggregationField)}
                  className="w-full glass border border-gray-300 rounded-lg px-4 py-3 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={!selectedDataSource} // Simplified condition
                >
                  <option value="" disabled>Sélectionner le champ</option>
                  {currentDataSourceConfig?.aggregatableFields
                    .filter(f => f.value !== 'count') // Exclude 'count' as it's an aggregation type, not a field
                    .map(option => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                </select>
              </div>
            )}
            {viewMode === 'chart' && currentDataSourceConfig?.chartTypes.length && (
              <div>
                <select
                  id="chartType"
                  value={chartType}
                  onChange={(e) => setChartType(e.target.value as ReportChartType)}
                  className="w-full glass border border-gray-300 rounded-lg px-4 py-3 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={!selectedDataSource || groupByColumn === 'none' || aggregationType === 'none' || aggregationField === ''}
                >
                  {currentDataSourceConfig.chartTypes.map(type => (
                    <option key={type} value={type}>{type === 'BarChart' ? 'Graphique à barres' : type === 'LineChart' ? 'Graphique linéaire' : 'Graphique à secteurs'}</option>
                  ))}
                </select>
              </div>
            )}
          </>
        )}
      </div>

      {selectedDataSource ? (
        viewMode === 'table' ? (
          <DataTable
            title={`Rapport: ${currentDataSourceConfig?.name || ''}`}
            data={processedReportData}
            columns={columns}
            exportFileName={`rapport_${selectedDataSource}`}
            isLoading={isLoadingFleet}
            resourceType={selectedDataSource as Resource}
            currentPage={currentPage}
            onPageChange={onPageChange}
            itemsPerPage={itemsPerPage}
            onItemsPerPageChange={onItemsPerPageChange}
            totalCount={totalCount}
            sortColumn={sortColumn}
            onSortChange={onSortChange}
            sortDirection={sortDirection}
          />
        ) : (
          <ReportCharts
            dataSource={selectedDataSource as Resource}
            data={processedReportData}
            groupByColumn={groupByColumn}
            aggregationType={aggregationType}
            aggregationField={aggregationField}
            chartType={chartType}
            vehicles={vehicles}
            drivers={drivers}
          />
        )
      ) : (
        <div className="glass rounded-xl shadow-lg p-6 text-center text-gray-600">
          Veuillez sélectionner une source de données pour afficher le rapport.
        </div>
      )}
    </div>
  );
};

export default Reports;