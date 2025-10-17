import React from 'react';
import { Truck, Users, Route, MapPin, Fuel, AlertCircle } from 'lucide-react';
import { FleetData } from '../types';
import MonthlyPerformanceChart from './charts/MonthlyPerformanceChart';
import CostDistributionChart from './charts/CostDistributionChart';

interface SummaryProps {
  data: FleetData;
}

const Summary: React.FC<SummaryProps> = ({ data }) => {
  const totalVehicles = data.vehicles.length;
  const activeDrivers = data.drivers.filter(d => d.status !== 'Congé').length;
  const toursThisMonth = data.tours.length;
  const totalDistance = data.tours.filter(t => t.distance).reduce((sum, t) => sum + (t.distance || 0), 0);
  const totalFuelCost = data.fuel.reduce((sum, f) => sum + (f.liters * f.price_per_liter), 0);
  const avgConsumption = data.tours.length > 0 ? 8.5 : 0; // Exemple
  const maintenanceCost = data.maintenance.reduce((sum, m) => sum + m.cost, 0);

  const expiringDocs = data.documents.filter(doc => {
    const today = new Date();
    const expiry = new Date(doc.expiration);
    const daysLeft = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysLeft < 30;
  }).length;

  const upcomingMaintenance = data.vehicles.filter(vehicle => {
    const nextService = (vehicle.last_service_mileage || 0) + 10000;
    const kmUntilService = nextService - vehicle.mileage;
    return kmUntilService <= 1000;
  }).length;

  const validDocs = data.documents.filter(doc => {
    const today = new Date();
    const expiry = new Date(doc.expiration);
    const daysLeft = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysLeft >= 30;
  }).length;

  const kpis = [
    {
      title: 'Total Véhicules',
      value: totalVehicles,
      icon: Truck,
      color: 'from-blue-500 to-blue-600'
    },
    {
      title: 'Conducteurs Actifs',
      value: activeDrivers,
      icon: Users,
      color: 'from-green-500 to-green-600'
    },
    {
      title: 'Tournées ce mois',
      value: toursThisMonth,
      icon: Route,
      color: 'from-orange-500 to-orange-600'
    },
    {
      title: 'Distance Totale',
      value: `${totalDistance.toLocaleString()} km`,
      icon: MapPin,
      color: 'from-purple-500 to-purple-600'
    }
  ];

  const fuelStats = [
    { label: 'Consommation moyenne:', value: `${avgConsumption} L/100km` },
    { label: 'Coût mensuel:', value: `${totalFuelCost.toFixed(2)} TND` },
    { label: 'Économies possibles:', value: '-12%', color: 'text-green-600' }
  ];

  const maintenanceStats = [
    { label: 'Véhicules en maintenance:', value: data.vehicles.filter(v => v.status === 'Maintenance').length, color: 'text-red-600' },
    { label: 'Vidanges prévues:', value: upcomingMaintenance, color: 'text-orange-600' },
    { label: 'Coût maintenance:', value: `${maintenanceCost.toFixed(2)} TND` }
  ];

  const documentStats = [
    { label: 'Expiration < 30j:', value: expiringDocs, color: 'text-red-600' },
    { label: 'À renouveler:', value: data.documents.length - validDocs - expiringDocs, color: 'text-orange-600' },
    { label: 'À jour:', value: validDocs, color: 'text-green-600' }
  ];

  return (
    <div className="space-y-8">
      <h2 className="text-4xl font-bold text-gray-800">Résumé Général</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div key={kpi.title} className={`bg-gradient-to-br ${kpi.color} text-white rounded-xl shadow-lg p-6`}>
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
            <AlertCircle className="w-6 h-6 text-orange-600 mr-3" />
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
            <Route className="w-6 h-6 text-green-600 mr-3" />
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
            <div className="text-3xl font-bold text-blue-600 mb-2">{(totalDistance / totalVehicles || 0).toFixed(0)}</div>
            <div className="text-sm text-blue-700">Km moyen/véhicule</div>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-3xl font-bold text-green-600 mb-2">{(totalFuelCost / totalVehicles || 0).toFixed(0)}</div>
            <div className="text-sm text-green-700">TND/véhicule (carburant)</div>
          </div>
          <div className="text-center p-4 bg-orange-50 rounded-lg">
            <div className="text-3xl font-bold text-orange-600 mb-2">{(toursThisMonth / totalVehicles || 0).toFixed(1)}</div>
            <div className="text-sm text-orange-700">Tournées/véhicule</div>
          </div>
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <div className="text-3xl font-bold text-purple-600 mb-2">{((totalFuelCost + maintenanceCost) / totalVehicles || 0).toFixed(0)}</div>
            <div className="text-sm text-purple-700">Coût total/véhicule</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Summary;