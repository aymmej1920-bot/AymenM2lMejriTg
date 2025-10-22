import React from 'react';
import { Vehicle } from '../../types';
import VehicleStatusChart from '../charts/VehicleStatusChart';
import { useSupabaseData } from '../../hooks/useSupabaseData'; // Import useSupabaseData

interface VehicleStatusChartWidgetProps {
  // data: FleetData; // No longer needed as data is fetched internally
}

const VehicleStatusChartWidget: React.FC<VehicleStatusChartWidgetProps> = () => {
  const { data: vehicles, isLoading: isLoadingVehicles } = useSupabaseData<Vehicle>('vehicles');

  if (isLoadingVehicles) {
    return null; // Or a small skeleton loader if preferred
  }

  return (
    <div className="glass rounded-xl shadow-lg p-6 animate-fade-in">
      <h3 className="text-xl font-semibold mb-6 text-gray-800">État des Véhicules</h3>
      <div className="h-64">
        <VehicleStatusChart vehicles={vehicles} />
      </div>
    </div>
  );
};

export default VehicleStatusChartWidget;