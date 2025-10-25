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

    // New type for vehicle data as expected from import (before adding id, user_id, created_at)
    export interface VehicleImportData {
      plate: string;
      type: string;
      status: string;
      mileage: number;
      last_service_date: string;
      last_service_mileage: number;
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

    // New type for driver data as expected from import (before adding id, user_id, created_at)
    export interface DriverImportData {
      name: string;
      license: string;
      expiration: string;
      status: string;
      phone: string;
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
      description?: string | null; // New field
      parts_cost?: number | null; // New field
      labor_cost?: number | null; // New field
      created_at?: string;
    }

    export interface MaintenanceSchedule {
      id: string;
      user_id: string;
      vehicle_id?: string | null; // Optional, for specific vehicles
      vehicle_type?: string | null; // Optional, for general schedules (e.g., 'Camionnette')
      task_type: string; // e.g., 'Vidange', 'Contrôle Technique'
      interval_km?: number | null; // e.g., 10000 km
      interval_months?: number | null; // e.g., 6 months
      last_performed_date?: string | null;
      last_performed_mileage?: number | null;
      next_due_date?: string | null;
      next_due_mileage?: number | null;
      notes?: string | null;
      created_at?: string;
      updated_at?: string; // New field
    }

    export interface PreDepartureChecklist {
      id: string;
      user_id: string;
      vehicle_id: string;
      driver_id?: string | null;
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
      observations?: string | null;
      issues_to_address?: string | null;
      created_at?: string;
    }

    export interface FleetData {
      vehicles: Vehicle[];
      drivers: Driver[];
      tours: Tour[];
      fuel_entries: FuelEntry[];
      documents: Document[];
      maintenance: MaintenanceEntry[];
      pre_departure_checklists: PreDepartureChecklist[];
      maintenance_schedules: MaintenanceSchedule[]; // New resource
    }

    export interface AuthUser {
      id: string;
      email: string;
      name: string;
      // role: 'admin' | 'direction' | 'utilisateur'; // Removed role
      avatar_url?: string | null;
    }

    export interface DashboardWidgetConfig {
      id: string;
      title: string;
      componentKey: string;
      isVisible: boolean;
    }

    export interface DataTableColumn<T> {
      key: keyof T | string;
      label: string;
      render?: (item: T) => React.ReactNode;
      sortable?: boolean;
      filterable?: boolean;
      defaultVisible?: boolean;
    }

    export type ProcessedDataTableColumn<T> = DataTableColumn<T> & {
      key: string;
      defaultVisible: boolean;
    };

    // export type UserRole = 'admin' | 'direction' | 'utilisateur'; // Removed UserRole
    export type Resource = 
      'vehicles' | 
      'drivers' | 
      'tours' | 
      'fuel_entries' |
      'documents' | 
      'maintenance_entries' | 
      'pre_departure_checklists' |
      'users' |
      'profile' |
      // 'permissions' | // Removed permissions
      'dashboard' |
      'maintenance_schedules'; 

    export type Action = 'view' | 'add' | 'edit' | 'delete';

    // export interface Permission { // Removed Permission interface
    //   id: string;
    //   role: UserRole;
    //   resource: Resource;
    //   action: Action;
    //   allowed: boolean;
    //   created_at?: string;
    //   updated_at?: string;
    // }

    export interface FleetContextType {
      fleetData: FleetData;
      isLoadingFleet: boolean;
      refetchFleetData: () => Promise<void>;
      refetchResource: (resource: Resource) => Promise<void>;
    }

    export interface OperationResult {
      success: boolean;
      message?: string;
      error?: string;
      id?: string;
    }

    export interface DbImportResult {
      originalData: any;
      success: boolean;
      message?: string;
      error?: string;
    }

    // New types for reporting features
    export type ReportGroupingOption = 'none' | 'date_month' | 'date_year' | 'vehicle_id' | 'driver_id' | 'type' | 'status' | 'task_type' | 'vehicle_type';
    export type ReportAggregationType = 'none' | 'count' | 'sum' | 'avg';
    export type ReportAggregationField = keyof Vehicle | keyof Driver | keyof Tour | keyof FuelEntry | keyof Document | keyof MaintenanceEntry | keyof PreDepartureChecklist | keyof MaintenanceSchedule | 'total_cost' | 'distance';
    export type ReportChartType = 'BarChart' | 'LineChart' | 'PieChart';

    export interface ReportOption {
      label: string;
      value: string;
    }

    export interface ProcessedReportData {
      id: string; // Explicitly add id for DataTable compatibility
      name: string;
      value: number | string;
      rawItems?: any[];
      [key: string]: any;
    }