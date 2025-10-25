import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Vehicle, DataTableColumn, VehicleImportData, Resource, Action, OperationResult, DbImportResult } from '../types';
import { showSuccess, showLoading, updateToast } from '../utils/toast';
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
import { vehicleSchema, vehicleImportSchema } from '../types/formSchemas';
import { z } from 'zod';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import FormField from './forms/FormField';
import { Button } from './ui/button';
import { usePermissions } from '../hooks/usePermissions';
import XLSXImportDialog from './XLSXImportDialog';
import { Upload, Download, Loader2 } from 'lucide-react'; // Import Loader2
import { exportTemplateToXLSX } from '../utils/templateExport';
import { LOCAL_STORAGE_KEYS } from '../utils/constants';
import { useFleetData } from '../components/FleetDataProvider';

type VehicleFormData = z.infer<typeof vehicleSchema>;

interface VehiclesProps {
  onAdd: (tableName: Resource, vehicle: Omit<Vehicle, 'id' | 'user_id' | 'created_at'>, action: Action) => Promise<OperationResult>;
  onUpdate: (tableName: Resource, vehicle: Vehicle, action: Action) => Promise<OperationResult>;
  onDelete: (tableName: Resource, data: { id: string }, action: Action) => Promise<OperationResult>;
}

const Vehicles: React.FC<VehiclesProps> = ({ onAdd, onUpdate, onDelete }) => {
  const { canAccess } = usePermissions();

  const { fleetData, isLoadingFleet, getResourcePaginationState, setResourcePaginationState } = useFleetData();
  const vehicles = fleetData.vehicles;

  // Get and set pagination/sorting states from FleetDataProvider
  const { currentPage, itemsPerPage, sortColumn, sortDirection, totalCount } = getResourcePaginationState('vehicles');

  const onPageChange = useCallback((page: number) => setResourcePaginationState('vehicles', { currentPage: page }), [setResourcePaginationState]);
  const onItemsPerPageChange = useCallback((count: number) => setResourcePaginationState('vehicles', { itemsPerPage: count }), [setResourcePaginationState]);
  const onSortChange = useCallback((column: string, direction: 'asc' | 'desc') => setResourcePaginationState('vehicles', { sortColumn: column, sortDirection: direction }), [setResourcePaginationState]);


  const [showModal, setShowModal] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false); // Add isSubmitting state

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

  const { handleSubmit, reset, watch } = methods;

  const resetFormAndClearStorage = useCallback(() => {
    reset({
      plate: '',
      type: 'Camionnette',
      status: 'Disponible',
      mileage: 0,
      last_service_date: new Date().toISOString().split('T')[0],
      last_service_mileage: 0,
    });
    localStorage.removeItem(LOCAL_STORAGE_KEYS.VEHICLE_FORM_DATA);
  }, [reset]);

  useEffect(() => {
    if (showModal && !editingVehicle) {
      const savedFormData = localStorage.getItem(LOCAL_STORAGE_KEYS.VEHICLE_FORM_DATA);
      if (savedFormData) {
        try {
          const parsedData = JSON.parse(savedFormData);
          if (parsedData.last_service_date) {
            parsedData.last_service_date = new Date(parsedData.last_service_date).toISOString().split('T')[0];
          }
          reset(parsedData);
        } catch (e: unknown) {
          console.error("Failed to parse saved vehicle form data", e instanceof Error ? e.message : String(e));
          localStorage.removeItem(LOCAL_STORAGE_KEYS.VEHICLE_FORM_DATA);
        }
      }
    }
  }, [showModal, editingVehicle, reset]);

  useEffect(() => {
    if (showModal && !editingVehicle) {
      const subscription = watch((value) => {
        localStorage.setItem(LOCAL_STORAGE_KEYS.VEHICLE_FORM_DATA, JSON.stringify(value));
      });
      return () => subscription.unsubscribe();
    }
  }, [showModal, editingVehicle, watch]);

  React.useEffect(() => {
    if (editingVehicle) {
      reset(editingVehicle);
    } else {
      resetFormAndClearStorage();
    }
  }, [editingVehicle, resetFormAndClearStorage]);

  const handleAddVehicle = () => {
    setEditingVehicle(null);
    resetFormAndClearStorage();
    setShowModal(true);
  };

  const handleEditVehicle = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle);
    setShowModal(true);
  };

  const onSubmit = async (formData: VehicleFormData) => {
    setIsSubmitting(true); // Set submitting to true
    const loadingToastId = showLoading(editingVehicle ? 'Mise à jour du véhicule...' : 'Ajout du véhicule...');
    let result: OperationResult;
    try {
      if (editingVehicle) {
        result = await onUpdate('vehicles', { ...formData, id: editingVehicle.id, user_id: editingVehicle.user_id, created_at: editingVehicle.created_at }, 'edit');
      } else {
        result = await onAdd('vehicles', formData, 'add');
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

  const handleImportVehicles = async (importedData: VehicleImportData[]): Promise<DbImportResult[]> => {
    const results: DbImportResult[] = [];
    for (const vehicleData of importedData) {
      const result = await onAdd('vehicles', vehicleData, 'add');
      results.push({
        originalData: vehicleData,
        success: result.success,
        message: result.message,
        error: result.error,
      });
    }
    return results;
  };

  const vehicleColumnMapping: { [excelHeader: string]: keyof VehicleImportData } = {
    "Plaque": "plate",
    "Type": "type",
    "Statut": "status",
    "Kilométrage": "mileage",
    "Dernière Vidange": "last_service_date",
    "Km Dernière Vidange": "last_service_mileage",
  };

  const handleDownloadVehicleTemplate = () => {
    exportTemplateToXLSX({
      headers: ["Plaque", "Type", "Statut", "Kilométrage", "Dernière Vidange", "Km Dernière Vidange"],
      fileName: "modele_import_vehicules"
    });
    showSuccess('Modèle d\'importation des véhicules téléchargé !');
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

  const canEditForm = canAccess('vehicles', 'edit');
  const canAddForm = canAccess('vehicles', 'add');
  const canImport = canAccess('vehicles', 'add');

  const renderCustomHeaderButtons = () => (
    <>
      {canImport && (
        <Button
          onClick={handleDownloadVehicleTemplate}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg flex items-center space-x-2 transition-all duration-300 hover-lift"
        >
          <Download className="w-5 h-5" />
          <span>Télécharger Modèle</span>
        </Button>
      )}
      {canImport && (
        <Button
          onClick={() => setShowImportDialog(true)}
          className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg flex items-center space-x-2 transition-all duration-300 hover-lift"
        >
          <Upload className="w-5 h-5" />
          <span>Importer XLSX</span>
        </Button>
      )}
    </>
  );

  return (
    <>
      <DataTable
        title="Gestion des Véhicules"
        data={vehicles}
        columns={columns}
        onAdd={canAddForm ? handleAddVehicle : undefined}
        onEdit={canEditForm ? handleEditVehicle : undefined}
        onDelete={canAccess('vehicles', 'delete') ? async (id) => {
          const loadingToastId = showLoading('Suppression du véhicule...');
          const result = await onDelete('vehicles', { id }, 'delete');
          if (result.success) {
            updateToast(loadingToastId, result.message || 'Véhicule supprimé avec succès !', 'success');
          } else {
            updateToast(loadingToastId, result.error || 'Erreur lors de la suppression du véhicule.', 'error');
          }
        } : undefined}
        addLabel="Ajouter Véhicule"
        searchPlaceholder="Rechercher par plaque, type ou statut..."
        exportFileName="vehicules"
        isLoading={isLoadingFleet}
        resourceType="vehicles"
        renderCustomHeaderButtons={renderCustomHeaderButtons}
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
            <DialogTitle>{editingVehicle ? 'Modifier un Véhicule' : 'Ajouter un Véhicule'}</DialogTitle>
            <DialogDescription>
              {editingVehicle ? 'Modifiez les détails du véhicule.' : 'Ajoutez un nouveau véhicule à votre flotte.'}
            </DialogDescription>
          </DialogHeader>
          <FormProvider {...methods}>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
              <FormField name="plate" label="Plaque d'immatriculation" type="text" placeholder="Ex: 123TU456" disabled={isSubmitting || (!canEditForm && !!editingVehicle) || (!canAddForm && !editingVehicle)} />
              <FormField name="type" label="Type de véhicule" type="select" options={[
                { value: 'Camionnette', label: 'Camionnette' },
                { value: 'Camion', label: 'Camion' },
                { value: 'Fourgon', label: 'Fourgon' },
                { value: 'Utilitaire', label: 'Utilitaire' },
              ]} disabled={isSubmitting || (!canEditForm && !!editingVehicle) || (!canAddForm && !editingVehicle)} />
              <FormField name="status" label="Statut" type="select" options={[
                { value: 'Disponible', label: 'Disponible' },
                { value: 'En mission', label: 'En mission' },
                { value: 'Maintenance', label: 'Maintenance' },
              ]} disabled={isSubmitting || (!canEditForm && !!editingVehicle) || (!canAddForm && !editingVehicle)} />
              <FormField name="mileage" label="Kilométrage actuel" type="number" min={0} disabled={isSubmitting || (!canEditForm && !!editingVehicle) || (!canAddForm && !editingVehicle)} />
              <FormField name="last_service_date" label="Date dernière vidange" type="date" disabled={isSubmitting || (!canEditForm && !!editingVehicle) || (!canAddForm && !editingVehicle)} />
              <FormField name="last_service_mileage" label="Kilométrage dernière vidange" type="number" min={0} disabled={isSubmitting || (!canEditForm && !!editingVehicle) || (!canAddForm && !editingVehicle)} />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleCloseModal} className="hover-lift" disabled={isSubmitting}>
                  Annuler
                </Button>
                {(canAddForm && !editingVehicle) || (canEditForm && editingVehicle) ? (
                  <Button type="submit" className="hover-lift" disabled={isSubmitting}>
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

      <XLSXImportDialog<typeof vehicleImportSchema>
        open={showImportDialog}
        onOpenChange={setShowImportDialog}
        title="Importer des Véhicules depuis XLSX"
        description="Téléchargez un fichier Excel (.xlsx) contenant les données de vos véhicules. Les colonnes doivent correspondre aux en-têtes spécifiés."
        schema={vehicleImportSchema}
        columnMapping={vehicleColumnMapping}
        onImport={handleImportVehicles}
        isLoading={false}
      />
    </>
  );
};

export default Vehicles;