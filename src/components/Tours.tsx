import React, { useState, useMemo, useEffect } from 'react';
import { Plus, Edit2, Trash2, ChevronUp, ChevronDown, Search } from 'lucide-react';
import { FleetData, Tour } from '../types';
import { showSuccess } from '../utils/toast';
import { formatDate } from '../utils/date';
import ConfirmDialog from './ConfirmDialog';
import { Button } from './ui/button';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { tourSchema } from '../types/formSchemas'; // Import the schema
import { z } from 'zod'; // Import z
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from './ui/dialog'; // Import shadcn/ui Dialog components

type TourFormData = z.infer<typeof tourSchema>;

interface ToursProps {
  data: FleetData;
  userRole: 'admin' | 'direction' | 'utilisateur';
  onAdd: (tour: Omit<Tour, 'id' | 'user_id' | 'created_at'>) => void;
  onUpdate: (tour: Tour) => void;
  onDelete: (id: string) => void;
}

const Tours: React.FC<ToursProps> = ({ data, onAdd, onUpdate, onDelete }) => {
  const [showModal, setShowModal] = useState(false);
  const [editingTour, setEditingTour] = useState<Tour | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [tourToDelete, setTourToDelete] = useState<string | null>(null);

  const { register, handleSubmit, watch, reset, formState: { errors } } = useForm<TourFormData>({
    resolver: zodResolver(tourSchema),
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      vehicle_id: '',
      driver_id: '',
      status: 'Planifié',
      fuel_start: null,
      km_start: null,
      fuel_end: null,
      km_end: null,
      distance: null,
    }
  });

  const status = watch('status');

  useEffect(() => {
    if (editingTour) {
      reset({
        ...editingTour,
        fuel_start: editingTour.fuel_start ?? null, // Ensure null for optional number fields
        km_start: editingTour.km_start ?? null,
        fuel_end: editingTour.fuel_end ?? null,
        km_end: editingTour.km_end ?? null,
        distance: editingTour.distance ?? null,
      });
    } else {
      reset({
        date: new Date().toISOString().split('T')[0],
        vehicle_id: '',
        driver_id: '',
        status: 'Planifié',
        fuel_start: null,
        km_start: null,
        fuel_end: null,
        km_end: null,
        distance: null,
      });
    }
  }, [editingTour, reset]);

  // State for filtering, sorting, and pagination
  const [searchTerm, setSearchTerm] = useState('');
  const [sortColumn, setSortColumn] = useState<keyof Tour>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10; // You can adjust this value

  // Filtered and sorted data
  const filteredAndSortedTours = useMemo(() => {
    let filtered = data.tours.filter(tour => {
      const vehicle = data.vehicles.find(v => v.id === tour.vehicle_id);
      const driver = data.drivers.find(d => d.id === tour.driver_id);
      
      return (
        tour.date.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (vehicle?.plate || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (driver?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        tour.status.toLowerCase().includes(searchTerm.toLowerCase())
      );
    });

    filtered.sort((a, b) => {
      const aValue = a[sortColumn];
      const bValue = b[sortColumn];

      // Handle null/undefined values first
      if (aValue == null) { // Use == null to check for both null and undefined
        return sortDirection === 'asc' ? -1 : 1; // Null/undefined comes first in asc, last in desc
      }
      if (bValue == null) { // Use == null to check for both null and undefined
        return sortDirection === 'asc' ? 1 : -1; // Null/undefined comes first in asc, last in desc
      }

      // Now that we know values are not null/undefined, compare them based on type
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
      }
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
      }
      // Fallback for any other unexpected types (should not be reached with current Tour interface)
      return 0;
    });
    return filtered;
  }, [data.tours, data.vehicles, data.drivers, searchTerm, sortColumn, sortDirection]);

  // Paginated data
  const totalPages = Math.ceil(filteredAndSortedTours.length / itemsPerPage);
  const currentTours = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredAndSortedTours.slice(startIndex, endIndex);
  }, [filteredAndSortedTours, currentPage, itemsPerPage]);

  const handleAddTour = () => {
    setEditingTour(null);
    setShowModal(true);
  };

  const handleEditTour = (tour: Tour) => {
    setEditingTour(tour);
    setShowModal(true);
  };

  const confirmDeleteTour = (tourId: string) => {
    setTourToDelete(tourId);
    setShowConfirmDialog(true);
  };

  const executeDeleteTour = () => {
    if (tourToDelete) {
      onDelete(tourToDelete);
      showSuccess('Tournée supprimée avec succès !');
      setTourToDelete(null);
    }
  };

  const onSubmit = (formData: TourFormData) => {
    if (editingTour) {
      // Merge formData with existing editingTour to preserve user_id and created_at
      onUpdate({ ...editingTour, ...formData, id: editingTour.id, user_id: editingTour.user_id, created_at: editingTour.created_at });
      showSuccess('Tournée mise à jour avec succès !');
    } else {
      onAdd(formData);
      showSuccess('Tournée ajoutée avec succès !');
    }
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
    // Use != null to check for both null and undefined
    if (tour.distance != null && tour.distance > 0 && tour.fuel_start != null && tour.fuel_end != null) {
      const fuelConsumed = tour.fuel_start - tour.fuel_end;
      if (fuelConsumed > 0) {
        return ((fuelConsumed / tour.distance) * 100).toFixed(1);
      }
    }
    return '-';
  };

  const handleSort = (column: keyof Tour) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const renderSortIcon = (column: keyof Tour) => {
    if (sortColumn === column) {
      return sortDirection === 'asc' ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />;
    }
    return null;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-4xl font-bold text-gray-800">Suivi des Tournées</h2>
          <Button
            onClick={handleAddTour}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg flex items-center space-x-2 transition-all duration-300"
          >
            <Plus className="w-5 h-5" />
            <span>Nouvelle Tournée</span>
          </Button>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Rechercher une tournée par date, véhicule, conducteur ou statut..."
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
                <th className="px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('date')}>
                  <div className="flex items-center">
                    Date {renderSortIcon('date')}
                  </div>
                </th>
                <th className="px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('vehicle_id')}>
                  <div className="flex items-center">
                    Véhicule {renderSortIcon('vehicle_id')}
                  </div>
                </th>
                <th className="px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('driver_id')}>
                  <div className="flex items-center">
                    Conducteur {renderSortIcon('driver_id')}
                  </div>
                </th>
                <th className="px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('status')}>
                  <div className="flex items-center">
                    Statut {renderSortIcon('status')}
                  </div>
                </th>
                <th className="px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('fuel_start')}>
                  <div className="flex items-center">
                    Fuel Début {renderSortIcon('fuel_start')}
                  </div>
                </th>
                <th className="px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('km_start')}>
                  <div className="flex items-center">
                    Km Début {renderSortIcon('km_start')}
                  </div>
                </th>
                <th className="px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('fuel_end')}>
                  <div className="flex items-center">
                    Fuel Fin {renderSortIcon('fuel_end')}
                  </div>
                </th>
                <th className="px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('km_end')}>
                  <div className="flex items-center">
                    Km Fin {renderSortIcon('km_end')}
                  </div>
                </th>
                <th className="px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('distance')}>
                  <div className="flex items-center">
                    Distance {renderSortIcon('distance')}
                  </div>
                </th>
                <th className="px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">L/100km</th>
                <th className="px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {currentTours.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-6 py-4 text-center text-gray-500">
                    Aucune tournée trouvée.
                  </td>
                </tr>
              ) : (
                currentTours.map((tour) => {
                  const vehicle = data.vehicles.find(v => v.id === tour.vehicle_id);
                  const driver = data.drivers.find(d => d.id === tour.driver_id);
                  return (
                    <tr key={tour.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-4 text-sm text-gray-900">{formatDate(tour.date)}</td>
                      <td className="px-4 py-4 text-sm text-gray-600">{vehicle?.plate || 'N/A'}</td>
                      <td className="px-4 py-4 text-sm text-gray-600">{driver?.name || 'N/A'}</td>
                      <td className="px-4 py-4 text-sm">
                        <span className={getStatusBadge(tour.status)}>{tour.status}</span>
                      </td>
                      <td className="px-4 py-4 text-sm text-center">{tour.fuel_start != null ? `${tour.fuel_start}%` : '-'}</td>
                      <td className="px-4 py-4 text-sm text-center">{tour.km_start != null ? tour.km_start.toLocaleString() : '-'}</td>
                      <td className="px-4 py-4 text-sm text-center">{tour.fuel_end != null ? `${tour.fuel_end}%` : '-'}</td>
                      <td className="px-4 py-4 text-sm text-center">{tour.km_end != null ? tour.km_end.toLocaleString() : '-'}</td>
                      <td className="px-4 py-4 text-sm font-semibold">{tour.distance != null ? `${tour.distance.toLocaleString()} km` : '-'}</td>
                      <td className="px-4 py-4 text-sm font-semibold">{calculateConsumption(tour)}</td>
                        <td className="px-4 py-4 text-sm">
                          <div className="flex space-x-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditTour(tour)}
                              className="text-blue-600 hover:text-blue-900 transition-colors"
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => confirmDeleteTour(tour.id)}
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
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-[600px]"> {/* Increased max-width for more fields */}
          <DialogHeader>
            <DialogTitle>{editingTour ? 'Modifier une Tournée' : 'Ajouter une Tournée'}</DialogTitle>
            <DialogDescription>
              {editingTour ? 'Modifiez les détails de la tournée.' : 'Ajoutez une nouvelle tournée.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="date" className="block text-sm font-semibold mb-2 text-gray-900">Date</label>
                <input
                  id="date"
                  type="date"
                  {...register('date')}
                  className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 shadow-sm focus:ring-blue-500 focus:border-blue-500"
                />
                {errors.date && <p className="text-red-500 text-sm mt-1">{errors.date.message}</p>}
              </div>
              <div>
                <label htmlFor="status" className="block text-sm font-semibold mb-2 text-gray-900">Statut</label>
                <select
                  id="status"
                  {...register('status')}
                  className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 shadow-sm focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="Planifié">Planifié</option>
                  <option value="En cours">En cours</option>
                  <option value="Terminé">Terminé</option>
                  <option value="Annulé">Annulé</option>
                </select>
                {errors.status && <p className="text-red-500 text-sm mt-1">{errors.status.message}</p>}
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="vehicle_id" className="block text-sm font-semibold mb-2 text-gray-900">Véhicule</label>
                <select
                  id="vehicle_id"
                  {...register('vehicle_id')}
                  className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 shadow-sm focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Sélectionner un véhicule</option>
                  {data.vehicles.map(vehicle => (
                    <option key={vehicle.id} value={vehicle.id}>
                      {vehicle.plate} - {vehicle.type}
                    </option>
                  ))}
                </select>
                {errors.vehicle_id && <p className="text-red-500 text-sm mt-1">{errors.vehicle_id.message}</p>}
              </div>
              <div>
                <label htmlFor="driver_id" className="block text-sm font-semibold mb-2 text-gray-900">Conducteur</label>
                <select
                  id="driver_id"
                  {...register('driver_id')}
                  className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 shadow-sm focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Sélectionner un conducteur</option>
                  {data.drivers.map(driver => (
                    <option key={driver.id} value={driver.id}>
                      {driver.name}
                    </option>
                  ))}
                </select>
                {errors.driver_id && <p className="text-red-500 text-sm mt-1">{errors.driver_id.message}</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="fuel_start" className="block text-sm font-semibold mb-2 text-gray-900">Niveau fuel début (%)</label>
                <input
                  id="fuel_start"
                  type="number"
                  min="0"
                  max="100"
                  {...register('fuel_start', { valueAsNumber: true })}
                  className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  disabled={status !== 'En cours' && status !== 'Terminé'}
                />
                {errors.fuel_start && <p className="text-red-500 text-sm mt-1">{errors.fuel_start.message}</p>}
              </div>
              <div>
                <label htmlFor="km_start" className="block text-sm font-semibold mb-2 text-gray-900">Km début</label>
                <input
                  id="km_start"
                  type="number"
                  {...register('km_start', { valueAsNumber: true })}
                  className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  disabled={status !== 'En cours' && status !== 'Terminé'}
                />
                {errors.km_start && <p className="text-red-500 text-sm mt-1">{errors.km_start.message}</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="fuel_end" className="block text-sm font-semibold mb-2 text-gray-900">Niveau fuel fin (%)</label>
                <input
                  id="fuel_end"
                  type="number"
                  min="0"
                  max="100"
                  {...register('fuel_end', { valueAsNumber: true })}
                  className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  disabled={status !== 'Terminé'}
                />
                {errors.fuel_end && <p className="text-red-500 text-sm mt-1">{errors.fuel_end.message}</p>}
              </div>
              <div>
                <label htmlFor="km_end" className="block text-sm font-semibold mb-2 text-gray-900">Km fin</label>
                <input
                  id="km_end"
                  type="number"
                  {...register('km_end', { valueAsNumber: true })}
                  className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  disabled={status !== 'Terminé'}
                />
                {errors.km_end && <p className="text-red-500 text-sm mt-1">{errors.km_end.message}</p>}
              </div>
            </div>

            <div>
              <label htmlFor="distance" className="block text-sm font-semibold mb-2 text-gray-900">Distance (km)</label>
              <input
                id="distance"
                type="number"
                {...register('distance', { valueAsNumber: true })}
                className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 shadow-sm focus:ring-blue-500 focus:border-blue-500"
                disabled={status !== 'Terminé'}
              />
              {errors.distance && <p className="text-red-500 text-sm mt-1">{errors.distance.message}</p>}
            </div>

            {errors.status && errors.status.message && (
              <p className="text-red-500 text-sm mt-1">{errors.status.message}</p>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowModal(false)}
              >
                Annuler
              </Button>
              <Button
                type="submit"
              >
                Sauvegarder
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={showConfirmDialog}
        onOpenChange={setShowConfirmDialog}
        title="Confirmer la suppression"
        description="Êtes-vous sûr de vouloir supprimer cette tournée ? Cette action est irréversible."
        onConfirm={executeDeleteTour}
        confirmText="Supprimer"
        variant="destructive"
      />
    </div>
  );
};

export default Tours;