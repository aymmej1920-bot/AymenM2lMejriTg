import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Fuel, DollarSign, TrendingUp, Calendar, Search } from 'lucide-react';
import { FuelEntry, DataTableColumn, Resource, Action, Vehicle } from '../types';
import { showSuccess } from '../utils/toast';
import { formatDate } from '../utils/date';
import { Button } from './ui/button';
import { useForm, FormProvider } from 'react-hook-form'; // Import FormProvider
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
import { usePermissions } from '../hooks/usePermissions'; // Import usePermissions
import { LOCAL_STORAGE_KEYS } from '../utils/constants'; // Import constants
import FormField from './forms/FormField'; // Import FormField
import { useSupabaseData } from '../hooks/useSupabaseData'; // Import useSupabaseData

type FuelEntryFormData = z.infer<typeof fuelEntrySchema>;

interface FuelManagementProps {
  onAdd: (tableName: Resource, fuelEntry: Omit<FuelEntry, 'id' | 'user_id' | 'created_at'>, action: Action) => Promise<void>;
  onUpdate: (tableName: Resource, fuelEntry: FuelEntry, action: Action) => Promise<void>;
  onDelete: (tableName: Resource, data: { id: string }, action: Action) => Promise<void>;
  registerRefetch: (resource: Resource, refetch: () => Promise<void>) => void;
}

const FuelManagement: React.FC<FuelManagementProps> = ({ onAdd, onUpdate, onDelete, registerRefetch }) => {
  const { canAccess } = usePermissions(); // Use usePermissions hook

  const { data: fuelEntries, isLoading: isLoadingFuel, refetch: refetchFuel } = useSupabaseData<FuelEntry>('fuel_entries');
  const { data: vehicles, isLoading: isLoadingVehicles } = useSupabaseData<Vehicle>('vehicles');

  useEffect(() => {
    registerRefetch('fuel_entries', refetchFuel);
  }, [registerRefetch, refetchFuel]);

  const [showModal, setShowModal] = useState(false);
  const [editingFuel, setEditingFuel] = useState<FuelEntry | null>(null);

  const methods = useForm<FuelEntryFormData>({ // Use methods from useForm
    resolver: zodResolver(fuelEntrySchema),
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      vehicle_id: '',
      liters: 0,
      price_per_liter: 0,
      mileage: 0,
    }
  });

  const { handleSubmit, reset, watch } = methods; // Removed errors from destructuring

  // Function to reset form and clear saved data
  const resetFormAndClearStorage = useCallback(() => {
    reset({
      date: new Date().toISOString().split('T')[0],
      vehicle_id: '',
      liters: 0,
      price_per_liter: 0,
      mileage: 0,
    });
    localStorage.removeItem(LOCAL_STORAGE_KEYS.FUEL_FORM_DATA);
  }, [reset]);

  // Effect to load saved form data when modal opens for a new fuel entry
  useEffect(() => {
    if (showModal && !editingFuel) { // Only for new fuel entry forms
      const savedFormData = localStorage.getItem(LOCAL_STORAGE_KEYS.FUEL_FORM_DATA);
      if (savedFormData) {
        try {
          const parsedData = JSON.parse(savedFormData);
          if (parsedData.date) {
            parsedData.date = new Date(parsedData.date).toISOString().split('T')[0];
          }
          reset(parsedData);
        } catch (e) {
          console.error("Failed to parse saved fuel form data", e);
          localStorage.removeItem(LOCAL_STORAGE_KEYS.FUEL_FORM_DATA);
        }
      }
    }
  }, [showModal, editingFuel, reset]);

  // Effect to save form data to localStorage whenever it changes (for new fuel entry forms)
  useEffect(() => {
    if (showModal && !editingFuel) { // Only save for new fuel entry forms
      const subscription = watch((value) => {
        localStorage.setItem(LOCAL_STORAGE_KEYS.FUEL_FORM_DATA, JSON.stringify(value));
      });
      return () => subscription.unsubscribe();
    }
  }, [showModal, editingFuel, watch]);

  // Reset form when editingFuel changes (for edit mode) or when modal closes (for new mode)
  React.useEffect(() => {
    if (editingFuel) {
      reset(editingFuel);
    } else {
      resetFormAndClearStorage(); // Use the new reset function
    }
  }, [editingFuel, resetFormAndClearStorage]);

  // State for custom filters
  const [selectedVehicle, setSelectedVehicle] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const totalLiters = fuelEntries.reduce((sum, f) => sum + f.liters, 0);
  const totalCost = fuelEntries.reduce((sum, f) => sum + (f.liters * f.price_per_liter), 0);
  const avgPrice = totalLiters > 0 ? totalCost / totalLiters : 0;

  const handleAddFuel = () => {
    setEditingFuel(null);
    resetFormAndClearStorage(); // Clear any previous unsaved data
    setShowModal(true);
  };

  const handleEditFuel = (fuel: FuelEntry) => {
    setEditingFuel(fuel);
    setShowModal(true);
  };

  const onSubmit = async (formData: FuelEntryFormData) => {
    if (editingFuel) {
      await onUpdate('fuel_entries', { ...formData, id: editingFuel.id, user_id: editingFuel.user_id, created_at: editingFuel.created_at }, 'edit');
      showSuccess('Enregistrement de carburant mis à jour avec succès !');
    } else {
      await onAdd('fuel_entries', formData, 'add');
      showSuccess('Enregistrement de carburant ajouté avec succès !');
    }
    setShowModal(false);
    resetFormAndClearStorage(); // Clear saved data on successful submission
  };

  const handleCloseModal = () => {
    setShowModal(false);
    resetFormAndClearStorage(); // Clear saved data on modal close
  };

  const columns: DataTableColumn<FuelEntry>[] = useMemo(() => [
    { key: 'date', label: 'Date', sortable: true, defaultVisible: true, render: (item) => formatDate(item.date) },
    {
      key: 'vehicle_id',
      label: 'Véhicule',
      sortable: true,
      defaultVisible: true,
      render: (item) => vehicles.find(v => v.id === item.vehicle_id)?.plate || 'N/A',
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
  ], [vehicles]);

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
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all glass"
          />
        </div>
        <div>
          <select
            value={selectedVehicle}
            onChange={(e) => setSelectedVehicle(e.target.value)}
            className="w-full glass border border-gray-300 rounded-lg px-4 py-3 shadow-sm focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Tous les véhicules</option>
            {vehicles.map(vehicle => (
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
                className="w-full glass border border-gray-300 rounded-lg pl-4 pr-10 py-3 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Date de début"
              />
              <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            </div>
            <div className="relative">
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full glass border border-gray-300 rounded-lg pl-4 pr-10 py-3 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Date de fin"
              />
              <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            </div>
          </>
        );
      }, [vehicles, selectedVehicle, startDate, endDate]);
    
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
    
      const canAddForm = canAccess('fuel_entries', 'add');
      const canEditForm = canAccess('fuel_entries', 'edit');

      const isLoadingCombined = isLoadingFuel || isLoadingVehicles;
    
      return (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-4xl font-bold text-gray-800">Gestion du Carburant</h2>
          </div>
    
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="glass rounded-xl shadow-lg p-6 hover-lift">
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
    
            <div className="glass rounded-xl shadow-lg p-6 hover-lift">
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
    
            <div className="glass rounded-xl shadow-lg p-6 hover-lift">
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
            data={fuelEntries}
            columns={columns}
            onAdd={canAddForm ? handleAddFuel : undefined}
            onEdit={canEditForm ? handleEditFuel : undefined}
            onDelete={canAccess('fuel_entries', 'delete') ? (id) => onDelete('fuel_entries', { id }, 'delete') : undefined}
            addLabel="Ajouter Plein"
            searchPlaceholder="Rechercher par date, véhicule, litres, prix ou kilométrage..."
            exportFileName="carburant"
            isLoading={isLoadingCombined}
            renderFilters={renderFilters}
            customFilter={customFilter}
            resourceType="fuel_entries" // Pass resource type
          />
    
          {/* Modal */}
          <Dialog open={showModal} onOpenChange={handleCloseModal}>
            <DialogContent className="sm:max-w-[425px] glass animate-scale-in">
              <DialogHeader>
                <DialogTitle>{editingFuel ? 'Modifier un Plein' : 'Ajouter un Plein'}</DialogTitle>
                <DialogDescription>
                  {editingFuel ? 'Modifiez les détails du plein.' : 'Ajoutez un nouvel enregistrement de carburant.'}
                </DialogDescription>
              </DialogHeader>
              <FormProvider {...methods}> {/* Wrap the form with FormProvider */}
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
                  <FormField
                    name="date"
                    label="Date"
                    type="date"
                    disabled={(!canEditForm && !!editingFuel) || (!canAddForm && !editingFuel)}
                  />
                  <FormField
                    name="vehicle_id"
                    label="Véhicule"
                    type="select"
                    options={[{ value: '', label: 'Sélectionner un véhicule' }, ...vehicles.map(vehicle => ({ value: vehicle.id, label: `${vehicle.plate} - ${vehicle.type}` }))]}
                    placeholder="Sélectionner un véhicule"
                    disabled={(!canEditForm && !!editingFuel) || (!canAddForm && !editingFuel)}
                  />
                  <FormField
                    name="liters"
                    label="Litres"
                    type="number"
                    step="0.1"
                    disabled={(!canEditForm && !!editingFuel) || (!canAddForm && !editingFuel)}
                  />
                  <FormField
                    name="price_per_liter"
                    label="Prix par litre (TND)"
                    type="number"
                    step="0.01"
                    disabled={(!canEditForm && !!editingFuel) || (!canAddForm && !editingFuel)}
                  />
                  <FormField
                    name="mileage"
                    label="Kilométrage"
                    type="number"
                    disabled={(!canEditForm && !!editingFuel) || (!canAddForm && !editingFuel)}
                  />
                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleCloseModal}
                      className="hover-lift"
                    >
                      Annuler
                    </Button>
                    {(canAddForm && !editingFuel) || (canEditForm && editingFuel) ? (
                      <Button
                        type="submit"
                        className="hover-lift"
                      >
                        Sauvegarder
                      </Button>
                    ) : null}
                  </DialogFooter>
                </form>
              </FormProvider>
            </DialogContent>
          </Dialog>
        </div>
      );
    };
    
    export default FuelManagement;