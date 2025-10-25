import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Calendar, Loader2 } from 'lucide-react'; // Import Loader2
import { Tour, DataTableColumn, Resource, Action, OperationResult } from '../types';
import { showLoading, updateToast } from '../utils/toast';
import { formatDate } from '../utils/date';
import { Button } from './ui/button';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { tourSchema } from '../types/formSchemas';
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
// import { usePermissions } from '../hooks/usePermissions'; // Removed import
import { LOCAL_STORAGE_KEYS } from '../utils/constants';
import FormField from './forms/FormField';
import { useFleetData } from '../components/FleetDataProvider';

type TourFormData = z.infer<typeof tourSchema>;

interface ToursProps {
  onAdd: (tableName: Resource, tour: Omit<Tour, 'id' | 'user_id' | 'created_at'>, action: Action) => Promise<OperationResult>;
  onUpdate: (tableName: Resource, tour: Tour, action: Action) => Promise<OperationResult>;
  onDelete: (tableName: Resource, data: { id: string }, action: Action) => Promise<OperationResult>;
}

const Tours: React.FC<ToursProps> = ({ onAdd, onUpdate, onDelete }) => {
  // const { canAccess } = usePermissions(); // Removed usePermissions

  const { fleetData, isLoadingFleet, getResourcePaginationState, setResourcePaginationState } = useFleetData();
  const tours = fleetData.tours;
  const vehicles = fleetData.vehicles;
  const drivers = fleetData.drivers;

  // Get and set pagination/sorting states from FleetDataProvider with default values
  const {
    currentPage = 1,
    itemsPerPage = 10,
    sortColumn = 'date',
    sortDirection = 'desc',
    totalCount = 0 // Corrected: totalCount is now destructured and used with default
  } = getResourcePaginationState('tours') || {};
  void totalCount; // Suppress TS6133 for totalCount

  const onPageChange = useCallback((page: number) => setResourcePaginationState('tours', { currentPage: page }), [setResourcePaginationState]);
  const onItemsPerPageChange = useCallback((count: number) => setResourcePaginationState('tours', { itemsPerPage: count }), [setResourcePaginationState]);
  const onSortChange = useCallback((column: string, direction: 'asc' | 'desc') => setResourcePaginationState('tours', { sortColumn: column, sortDirection: direction }), [setResourcePaginationState]);


  const [showModal, setShowModal] = useState(false);
  const [editingTour, setEditingTour] = useState<Tour | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false); // Add isSubmitting state

  const methods = useForm<TourFormData>({
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

  const { handleSubmit, watch, reset, setValue, formState: { errors = {} } } = methods;

  const status = watch('status');
  const kmStart = watch('km_start');
  const kmEnd = watch('km_end');

  const resetFormAndClearStorage = useCallback(() => {
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
    localStorage.removeItem(LOCAL_STORAGE_KEYS.TOUR_FORM_DATA);
  }, [reset]);

  useEffect(() => {
    if (showModal && !editingTour) {
      const savedFormData = localStorage.getItem(LOCAL_STORAGE_KEYS.TOUR_FORM_DATA);
      if (savedFormData) {
        try {
          const parsedData = JSON.parse(savedFormData);
          if (parsedData.date) {
            parsedData.date = new Date(parsedData.date).toISOString().split('T')[0];
          }
          reset(parsedData);
        } catch (e: unknown) {
          console.error("Failed to parse saved tour form data", e instanceof Error ? e.message : String(e));
          localStorage.removeItem(LOCAL_STORAGE_KEYS.TOUR_FORM_DATA);
        }
      }
    }
  }, [showModal, editingTour, reset]);

  useEffect(() => {
    if (showModal && !editingTour) {
      const subscription = watch((value: Partial<TourFormData>) => { // Explicitly type value
        localStorage.setItem(LOCAL_STORAGE_KEYS.TOUR_FORM_DATA, JSON.stringify(value));
      });
      return () => subscription.unsubscribe();
    }
  }, [showModal, editingTour, watch]);

  React.useEffect(() => {
    if (editingTour) {
      reset({
        ...editingTour,
        fuel_start: editingTour.fuel_start ?? null,
        km_start: editingTour.km_start ?? null,
        fuel_end: editingTour.fuel_end ?? null,
        km_end: editingTour.km_end ?? null,
        distance: editingTour.distance ?? null,
      });
    } else {
      resetFormAndClearStorage();
    }
  }, [editingTour, resetFormAndClearStorage]);

  useEffect(() => {
    if (status === 'Terminé' && kmStart != null && kmEnd != null && kmEnd >= kmStart) {
      setValue('distance', kmEnd - kmStart);
    } else if (status !== 'Terminé') {
      setValue('distance', null);
    }
  }, [status, kmStart, kmEnd, setValue]);

  const [selectedVehicle, setSelectedVehicle] = useState<string>('');
  const [selectedDriver, setSelectedDriver] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const handleAddTour = () => {
    setEditingTour(null);
    resetFormAndClearStorage();
    setShowModal(true);
  };

  const handleEditTour = (tour: Tour) => {
    setEditingTour(tour);
    setShowModal(true);
  };

  const onSubmit = async (formData: TourFormData) => {
    setIsSubmitting(true); // Set submitting to true
    const loadingToastId = showLoading(editingTour ? 'Mise à jour de la tournée...' : 'Ajout de la tournée...');
    let result: OperationResult;
    try {
      if (editingTour) {
        result = await onUpdate('tours', { ...editingTour, ...formData, id: editingTour.id, user_id: editingTour.user_id, created_at: editingTour.created_at }, 'edit');
      } else {
        result = await onAdd('tours', formData, 'add');
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

  const getStatusBadge = (status: string) => {
    const classes = {
      'Planifié': 'bg-blue-100 text-blue-800',
      'En cours': 'bg-yellow-100 text-yellow-800',
      'Terminé': 'bg-green-100 text-green-800',
      'Annulé': 'bg-red-100 text-red-800'
    };
    return <span className={`px-3 py-1 text-xs rounded-full font-medium ${classes[status as keyof typeof classes] || 'bg-gray-100 text-gray-800'}`}>{status}</span>;
  };

  const calculateConsumption = (tour: Tour): string => {
    if (tour.distance != null && tour.distance > 0 && tour.fuel_start != null && tour.fuel_end != null) {
      const fuelConsumed = tour.fuel_start - tour.fuel_end;
      if (fuelConsumed > 0) {
        return ((fuelConsumed / tour.distance) * 100).toFixed(1);
      }
    }
    return '-';
  };

  const columns: DataTableColumn<Tour>[] = useMemo(() => [
    { key: 'date', label: 'Date', sortable: true, defaultVisible: true, render: (item) => formatDate(item.date) },
    {
      key: 'vehicle_id',
      label: 'Véhicule',
      sortable: true,
      defaultVisible: true,
      render: (item) => vehicles.find(v => v.id === item.vehicle_id)?.plate || 'N/A',
    },
    {
      key: 'driver_id',
      label: 'Conducteur',
      sortable: true,
      defaultVisible: true,
      render: (item) => drivers.find(d => d.id === item.driver_id)?.name || 'N/A',
    },
    { key: 'status', label: 'Statut', sortable: true, defaultVisible: true, render: (item) => getStatusBadge(item.status) },
    { key: 'fuel_start', label: 'Fuel Début (%)', sortable: true, defaultVisible: true, render: (item) => item.fuel_start != null ? `${item.fuel_start}%` : '-' },
    { key: 'km_start', label: 'Km Début', sortable: true, defaultVisible: true, render: (item) => item.km_start != null ? item.km_start.toLocaleString() : '-' },
    { key: 'fuel_end', label: 'Fuel Fin (%)', sortable: true, defaultVisible: true, render: (item) => item.fuel_end != null ? `${item.fuel_end}%` : '-' },
    { key: 'km_end', label: 'Km Fin', sortable: true, defaultVisible: true, render: (item) => item.km_end != null ? item.km_end.toLocaleString() : '-' },
    { key: 'distance', label: 'Distance (km)', sortable: true, defaultVisible: true, render: (item) => item.distance != null ? `${item.distance.toLocaleString()} km` : '-' },
    { key: 'consumption_per_100km', label: 'L/100km', sortable: false, defaultVisible: true, render: (item) => calculateConsumption(item) },
  ], [vehicles, drivers]);

  const renderFilters = useCallback((searchTerm: string, setSearchTerm: (term: string) => void) => {
    const uniqueStatuses = Array.from(new Set(tours.map(t => t.status)));
    return (
      <>
        <div className="relative">
          <input
            type="text"
            placeholder="Rechercher par date, véhicule, conducteur ou statut..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all glass"
          />
        </div>
        <div>
          <select
            value={selectedVehicle}
            onChange={(e) => {
              setSelectedVehicle(e.target.value);
            }}
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
        <div>
          <select
            value={selectedDriver}
            onChange={(e) => setSelectedDriver(e.target.value)}
            className="w-full glass border border-gray-300 rounded-lg px-4 py-3 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Tous les conducteurs</option>
            {drivers.map(driver => (
              <option key={driver.id} value={driver.id}>
                {driver.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-full glass border border-gray-300 rounded-lg px-4 py-3 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Tous les statuts</option>
            {uniqueStatuses.map(status => (
              <option key={status} value={status}>{status}</option>
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
  }, [vehicles, drivers, tours, selectedVehicle, selectedDriver, selectedStatus, startDate, endDate]);

  const filterData = useCallback((item: Tour) => {
    const matchesVehicle = selectedVehicle ? item.vehicle_id === selectedVehicle : true;
    const matchesDriver = selectedDriver ? item.driver_id === selectedDriver : true;
    const matchesStatus = selectedStatus ? item.status === selectedStatus : true;

    const tourDate = new Date(item.date);
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;

    const matchesDateRange =
      (!start || tourDate >= start) &&
      (!end || tourDate <= end);

    return matchesVehicle && matchesDriver && matchesStatus && matchesDateRange;
  }, [selectedVehicle, selectedDriver, selectedStatus, startDate, endDate]);

  const canAddForm = true; // All authenticated users can add their own data
  const canEditForm = true; // All authenticated users can edit their own data

  return (
    <>
      <DataTable
        title="Suivi des Tournées"
        data={tours}
        columns={columns}
        onAdd={canAddForm ? handleAddTour : undefined}
        onEdit={canEditForm ? handleEditTour : undefined}
        onDelete={true ? async (id) => { // All authenticated users can delete their own data
          const loadingToastId = showLoading('Suppression de la tournée...');
          const result = await onDelete('tours', { id }, 'delete');
          if (result.success) {
            updateToast(loadingToastId, result.message || 'Tournée supprimée avec succès !', 'success');
          } else {
            updateToast(loadingToastId, result.error || 'Erreur lors de la suppression de la tournée.', 'error');
          }
        } : undefined}
        addLabel="Nouvelle Tournée"
        searchPlaceholder="Rechercher par date, véhicule, conducteur ou statut..."
        exportFileName="tournees"
        isLoading={isLoadingFleet}
        renderFilters={renderFilters}
        customFilter={filterData}
        resourceType="tours"
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
        <DialogContent className="sm:max-w-[600px] glass animate-scale-in">
          <DialogHeader>
            <DialogTitle>{editingTour ? 'Modifier une Tournée' : 'Ajouter une Tournée'}</DialogTitle>
            <DialogDescription>
              {editingTour ? 'Modifiez les détails de la tournée.' : 'Ajoutez une nouvelle tournée.'}
            </DialogDescription>
          </DialogHeader>
          <FormProvider {...methods}>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  name="date"
                  label="Date"
                  type="date"
                  disabled={isSubmitting || (!canEditForm && !!editingTour) || (!canAddForm && !editingTour)}
                />
                <FormField
                  name="status"
                  label="Statut"
                  type="select"
                  options={[
                    { value: 'Planifié', label: 'Planifié' },
                    { value: 'En cours', label: 'En cours' },
                    { value: 'Terminé', label: 'Terminé' },
                    { value: 'Annulé', label: 'Annulé' },
                  ]}
                  disabled={isSubmitting || (!canEditForm && !!editingTour) || (!canAddForm && !editingTour)}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  name="vehicle_id"
                  label="Véhicule"
                  type="select"
                  options={[{ value: '', label: 'Sélectionner un véhicule' }, ...vehicles.map(vehicle => ({ value: vehicle.id, label: `${vehicle.plate} - ${vehicle.type}` }))]}
                  placeholder="Sélectionner un véhicule"
                  disabled={isSubmitting || (!canEditForm && !!editingTour) || (!canAddForm && !editingTour)}
                />
                <FormField
                  name="driver_id"
                  label="Conducteur"
                  type="select"
                  options={[{ value: '', label: 'Sélectionner un conducteur' }, ...drivers.map(driver => ({ value: driver.id, label: driver.name }))]}
                  placeholder="Sélectionner un conducteur"
                  disabled={isSubmitting || (!canEditForm && !!editingTour) || (!canAddForm && !editingTour)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  name="fuel_start"
                  label="Niveau fuel début (%)"
                  type="number"
                  min={0}
                  max={100}
                  disabled={isSubmitting || ((!canEditForm && !!editingTour) || (!canAddForm && !editingTour)) || (status !== 'En cours' && status !== 'Terminé')}
                />
                <FormField
                  name="km_start"
                  label="Km début"
                  type="number"
                  min={0}
                  disabled={isSubmitting || ((!canEditForm && !!editingTour) || (!canAddForm && !editingTour)) || (status !== 'En cours' && status !== 'Terminé')}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  name="fuel_end"
                  label="Niveau fuel fin (%)"
                  type="number"
                  min={0}
                  max={100}
                  disabled={isSubmitting || ((!canEditForm && !!editingTour) || (!canAddForm && !editingTour)) || (status !== 'Terminé')}
                />
                <FormField
                  name="km_end"
                  label="Km fin"
                  type="number"
                  min={0}
                  disabled={isSubmitting || ((!canEditForm && !!editingTour) || (!canAddForm && !editingTour)) || (status !== 'Terminé')}
                />
              </div>

              <FormField
                name="distance"
                label="Distance (km)"
                type="number"
                min={0}
                disabled={isSubmitting || ((!canEditForm && !!editingTour) || (!canAddForm && !editingTour)) || (status === 'Terminé')}
              />

              {errors.status && errors.status.message && (
                <p className="text-red-500 text-sm mt-1">{errors.status.message}</p>
              )}

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
                {(canAddForm && !editingTour) || (canEditForm && editingTour) ? (
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
    </>
  );
};

export default Tours;