import { Vehicle } from '../types';
import { AlertTriangle, Clock, Wrench } from 'lucide-react';

export const getMaintenanceStatus = (vehicle: Vehicle) => {
  const nextServiceKm = (vehicle.last_service_mileage || 0) + 10000;
  const kmUntilService = nextServiceKm - vehicle.mileage;
  
  if (kmUntilService <= 0) {
    return { text: 'URGENT', class: 'bg-red-100 text-red-800', icon: AlertTriangle };
  } else if (kmUntilService <= 1000) {
    return { text: 'Bientôt', class: 'bg-orange-100 text-orange-800', icon: Clock };
  } else {
    return { text: 'OK', class: 'bg-green-100 text-green-800', icon: Wrench };
  }
};