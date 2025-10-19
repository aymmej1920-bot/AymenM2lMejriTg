import React, { useState, useMemo } from 'react';
import { FleetData, Vehicle, DataTableColumn } from '../types';
import { showSuccess } from '../utils/toast';
import { formatDate } from '../utils/date';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from './ui/dialog';
import DataTable from './DataTable';
import { vehicleSchema } from '../types/formSchemas'; // Import the schema
import { z } from 'zod';
import { useForm, FormProvider } from 'react-hook-form'; // Import useForm and FormProvider
import { zodResolver } from '@hookform/resolvers/zod'; // Import zodResolver
import FormField from './forms/FormField'; // Import FormField
import { Button } from './ui/button'; // Import Button for DialogFooter
import { useSession } from './SessionContextProvider'; // Import useSession
import { canAccess } from '../utils/permissions'; // Import canAccess

type VehicleFormData = z.infer<typeof vehicleSchema>;

interface VehiclesProps {
  data: FleetData;
  // userRole: 'admin' | 'direction' | 'utilisateur'; // Removed prop
  onAdd: (vehicle: Omit<Vehicle, 'id' | 'user_id' | 'created_at'>) => void;
  onUpdate: (vehicle: Vehicle) => void;
  onDelete: (id: string) => void;
}

const Vehicles: React.FC<VehiclesProps> = ({ data, onAdd, onUpdate, onDelete }) => {
  const { currentUser } = useSession(); // Use useSession directly
  const userRole = currentUser?.role || 'utilisateur';

  const [showModal, setShowModal] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);

  const methods = useForm<VehicleFormData>({
    resolver: zodResolver(vehicleSchema),
    defaultValues: useMemo(() => editingVehicle || {
      plate: '',
      type: 'Camionnette',
      status: 'Disponible',
      mileage: 0,
      last_service_date: new Date().toISOString().split('T')[0],
      last_service_mileage: 0,
    }, [editingVehicle]),
  });

  const { handleSubmit, reset } = methods;

  React.useEffect(() => {
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

  const columns: DataTableColumn<Vehicle>[] = useMemo(() => [
    { key: 'plate', label: 'Plaque', sortable: true, defaultVisible: true },
    { key: 'type', label: 'Type', sortable: true, defaultVisible: true },
    { 
      key: 'status', 
      label: 'Statut', 
      sortable: true, 
      defaultVisible: true, 
      render: (item) => {
        const classes = {
          'Disponible': 'bg-green-100 text-green-800',
          'En mission': 'bg-orange-100 text-orange-800',
          'Maintenance': 'bg-red-100 text-red-800'
        };
        return <span className={`px-3 py-1 text-xs rounded-full font-medium ${classes[item.status as keyof typeof classes] || 'bg-gray-100 text-gray-800'}`}>{item.status}</span>;
      }
    },
    { key: 'mileage', label: 'Kilométrage', sortable: true, defaultVisible: true, render: (item) => `${item.mileage.toLocaleString()} km` },
    { key: 'last_service_date', label: 'Dernière Vidange', sortable: true, defaultVisible: true, render: (item) => `${formatDate(item.last_service_date)} (${(item.last_service_mileage || 0).toLocaleString()} km)` },
    {
      key: 'next_service',
      label: 'Prochaine Vidange',
      sortable: false,
      defaultVisible: true,
      render: (item) => {
        const nextService = (item.last_service_mileage || 0) + 10000;
        const kmUntilService = nextService - item.mileage;
        
        let serviceStatusClass = 'text-green-600';
        let serviceStatusText = '';

        if (kmUntilService <= 0) {
          serviceStatusClass = 'text-red-600 font-bold';
          serviceStatusText = 'URGENT!';
        } else if (kmUntilService <= 1000) {
          serviceStatusClass = 'text-orange-600 font-bold';
          serviceStatusText = `${kmUntilService.toLocaleString()} km restants - Bientôt`;
        } else {
          serviceStatusText = `${kmUntilService.toLocaleString()} km restants`;
        }

        return (
          <div className={serviceStatusClass}>
            {nextService.toLocaleString()} km
            <br />
            <span className="text-xs">({serviceStatusText})</span>
          </div>
        );
      },
    },
  ], []);

  const canEditForm = canAccess(userRole, 'vehicles', 'edit');
  const canAddForm = canAccess(userRole, 'vehicles', 'add');

  return (
    <>
      <DataTable
        title="Gestion des Véhicules"
        data={data.vehicles}
        columns={columns}
        onAdd={canAddForm ? handleAddVehicle : undefined}
        onEdit={canEditForm ? handleEditVehicle : undefined}
        onDelete={canAccess(userRole, 'vehicles', 'delete') ? onDelete : undefined}
        addLabel="Ajouter Véhicule"
        searchPlaceholder="Rechercher par plaque, type ou statut..."
        exportFileName="vehicules"
        isLoading={false}
        resourceType="vehicles" // Pass resource type
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
          <FormProvider {...methods}>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
              <FormField name="plate" label="Plaque d'immatriculation" type="text" placeholder="Ex: 123TU456" disabled={(!canEditForm && !!editingVehicle) || (!canAddForm && !editingVehicle)} />
              <FormField name="type" label="Type de véhicule" type="select" options={[
                { value: 'Camionnette', label: 'Camionnette' },
                { value: 'Camion', label: 'Camion' },
                { value: 'Fourgon', label: 'Fourgon' },
                { value: 'Utilitaire', label: 'Utilitaire' },
              ]} disabled={(!canEditForm && !!editingVehicle) || (!canAddForm && !editingVehicle)} />
              <FormField name="status" label="Statut" type="select" options={[
                { value: 'Disponible', label: 'Disponible' },
                { value: 'En mission', label: 'En mission' },
                { value: 'Maintenance', label: 'Maintenance' },
              ]} disabled={(!canEditForm && !!editingVehicle) || (!canAddForm && !editingVehicle)} />
              <FormField name="mileage" label="Kilométrage actuel" type="number" min={0} disabled={(!canEditForm && !!editingVehicle) || (!canAddForm && !editingVehicle)} />
              <FormField name="last_service_date" label="Date dernière vidange" type="date" disabled={(!canEditForm && !!editingVehicle) || (!canAddForm && !editingVehicle)} />
              <FormField name="last_service_mileage" label="Kilométrage dernière vidange" type="number" min={0} disabled={(!canEditForm && !!editingVehicle) || (!canAddForm && !editingVehicle)} />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
                  Annuler
                </Button>
                {(canAddForm && !editingVehicle) || (canEditForm && editingVehicle) ? (
                  <Button type="submit">
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

export default Vehicles;