import React from 'react';
import { FleetData } from '../../types';
import MonthlyFuelConsumptionChart from '../charts/MonthlyFuelConsumptionChart';

interface MonthlyFuelConsumptionChartWidgetProps {
  data: FleetData;
}

const MonthlyFuelConsumptionChartWidget: React.FC<MonthlyFuelConsumptionChartWidgetProps> = ({ data }) => (
  <div className="glass rounded-xl shadow-lg p-6 animate-fade-in">
    <h3 className="text-xl font-semibold mb-6 text-gray-800">Consommation Mensuelle</h3>
    <div className="h-64">
      <MonthlyFuelConsumptionChart fuelEntries={data.fuel} />
    </div>
  </div>
);

export default MonthlyFuelConsumptionChartWidget;