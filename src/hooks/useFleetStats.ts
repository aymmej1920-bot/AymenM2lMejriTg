import { useMemo } from 'react';
import { FleetData } from '../types';
import { getDaysUntilExpiration } from '../utils/date';

export const useFleetStats = (data: FleetData) => {
  const stats = useMemo(() => {
    const totalVehicles = data.vehicles.length;
    const activeDrivers = data.drivers.filter(d => d.status !== 'Congé').length;
    const toursThisMonth = data.tours.length; // Assuming 'this month' filter is applied elsewhere if needed, otherwise it's total tours
    const totalDistance = data.tours.filter(t => t.distance).reduce((sum, t) => sum + (t.distance || 0), 0);
    const totalFuelCost = data.fuel_entries.reduce((sum, f) => sum + (f.liters * f.price_per_liter), 0); // Updated to fuel_entries
    const totalLiters = data.fuel_entries.reduce((sum, f) => sum + f.liters, 0); // Updated to fuel_entries
    const avgPricePerLiter = totalLiters > 0 ? totalFuelCost / totalLiters : 0;
    const totalMaintenanceCost = data.maintenance.reduce((sum, m) => sum + m.cost, 0);

    const expiringDocsCount = data.documents.filter(doc => {
      const daysLeft = getDaysUntilExpiration(doc.expiration);
      return daysLeft < 30 && daysLeft >= 0; // Expiring soon but not yet expired
    }).length;

    const expiredDocsCount = data.documents.filter(doc => {
      const daysLeft = getDaysUntilExpiration(doc.expiration);
      return daysLeft < 0; // Already expired
    }).length;

    const validDocsCount = data.documents.filter(doc => {
      const daysLeft = getDaysUntilExpiration(doc.expiration);
      return daysLeft >= 30;
    }).length;

    const upcomingMaintenanceCount = data.vehicles.filter(vehicle => {
      const nextService = (vehicle.last_service_mileage || 0) + 10000;
      const kmUntilService = nextService - vehicle.mileage;
      return kmUntilService <= 1000 && kmUntilService > 0; // Approaching service
    }).length;

    const urgentMaintenanceCount = data.vehicles.filter(vehicle => {
      const nextService = (vehicle.last_service_mileage || 0) + 10000;
      const kmUntilService = nextService - vehicle.mileage;
      return kmUntilService <= 0; // Overdue service
    }).length;

    return {
      totalVehicles,
      activeDrivers,
      toursThisMonth,
      totalDistance,
      totalFuelCost,
      totalLiters,
      avgPricePerLiter,
      totalMaintenanceCost,
      expiringDocsCount,
      expiredDocsCount,
      validDocsCount,
      upcomingMaintenanceCount,
      urgentMaintenanceCount,
      avgKmPerVehicle: totalVehicles > 0 ? totalDistance / totalVehicles : 0,
      avgFuelCostPerVehicle: totalVehicles > 0 ? totalFuelCost / totalVehicles : 0,
      avgToursPerVehicle: totalVehicles > 0 ? toursThisMonth / totalVehicles : 0,
      totalCostPerVehicle: totalVehicles > 0 ? (totalFuelCost + totalMaintenanceCost) / totalVehicles : 0,
    };
  }, [data]); // Recalculate only when data changes

  return stats;
};