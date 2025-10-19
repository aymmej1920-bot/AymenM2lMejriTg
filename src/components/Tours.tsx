import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Calendar } from 'lucide-react'; // Seul Calendar est utilisé dans le formulaire
import { FleetData, Tour, DataTableColumn } from '../types';
import { showSuccess } from '../utils/toast';
import { formatDate } from '../utils/date';
import { Button } from './ui/button';
import { useForm } from 'react-hook-form';
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
import { useSession } from './SessionContextProvider'; // Import useSession
import { canAccess } from '../utils/permissions'; // Import canAccess

type TourFormData = z.infer<typeof tourSchema>;

interface ToursProps {
  data: FleetData;
  userRole: 'admin' | 'direction' | 'utilisateur';
  onAdd: (tour: Omit<Tour, 'id' | 'user_id' | 'created_at'>) => void;
  onUpdate: (tour: Tour) => void;
  onDelete: (id: string) => void;
}

const Tours: React.FC<ToursProps> = ({ data, userRole, onAdd, onUpdate, onDelete }) => {
  const [showModal, setShowModal] = useState(false);
  const [editingTour, setEditingTour] = useState<Tour | null>(null);

  const { register, handleSubmit, watch, reset, formState: { errors = {} } } = useForm<TourFormData>({
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
        fuel_start: editingTour.fuel_start ?? null,
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

  // State for custom filters
  const [selectedVehicle, setSelectedVehicle] = useState<string>('');
  const [selectedDriver, setSelectedDriver] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const handleAddTour = () => {
    setEditingTour(null);
    setShowModal(true);
  };

  const handleEditTour = (tour: Tour) => {
    setEditingTour(tour);
    setShowModal(true);
  };

  const onSubmit = (formData: TourFormData) => {
    if (editingTour) {
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
      render: (item) => data.vehicles.find(v => v.id === item.vehicle_id)?.plate || 'N/A',
    },
    {
      key: 'driver_id',
      label: 'Conducteur',
      sortable: true,
      defaultVisible: true,
      render: (item) => data.drivers.find(d => d.id === item.driver_id)?.name || 'N/A',
    },
    { key: 'status', label: 'Statut', sortable: true, defaultVisible: true, render: (item) => getStatusBadge(item.status) },
    { key: 'fuel_start', label: 'Fuel Début (%)', sortable: true, defaultVisible: true, render: (item) => item.fuel_start != null ? `${item.fuel_start}%` : '-' },
    { key: 'km_start', label: 'Km Début', sortable: true, defaultVisible: true, render: (item) => item.km_start != null ? item.km_start.toLocaleString() : '-' },
    { key: 'fuel_end', label: 'Fuel Fin (%)', sortable: true, defaultVisible: true, render: (item) => item.fuel_end != null ? `${item.fuel_end}%` : '-' },
    { key: 'km_end', label: 'Km Fin', sortable: true, defaultVisible: true, render: (item) => item.km_end != null ? item.km_end.toLocaleString() : '-' },
    { key: 'distance', label: 'Distance (km)', sortable: true, defaultVisible: true, render: (item) => item.distance != null ? `${item.distance.toLocaleString()} km` : '-' },
    { key: 'consumption_per_100km', label: 'L/100km', sortable: false, defaultVisible: true, render: (item) => calculateConsumption(item) },
  ], [data.vehicles, data.drivers]); // Dependencies for memoization

  const renderFilters = useCallback((searchTerm: string, setSearchTerm: (term: string) => void) => {
    const uniqueStatuses = Array.from(new Set(data.tours.map(t => t.status)));
    return (
      <>
        <div className="relative">
          <input
            type="text"
            placeholder="Rechercher par date, véhicule, conducteur ou statut..."
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
        <div>
          <select
            value={selectedDriver}
            onChange={(e) => setSelectedDriver(e.target.value)}
            className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 shadow-sm focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Tous les conducteurs</option>
            {data.drivers.map(driver => (
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
            className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 shadow-sm focus:ring-blue-500 focus:border-blue-500"
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
  }, [data.vehicles, data.drivers, data.tours, selectedVehicle, selectedDriver, selectedStatus, startDate, endDate]);

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

  const canAddForm = canAccess(userRole, 'tours', 'add');
  const canEditForm = canAccess(userRole, 'tours', 'edit');

  return (
    <>
      <DataTable
        title="Suivi des Tournées"
        data={data.tours} // Pass all data, DataTable will handle filtering
        columns={columns}
        onAdd={canAddForm ? handleAddTour : undefined}
        onEdit={canEditForm ? handleEditTour : undefined}
        onDelete={canAccess(userRole, 'tours', 'delete') ? onDelete : undefined}
        addLabel="Nouvelle Tournée"
        searchPlaceholder="Rechercher par date, véhicule, conducteur ou statut..."
        exportFileName="tournees"
        isLoading={false}
        renderFilters={renderFilters}
        customFilter={filterData} // Pass the custom filter function
        resourceType="tours" // Pass resource type
      />

      {/* Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-[600px] bg-gray-50">
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
                <div className="relative flex items-center">
                  <input
                    id="date"
                    type="date"
                    {...register('date')}
                    className="w-full bg-white border border-gray-300 rounded-lg pl-4 pr-10 py-3 shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    disabled={!canEditForm && editingTour || !canAddForm && !editingTour}
                  />
                  <Calendar className="absolute right-3 w-5 h-5 text-gray-400 pointer-events-none" />
                </div>
                {errors.date && <p className="text-red-500 text-sm mt-1">{errors.date.message}</p>}
              </div>
              <div>
                <label htmlFor="status" className="block text-sm font-semibold mb-2 text-gray-900">Statut</label>
                <select
                  id="status"
                  {...register('status')}
                  className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  disabled={!canEditForm && editingTour || !canAddForm && !editingTour}
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
                  disabled={!canEditForm && editingTour || !canAddForm && !editingTour}
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
                  disabled={!canEditForm && editingTour || !canAddForm && !editingTour}
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
                  disabled={(!canEditForm && editingTour || !canAddForm && !editingTour) || (status !== 'En cours' && status !== 'Terminé')}
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
                  disabled={(!canEditForm && editingTour || !canAddForm && !editingTour) || (status !== 'En cours' && status !== 'Terminé')}
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
                  disabled={(!canEditForm && editingTour || !canAddForm && !editingTour) || (status !== 'Terminé')}
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
                  disabled={(!canEditForm && editingTour || !canAddForm && !editingTour) || (status !== 'Terminé')}
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
                disabled={(!canEditForm && editingTour || !canAddForm && !editingTour) || (status !== 'Terminé')}
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
              {(canAddForm && !editingTour) || (canEditForm && editingTour) ? (
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
    </>
  );
};

export default Tours;