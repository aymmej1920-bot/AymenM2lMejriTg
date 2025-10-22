import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Phone, AlertTriangle, Upload, Download } from 'lucide-react'; // Import Upload and Download icons
import { Driver, DataTableColumn, DriverImportData, Resource, Action, OperationResult, DbImportResult } from '../types';
import { showSuccess, showLoading, updateToast, showError } from '../utils/toast';
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
import { driverSchema, driverImportSchema } from '../types/formSchemas';
import { z } from 'zod';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import FormField from './forms/FormField';
import { Button } from './ui/button';
import { usePermissions } from '../hooks/usePermissions';
import XLSXImportDialog from './XLSXImportDialog'; // Import the new component
import { exportTemplateToXLSX } from '../utils/templateExport'; // Import the new utility
import { LOCAL_STORAGE_KEYS } from '../utils/constants'; // Import constants
import { useFleetData } from '../components/FleetDataProvider'; // Import useFleetData

type DriverFormData = z.infer<typeof driverSchema>;

interface DriversProps {
  onAdd: (tableName: Resource, driver: Omit<Driver, 'id' | 'user_id' | 'created_at'>, action: Action) => Promise<OperationResult>;
  onUpdate: (tableName: Resource, driver: Driver, action: Action) => Promise<OperationResult>;
  onDelete: (tableName: Resource, data: { id: string }, action: Action) => Promise<OperationResult>;
}

const Drivers: React.FC<DriversProps> = ({ onAdd, onUpdate, onDelete }) => {
  const { canAccess } = usePermissions();

  // Consume data from FleetContext
  const { fleetData, isLoadingFleet } = useFleetData();
  const drivers = fleetData.drivers;

  const [showModal, setShowModal] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [showImportDialog, setShowImportDialog] = useState(false); // State for import dialog

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

  const { handleSubmit, reset, watch } = methods;

  // Function to reset form and clear saved data
  const resetFormAndClearStorage = useCallback(() => {
    reset({
      name: '',
      license: '',
      expiration: new Date().toISOString().split('T')[0],
      status: 'Disponible',
      phone: '',
    });
    localStorage.removeItem(LOCAL_STORAGE_KEYS.DRIVER_FORM_DATA);
  }, [reset]);

  // Effect to load saved form data when modal opens for a new driver
  useEffect(() => {
    if (showModal && !editingDriver) { // Only for new driver forms
      const savedFormData = localStorage.getItem(LOCAL_STORAGE_KEYS.DRIVER_FORM_DATA);
      if (savedFormData) {
        try {
          const parsedData = JSON.parse(savedFormData);
          if (parsedData.expiration) {
            parsedData.expiration = new Date(parsedData.expiration).toISOString().split('T')[0];
          }
          reset(parsedData);
        } catch (e) {
          console.error("Failed to parse saved driver form data", e);
          localStorage.removeItem(LOCAL_STORAGE_KEYS.DRIVER_FORM_DATA);
        }
      }
    }
  }, [showModal, editingDriver, reset]);

  // Effect to save form data to localStorage whenever it changes (for new driver forms)
  useEffect(() => {
    if (showModal && !editingDriver) { // Only save for new driver forms
      const subscription = watch((value) => {
        localStorage.setItem(LOCAL_STORAGE_KEYS.DRIVER_FORM_DATA, JSON.stringify(value));
      });
      return () => subscription.unsubscribe();
    }
  }, [showModal, editingDriver, watch]);

  // Reset form when editingDriver changes (for edit mode) or when modal closes (for new mode)
  React.useEffect(() => {
    if (editingDriver) {
      reset(editingDriver);
    } else {
      resetFormAndClearStorage(); // Use the new reset function
    }
  }, [editingDriver, resetFormAndClearStorage]);

  const handleAddDriver = () => {
    setEditingDriver(null);
    resetFormAndClearStorage(); // Clear any previous unsaved data
    setShowModal(true);
  };

  const handleEditDriver = (driver: Driver) => {
    setEditingDriver(driver);
    setShowModal(true);
  };

  const onSubmit = async (formData: DriverFormData) => {
    const loadingToastId = showLoading(editingDriver ? 'Mise à jour du conducteur...' : 'Ajout du conducteur...');
    let result: OperationResult;
    try {
      if (editingDriver) {
        result = await onUpdate('drivers', { ...formData, id: editingDriver.id, user_id: editingDriver.user_id, created_at: editingDriver.created_at }, 'edit');
      } else {
        result = await onAdd('drivers', formData, 'add');
      }

      console.log("[Drivers.tsx] onSubmit result:", result); // Log the result

      if (result.success) {
        updateToast(loadingToastId, result.message || 'Opération réussie !', 'success');
      } else {
        throw new Error(result.error || 'Opération échouée.');
      }
      setShowModal(false);
      resetFormAndClearStorage();
    } catch (error: any) {
      updateToast(loadingToastId, error.message || 'Erreur lors de l\'opération.', 'error');
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    resetFormAndClearStorage(); // Clear saved data on modal close
  };

  const handleImportDrivers = async (importedData: DriverImportData[]): Promise<DbImportResult[]> => {
    const results: DbImportResult[] = [];
    for (const driverData of importedData) {
      console.log("[Drivers.tsx] Importing driver data:", driverData); // Log each driver data being imported
      const result = await onAdd('drivers', driverData, 'add');
      console.log("[Drivers.tsx] Import result for driver:", result); // Log the result for each driver
      results.push({
        originalData: driverData,
        success: result.success,
        message: result.message,
        error: result.error,
      });
    }
    return results;
  };

  const driverColumnMapping: { [excelHeader: string]: keyof DriverImportData } = {
    "Nom": "name",
    "N° Permis": "license",
    "Expiration": "expiration",
    "Statut": "status",
    "Téléphone": "phone",
  };

  const handleDownloadDriverTemplate = () => {
    exportTemplateToXLSX({
      headers: ["Nom", "N° Permis", "Expiration", "Statut", "Téléphone"],
      fileName: "modele_import_conducteurs"
    });
    showSuccess('Modèle d\'importation des conducteurs téléchargé !');
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

  const expiringDrivers = drivers.filter(driver => getDaysUntilExpiration(driver.expiration) < 60);

  const renderAlerts = useCallback(() => {
    if (expiringDrivers.length === 0) return null;
    return (
      <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-r-lg glass">
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

  const canEditForm = canAccess('drivers', 'edit');
  const canAddForm = canAccess('drivers', 'add');
  const canImport = canAccess('drivers', 'add'); // Assuming import is an 'add' action

  const renderCustomHeaderButtons = () => (
    <>
      {canImport && (
        <Button
          onClick={handleDownloadDriverTemplate}
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
        title="Gestion des Conducteurs"
        data={drivers}
        columns={columns}
        onAdd={canAddForm ? handleAddDriver : undefined}
        onEdit={canEditForm ? handleEditDriver : undefined}
        onDelete={canAccess('drivers', 'delete') ? async (id) => {
          const loadingToastId = showLoading('Suppression du conducteur...');
          const result = await onDelete('drivers', { id }, 'delete');
          if (result.success) {
            updateToast(loadingToastId, result.message || 'Conducteur supprimé avec succès !', 'success');
          } else {
            updateToast(loadingToastId, result.error || 'Erreur lors de la suppression du conducteur.', 'error');
          }
        } : undefined}
        addLabel="Ajouter Conducteur"
        searchPlaceholder="Rechercher un conducteur par nom, permis, statut ou téléphone..."
        exportFileName="conducteurs"
        isLoading={isLoadingFleet}
        renderAlerts={renderAlerts}
        resourceType="drivers"
        renderCustomHeaderButtons={renderCustomHeaderButtons} // Pass the custom buttons
      />

      {/* Modal */}
      <Dialog open={showModal} onOpenChange={handleCloseModal}>
        <DialogContent className="sm:max-w-[425px] glass animate-scale-in">
          <DialogHeader>
            <DialogTitle>{editingDriver ? 'Modifier un Conducteur' : 'Ajouter un Conducteur'}</DialogTitle>
            <DialogDescription>
              {editingDriver ? 'Modifiez les détails du conducteur.' : 'Ajoutez un nouveau conducteur.'}
            </DialogDescription>
          </DialogHeader>
          <FormProvider {...methods}>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
              <FormField name="name" label="Nom complet" type="text" placeholder="Ex: John Doe" disabled={(!canEditForm && !!editingDriver) || (!canAddForm && !editingDriver)} />
              <FormField name="license" label="Numéro de permis" type="text" placeholder="Ex: 123456789" disabled={(!canEditForm && !!editingDriver) || (!canAddForm && !editingDriver)} />
              <FormField name="expiration" label="Date d'expiration" type="date" disabled={(!canEditForm && !!editingDriver) || (!canAddForm && !editingDriver)} />
              <FormField name="status" label="Statut" type="select" options={[
                { value: 'Disponible', label: 'Disponible' },
                { value: 'En mission', label: 'En mission' },
                { value: 'Repos', label: 'Repos' },
                { value: 'Congé', label: 'Congé' },
              ]} disabled={(!canEditForm && !!editingDriver) || (!canAddForm && !editingDriver)} />
              <FormField name="phone" label="Téléphone" type="tel" placeholder="Ex: +216 22 123 456" disabled={(!canEditForm && !!editingDriver) || (!canAddForm && !editingDriver)} />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleCloseModal} className="hover-lift">
                  Annuler
                </Button>
                {(canAddForm && !editingDriver) || (canEditForm && editingDriver) ? (
                  <Button type="submit" className="hover-lift">
                    Sauvegarder
                  </Button>
                ) : null}
              </DialogFooter>
            </form>
          </FormProvider>
        </DialogContent>
      </Dialog>

      {/* XLSX Import Dialog for Drivers */}
      <XLSXImportDialog<typeof driverImportSchema>
        open={showImportDialog}
        onOpenChange={setShowImportDialog}
        title="Importer des Conducteurs depuis XLSX"
        description="Téléchargez un fichier Excel (.xlsx) contenant les données de vos conducteurs. Les colonnes doivent correspondre aux en-têtes spécifiés."
        schema={driverImportSchema}
        columnMapping={driverColumnMapping}
        onImport={handleImportDrivers}
        isLoading={false} // Adjust based on actual import loading state
      />
    </>
  );
};

export default Drivers;