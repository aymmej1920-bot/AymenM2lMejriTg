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
} from './ui/dialog';
import DataTable from './DataTable';
import DynamicForm, { DynamicFormFieldConfig } from './forms/DynamicForm'; // Import DynamicForm and DynamicFormFieldConfig
import { vehicleSchema } from '../types/formSchemas'; // Import the schema
import { z } from 'zod';

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

  const vehicleFormFields: DynamicFormFieldConfig<VehicleFormData>[] = useMemo(() => [
    { name: 'plate', label: "Plaque d'immatriculation", type: 'text', placeholder: "Ex: 123TU456" },
    { name: 'type', label: 'Type de véhicule', type: 'select', options: [
      { value: 'Camionnette', label: 'Camionnette' },
      { value: 'Camion', label: 'Camion' },
      { value: 'Fourgon', label: 'Fourgon' },
      { value: 'Utilitaire', label: 'Utilitaire' },
    ]},
    { name: 'status', label: 'Statut', type: 'select', options: [
      { value: 'Disponible', label: 'Disponible' },
      { value: 'En mission', label: 'En mission' },
      { value: 'Maintenance', label: 'Maintenance' },
    ]},
    { name: 'mileage', label: 'Kilométrage actuel', type: 'number', min: 0 },
    { name: 'last_service_date', label: 'Date dernière vidange', type: 'date' },
    { name: 'last_service_mileage', label: 'Kilométrage dernière vidange', type: 'number', min: 0 },
  ], []);

  const defaultFormValues = useMemo(() => editingVehicle || {
    plate: '',
    type: 'Camionnette',
    status: 'Disponible',
    mileage: 0,
    last_service_date: new Date().toISOString().split('T')[0],
    last_service_mileage: 0,
  }, [editingVehicle]);

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
        isLoading={false}
      />

      {/* Modal for Add/Edit Vehicle */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-[425px] bg-gray-50">
          <DialogHeader>
            <DialogTitle>{editingVehicle ? 'Modifier un Véhicule' : 'Ajouter un Véhicule'}</DialogTitle>
            <DialogDescription>
              {editingVehicle ? 'Modifiez les détails du véhicule.' : 'Ajoutez un nouveau véhicule à votre flotte.'}
            </DialogDescription>
          </DialogDescription>
          <DynamicForm<VehicleFormData>
            schema={vehicleSchema}
            defaultValues={defaultFormValues}
            onSubmit={onSubmit}
            fields={vehicleFormFields}
            onCancel={() => setShowModal(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Vehicles;