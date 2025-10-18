import React, { useState, useMemo, useEffect } from 'react';
import { Plus, Edit2, Trash2, Fuel, DollarSign, TrendingUp, ChevronUp, ChevronDown, Search, Calendar } from 'lucide-react';
import { FleetData, FuelEntry } from '../types';
import { showSuccess } from '../utils/toast';
import { formatDate } from '../utils/date';
import ConfirmDialog from './ConfirmDialog';
import { Button } from './ui/button';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { fuelEntrySchema } from '../types/formSchemas'; // Import the schema
import { z } from 'zod'; // Import z
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from './ui/dialog'; // Import shadcn/ui Dialog components

type FuelEntryFormData = z.infer<typeof fuelEntrySchema>;

interface FuelManagementProps {
  data: FleetData;
  userRole: 'admin' | 'direction' | 'utilisateur';
  onAdd: (fuelEntry: Omit<FuelEntry, 'id' | 'user_id' | 'created_at'>) => void;
  onUpdate: (fuelEntry: FuelEntry) => void;
  onDelete: (id: string) => void;
}

const FuelManagement: React.FC<FuelManagementProps> = ({ data, onAdd, onUpdate, onDelete }) => {
  const [showModal, setShowModal] = useState(false);
  const [editingFuel, setEditingFuel] = useState<FuelEntry | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [fuelEntryToDelete, setFuelEntryToDelete] = useState<string | null>(null);

  const { register, handleSubmit, reset, formState: { errors = {} } } = useForm<FuelEntryFormData>({
    resolver: zodResolver(fuelEntrySchema),
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      vehicle_id: '',
      liters: 0,
      price_per_liter: 0,
      mileage: 0,
    }
  });

  useEffect(() => {
    if (editingFuel) {
      reset(editingFuel);
    } else {
      reset({
        date: new Date().toISOString().split('T')[0],
        vehicle_id: '',
        liters: 0,
        price_per_liter: 0,
        mileage: 0,
      });
    }
  }, [editingFuel, reset]);

  // State for filtering, sorting, and pagination
  const [searchTerm, setSearchTerm] = useState('');
  const [sortColumn, setSortColumn] = useState<keyof FuelEntry>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10; // You can adjust this value

  // Filtered and sorted data
  const filteredAndSortedFuelEntries = useMemo(() => {
    let filtered = data.fuel.filter(entry => {
      const vehicle = data.vehicles.find(v => v.id === entry.vehicle_id);
      return (
        entry.date.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (vehicle?.plate || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.liters.toString().includes(searchTerm) ||
        entry.price_per_liter.toString().includes(searchTerm) ||
        entry.mileage.toString().includes(searchTerm)
      );
    });

    filtered.sort((a, b) => {
      const aValue = a[sortColumn];
      const bValue = b[sortColumn];

      // Handle null/undefined values first (though not expected for these columns)
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

      // For date strings (like 'date'), compare them directly as strings
      if (sortColumn === 'date' && typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
      }
      
      // General number comparison
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
      }
      
      // General string comparison (fallback for other string columns)
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
      }
      
      // Fallback for other types
      return 0;
    });
    return filtered;
  }, [data.fuel, data.vehicles, searchTerm, sortColumn, sortDirection]);

  // Paginated data
  const totalPages = Math.ceil(filteredAndSortedFuelEntries.length / itemsPerPage);
  const currentFuelEntries = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredAndSortedFuelEntries.slice(startIndex, endIndex);
  }, [filteredAndSortedFuelEntries, currentPage, itemsPerPage]);

  const totalLiters = data.fuel.reduce((sum, f) => sum + f.liters, 0);
  const totalCost = data.fuel.reduce((sum, f) => sum + (f.liters * f.price_per_liter), 0);
  const avgPrice = totalLiters > 0 ? totalCost / totalLiters : 0;

  const handleAddFuel = () => {
    setEditingFuel(null);
    setShowModal(true);
  };

  const handleEditFuel = (fuel: FuelEntry) => {
    setEditingFuel(fuel);
    setShowModal(true);
  };

  const confirmDeleteFuelEntry = (fuelId: string) => {
    setFuelEntryToDelete(fuelId);
    setShowConfirmDialog(true);
  };

  const executeDeleteFuelEntry = () => {
    if (fuelEntryToDelete) {
      onDelete(fuelEntryToDelete);
      showSuccess('Enregistrement de carburant supprimé avec succès !');
      setFuelEntryToDelete(null);
    }
  };

  const onSubmit = (formData: FuelEntryFormData) => {
    if (editingFuel) {
      onUpdate({ ...formData, id: editingFuel.id, user_id: editingFuel.user_id, created_at: editingFuel.created_at });
      showSuccess('Enregistrement de carburant mis à jour avec succès !');
    } else {
      onAdd(formData);
      showSuccess('Enregistrement de carburant ajouté avec succès !');
    }
    setShowModal(false);
  };

  const handleSort = (column: keyof FuelEntry) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const renderSortIcon = (column: keyof FuelEntry) => {
    if (sortColumn === column) {
      return sortDirection === 'asc' ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />;
    }
    return null;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-4xl font-bold text-gray-800">Gestion du Carburant</h2>
          <Button
            onClick={handleAddFuel}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg flex items-center space-x-2 transition-all duration-300"
          >
            <Plus className="w-5 h-5" />
            <span>Ajouter Plein</span>
          </Button>
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

      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Rechercher un plein par date, véhicule, litres, prix ou kilométrage..."
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
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('liters')}>
                <div className="flex items-center">
                  Litres {renderSortIcon('liters')}
                </div>
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('price_per_liter')}>
                <div className="flex items-center">
                  Prix/L {renderSortIcon('price_per_liter')}
                </div>
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Coût Total</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('mileage')}>
                <div className="flex items-center">
                  Kilométrage {renderSortIcon('mileage')}
                </div>
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {currentFuelEntries.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                  Aucun enregistrement de carburant trouvé.
                </td>
              </tr>
            ) : (
              currentFuelEntries.map((fuel) => {
                const vehicle = data.vehicles.find(v => v.id === fuel.vehicle_id);
                return (
                  <tr key={fuel.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm text-gray-900">{formatDate(fuel.date)}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{vehicle?.plate || 'N/A'}</td>
                    <td className="px-6 py-4 text-sm font-semibold">{fuel.liters} L</td>
                    <td className="px-6 py-4 text-sm">{fuel.price_per_liter.toFixed(2)} TND</td>
                    <td className="px-6 py-4 text-sm font-bold text-green-600">{(fuel.liters * fuel.price_per_liter).toFixed(2)} TND</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{fuel.mileage.toLocaleString()} km</td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex space-x-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditFuel(fuel)}
                            className="text-blue-600 hover:text-blue-900 transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => confirmDeleteFuelEntry(fuel.id)}
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
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingFuel ? 'Modifier un Plein' : 'Ajouter un Plein'}</DialogTitle>
            <DialogDescription>
              {editingFuel ? 'Modifiez les détails du plein.' : 'Ajoutez un nouvel enregistrement de carburant.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
            <div>
              <label htmlFor="date" className="block text-sm font-semibold mb-2 text-gray-900">Date</label>
              <div className="relative flex items-center">
                <input
                  id="date"
                  type="date"
                  {...register('date')}
                  className="w-full bg-white border border-gray-300 rounded-lg pl-4 pr-10 py-3 shadow-sm focus:ring-blue-500 focus:border-blue-500"
                />
                <Calendar className="absolute right-3 w-5 h-5 text-gray-400 pointer-events-none" />
              </div>
              {errors.date && <p className="text-red-500 text-sm mt-1">{errors.date.message}</p>}
            </div>
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
              <label htmlFor="liters" className="block text-sm font-semibold mb-2 text-gray-900">Litres</label>
              <input
                id="liters"
                type="number"
                step="0.1"
                {...register('liters', { valueAsNumber: true })}
                className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 shadow-sm focus:ring-blue-500 focus:border-blue-500"
              />
              {errors.liters && <p className="text-red-500 text-sm mt-1">{errors.liters.message}</p>}
            </div>
            <div>
              <label htmlFor="price_per_liter" className="block text-sm font-semibold mb-2 text-gray-900">Prix par litre (TND)</label>
              <input
                id="price_per_liter"
                type="number"
                step="0.01"
                {...register('price_per_liter', { valueAsNumber: true })}
                className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 shadow-sm focus:ring-blue-500 focus:border-blue-500"
              />
              {errors.price_per_liter && <p className="text-red-500 text-sm mt-1">{errors.price_per_liter.message}</p>}
            </div>
            <div>
              <label htmlFor="mileage" className="block text-sm font-semibold mb-2 text-gray-900">Kilométrage</label>
              <input
                id="mileage"
                type="number"
                {...register('mileage', { valueAsNumber: true })}
                className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 shadow-sm focus:ring-blue-500 focus:border-blue-500"
              />
              {errors.mileage && <p className="text-red-500 text-sm mt-1">{errors.mileage.message}</p>}
            </div>
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
        description="Êtes-vous sûr de vouloir supprimer cet enregistrement de carburant ? Cette action est irréversible."
        onConfirm={executeDeleteFuelEntry}
        confirmText="Supprimer"
        variant="destructive"
      />
    </div>
  );
};

export default FuelManagement;