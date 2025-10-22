import React from 'react';
import MonthlyFuelConsumptionChart from '../charts/MonthlyFuelConsumptionChart';
import { useFleetData } from '../FleetDataProvider'; // Import useFleetData

interface MonthlyFuelConsumptionChartWidgetProps {
  // data: FleetData; // No longer needed as data is fetched internally
}

const MonthlyFuelConsumptionChartWidget: React.FC<MonthlyFuelConsumptionChartWidgetProps> = () => {
  // Consume data from FleetContext
  const { fleetData, isLoadingFleet } = useFleetData();
  const fuelEntries = fleetData.fuel;

  if (isLoadingFleet) {
    return null; // Or a small skeleton loader if preferred
  }

  return (
    <div className="glass rounded-xl shadow-lg p-6 animate-fade-in">
      <h3 className="text-xl font-semibold mb-6 text-gray-800">Consommation Mensuelle</h3>
      <div className="h-64">
        <MonthlyFuelConsumptionChart fuelEntries={fuelEntries} />
      </div>
    </div>
  );
};

export default MonthlyFuelConsumptionChartWidget;