import React from 'react';
import { Resource, Vehicle, ProcessedReportData, ReportGroupingOption, ReportAggregationType, ReportAggregationField, ReportChartType, Driver } from '../../types'; // Removed FuelEntry
// Removed VehicleStatusChart and MonthlyFuelConsumptionChart
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import moment from 'moment';

interface ReportChartsProps {
  dataSource: Resource;
  data: ProcessedReportData[]; // The processed/aggregated data
  groupByColumn: ReportGroupingOption;
  aggregationType: ReportAggregationType;
  aggregationField: ReportAggregationField | '';
  chartType: ReportChartType;
  vehicles: Vehicle[]; // Needed for mapping vehicle_id to plate
  drivers: Driver[]; // Needed for mapping driver_id to name
}

// Définir une interface pour les props du label du PieChart
interface PieLabelProps {
  name?: string;
  percent?: number;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f43f5e', '#6366f1'];

const ReportCharts: React.FC<ReportChartsProps> = ({ dataSource, data, groupByColumn, aggregationType, aggregationField, chartType, vehicles, drivers }) => {
  void dataSource; // Mark dataSource as used to suppress TS6133

  if (!data || data.length === 0 || groupByColumn === 'none' || aggregationType === 'none' || aggregationField === '') {
    return (
      <div className="glass rounded-xl shadow-lg p-6 text-center text-gray-600 h-64 flex items-center justify-center">
        Aucune donnée agrégée disponible pour générer un graphique.
        <br />
        Veuillez sélectionner une source de données, un regroupement et une agrégation.
      </div>
    );
  }

  // Helper to get label for IDs
  const getGroupLabel = (key: string, groupBy: ReportGroupingOption) => {
    if (groupBy === 'vehicle_id') {
      return vehicles.find(v => v.id === key)?.plate || key;
    }
    if (groupBy === 'driver_id') {
      return drivers.find(d => d.id === key)?.name || key;
    }
    if (groupBy === 'date_month') {
      return moment(key).format('MM/YYYY');
    }
    if (groupBy === 'date_year') {
      return key;
    }
    return key;
  };

  const chartData = data.map(item => ({
    name: getGroupLabel(item.name, groupByColumn),
    value: item.value,
  }));

  const valueLabel = aggregationType === 'count' ? 'Nombre' :
                     aggregationType === 'sum' ? 'Somme' :
                     aggregationType === 'avg' ? 'Moyenne' : 'Valeur';

  const aggregationFieldLabel = aggregationType === 'count' ? '' :
                                aggregationField === 'total_cost' ? 'Coût Total' :
                                aggregationField === 'distance' ? 'Distance' :
                                aggregationField === 'mileage' ? 'Kilométrage' :
                                aggregationField === 'liters' ? 'Litres' :
                                aggregationField === 'cost' ? 'Coût' :
                                aggregationField;

  const renderChart = () => {
    switch (chartType) {
      case 'BarChart':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.3)" />
              <XAxis dataKey="name" stroke="#8884d8" />
              <YAxis stroke="#8884d8" label={{ value: valueLabel, angle: -90, position: 'insideLeft', fill: '#8884d8' }} />
              <Tooltip contentStyle={{ backgroundColor: 'rgba(255,255,255,0.7)', border: 'none', borderRadius: '8px' }} formatter={(value: number) => typeof value === 'number' ? value.toFixed(2) : value} />
              <Legend />
              <Bar dataKey="value" name={aggregationFieldLabel || valueLabel} fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        );
      case 'LineChart':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.3)" />
              <XAxis dataKey="name" stroke="#8884d8" />
              <YAxis stroke="#8884d8" label={{ value: valueLabel, angle: -90, position: 'insideLeft', fill: '#8884d8' }} />
              <Tooltip contentStyle={{ backgroundColor: 'rgba(255,255,255,0.7)', border: 'none', borderRadius: '8px' }} formatter={(value: number) => typeof value === 'number' ? value.toFixed(2) : value} />
              <Legend />
              <Line type="monotone" dataKey="value" name={aggregationFieldLabel || valueLabel} stroke="#8b5cf6" activeDot={{ r: 8 }} />
            </LineChart>
          </ResponsiveContainer>
        );
      case 'PieChart':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
                label={({ name, percent }: PieLabelProps) => `${name || 'N/A'} ${((percent || 0) * 100).toFixed(0)}%`}
              >
                {chartData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: 'rgba(255,255,255,0.7)', border: 'none', borderRadius: '8px' }} formatter={(value: number) => typeof value === 'number' ? value.toFixed(2) : value} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        );
      default:
        return (
          <div className="glass rounded-xl shadow-lg p-6 text-center text-gray-600 h-64 flex items-center justify-center">
            Type de graphique non supporté pour cette configuration.
          </div>
        );
    }
  };

  return (
    <div className="glass rounded-xl shadow-lg p-6 h-96 flex flex-col">
      <h3 className="text-xl font-semibold mb-6 text-gray-800">
        Graphique: {valueLabel} de {aggregationFieldLabel} par {groupByColumn === 'date_month' ? 'Mois' : groupByColumn === 'date_year' ? 'Année' : getGroupLabel('', groupByColumn)}
      </h3>
      <div className="flex-1">
        {renderChart()}
      </div>
    </div>
  );
};

export default ReportCharts;