import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Tour, FuelEntry, MaintenanceEntry } from '../../types';

interface MonthlyPerformanceChartProps {
  tours: Tour[];
  fuelEntries: FuelEntry[];
  maintenanceEntries: MaintenanceEntry[];
}

const MonthlyPerformanceChart: React.FC<MonthlyPerformanceChartProps> = ({ tours, fuelEntries, maintenanceEntries }) => {
  const monthlyDataMap = new Map<string, { month: string; totalDistance: number; totalFuelCost: number; totalMaintenanceCost: number }>();

  // Process tours for distance
  tours.forEach(tour => {
    const date = new Date(tour.date);
    const monthYear = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
    if (!monthlyDataMap.has(monthYear)) {
      monthlyDataMap.set(monthYear, { month: monthYear, totalDistance: 0, totalFuelCost: 0, totalMaintenanceCost: 0 });
    }
    monthlyDataMap.get(monthYear)!.totalDistance += tour.distance || 0;
  });

  // Process fuel entries for cost
  fuelEntries.forEach(entry => {
    const date = new Date(entry.date);
    const monthYear = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
    if (!monthlyDataMap.has(monthYear)) {
      monthlyDataMap.set(monthYear, { month: monthYear, totalDistance: 0, totalFuelCost: 0, totalMaintenanceCost: 0 });
    }
    monthlyDataMap.get(monthYear)!.totalFuelCost += entry.liters * entry.price_per_liter;
  });

  // Process maintenance entries for cost
  maintenanceEntries.forEach(entry => {
    const date = new Date(entry.date);
    const monthYear = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
    if (!monthlyDataMap.has(monthYear)) {
      monthlyDataMap.set(monthYear, { month: monthYear, totalDistance: 0, totalFuelCost: 0, totalMaintenanceCost: 0 });
    }
    monthlyDataMap.get(monthYear)!.totalMaintenanceCost += entry.cost;
  });

  const data = Array.from(monthlyDataMap.values()).sort((a, b) => a.month.localeCompare(b.month));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart
        data={data}
        margin={{
          top: 5,
          right: 30,
          left: 20,
          bottom: 5,
        }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.3)" />
        <XAxis dataKey="month" stroke="#8884d8" />
        <YAxis yAxisId="left" orientation="left" stroke="#8884d8" label={{ value: 'Distance (km)', angle: -90, position: 'insideLeft', fill: '#8884d8' }} />
        <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" label={{ value: 'Coût Total (TND)', angle: 90, position: 'insideRight', fill: '#82ca9d' }} />
        <Tooltip contentStyle={{ backgroundColor: 'rgba(255,255,255,0.7)', border: 'none', borderRadius: '8px' }} formatter={(value: number, name: string) => {
          if (name === 'Distance Totale') return `${value.toLocaleString()} km`;
          if (name === 'Coût Carburant') return `${value.toFixed(2)} TND`;
          if (name === 'Coût Maintenance') return `${value.toFixed(2)} TND`;
          return value;
        }} />
        <Legend />
        <Line yAxisId="left" type="monotone" dataKey="totalDistance" name="Distance Totale" stroke="#3b82f6" activeDot={{ r: 8 }} /> {/* Using brand blue */}
        <Line yAxisId="right" type="monotone" dataKey="totalFuelCost" name="Coût Carburant" stroke="#10b981" /> {/* Using success green */}
        <Line yAxisId="right" type="monotone" dataKey="totalMaintenanceCost" name="Coût Maintenance" stroke="#f59e0b" /> {/* Using warning amber */}
      </LineChart>
    </ResponsiveContainer>
  );
};

export default MonthlyPerformanceChart;