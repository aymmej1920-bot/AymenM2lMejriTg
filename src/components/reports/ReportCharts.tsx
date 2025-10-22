import React from 'react';
import { Resource, Vehicle, FuelEntry } from '../../types';
import VehicleStatusChart from '../charts/VehicleStatusChart';
import MonthlyFuelConsumptionChart from '../charts/MonthlyFuelConsumptionChart';

interface ReportChartsProps {
  dataSource: Resource;
  data: any[]; // The filtered data for the selected resource
}

const ReportCharts: React.FC<ReportChartsProps> = ({ dataSource, data }) => {
  if (!data || data.length === 0) {
    return (
      <div className="glass rounded-xl shadow-lg p-6 text-center text-gray-600 h-64 flex items-center justify-center">
        Aucune donnée disponible pour générer un graphique.
      </div>
    );
  }

  switch (dataSource) {
    case 'vehicles':
      return (
        <div className="glass rounded-xl shadow-lg p-6 h-96 flex flex-col">
          <h3 className="text-xl font-semibold mb-6 text-gray-800">État des Véhicules</h3>
          <div className="flex-1">
            <VehicleStatusChart vehicles={data as Vehicle[]} />
          </div>
        </div>
      );
    case 'fuel_entries':
      return (
        <div className="glass rounded-xl shadow-lg p-6 h-96 flex flex-col">
          <h3 className="text-xl font-semibold mb-6 text-gray-800">Consommation Mensuelle de Carburant</h3>
          <div className="flex-1">
            <MonthlyFuelConsumptionChart fuelEntries={data as FuelEntry[]} />
          </div>
        </div>
      );
    // Add more cases for other data sources and charts as needed
    default:
      return (
        <div className="glass rounded-xl shadow-lg p-6 text-center text-gray-600 h-64 flex items-center justify-center">
          Aucun graphique disponible pour cette source de données.
        </div>
      );
  }
};

export default ReportCharts;