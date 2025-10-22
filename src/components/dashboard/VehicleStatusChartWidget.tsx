import React from 'react';
import VehicleStatusChart from '../charts/VehicleStatusChart';
import { useFleetData } from '../FleetDataProvider'; // Import useFleetData

interface VehicleStatusChartWidgetProps {
  // data: FleetData; // No longer needed as data is fetched internally
}

const VehicleStatusChartWidget: React.FC<VehicleStatusChartWidgetProps> = () => {
  // Consume data from FleetContext
  const { fleetData, isLoadingFleet } = useFleetData();
  const vehicles = fleetData.vehicles;

  if (isLoadingFleet) {
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