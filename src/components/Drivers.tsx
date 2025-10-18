import React, { useState, useMemo, useEffect } from 'react';
import { Plus, Edit2, Trash2, Phone, ChevronUp, ChevronDown, Search, Calendar } from 'lucide-react';
import { FleetData, Driver } from '../types';
import { showSuccess } from '../utils/toast'; // Corrected import syntax
import { formatDate } from '../utils/date';
import ConfirmDialog from './ConfirmDialog';
import { Button } from './ui/button';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { driverSchema } from '../types/formSchemas'; // Import the schema
import { z } from 'zod'; // Import z
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from './ui/dialog'; // Import shadcn/ui Dialog components

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
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [driverToDelete, setDriverToDelete] = useState<string | null>(null);

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

  // State for filtering, sorting, and pagination
  const [searchTerm, setSearchTerm] = useState('');
  const [sortColumn, setSortColumn] = useState<keyof Driver>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10; // You can adjust this value

  // Filtered and sorted data
  const filteredAndSortedDrivers = useMemo(() => {
    let filtered = data.drivers.filter(driver =>
      driver.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      driver.license.toLowerCase().includes(searchTerm.toLowerCase()) ||
      driver.status.toLowerCase().includes(searchTerm.toLowerCase()) ||
      driver.phone.toLowerCase().includes(searchTerm.toLowerCase())
    );

    filtered.sort((a, b) => {
      const aValue = a[sortColumn];
      const bValue = b[sortColumn];

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
      }
      // For date strings, we can compare them directly as strings if they are in YYYY-MM-DD format
      if (sortColumn === 'expiration' && typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
      }
      // Fallback for other types or if values are null/undefined
      return 0;
    });
    return filtered;
  }, [data.drivers, searchTerm, sortColumn, sortDirection]);

  // Paginated data
  const totalPages = Math.ceil(filteredAndSortedDrivers.length / itemsPerPage);
  const currentDrivers = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredAndSortedDrivers.slice(startIndex, endIndex);
  }, [filteredAndSortedDrivers, currentPage, itemsPerPage]);

  const handleAddDriver = () => {
    setEditingDriver(null);
    setShowModal(true);
  };

  const handleEditDriver = (driver: Driver) => {
    setEditingDriver(driver);
    setShowModal(true);
  };

  const confirmDeleteDriver = (driverId: string) => {
    setDriverToDelete(driverId);
    setShowConfirmDialog(true);
  };

  const executeDeleteDriver = () => {
    if (driverToDelete) {
      onDelete(driverToDelete);
      showSuccess('Conducteur supprimé avec succès !');
      setDriverToDelete(null);
    }
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
    return `px-3 py-1 text-xs rounded-full font-medium ${classes[status as keyof typeof classes] || 'bg-gray-100 text-gray-800'}`;
  };

  const getDaysUntilExpiration = (expirationDate: string) => {
    const today = new Date();
    const expiry = new Date(expirationDate);
    const timeDiff = expiry.getTime() - today.getTime();
    return Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
  };

  const isExpiringSoon = (expirationDate: string) => {
    return getDaysUntilExpiration(expirationDate) < 60;
  };

  const handleSort = (column: keyof Driver) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const renderSortIcon = (column: keyof Driver) => {
    if (sortColumn === column) {
      return sortDirection === 'asc' ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />;
    }
    return null;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-4xl font-bold text-gray-800">Gestion des Conducteurs</h2>
          <Button
            onClick={handleAddDriver}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg flex items-center space-x-2 transition-all duration-300"
          >
            <Plus className="w-5 h-5" />
            <span>Ajouter Conducteur</span>
          </Button>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Rechercher un conducteur par nom, permis, statut ou téléphone..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setCurrentPage(1); // Reset to first page on new search
          }}
          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
        />
      </div>

      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('name')}>
                <div className="flex items-center">
                  Nom {renderSortIcon('name')}
                </div>
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('license')}>
                <div className="flex items-center">
                  N° Permis {renderSortIcon('license')}
                </div>
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('expiration')}>
                <div className="flex items-center">
                  Expiration {renderSortIcon('expiration')}
                </div>
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('status')}>
                <div className="flex items-center">
                  Statut {renderSortIcon('status')}
                </div>
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('phone')}>
                <div className="flex items-center">
                  Téléphone {renderSortIcon('phone')}
                </div>
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {currentDrivers.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                  Aucun conducteur trouvé.
                </td>
              </tr>
            ) : (
              currentDrivers.map((driver) => (
                <tr key={driver.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{driver.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{driver.license}</td>
                  <td className={`px-6 py-4 text-sm ${isExpiringSoon(driver.expiration) ? 'text-red-600 font-semibold' : 'text-gray-600'}`}>
                    {formatDate(driver.expiration)}
                    {isExpiringSoon(driver.expiration) && (
                      <div className="text-xs text-red-500">
                        Expire dans {getDaysUntilExpiration(driver.expiration)} jours
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <span className={getStatusBadge(driver.status)}>{driver.status}</span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    <div className="flex items-center space-x-2">
                      <Phone className="w-4 h-4" />
                      <span>{driver.phone}</span>
                    </div>
                  </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex space-x-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditDriver(driver)}
                          className="text-blue-600 hover:text-blue-900 transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => confirmDeleteDriver(driver.id)}
                          className="text-red-600 hover:text-red-900 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center space-x-2 mt-4">
          <Button
            variant="outline"
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Précédent
          </Button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
            <Button
              key={page}
              variant={currentPage === page ? 'default' : 'outline'}
              onClick={() => setCurrentPage(page)}
              className={`px-4 py-2 rounded-lg ${
                currentPage === page ? 'bg-blue-600 text-white' : 'bg-gray-200 hover:bg-gray-300'
              }`}
            >
              {page}
            </Button>
          ))}
          <Button
            variant="outline"
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
            className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Suivant
          </Button>
        </div>
      )}

      {/* Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-[425px]">
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

      <ConfirmDialog
        open={showConfirmDialog}
        onOpenChange={setShowConfirmDialog}
        title="Confirmer la suppression"
        description="Êtes-vous sûr de vouloir supprimer ce conducteur ? Cette action est irréversible."
        onConfirm={executeDeleteDriver}
        confirmText="Supprimer"
        variant="destructive"
      />
    </div>
  );
};

export default Drivers;