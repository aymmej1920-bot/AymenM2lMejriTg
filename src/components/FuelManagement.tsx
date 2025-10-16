import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Fuel, DollarSign, TrendingUp } from 'lucide-react';
import { FleetData, FuelEntry } from '../types';

interface FuelManagementProps {
  data: FleetData;
  onUpdate: (data: FleetData) => void;
}

const FuelManagement: React.FC<FuelManagementProps> = ({ data, onUpdate }) => {
  const [showModal, setShowModal] = useState(false);
  const [editingFuel, setEditingFuel] = useState<FuelEntry | null>(null);

  const totalLiters = data.fuel.reduce((sum, f) => sum + f.liters, 0);
  const totalCost = data.fuel.reduce((sum, f) => sum + (f.liters * f.pricePerLiter), 0);
  const avgPrice = totalLiters > 0 ? totalCost / totalLiters : 0;

  const handleAddFuel = () => {
    setEditingFuel(null);
    setShowModal(true);
  };

  const handleEditFuel = (fuel: FuelEntry) => {
    setEditingFuel(fuel);
    setShowModal(true);
  };

  const handleDeleteFuel = (fuelId: number) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer cet enregistrement ?')) {
      const newData = {
        ...data,
        fuel: data.fuel.filter(f => f.id !== fuelId)
      };
      onUpdate(newData);
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const fuelData: FuelEntry = {
      id: editingFuel?.id || Date.now(),
      date: formData.get('date') as string,
      vehicle: formData.get('vehicle') as string,
      liters: parseFloat(formData.get('liters') as string),
      pricePerLiter: parseFloat(formData.get('pricePerLiter') as string),
      mileage: parseInt(formData.get('mileage') as string)
    };

    const newData = editingFuel
      ? {
          ...data,
          fuel: data.fuel.map(f => f.id === editingFuel.id ? fuelData : f)
        }
      : {
          ...data,
          fuel: [...data.fuel, fuelData]
        };

    onUpdate(newData);
    setShowModal(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-4xl font-bold text-gray-800">Gestion du Carburant</h2>
        <button
          onClick={handleAddFuel}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg flex items-center space-x-2 transition-all duration-300"
        >
          <Plus className="w-5 h-5" />
          <span>Ajouter Plein</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-full">
              <Fuel className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <h3 className="text-gray-500 text-sm font-medium">Total Litres</h3>
              <p className="text-3xl font-bold text-gray-900">{totalLiters.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 rounded-full">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <h3 className="text-gray-500 text-sm font-medium">Coût Total</h3>
              <p className="text-3xl font-bold text-green-600">{totalCost.toFixed(2)} TND</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center">
            <div className="p-3 bg-orange-100 rounded-full">
              <TrendingUp className="w-6 h-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <h3 className="text-gray-500 text-sm font-medium">Prix Moyen/L</h3>
              <p className="text-3xl font-bold text-orange-600">{avgPrice.toFixed(2)} TND</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Date</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Véhicule</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Litres</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Prix/L</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Coût Total</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Kilométrage</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.fuel.map((fuel) => (
              <tr key={fuel.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 text-sm text-gray-900">{fuel.date}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{fuel.vehicle}</td>
                <td className="px-6 py-4 text-sm font-semibold">{fuel.liters} L</td>
                <td className="px-6 py-4 text-sm">{fuel.pricePerLiter.toFixed(2)} TND</td>
                <td className="px-6 py-4 text-sm font-bold text-green-600">{(fuel.liters * fuel.pricePerLiter).toFixed(2)} TND</td>
                <td className="px-6 py-4 text-sm text-gray-600">{fuel.mileage.toLocaleString()} km</td>
                <td className="px-6 py-4 text-sm">
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEditFuel(fuel)}
                      className="text-blue-600 hover:text-blue-900 transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteFuel(fuel.id)}
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

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full">
            <div className="p-8">
              <h3 className="text-2xl font-bold text-gray-800 mb-6">
                {editingFuel ? 'Modifier un Plein' : 'Ajouter un Plein'}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">Date</label>
                  <input
                    type="date"
                    name="date"
                    defaultValue={editingFuel?.date || ''}
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">Véhicule</label>
                  <select
                    name="vehicle"
                    defaultValue={editingFuel?.vehicle || ''}
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
                  <label className="block text-sm font-medium mb-2 text-gray-700">Litres</label>
                  <input
                    type="number"
                    step="0.1"
                    name="liters"
                    defaultValue={editingFuel?.liters || ''}
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">Prix par litre (TND)</label>
                  <input
                    type="number"
                    step="0.01"
                    name="pricePerLiter"
                    defaultValue={editingFuel?.pricePerLiter || ''}
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">Kilométrage</label>
                  <input
                    type="number"
                    name="mileage"
                    defaultValue={editingFuel?.mileage || ''}
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

export default FuelManagement;