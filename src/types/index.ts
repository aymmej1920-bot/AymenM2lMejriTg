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
  fuel_start?: number | null; // Updated to allow null and be optional
  km_start?: number | null; // Updated to allow null and be optional
  fuel_end?: number | null; // Updated to allow null and be optional
  km_end?: number | null; // Updated to allow null and be optional
  distance?: number | null; // Updated to allow null and be optional
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

export interface PreDepartureChecklist {
  id: string;
  user_id: string;
  vehicle_id: string;
  driver_id?: string | null; // Updated to allow null and be optional
  date: string;
  tire_pressure_ok: boolean;
  lights_ok: boolean;
  oil_level_ok: boolean;
  fluid_levels_ok: boolean;
  brakes_ok: boolean;
  wipers_ok: boolean;
  horn_ok: boolean;
  mirrors_ok: boolean;
  ac_working_ok: boolean;
  windows_working_ok: boolean;
  observations?: string | null; // Updated to allow null and be optional
  issues_to_address?: string | null; // Updated to allow null and be optional
  created_at?: string;
}

export interface FleetData {
  vehicles: Vehicle[];
  drivers: Driver[];
  tours: Tour[];
  fuel: FuelEntry[];
  documents: Document[];
  maintenance: MaintenanceEntry[];
  pre_departure_checklists: PreDepartureChecklist[]; // New field
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'direction' | 'utilisateur'; // Added role property
  avatar_url?: string | null; // Added avatar_url
}

export interface DashboardWidgetConfig {
  id: string;
  title: string;
  componentKey: string; // A key to identify the component to render
  isVisible: boolean;
}

// New interface for reusable DataTable columns
export interface DataTableColumn<T> {
  key: keyof T | string; // Key to access the data, or a custom string for derived values
  label: string; // Display label for the column header
  render?: (item: T) => React.ReactNode; // Optional custom render function for cell content
  sortable?: boolean; // Whether the column can be sorted
  filterable?: boolean; // Whether the column can be filtered (not implemented in generic search yet)
  defaultVisible?: boolean; // Whether the column is visible by default
}

// New type for columns after initial processing in DataTable
export type ProcessedDataTableColumn<T> = DataTableColumn<T> & {
  key: string;
  defaultVisible: boolean;
};

// Types for dynamic permissions
export type UserRole = 'admin' | 'direction' | 'utilisateur';
export type Resource = 
  'vehicles' | 
  'drivers' | 
  'tours' | 
  'fuel_entries' | 
  'documents' | 
  'maintenance_entries' | 
  'pre_departure_checklists' |
  'users' | // For user management
  'profile' | // For user's own profile
  'permissions' | // New resource for managing permissions
  'dashboard'; // Added dashboard as a resource

export type Action = 'view' | 'add' | 'edit' | 'delete';

export interface Permission {
  id: string;
  role: UserRole;
  resource: Resource;
  action: Action;
  allowed: boolean;
  created_at?: string;
  updated_at?: string;
}