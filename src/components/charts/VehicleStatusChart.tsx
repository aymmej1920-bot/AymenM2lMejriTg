import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Vehicle } from '../../types';

interface VehicleStatusChartProps {
  vehicles: Vehicle[];
}

const COLORS = ['#4CAF50', '#FFC107', '#F44336', '#9E9E9E']; // Green, Amber, Red, Grey

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
          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
};

export default VehicleStatusChart;