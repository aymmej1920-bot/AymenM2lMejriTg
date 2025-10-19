import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { FuelEntry, MaintenanceEntry } from '../../types';

interface CostDistributionChartProps {
  fuelEntries: FuelEntry[];
  maintenanceEntries: MaintenanceEntry[];
}

// Définir une interface pour les props du label du PieChart
interface PieLabelProps {
  name?: string;
  percent?: number;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444']; // Blue, Green, Yellow, Orange (using Tailwind equivalents)

const CostDistributionChart: React.FC<CostDistributionChartProps> = ({ fuelEntries, maintenanceEntries }) => {
  const totalFuelCost = fuelEntries.reduce((sum, f) => sum + (f.liters * f.price_per_liter), 0);
  const totalMaintenanceCost = maintenanceEntries.reduce((sum, m) => sum + m.cost, 0);

  const data = [
    { name: 'Carburant', value: totalFuelCost },
    { name: 'Maintenance', value: totalMaintenanceCost },
    // Add other cost categories here if available in FleetData
  ].filter(item => item.value > 0); // Only show categories with actual costs

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          outerRadius={100}
          fill="#8884d8"
          dataKey="value"
          label={({ name, percent }: PieLabelProps) => `${name || 'N/A'} ${((percent || 0) * 100).toFixed(0)}%`}
        >
          {data.map((_, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip contentStyle={{ backgroundColor: 'rgba(255,255,255,0.7)', border: 'none', borderRadius: '8px' }} formatter={(value: number) => `${value.toFixed(2)} TND`} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
};

export default CostDistributionChart;