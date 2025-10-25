import React, { useEffect, useMemo, useState } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '../ui/button';
import { DialogFooter } from '../ui/dialog';
import FormField from '../forms/FormField';
import { maintenanceScheduleSchema } from '../../types/formSchemas';
import { MaintenanceSchedule, Resource, Action, OperationResult } from '../../types';
import { showLoading, updateToast } from '../../utils/toast'; // Removed showError
import { useFleetData } from '../FleetDataProvider';
// import { usePermissions } from '../../hooks/usePermissions'; // Removed import
import { Loader2 } from 'lucide-react';
import moment from 'moment';

type MaintenanceScheduleFormData = z.infer<typeof maintenanceScheduleSchema>;

interface MaintenanceScheduleFormProps {
  onAdd: (tableName: Resource, schedule: Omit<MaintenanceSchedule, 'id' | 'user_id' | 'created_at'>, action: Action) => Promise<OperationResult>;
  onUpdate: (tableName: Resource, schedule: MaintenanceSchedule, action: Action) => Promise<OperationResult>;
  onClose: () => void;
  editingSchedule?: MaintenanceSchedule | null;
}

const MaintenanceScheduleForm: React.FC<MaintenanceScheduleFormProps> = ({
  onAdd,
  onUpdate,
  onClose,
  editingSchedule,
}) => {
  const { fleetData } = useFleetData();
  const vehicles = fleetData.vehicles;
  // const { canAccess } = usePermissions(); // Removed usePermissions

  const [isSubmitting, setIsSubmitting] = useState(false);

  const methods = useForm<MaintenanceScheduleFormData>({
    resolver: zodResolver(maintenanceScheduleSchema),
    defaultValues: useMemo(() => editingSchedule || {
      vehicle_id: '',
      vehicle_type: '',
      task_type: '',
      interval_km: null,
      interval_months: null,
      last_performed_date: null,
      last_performed_mileage: null,
      next_due_date: null,
      next_due_mileage: null,
      notes: '',
    }, [editingSchedule]),
  });

  const { handleSubmit, reset, watch, setValue } = methods;

  const intervalKm = watch('interval_km');
  const intervalMonths = watch('interval_months');
  const lastPerformedDate = watch('last_performed_date');
  const lastPerformedMileage = watch('last_performed_mileage');
  const vehicleId = watch('vehicle_id');

  // Calculate next due date/mileage
  useEffect(() => {
    const calculateNextDue = () => {
      let newNextDueDate: string | null = null;
      let newNextDueMileage: number | null = null;

      // Calculate next due date
      if (lastPerformedDate && intervalMonths) {
        newNextDueDate = moment(lastPerformedDate).add(intervalMonths, 'months').format('YYYY-MM-DD');
      } else if (!lastPerformedDate && intervalMonths) {
        // If no last performed date, assume from now
        newNextDueDate = moment().add(intervalMonths, 'months').format('YYYY-MM-DD');
      }

      // Calculate next due mileage
      if (lastPerformedMileage !== null && lastPerformedMileage !== undefined && intervalKm) {
        newNextDueMileage = lastPerformedMileage + intervalKm;
      } else if (vehicleId && intervalKm) {
        const currentVehicle = vehicles.find(v => v.id === vehicleId);
        if (currentVehicle) {
          newNextDueMileage = currentVehicle.mileage + intervalKm;
        }
      } else if (!lastPerformedMileage && intervalKm) {
        // If no last performed mileage and no specific vehicle, can't calculate mileage
        newNextDueMileage = null;
      }

      setValue('next_due_date', newNextDueDate);
      setValue('next_due_mileage', newNextDueMileage);
    };

    calculateNextDue();
  }, [intervalKm, intervalMonths, lastPerformedDate, lastPerformedMileage, vehicleId, vehicles, setValue]);

  useEffect(() => {
    if (editingSchedule) {
      reset(editingSchedule);
    } else {
      reset({
        vehicle_id: '',
        vehicle_type: '',
        task_type: '',
        interval_km: null,
        interval_months: null,
        last_performed_date: null,
        last_performed_mileage: null,
        next_due_date: null,
        next_due_mileage: null,
        notes: '',
      });
    }
  }, [editingSchedule, reset]);

  const onSubmit = async (formData: MaintenanceScheduleFormData) => {
    // All authenticated users can add/edit schedules
    // if (!canAccess('maintenance_schedules', editingSchedule ? 'edit' : 'add')) {
    //   showError('Vous n\'avez pas la permission d\'effectuer cette action.');
    //   return;
    // }

    setIsSubmitting(true);
    const loadingToastId = showLoading(editingSchedule ? 'Mise à jour du planning de maintenance...' : 'Ajout du planning de maintenance...');
    let result: OperationResult;

    const dataToSubmit = {
      ...formData,
      vehicle_id: formData.vehicle_id === '' ? null : formData.vehicle_id,
      vehicle_type: formData.vehicle_type === '' ? null : formData.vehicle_type,
      interval_km: formData.interval_km === 0 ? null : formData.interval_km,
      interval_months: formData.interval_months === 0 ? null : formData.interval_months,
      last_performed_date: formData.last_performed_date === '' ? null : formData.last_performed_date,
      last_performed_mileage: formData.last_performed_mileage === 0 ? null : formData.last_performed_mileage,
      next_due_date: formData.next_due_date === '' ? null : formData.next_due_date,
      next_due_mileage: formData.next_due_mileage === 0 ? null : formData.next_due_mileage,
      notes: formData.notes === '' ? null : formData.notes,
    };

    try {
      if (editingSchedule) {
        result = await onUpdate('maintenance_schedules', { ...dataToSubmit, id: editingSchedule.id, user_id: editingSchedule.user_id, created_at: editingSchedule.created_at }, 'edit');
      } else {
        result = await onAdd('maintenance_schedules', dataToSubmit, 'add');
      }

      if (result.success) {
        updateToast(loadingToastId, result.message || 'Opération réussie !', 'success');
        onClose();
      } else {
        throw new Error(result.error || 'Opération échouée.');
      }
    } catch (error: unknown) {
      updateToast(loadingToastId, (error instanceof Error ? error.message : String(error)) || 'Erreur lors de l\'opération.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const canEditSchedule = true; // All authenticated users can edit their own data
  const canAddSchedule = true; // All authenticated users can add their own data

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
        <FormField
          name="task_type"
          label="Type de tâche"
          type="text"
          placeholder="Ex: Vidange moteur, Contrôle technique"
          disabled={isSubmitting || (editingSchedule && !canEditSchedule) || (!editingSchedule && !canAddSchedule)}
        />
        <div className="grid grid-cols-2 gap-4">
          <FormField
            name="vehicle_id"
            label="Véhicule spécifique (optionnel)"
            type="select"
            options={[{ value: '', label: 'Tous les véhicules' }, ...vehicles.map(v => ({ value: v.id, label: `${v.plate} - ${v.type}` }))]}
            placeholder="Sélectionner un véhicule"
            disabled={isSubmitting || (editingSchedule && !canEditSchedule) || (!editingSchedule && !canAddSchedule)}
          />
          <FormField
            name="vehicle_type"
            label="Type de véhicule (optionnel)"
            type="select"
            options={[{ value: '', label: 'Tous les types' }, ...Array.from(new Set(vehicles.map(v => v.type))).map(type => ({ value: type, label: type }))]}
            placeholder="Sélectionner un type"
            disabled={isSubmitting || (editingSchedule && !canEditSchedule) || (!editingSchedule && !canAddSchedule)}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField
            name="interval_km"
            label="Intervalle (km)"
            type="number"
            min={0}
            placeholder="Ex: 10000"
            disabled={isSubmitting || (editingSchedule && !canEditSchedule) || (!editingSchedule && !canAddSchedule)}
          />
          <FormField
            name="interval_months"
            label="Intervalle (mois)"
            type="number"
            min={0}
            placeholder="Ex: 6"
            disabled={isSubmitting || (editingSchedule && !canEditSchedule) || (!editingSchedule && !canAddSchedule)}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField
            name="last_performed_date"
            label="Date dernière exécution"
            type="date"
            disabled={isSubmitting || (editingSchedule && !canEditSchedule) || (!editingSchedule && !canAddSchedule)}
          />
          <FormField
            name="last_performed_mileage"
            label="Km dernière exécution"
            type="number"
            min={0}
            disabled={isSubmitting || (editingSchedule && !canEditSchedule) || (!editingSchedule && !canAddSchedule)}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField
            name="next_due_date"
            label="Prochaine échéance (Date)"
            type="date"
            disabled={true} // Calculated field
          />
          <FormField
            name="next_due_mileage"
            label="Prochain Km"
            type="number"
            disabled={true} // Calculated field
          />
        </div>
        <FormField
          name="notes"
          label="Notes"
          type="textarea"
          placeholder="Notes supplémentaires sur le planning..."
          disabled={isSubmitting || (editingSchedule && !canEditSchedule) || (!editingSchedule && !canAddSchedule)}
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
          {((canAddSchedule && !editingSchedule) || (canEditSchedule && editingSchedule)) && (
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

export default MaintenanceScheduleForm;