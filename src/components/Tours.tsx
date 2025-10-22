import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Calendar } from 'lucide-react'; // Seul Calendar est utilisé dans le formulaire
import { Tour, DataTableColumn, Resource, Action } from '../types';
import { showSuccess } from '../utils/toast';
import { formatDate } from '../utils/date';
import { Button } from './ui/button';
import { useForm, FormProvider } from 'react-hook-form'; // Import FormProvider
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
import DataTable from './DataTable'; // Import the new DataTable component
import { usePermissions } from '../hooks/usePermissions'; // Import usePermissions
import { LOCAL_STORAGE_KEYS } from '../utils/constants'; // Import constants
import FormField from './forms/FormField'; // Import FormField
import { useFleetData } from '../components/FleetDataProvider'; // Import useFleetData

type TourFormData = z.infer<typeof tourSchema>;

interface ToursProps {
  onAdd: (tableName: Resource, tour: Omit<Tour, 'id' | 'user_id' | 'created_at'>, action: Action) => Promise<void>;
  onUpdate: (tableName: Resource, tour: Tour, action: Action) => Promise<void>;
  onDelete: (tableName: Resource, data: { id: string }, action: Action) => Promise<void>;
  // registerRefetch: (resource: Resource, refetch: () => Promise<void>) => void; // Removed
}

const Tours: React.FC<ToursProps> = ({ onAdd, onUpdate, onDelete }) => {
  const { canAccess } = usePermissions(); // Use usePermissions hook

  // Consume data from FleetContext
  const { fleetData, isLoadingFleet } = useFleetData();
  const tours = fleetData.tours;
  const vehicles = fleetData.vehicles;
  const drivers = fleetData.drivers;

  const [showModal, setShowModal] = useState(false);
  const [editingTour, setEditingTour] = useState<Tour | null>(null);

  const methods = useForm<TourFormData>({ // Use methods from useForm
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

  const { handleSubmit, watch, reset, setValue, formState: { errors = {} } } = methods; // Destructure from methods

  const status = watch('status');
  const kmStart = watch('km_start');
  const kmEnd = watch('km_end');

  // Function to reset form and clear saved data
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

  // Effect to load saved form data when modal opens for a new tour
  useEffect(() => {
    if (showModal && !editingTour) { // Only for new tour forms
      const savedFormData = localStorage.getItem(LOCAL_STORAGE_KEYS.TOUR_FORM_DATA);
      if (savedFormData) {
        try {
          const parsedData = JSON.parse(savedFormData);
          if (parsedData.date) {
            parsedData.date = new Date(parsedData.date).toISOString().split('T')[0];
          }
          reset(parsedData);
        } catch (e) {
          console.error("Failed to parse saved tour form data", e);
          localStorage.removeItem(LOCAL_STORAGE_KEYS.TOUR_FORM_DATA);
        }
      }
    }
  }, [showModal, editingTour, reset]);

  // Effect to save form data to localStorage whenever it changes (for new tour forms)
  useEffect(() => {
    if (showModal && !editingTour) { // Only save for new tour forms
      const subscription = watch((value) => {
        localStorage.setItem(LOCAL_STORAGE_KEYS.TOUR_FORM_DATA, JSON.stringify(value));
      });
      return () => subscription.unsubscribe();
    }
  }, [showModal, editingTour, watch]);

  // Reset form when editingTour changes (for edit mode) or when modal closes (for new mode)
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
      resetFormAndClearStorage(); // Use the new reset function
    }
  }, [editingTour, resetFormAndClearStorage]);

  // Effect to calculate distance automatically
  useEffect(() => {
    // Use != null to check for both null and undefined
    if (status === 'Terminé' && kmStart != null && kmEnd != null && kmEnd >= kmStart) {
      setValue('distance', kmEnd - kmStart);
    } else if (status !== 'Terminé') {
      setValue('distance', null); // Clear distance if not 'Terminé'
    }
  }, [status, kmStart, kmEnd, setValue]);

  // State for custom filters
  const [selectedVehicle, setSelectedVehicle] = useState<string>('');
  const [selectedDriver, setSelectedDriver] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const handleAddTour = () => {
    setEditingTour(null);
    resetFormAndClearStorage(); // Clear any previous unsaved data
    setShowModal(true);
  };

  const handleEditTour = (tour: Tour) => {
    setEditingTour(tour);
    setShowModal(true);
  };

  const onSubmit = async (formData: TourFormData) => {
    if (editingTour) {
      await onUpdate('tours', { ...editingTour, ...formData, id: editingTour.id, user_id: editingTour.user_id, created_at: editingTour.created_at }, 'edit');
      showSuccess('Tournée mise à jour avec succès !');
    } else {
      await onAdd('tours', formData, 'add');
      showSuccess('Tournée ajoutée avec succès !');
    }
    setShowModal(false);
    resetFormAndClearStorage(); // Clear saved data on successful submission
  };

  const handleCloseModal = () => {
    setShowModal(false);
    resetFormAndClearStorage(); // Clear saved data on modal close
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
  ], [vehicles, drivers]); // Dependencies for memoization

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
        <div>
          <select
            value={selectedDriver}
            onChange={(e) => setSelectedDriver(e.target.value)}
            className="w-full glass border border-gray-300 rounded-lg px-4 py-3 shadow-sm focus:ring-blue-500 focus:border-blue-500"
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
            className="w-full glass border border-gray-300 rounded-lg px-4 py-3 shadow-sm focus:ring-blue-500 focus:border-blue-500"
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
            className="w-full glass border border-gray-300 rounded-lg pl-4 pr-10 py-3 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            placeholder="Date de début"
          />
          <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
        </div>
        <div className="relative">
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full glass border border-gray-300 rounded-lg pl-4 pr-10 py-3 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
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

  const canAddForm = canAccess('tours', 'add');
  const canEditForm = canAccess('tours', 'edit');

  return (
    <>
      <DataTable
        title="Suivi des Tournées"
        data={tours} // Pass all data, DataTable will handle filtering
        columns={columns}
        onAdd={canAddForm ? handleAddTour : undefined}
        onEdit={canEditForm ? handleEditTour : undefined}
        onDelete={canAccess('tours', 'delete') ? (id) => onDelete('tours', { id }, 'delete') : undefined}
        addLabel="Nouvelle Tournée"
        searchPlaceholder="Rechercher par date, véhicule, conducteur ou statut..."
        exportFileName="tournees"
        isLoading={isLoadingFleet}
        renderFilters={renderFilters}
        customFilter={filterData} // Pass the custom filter function
        resourceType="tours" // Pass resource type
      />

      {/* Modal */}
      <Dialog open={showModal} onOpenChange={handleCloseModal}>
        <DialogContent className="sm:max-w-[600px] glass animate-scale-in">
          <DialogHeader>
            <DialogTitle>{editingTour ? 'Modifier une Tournée' : 'Ajouter une Tournée'}</DialogTitle>
            <DialogDescription>
              {editingTour ? 'Modifiez les détails de la tournée.' : 'Ajoutez une nouvelle tournée.'}
            </DialogDescription>
          </DialogHeader>
          <FormProvider {...methods}> {/* Wrap the form with FormProvider */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  name="date"
                  label="Date"
                  type="date"
                  disabled={(!canEditForm && !!editingTour) || (!canAddForm && !editingTour)}
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
                  disabled={(!canEditForm && !!editingTour) || (!canAddForm && !editingTour)}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  name="vehicle_id"
                  label="Véhicule"
                  type="select"
                  options={[{ value: '', label: 'Sélectionner un véhicule' }, ...vehicles.map(vehicle => ({ value: vehicle.id, label: `${vehicle.plate} - ${vehicle.type}` }))]}
                  placeholder="Sélectionner un véhicule"
                  disabled={(!canEditForm && !!editingTour) || (!canAddForm && !editingTour)}
                />
                <FormField
                  name="driver_id"
                  label="Conducteur"
                  type="select"
                  options={[{ value: '', label: 'Sélectionner un conducteur' }, ...drivers.map(driver => ({ value: driver.id, label: driver.name }))]}
                  placeholder="Sélectionner un conducteur"
                  disabled={(!canEditForm && !!editingTour) || (!canAddForm && !editingTour)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  name="fuel_start"
                  label="Niveau fuel début (%)"
                  type="number"
                  min={0}
                  max={100}
                  disabled={((!canEditForm && !!editingTour) || (!canAddForm && !editingTour)) || (status !== 'En cours' && status !== 'Terminé')}
                />
                <FormField
                  name="km_start"
                  label="Km début"
                  type="number"
                  min={0}
                  disabled={((!canEditForm && !!editingTour) || (!canAddForm && !editingTour)) || (status !== 'En cours' && status !== 'Terminé')}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  name="fuel_end"
                  label="Niveau fuel fin (%)"
                  type="number"
                  min={0}
                  max={100}
                  disabled={((!canEditForm && !!editingTour) || (!canAddForm && !editingTour)) || (status !== 'Terminé')}
                />
                <FormField
                  name="km_end"
                  label="Km fin"
                  type="number"
                  min={0}
                  disabled={((!canEditForm && !!editingTour) || (!canAddForm && !editingTour)) || (status !== 'Terminé')}
                />
              </div>

              <FormField
                name="distance"
                label="Distance (km)"
                type="number"
                min={0}
                disabled={((!canEditForm && !!editingTour) || (!canAddForm && !editingTour)) || (status === 'Terminé')}
                // readOnly={status === 'Terminé'} // FormField handles readOnly via disabled prop
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
                >
                  Annuler
                </Button>
                {(canAddForm && !editingTour) || (canEditForm && editingTour) ? (
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
    </>
  );
};

export default Tours;