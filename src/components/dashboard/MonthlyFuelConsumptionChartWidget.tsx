import React from 'react';
import { FuelEntry } from '../../types';
import MonthlyFuelConsumptionChart from '../charts/MonthlyFuelConsumptionChart';
import { useSupabaseData } from '../../hooks/useSupabaseData'; // Import useSupabaseData

interface MonthlyFuelConsumptionChartWidgetProps {
  // data: FleetData; // No longer needed as data is fetched internally
}

const MonthlyFuelConsumptionChartWidget: React.FC<MonthlyFuelConsumptionChartWidgetProps> = () => {
  const { data: fuelEntries, isLoading: isLoadingFuel } = useSupabaseData<FuelEntry>('fuel_entries');

  if (isLoadingFuel) {
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