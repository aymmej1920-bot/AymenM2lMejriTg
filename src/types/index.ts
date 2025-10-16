export interface Vehicle {
  id: string;
  plate: string;
  type: string;
  status: string;
  mileage: number;
  lastServiceDate: string;
  lastServiceMileage: number;
}

export interface Driver {
  id: number;
  name: string;
  license: string;
  expiration: string;
  status: string;
  phone: string;
}

export interface Tour {
  id: number;
  date: string;
  vehicle: string;
  driver: string;
  status: string;
  fuelStart: number | null;
  kmStart: number | null;
  fuelEnd: number | null;
  kmEnd: number | null;
  distance: number | null;
}

export interface FuelEntry {
  id: number;
  date: string;
  vehicle: string;
  liters: number;
  pricePerLiter: number;
  mileage: number;
}

export interface Document {
  id: number;
  vehicle: string;
  type: string;
  number: string;
  expiration: string;
}

export interface MaintenanceEntry {
  id: number;
  vehicleId: string;
  type: string;
  date: string;
  mileage: number;
  cost: number;
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
}