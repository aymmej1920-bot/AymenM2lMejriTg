import { useMemo } from 'react';
import { useFleetData } from '../components/FleetDataProvider';
import { getDaysUntilExpiration, formatDate } from '../utils/date';
import { PreDepartureChecklist, Vehicle, Document, MaintenanceSchedule } from '../types';

export interface FleetAlert {
  id: string;
  type: 'maintenance' | 'document' | 'checklist_issue' | 'maintenance_schedule'; // Added new type
  severity: 'urgent' | 'high' | 'medium';
  message: string;
  details?: string;
  resourceId: string; // ID of the related resource (vehicle, document, checklist, schedule)
  createdAt: string;
}

export const useAlertsData = () => {
  const { fleetData, isLoadingFleet } = useFleetData();
  const { vehicles, documents, pre_departure_checklists: preDepartureChecklists, maintenance_schedules: maintenanceSchedules } = fleetData;

  const alerts = useMemo(() => {
    if (isLoadingFleet) return [];

    const generatedAlerts: FleetAlert[] = [];

    // Maintenance Alerts (from vehicle last service)
    vehicles.forEach((vehicle: Vehicle) => {
      const nextService = (vehicle.last_service_mileage || 0) + 10000;
      const kmUntilService = nextService - vehicle.mileage;

      if (kmUntilService <= 0) {
        generatedAlerts.push({
          id: `maintenance-urgent-${vehicle.id}`,
          type: 'maintenance',
          severity: 'urgent',
          message: `Maintenance URGENTE pour ${vehicle.plate} !`,
          details: `Le véhicule a dépassé son échéance de service de ${Math.abs(kmUntilService).toLocaleString()} km.`,
          resourceId: vehicle.id,
          createdAt: new Date().toISOString(), // Use current date for generated alerts
        });
      } else if (kmUntilService <= 1000) {
        generatedAlerts.push({
          id: `maintenance-high-${vehicle.id}`,
          type: 'maintenance',
          severity: 'high',
          message: `Maintenance à venir pour ${vehicle.plate}.`,
          details: `Il reste ${kmUntilService.toLocaleString()} km avant la prochaine vidange.`,
          resourceId: vehicle.id,
          createdAt: new Date().toISOString(),
        });
      }
    });

    // Document Expiration Alerts
    documents.forEach((doc: Document) => {
      const daysLeft = getDaysUntilExpiration(doc.expiration);
      const vehicle = vehicles.find(v => v.id === doc.vehicle_id);

      if (daysLeft < 0) {
        generatedAlerts.push({
          id: `document-expired-${doc.id}`,
          type: 'document',
          severity: 'urgent',
          message: `Document expiré : ${doc.type} pour ${vehicle?.plate || 'N/A'} !`,
          details: `Le document numéro ${doc.number} a expiré il y a ${Math.abs(daysLeft)} jours.`,
          resourceId: doc.id,
          createdAt: new Date(doc.expiration).toISOString(), // Use expiration date as creation date for expired docs
        });
      } else if (daysLeft <= 30) {
        generatedAlerts.push({
          id: `document-high-${doc.id}`,
          type: 'document',
          severity: 'high',
          message: `Document à renouveler : ${doc.type} pour ${vehicle?.plate || 'N/A'}.`,
          details: `Le document numéro ${doc.number} expire dans ${daysLeft} jours.`,
          resourceId: doc.id,
          createdAt: new Date(doc.expiration).toISOString(),
        });
      } else if (daysLeft <= 60) {
        generatedAlerts.push({
          id: `document-medium-${doc.id}`,
          type: 'document',
          severity: 'medium',
          message: `Document à surveiller : ${doc.type} pour ${vehicle?.plate || 'N/A'}.`,
          details: `Le document numéro ${doc.number} expire dans ${daysLeft} jours.`,
          resourceId: doc.id,
          createdAt: new Date(doc.expiration).toISOString(),
        });
      }
    });

    // Checklist Issues Alerts
    preDepartureChecklists.forEach((cl: PreDepartureChecklist) => {
      if (cl.issues_to_address && cl.issues_to_address.trim() !== '') {
        const vehicle = vehicles.find(v => v.id === cl.vehicle_id);
        generatedAlerts.push({
          id: `checklist-issue-${cl.id}`,
          type: 'checklist_issue',
          severity: 'high',
          message: `Problème détecté sur la checklist du ${formatDate(cl.date)} pour ${vehicle?.plate || 'N/A'}.`,
          details: cl.issues_to_address,
          resourceId: cl.id,
          createdAt: cl.created_at || new Date().toISOString(),
        });
      }
    });

    // Maintenance Schedule Alerts
    maintenanceSchedules.forEach((schedule: MaintenanceSchedule) => {
      const relatedVehicle = schedule.vehicle_id ? vehicles.find(v => v.id === schedule.vehicle_id) : null;
      const vehicleIdentifier = relatedVehicle?.plate || schedule.vehicle_type || 'Véhicule générique';
      const currentMileage = relatedVehicle?.mileage || 0;
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Check by date
      if (schedule.next_due_date) {
        const nextDueDate = new Date(schedule.next_due_date);
        nextDueDate.setHours(0, 0, 0, 0);
        const daysUntilDue = Math.ceil((nextDueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        if (daysUntilDue < 0) {
          generatedAlerts.push({
            id: `schedule-date-urgent-${schedule.id}`,
            type: 'maintenance_schedule',
            severity: 'urgent',
            message: `Maintenance planifiée URGENTE : ${schedule.task_type} pour ${vehicleIdentifier} !`,
            details: `Échéance dépassée de ${Math.abs(daysUntilDue)} jours.`,
            resourceId: schedule.id,
            createdAt: schedule.next_due_date,
          });
        } else if (daysUntilDue <= 30) {
          generatedAlerts.push({
            id: `schedule-date-high-${schedule.id}`,
            type: 'maintenance_schedule',
            severity: 'high',
            message: `Maintenance planifiée à venir : ${schedule.task_type} pour ${vehicleIdentifier}.`,
            details: `Échéance dans ${daysUntilDue} jours.`,
            resourceId: schedule.id,
            createdAt: schedule.next_due_date,
          });
        } else if (daysUntilDue <= 60) {
          generatedAlerts.push({
            id: `schedule-date-medium-${schedule.id}`,
            type: 'maintenance_schedule',
            severity: 'medium',
            message: `Maintenance planifiée à surveiller : ${schedule.task_type} pour ${vehicleIdentifier}.`,
            details: `Échéance dans ${daysUntilDue} jours.`,
            resourceId: schedule.id,
            createdAt: schedule.next_due_date,
          });
        }
      }

      // Check by mileage
      if (schedule.next_due_mileage && relatedVehicle) {
        const kmUntilDue = schedule.next_due_mileage - currentMileage;

        if (kmUntilDue <= 0) {
          generatedAlerts.push({
            id: `schedule-mileage-urgent-${schedule.id}`,
            type: 'maintenance_schedule',
            severity: 'urgent',
            message: `Maintenance planifiée URGENTE : ${schedule.task_type} pour ${vehicleIdentifier} !`,
            details: `Kilométrage dépassé de ${Math.abs(kmUntilDue).toLocaleString()} km.`,
            resourceId: schedule.id,
            createdAt: new Date().toISOString(),
          });
        } else if (kmUntilDue <= 1000) {
          generatedAlerts.push({
            id: `schedule-mileage-high-${schedule.id}`,
            type: 'maintenance_schedule',
            severity: 'high',
            message: `Maintenance planifiée à venir : ${schedule.task_type} pour ${vehicleIdentifier}.`,
            details: `Il reste ${kmUntilDue.toLocaleString()} km avant l'échéance.`,
            resourceId: schedule.id,
            createdAt: new Date().toISOString(),
          });
        } else if (kmUntilDue <= 2000) {
          generatedAlerts.push({
            id: `schedule-mileage-medium-${schedule.id}`,
            type: 'maintenance_schedule',
            severity: 'medium',
            message: `Maintenance planifiée à surveiller : ${schedule.task_type} pour ${vehicleIdentifier}.`,
            details: `Il reste ${kmUntilDue.toLocaleString()} km avant l'échéance.`,
            resourceId: schedule.id,
            createdAt: new Date().toISOString(),
          });
        }
      }
    });

    // Sort alerts by creation date (most recent first)
    return generatedAlerts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  }, [isLoadingFleet, vehicles, documents, preDepartureChecklists, maintenanceSchedules]);

  return {
    alerts,
    isLoadingAlerts: isLoadingFleet,
  };
};