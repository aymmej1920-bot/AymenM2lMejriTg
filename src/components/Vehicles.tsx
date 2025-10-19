import React, { useState, useMemo, useEffect } from 'react';
import { Calendar } from 'lucide-react'; // Only Calendar is used in the form
import { FleetData, Vehicle, DataTableColumn } from '../types';
import { showSuccess } from '../utils/toast';
import { formatDate } from '../utils/date';
import { Button } from './ui/button';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { vehicleSchema } from '../types/formSchemas';
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

type VehicleFormData = z.infer<typeof vehicleSchema>;

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

  const { register, handleSubmit, reset, formState: { errors = {} } } = useForm<VehicleFormData>({
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

  const handleAddVehicle = () => {
    setEditingVehicle(null);
    setShowModal(true);
  };

  const handleEditVehicle = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle);
    setShowModal(true);
  };

  const onSubmit = (formData: VehicleFormData) => {
    if (editingVehicle) {
      onUpdate({ ...formData, id: editingVehicle.id, user_id: editingVehicle.user_id, created_at: editingVehicle.created_at });
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
    return <span className={`px-3 py-1 text-xs rounded-full font-medium ${classes[status as keyof typeof classes] || 'bg-gray-100 text-gray-800'}`}>{status}</span>;
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

  const columns: DataTableColumn<Vehicle>[] = useMemo(() => [
    { key: 'plate', label: 'Plaque', sortable: true, defaultVisible: true },
    { key: 'type', label: 'Type', sortable: true, defaultVisible: true },
    { key: 'status', label: 'Statut', sortable: true, defaultVisible: true, render: (item) => getStatusBadge(item.status) },
    { key: 'mileage', label: 'Kilométrage', sortable: true, defaultVisible: true, render: (item) => `${item.mileage.toLocaleString()} km` },
    { key: 'last_service_date', label: 'Dernière Vidange', sortable: true, defaultVisible: true, render: (item) => `${formatDate(item.last_service_date)} (${(item.last_service_mileage || 0).toLocaleString()} km)` },
    {
      key: 'next_service',
      label: 'Prochaine Vidange',
      sortable: false, // This is a derived value, sorting might be complex
      defaultVisible: true,
      render: (item) => {
        const serviceStatus = getServiceStatus(item);
        const nextServiceKm = (item.last_service_mileage || 0) + 10000;
        return (
          <div className={serviceStatus.class}>
            {nextServiceKm.toLocaleString()} km
            <br />
            <span className="text-xs">({serviceStatus.text})</span>
          </div>
        );
      },
    },
  ], [data]); // Re-memoize if data changes, as getServiceStatus depends on it

  return (
    <>
      <DataTable
        title="Gestion des Véhicules"
        data={data.vehicles}
        columns={columns}
        onAdd={handleAddVehicle}
        onEdit={handleEditVehicle}
        onDelete={onDelete}
        addLabel="Ajouter Véhicule"
        searchPlaceholder="Rechercher par plaque, type ou statut..."
        exportFileName="vehicules"
        isLoading={false} // Adjust based on actual loading state if needed
      />

      {/* Modal for Add/Edit Vehicle */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-[425px] bg-gray-50">
          <DialogHeader>
            <DialogTitle>{editingVehicle ? 'Modifier un Véhicule' : 'Ajouter un Véhicule'}</DialogTitle>
            <DialogDescription>
              {editingVehicle ? 'Modifiez les détails du véhicule.' : 'Ajoutez un nouveau véhicule à votre flotte.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
            <div>
              <label htmlFor="plate" className="block text-sm font-semibold mb-2 text-gray-900">Plaque d'immatriculation</label>
              <input
                id="plate"
                type="text"
                {...register('plate')}
                className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 shadow-sm focus:ring-blue-500 focus:border-blue-500"
              />
              {errors.plate && <p className="text-red-500 text-sm mt-1">{errors.plate.message}</p>}
            </div>
            <div>
              <label htmlFor="type" className="block text-sm font-semibold mb-2 text-gray-900">Type de véhicule</label>
              <select
                id="type"
                {...register('type')}
                className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 shadow-sm focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="Camionnette">Camionnette</option>
                <option value="Camion">Camion</option>
                <option value="Fourgon">Fourgon</option>
                <option value="Utilitaire">Utilitaire</option>
              </select>
              {errors.type && <p className="text-red-500 text-sm mt-1">{errors.type.message}</p>}
            </div>
            <div>
              <label htmlFor="status" className="block text-sm font-semibold mb-2 text-gray-900">Statut</label>
              <select
                id="status"
                {...register('status')}
                className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 shadow-sm focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="Disponible">Disponible</option>
                <option value="En mission">En mission</option>
                <option value="Maintenance">Maintenance</option>
              </select>
              {errors.status && <p className="text-red-500 text-sm mt-1">{errors.status.message}</p>}
            </div>
            <div>
              <label htmlFor="mileage" className="block text-sm font-semibold mb-2 text-gray-900">Kilométrage actuel</label>
              <input
                id="mileage"
                type="number"
                {...register('mileage', { valueAsNumber: true })}
                className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 shadow-sm focus:ring-blue-500 focus:border-blue-500"
              />
              {errors.mileage && <p className="text-red-500 text-sm mt-1">{errors.mileage.message}</p>}
            </div>
            <div>
              <label htmlFor="last_service_date" className="block text-sm font-semibold mb-2 text-gray-900">Date dernière vidange</label>
              <div className="relative flex items-center">
                <input
                  id="last_service_date"
                  type="date"
                  {...register('last_service_date')}
                  className="w-full bg-white border border-gray-300 rounded-lg pl-4 pr-10 py-3 shadow-sm focus:ring-blue-500 focus:border-blue-500"
                />
                <Calendar className="absolute right-3 w-5 h-5 text-gray-400 pointer-events-none" />
              </div>
              {errors.last_service_date && <p className="text-red-500 text-sm mt-1">{errors.last_service_date.message}</p>}
            </div>
            <div>
              <label htmlFor="last_service_mileage" className="block text-sm font-semibold mb-2 text-gray-900">Kilométrage dernière vidange</label>
              <input
                id="last_service_mileage"
                type="number"
                {...register('last_service_mileage', { valueAsNumber: true })}
                className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 shadow-sm focus:ring-blue-500 focus:border-blue-500"
              />
              {errors.last_service_mileage && <p className="text-red-500 text-sm mt-1">{errors.last_service_mileage.message}</p>}
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
    </>
  );
};

export default Vehicles;