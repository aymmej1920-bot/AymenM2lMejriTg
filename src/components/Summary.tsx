import React from 'react';
import { Truck, Users, Route, MapPin, Fuel, AlertCircle, Wrench } from 'lucide-react';
import { FleetData } from '../types';
import MonthlyPerformanceChart from './charts/MonthlyPerformanceChart';
import CostDistributionChart from './charts/CostDistributionChart';
import { useFleetStats } from '../hooks/useFleetStats'; // Import the new hook

interface SummaryProps {
  data: FleetData;
}

const Summary: React.FC<SummaryProps> = ({ data }) => {
  const {
    totalVehicles,
    activeDrivers,
    toursThisMonth,
    totalDistance,
    totalFuelCost,
    totalLiters,
    avgPricePerLiter,
    totalMaintenanceCost,
    expiringDocsCount,
    validDocsCount,
    upcomingMaintenanceCount,
    avgKmPerVehicle,
    avgFuelCostPerVehicle,
    avgToursPerVehicle,
    totalCostPerVehicle,
  } = useFleetStats(data);

  const kpis = [
    {
      title: 'Véhicules Total',
      value: totalVehicles,
      icon: Truck,
      color: 'from-blue-500 to-blue-600',
    },
    {
      title: 'Conducteurs Actifs',
      value: activeDrivers,
      icon: Users,
      color: 'from-green-500 to-green-600',
    },
    {
      title: 'Tournées ce mois',
      value: toursThisMonth,
      icon: Route,
      color: 'from-orange-500 to-orange-600',
    },
    {
      title: 'Distance Totale',
      value: `${totalDistance.toLocaleString()} km`,
      icon: MapPin,
      color: 'from-purple-500 to-purple-600',
    },
  ];

  const fuelStats = [
    { label: 'Total Litres', value: `${totalLiters.toFixed(2)} L` },
    { label: 'Coût Total', value: `${totalFuelCost.toFixed(2)} TND`, color: 'text-green-600' },
    { label: 'Prix Moyen/L', value: `${avgPricePerLiter.toFixed(2)} TND` },
  ];

  const maintenanceStats = [
    { label: 'Coût Total Maintenance', value: `${totalMaintenanceCost.toFixed(2)} TND`, color: 'text-red-600' },
    { label: 'Maintenance à venir', value: `${upcomingMaintenanceCount} véhicules`, color: upcomingMaintenanceCount > 0 ? 'text-orange-600' : 'text-gray-900' },
  ];

  const documentStats = [
    { label: 'Documents Valides', value: `${validDocsCount} documents`, color: 'text-green-600' },
    { label: 'Documents Expirant bientôt', value: `${expiringDocsCount} documents`, color: expiringDocsCount > 0 ? 'text-red-600' : 'text-gray-900' },
  ];

  return (
    <div className="space-y-8">
      <h2 className="text-4xl font-bold text-gray-800">Résumé Général</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpis.map((kpi, index) => {
          const Icon = kpi.icon;
          return (
            <div key={index} className={`bg-gradient-to-br ${kpi.color} text-white rounded-xl shadow-lg p-6`}>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-white text-sm font-medium opacity-90">{kpi.title}</h3>
                  <p className="text-3xl font-bold mt-2">{kpi.value}</p>
                </div>
                <Icon className="w-8 h-8 opacity-80" />
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-xl font-semibold mb-6 text-gray-800">Performance Mensuelle</h3>
          <div className="h-64">
            <MonthlyPerformanceChart 
              tours={data.tours} 
              fuelEntries={data.fuel} 
              maintenanceEntries={data.maintenance} 
            />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-xl font-semibold mb-6 text-gray-800">Répartition des Coûts (TND)</h3>
          <div className="h-64">
            <CostDistributionChart 
              fuelEntries={data.fuel} 
              maintenanceEntries={data.maintenance} 
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center mb-6">
            <Fuel className="w-6 h-6 text-blue-600 mr-3" />
            <h3 className="text-xl font-semibold text-gray-800">Statistiques Carburant</h3>
          </div>
          <div className="space-y-4">
            {fuelStats.map((stat, index) => (
              <div key={index} className="flex justify-between items-center">
                <span className="text-gray-600">{stat.label}</span>
                <span className={`font-semibold ${stat.color || 'text-gray-900'}`}>{stat.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center mb-6">
            <Wrench className="w-6 h-6 text-orange-600 mr-3" /> {/* Changed icon to Wrench */}
            <h3 className="text-xl font-semibold text-gray-800">Maintenance</h3>
          </div>
          <div className="space-y-4">
            {maintenanceStats.map((stat, index) => (
              <div key={index} className="flex justify-between items-center">
                <span className="text-gray-600">{stat.label}</span>
                <span className={`font-semibold ${stat.color || 'text-gray-900'}`}>{stat.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center mb-6">
            <AlertCircle className="w-6 h-6 text-green-600 mr-3" /> {/* Changed icon to AlertCircle */}
            <h3 className="text-xl font-semibold text-gray-800">Documents</h3>
          </div>
          <div className="space-y-4">
            {documentStats.map((stat, index) => (
              <div key={index} className="flex justify-between items-center">
                <span className="text-gray-600">{stat.label}</span>
                <span className={`font-semibold ${stat.color || 'text-gray-900'}`}>{stat.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-xl font-semibold mb-6 text-gray-800">Aperçu des Performances</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-3xl font-bold text-blue-600 mb-2">{avgKmPerVehicle.toFixed(0)}</div>
            <div className="text-sm text-blue-700">Km moyen/véhicule</div>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-3xl font-bold text-green-600 mb-2">{avgFuelCostPerVehicle.toFixed(0)}</div>
            <div className="text-sm text-green-700">TND/véhicule (carburant)</div>
          </div>
          <div className="text-center p-4 bg-orange-50 rounded-lg">
            <div className="text-3xl font-bold text-orange-600 mb-2">{avgToursPerVehicle.toFixed(1)}</div>
            <div className="text-sm text-orange-700">Tournées/véhicule</div>
          </div>
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <div className="text-3xl font-bold text-purple-600 mb-2">{totalCostPerVehicle.toFixed(0)}</div>
            <div className="text-sm text-purple-700">Coût total/véhicule</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Summary;