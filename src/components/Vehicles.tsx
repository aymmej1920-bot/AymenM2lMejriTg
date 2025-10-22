import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { FleetData, Vehicle, DataTableColumn, VehicleImportData } from '../types';
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
import { vehicleSchema, vehicleImportSchema } from '../types/formSchemas';
import { z } from 'zod';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import FormField from './forms/FormField';
import { Button } from './ui/button';
import { usePermissions } from '../hooks/usePermissions';
import XLSXImportDialog from './XLSXImportDialog'; // Import the new component
import { Upload, Download } from 'lucide-react'; // Import Upload and Download icons
import { exportTemplateToXLSX } from '../utils/templateExport'; // Import the new utility
import { LOCAL_STORAGE_KEYS } from '../utils/constants'; // Import constants

type VehicleFormData = z.infer<typeof vehicleSchema>;

interface VehiclesProps {
  data: FleetData;
  onAdd: (vehicle: Omit<Vehicle, 'id' | 'user_id' | 'created_at'>) => void;
  onUpdate: (vehicle: Vehicle) => void;
  onDelete: (id: string) => void;
}

const Vehicles: React.FC<VehiclesProps> = ({ data, onAdd, onUpdate, onDelete }) => {
  const { canAccess } = usePermissions();

  const [showModal, setShowModal] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [showImportDialog, setShowImportDialog] = useState(false); // State for import dialog

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
  // const formValues = watch(); // Watch all form fields // Removed unused variable

  // Function to reset form and clear saved data
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

  // Effect to load saved form data when modal opens for a new vehicle
  useEffect(() => {
    if (showModal && !editingVehicle) { // Only for new vehicle forms
      const savedFormData = localStorage.getItem(LOCAL_STORAGE_KEYS.VEHICLE_FORM_DATA);
      if (savedFormData) {
        try {
          const parsedData = JSON.parse(savedFormData);
          // Ensure date format is correct for input type="date"
          if (parsedData.last_service_date) {
            parsedData.last_service_date = new Date(parsedData.last_service_date).toISOString().split('T')[0];
          }
          reset(parsedData);
        } catch (e) {
          console.error("Failed to parse saved vehicle form data", e);
          localStorage.removeItem(LOCAL_STORAGE_KEYS.VEHICLE_FORM_DATA);
        }
      }
    }
  }, [showModal, editingVehicle, reset]);

  // Effect to save form data to localStorage whenever it changes (for new vehicle forms)
  useEffect(() => {
    if (showModal && !editingVehicle) { // Only save for new vehicle forms
      const subscription = watch((value) => {
        localStorage.setItem(LOCAL_STORAGE_KEYS.VEHICLE_FORM_DATA, JSON.stringify(value));
      });
      return () => subscription.unsubscribe();
    }
  }, [showModal, editingVehicle, watch]);

  // Reset form when editingVehicle changes (for edit mode) or when modal closes (for new mode)
  React.useEffect(() => {
    if (editingVehicle) {
      reset(editingVehicle);
    } else {
      resetFormAndClearStorage(); // Use the new reset function
    }
  }, [editingVehicle, resetFormAndClearStorage]);

  const handleAddVehicle = () => {
    setEditingVehicle(null);
    resetFormAndClearStorage(); // Clear any previous unsaved data
    setShowModal(true);
  };

  const handleEditVehicle = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle);
    setShowModal(true);
  };

  const onSubmit = async (formData: VehicleFormData) => {
    if (editingVehicle) {
      await onUpdate({ ...formData, id: editingVehicle.id, user_id: editingVehicle.user_id, created_at: editingVehicle.created_at });
      showSuccess('Véhicule mis à jour avec succès !');
    } else {
      await onAdd(formData);
      showSuccess('Véhicule ajouté avec succès !');
    }
    setShowModal(false);
    resetFormAndClearStorage(); // Clear saved data on successful submission
  };

  const handleCloseModal = () => {
    setShowModal(false);
    resetFormAndClearStorage(); // Clear saved data on modal close
  };

  const handleImportVehicles = async (importedData: VehicleImportData[]) => {
    // For simplicity, we'll treat all imported data as new additions.
    // A more complex logic could check for existing plates and offer to update.
    for (const vehicleData of importedData) {
      await onAdd(vehicleData);
    }
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
  const canImport = canAccess('vehicles', 'add'); // Assuming import is an 'add' action

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
        data={data.vehicles}
        columns={columns}
        onAdd={canAddForm ? handleAddVehicle : undefined}
        onEdit={canEditForm ? handleEditVehicle : undefined}
        onDelete={canAccess('vehicles', 'delete') ? onDelete : undefined}
        addLabel="Ajouter Véhicule"
        searchPlaceholder="Rechercher par plaque, type ou statut..."
        exportFileName="vehicules"
        isLoading={false}
        resourceType="vehicles"
        renderCustomHeaderButtons={renderCustomHeaderButtons} // Pass the custom buttons
      />

      {/* Modal for Add/Edit Vehicle */}
      <Dialog open={showModal} onOpenChange={handleCloseModal}> {/* Use handleCloseModal here */}
        <DialogContent className="sm:max-w-[425px] glass animate-scale-in">
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
                <Button type="button" variant="outline" onClick={handleCloseModal} className="hover-lift"> {/* Updated onClick */}
                  Annuler
                </Button>
                {(canAddForm && !editingVehicle) || (canEditForm && editingVehicle) ? (
                  <Button type="submit" className="hover-lift">
                    Sauvegarder
                  </Button>
                ) : null}
              </DialogFooter>
            </form>
          </FormProvider>
        </DialogContent>
      </Dialog>

      {/* XLSX Import Dialog for Vehicles */}
      <XLSXImportDialog<typeof vehicleImportSchema>
        open={showImportDialog}
        onOpenChange={setShowImportDialog}
        title="Importer des Véhicules depuis XLSX"
        description="Téléchargez un fichier Excel (.xlsx) contenant les données de vos véhicules. Les colonnes doivent correspondre aux en-têtes spécifiés."
        schema={vehicleImportSchema}
        columnMapping={vehicleColumnMapping}
        onImport={handleImportVehicles}
        isLoading={false} // Adjust based on actual import loading state
      />
    </>
  );
};

export default Vehicles;