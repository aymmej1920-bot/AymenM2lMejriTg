import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Calendar, AlertTriangle } from 'lucide-react';
import { FleetData, Document, DataTableColumn } from '../types';
import { showSuccess } from '../utils/toast';
import { formatDate } from '../utils/date';
import { Button } from './ui/button';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { documentSchema } from '../types/formSchemas';
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

type DocumentFormData = z.infer<typeof documentSchema>;

interface DocumentsProps {
  data: FleetData;
  userRole: 'admin' | 'direction' | 'utilisateur';
  onAdd: (document: Omit<Document, 'id' | 'user_id' | 'created_at'>) => void;
  onUpdate: (document: Document) => void;
  onDelete: (id: string) => void;
}

const Documents: React.FC<DocumentsProps> = ({ data, onAdd, onUpdate, onDelete }) => {
  const [showModal, setShowModal] = useState(false);
  const [editingDocument, setEditingDocument] = useState<Document | null>(null);

  const { register, handleSubmit, reset, formState: { errors = {} } } = useForm<DocumentFormData>({
    resolver: zodResolver(documentSchema),
    defaultValues: {
      vehicle_id: '',
      type: '',
      number: '',
      expiration: new Date().toISOString().split('T')[0],
    }
  });

  useEffect(() => {
    if (editingDocument) {
      reset(editingDocument);
    } else {
      reset({
        vehicle_id: '',
        type: '',
        number: '',
        expiration: new Date().toISOString().split('T')[0],
      });
    }
  }, [editingDocument, reset]);

  // State for custom filters
  const [selectedVehicle, setSelectedVehicle] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const handleAddDocument = () => {
    setEditingDocument(null);
    setShowModal(true);
  };

  const handleEditDocument = (document: Document) => {
    setEditingDocument(document);
    setShowModal(true);
  };

  const onSubmit = (formData: DocumentFormData) => {
    if (editingDocument) {
      onUpdate({ ...formData, id: editingDocument.id, user_id: editingDocument.user_id, created_at: editingDocument.created_at });
      showSuccess('Document mis à jour avec succès !');
    } else {
      onAdd(formData);
      showSuccess('Document ajouté avec succès !');
    }
    setShowModal(false);
  };

  const getDaysUntilExpiration = (expirationDate: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = new Date(expirationDate);
    expiry.setHours(0, 0, 0, 0);
    const timeDiff = expiry.getTime() - today.getTime();
    return Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
  };

  const getDocumentStatusBadge = (daysLeft: number) => {
    if (daysLeft < 0) {
      return { text: 'Expiré', class: 'bg-red-200 text-red-800' };
    } else if (daysLeft < 30) {
      return { text: 'Urgent', class: 'bg-red-100 text-red-800' };
    } else if (daysLeft < 60) {
      return { text: 'Attention', class: 'bg-orange-100 text-orange-800' };
    } else {
      return { text: 'Valide', class: 'bg-green-100 text-green-800' };
    }
  };

  const uniqueTypes = useMemo(() => {
    const types = new Set(data.documents.map(d => d.type));
    return Array.from(types);
  }, [data.documents]);

  const filteredDocuments = useMemo(() => {
    return data.documents.filter(doc => {
      const matchesVehicle = selectedVehicle ? doc.vehicle_id === selectedVehicle : true;
      const matchesType = selectedType ? doc.type === selectedType : true;

      const docExpirationDate = new Date(doc.expiration);
      const start = startDate ? new Date(startDate) : null;
      const end = endDate ? new Date(endDate) : null;

      const matchesDateRange = 
        (!start || docExpirationDate >= start) &&
        (!end || docExpirationDate <= end);

      return matchesVehicle && matchesType && matchesDateRange;
    });
  }, [data.documents, selectedVehicle, selectedType, startDate, endDate]);

  const columns: DataTableColumn<Document>[] = useMemo(() => [
    {
      key: 'vehicle_id',
      label: 'Véhicule',
      sortable: true,
      defaultVisible: true,
      render: (item) => data.vehicles.find(v => v.id === item.vehicle_id)?.plate || 'N/A',
    },
    { key: 'type', label: 'Type Document', sortable: true, defaultVisible: true },
    { key: 'number', label: 'N° Document', sortable: true, defaultVisible: true },
    {
      key: 'expiration',
      label: 'Expiration',
      sortable: true,
      defaultVisible: true,
      render: (item) => {
        const daysLeft = getDaysUntilExpiration(item.expiration);
        return (
          <div className={`${daysLeft < 30 ? 'text-red-600 font-semibold' : 'text-gray-600'}`}>
            {formatDate(item.expiration)}
          </div>
        );
      },
    },
    {
      key: 'days_left',
      label: 'Jours Restants',
      sortable: false, // Derived value, sorting might be complex
      defaultVisible: true,
      render: (item) => {
        const daysLeft = getDaysUntilExpiration(item.expiration);
        const statusClass = daysLeft < 30 ? 'text-red-600 font-semibold' : daysLeft < 60 ? 'text-orange-600' : 'text-green-600';
        return (
          <span className={statusClass}>
            {daysLeft < 0 ? 'Expiré' : `${daysLeft} jours`}
          </span>
        );
      },
    },
    {
      key: 'status_badge',
      label: 'Statut',
      sortable: false, // Derived value
      defaultVisible: true,
      render: (item) => {
        const daysLeft = getDaysUntilExpiration(item.expiration);
        const status = getDocumentStatusBadge(daysLeft);
        return (
          <span className={`px-3 py-1 text-xs rounded-full font-medium ${status.class}`}>
            {status.text}
          </span>
        );
      },
    },
  ], [data.vehicles]);

  const expiringDocs = data.documents.filter(doc => getDaysUntilExpiration(doc.expiration) < 30);

  const renderAlerts = useCallback(() => {
    if (expiringDocs.length === 0) return null;
    return (
      <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-r-lg">
        <div className="flex items-center">
          <AlertTriangle className="w-5 h-5 text-red-400 mr-3" />
          <div>
            <h3 className="text-red-800 font-semibold">Attention!</h3>
            <p className="text-red-700">
              {expiringDocs.length} document(s) expirent dans moins de 30 jours.
            </p>
          </div>
        </div>
      </div>
    );
  }, [expiringDocs]);

  const renderFilters = useCallback((_searchTerm: string, _setSearchTerm: (term: string) => void) => {
    return (
      <>
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
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 shadow-sm focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Tous les types</option>
            {uniqueTypes.map(type => (
              <option key={type} value={type}>{type}</option>
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
  }, [data.vehicles, uniqueTypes, selectedVehicle, selectedType, startDate, endDate]);

  return (
    <>
      <DataTable
        title="Suivi des Documents"
        data={filteredDocuments}
        columns={columns}
        onAdd={handleAddDocument}
        onEdit={handleEditDocument}
        onDelete={onDelete}
        addLabel="Ajouter Document"
        searchPlaceholder="Rechercher un document par véhicule, type, numéro ou expiration..."
        exportFileName="documents"
        isLoading={false}
        renderFilters={renderFilters}
        renderAlerts={renderAlerts}
      />

      {/* Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-[425px] bg-gray-50">
          <DialogHeader>
            <DialogTitle>{editingDocument ? 'Modifier un Document' : 'Ajouter un Document'}</DialogTitle>
            <DialogDescription>
              {editingDocument ? 'Modifiez les détails du document.' : 'Ajoutez un nouveau document.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
            <div>
              <label htmlFor="vehicle_id" className="block text-sm font-semibold mb-2 text-gray-900">Véhicule</label>
              <select
                id="vehicle_id"
                {...register('vehicle_id')}
                className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 shadow-sm focus:ring-blue-500 focus:border-blue-500"
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
              <label htmlFor="type" className="block text-sm font-semibold mb-2 text-gray-900">Type de document</label>
              <select
                id="type"
                {...register('type')}
                className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 shadow-sm focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Sélectionner un type</option>
                <option value="Assurance">Assurance</option>
                <option value="Contrôle Technique">Contrôle Technique</option>
                <option value="Taxe Véhicule">Taxe Véhicule</option>
                <option value="Vignette">Vignette</option>
                <option value="Permis de Circulation">Permis de Circulation</option>
              </select>
              {errors.type && <p className="text-red-500 text-sm mt-1">{errors.type.message}</p>}
            </div>
            <div>
              <label htmlFor="number" className="block text-sm font-semibold mb-2 text-gray-900">Numéro de document</label>
              <input
                id="number"
                type="text"
                {...register('number')}
                className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 shadow-sm focus:ring-blue-500 focus:border-blue-500"
              />
              {errors.number && <p className="text-red-500 text-sm mt-1">{errors.number.message}</p>}
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

export default Documents;