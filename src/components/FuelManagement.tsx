import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Fuel, DollarSign, TrendingUp, Calendar, Search, Loader2 } from 'lucide-react'; // Import Loader2
import { FuelEntry, DataTableColumn, Resource, Action, OperationResult } from '../types';
import { showLoading, updateToast } from '../utils/toast';
import { formatDate } from '../utils/date';
import { Button } from './ui/button';
import { useForm, FormProvider } from 'react-hook-form';
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
import DataTable from './DataTable';
import { usePermissions } from '../hooks/usePermissions';
import { LOCAL_STORAGE_KEYS } from '../utils/constants';
import FormField from './forms/FormField';
import { useFleetData } from '../components/FleetDataProvider';

type FuelEntryFormData = z.infer<typeof fuelEntrySchema>;

interface FuelManagementProps {
  onAdd: (tableName: Resource, fuelEntry: Omit<FuelEntry, 'id' | 'user_id' | 'created_at'>, action: Action) => Promise<OperationResult>;
  onUpdate: (tableName: Resource, fuelEntry: FuelEntry, action: Action) => Promise<OperationResult>;
  onDelete: (tableName: Resource, data: { id: string }, action: Action) => Promise<OperationResult>;
}

const FuelManagement: React.FC<FuelManagementProps> = ({ onAdd, onUpdate, onDelete }) => {
  const { canAccess } = usePermissions();

  const { fleetData, isLoadingFleet, getResourcePaginationState, setResourcePaginationState } = useFleetData();
  const fuelEntries = fleetData.fuel_entries; // Updated to fuel_entries
  const vehicles = fleetData.vehicles;

  // Get and set pagination/sorting states from FleetDataProvider with default values
  const {
    currentPage = 1,
    itemsPerPage = 10,
    sortColumn = 'date',
    sortDirection = 'desc',
    totalCount = 0
  } = getResourcePaginationState('fuel_entries') || {};

  const onPageChange = useCallback((page: number) => setResourcePaginationState('fuel_entries', { currentPage: page }), [setResourcePaginationState]);
  const onItemsPerPageChange = useCallback((count: number) => setResourcePaginationState('fuel_entries', { itemsPerPage: count }), [setResourcePaginationState]);
  const onSortChange = useCallback((column: string, direction: 'asc' | 'desc') => setResourcePaginationState('fuel_entries', { sortColumn: column, sortDirection: direction }), [setResourcePaginationState]);


  const [showModal, setShowModal] = useState(false);
  const [editingFuel, setEditingFuel] = useState<FuelEntry | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false); // Add isSubmitting state

  const methods = useForm<FuelEntryFormData>({
    resolver: zodResolver(fuelEntrySchema),
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      vehicle_id: '',
      liters: 0,
      price_per_liter: 0, // Corrected property name
      mileage: 0,
    }
  });

  const { handleSubmit, reset, watch } = methods;

  const resetFormAndClearStorage = useCallback(() => {
    reset({
      date: new Date().toISOString().split('T')[0],
      vehicle_id: '',
      liters: 0,
      price_per_liter: 0, // Corrected property name
      mileage: 0,
    });
    localStorage.removeItem(LOCAL_STORAGE_KEYS.FUEL_FORM_DATA);
  }, [reset]);

  useEffect(() => {
    if (showModal && !editingFuel) {
      const savedFormData = localStorage.getItem(LOCAL_STORAGE_KEYS.FUEL_FORM_DATA);
      if (savedFormData) {
        try {
          const parsedData = JSON.parse(savedFormData);
          if (parsedData.date) {
            parsedData.date = new Date(parsedData.date).toISOString().split('T')[0];
          }
          reset(parsedData);
        } catch (e: unknown) {
          console.error("Failed to parse saved fuel form data", e instanceof Error ? e.message : String(e));
          localStorage.removeItem(LOCAL_STORAGE_KEYS.FUEL_FORM_DATA);
        }
      }
    }
  }, [showModal, editingFuel, reset]);

  useEffect(() => {
    if (showModal && !editingFuel) {
      const subscription = watch((value) => {
        localStorage.setItem(LOCAL_STORAGE_KEYS.FUEL_FORM_DATA, JSON.stringify(value));
      });
      return () => subscription.unsubscribe();
    }
  }, [showModal, editingFuel, watch]);

  React.useEffect(() => {
    if (editingFuel) {
      reset(editingFuel);
    } else {
      resetFormAndClearStorage();
    }
  }, [editingFuel, resetFormAndClearStorage]);

  const [selectedVehicle, setSelectedVehicle] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const totalLiters = fuelEntries.reduce((sum, f) => sum + f.liters, 0);
  const totalCost = fuelEntries.reduce((sum, f) => sum + (f.liters * f.price_per_liter), 0);
  const avgPrice = totalLiters > 0 ? totalCost / totalLiters : 0;

  const handleAddFuel = () => {
    setEditingFuel(null);
    resetFormAndClearStorage();
    setShowModal(true);
  };

  const handleEditFuel = (fuel: FuelEntry) => {
    setEditingFuel(fuel);
    setShowModal(true);
  };

  const onSubmit = async (formData: FuelEntryFormData) => {
    setIsSubmitting(true); // Set submitting to true
    const loadingToastId = showLoading(editingFuel ? 'Mise à jour du plein...' : 'Ajout du plein...');
    let result: OperationResult;
    try {
      if (editingFuel) {
        // formData now correctly has price_per_liter
        result = await onUpdate('fuel_entries', { ...formData, id: editingFuel.id, user_id: editingFuel.user_id, created_at: editingFuel.created_at }, 'edit');
      } else {
        // formData now correctly has price_per_liter
        result = await onAdd('fuel_entries', formData, 'add');
      }

      if (result.success) {
        updateToast(loadingToastId, result.message || 'Opération réussie !', 'success');
      } else {
        throw new Error(result.error || 'Opération échouée.');
      }
      setShowModal(false);
      resetFormAndClearStorage();
    } catch (error: unknown) {
      updateToast(loadingToastId, (error instanceof Error ? error.message : String(error)) || 'Erreur lors de l\'opération.', 'error');
    } finally {
      setIsSubmitting(false); // Set submitting to false in finally block
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    resetFormAndClearStorage();
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
            className="w-full glass border border-gray-300 rounded-lg px-4 py-3 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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

      return (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-4xl font-bold text-gray-800">Gestion du Carburant</h2>
          </div>
    
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
            onDelete={canAccess('fuel_entries', 'delete') ? async (id) => {
              const loadingToastId = showLoading('Suppression du plein...');
              const result = await onDelete('fuel_entries', { id }, 'delete');
              if (result.success) {
                updateToast(loadingToastId, result.message || 'Plein supprimé avec succès !', 'success');
              } else {
                updateToast(loadingToastId, result.error || 'Erreur lors de la suppression du plein.', 'error');
              }
            } : undefined}
            addLabel="Ajouter Plein"
            searchPlaceholder="Rechercher par date, véhicule, litres, prix ou kilométrage..."
            exportFileName="carburant"
            isLoading={isLoadingFleet}
            renderFilters={renderFilters}
            customFilter={customFilter}
            resourceType="fuel_entries"
            // Pagination and sorting props
            currentPage={currentPage}
            onPageChange={onPageChange}
            itemsPerPage={itemsPerPage}
            onItemsPerPageChange={onItemsPerPageChange}
            totalCount={totalCount}
            sortColumn={sortColumn}
            onSortChange={onSortChange}
            sortDirection={sortDirection}
          />
    
          <Dialog open={showModal} onOpenChange={handleCloseModal}>
            <DialogContent className="sm:max-w-[425px] glass animate-scale-in">
              <DialogHeader>
                <DialogTitle>{editingFuel ? 'Modifier un Plein' : 'Ajouter un Plein'}</DialogTitle>
                <DialogDescription>
                  {editingFuel ? 'Modifiez les détails du plein.' : 'Ajoutez un nouvel enregistrement de carburant.'}
                </DialogDescription>
              </DialogHeader>
              <FormProvider {...methods}>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
                  <FormField
                    name="date"
                    label="Date"
                    type="date"
                    disabled={isSubmitting || (!canEditForm && !!editingFuel) || (!canAddForm && !editingFuel)}
                  />
                  <FormField
                    name="vehicle_id"
                    label="Véhicule"
                    type="select"
                    options={[{ value: '', label: 'Sélectionner un véhicule' }, ...vehicles.map(vehicle => ({ value: vehicle.id, label: `${vehicle.plate} - ${vehicle.type}` }))]}
                    placeholder="Sélectionner un véhicule"
                    disabled={isSubmitting || (!canEditForm && !!editingFuel) || (!canAddForm && !editingFuel)}
                  />
                  <FormField
                    name="liters"
                    label="Litres"
                    type="number"
                    step="0.1"
                    disabled={isSubmitting || (!canEditForm && !!editingFuel) || (!canAddForm && !editingFuel)}
                  />
                  <FormField
                    name="price_per_liter"
                    label="Prix par litre (TND)"
                    type="number"
                    step="0.01"
                    disabled={isSubmitting || (!canEditForm && !!editingFuel) || (!canAddForm && !editingFuel)}
                  />
                  <FormField
                    name="mileage"
                    label="Kilométrage"
                    type="number"
                    disabled={isSubmitting || (!canEditForm && !!editingFuel) || (!canAddForm && !editingFuel)}
                  />
                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleCloseModal}
                      className="hover-lift"
                      disabled={isSubmitting}
                    >
                      Annuler
                    </Button>
                    {(canAddForm && !editingFuel) || (canEditForm && editingFuel) ? (
                      <Button
                        type="submit"
                        className="hover-lift"
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Sauvegarde en cours...
                          </>
                        ) : (
                          'Sauvegarder'
                        )}
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