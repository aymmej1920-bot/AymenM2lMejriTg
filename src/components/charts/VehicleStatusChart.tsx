import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Vehicle } from '../../types';

interface VehicleStatusChartProps {
  vehicles: Vehicle[];
}

// Définir une interface pour les props du label du PieChart
interface PieLabelProps {
  name?: string;
  percent?: number;
}

const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#9E9E9E']; // Green, Amber, Red, Grey (using Tailwind equivalents)

const VehicleStatusChart: React.FC<VehicleStatusChartProps> = ({ vehicles }) => {
  const statusCounts = vehicles.reduce((acc, vehicle) => {
    acc[vehicle.status] = (acc[vehicle.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const data = Object.keys(statusCounts).map((status, index) => ({
    name: status,
    value: statusCounts[status],
    color: COLORS[index % COLORS.length],
  }));

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
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip contentStyle={{ backgroundColor: 'rgba(255,255,255,0.7)', border: 'none', borderRadius: '8px' }} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
};

export default VehicleStatusChart;