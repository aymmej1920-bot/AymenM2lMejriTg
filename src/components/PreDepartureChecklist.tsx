import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Calendar } from 'lucide-react';
import { FleetData, PreDepartureChecklist, DataTableColumn } from '../types';
import { showSuccess, showError } from '../utils/toast';
import { formatDate } from '../utils/date';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { preDepartureChecklistSchema } from '../types/formSchemas'; // Import the schema
import { Button } from './ui/button'; // Import shadcn Button
import { z } from 'zod'; // Import z
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from './ui/dialog'; // Import shadcn/ui Dialog components
import DataTable from './DataTable'; // Import the new DataTable component

type PreDepartureChecklistFormData = z.infer<typeof preDepartureChecklistSchema>;

interface PreDepartureChecklistProps {
  data: FleetData;
  userRole: 'admin' | 'direction' | 'utilisateur';
  onAdd: (checklist: Omit<PreDepartureChecklist, 'id' | 'user_id' | 'created_at'>) => void;
}

const PreDepartureChecklistComponent: React.FC<PreDepartureChecklistProps> = ({ data, onAdd }) => {
  const [showModal, setShowModal] = useState(false);

  const { register, handleSubmit, reset, formState: { errors = {} } } = useForm<PreDepartureChecklistFormData>({
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
      observations: null, // Ensure default is null for nullable fields
      issues_to_address: null, // Ensure default is null for nullable fields
    }
  });

  const canAdd = true; // All authenticated users can add

  useEffect(() => {
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
  }, [showModal, reset]);

  // State for filtering
  const [selectedVehicle, setSelectedVehicle] = useState<string>('');
  const [selectedDriver, setSelectedDriver] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Filtered data for DataTable
  const filteredChecklists = useMemo(() => {
    return data.pre_departure_checklists.filter(checklist => {
      // const vehicle = data.vehicles.find(v => v.id === checklist.vehicle_id); // Removed unused variable
      // const driver = data.drivers.find(d => d.id === checklist.driver_id); // Removed unused variable
      
      // DataTable's internal search will handle the main search term.
      // This filter focuses on the specific dropdowns and date range.
      const matchesVehicle = selectedVehicle ? checklist.vehicle_id === selectedVehicle : true;
      const matchesDriver = selectedDriver ? checklist.driver_id === selectedDriver : true;

      const checklistDate = new Date(checklist.date);
      const start = startDate ? new Date(startDate) : null;
      const end = endDate ? new Date(endDate) : null;

      const matchesDateRange = 
        (!start || checklistDate >= start) &&
        (!end || checklistDate <= end);

      return matchesVehicle && matchesDriver && matchesDateRange;
    });
  }, [data.pre_departure_checklists, data.vehicles, data.drivers, selectedVehicle, selectedDriver, startDate, endDate]);

  const hasChecklistForMonth = (vehicleId: string, month: number, year: number): boolean => {
    return data.pre_departure_checklists.some(cl => {
      const clDate = new Date(cl.date);
      return cl.vehicle_id === vehicleId &&
             clDate.getMonth() === month &&
             clDate.getFullYear() === year;
    });
  };

  const handleAddChecklist = () => {
    setShowModal(true);
  };

  const onSubmit = (formData: PreDepartureChecklistFormData) => {
    if (!canAdd) return;

    const { vehicle_id, date } = formData;

    const checklistDate = new Date(date);
    const submissionMonth = checklistDate.getMonth();
    const submissionYear = checklistDate.getFullYear();

    if (hasChecklistForMonth(vehicle_id, submissionMonth, submissionYear)) {
      showError('Une checklist pour ce véhicule a déjà été soumise ce mois-ci.');
      return;
    }

    // Ensure driver_id, observations, issues_to_address are explicitly null if empty string
    const dataToSubmit = {
      ...formData,
      driver_id: formData.driver_id === '' ? null : formData.driver_id,
      observations: formData.observations === '' ? null : formData.observations,
      issues_to_address: formData.issues_to_address === '' ? null : formData.issues_to_address,
    };

    onAdd(dataToSubmit);
    showSuccess('Checklist ajoutée avec succès !');
    setShowModal(false);
  };

  const getStatusIcon = (status: boolean) => {
    return status ? <CheckCircle className="w-5 h-5 text-green-500" /> : <XCircle className="w-5 h-5 text-red-500" />;
  };

  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();

  const vehiclesMissingChecklist = data.vehicles.filter(vehicle =>
    !hasChecklistForMonth(vehicle.id, currentMonth, currentYear)
  );

  const columns: DataTableColumn<PreDepartureChecklist>[] = useMemo(() => [
    { key: 'date', label: 'Date', sortable: true, defaultVisible: true, render: (item) => formatDate(item.date) },
    {
      key: 'vehicle_id',
      label: 'Véhicule',
      sortable: true,
      defaultVisible: true,
      render: (item) => data.vehicles.find(v => v.id === item.vehicle_id)?.plate || 'N/A',
    },
    {
      key: 'driver_id',
      label: 'Conducteur',
      sortable: true,
      defaultVisible: true,
      render: (item) => data.drivers.find(d => d.id === item.driver_id)?.name || 'N/A',
    },
    { key: 'tire_pressure_ok', label: 'Pneus', sortable: true, defaultVisible: true, render: (item) => getStatusIcon(item.tire_pressure_ok) },
    { key: 'lights_ok', label: 'Feux', sortable: true, defaultVisible: true, render: (item) => getStatusIcon(item.lights_ok) },
    { key: 'oil_level_ok', label: 'Huile', sortable: true, defaultVisible: true, render: (item) => getStatusIcon(item.oil_level_ok) },
    { key: 'fluid_levels_ok', label: 'Fluides', sortable: true, defaultVisible: true, render: (item) => getStatusIcon(item.fluid_levels_ok) },
    { key: 'brakes_ok', label: 'Freins', sortable: true, defaultVisible: true, render: (item) => getStatusIcon(item.brakes_ok) },
    { key: 'wipers_ok', label: 'Essuie-glaces', sortable: true, defaultVisible: true, render: (item) => getStatusIcon(item.wipers_ok) },
    { key: 'horn_ok', label: 'Klaxon', sortable: true, defaultVisible: true, render: (item) => getStatusIcon(item.horn_ok) },
    { key: 'mirrors_ok', label: 'Rétroviseurs', sortable: true, defaultVisible: true, render: (item) => getStatusIcon(item.mirrors_ok) },
    { key: 'ac_working_ok', label: 'Climatiseur', sortable: true, defaultVisible: true, render: (item) => getStatusIcon(item.ac_working_ok) },
    { key: 'windows_working_ok', label: 'Vitres', sortable: true, defaultVisible: true, render: (item) => getStatusIcon(item.windows_working_ok) },
    { key: 'observations', label: 'Observations', sortable: true, defaultVisible: true, render: (item) => item.observations || '-' },
    { key: 'issues_to_address', label: 'À Traiter', sortable: true, defaultVisible: true, render: (item) => item.issues_to_address || '-' },
  ], [data.vehicles, data.drivers]);

  const renderAlerts = useCallback(() => {
    if (vehiclesMissingChecklist.length === 0) return null;
    return (
      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r-lg">
        <div className="flex items-center">
          <AlertTriangle className="w-5 h-5 text-yellow-400 mr-3" />
          <div>
            <h3 className="text-yellow-800 font-semibold">Checklists Mensuelles Manquantes</h3>
            <p className="text-yellow-700">
              {vehiclesMissingChecklist.length} véhicule(s) n'ont pas de checklist pour ce mois-ci :{' '}
              <span className="font-medium">{vehiclesMissingChecklist.map(v => v.plate).join(', ')}</span>.
            </p>
          </div>
        </div>
      </div>
    );
  }, [vehiclesMissingChecklist]);

  const renderFilters = useCallback((searchTerm: string, setSearchTerm: (term: string) => void) => {
    return (
      <>
        <div className="relative">
          <input
            type="text"
            placeholder="Rechercher une checklist..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          />
        </div>
        <div>
          <select
            value={selectedVehicle}
            onChange={(e) => {
              setSelectedVehicle(e.target.value);
            }}
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
            value={selectedDriver}
            onChange={(e) => {
              setSelectedDriver(e.target.value);
            }}
            className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 shadow-sm focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Tous les conducteurs</option>
            {data.drivers.map(driver => (
              <option key={driver.id} value={driver.id}>
                {driver.name}
              </option>
            ))}
          </select>
        </div>

        <div className="relative">
          <input
            type="date"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
            }}
            className="w-full bg-white border border-gray-300 rounded-lg pl-4 pr-10 py-3 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            placeholder="Date de début"
          />
          <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
        </div>

        <div className="relative">
          <input
            type="date"
            value={endDate}
            onChange={(e) => {
              setEndDate(e.target.value);
            }}
            className="w-full bg-white border border-gray-300 rounded-lg pl-4 pr-10 py-3 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            placeholder="Date de fin"
          />
          <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
        </div>
      </>
    );
  }, [data.vehicles, data.drivers, selectedVehicle, selectedDriver, startDate, endDate]);

  return (
    <div className="space-y-6">
      <DataTable
        title="Checklists Avant Départ"
        data={filteredChecklists}
        columns={columns}
        onAdd={handleAddChecklist}
        addLabel="Nouvelle Checklist"
        searchPlaceholder="Rechercher une checklist par date, véhicule, conducteur, observations ou problèmes..."
        exportFileName="checklists_avant_depart"
        isLoading={false}
        renderFilters={renderFilters}
        renderAlerts={renderAlerts}
      />

      {/* Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-2xl bg-gray-50">
          <DialogHeader>
            <DialogTitle>Nouvelle Checklist Avant Départ</DialogTitle>
            <DialogDescription>
              Remplissez les détails de la checklist avant le départ du véhicule.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="date" className="block text-sm font-semibold mb-2 text-gray-900">Date</label>
                <div className="relative flex items-center">
                  <input
                    id="date"
                    type="date"
                    {...register('date')}
                    className="w-full bg-white border border-gray-300 rounded-lg pl-4 pr-10 py-3 shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    disabled={!canAdd}
                  />
                  <Calendar className="absolute right-3 w-5 h-5 text-gray-400 pointer-events-none" />
                </div>
                {errors.date && <p className="text-red-500 text-sm mt-1">{errors.date.message}</p>}
              </div>
              <div>
                <label htmlFor="vehicle_id" className="block text-sm font-semibold mb-2 text-gray-900">Véhicule</label>
                <select
                  id="vehicle_id"
                  {...register('vehicle_id')}
                  className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  disabled={!canAdd}
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
            </div>

            <div>
              <label htmlFor="driver_id" className="block text-sm font-semibold mb-2 text-gray-900">Conducteur (Optionnel)</label>
              <select
                id="driver_id"
                {...register('driver_id')}
                className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 shadow-sm focus:ring-blue-500 focus:border-blue-500"
                disabled={!canAdd}
              >
                <option value="">Sélectionner un conducteur</option>
                {data.drivers.map(driver => (
                  <option key={driver.id} value={driver.id}>
                    {driver.name}
                  </option>
                ))}
              </select>
              {errors.driver_id && <p className="text-red-500 text-sm mt-1">{errors.driver_id.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-gray-900">Pression des pneus</label>
                <div className="flex space-x-4">
                  <div className="flex items-center space-x-1">
                    <input
                      type="radio"
                      id="tire_pressure_ok_ok"
                      value="true"
                      {...register('tire_pressure_ok', { setValueAs: v => v === 'true' })}
                      className="h-4 w-4 text-green-600 bg-white border border-gray-300 shadow-sm focus:ring-green-500"
                      disabled={!canAdd}
                    />
                    <label htmlFor="tire_pressure_ok_ok" className="text-sm font-semibold text-gray-900">OK</label>
                  </div>
                  <div className="flex items-center space-x-1">
                    <input
                      type="radio"
                      id="tire_pressure_ok_nok"
                      value="false"
                      {...register('tire_pressure_ok', { setValueAs: v => v === 'true' })}
                      className="h-4 w-4 text-red-600 bg-white border border-gray-300 shadow-sm focus:ring-red-500"
                      disabled={!canAdd}
                    />
                    <label htmlFor="tire_pressure_ok_nok" className="text-sm font-semibold text-gray-900">NOK</label>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-gray-900">Feux</label>
                <div className="flex space-x-4">
                  <div className="flex items-center space-x-1">
                    <input
                      type="radio"
                      id="lights_ok_ok"
                      value="true"
                      {...register('lights_ok', { setValueAs: v => v === 'true' })}
                      className="h-4 w-4 text-green-600 bg-white border border-gray-300 shadow-sm focus:ring-green-500"
                      disabled={!canAdd}
                    />
                    <label htmlFor="lights_ok_ok" className="text-sm font-semibold text-gray-900">OK</label>
                  </div>
                  <div className="flex items-center space-x-1">
                    <input
                      type="radio"
                      id="lights_ok_nok"
                      value="false"
                      {...register('lights_ok', { setValueAs: v => v === 'true' })}
                      className="h-4 w-4 text-red-600 bg-white border border-gray-300 shadow-sm focus:ring-red-500"
                      disabled={!canAdd}
                    />
                    <label htmlFor="lights_ok_nok" className="text-sm font-semibold text-gray-900">NOK</label>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-gray-900">Niveau d'huile</label>
                <div className="flex space-x-4">
                  <div className="flex items-center space-x-1">
                    <input
                      type="radio"
                      id="oil_level_ok_ok"
                      value="true"
                      {...register('oil_level_ok', { setValueAs: v => v === 'true' })}
                      className="h-4 w-4 text-green-600 bg-white border border-gray-300 shadow-sm focus:ring-green-500"
                      disabled={!canAdd}
                    />
                    <label htmlFor="oil_level_ok_ok" className="text-sm font-semibold text-gray-900">OK</label>
                  </div>
                  <div className="flex items-center space-x-1">
                    <input
                      type="radio"
                      id="oil_level_ok_nok"
                      value="false"
                      {...register('oil_level_ok', { setValueAs: v => v === 'true' })}
                      className="h-4 w-4 text-red-600 bg-white border border-gray-300 shadow-sm focus:ring-red-500"
                      disabled={!canAdd}
                    />
                    <label htmlFor="oil_level_ok_nok" className="text-sm font-semibold text-gray-900">NOK</label>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-gray-900">Niveaux de fluides</label>
                <div className="flex space-x-4">
                  <div className="flex items-center space-x-1">
                    <input
                      type="radio"
                      id="fluid_levels_ok_ok"
                      value="true"
                      {...register('fluid_levels_ok', { setValueAs: v => v === 'true' })}
                      className="h-4 w-4 text-green-600 bg-white border border-gray-300 shadow-sm focus:ring-green-500"
                      disabled={!canAdd}
                    />
                    <label htmlFor="fluid_levels_ok_ok" className="text-sm font-semibold text-gray-900">OK</label>
                  </div>
                  <div className="flex items-center space-x-1">
                    <input
                      type="radio"
                      id="fluid_levels_ok_nok"
                      value="false"
                      {...register('fluid_levels_ok', { setValueAs: v => v === 'true' })}
                      className="h-4 w-4 text-red-600 bg-white border border-gray-300 shadow-sm focus:ring-red-500"
                      disabled={!canAdd}
                    />
                    <label htmlFor="fluid_levels_ok_nok" className="text-sm font-semibold text-gray-900">NOK</label>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-gray-900">Freins</label>
                <div className="flex space-x-4">
                  <div className="flex items-center space-x-1">
                    <input
                      type="radio"
                      id="brakes_ok_ok"
                      value="true"
                      {...register('brakes_ok', { setValueAs: v => v === 'true' })}
                      className="h-4 w-4 text-green-600 bg-white border border-gray-300 shadow-sm focus:ring-green-500"
                      disabled={!canAdd}
                    />
                    <label htmlFor="brakes_ok_ok" className="text-sm font-semibold text-gray-900">OK</label>
                  </div>
                  <div className="flex items-center space-x-1">
                    <input
                      type="radio"
                      id="brakes_ok_nok"
                      value="false"
                      {...register('brakes_ok', { setValueAs: v => v === 'true' })}
                      className="h-4 w-4 text-red-600 bg-white border border-gray-300 shadow-sm focus:ring-red-500"
                      disabled={!canAdd}
                    />
                    <label htmlFor="brakes_ok_nok" className="text-sm font-semibold text-gray-900">NOK</label>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-gray-900">Essuie-glaces</label>
                <div className="flex space-x-4">
                  <div className="flex items-center space-x-1">
                    <input
                      type="radio"
                      id="wipers_ok_ok"
                      value="true"
                      {...register('wipers_ok', { setValueAs: v => v === 'true' })}
                      className="h-4 w-4 text-green-600 bg-white border border-gray-300 shadow-sm focus:ring-green-500"
                      disabled={!canAdd}
                    />
                    <label htmlFor="wipers_ok_ok" className="text-sm font-semibold text-gray-900">OK</label>
                  </div>
                  <div className="flex items-center space-x-1">
                    <input
                      type="radio"
                      id="wipers_ok_nok"
                      value="false"
                      {...register('wipers_ok', { setValueAs: v => v === 'true' })}
                      className="h-4 w-4 text-red-600 bg-white border border-gray-300 shadow-sm focus:ring-red-500"
                      disabled={!canAdd}
                    />
                    <label htmlFor="wipers_ok_nok" className="text-sm font-semibold text-gray-900">NOK</label>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-gray-900">Klaxon</label>
                <div className="flex space-x-4">
                  <div className="flex items-center space-x-1">
                    <input
                      type="radio"
                      id="horn_ok_ok"
                      value="true"
                      {...register('horn_ok', { setValueAs: v => v === 'true' })}
                      className="h-4 w-4 text-green-600 bg-white border border-gray-300 shadow-sm focus:ring-green-500"
                      disabled={!canAdd}
                    />
                    <label htmlFor="horn_ok_ok" className="text-sm font-semibold text-gray-900">OK</label>
                  </div>
                  <div className="flex items-center space-x-1">
                    <input
                      type="radio"
                      id="horn_ok_nok"
                      value="false"
                      {...register('horn_ok', { setValueAs: v => v === 'true' })}
                      className="h-4 w-4 text-red-600 bg-white border border-gray-300 shadow-sm focus:ring-red-500"
                      disabled={!canAdd}
                    />
                    <label htmlFor="horn_ok_nok" className="text-sm font-semibold text-gray-900">NOK</label>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-gray-900">Rétroviseurs</label>
                <div className="flex space-x-4">
                  <div className="flex items-center space-x-1">
                    <input
                      type="radio"
                      id="mirrors_ok_ok"
                      value="true"
                      {...register('mirrors_ok', { setValueAs: v => v === 'true' })}
                      className="h-4 w-4 text-green-600 bg-white border border-gray-300 shadow-sm focus:ring-green-500"
                      disabled={!canAdd}
                    />
                    <label htmlFor="mirrors_ok_ok" className="text-sm font-semibold text-gray-900">OK</label>
                  </div>
                  <div className="flex items-center space-x-1">
                    <input
                      type="radio"
                      id="mirrors_ok_nok"
                      value="false"
                      {...register('mirrors_ok', { setValueAs: v => v === 'true' })}
                      className="h-4 w-4 text-red-600 bg-white border border-gray-300 shadow-sm focus:ring-red-500"
                      disabled={!canAdd}
                    />
                    <label htmlFor="mirrors_ok_nok" className="text-sm font-semibold text-gray-900">NOK</label>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-gray-900">Climatiseur</label>
                <div className="flex space-x-4">
                  <div className="flex items-center space-x-1">
                    <input
                      type="radio"
                      id="ac_working_ok_ok"
                      value="true"
                      {...register('ac_working_ok', { setValueAs: v => v === 'true' })}
                      className="h-4 w-4 text-green-600 bg-white border border-gray-300 shadow-sm focus:ring-green-500"
                      disabled={!canAdd}
                    />
                    <label htmlFor="ac_working_ok_ok" className="text-sm font-semibold text-gray-900">OK</label>
                  </div>
                  <div className="flex items-center space-x-1">
                    <input
                      type="radio"
                      id="ac_working_ok_nok"
                      value="false"
                      {...register('ac_working_ok', { setValueAs: v => v === 'true' })}
                      className="h-4 w-4 text-red-600 bg-white border border-gray-300 shadow-sm focus:ring-red-500"
                      disabled={!canAdd}
                    />
                    <label htmlFor="ac_working_ok_nok" className="text-sm font-semibold text-gray-900">NOK</label>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-gray-900">Vitres</label>
                <div className="flex space-x-4">
                  <div className="flex items-center space-x-1">
                    <input
                      type="radio"
                      id="windows_working_ok_ok"
                      value="true"
                      {...register('windows_working_ok', { setValueAs: v => v === 'true' })}
                      className="h-4 w-4 text-green-600 bg-white border border-gray-300 shadow-sm focus:ring-green-500"
                      disabled={!canAdd}
                    />
                    <label htmlFor="windows_working_ok_ok" className="text-sm font-semibold text-gray-900">OK</label>
                  </div>
                  <div className="flex items-center space-x-1">
                    <input
                      type="radio"
                      id="windows_working_ok_nok"
                      value="false"
                      {...register('windows_working_ok', { setValueAs: v => v === 'true' })}
                      className="h-4 w-4 text-red-600 bg-white border border-gray-300 shadow-sm focus:ring-red-500"
                      disabled={!canAdd}
                    />
                    <label htmlFor="windows_working_ok_nok" className="text-sm font-semibold text-gray-900">NOK</label>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="observations" className="block text-sm font-semibold mb-2 text-gray-900">Observations</label>
              <textarea
                id="observations"
                {...register('observations')}
                rows={3}
                className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 shadow-sm focus:ring-blue-500 focus:border-blue-500"
                disabled={!canAdd}
              ></textarea>
              {errors.observations && <p className="text-red-500 text-sm mt-1">{errors.observations.message}</p>}
            </div>
            <div>
              <label htmlFor="issues_to_address" className="block text-sm font-semibold mb-2 text-gray-900">Points à traiter</label>
              <textarea
                id="issues_to_address"
                {...register('issues_to_address')}
                rows={3}
                className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 shadow-sm focus:ring-blue-500 focus:border-blue-500"
                disabled={!canAdd}
              ></textarea>
              {errors.issues_to_address && <p className="text-red-500 text-sm mt-1">{errors.issues_to_address.message}</p>}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowModal(false)}
              >
                Annuler
              </Button>
              {canAdd && (
                <Button
                  type="submit"
                >
                  Sauvegarder
                </Button>
              )}
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PreDepartureChecklistComponent;