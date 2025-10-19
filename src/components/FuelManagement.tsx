import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Fuel, DollarSign, TrendingUp, Calendar, Search } from 'lucide-react';
import { FleetData, FuelEntry, DataTableColumn } from '../types';
import { showSuccess } from '../utils/toast';
import { formatDate } from '../utils/date';
import { Button } from './ui/button';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { fuelEntrySchema } from '../types/formSchemas';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from './ui/dialog';
import DataTable from './DataTable'; // Import the new DataTable component
import { useSession } => from './SessionContextProvider'; // Import useSession
import { canAccess } from '../utils/permissions'; // Import canAccess

type FuelEntryFormData = z.infer<typeof fuelEntrySchema>;

interface FuelManagementProps {
  data: FleetData;
  onAdd: (fuelEntry: Omit<FuelEntry, 'id' | 'user_id' | 'created_at'>) => void;
  onUpdate: (fuelEntry: FuelEntry) => void;
  onDelete: (id: string) => void;
}

const FuelManagement: React.FC<FuelManagementProps> = ({ data, onAdd, onUpdate, onDelete }) => {
  const { currentUser } = useSession(); // Use useSession directly
  const userRole = currentUser?.role || 'utilisateur';

  const [showModal, setShowModal] = useState(false);
  const [editingFuel, setEditingFuel] = useState<FuelEntry | null>(null);

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

  // State for custom filters
  const [selectedVehicle, setSelectedVehicle] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

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

  const columns: DataTableColumn<FuelEntry>[] = useMemo(() => [
    { key: 'date', label: 'Date', sortable: true, defaultVisible: true, render: (item) => formatDate(item.date) },
    {
      key: 'vehicle_id',
      label: 'Véhicule',
      sortable: true,
      defaultVisible: true,
      render: (item) => data.vehicles.find(v => v.id === item.vehicle_id)?.plate || 'N/A',
    },
    { key: 'liters', label: 'Litres', sortable: true, defaultVisible: true, render: (item) => `${item.liters} L` },
    { key: 'price_per_liter', label: 'Prix/L', sortable: true, defaultVisible: true, render: (item) => `${item.price_per_liter.toFixed(2)} TND` },
    {
      key: 'total_cost',
      label: 'Coût Total',
      sortable: true,
      defaultVisible: true,
      render: (item) => <span className="font-bold text-green-600">{(item.liters * item.price_per_liter).toFixed(2)} TND</span>,
    },
    { key: 'mileage', label: 'Kilométrage', sortable: true, defaultVisible: true, render: (item) => `${item.mileage.toLocaleString()} km` },
  ], [data.vehicles]);

  const renderFilters = useCallback((searchTerm: string, setSearchTerm: (term: string) => void) => {
    return (
      <>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher par date, véhicule, litres, prix ou kilométrage..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          />
        </div>
        <div>
          <select
            value={selectedVehicle}
            onChange={(e) => setSelectedVehicle(e.target.value)}
            className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 shadow-sm focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Tous les véhicules</option>
            {data.vehicles.map(vehicle => (
              <option key={vehicle.id} value={vehicle.id}>
                {vehicle.plate} - {vehicle.type}
              </option>
            ))}
          </select>
        </div>
        <div className="relative">
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full bg-white border border-gray-300 rounded-lg pl-4 pr-10 py-3 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            placeholder="Date de début"
          />
          <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
        </div>
        <div className="relative">
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full bg-white border border-gray-300 rounded-lg pl-4 pr-10 py-3 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            placeholder="Date de fin"
          />
          <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
        </div>
      </>
    );
  }, [data.vehicles, selectedVehicle, startDate, endDate]);

  const customFilter = useCallback((entry: FuelEntry) => {
    const matchesVehicle = selectedVehicle ? entry.vehicle_id === selectedVehicle : true;

    const entryDate = new Date(entry.date);
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;

    const matchesDateRange = 
      (!start || entryDate >= start) &&
      (!end || entryDate <= end);

    return matchesVehicle && matchesDateRange;
  }, [selectedVehicle, startDate, endDate]);

  const canAddForm = canAccess(userRole, 'fuel_entries', 'add');
  const canEditForm = canAccess(userRole, 'fuel_entries', 'edit');

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-4xl font-bold text-gray-800">Gestion du Carburant</h2>
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

      <DataTable
        title="Historique des Pleins"
        data={data.fuel}
        columns={columns}
        onAdd={canAddForm ? handleAddFuel : undefined}
        onEdit={canEditForm ? handleEditFuel : undefined}
        onDelete={canAccess(userRole, 'fuel_entries', 'delete') ? onDelete : undefined}
        addLabel="Ajouter Plein"
        searchPlaceholder="Rechercher par date, véhicule, litres, prix ou kilométrage..."
        exportFileName="carburant"
        isLoading={false}
        renderFilters={renderFilters}
        customFilter={customFilter}
        resourceType="fuel_entries" // Pass resource type
      />

      {/* Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-[425px] bg-gray-50">
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
                  disabled={(!canEditForm && !!editingFuel) || (!canAddForm && !editingFuel)}
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
                disabled={(!canEditForm && !!editingFuel) || (!canAddForm && !editingFuel)}
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
                disabled={(!canEditForm && !!editingFuel) || (!canAddForm && !editingFuel)}
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
                disabled={(!canEditForm && !!editingFuel) || (!canAddForm && !editingFuel)}
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
                disabled={(!canEditForm && !!editingFuel) || (!canAddForm && !editingFuel)}
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
              {(canAddForm && !editingFuel) || (canEditForm && editingFuel) ? (
                <Button
                  type="submit"
                >
                  Sauvegarder
                </Button>
              ) : null}
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FuelManagement;