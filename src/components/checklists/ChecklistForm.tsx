import React, { useCallback, useEffect, useState } from 'react';
import { useForm, FormProvider, Controller, FieldErrors } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '../ui/button';
import { DialogFooter } from '../ui/dialog';
import FormField from '../forms/FormField';
import { preDepartureChecklistSchema } from '../../types/formSchemas';
import { PreDepartureChecklist, Resource, Action, OperationResult, Vehicle, Driver } from '../../types';
import { showError, showLoading, updateToast } from '../../utils/toast'; // Removed showSuccess
import { LOCAL_STORAGE_KEYS } from '../../utils/constants';
import { useFleetData } from '../../components/FleetDataProvider';
import { Loader2 } from 'lucide-react'; // Import Loader2

type PreDepartureChecklistFormData = z.infer<typeof preDepartureChecklistSchema>;

interface ChecklistFormProps {
  onAdd: (tableName: Resource, checklist: Omit<PreDepartureChecklist, 'id' | 'user_id' | 'created_at'>, action: Action) => Promise<OperationResult>;
  onClose: () => void;
  canAdd: boolean;
  hasChecklistForMonth: (vehicleId: string, month: number, year: number) => boolean;
}

const ChecklistForm: React.FC<ChecklistFormProps> = ({ onAdd, onClose, canAdd, hasChecklistForMonth }) => {
  const { fleetData } = useFleetData();
  const vehicles = fleetData.vehicles;
  const drivers = fleetData.drivers;

  const [isSubmitting, setIsSubmitting] = useState(false); // Add isSubmitting state

  const methods = useForm<PreDepartureChecklistFormData>({
    resolver: zodResolver(preDepartureChecklistSchema),
    defaultValues: {
      vehicle_id: '',
      driver_id: '',
      date: new Date().toISOString().split('T')[0],
      tire_pressure_ok: false,
      lights_ok: false,
      oil_level_ok: false,
      fluid_levels_ok: false,
      brakes_ok: false,
      wipers_ok: false,
      horn_ok: false,
      mirrors_ok: false,
      ac_working_ok: false,
      windows_working_ok: false,
      observations: '',
      issues_to_address: '',
    }
  });

  const { handleSubmit, reset, watch, control } = methods; // Removed unused 'errors' from formState

  const resetFormAndClearStorage = useCallback(() => {
    reset({
      vehicle_id: '',
      driver_id: '',
      date: new Date().toISOString().split('T')[0],
      tire_pressure_ok: false,
      lights_ok: false,
      oil_level_ok: false,
      fluid_levels_ok: false,
      brakes_ok: false,
      wipers_ok: false,
      horn_ok: false,
      mirrors_ok: false,
      ac_working_ok: false,
      windows_working_ok: false,
      observations: '',
      issues_to_address: '',
    });
    localStorage.removeItem(LOCAL_STORAGE_KEYS.CHECKLIST_FORM_DATA);
  }, [reset]);

  useEffect(() => {
    const savedFormData = localStorage.getItem(LOCAL_STORAGE_KEYS.CHECKLIST_FORM_DATA);
    if (savedFormData) {
      try {
        const parsedData = JSON.parse(savedFormData);
        if (parsedData.date) {
          parsedData.date = new Date(parsedData.date).toISOString().split('T')[0];
        }
        reset(parsedData);
      } catch (e: unknown) {
        console.error("Failed to parse saved checklist form data", e instanceof Error ? e.message : String(e));
        localStorage.removeItem(LOCAL_STORAGE_KEYS.CHECKLIST_FORM_DATA);
      }
    }
  }, [reset]);

  useEffect(() => {
    const subscription = watch((value) => {
      localStorage.setItem(LOCAL_STORAGE_KEYS.CHECKLIST_FORM_DATA, JSON.stringify(value));
    });
    return () => subscription.unsubscribe();
  }, [watch]);

  const onSubmit = async (formData: PreDepartureChecklistFormData) => {
    console.log("[ChecklistForm] onSubmit called with formData:", formData);
    if (!canAdd) {
      showError('Vous n\'avez pas la permission d\'ajouter une checklist.');
      return;
    }

    setIsSubmitting(true); // Set submitting to true
    const loadingToastId = showLoading('Ajout de la checklist...');

    const { vehicle_id, date } = formData;

    const checklistDate = new Date(date);
    const submissionMonth = checklistDate.getMonth();
    const submissionYear = checklistDate.getFullYear();

    console.log(`[ChecklistForm] Checking for existing checklist for vehicle_id: ${vehicle_id}, month: ${submissionMonth}, year: ${submissionYear}`);
    if (hasChecklistForMonth(vehicle_id, submissionMonth, submissionYear)) {
      console.log("[ChecklistForm] Existing checklist found for this vehicle and month.");
      updateToast(loadingToastId, 'Une checklist pour ce véhicule a déjà été soumise ce mois-ci. Une seule checklist par véhicule par mois est autorisée.', 'error');
      setIsSubmitting(false); // Reset submitting state
      return;
    }
    console.log("[ChecklistForm] No existing checklist found for this vehicle and month. Proceeding with submission.");

    const dataToSubmit = {
      ...formData,
      driver_id: formData.driver_id === '' ? null : formData.driver_id,
      observations: formData.observations === '' ? null : formData.observations,
      issues_to_address: formData.issues_to_address === '' ? null : formData.issues_to_address,
    };

    try {
      const result = await onAdd('pre_departure_checklists', dataToSubmit, 'add');
      console.log("[ChecklistForm] onAdd result:", result);
      if (result.success) {
        updateToast(loadingToastId, 'Checklist ajoutée avec succès !', 'success');
        onClose();
        resetFormAndClearStorage();
      } else {
        throw new Error(result.error || 'Erreur lors de l\'ajout de la checklist.');
      }
    } catch (error: unknown) {
      console.error("[ChecklistForm] Erreur lors de l'ajout de la checklist:", error instanceof Error ? error.message : String(error));
      updateToast(loadingToastId, `Erreur lors de l'ajout de la checklist: ${error instanceof Error ? error.message : 'Une erreur inconnue est survenue.'}`, 'error');
    } finally {
      setIsSubmitting(false); // Reset submitting state
    }
  };

  const onErrors = (errors: FieldErrors<PreDepartureChecklistFormData>) => {
    console.error("[ChecklistForm] Form validation errors:", errors);
    showError('Veuillez corriger les erreurs dans le formulaire.');
  };

  const renderBooleanRadio = (name: keyof PreDepartureChecklistFormData, label: string) => (
    <div className="flex items-center justify-between">
      <label className="text-sm font-semibold text-gray-900">{label}</label>
      <div className="flex space-x-4">
        <Controller
          name={name}
          control={control}
          render={({ field }) => (
            <>
              <div className="flex items-center space-x-1">
                <input
                  type="radio"
                  id={`${name}_ok`}
                  value="true"
                  checked={field.value === true}
                  onChange={() => field.onChange(true)}
                  className="h-4 w-4 text-green-600 bg-white border border-gray-300 shadow-sm focus:ring-green-500"
                  disabled={!canAdd || isSubmitting} // Disable if submitting
                />
                <label htmlFor={`${name}_ok`} className="text-sm font-semibold text-gray-900">OK</label>
              </div>
              <div className="flex items-center space-x-1">
                <input
                  type="radio"
                  id={`${name}_nok`}
                  value="false"
                  checked={field.value === false}
                  onChange={() => field.onChange(false)}
                  className="h-4 w-4 text-red-600 bg-white border border-gray-300 shadow-sm focus:ring-red-500"
                  disabled={!canAdd || isSubmitting} // Disable if submitting
                />
                <label htmlFor={`${name}_nok`} className="text-sm font-semibold text-gray-900">NOK</label>
              </div>
            </>
          )}
        />
      </div>
    </div>
  );

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit(onSubmit, onErrors)} className="space-y-4 py-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            name="date"
            label="Date"
            type="date"
            disabled={!canAdd || isSubmitting} // Disable if submitting
          />
          <FormField
            name="vehicle_id"
            label="Véhicule"
            type="select"
            options={vehicles.map((v: Vehicle) => ({ value: v.id, label: `${v.plate} - ${v.type}` }))}
            placeholder="Sélectionner un véhicule"
            disabled={!canAdd || isSubmitting} // Disable if submitting
          />
        </div>

        <FormField
          name="driver_id"
          label="Conducteur (Optionnel)"
          type="select"
          options={[{ value: '', label: 'Sélectionner un conducteur' }, ...drivers.map((d: Driver) => ({ value: d.id, label: d.name }))]}
          placeholder="Sélectionner un conducteur"
          disabled={!canAdd || isSubmitting} // Disable if submitting
        />

        <div className="grid grid-cols-2 gap-4">
          {renderBooleanRadio('tire_pressure_ok', 'Pression des pneus')}
          {renderBooleanRadio('lights_ok', 'Feux')}
          {renderBooleanRadio('oil_level_ok', "Niveau d'huile")}
          {renderBooleanRadio('fluid_levels_ok', 'Niveaux de fluides')}
          {renderBooleanRadio('brakes_ok', 'Freins')}
          {renderBooleanRadio('wipers_ok', 'Essuie-glaces')}
          {renderBooleanRadio('horn_ok', 'Klaxon')}
          {renderBooleanRadio('mirrors_ok', 'Rétroviseurs')}
          {renderBooleanRadio('ac_working_ok', 'Climatiseur')}
          {renderBooleanRadio('windows_working_ok', 'Vitres')}
        </div>

        <FormField
          name="observations"
          label="Observations"
          type="textarea"
          placeholder="Toute observation pertinente..."
          disabled={!canAdd || isSubmitting} // Disable if submitting
        />
        <FormField
          name="issues_to_address"
          label="Points à traiter"
          type="textarea"
          placeholder="Problèmes identifiés nécessitant une action..."
          disabled={!canAdd || isSubmitting} // Disable if submitting
        />

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="hover-lift"
            disabled={isSubmitting} // Disable if submitting
          >
            Annuler
          </Button>
          {canAdd && (
            <Button
              type="submit"
              className="hover-lift"
              disabled={isSubmitting} // Disable if submitting
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

export default ChecklistForm;