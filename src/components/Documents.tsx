import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Calendar, AlertTriangle, Search, Loader2 } from 'lucide-react'; // Import Loader2
import { Document, DataTableColumn, Resource, Action, OperationResult } from '../types';
import { showLoading, updateToast } from '../utils/toast';
import { formatDate, getDaysUntilExpiration } from '../utils/date';
import { Button } from './ui/button';
import { useForm, FormProvider } from 'react-hook-form';
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
import DataTable from './DataTable';
import { usePermissions } from '../hooks/usePermissions';
import { LOCAL_STORAGE_KEYS } from '../utils/constants';
import FormField from './forms/FormField';
import { useFleetData } from '../components/FleetDataProvider';

type DocumentFormData = z.infer<typeof documentSchema>;

interface DocumentsProps {
  onAdd: (tableName: Resource, document: Omit<Document, 'id' | 'user_id' | 'created_at'>, action: Action) => Promise<OperationResult>;
  onUpdate: (tableName: Resource, document: Document, action: Action) => Promise<OperationResult>;
  onDelete: (tableName: Resource, data: { id: string }, action: Action) => Promise<OperationResult>;
}

const Documents: React.FC<DocumentsProps> = ({ onAdd, onUpdate, onDelete }) => {
  const { canAccess } = usePermissions();

  const { fleetData, isLoadingFleet, getResourcePaginationState, setResourcePaginationState } = useFleetData();
  const documents = fleetData.documents;
  const vehicles = fleetData.vehicles;

  // Get and set pagination/sorting states from FleetDataProvider
  const { currentPage, itemsPerPage, sortColumn, sortDirection, totalCount } = getResourcePaginationState('documents');

  const onPageChange = useCallback((page: number) => setResourcePaginationState('documents', { currentPage: page }), [setResourcePaginationState]);
  const onItemsPerPageChange = useCallback((count: number) => setResourcePaginationState('documents', { itemsPerPage: count }), [setResourcePaginationState]);
  const onSortChange = useCallback((column: string, direction: 'asc' | 'desc') => setResourcePaginationState('documents', { sortColumn: column, sortDirection: direction }), [setResourcePaginationState]);


  const [showModal, setShowModal] = useState(false);
  const [editingDocument, setEditingDocument] = useState<Document | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false); // Add isSubmitting state

  const methods = useForm<DocumentFormData>({
    resolver: zodResolver(documentSchema),
    defaultValues: {
      vehicle_id: '',
      type: '',
      number: '',
      expiration: new Date().toISOString().split('T')[0],
    }
  });

  const { handleSubmit, reset, watch } = methods;

  const resetFormAndClearStorage = useCallback(() => {
    reset({
      vehicle_id: '',
      type: '',
      number: '',
      expiration: new Date().toISOString().split('T')[0],
    });
    localStorage.removeItem(LOCAL_STORAGE_KEYS.DOCUMENT_FORM_DATA);
  }, [reset]);

  useEffect(() => {
    if (showModal && !editingDocument) {
      const savedFormData = localStorage.getItem(LOCAL_STORAGE_KEYS.DOCUMENT_FORM_DATA);
      if (savedFormData) {
        try {
          const parsedData = JSON.parse(savedFormData);
          if (parsedData.expiration) {
            parsedData.expiration = new Date(parsedData.expiration).toISOString().split('T')[0];
          }
          reset(parsedData);
        } catch (e: unknown) {
          console.error("Failed to parse saved document form data", e instanceof Error ? e.message : String(e));
          localStorage.removeItem(LOCAL_STORAGE_KEYS.DOCUMENT_FORM_DATA);
        }
      }
    }
  }, [showModal, editingDocument, reset]);

  useEffect(() => {
    if (showModal && !editingDocument) {
      const subscription = watch((value) => {
        localStorage.setItem(LOCAL_STORAGE_KEYS.DOCUMENT_FORM_DATA, JSON.stringify(value));
      });
      return () => subscription.unsubscribe();
    }
  }, [showModal, editingDocument, watch]);

  React.useEffect(() => {
    if (editingDocument) {
      reset(editingDocument);
    } else {
      resetFormAndClearStorage();
    }
  }, [editingDocument, resetFormAndClearStorage]);

  const [selectedVehicle, setSelectedVehicle] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const handleAddDocument = () => {
    setEditingDocument(null);
    resetFormAndClearStorage();
    setShowModal(true);
  };

  const handleEditDocument = (document: Document) => {
    setEditingDocument(document);
    setShowModal(true);
  };

  const onSubmit = async (formData: DocumentFormData) => {
    setIsSubmitting(true); // Set submitting to true
    const loadingToastId = showLoading(editingDocument ? 'Mise à jour du document...' : 'Ajout du document...');
    let result: OperationResult;
    try {
      if (editingDocument) {
        result = await onUpdate('documents', { ...formData, id: editingDocument.id, user_id: editingDocument.user_id, created_at: editingDocument.created_at }, 'edit');
      } else {
        result = await onAdd('documents', formData, 'add');
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
    const types = new Set(documents.map(d => d.type));
    return Array.from(types);
  }, [documents]);

  const columns: DataTableColumn<Document>[] = useMemo(() => [
    {
      key: 'vehicle_id',
      label: 'Véhicule',
      sortable: true,
      defaultVisible: true,
      render: (item) => vehicles.find(v => v.id === item.vehicle_id)?.plate || 'N/A',
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
      sortable: false,
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
      sortable: false,
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
  ], [vehicles]);

  const expiringDocs = documents.filter(doc => getDaysUntilExpiration(doc.expiration) < 30);

  const renderAlerts = useCallback(() => {
    if (expiringDocs.length === 0) return null;
    return (
      <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-r-lg glass">
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

  const renderFilters = useCallback((searchTerm: string, setSearchTerm: (term: string) => void) => {
    return (
      <>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher un document par véhicule, type, numéro ou expiration..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all glass"
          />
        </div>
        <div>
          <select
            value={selectedVehicle}
            onChange={(e) => setSelectedVehicle(e.target.value)}
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
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="w-full glass border border-gray-300 rounded-lg px-4 py-3 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
  }, [vehicles, uniqueTypes, selectedVehicle, selectedType, startDate, endDate]);

  const customFilter = useCallback((doc: Document) => {
    const matchesVehicle = selectedVehicle ? doc.vehicle_id === selectedVehicle : true;
    const matchesType = selectedType ? doc.type === selectedType : true;

    const docExpirationDate = new Date(doc.expiration);
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;

    const matchesDateRange = 
      (!start || docExpirationDate >= start) &&
      (!end || docExpirationDate <= end);

    return matchesVehicle && matchesType && matchesDateRange;
  }, [selectedVehicle, selectedType, startDate, endDate]);

  const canAddForm = canAccess('documents', 'add');
  const canEditForm = canAccess('documents', 'edit');

  return (
    <>
      <DataTable
        title="Suivi des Documents"
        data={documents}
        columns={columns}
        onAdd={canAddForm ? handleAddDocument : undefined}
        onEdit={canEditForm ? handleEditDocument : undefined}
        onDelete={canAccess('documents', 'delete') ? async (id) => {
          const loadingToastId = showLoading('Suppression du document...');
          const result = await onDelete('documents', { id }, 'delete');
          if (result.success) {
            updateToast(loadingToastId, result.message || 'Document supprimé avec succès !', 'success');
          } else {
            updateToast(loadingToastId, result.error || 'Erreur lors de la suppression du document.', 'error');
          }
        } : undefined}
        addLabel="Ajouter Document"
        searchPlaceholder="Rechercher un document par véhicule, type, numéro ou expiration..."
        exportFileName="documents"
        isLoading={isLoadingFleet}
        renderAlerts={renderAlerts} // Pass renderAlerts here
        renderFilters={renderFilters}
        customFilter={customFilter}
        resourceType="documents"
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
        <DialogContent className="sm:max-w-[425px] glass animate-scale-in">
          <DialogHeader>
            <DialogTitle>{editingDocument ? 'Modifier un Document' : 'Ajouter un Document'}</DialogTitle>
            <DialogDescription>
              {editingDocument ? 'Modifiez les détails du document.' : 'Ajoutez un nouveau document.'}
            </DialogDescription>
          </DialogHeader>
          <FormProvider {...methods}>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
              <FormField
                name="vehicle_id"
                label="Véhicule"
                type="select"
                options={[{ value: '', label: 'Sélectionner un véhicule' }, ...vehicles.map(vehicle => ({ value: vehicle.id, label: `${vehicle.plate} - ${vehicle.type}` }))]}
                placeholder="Sélectionner un véhicule"
                disabled={isSubmitting || (!canEditForm && !!editingDocument) || (!canAddForm && !editingDocument)}
              />
              <FormField
                name="type"
                label="Type de document"
                type="select"
                options={[
                  { value: '', label: 'Sélectionner un type' },
                  { value: 'Assurance', label: 'Assurance' },
                  { value: 'Contrôle Technique', label: 'Contrôle Technique' },
                  { value: 'Taxe Véhicule', label: 'Taxe Véhicule' },
                  { value: 'Vignette', label: 'Vignette' },
                  { value: 'Permis de Circulation', label: 'Permis de Circulation' },
                ]}
                disabled={isSubmitting || (!canEditForm && !!editingDocument) || (!canAddForm && !editingDocument)}
              />
              <FormField
                name="number"
                label="Numéro de document"
                type="text"
                disabled={isSubmitting || (!canEditForm && !!editingDocument) || (!canAddForm && !editingDocument)}
              />
              <FormField
                name="expiration"
                label="Date d'expiration"
                type="date"
                disabled={isSubmitting || (!canEditForm && !!editingDocument) || (!canAddForm && !editingDocument)}
              />
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
                {(canAddForm && !editingDocument) || (canEditForm && editingDocument) ? (
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

export default Documents;