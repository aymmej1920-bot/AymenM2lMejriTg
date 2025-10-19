import React from 'react';
import { Route, Fuel, TrendingUp } from 'lucide-react';
import { FleetData } from '../../types';

interface StatsWidgetProps {
  data: FleetData;
}

const StatsWidget: React.FC<StatsWidgetProps> = ({ data }) => {
  const totalFuelCost = data.fuel.reduce((sum, f) => sum + (f.liters * f.price_per_liter), 0);
  const totalDistance = data.tours.filter(t => t.distance).reduce((sum, t) => sum + (t.distance || 0), 0);

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
};

export default StatsWidget;