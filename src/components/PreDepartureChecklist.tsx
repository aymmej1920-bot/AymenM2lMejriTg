import React, { useState } from 'react';
import { Plus, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { FleetData, PreDepartureChecklist } from '../types';
import { showSuccess, showError } from '../utils/toast';

interface PreDepartureChecklistProps {
  data: FleetData;
  userRole: 'admin' | 'direction' | 'utilisateur';
  onAdd: (checklist: Omit<PreDepartureChecklist, 'id' | 'user_id' | 'created_at'>) => void;
}

const PreDepartureChecklistComponent: React.FC<PreDepartureChecklistProps> = ({ data, userRole, onAdd }) => {
  const [showModal, setShowModal] = useState(false);
  const [formState, setFormState] = useState<Omit<PreDepartureChecklist, 'id' | 'user_id' | 'created_at'>>({
    vehicle_id: '',
    driver_id: null,
    date: new Date().toISOString().split('T')[0],
    tire_pressure_ok: false,
    lights_ok: false,
    oil_level_ok: false,
    fluid_levels_ok: false,
    brakes_ok: false,
    wipers_ok: false,
    horn_ok: false,
    mirrors_ok: false,
    ac_working_ok: false,
    windows_working_ok: false,
    observations: '',
    issues_to_address: '',
  });

  const canAdd = userRole === 'admin' || userRole === 'utilisateur';

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type, checked } = e.target as HTMLInputElement;
    setFormState(prevState => ({
      ...prevState,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const hasChecklistForMonth = (vehicleId: string, month: number, year: number): boolean => {
    return data.pre_departure_checklists.some(cl => {
      const clDate = new Date(cl.date);
      return cl.vehicle_id === vehicleId &&
             clDate.getMonth() === month &&
             clDate.getFullYear() === year;
    });
  };

  const handleAddChecklist = () => {
    setFormState({
      vehicle_id: '',
      driver_id: null,
      date: new Date().toISOString().split('T')[0],
      tire_pressure_ok: false,
      lights_ok: false,
      oil_level_ok: false,
      fluid_levels_ok: false,
      brakes_ok: false,
      wipers_ok: false,
      horn_ok: false,
      mirrors_ok: false,
      ac_working_ok: false,
      windows_working_ok: false,
      observations: '',
      issues_to_address: '',
    });
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!canAdd) return;

    const { vehicle_id, date } = formState;

    const checklistDate = new Date(date);
    const submissionMonth = checklistDate.getMonth();
    const submissionYear = checklistDate.getFullYear();

    if (hasChecklistForMonth(vehicle_id, submissionMonth, submissionYear)) {
      showError('Une checklist pour ce véhicule a déjà été soumise ce mois-ci.');
      return; // Prevent submission if a checklist already exists for the month
    }

    onAdd(formState);
    showSuccess('Checklist ajoutée avec succès !');
    setShowModal(false);
  };

  const getStatusIcon = (status: boolean) => {
    return status ? <CheckCircle className="w-5 h-5 text-green-500" /> : <XCircle className="w-5 h-5 text-red-500" />;
  };

  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();

  const vehiclesMissingChecklist = data.vehicles.filter(vehicle =>
    !hasChecklistForMonth(vehicle.id, currentMonth, currentYear)
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-4xl font-bold text-gray-800">Checklists Avant Départ</h2>
        {canAdd && (
          <button
            key="add-checklist-button"
            onClick={handleAddChecklist}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg flex items-center space-x-2 transition-all duration-300"
          >
            <Plus className="w-5 h-5" />
            <span>Nouvelle Checklist</span>
          </button>
        )}
      </div>

      {/* Alerte pour les checklists mensuelles manquantes */}
      {vehiclesMissingChecklist.length > 0 && (userRole === 'admin' || userRole === 'direction') && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r-lg">
          <div className="flex items-center">
            <AlertTriangle className="w-5 h-5 text-yellow-400 mr-3" />
            <div>
              <h3 className="text-yellow-800 font-semibold">Checklists Mensuelles Manquantes</h3>
              <p className="text-yellow-700">
                {vehiclesMissingChecklist.length} véhicule(s) n'ont pas de checklist pour ce mois-ci :{' '}
                <span className="font-medium">{vehiclesMissingChecklist.map(v => v.plate).join(', ')}</span>.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Date</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Véhicule</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Conducteur</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Pneus</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Feux</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Huile</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Fluides</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Freins</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Essuie-glaces</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Klaxon</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Rétroviseurs</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Climatiseur</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Vitres</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Observations</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">À Traiter</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.pre_departure_checklists.map((checklist) => {
                const vehicle = data.vehicles.find(v => v.id === checklist.vehicle_id);
                const driver = data.drivers.find(d => d.id === checklist.driver_id);
                return (
                  <tr key={checklist.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm text-gray-900">{checklist.date}</td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{vehicle?.plate || 'N/A'}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{driver?.name || 'N/A'}</td>
                    <td className="px-6 py-4 text-sm flex justify-center">{getStatusIcon(checklist.tire_pressure_ok)}</td>
                    <td className="px-6 py-4 text-sm flex justify-center">{getStatusIcon(checklist.lights_ok)}</td>
                    <td className="px-6 py-4 text-sm flex justify-center">{getStatusIcon(checklist.oil_level_ok)}</td>
                    <td className="px-6 py-4 text-sm flex justify-center">{getStatusIcon(checklist.fluid_levels_ok)}</td>
                    <td className="px-6 py-4 text-sm flex justify-center">{getStatusIcon(checklist.brakes_ok)}</td>
                    <td className="px-6 py-4 text-sm flex justify-center">{getStatusIcon(checklist.wipers_ok)}</td>
                    <td className="px-6 py-4 text-sm flex justify-center">{getStatusIcon(checklist.horn_ok)}</td>
                    <td className="px-6 py-4 text-sm flex justify-center">{getStatusIcon(checklist.mirrors_ok)}</td>
                    <td className="px-6 py-4 text-sm flex justify-center">{getStatusIcon(checklist.ac_working_ok)}</td>
                    <td className="px-6 py-4 text-sm flex justify-center">{getStatusIcon(checklist.windows_working_ok)}</td>
                    <td className="px-6 py-4 text-sm text-gray-600 max-w-xs overflow-hidden text-ellipsis">{checklist.observations || '-'}</td>
                    <td className="px-6 py-4 text-sm text-red-600 max-w-xs overflow-hidden text-ellipsis">{checklist.issues_to_address || '-'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-screen overflow-y-auto">
            <div className="p-8">
              <h3 className="text-2xl font-bold text-gray-800 mb-6">Nouvelle Checklist Avant Départ</h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700">Date</label>
                    <input
                      type="date"
                      name="date"
                      value={formState.date}
                      onChange={handleInputChange}
                      className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-blue-500 focus:border-blue-500"
                      required
                      readOnly={!canAdd}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700">Véhicule</label>
                    <select
                      name="vehicle_id"
                      value={formState.vehicle_id}
                      onChange={handleInputChange}
                      className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-blue-500 focus:border-blue-500"
                      required
                      disabled={!canAdd}
                    >
                      <option value="">Sélectionner un véhicule</option>
                      {data.vehicles.map(vehicle => (
                        <option key={vehicle.id} value={vehicle.id}>
                          {vehicle.plate} - {vehicle.type}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">Conducteur (Optionnel)</label>
                  <select
                    name="driver_id"
                    value={formState.driver_id || ''}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-blue-500 focus:border-blue-500"
                    disabled={!canAdd}
                  >
                    <option value="">Sélectionner un conducteur</option>
                    {data.drivers.map(driver => (
                      <option key={driver.id} value={driver.id}>
                        {driver.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      name="tire_pressure_ok"
                      checked={formState.tire_pressure_ok}
                      onChange={handleInputChange}
                      className="h-5 w-5 text-blue-600 rounded focus:ring-blue-500"
                      disabled={!canAdd}
                    />
                    <label className="text-sm font-medium text-gray-700">Pression des pneus OK</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      name="lights_ok"
                      checked={formState.lights_ok}
                      onChange={handleInputChange}
                      className="h-5 w-5 text-blue-600 rounded focus:ring-blue-500"
                      disabled={!canAdd}
                    />
                    <label className="text-sm font-medium text-gray-700">Feux OK</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      name="oil_level_ok"
                      checked={formState.oil_level_ok}
                      onChange={handleInputChange}
                      className="h-5 w-5 text-blue-600 rounded focus:ring-blue-500"
                      disabled={!canAdd}
                    />
                    <label className="text-sm font-medium text-gray-700">Niveau d'huile OK</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      name="fluid_levels_ok"
                      checked={formState.fluid_levels_ok}
                      onChange={handleInputChange}
                      className="h-5 w-5 text-blue-600 rounded focus:ring-blue-500"
                      disabled={!canAdd}
                    />
                    <label className="text-sm font-medium text-gray-700">Niveaux de fluides OK</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      name="brakes_ok"
                      checked={formState.brakes_ok}
                      onChange={handleInputChange}
                      className="h-5 w-5 text-blue-600 rounded focus:ring-blue-500"
                      disabled={!canAdd}
                    />
                    <label className="text-sm font-medium text-gray-700">Freins OK</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      name="wipers_ok"
                      checked={formState.wipers_ok}
                      onChange={handleInputChange}
                      className="h-5 w-5 text-blue-600 rounded focus:ring-blue-500"
                      disabled={!canAdd}
                    />
                    <label className="text-sm font-medium text-gray-700">Essuie-glaces OK</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      name="horn_ok"
                      checked={formState.horn_ok}
                      onChange={handleInputChange}
                      className="h-5 w-5 text-blue-600 rounded focus:ring-blue-500"
                      disabled={!canAdd}
                    />
                    <label className="text-sm font-medium text-gray-700">Klaxon OK</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      name="mirrors_ok"
                      checked={formState.mirrors_ok}
                      onChange={handleInputChange}
                      className="h-5 w-5 text-blue-600 rounded focus:ring-blue-500"
                      disabled={!canAdd}
                    />
                    <label className="text-sm font-medium text-gray-700">Rétroviseurs OK</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      name="ac_working_ok"
                      checked={formState.ac_working_ok}
                      onChange={handleInputChange}
                      className="h-5 w-5 text-blue-600 rounded focus:ring-blue-500"
                      disabled={!canAdd}
                    />
                    <label className="text-sm font-medium text-gray-700">Climatiseur OK</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      name="windows_working_ok"
                      checked={formState.windows_working_ok}
                      onChange={handleInputChange}
                      className="h-5 w-5 text-blue-600 rounded focus:ring-blue-500"
                      disabled={!canAdd}
                    />
                    <label className="text-sm font-medium text-gray-700">Vitres OK</label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">Observations</label>
                  <textarea
                    name="observations"
                    value={formState.observations || ''}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-blue-500 focus:border-blue-500"
                    readOnly={!canAdd}
                  ></textarea>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">Points à traiter</label>
                  <textarea
                    name="issues_to_address"
                    value={formState.issues_to_address || ''}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-blue-500 focus:border-blue-500"
                    readOnly={!canAdd}
                  ></textarea>
                </div>

                <div className="flex justify-end space-x-4 mt-8">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-6 py-3 bg-gray-300 hover:bg-gray-400 rounded-lg transition-all duration-300"
                  >
                    Annuler
                  </button>
                  {canAdd && (
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

export default PreDepartureChecklistComponent;