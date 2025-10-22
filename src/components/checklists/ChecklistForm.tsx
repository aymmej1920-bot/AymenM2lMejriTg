import React, { useCallback, useEffect } from 'react';
import { useForm, FormProvider } from 'react-hook-form'; // Import FormProvider
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '../ui/button';
import { DialogFooter } from '../ui/dialog';
import FormField from '../forms/FormField';
import { preDepartureChecklistSchema } from '../../types/formSchemas';
import { FleetData, PreDepartureChecklist, Vehicle, Driver, Resource, Action } from '../../types';
import { showSuccess, showError } from '../../utils/toast';
import { LOCAL_STORAGE_KEYS } from '../../utils/constants';

type PreDepartureChecklistFormData = z.infer<typeof preDepartureChecklistSchema>;

interface ChecklistFormProps {
  vehicles: Vehicle[];
  drivers: Driver[];
  onAdd: (tableName: Resource, checklist: Omit<PreDepartureChecklist, 'id' | 'user_id' | 'created_at'>, action: Action) => Promise<void>;
  onClose: () => void;
  canAdd: boolean;
  hasChecklistForMonth: (vehicleId: string, month: number, year: number) => boolean;
}

const ChecklistForm: React.FC<ChecklistFormProps> = ({ vehicles, drivers, onAdd, onClose, canAdd, hasChecklistForMonth }) => {
  const methods = useForm<PreDepartureChecklistFormData>({ // Use methods from useForm
    resolver: zodResolver(preDepartureChecklistSchema),
    defaultValues: {
      vehicle_id: '',
      driver_id: null,
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
      observations: null,
      issues_to_address: null,
    }
  });

  const { handleSubmit, reset, watch, formState: { errors = {} } } = methods; // Destructure from methods

  const resetFormAndClearStorage = useCallback(() => {
    reset({
      vehicle_id: '',
      driver_id: null,
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
      observations: null,
      issues_to_address: null,
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
      } catch (e) {
        console.error("Failed to parse saved checklist form data", e);
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
    if (!canAdd) {
      showError('Vous n\'avez pas la permission d\'ajouter une checklist.');
      return;
    }

    if (Object.keys(errors).length > 0) {
      console.log('Form validation errors:', errors);
      showError('Veuillez corriger les erreurs dans le formulaire.');
      return;
    }

    const { vehicle_id, date } = formData;

    const checklistDate = new Date(date);
    const submissionMonth = checklistDate.getMonth();
    const submissionYear = checklistDate.getFullYear();

    if (hasChecklistForMonth(vehicle_id, submissionMonth, submissionYear)) {
      showError('Une checklist pour ce véhicule a déjà été soumise ce mois-ci. Une seule checklist par véhicule par mois est autorisée.');
      return;
    }

    const dataToSubmit = {
      ...formData,
      driver_id: formData.driver_id === '' ? null : formData.driver_id,
      observations: formData.observations === '' ? null : formData.observations,
      issues_to_address: formData.issues_to_address === '' ? null : formData.issues_to_address,
    };

    await onAdd('pre_departure_checklists', dataToSubmit, 'add');
    showSuccess('Checklist ajoutée avec succès !');
    onClose();
    resetFormAndClearStorage();
  };

  const renderBooleanRadio = (name: keyof PreDepartureChecklistFormData, label: string) => (
    <div className="flex items-center justify-between">
      <label className="text-sm font-semibold text-gray-900">{label}</label>
      <div className="flex space-x-4">
        <div className="flex items-center space-x-1">
          <input
            type="radio"
            id={`${name}_ok`}
            value="true"
            {...methods.register(name, { setValueAs: v => v === 'true' })} // Use methods.register
            className="h-4 w-4 text-green-600 bg-white border border-gray-300 shadow-sm focus:ring-green-500"
            disabled={!canAdd}
          />
          <label htmlFor={`${name}_ok`} className="text-sm font-semibold text-gray-900">OK</label>
        </div>
        <div className="flex items-center space-x-1">
          <input
            type="radio"
            id={`${name}_nok`}
            value="false"
            {...methods.register(name, { setValueAs: v => v === 'true' })} // Use methods.register
            className="h-4 w-4 text-red-600 bg-white border border-gray-300 shadow-sm focus:ring-red-500"
            disabled={!canAdd}
          />
          <label htmlFor={`${name}_nok`} className="text-sm font-semibold text-gray-900">NOK</label>
        </div>
      </div>
    </div>
  );

  return (
    <FormProvider {...methods}> {/* Wrap the form with FormProvider */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            name="date"
            label="Date"
            type="date"
            disabled={!canAdd}
          />
          <FormField
            name="vehicle_id"
            label="Véhicule"
            type="select"
            options={vehicles.map(v => ({ value: v.id, label: `${v.plate} - ${v.type}` }))}
            placeholder="Sélectionner un véhicule"
            disabled={!canAdd}
          />
        </div>

        <FormField
          name="driver_id"
          label="Conducteur (Optionnel)"
          type="select"
          options={[{ value: '', label: 'Sélectionner un conducteur' }, ...drivers.map(d => ({ value: d.id, label: d.name }))]}
          placeholder="Sélectionner un conducteur"
          disabled={!canAdd}
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
          disabled={!canAdd}
        />
        <FormField
          name="issues_to_address"
          label="Points à traiter"
          type="textarea"
          placeholder="Problèmes identifiés nécessitant une action..."
          disabled={!canAdd}
        />

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="hover-lift"
          >
            Annuler
          </Button>
          {canAdd && (
            <Button
              type="submit"
              className="hover-lift"
            >
              Sauvegarder
            </Button>
          )}
        </DialogFooter>
      </form>
    </FormProvider>
  );
};

export default ChecklistForm;