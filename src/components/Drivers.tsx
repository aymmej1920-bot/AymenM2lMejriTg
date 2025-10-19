import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Phone, Calendar, AlertTriangle } from 'lucide-react'; // Maintenu uniquement les icônes utilisées dans le formulaire ou les alertes spécifiques
import { FleetData, Driver, DataTableColumn } from '../types';
import { showSuccess } from '../utils/toast';
import { formatDate } from '../utils/date';
import { Button } from './ui/button';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { driverSchema } from '../types/formSchemas';
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

type DriverFormData = z.infer<typeof driverSchema>;

interface DriversProps {
  data: FleetData;
  userRole: 'admin' | 'direction' | 'utilisateur';
  onAdd: (driver: Omit<Driver, 'id' | 'user_id' | 'created_at'>) => void;
  onUpdate: (driver: Driver) => void;
  onDelete: (id: string) => void;
}

const Drivers: React.FC<DriversProps> = ({ data, onAdd, onUpdate, onDelete }) => {
  const [showModal, setShowModal] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);

  const { register, handleSubmit, reset, formState: { errors = {} } } = useForm<DriverFormData>({
    resolver: zodResolver(driverSchema),
    defaultValues: {
      name: '',
      license: '',
      expiration: new Date().toISOString().split('T')[0],
      status: 'Disponible',
      phone: '',
    }
  });

  useEffect(() => {
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

  const getDaysUntilExpiration = (expirationDate: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = new Date(expirationDate);
    expiry.setHours(0, 0, 0, 0);
    const timeDiff = expiry.getTime() - today.getTime();
    return Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
  };

  const isExpiringSoon = (expirationDate: string) => {
    return getDaysUntilExpiration(expirationDate) < 60;
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

  const expiringDrivers = data.drivers.filter(driver => isExpiringSoon(driver.expiration));

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

  return (
    <>
      <DataTable
        title="Gestion des Conducteurs"
        data={data.drivers}
        columns={columns}
        onAdd={handleAddDriver}
        onEdit={handleEditDriver}
        onDelete={onDelete}
        addLabel="Ajouter Conducteur"
        searchPlaceholder="Rechercher un conducteur par nom, permis, statut ou téléphone..."
        exportFileName="conducteurs"
        isLoading={false}
        renderAlerts={renderAlerts}
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
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
            <div>
              <label htmlFor="name" className="block text-sm font-semibold mb-2 text-gray-900">Nom complet</label>
              <input
                id="name"
                type="text"
                {...register('name')}
                className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 shadow-sm focus:ring-blue-500 focus:border-blue-500"
              />
              {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>}
            </div>
            <div>
              <label htmlFor="license" className="block text-sm font-semibold mb-2 text-gray-900">Numéro de permis</label>
              <input
                id="license"
                type="text"
                {...register('license')}
                className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 shadow-sm focus:ring-blue-500 focus:border-blue-500"
              />
              {errors.license && <p className="text-red-500 text-sm mt-1">{errors.license.message}</p>}
            </div>
            <div>
              <label htmlFor="expiration" className="block text-sm font-semibold mb-2 text-gray-900">Date d'expiration</label>
              <div className="relative flex items-center">
                <input
                  id="expiration"
                  type="date"
                  {...register('expiration')}
                  className="w-full bg-white border border-gray-300 rounded-lg pl-4 pr-10 py-3 shadow-sm focus:ring-blue-500 focus:border-blue-500"
                />
                <Calendar className="absolute right-3 w-5 h-5 text-gray-400 pointer-events-none" />
              </div>
              {errors.expiration && <p className="text-red-500 text-sm mt-1">{errors.expiration.message}</p>}
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
                <option value="Repos">Repos</option>
                <option value="Congé">Congé</option>
              </select>
              {errors.status && <p className="text-red-500 text-sm mt-1">{errors.status.message}</p>}
            </div>
            <div>
              <label htmlFor="phone" className="block text-sm font-semibold mb-2 text-gray-900">Téléphone</label>
              <input
                id="phone"
                type="tel"
                {...register('phone')}
                className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 shadow-sm focus:ring-blue-500 focus:border-blue-500"
              />
              {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone.message}</p>}
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

export default Drivers;