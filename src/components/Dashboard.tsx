import React, { useState } from 'react';
import { Truck, CheckCircle, Route, Wrench, TrendingUp, Fuel, AlertTriangle, Settings, ChevronUp, ChevronDown } from 'lucide-react';
import { FleetData, DashboardWidgetConfig } from '../types';
import VehicleStatusChart from './charts/VehicleStatusChart';
import MonthlyFuelConsumptionChart from './charts/MonthlyFuelConsumptionChart';
import { formatDate } from '../utils/date';
import { useDashboardCustomization } from '../hooks/useDashboardCustomization';
import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from './ui/dialog';

interface DashboardProps {
  data: FleetData;
  userRole: 'admin' | 'direction' | 'utilisateur';
}

const Dashboard: React.FC<DashboardProps> = ({ data }) => {
  const { widgets, toggleWidgetVisibility, moveWidget, resetToDefault } = useDashboardCustomization();
  const [showCustomizeDialog, setShowCustomizeDialog] = useState(false);

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

  const maintenanceAlerts = data.vehicles.filter(vehicle => {
    const nextService = (vehicle.last_service_mileage || 0) + 10000;
    const kmUntilService = nextService - vehicle.mileage;
    return kmUntilService <= 1000;
  });

  const expiringDocs = data.documents.filter(doc => {
    const today = new Date();
    const expiry = new Date(doc.expiration);
    const daysLeft = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysLeft <= 30;
  });

  const renderWidget = (widgetKey: string) => {
    switch (widgetKey) {
      case 'alerts':
        return (
          (maintenanceAlerts.length > 0 || expiringDocs.length > 0) && (
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
          )
        );
      case 'kpis':
        return (
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
        );
      case 'stats':
        return (
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
        );
      case 'vehicleStatusChart':
        return (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-semibold mb-6 text-gray-800">État des Véhicules</h3>
            <div className="h-64">
              <VehicleStatusChart vehicles={data.vehicles} />
            </div>
          </div>
        );
      case 'monthlyFuelConsumptionChart':
        return (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-semibold mb-6 text-gray-800">Consommation Mensuelle</h3>
            <div className="h-64">
              <MonthlyFuelConsumptionChart fuelEntries={data.fuel} />
            </div>
          </div>
        );
      case 'recentActivity':
        return (
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
                        <p className="text-sm text-gray-600">{driver?.name || 'N/A'} • {formatDate(tour.date)}</p>
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
        );
      default:
        return null;
    }
  };

  const visibleWidgets = widgets.filter(widget => widget.isVisible);

  const chartWidgets = visibleWidgets.filter(
    widget => widget.componentKey === 'vehicleStatusChart' || widget.componentKey === 'monthlyFuelConsumptionChart'
  );

  const otherWidgets = visibleWidgets.filter(
    widget => !(widget.componentKey === 'vehicleStatusChart' || widget.componentKey === 'monthlyFuelConsumptionChart')
  );

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-4xl font-bold text-gray-800">Tableau de Bord</h2>
        <div className="flex items-center space-x-4">
          <div className="text-sm text-gray-500">
            Dernière mise à jour: {formatDate(new Date().toISOString())}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowCustomizeDialog(true)}
            className="text-gray-600 hover:text-blue-600"
          >
            <Settings className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {otherWidgets.map((widget: DashboardWidgetConfig) => (
        <React.Fragment key={widget.id}>
          {renderWidget(widget.componentKey)}
        </React.Fragment>
      ))}

      {chartWidgets.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {chartWidgets.map((widget: DashboardWidgetConfig) => (
            <React.Fragment key={widget.id}>
              {renderWidget(widget.componentKey)}
            </React.Fragment>
          ))}
        </div>
      )}

      <Dialog open={showCustomizeDialog} onOpenChange={setShowCustomizeDialog}>
        <DialogContent className="sm:max-w-[425px] bg-gray-50">
          <DialogHeader>
            <DialogTitle>Personnaliser le Tableau de Bord</DialogTitle>
            <DialogDescription>
              Choisissez les widgets à afficher et réorganisez-les.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-4">
            {widgets.map((widget: DashboardWidgetConfig, index: number) => (
              <div key={widget.id} className="flex items-center justify-between p-2 border rounded-md bg-gray-100">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id={`widget-${widget.id}`}
                    checked={widget.isVisible}
                    onChange={() => toggleWidgetVisibility(widget.id)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor={`widget-${widget.id}`} className="text-sm font-medium text-gray-700">
                    {widget.title}
                  </label>
                </div>
                <div className="flex space-x-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => moveWidget(widget.id, 'up')}
                    disabled={index === 0}
                  >
                    <ChevronUp className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => moveWidget(widget.id, 'down')}
                    disabled={index === widgets.length - 1}
                  >
                    <ChevronDown className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={resetToDefault}>
              Réinitialiser par défaut
            </Button>
            <Button onClick={() => setShowCustomizeDialog(false)}>
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Dashboard;