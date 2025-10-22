import React from 'react';
import { Truck, CheckCircle, Route, Wrench } from 'lucide-react';
import { useFleetData } from '../FleetDataProvider'; // Import useFleetData

interface KpisWidgetProps {
  // data: FleetData; // No longer needed as data is fetched internally
}

const KpisWidget: React.FC<KpisWidgetProps> = () => {
  // Consume data from FleetContext
  const { fleetData, isLoadingFleet } = useFleetData();
  const vehicles = fleetData.vehicles;

  const totalVehicles = vehicles.length;
  const availableVehicles = vehicles.filter(v => v.status === 'Disponible').length;
  const inMissionVehicles = vehicles.filter(v => v.status === 'En mission').length;
  const maintenanceVehicles = vehicles.filter(v => v.status === 'Maintenance').length;

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

  if (isLoadingFleet) {
    return null; // Or a small skeleton loader if preferred
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-slide-up">
      {kpis.map((kpi) => {
        const Icon = kpi.icon;
        return (
          <div key={kpi.title} className={`bg-gradient-to-br ${kpi.color} text-white rounded-xl shadow-lg p-6 glass hover-lift`}>
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
};

export default KpisWidget;