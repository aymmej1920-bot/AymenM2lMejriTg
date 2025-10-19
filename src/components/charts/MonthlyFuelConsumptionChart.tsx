import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { FuelEntry } from '../../types';

interface MonthlyFuelConsumptionChartProps {
  fuelEntries: FuelEntry[];
}

const MonthlyFuelConsumptionChart: React.FC<MonthlyFuelConsumptionChartProps> = ({ fuelEntries }) => {
  const monthlyDataMap = fuelEntries.reduce((acc, entry) => {
    const date = new Date(entry.date);
    const monthYear = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
    
    if (!acc[monthYear]) {
      acc[monthYear] = { month: monthYear, totalCost: 0, totalLiters: 0 };
    }
    acc[monthYear].totalCost += entry.liters * entry.price_per_liter;
    acc[monthYear].totalLiters += entry.liters;
    return acc;
  }, {} as Record<string, { month: string; totalCost: number; totalLiters: number }>);

  const data = Object.values(monthlyDataMap).sort((a, b) => a.month.localeCompare(b.month));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart
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
        <YAxis yAxisId="left" orientation="left" stroke="#8884d8" label={{ value: 'Coût Total (TND)', angle: -90, position: 'insideLeft', fill: '#8884d8' }} />
        <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" label={{ value: 'Litres Total', angle: 90, position: 'insideRight', fill: '#82ca9d' }} />
        <Tooltip contentStyle={{ backgroundColor: 'rgba(255,255,255,0.7)', border: 'none', borderRadius: '8px' }} formatter={(value: number, name: string) => name === 'totalCost' ? `${value.toFixed(2)} TND` : `${value.toFixed(2)} L`} />
        <Legend />
        <Bar yAxisId="left" dataKey="totalCost" name="Coût Total" fill="#3b82f6" /> {/* Using brand blue */}
        <Bar yAxisId="right" dataKey="totalLiters" name="Litres Total" fill="#10b981" /> {/* Using success green */}
      </BarChart>
    </ResponsiveContainer>
  );
};

export default MonthlyFuelConsumptionChart;