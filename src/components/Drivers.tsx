import React, { useState, useMemo, useCallback } from 'react';
import { Phone, AlertTriangle } from 'lucide-react';
import { FleetData, Driver, DataTableColumn } from '../types';
import { showSuccess } from '../utils/toast';
import { formatDate, getDaysUntilExpiration } from '../utils/date';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from './ui/dialog';
import DataTable from './DataTable';
import { driverSchema } from '../types/formSchemas';
import { z } from 'zod';
import { useForm, FormProvider } from 'react-hook-form'; // Import useForm and FormProvider
import { zodResolver } from '@hookform/resolvers/zod'; // Import zodResolver
import FormField from './forms/FormField'; // Import FormField
import { Button } from './ui/button'; // Import Button for DialogFooter
import { useSession } from './SessionContextProvider'; // Import useSession
import { canAccess } from '../utils/permissions'; // Import canAccess

type DriverFormData = z.infer<typeof driverSchema>;

interface DriversProps {
  data: FleetData;
  userRole: 'admin' | 'direction' | 'utilisateur';
  onAdd: (driver: Omit<Driver, 'id' | 'user_id' | 'created_at'>) => void;
  onUpdate: (driver: Driver) => void;
  onDelete: (id: string) => void;
}

const Drivers: React.FC<DriversProps> = ({ data, userRole, onAdd, onUpdate, onDelete }) => {
  const [showModal, setShowModal] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);

  const methods = useForm<DriverFormData>({
    resolver: zodResolver(driverSchema),
    defaultValues: useMemo(() => editingDriver || {
      name: '',
      license: '',
      expiration: new Date().toISOString().split('T')[0],
      status: 'Disponible',
      phone: '',
    }, [editingDriver]),
  });

  const { handleSubmit, reset } = methods;

  React.useEffect(() => {
    if (editingDriver) {
      reset(editingDriver);
    } else {
      reset({
        name: '',
        license: '',
        expiration: new Date().toISOString().split('T')[0],
        status: 'Disponible',
        phone: '',
      });
    }
  }, [editingDriver, reset]);

  const handleAddDriver = () => {
    setEditingDriver(null);
    setShowModal(true);
  };

  const handleEditDriver = (driver: Driver) => {
    setEditingDriver(driver);
    setShowModal(true);
  };

  const onSubmit = (formData: DriverFormData) => {
    if (editingDriver) {
      onUpdate({ ...formData, id: editingDriver.id, user_id: editingDriver.user_id, created_at: editingDriver.created_at });
      showSuccess('Conducteur mis à jour avec succès !');
    } else {
      onAdd(formData);
      showSuccess('Conducteur ajouté avec succès !');
    }
    setShowModal(false);
  };

  const getStatusBadge = (status: string) => {
    const classes = {
      'Disponible': 'bg-green-100 text-green-800',
      'En mission': 'bg-orange-100 text-orange-800',
      'Repos': 'bg-gray-100 text-gray-800',
      'Congé': 'bg-blue-100 text-blue-800'
    };
    return <span className={`px-3 py-1 text-xs rounded-full font-medium ${classes[status as keyof typeof classes] || 'bg-gray-100 text-gray-800'}`}>{status}</span>;
  };

  const columns: DataTableColumn<Driver>[] = useMemo(() => [
    { key: 'name', label: 'Nom', sortable: true, defaultVisible: true },
    { key: 'license', label: 'N° Permis', sortable: true, defaultVisible: true },
    {
      key: 'expiration',
      label: 'Expiration',
      sortable: true,
      defaultVisible: true,
      render: (item) => {
        const daysLeft = getDaysUntilExpiration(item.expiration);
        return (
          <div className={`${daysLeft < 60 ? 'text-red-600 font-semibold' : 'text-gray-600'}`}>
            {formatDate(item.expiration)}
            {daysLeft < 60 && (
              <div className="text-xs text-red-500">
                Expire dans {daysLeft} jours
              </div>
            )}
          </div>
        );
      },
    },
    { key: 'status', label: 'Statut', sortable: true, defaultVisible: true, render: (item) => getStatusBadge(item.status) },
    {
      key: 'phone',
      label: 'Téléphone',
      sortable: true,
      defaultVisible: true,
      render: (item) => (
        <div className="flex items-center space-x-2">
          <Phone className="w-4 h-4" />
          <span>{item.phone}</span>
        </div>
      ),
    },
  ], []);

  const expiringDrivers = data.drivers.filter(driver => getDaysUntilExpiration(driver.expiration) < 60);

  const renderAlerts = useCallback(() => {
    if (expiringDrivers.length === 0) return null;
    return (
      <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-r-lg">
        <div className="flex items-center">
          <AlertTriangle className="w-5 h-5 text-red-400 mr-3" />
          <div>
            <h3 className="text-red-800 font-semibold">Attention!</h3>
            <p className="text-red-700">
              {expiringDrivers.length} permis de conduire expirent dans moins de 60 jours.
            </p>
          </div>
        </div>
      </div>
    );
  }, [expiringDrivers]);

  const canEditForm = canAccess(userRole, 'drivers', 'edit');
  const canAddForm = canAccess(userRole, 'drivers', 'add');

  return (
    <>
      <DataTable
        title="Gestion des Conducteurs"
        data={data.drivers}
        columns={columns}
        onAdd={canAddForm ? handleAddDriver : undefined}
        onEdit={canEditForm ? handleEditDriver : undefined}
        onDelete={canAccess(userRole, 'drivers', 'delete') ? onDelete : undefined}
        addLabel="Ajouter Conducteur"
        searchPlaceholder="Rechercher un conducteur par nom, permis, statut ou téléphone..."
        exportFileName="conducteurs"
        isLoading={false}
        renderAlerts={renderAlerts}
        resourceType="drivers" // Pass resource type
      />

      {/* Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-[425px] bg-gray-50">
          <DialogHeader>
            <DialogTitle>{editingDriver ? 'Modifier un Conducteur' : 'Ajouter un Conducteur'}</DialogTitle>
            <DialogDescription>
              {editingDriver ? 'Modifiez les détails du conducteur.' : 'Ajoutez un nouveau conducteur.'}
            </DialogDescription>
          </DialogHeader>
          <FormProvider {...methods}>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
              <FormField name="name" label="Nom complet" type="text" placeholder="Ex: John Doe" disabled={!canEditForm && editingDriver || !canAddForm && !editingDriver} />
              <FormField name="license" label="Numéro de permis" type="text" placeholder="Ex: 123456789" disabled={!canEditForm && editingDriver || !canAddForm && !editingDriver} />
              <FormField name="expiration" label="Date d'expiration" type="date" disabled={!canEditForm && editingDriver || !canAddForm && !editingDriver} />
              <FormField name="status" label="Statut" type="select" options={[
                { value: 'Disponible', label: 'Disponible' },
                { value: 'En mission', label: 'En mission' },
                { value: 'Repos', label: 'Repos' },
                { value: 'Congé', label: 'Congé' },
              ]} disabled={!canEditForm && editingDriver || !canAddForm && !editingDriver} />
              <FormField name="phone" label="Téléphone" type="tel" placeholder="Ex: +216 22 123 456" disabled={!canEditForm && editingDriver || !canAddForm && !editingDriver} />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
                  Annuler
                </Button>
                {(canAddForm && !editingDriver) || (canEditForm && editingDriver) ? (
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

export default Drivers;