import React, { useState } from 'react';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { FleetData, Vehicle } from '../types';

interface VehiclesProps {
  data: FleetData;
  onUpdate: (data: FleetData) => void;
}

const Vehicles: React.FC<VehiclesProps> = ({ data, onUpdate }) => {
  const [showModal, setShowModal] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);

  const handleAddVehicle = () => {
    setEditingVehicle(null);
    setShowModal(true);
  };

  const handleEditVehicle = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle);
    setShowModal(true);
  };

  const handleDeleteVehicle = (vehicleId: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce véhicule ?')) {
      const newData = {
        ...data,
        vehicles: data.vehicles.filter(v => v.id !== vehicleId)
      };
      onUpdate(newData);
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const vehicleData: Vehicle = {
      id: editingVehicle?.id || Date.now().toString(),
      plate: formData.get('plate') as string,
      type: formData.get('type') as string,
      status: formData.get('status') as string,
      mileage: parseInt(formData.get('mileage') as string),
      lastServiceDate: formData.get('lastServiceDate') as string,
      lastServiceMileage: parseInt(formData.get('lastServiceMileage') as string)
    };

    const newData = editingVehicle
      ? {
          ...data,
          vehicles: data.vehicles.map(v => v.id === editingVehicle.id ? vehicleData : v)
        }
      : {
          ...data,
          vehicles: [...data.vehicles, vehicleData]
        };

    onUpdate(newData);
    setShowModal(false);
  };

  const getStatusBadge = (status: string) => {
    const classes = {
      'Disponible': 'bg-green-100 text-green-800',
      'En mission': 'bg-orange-100 text-orange-800',
      'Maintenance': 'bg-red-100 text-red-800'
    };
    return `px-3 py-1 text-xs rounded-full font-medium ${classes[status as keyof typeof classes] || 'bg-gray-100 text-gray-800'}`;
  };

  const getServiceStatus = (vehicle: Vehicle) => {
    const nextService = (vehicle.lastServiceMileage || 0) + 10000;
    const kmUntilService = nextService - vehicle.mileage;
    
    if (kmUntilService <= 0) {
      return { text: 'URGENT!', class: 'text-red-600 font-bold' };
    } else if (kmUntilService <= 1000) {
      return { text: `${kmUntilService.toLocaleString()} km restants - Bientôt`, class: 'text-orange-600 font-bold' };
    } else {
      return { text: `${kmUntilService.toLocaleString()} km restants`, class: 'text-green-600' };
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-4xl font-bold text-gray-800">Gestion des Véhicules</h2>
        <button
          onClick={handleAddVehicle}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg flex items-center space-x-2 transition-all duration-300"
        >
          <Plus className="w-5 h-5" />
          <span>Ajouter Véhicule</span>
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Plaque</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Type</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Statut</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Kilométrage</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Dernière Vidange</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Prochaine Vidange</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.vehicles.map((vehicle) => {
              const serviceStatus = getServiceStatus(vehicle);
              const nextService = (vehicle.lastServiceMileage || 0) + 10000;
              
              return (
                <tr key={vehicle.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{vehicle.plate}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{vehicle.type}</td>
                  <td className="px-6 py-4 text-sm">
                    <span className={getStatusBadge(vehicle.status)}>{vehicle.status}</span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 font-semibold">{vehicle.mileage.toLocaleString()} km</td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {vehicle.lastServiceDate} ({(vehicle.lastServiceMileage || 0).toLocaleString()} km)
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <div className={serviceStatus.class}>
                      {nextService.toLocaleString()} km
                      <br />
                      <span className="text-xs">({serviceStatus.text})</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEditVehicle(vehicle)}
                        className="text-blue-600 hover:text-blue-900 transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteVehicle(vehicle.id)}
                        className="text-red-600 hover:text-red-900 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full">
            <div className="p-8">
              <h3 className="text-2xl font-bold text-gray-800 mb-6">
                {editingVehicle ? 'Modifier un Véhicule' : 'Ajouter un Véhicule'}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">Plaque d'immatriculation</label>
                  <input
                    type="text"
                    name="plate"
                    defaultValue={editingVehicle?.plate || ''}
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">Type de véhicule</label>
                  <select
                    name="type"
                    defaultValue={editingVehicle?.type || ''}
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="Camionnette">Camionnette</option>
                    <option value="Camion">Camion</option>
                    <option value="Fourgon">Fourgon</option>
                    <option value="Utilitaire">Utilitaire</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">Statut</label>
                  <select
                    name="status"
                    defaultValue={editingVehicle?.status || ''}
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="Disponible">Disponible</option>
                    <option value="En mission">En mission</option>
                    <option value="Maintenance">Maintenance</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">Kilométrage actuel</label>
                  <input
                    type="number"
                    name="mileage"
                    defaultValue={editingVehicle?.mileage || ''}
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">Date dernière vidange</label>
                  <input
                    type="date"
                    name="lastServiceDate"
                    defaultValue={editingVehicle?.lastServiceDate || ''}
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">Kilométrage dernière vidange</label>
                  <input
                    type="number"
                    name="lastServiceMileage"
                    defaultValue={editingVehicle?.lastServiceMileage || ''}
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-blue-500 focus:border-blue-500"
                    required
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

export default Vehicles;