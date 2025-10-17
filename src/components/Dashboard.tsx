import React from 'react';
import { Truck, CheckCircle, Route, Wrench, TrendingUp, Fuel, AlertTriangle } from 'lucide-react';
import { FleetData } from '../types';

interface DashboardProps {
  data: FleetData;
  userRole: 'admin' | 'direction' | 'utilisateur';
}

const Dashboard: React.FC<DashboardProps> = ({ data, userRole }) => {
  const totalVehicles = data.vehicles.length;
  const availableVehicles = data.vehicles.filter(v => v.status === 'Disponible').length;
  const inMissionVehicles = data.vehicles.filter(v => v.status === 'En mission').length;
  const maintenanceVehicles = data.vehicles.filter(v => v.status === 'Maintenance').length;

  const totalFuelCost = data.fuel.reduce((sum, f) => sum + (f.liters * f.price_per_liter), 0);
  const totalDistance = data.tours.filter(t => t.distance).reduce((sum, t) => sum + (t.distance || 0), 0);

  const kpis = [
    {
      title: 'Véhicules Total',
      value: totalVehicles,
      icon: Truck,
      color: 'from-blue-500 to-blue-600',
      textColor: 'text-blue-100'
    },
    {
      title: 'Disponibles',
      value: availableVehicles,
      icon: CheckCircle,
      color: 'from-green-500 to-green-600',
      textColor: 'text-green-100'
    },
    {
      title: 'En Mission',
      value: inMissionVehicles,
      icon: Route,
      color: 'from-orange-500 to-orange-600',
      textColor: 'text-orange-100'
    },
    {
      title: 'Maintenance',
      value: maintenanceVehicles,
      icon: Wrench,
      color: 'from-red-500 to-red-600',
      textColor: 'text-red-100'
    }
  ];

  const stats = [
    {
      title: 'Distance Totale',
      value: `${totalDistance.toLocaleString()} km`,
      icon: Route,
      color: 'text-blue-600',
      bg: 'bg-blue-100'
    },
    {
      title: 'Coût Carburant',
      value: `${totalFuelCost.toFixed(2)} TND`,
      icon: Fuel,
      color: 'text-green-600',
      bg: 'bg-green-100'
    },
    {
      title: 'Tournées ce mois',
      value: data.tours.length,
      icon: TrendingUp,
      color: 'text-orange-600',
      bg: 'bg-orange-100'
    }
  ];

  // Calculer les alertes de maintenance
  const maintenanceAlerts = data.vehicles.filter(vehicle => {
    const nextService = (vehicle.last_service_mileage || 0) + 10000;
    const kmUntilService = nextService - vehicle.mileage;
    return kmUntilService <= 1000;
  });

  // Calculer les documents qui expirent bientôt
  const expiringDocs = data.documents.filter(doc => {
    const today = new Date();
    const expiry = new Date(doc.expiration);
    const daysLeft = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysLeft <= 30;
  });

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-4xl font-bold text-gray-800">Tableau de Bord</h2>
        <div className="text-sm text-gray-500">
          Dernière mise à jour: {new Date().toLocaleDateString('fr-FR')}
        </div>
      </div>

      {/* Alertes */}
      {(maintenanceAlerts.length > 0 || expiringDocs.length > 0) && (userRole === 'admin' || userRole === 'direction') && (
        <div className="space-y-4">
          {maintenanceAlerts.length > 0 && (
            <div className="bg-orange-50 border-l-4 border-orange-400 p-4 rounded-r-lg">
              <div className="flex items-center">
                <AlertTriangle className="w-5 h-5 text-orange-400 mr-3" />
                <div>
                  <h3 className="text-orange-800 font-semibold">Maintenance Requise</h3>
                  <p className="text-orange-700">
                    {maintenanceAlerts.length} véhicule(s) nécessitent une maintenance prochainement
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {expiringDocs.length > 0 && (
            <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-r-lg">
              <div className="flex items-center">
                <AlertTriangle className="w-5 h-5 text-red-400 mr-3" />
                <div>
                  <h3 className="text-red-800 font-semibold">Documents à Renouveler</h3>
                  <p className="text-red-700">
                    {expiringDocs.length} document(s) expirent dans moins de 30 jours
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div key={kpi.title} className={`bg-gradient-to-br ${kpi.color} text-white rounded-xl shadow-lg p-6`}>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className={`${kpi.textColor} text-sm font-medium`}>{kpi.title}</h3>
                  <p className="text-3xl font-bold mt-2">{kpi.value}</p>
                </div>
                <div className="bg-white bg-opacity-20 p-3 rounded-full">
                  <Icon className="w-6 h-6" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.title} className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center">
                <div className={`p-3 ${stat.bg} rounded-full`}>
                  <Icon className={`w-6 h-6 ${stat.color}`} />
                </div>
                <div className="ml-4">
                  <h3 className="text-gray-500 text-sm font-medium">{stat.title}</h3>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Placeholder */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-xl font-semibold mb-6 text-gray-800">État des Véhicules</h3>
          <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
            <p className="text-gray-500">Graphique des statuts des véhicules</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-xl font-semibold mb-6 text-gray-800">Consommation Mensuelle</h3>
          <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
            <p className="text-gray-500">Graphique de consommation carburant</p>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-xl font-semibold mb-6 text-gray-800">Activité Récente</h3>
        <div className="space-y-4">
          {data.tours.slice(-3).map((tour) => {
            const vehicle = data.vehicles.find(v => v.id === tour.vehicle_id);
            const driver = data.drivers.find(d => d.id === tour.driver_id);
            return (
              <div key={tour.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="bg-blue-100 p-2 rounded-full">
                    <Route className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium">Tournée {vehicle?.plate || 'N/A'}</p>
                    <p className="text-sm text-gray-600">{driver?.name || 'N/A'} • {tour.date}</p>
                  </div>
                </div>
                <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                  tour.status === 'Terminé' ? 'bg-green-100 text-green-800' :
                  tour.status === 'En cours' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-blue-100 text-blue-800'
                }`}>
                  {tour.status}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;