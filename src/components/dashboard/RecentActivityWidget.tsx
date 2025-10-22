import React from 'react';
import { Route } from 'lucide-react';
import { formatDate } from '../../utils/date';
import { useFleetData } from '../FleetDataProvider'; // Import useFleetData

interface RecentActivityWidgetProps {
  // data: FleetData; // No longer needed as data is fetched internally
}

const RecentActivityWidget: React.FC<RecentActivityWidgetProps> = () => {
  // Consume data from FleetContext
  const { fleetData, isLoadingFleet } = useFleetData();
  const tours = fleetData.tours;
  const vehicles = fleetData.vehicles;
  const drivers = fleetData.drivers;

  if (isLoadingFleet) {
    return null; // Or a small skeleton loader if preferred
  }

  return (
    <div className="glass rounded-xl shadow-lg p-6 animate-slide-up">
      <h3 className="text-xl font-semibold mb-6 text-gray-800">Activité Récente</h3>
      <div className="space-y-4">
        {tours.slice(-3).map((tour) => {
          const vehicle = vehicles.find(v => v.id === tour.vehicle_id);
          const driver = drivers.find(d => d.id === tour.driver_id);
          return (
            <div key={tour.id} className="flex items-center justify-between p-4 bg-white/20 rounded-lg glass-effect">
              <div className="flex items-center space-x-4">
                <div className="bg-blue-100 p-2 rounded-full">
                  <Route className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-800">Tournée {vehicle?.plate || 'N/A'}</p>
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
};

export default RecentActivityWidget;