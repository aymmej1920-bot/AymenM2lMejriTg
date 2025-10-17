import React, { useState, useMemo } from 'react';
import { Plus, CheckCircle, XCircle, AlertTriangle, ChevronUp, ChevronDown, Search } from 'lucide-react';
import { FleetData, PreDepartureChecklist } from '../types';
import { showSuccess, showError } from '../utils/toast';
import { formatDate } from '../utils/date'; // Import the new utility

interface PreDepartureChecklistProps {
  data: FleetData;
  userRole: 'admin' | 'direction' | 'utilisateur'; // Still passed, but not used for logic here
  onAdd: (checklist: Omit<PreDepartureChecklist, 'id' | 'user_id' | 'created_at'>) => void;
}

const PreDepartureChecklistComponent: React.FC<PreDepartureChecklistProps> = ({ data, onAdd }) => {
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

  // State for filtering, sorting, and pagination
  const [searchTerm, setSearchTerm] = useState('');
  const [sortColumn, setSortColumn] = useState<keyof PreDepartureChecklist>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10; // You can adjust this value

  const canAdd = true; // All authenticated users can add

  // Filtered and sorted data
  const filteredAndSortedChecklists = useMemo(() => {
    let filtered = data.pre_departure_checklists.filter(checklist => {
      const vehicle = data.vehicles.find(v => v.id === checklist.vehicle_id);
      const driver = data.drivers.find(d => d.id === checklist.driver_id);
      
      return (
        checklist.date.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (vehicle?.plate || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (driver?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (checklist.observations || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (checklist.issues_to_address || '').toLowerCase().includes(searchTerm.toLowerCase())
      );
    });

    filtered.sort((a, b) => {
      const aValue = a[sortColumn];
      const bValue = b[sortColumn];

      // Handle null/undefined values first
      if (aValue === null || aValue === undefined) {
        return sortDirection === 'asc' ? -1 : 1;
      }
      if (bValue === null || bValue === undefined) {
        return sortDirection === 'asc' ? 1 : -1;
      }

      // Special handling for vehicle_id to sort by plate
      if (sortColumn === 'vehicle_id') {
        const aVehicle = data.vehicles.find(v => v.id === a.vehicle_id);
        const bVehicle = data.vehicles.find(v => v.id === b.vehicle_id);
        const aPlate = aVehicle?.plate || '';
        const bPlate = bVehicle?.plate || '';
        return sortDirection === 'asc' ? aPlate.localeCompare(bPlate) : bPlate.localeCompare(aPlate);
      }

      // Special handling for driver_id to sort by name
      if (sortColumn === 'driver_id') {
        const aDriver = data.drivers.find(d => d.id === a.driver_id);
        const bDriver = data.drivers.find(d => d.id === b.driver_id);
        const aName = aDriver?.name || '';
        const bName = bDriver?.name || '';
        return sortDirection === 'asc' ? aName.localeCompare(bName) : bName.localeCompare(aName);
      }

      // For date strings (like 'date'), compare them directly as strings
      if (sortColumn === 'date' && typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
      }
      
      // General string comparison (fallback for other string columns)
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
      }
      
      // Fallback for other types
      return 0;
    });
    return filtered;
  }, [data.pre_departure_checklists, data.vehicles, data.drivers, searchTerm, sortColumn, sortDirection]);

  // Paginated data
  const totalPages = Math.ceil(filteredAndSortedChecklists.length / itemsPerPage);
  const currentChecklists = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredAndSortedChecklists.slice(startIndex, endIndex);
  }, [filteredAndSortedChecklists, currentPage, itemsPerPage]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const target = e.target;
    const name = target.name;
    let value: string | boolean;

    if (target.type === 'checkbox') {
      value = (target as HTMLInputElement).checked;
    } else if (target.type === 'radio') {
      value = target.value === 'true'; // Convert string 'true'/'false' to boolean
    } else {
      value = target.value;
    }

    setFormState(prevState => ({
      ...prevState,
      [name]: value,
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
      return;
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

  const handleSort = (column: keyof PreDepartureChecklist) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const renderSortIcon = (column: keyof PreDepartureChecklist) => {
    if (sortColumn === column) {
      return sortDirection === 'asc' ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />;
    }
    return null;
  };

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
      {vehiclesMissingChecklist.length > 0 && (
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

      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Rechercher une checklist par date, véhicule, conducteur, observations ou problèmes..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setCurrentPage(1); // Reset to first page on new search
          }}
          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
        />
      </div>

      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('date')}>
                  <div className="flex items-center">
                    Date {renderSortIcon('date')}
                  </div>
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('vehicle_id')}>
                  <div className="flex items-center">
                    Véhicule {renderSortIcon('vehicle_id')}
                  </div>
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('driver_id')}>
                  <div className="flex items-center">
                    Conducteur {renderSortIcon('driver_id')}
                  </div>
                </th>
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
              {currentChecklists.length === 0 ? (
                <tr>
                  <td colSpan={15} className="px-6 py-4 text-center text-gray-500">
                    Aucune checklist trouvée.
                  </td>
                </tr>
              ) : (
                currentChecklists.map((checklist) => {
                  const vehicle = data.vehicles.find(v => v.id === checklist.vehicle_id);
                  const driver = data.drivers.find(d => d.id === checklist.driver_id);
                  return (
                    <tr key={checklist.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 text-sm text-gray-900">{formatDate(checklist.date)}</td>
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
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center space-x-2 mt-4">
          <button
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Précédent
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
            <button
              key={page}
              onClick={() => setCurrentPage(page)}
              className={`px-4 py-2 rounded-lg ${
                currentPage === page ? 'bg-blue-600 text-white' : 'bg-gray-200 hover:bg-gray-300'
              }`}
            >
              {page}
            </button>
          ))}
          <button
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
            className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Suivant
          </button>
        </div>
      )}

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
                      disabled={!canAdd}
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
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700">Pression des pneus</label>
                    <div className="flex space-x-4">
                      <div className="flex items-center space-x-1">
                        <input
                          type="radio"
                          id="tire_pressure_ok_ok"
                          name="tire_pressure_ok"
                          value="true"
                          checked={formState.tire_pressure_ok === true}
                          onChange={handleInputChange}
                          className="h-4 w-4 text-green-600 border-gray-300 focus:ring-green-500"
                          disabled={!canAdd}
                        />
                        <label htmlFor="tire_pressure_ok_ok" className="text-sm text-gray-700">OK</label>
                      </div>
                      <div className="flex items-center space-x-1">
                        <input
                          type="radio"
                          id="tire_pressure_ok_nok"
                          name="tire_pressure_ok"
                          value="false"
                          checked={formState.tire_pressure_ok === false}
                          onChange={handleInputChange}
                          className="h-4 w-4 text-red-600 border-gray-300 focus:ring-red-500"
                          disabled={!canAdd}
                        />
                        <label htmlFor="tire_pressure_ok_nok" className="text-sm text-gray-700">NOK</label>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700">Feux</label>
                    <div className="flex space-x-4">
                      <div className="flex items-center space-x-1">
                        <input
                          type="radio"
                          id="lights_ok_ok"
                          name="lights_ok"
                          value="true"
                          checked={formState.lights_ok === true}
                          onChange={handleInputChange}
                          className="h-4 w-4 text-green-600 border-gray-300 focus:ring-green-500"
                          disabled={!canAdd}
                        />
                        <label htmlFor="lights_ok_ok" className="text-sm text-gray-700">OK</label>
                      </div>
                      <div className="flex items-center space-x-1">
                        <input
                          type="radio"
                          id="lights_ok_nok"
                          name="lights_ok"
                          value="false"
                          checked={formState.lights_ok === false}
                          onChange={handleInputChange}
                          className="h-4 w-4 text-red-600 border-gray-300 focus:ring-red-500"
                          disabled={!canAdd}
                        />
                        <label htmlFor="lights_ok_nok" className="text-sm text-gray-700">NOK</label>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700">Niveau d'huile</label>
                    <div className="flex space-x-4">
                      <div className="flex items-center space-x-1">
                        <input
                          type="radio"
                          id="oil_level_ok_ok"
                          name="oil_level_ok"
                          value="true"
                          checked={formState.oil_level_ok === true}
                          onChange={handleInputChange}
                          className="h-4 w-4 text-green-600 border-gray-300 focus:ring-green-500"
                          disabled={!canAdd}
                        />
                        <label htmlFor="oil_level_ok_ok" className="text-sm text-gray-700">OK</label>
                      </div>
                      <div className="flex items-center space-x-1">
                        <input
                          type="radio"
                          id="oil_level_ok_nok"
                          name="oil_level_ok"
                          value="false"
                          checked={formState.oil_level_ok === false}
                          onChange={handleInputChange}
                          className="h-4 w-4 text-red-600 border-gray-300 focus:ring-red-500"
                          disabled={!canAdd}
                        />
                        <label htmlFor="oil_level_ok_nok" className="text-sm text-gray-700">NOK</label>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700">Niveaux de fluides</label>
                    <div className="flex space-x-4">
                      <div className="flex items-center space-x-1">
                        <input
                          type="radio"
                          id="fluid_levels_ok_ok"
                          name="fluid_levels_ok"
                          value="true"
                          checked={formState.fluid_levels_ok === true}
                          onChange={handleInputChange}
                          className="h-4 w-4 text-green-600 border-gray-300 focus:ring-green-500"
                          disabled={!canAdd}
                        />
                        <label htmlFor="fluid_levels_ok_ok" className="text-sm text-gray-700">OK</label>
                      </div>
                      <div className="flex items-center space-x-1">
                        <input
                          type="radio"
                          id="fluid_levels_ok_nok"
                          name="fluid_levels_ok"
                          value="false"
                          checked={formState.fluid_levels_ok === false}
                          onChange={handleInputChange}
                          className="h-4 w-4 text-red-600 border-gray-300 focus:ring-red-500"
                          disabled={!canAdd}
                        />
                        <label htmlFor="fluid_levels_ok_nok" className="text-sm text-gray-700">NOK</label>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700">Freins</label>
                    <div className="flex space-x-4">
                      <div className="flex items-center space-x-1">
                        <input
                          type="radio"
                          id="brakes_ok_ok"
                          name="brakes_ok"
                          value="true"
                          checked={formState.brakes_ok === true}
                          onChange={handleInputChange}
                          className="h-4 w-4 text-green-600 border-gray-300 focus:ring-green-500"
                          disabled={!canAdd}
                        />
                        <label htmlFor="brakes_ok_ok" className="text-sm text-gray-700">OK</label>
                      </div>
                      <div className="flex items-center space-x-1">
                        <input
                          type="radio"
                          id="brakes_ok_nok"
                          name="brakes_ok"
                          value="false"
                          checked={formState.brakes_ok === false}
                          onChange={handleInputChange}
                          className="h-4 w-4 text-red-600 border-gray-300 focus:ring-red-500"
                          disabled={!canAdd}
                        />
                        <label htmlFor="brakes_ok_nok" className="text-sm text-gray-700">NOK</label>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700">Essuie-glaces</label>
                    <div className="flex space-x-4">
                      <div className="flex items-center space-x-1">
                        <input
                          type="radio"
                          id="wipers_ok_ok"
                          name="wipers_ok"
                          value="true"
                          checked={formState.wipers_ok === true}
                          onChange={handleInputChange}
                          className="h-4 w-4 text-green-600 border-gray-300 focus:ring-green-500"
                          disabled={!canAdd}
                        />
                        <label htmlFor="wipers_ok_ok" className="text-sm text-gray-700">OK</label>
                      </div>
                      <div className="flex items-center space-x-1">
                        <input
                          type="radio"
                          id="wipers_ok_nok"
                          name="wipers_ok"
                          value="false"
                          checked={formState.wipers_ok === false}
                          onChange={handleInputChange}
                          className="h-4 w-4 text-red-600 border-gray-300 focus:ring-red-500"
                          disabled={!canAdd}
                        />
                        <label htmlFor="wipers_ok_nok" className="text-sm text-gray-700">NOK</label>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700">Klaxon</label>
                    <div className="flex space-x-4">
                      <div className="flex items-center space-x-1">
                        <input
                          type="radio"
                          id="horn_ok_ok"
                          name="horn_ok"
                          value="true"
                          checked={formState.horn_ok === true}
                          onChange={handleInputChange}
                          className="h-4 w-4 text-green-600 border-gray-300 focus:ring-green-500"
                          disabled={!canAdd}
                        />
                        <label htmlFor="horn_ok_ok" className="text-sm text-gray-700">OK</label>
                      </div>
                      <div className="flex items-center space-x-1">
                        <input
                          type="radio"
                          id="horn_ok_nok"
                          name="horn_ok"
                          value="false"
                          checked={formState.horn_ok === false}
                          onChange={handleInputChange}
                          className="h-4 w-4 text-red-600 border-gray-300 focus:ring-red-500"
                          disabled={!canAdd}
                        />
                        <label htmlFor="horn_ok_nok" className="text-sm text-gray-700">NOK</label>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700">Rétroviseurs</label>
                    <div className="flex space-x-4">
                      <div className="flex items-center space-x-1">
                        <input
                          type="radio"
                          id="mirrors_ok_ok"
                          name="mirrors_ok"
                          value="true"
                          checked={formState.mirrors_ok === true}
                          onChange={handleInputChange}
                          className="h-4 w-4 text-green-600 border-gray-300 focus:ring-green-500"
                          disabled={!canAdd}
                        />
                        <label htmlFor="mirrors_ok_ok" className="text-sm text-gray-700">OK</label>
                      </div>
                      <div className="flex items-center space-x-1">
                        <input
                          type="radio"
                          id="mirrors_ok_nok"
                          name="mirrors_ok"
                          value="false"
                          checked={formState.mirrors_ok === false}
                          onChange={handleInputChange}
                          className="h-4 w-4 text-red-600 border-gray-300 focus:ring-red-500"
                          disabled={!canAdd}
                        />
                        <label htmlFor="mirrors_ok_nok" className="text-sm text-gray-700">NOK</label>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700">Climatiseur</label>
                    <div className="flex space-x-4">
                      <div className="flex items-center space-x-1">
                        <input
                          type="radio"
                          id="ac_working_ok_ok"
                          name="ac_working_ok"
                          value="true"
                          checked={formState.ac_working_ok === true}
                          onChange={handleInputChange}
                          className="h-4 w-4 text-green-600 border-gray-300 focus:ring-green-500"
                          disabled={!canAdd}
                        />
                        <label htmlFor="ac_working_ok_ok" className="text-sm text-gray-700">OK</label>
                      </div>
                      <div className="flex items-center space-x-1">
                        <input
                          type="radio"
                          id="ac_working_ok_nok"
                          name="ac_working_ok"
                          value="false"
                          checked={formState.ac_working_ok === false}
                          onChange={handleInputChange}
                          className="h-4 w-4 text-red-600 border-gray-300 focus:ring-red-500"
                          disabled={!canAdd}
                        />
                        <label htmlFor="ac_working_ok_nok" className="text-sm text-gray-700">NOK</label>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700">Vitres</label>
                    <div className="flex space-x-4">
                      <div className="flex items-center space-x-1">
                        <input
                          type="radio"
                          id="windows_working_ok_ok"
                          name="windows_working_ok"
                          value="true"
                          checked={formState.windows_working_ok === true}
                          onChange={handleInputChange}
                          className="h-4 w-4 text-green-600 border-gray-300 focus:ring-green-500"
                          disabled={!canAdd}
                        />
                        <label htmlFor="windows_working_ok_ok" className="text-sm text-gray-700">OK</label>
                      </div>
                      <div className="flex items-center space-x-1">
                        <input
                          type="radio"
                          id="windows_working_ok_nok"
                          name="windows_working_ok"
                          value="false"
                          checked={formState.windows_working_ok === false}
                          onChange={handleInputChange}
                          className="h-4 w-4 text-red-600 border-gray-300 focus:ring-red-500"
                          disabled={!canAdd}
                        />
                        <label htmlFor="windows_working_ok_nok" className="text-sm text-gray-700">NOK</label>
                      </div>
                    </div>
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
                    disabled={!canAdd}
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
                    disabled={!canAdd}
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