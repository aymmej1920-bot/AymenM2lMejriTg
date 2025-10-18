import React, { useState, useMemo, useEffect } from 'react';
import { Plus, Edit2, Trash2, ChevronUp, ChevronDown, Search } from 'lucide-react';
import { FleetData, Vehicle } from '../types';
import { showSuccess } from '../utils/toast';
import { formatDate } from '../utils/date';
import ConfirmDialog from './ConfirmDialog';
import { Button } from './ui/button';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { vehicleSchema } from '../types/formSchemas'; // Import the schema

interface VehiclesProps {
  data: FleetData;
  userRole: 'admin' | 'direction' | 'utilisateur';
  onAdd: (vehicle: Omit<Vehicle, 'id' | 'user_id' | 'created_at'>) => void;
  onUpdate: (vehicle: Vehicle) => void;
  onDelete: (id: string) => void;
}

const Vehicles: React.FC<VehiclesProps> = ({ data, onAdd, onUpdate, onDelete }) => {
  const [showModal, setShowModal] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [vehicleToDelete, setVehicleToDelete] = useState<string | null>(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<Vehicle>({
    resolver: zodResolver(vehicleSchema),
    defaultValues: {
      plate: '',
      type: 'Camionnette',
      status: 'Disponible',
      mileage: 0,
      last_service_date: new Date().toISOString().split('T')[0],
      last_service_mileage: 0,
    }
  });

  useEffect(() => {
    if (editingVehicle) {
      reset(editingVehicle);
    } else {
      reset({
        plate: '',
        type: 'Camionnette',
        status: 'Disponible',
        mileage: 0,
        last_service_date: new Date().toISOString().split('T')[0],
        last_service_mileage: 0,
      });
    }
  }, [editingVehicle, reset]);

  // State for filtering, sorting, and pagination
  const [searchTerm, setSearchTerm] = useState('');
  const [sortColumn, setSortColumn] = useState<keyof Vehicle>('plate');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10; // You can adjust this value

  // Filtered and sorted data
  const filteredAndSortedVehicles = useMemo(() => {
    let filtered = data.vehicles.filter(vehicle =>
      vehicle.plate.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vehicle.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vehicle.status.toLowerCase().includes(searchTerm.toLowerCase())
    );

    filtered.sort((a, b) => {
      const aValue = a[sortColumn];
      const bValue = b[sortColumn];

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
      }
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
      }
      // Fallback for other types or if values are null/undefined
      return 0;
    });
    return filtered;
  }, [data.vehicles, searchTerm, sortColumn, sortDirection]);

  // Paginated data
  const totalPages = Math.ceil(filteredAndSortedVehicles.length / itemsPerPage);
  const currentVehicles = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredAndSortedVehicles.slice(startIndex, endIndex);
  }, [filteredAndSortedVehicles, currentPage, itemsPerPage]);

  const handleAddVehicle = () => {
    setEditingVehicle(null);
    setShowModal(true);
  };

  const handleEditVehicle = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle);
    setShowModal(true);
  };

  const confirmDeleteVehicle = (vehicleId: string) => {
    setVehicleToDelete(vehicleId);
    setShowConfirmDialog(true);
  };

  const executeDeleteVehicle = () => {
    if (vehicleToDelete) {
      onDelete(vehicleToDelete);
      showSuccess('Véhicule supprimé avec succès !');
      setVehicleToDelete(null);
    }
  };

  const onSubmit = (formData: Vehicle) => {
    if (editingVehicle) {
      onUpdate(formData);
      showSuccess('Véhicule mis à jour avec succès !');
    } else {
      onAdd(formData);
      showSuccess('Véhicule ajouté avec succès !');
    }
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
    const nextService = (vehicle.last_service_mileage || 0) + 10000;
    const kmUntilService = nextService - vehicle.mileage;
    
    if (kmUntilService <= 0) {
      return { text: 'URGENT!', class: 'text-red-600 font-bold' };
    } else if (kmUntilService <= 1000) {
      return { text: `${kmUntilService.toLocaleString()} km restants - Bientôt`, class: 'text-orange-600 font-bold' };
    } else {
      return { text: `${kmUntilService.toLocaleString()} km restants`, class: 'text-green-600' };
    }
  };

  const handleSort = (column: keyof Vehicle) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const renderSortIcon = (column: keyof Vehicle) => {
    if (sortColumn === column) {
      return sortDirection === 'asc' ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />;
    }
    return null;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-4xl font-bold text-gray-800">Gestion des Véhicules</h2>
          <Button
            onClick={handleAddVehicle}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg flex items-center space-x-2 transition-all duration-300"
          >
            <Plus className="w-5 h-5" />
            <span>Ajouter Véhicule</span>
          </Button>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Rechercher un véhicule par plaque, type ou statut..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setCurrentPage(1); // Reset to first page on new search
          }}
          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
        />
      </div>

      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('plate')}>
                <div className="flex items-center">
                  Plaque {renderSortIcon('plate')}
                </div>
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('type')}>
                <div className="flex items-center">
                  Type {renderSortIcon('type')}
                </div>
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('status')}>
                <div className="flex items-center">
                  Statut {renderSortIcon('status')}
                </div>
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('mileage')}>
                <div className="flex items-center">
                  Kilométrage {renderSortIcon('mileage')}
                </div>
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('last_service_date')}>
                <div className="flex items-center">
                  Dernière Vidange {renderSortIcon('last_service_date')}
                </div>
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Prochaine Vidange</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {currentVehicles.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                  Aucun véhicule trouvé.
                </td>
              </tr>
            ) : (
              currentVehicles.map((vehicle) => {
                const serviceStatus = getServiceStatus(vehicle);
                const nextService = (vehicle.last_service_mileage || 0) + 10000;
                
                return (
                  <tr key={vehicle.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{vehicle.plate}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{vehicle.type}</td>
                    <td className="px-6 py-4 text-sm">
                      <span className={getStatusBadge(vehicle.status)}>{vehicle.status}</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 font-semibold">{vehicle.mileage.toLocaleString()} km</td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {formatDate(vehicle.last_service_date)} ({(vehicle.last_service_mileage || 0).toLocaleString()} km)
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
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditVehicle(vehicle)}
                            className="text-blue-600 hover:text-blue-900 transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => confirmDeleteVehicle(vehicle.id)}
                            className="text-red-600 hover:text-red-900 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center space-x-2 mt-4">
          <Button
            variant="outline"
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Précédent
          </Button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
            <Button
              key={page}
              variant={currentPage === page ? 'default' : 'outline'}
              onClick={() => setCurrentPage(page)}
              className={`px-4 py-2 rounded-lg ${
                currentPage === page ? 'bg-blue-600 text-white' : 'bg-gray-200 hover:bg-gray-300'
              }`}
            >
              {page}
            </Button>
          ))}
          <Button
            variant="outline"
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
            className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Suivant
          </Button>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full">
            <div className="p-8">
              <h3 className="text-2xl font-bold text-gray-800 mb-6">
                {editingVehicle ? 'Modifier un Véhicule' : 'Ajouter un Véhicule'}
              </h3>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <label htmlFor="plate" className="block text-sm font-medium mb-2 text-gray-700">Plaque d'immatriculation</label>
                  <input
                    id="plate"
                    type="text"
                    {...register('plate')}
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-blue-500 focus:border-blue-500"
                  />
                  {errors.plate && <p className="text-red-500 text-sm mt-1">{errors.plate.message}</p>}
                </div>
                <div>
                  <label htmlFor="type" className="block text-sm font-medium mb-2 text-gray-700">Type de véhicule</label>
                  <select
                    id="type"
                    {...register('type')}
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="Camionnette">Camionnette</option>
                    <option value="Camion">Camion</option>
                    <option value="Fourgon">Fourgon</option>
                    <option value="Utilitaire">Utilitaire</option>
                  </select>
                  {errors.type && <p className="text-red-500 text-sm mt-1">{errors.type.message}</p>}
                </div>
                <div>
                  <label htmlFor="status" className="block text-sm font-medium mb-2 text-gray-700">Statut</label>
                  <select
                    id="status"
                    {...register('status')}
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="Disponible">Disponible</option>
                    <option value="En mission">En mission</option>
                    <option value="Maintenance">Maintenance</option>
                  </select>
                  {errors.status && <p className="text-red-500 text-sm mt-1">{errors.status.message}</p>}
                </div>
                <div>
                  <label htmlFor="mileage" className="block text-sm font-medium mb-2 text-gray-700">Kilométrage actuel</label>
                  <input
                    id="mileage"
                    type="number"
                    {...register('mileage', { valueAsNumber: true })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-blue-500 focus:border-blue-500"
                  />
                  {errors.mileage && <p className="text-red-500 text-sm mt-1">{errors.mileage.message}</p>}
                </div>
                <div>
                  <label htmlFor="last_service_date" className="block text-sm font-medium mb-2 text-gray-700">Date dernière vidange</label>
                  <input
                    id="last_service_date"
                    type="date"
                    {...register('last_service_date')}
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-blue-500 focus:border-blue-500"
                  />
                  {errors.last_service_date && <p className="text-red-500 text-sm mt-1">{errors.last_service_date.message}</p>}
                </div>
                <div>
                  <label htmlFor="last_service_mileage" className="block text-sm font-medium mb-2 text-gray-700">Kilométrage dernière vidange</label>
                  <input
                    id="last_service_mileage"
                    type="number"
                    {...register('last_service_mileage', { valueAsNumber: true })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-blue-500 focus:border-blue-500"
                  />
                  {errors.last_service_mileage && <p className="text-red-500 text-sm mt-1">{errors.last_service_mileage.message}</p>}
                </div>
                <div className="flex justify-end space-x-4 mt-8">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowModal(false)}
                    className="px-6 py-3 bg-gray-300 hover:bg-gray-400 rounded-lg transition-all duration-300"
                  >
                    Annuler
                  </Button>
                  <Button
                    type="submit"
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all duration-300"
                  >
                    Sauvegarder
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={showConfirmDialog}
        onOpenChange={setShowConfirmDialog}
        title="Confirmer la suppression"
        description="Êtes-vous sûr de vouloir supprimer ce véhicule ? Cette action est irréversible."
        onConfirm={executeDeleteVehicle}
        confirmText="Supprimer"
        variant="destructive"
      />
    </div>
  );
};

export default Vehicles;