export interface Vehicle {
  id: string; // UUID from Supabase
  user_id: string; // Foreign key to auth.users
  plate: string;
  type: string;
  status: string;
  mileage: number;
  last_service_date: string; // Changed to match SQL column name
  last_service_mileage: number; // Changed to match SQL column name
  created_at?: string;
}

export interface Driver {
  id: string; // UUID from Supabase
  user_id: string; // Foreign key to auth.users
  name: string;
  license: string;
  expiration: string;
  status: string;
  phone: string;
  created_at?: string;
}

export interface Tour {
  id: string; // UUID from Supabase
  user_id: string; // Foreign key to auth.users
  date: string;
  vehicle_id: string; // Foreign key to vehicles.id
  driver_id: string; // Foreign key to drivers.id
  status: string;
  fuel_start: number | null; // Changed to match SQL column name
  km_start: number | null; // Changed to match SQL column name
  fuel_end: number | null; // Changed to match SQL column name
  km_end: number | null; // Changed to match SQL column name
  distance: number | null;
  created_at?: string;
}

export interface FuelEntry {
  id: string; // UUID from Supabase
  user_id: string; // Foreign key to auth.users
  date: string;
  vehicle_id: string; // Foreign key to vehicles.id
  liters: number;
  price_per_liter: number; // Changed to match SQL column name
  mileage: number;
  created_at?: string;
}

export interface Document {
  id: string; // UUID from Supabase
  user_id: string; // Foreign key to auth.users
  vehicle_id: string; // Foreign key to vehicles.id
  type: string;
  number: string;
  expiration: string;
  created_at?: string;
}

export interface MaintenanceEntry {
  id: string; // UUID from Supabase
  user_id: string; // Foreign key to auth.users
  vehicle_id: string; // Foreign key to vehicles.id
  type: string;
  date: string;
  mileage: number;
  cost: number;
  created_at?: string;
}

export interface FleetData {
  vehicles: Vehicle[];
  drivers: Driver[];
  tours: Tour[];
  fuel: FuelEntry[];
  documents: Document[];
  maintenance: MaintenanceEntry[];
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'direction' | 'utilisateur'; // Added role property
}