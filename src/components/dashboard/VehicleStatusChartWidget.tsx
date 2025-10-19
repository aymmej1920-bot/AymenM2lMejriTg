import React from 'react';
import { FleetData } from '../../types';
import VehicleStatusChart from '../charts/VehicleStatusChart';

interface VehicleStatusChartWidgetProps {
  data: FleetData;
}

const VehicleStatusChartWidget: React.FC<VehicleStatusChartWidgetProps> = ({ data }) => (
  <div className="glass rounded-xl shadow-lg p-6 animate-fade-in">
    <h3 className="text-xl font-semibold mb-6 text-gray-800">État des Véhicules</h3>
    <div className="h-64">
      <VehicleStatusChart vehicles={data.vehicles} />
    </div>
  </div>
);

export default VehicleStatusChartWidget;