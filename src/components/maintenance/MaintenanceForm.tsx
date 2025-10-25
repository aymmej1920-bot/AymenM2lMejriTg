import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '../ui/button';
import { DialogFooter } from '../ui/dialog';
import FormField from '../forms/FormField';
import { maintenanceEntrySchema } from '../../types/formSchemas';
import { MaintenanceEntry, Resource, Action, OperationResult } from '../../types';
import { showError, showLoading, updateToast, showSuccess } from '../../utils/toast';
import { LOCAL_STORAGE_KEYS } from '../../utils/constants';
import { useFleetData } from '../FleetDataProvider';
import { usePermissions } from '../../hooks/usePermissions';
import { Loader2 } from 'lucide-react';

type MaintenanceEntryFormData = z.infer<typeof maintenanceEntrySchema>;

interface MaintenanceFormProps {
  onAdd: (tableName: Resource, maintenanceEntry: Omit<MaintenanceEntry, 'id' | 'user_id' | 'created_at'>, action: Action) => Promise<OperationResult>;
  onUpdateVehicle: (tableName: Resource, vehicle: { id: string; last_service_date: string; last_service_mileage: number; mileage: number }, action: Action) => Promise<OperationResult>;
  onClose: () => void;
  editingEntry?: MaintenanceEntry | null;
  initialVehicleId?: string;
  onUpdateSchedule?: (maintenanceEntry: MaintenanceEntry) => Promise<void>; // New prop
}

const MaintenanceForm: React.FC<MaintenanceFormProps> = ({
  onAdd,
  onUpdateVehicle,
  onClose,
  editingEntry,
  initialVehicleId,
  onUpdateSchedule, // Destructure new prop
}) => {
  const { fleetData } = useFleetData();
  const vehicles = fleetData.vehicles;
  const { canAccess } = usePermissions();

  const [isSubmitting, setIsSubmitting] = useState(false);

  const methods = useForm<MaintenanceEntryFormData>({
    resolver: zodResolver(maintenanceEntrySchema),
    defaultValues: useMemo(() => editingEntry || {
      vehicle_id: initialVehicleId || '',
      type: 'Vidange',
      date: new Date().toISOString().split('T')[0],
      mileage: initialVehicleId ? (vehicles.find(v => v.id === initialVehicleId)?.mileage || 0) : 0,
      cost: 0,
      description: '', // New field
      parts_cost: 0,   // New field
      labor_cost: 0,   // New field
    }, [editingEntry, initialVehicleId, vehicles]),
  });

  const { handleSubmit, reset, watch, setValue } = methods;

  const resetFormAndClearStorage = useCallback(() => {
    reset({
      vehicle_id: initialVehicleId || '',
      type: 'Vidange',
      date: new Date().toISOString().split('T')[0],
      mileage: initialVehicleId ? (vehicles.find(v => v.id === initialVehicleId)?.mileage || 0) : 0,
      cost: 0,
      description: '',
      parts_cost: 0,
      labor_cost: 0,
    });
    localStorage.removeItem(LOCAL_STORAGE_KEYS.MAINTENANCE_FORM_DATA);
  }, [reset, initialVehicleId, vehicles]);

  useEffect(() => {
    if (editingEntry) {
      reset(editingEntry);
    } else if (initialVehicleId) {
      reset({
        vehicle_id: initialVehicleId,
        type: 'Vidange',
        date: new Date().toISOString().split('T')[0],
        mileage: vehicles.find(v => v.id === initialVehicleId)?.mileage || 0,
        cost: 0,
        description: '',
        parts_cost: 0,
        labor_cost: 0,
      });
    } else {
      const savedFormData = localStorage.getItem(LOCAL_STORAGE_KEYS.MAINTENANCE_FORM_DATA);
      if (savedFormData) {
        try {
          const parsedData = JSON.parse(savedFormData);
          if (parsedData.date) {
            parsedData.date = new Date(parsedData.date).toISOString().split('T')[0];
          }
          reset(parsedData);
        } catch (e: unknown) {
          console.error("Failed to parse saved maintenance form data", e instanceof Error ? e.message : String(e));
          localStorage.removeItem(LOCAL_STORAGE_KEYS.MAINTENANCE_FORM_DATA);
        }
      }
    }
  }, [editingEntry, initialVehicleId, reset, vehicles]);

  useEffect(() => {
    const subscription = watch((value: Partial<MaintenanceEntryFormData>) => {
      localStorage.setItem(LOCAL_STORAGE_KEYS.MAINTENANCE_FORM_DATA, JSON.stringify(value));
    });
    return () => subscription.unsubscribe();
  }, [watch]);

  // Calculate total cost whenever parts_cost or labor_cost changes
  useEffect(() => {
    const subscription = watch((value, { name }) => {
      if (name === 'parts_cost' || name === 'labor_cost') {
        const parts = value.parts_cost || 0;
        const labor = value.labor_cost || 0;
        setValue('cost', parts + labor);
      }
    });
    return () => subscription.unsubscribe();
  }, [watch, setValue]);

  const onSubmit = async (maintenanceData: MaintenanceEntryFormData) => {
    setIsSubmitting(true);
    const loadingToastId = showLoading(editingEntry ? 'Mise à jour de l\'entrée de maintenance...' : 'Ajout de l\'entrée de maintenance...');
    let result: OperationResult;
    try {
      if (editingEntry) {
        throw new Error("Editing existing maintenance entries is not supported via this form.");
      } else {
        result = await onAdd('maintenance_entries', maintenanceData, 'add');
      }

      if (result.success) {
        updateToast(loadingToastId, result.message || 'Entrée de maintenance ajoutée avec succès !', 'success');
        
        // If onUpdateSchedule is provided, call it to update the linked schedule
        if (onUpdateSchedule) {
          // We need the full MaintenanceEntry object, including the ID generated by Supabase
          // Assuming result.id contains the new ID, and user_id/created_at are handled by Supabase
          const fullMaintenanceEntry: MaintenanceEntry = {
            ...maintenanceData,
            id: result.id!, // Use the ID returned from the add operation
            user_id: '', // Will be filled by Supabase, or can be passed if needed
            created_at: new Date().toISOString(), // Placeholder, actual will be from DB
          };
          await onUpdateSchedule(fullMaintenanceEntry);
        }

      } else {
        throw new Error(result.error || 'Erreur lors de l\'ajout de l\'entrée de maintenance.');
      }

      if (maintenanceData.type === 'Vidange') {
        const updateVehicleResult = await onUpdateVehicle('vehicles', {
          id: maintenanceData.vehicle_id,
          last_service_date: maintenanceData.date,
          last_service_mileage: maintenanceData.mileage,
          mileage: maintenanceData.mileage,
        }, 'edit');
        if (updateVehicleResult.success) {
          showSuccess('Informations du véhicule mises à jour après la vidange !');
        } else {
          showError(updateVehicleResult.error || 'Erreur lors de la mise à jour des informations du véhicule.');
        }
      }

      onClose();
      resetFormAndClearStorage();
    } catch (error: unknown) {
      updateToast(loadingToastId, (error instanceof Error ? error.message : String(error)) || 'Erreur lors de l\'opération.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const canAddForm = canAccess('maintenance_entries', 'add');
  // const canEditForm = canAccess('maintenance_entries', 'edit'); // Removed unused variable

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
        <FormField
          name="vehicle_id"
          label="Véhicule"
          type="select"
          options={[{ value: '', label: 'Sélectionner un véhicule' }, ...vehicles.map(vehicle => ({ value: vehicle.id, label: `${vehicle.plate} - ${vehicle.type}` }))]}
          placeholder="Sélectionner un véhicule"
          disabled={isSubmitting || !canAddForm}
        />
        <FormField
          name="type"
          label="Type de maintenance"
          type="select"
          options={[
            { value: 'Vidange', label: 'Vidange' },
            { value: 'Réparation', label: 'Réparation' },
            { value: 'Contrôle', label: 'Contrôle' },
            { value: 'Pneus', label: 'Pneus' },
            { value: 'Freins', label: 'Freins' },
            { value: 'Autre', label: 'Autre' },
          ]}
          disabled={isSubmitting || !canAddForm}
        />
        <FormField
          name="date"
          label="Date"
          type="date"
          disabled={isSubmitting || !canAddForm}
        />
        <FormField
          name="mileage"
          label="Kilométrage"
          type="number"
          disabled={isSubmitting || !canAddForm}
        />
        <FormField
          name="description"
          label="Description"
          type="textarea"
          placeholder="Description détaillée de la maintenance..."
          disabled={isSubmitting || !canAddForm}
        />
        <div className="grid grid-cols-2 gap-4">
          <FormField
            name="parts_cost"
            label="Coût des pièces (TND)"
            type="number"
            step="0.01"
            disabled={isSubmitting || !canAddForm}
          />
          <FormField
            name="labor_cost"
            label="Coût main-d'œuvre (TND)"
            type="number"
            step="0.01"
            disabled={isSubmitting || !canAddForm}
          />
        </div>
        <FormField
          name="cost"
          label="Coût Total (TND)"
          type="number"
          step="0.01"
          disabled={true} // This field is now calculated automatically
        />
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="hover-lift"
            disabled={isSubmitting}
          >
            Annuler
          </Button>
          {canAddForm && (
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
          )}
        </DialogFooter>
      </form>
    </FormProvider>
  );
};

export default MaintenanceForm;