import { z } from 'zod';

export const vehicleSchema = z.object({
  id: z.string().optional(), // Optional for new vehicles
  plate: z.string().min(1, "La plaque d'immatriculation est requise."),
  type: z.string().min(1, "Le type de véhicule est requis."),
  status: z.string().min(1, "Le statut est requis."),
  mileage: z.number().min(0, "Le kilométrage doit être positif."),
  last_service_date: z.string().min(1, "La date de dernière vidange est requise."),
  last_service_mileage: z.number().min(0, "Le kilométrage de dernière vidange doit être positif."),
});

// Schema for importing vehicles (does not include id, user_id, created_at)
export const vehicleImportSchema = z.object({
  plate: z.string().min(1, "La plaque d'immatriculation est requise."),
  type: z.string().min(1, "Le type de véhicule est requis."),
  status: z.string().min(1, "Le statut est requis."),
  mileage: z.number().min(0, "Le kilométrage doit être positif."),
  last_service_date: z.string().min(1, "La date de dernière vidange est requise."),
  last_service_mileage: z.number().min(0, "Le kilométrage de dernière vidange doit être positif."),
});

export const driverSchema = z.object({
  id: z.string().optional(), // Optional for new drivers
  name: z.string().min(1, "Le nom est requis."),
  license: z.string().min(1, "Le numéro de permis est requis."),
  expiration: z.string().min(1, "La date d'expiration est requise."),
  status: z.string().min(1, "Le statut est requis."),
  phone: z.string().min(1, "Le numéro de téléphone est requis."),
});

// Schema for importing drivers (does not include id, user_id, created_at)
export const driverImportSchema = z.object({
  name: z.string().min(1, "Le nom est requis."),
  license: z.string().min(1, "Le numéro de permis est requis."),
  expiration: z.string().min(1, "La date d'expiration est requise."),
  status: z.string().min(1, "Le statut est requis."),
  phone: z.string().min(1, "Le numéro de téléphone est requis."),
});

export const tourSchema = z.object({
  id: z.string().optional(), // Optional for new tours
  date: z.string().min(1, "La date est requise."),
  vehicle_id: z.string().min(1, "Le véhicule est requis."),
  driver_id: z.string().min(1, "Le conducteur est requis."),
  status: z.string().min(1, "Le statut est requis."),
  fuel_start: z.number().min(0).max(100).nullable().optional(),
  km_start: z.number().min(0).nullable().optional(),
  fuel_end: z.number().min(0).max(100).nullable().optional(),
  km_end: z.number().min(0).nullable().optional(),
  distance: z.number().min(0).nullable().optional(),
}).refine(data => {
  // Custom validation for fuel_start/end and km_start/end
  if (data.status === 'Terminé') {
    if (data.fuel_start === null || data.fuel_start === undefined) return false;
    if (data.km_start === null || data.km_start === undefined) return false;
    if (data.fuel_end === null || data.fuel_end === undefined) return false;
    if (data.km_end === null || data.km_end === undefined) return false;
    if (data.distance === null || data.distance === undefined) return false;
  }
  return true;
}, {
  message: "Tous les champs de début/fin (fuel, km, distance) sont requis pour une tournée 'Terminé'.",
  path: ['status'], // Associate error with status field
});

export const fuelEntrySchema = z.object({
  id: z.string().optional(), // Optional for new entries
  date: z.string().min(1, "La date est requise."),
  vehicle_id: z.string().min(1, "Le véhicule est requis."),
  liters: z.number().min(0.01, "Les litres doivent être positifs."),
  price_per_liter: z.number().min(0.01, "Le prix par litre doit être positif."),
  mileage: z.number().min(0, "Le kilométrage est requis et doit être positif."),
});

export const documentSchema = z.object({
  id: z.string().optional(), // Optional for new documents
  vehicle_id: z.string().min(1, "Le véhicule est requis."),
  type: z.string().min(1, "Le type de document est requis."),
  number: z.string().min(1, "Le numéro de document est requis."),
  expiration: z.string().min(1, "La date d'expiration est requise."),
});

export const maintenanceEntrySchema = z.object({
  id: z.string().optional(), // Optional for new entries
  vehicle_id: z.string().min(1, "Le véhicule est requis."),
  type: z.string().min(1, "Le type de maintenance est requis."),
  date: z.string().min(1, "La date est requise."),
  mileage: z.number().min(0, "Le kilométrage est requis et doit être positif."),
  cost: z.number().min(0, "Le coût doit être positif."),
});

export const preDepartureChecklistSchema = z.object({
  id: z.string().optional(),
  vehicle_id: z.string().min(1, "Le véhicule est requis."),
  driver_id: z.string().nullable().optional(),
  date: z.string().min(1, "La date est requise."),
  tire_pressure_ok: z.boolean(),
  lights_ok: z.boolean(),
  oil_level_ok: z.boolean(),
  fluid_levels_ok: z.boolean(),
  brakes_ok: z.boolean(),
  wipers_ok: z.boolean(),
  horn_ok: z.boolean(),
  mirrors_ok: z.boolean(),
  ac_working_ok: z.boolean(),
  windows_working_ok: z.boolean(),
  observations: z.string().nullable().optional(),
  issues_to_address: z.string().nullable().optional(),
});

export const profileSchema = z.object({
  first_name: z.string().min(1, "Le prénom est requis.").nullable(),
  last_name: z.string().min(1, "Le nom est requis.").nullable(),
  avatar_url: z.string().url("L'URL de l'avatar doit être valide.").nullable().optional(),
});

export const inviteUserSchema = z.object({
  email: z.string().email("L'adresse e-mail doit être valide."),
});

export const manualUserSchema = z.object({
  email: z.string().email("L'adresse e-mail doit être valide."),
  password: z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères."),
  first_name: z.string().min(1, "Le prénom est requis."),
  last_name: z.string().min(1, "Le nom est requis."),
  role: z.enum(['admin', 'direction', 'utilisateur'], {
    message: "Le rôle est requis.", // Corrected: use 'message' instead of 'errorMap'
  }),
});