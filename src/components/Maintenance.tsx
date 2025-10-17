import React, { useState } from 'react';
import { Plus, Wrench, AlertTriangle, Clock, ClipboardCheck } from 'lucide-react';
import { FleetData, MaintenanceEntry, PreDepartureChecklist } from '../types';
import { showSuccess } from '../utils/toast'; // Import toast utilities

interface MaintenanceProps {
  data: FleetData;
  userRole: 'admin' | 'direction' | 'utilisateur';
  onAdd: (maintenanceEntry: Omit<MaintenanceEntry, 'id' | 'user_id' | 'created_at'>) => void;
  onUpdate: (vehicle: { id: string; last_service_date: string; last_service_mileage: number; mileage: number }) => void;
  preDepartureChecklists: PreDepartureChecklist[]; // New prop for checklists
}

const Maintenance: React.FC<MaintenanceProps> = ({ data, userRole, onAdd, onUpdate, preDepartureChecklists }) => {
  const [showModal, setShowModal] = useState(false);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');

  const canManage = userRole === 'admin';
  const isReadOnly = userRole === 'direction' || userRole === 'utilisateur';

  const handleAddMaintenance = (vehicleId?: string) => {
    setSelectedVehicleId(vehicleId || '');
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!canManage) return; // Prevent submission if not admin

    const formData = new FormData(e.currentTarget);
    
    const maintenanceData: Omit<MaintenanceEntry, 'id' | 'user_id' | 'created_at'> = {
      vehicle_id: formData.get('vehicle_id') as string,
      type: formData.get('type') as string,
      date: formData.get('date') as string,
      mileage: parseInt(formData.get('mileage') as string),
      cost: parseFloat(formData.get('cost') as string)
    };

    onAdd(maintenanceData);
    showSuccess('Entrée de maintenance ajoutée avec succès !');

    // If it's an oil change, update vehicle info
    if (maintenanceData.type === 'Vidange') {
      onUpdate({
        id: maintenanceData.vehicle_id,
        last_service_date: maintenanceData.date,
        last_service_mileage: maintenanceData.mileage,
        mileage: maintenanceData.mileage, // Also update current mileage
      });
      showSuccess('Informations du véhicule mises à jour après la vidange !');
    }

    setShowModal(false);
  };

  const getMaintenanceStatus = (vehicle: any) => {
    const nextServiceKm = (vehicle.last_service_mileage || 0) + 10000;
    const kmUntilService = nextServiceKm - vehicle.mileage;
    
    if (kmUntilService <= 0) {
      return { text: 'URGENT', class: 'bg-red-100 text-red-800', icon: AlertTriangle };
    } else if (kmUntilService <= 1000) {
      return { text: 'Bientôt', class: 'bg-orange-100 text-orange-800', icon: Clock };
    } else {
      return { text: 'OK', class: 'bg-green-100 text-green-800', icon: Wrench };
    }
  };

  const upcomingMaintenanceCount = data.vehicles.filter(vehicle => {
    const nextService = (vehicle.last_service_mileage || 0) + 10000;
    const kmUntilService = nextService - vehicle.mileage;
    return kmUntilService <= 1000 && kmUntilService > 0;
  }).length;

  const urgentMaintenanceCount = data.vehicles.filter(vehicle => {
    const nextService = (vehicle.last_service_mileage || 0) + 10000;
    const kmUntilService = nextService - vehicle.mileage;
    return kmUntilService <= 0;
  }).length;

  // Filter checklists with issues to address
  const checklistsWithIssues = preDepartureChecklists.filter(cl => cl.issues_to_address && cl.issues_to_address.trim() !== '');

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-4xl font-bold text-gray-800">Suivi Maintenance & Vidanges</h2>
        {canManage && (
          <button
            key="add-maintenance-button"
            onClick={() => handleAddMaintenance()}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg flex items-center space-x-2 transition-all duration-300"
          >
            <Plus className="w-5 h-5" />
            <span>Ajouter Maintenance</span>
          </button>
        )}
      </div>

      {/* Alertes maintenance */}
      {(userRole === 'admin' || userRole === 'direction') && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-orange-50 border-l-4 border-orange-400 p-6 rounded-r-lg shadow-lg">
            <div className="flex items-center">
              <Clock className="w-6 h-6 text-orange-400 mr-4" />
              <div>
                <h3 className="text-lg font-semibold text-orange-700">Vidanges à Prévoir</h3>
                <p className="text-orange-600">
                  {upcomingMaintenanceCount} véhicule(s) approchent des 10,000 km
                </p>
              </div>
            </div>
          </div>

          <div className="bg-red-50 border-l-4 border-red-400 p-6 rounded-r-lg shadow-lg">
            <div className="flex items-center">
              <AlertTriangle className="w-6 h-6 text-red-400 mr-4" />
              <div>
                <h3 className="text-lg font-semibold text-red-700">Maintenance Urgente</h3>
                <p className="text-red-600">
                  {urgentMaintenanceCount} véhicule(s) dépassent les limites
                </p>
              </div>
            </div>
          </div>

          {/* New Alert for Checklist Issues */}
          {checklistsWithIssues.length > 0 && (
            <div className="bg-purple-50 border-l-4 border-purple-400 p-6 rounded-r-lg shadow-lg">
              <div className="flex items-center">
                <ClipboardCheck className="w-6 h-6 text-purple-400 mr-4" />
                <div>
                  <h3 className="text-lg font-semibold text-purple-700">Points à Traiter (Checklists)</h3>
                  <p className="text-purple-600">
                    {checklistsWithIssues.length} checklist(s) contiennent des problèmes à résoudre.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Detailed list of checklist issues */}
      {checklistsWithIssues.length > 0 && (userRole === 'admin' || userRole === 'direction') && (
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800">Détail des Points à Traiter</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date Checklist</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Véhicule</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Conducteur</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Points à Traiter</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {checklistsWithIssues.map((checklist) => {
                  const vehicle = data.vehicles.find(v => v.id === checklist.vehicle_id);
                  const driver = data.drivers.find(d => d.id === checklist.driver_id);
                  return (
                    <tr key={checklist.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{checklist.date}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {vehicle?.plate || 'Véhicule inconnu'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {driver?.name || 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-sm text-red-600">
                        {checklist.issues_to_address}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Véhicule</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Km Actuel</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Dernière Vidange</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Km Dernière Vidange</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Prochaine Vidange</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Statut</th>
              {!isReadOnly && <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.vehicles.map((vehicle) => {
              const nextServiceKm = (vehicle.last_service_mileage || 0) + 10000;
              const status = getMaintenanceStatus(vehicle);
              const StatusIcon = status.icon;
              
              return (
                <tr key={vehicle.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{vehicle.plate}</td>
                  <td className="px-6 py-4 text-sm font-semibold">{vehicle.mileage.toLocaleString()} km</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{vehicle.last_service_date || 'N/A'}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{(vehicle.last_service_mileage || 0).toLocaleString()} km</td>
                  <td className="px-6 py-4 text-sm font-semibold">{nextServiceKm.toLocaleString()} km</td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`px-3 py-1 text-xs rounded-full font-medium ${status.class} flex items-center space-x-1`}>
                      <StatusIcon className="w-3 h-3" />
                      <span>{status.text}</span>
                    </span>
                  </td>
                  {!isReadOnly && (
                    <td className="px-6 py-4 text-sm">
                      <button
                        key={vehicle.id + "-maintenance"}
                        onClick={() => handleAddMaintenance(vehicle.id)}
                        className="text-blue-600 hover:text-blue-900 transition-colors flex items-center space-x-1"
                        disabled={!canManage}
                      >
                        <Wrench className="w-4 h-4" />
                        <span>Maintenance</span>
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Historique des maintenances */}
      {data.maintenance.length > 0 && (userRole === 'admin' || userRole === 'direction') && (
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800">Historique des Maintenances</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Véhicule</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kilométrage</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Coût</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.maintenance.map((maintenance) => {
                  const vehicle = data.vehicles.find(v => v.id === maintenance.vehicle_id);
                  return (
                    <tr key={maintenance.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{maintenance.date}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {vehicle?.plate || 'Véhicule inconnu'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{maintenance.type}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {maintenance.mileage.toLocaleString()} km
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600">
                        {maintenance.cost.toFixed(2)} TND
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full">
            <div className="p-8">
              <h3 className="text-2xl font-bold text-gray-800 mb-6">Enregistrer une Maintenance</h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">Véhicule</label>
                  <select
                    name="vehicle_id"
                    defaultValue={selectedVehicleId}
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-blue-500 focus:border-blue-500"
                    required
                    disabled={!canManage}
                  >
                    <option value="">Sélectionner un véhicule</option>
                    {data.vehicles.map(vehicle => (
                      <option key={vehicle.id} value={vehicle.id}>
                        {vehicle.plate} - {vehicle.type}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">Type de maintenance</label>
                  <select
                    name="type"
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-blue-500 focus:border-blue-500"
                    required
                    disabled={!canManage}
                  >
                    <option value="Vidange">Vidange</option>
                    <option value="Révision">Révision</option>
                    <option value="Réparation">Réparation</option>
                    <option value="Pneus">Changement pneus</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">Date</label>
                  <input
                    type="date"
                    name="date"
                    defaultValue={new Date().toISOString().split('T')[0]}
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-blue-500 focus:border-blue-500"
                    required
                    readOnly={!canManage}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">Kilométrage</label>
                  <input
                    type="number"
                    name="mileage"
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-blue-500 focus:border-blue-500"
                    required
                    readOnly={!canManage}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">Coût (TND)</label>
                  <input
                    type="number"
                    step="0.01"
                    name="cost"
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-blue-500 focus:border-blue-500"
                    required
                    readOnly={!canManage}
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
                  {canManage && (
                    <button
                      type="submit"
                      className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all duration-300"
                    >
                      Sauvegarder
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Maintenance;