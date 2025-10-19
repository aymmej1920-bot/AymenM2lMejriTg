import { AuthUser } from '../types';

export type UserRole = AuthUser['role'];
export type Resource = 
  'vehicles' | 
  'drivers' | 
  'tours' | 
  'fuel_entries' | 
  'documents' | 
  'maintenance_entries' | 
  'pre_departure_checklists' |
  'users' | // For user management
  'profile'; // For user's own profile

export type Action = 'view' | 'add' | 'edit' | 'delete';

type PermissionMap = Record<UserRole, Record<Resource, Record<Action, boolean>>>;

// Define the permission map based on current RLS and desired frontend behavior
export const PERMISSION_MAP: PermissionMap = {
  admin: {
    vehicles: { view: true, add: true, edit: true, delete: true },
    drivers: { view: true, add: true, edit: true, delete: true },
    tours: { view: true, add: true, edit: true, delete: true },
    fuel_entries: { view: true, add: true, edit: true, delete: true },
    documents: { view: true, add: true, edit: true, delete: true },
    maintenance_entries: { view: true, add: true, edit: true, delete: true },
    pre_departure_checklists: { view: true, add: true, edit: true, delete: true },
    users: { view: true, add: true, edit: true, delete: true }, // Admins can manage users
    profile: { view: true, add: false, edit: true, delete: false }, // Admins can edit their own profile
  },
  direction: {
    vehicles: { view: true, add: false, edit: false, delete: false },
    drivers: { view: true, add: false, edit: false, delete: false },
    tours: { view: true, add: false, edit: false, delete: false },
    fuel_entries: { view: true, add: false, edit: false, delete: false },
    documents: { view: true, add: false, edit: false, delete: false },
    maintenance_entries: { view: true, add: false, edit: false, delete: false },
    pre_departure_checklists: { view: true, add: false, edit: false, delete: false },
    users: { view: true, add: false, edit: false, delete: false }, // Direction can view users
    profile: { view: true, add: false, edit: true, delete: false }, // Direction can edit their own profile
  },
  utilisateur: {
    vehicles: { view: true, add: true, edit: true, delete: true }, // Can manage their own
    drivers: { view: true, add: true, edit: true, delete: true }, // Can manage their own
    tours: { view: true, add: true, edit: true, delete: true }, // Can manage their own
    fuel_entries: { view: true, add: true, edit: true, delete: true }, // Can manage their own
    documents: { view: true, add: true, edit: true, delete: true }, // Can manage their own
    maintenance_entries: { view: true, add: true, edit: true, delete: true }, // Can manage their own
    pre_departure_checklists: { view: true, add: true, edit: true, delete: true }, // Can manage their own
    users: { view: false, add: false, edit: false, delete: false }, // Cannot view other users
    profile: { view: true, add: false, edit: true, delete: false }, // User can edit their own profile
  },
};

export const canAccess = (
  role: UserRole,
  resource: Resource,
  action: Action
): boolean => {
  return PERMISSION_MAP[role]?.[resource]?.[action] || false;
};