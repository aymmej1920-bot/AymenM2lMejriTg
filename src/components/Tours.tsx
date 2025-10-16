import React, { useState } from 'react';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { FleetData, Tour } from '../types';

interface ToursProps {
  data: FleetData;
  onUpdate: (data: FleetData) => void;
}

const Tours: React.FC<ToursProps> = ({ data, onUpdate }) => {
  const [showModal, setShowModal] = useState(false);
  const [editingTour, setEditingTour] = useState<Tour | null>(null);

  const handleAddTour = () => {
    setEditingTour(null);
    setShowModal(true);
  };

  const handleEditTour = (tour: Tour) => {
    setEditingTour(tour);
    setShowModal(true);
  };

  const handleDeleteTour = (tourId: number) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette tournée ?')) {
      const newData = {
        ...data,
        tours: data.tours.filter(t => t.id !== tourId)
      };
      onUpdate(newData);
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const tourData: Tour = {
      id: editingTour?.id || Date.now(),
      date: formData.get('date') as string,
      vehicle: formData.get('vehicle') as string,
      driver: formData.get('driver') as string,
      status: formData.get('status') as string,
      fuelStart: formData.get('fuelStart') ? parseInt(formData.get('fuelStart') as string) : null,
      kmStart: formData.get('kmStart') ? parseInt(formData.get('kmStart') as string) : null,
      fuelEnd: formData.get('fuelEnd') ? parseInt(formData.get('fuelEnd') as string) : null,
      kmEnd: formData.get('kmEnd') ? parseInt(formData.get('kmEnd') as string) : null,
      distance: formData.get('distance') ? parseInt(formData.get('distance') as string) : null
    };

    const newData = editingTour
      ? {
          ...data,
          tours: data.tours.map(t => t.id === editingTour.id ? tourData : t)
        }
      : {
          ...data,
          tours: [...data.tours, tourData]
        };

    onUpdate(newData);
    setShowModal(false);
  };

  const getStatusBadge = (status: string) => {
    const classes = {
      'Planifié': 'bg-blue-100 text-blue-800',
      'En cours': 'bg-yellow-100 text-yellow-800',
      'Terminé': 'bg-green-100 text-green-800',
      'Annulé': 'bg-red-100 text-red-800'
    };
    return `px-3 py-1 text-xs rounded-full font-medium ${classes[status as keyof typeof classes] || 'bg-gray-100 text-gray-800'}`;
  };

  const calculateConsumption = (tour: Tour): string => {
    if (tour.distance && tour.distance > 0 && tour.fuelStart !== null && tour.fuelEnd !== null) {
      const fuelConsumed = tour.fuelStart - tour.fuelEnd;
      if (fuelConsumed > 0) {
        return ((fuelConsumed / tour.distance) * 100).toFixed(1);
      }
    }
    return '-';
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-4xl font-bold text-gray-800">Suivi des Tournées</h2>
        <button
          onClick={handleAddTour}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg flex items-center space-x-2 transition-all duration-300"
        >
          <Plus className="w-5 h-5" />
          <span>Nouvelle Tournée</span>
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Date</th>
                <th className="px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Véhicule</th>
                <th className="px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Conducteur</th>
                <th className="px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Statut</th>
                <th className="px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Fuel Début</th>
                <th className="px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Km Début</th>
                <th className="px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Fuel Fin</th>
                <th className="px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Km Fin</th>
                <th className="px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Distance</th>
                <th className="px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">L/100km</th>
                <th className="px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.tours.map((tour) => (
                <tr key={tour.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-4 text-sm text-gray-900">{tour.date}</td>
                  <td className="px-4 py-4 text-sm text-gray-600">{tour.vehicle}</td>
                  <td className="px-4 py-4 text-sm text-gray-600">{tour.driver}</td>
                  <td className="px-4 py-4 text-sm">
                    <span className={getStatusBadge(tour.status)}>{tour.status}</span>
                  </td>
                  <td className="px-4 py-4 text-sm text-center">{tour.fuelStart !== null ? `${tour.fuelStart}%` : '-'}</td>
                  <td className="px-4 py-4 text-sm text-center">{tour.kmStart !== null ? tour.kmStart.toLocaleString() : '-'}</td>
                  <td className="px-4 py-4 text-sm text-center">{tour.fuelEnd !== null ? `${tour.fuelEnd}%` : '-'}</td>
                  <td className="px-4 py-4 text-sm text-center">{tour.kmEnd !== null ? tour.kmEnd.toLocaleString() : '-'}</td>
                  <td className="px-4 py-4 text-sm font-semibold">{tour.distance !== null ? `${tour.distance.toLocaleString()} km` : '-'}</td>
                  <td className="px-4 py-4 text-sm font-semibold">{calculateConsumption(tour)}</td>
                  <td className="px-4 py-4 text-sm">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEditTour(tour)}
                        className="text-blue-600 hover:text-blue-900 transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteTour(tour.id)}
                        className="text-red-600 hover:text-red-900 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-screen overflow-y-auto">
            <div className="p-8">
              <h3 className="text-2xl font-bold text-gray-800 mb-6">
                {editingTour ? 'Modifier une Tournée' : 'Ajouter une Tournée'}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700">Date</label>
                    <input
                      type="date"
                      name="date"
                      defaultValue={editingTour?.date || ''}
                      className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700">Statut</label>
                    <select
                      name="status"
                      defaultValue={editingTour?.status || ''}
                      className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-blue-500 focus:border-blue-500"
                      required
                    >
                      <option value="Planifié">Planifié</option>
                      <option value="En cours">En cours</option>
                      <option value="Terminé">Terminé</option>
                      <option value="Annulé">Annulé</option>
                    </select>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700">Véhicule</label>
                    <select
                      name="vehicle"
                      defaultValue={editingTour?.vehicle || ''}
                      className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-blue-500 focus:border-blue-500"
                      required
                    >
                      <option value="">Sélectionner un véhicule</option>
                      {data.vehicles.map(vehicle => (
                        <option key={vehicle.id} value={vehicle.plate}>
                          {vehicle.plate} - {vehicle.type}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700">Conducteur</label>
                    <select
                      name="driver"
                      defaultValue={editingTour?.driver || ''}
                      className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-blue-500 focus:border-blue-500"
                      required
                    >
                      <option value="">Sélectionner un conducteur</option>
                      {data.drivers.map(driver => (
                        <option key={driver.id} value={driver.name}>
                          {driver.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700">Niveau fuel début (%)</label>
                    <input
                      type="number"
                      name="fuelStart"
                      min="0"
                      max="100"
                      defaultValue={editingTour?.fuelStart || ''}
                      className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700">Km début</label>
                    <input
                      type="number"
                      name="kmStart"
                      defaultValue={editingTour?.kmStart || ''}
                      className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700">Niveau fuel fin (%)</label>
                    <input
                      type="number"
                      name="fuelEnd"
                      min="0"
                      max="100"
                      defaultValue={editingTour?.fuelEnd || ''}
                      className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700">Km fin</label>
                    <input
                      type="number"
                      name="kmEnd"
                      defaultValue={editingTour?.kmEnd || ''}
                      className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">Distance (km)</label>
                  <input
                    type="number"
                    name="distance"
                    defaultValue={editingTour?.distance || ''}
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="flex justify-end space-x-4 mt-8">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-6 py-3 bg-gray-300 hover:bg-gray-400 rounded-lg transition-all duration-300"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all duration-300"
                  >
                    Sauvegarder
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Tours;