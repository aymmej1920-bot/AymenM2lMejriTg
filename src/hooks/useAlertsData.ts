import { useMemo } from 'react';
import { useFleetData } from '../components/FleetDataProvider';
import { getDaysUntilExpiration, formatDate } from '../utils/date'; // Import formatDate
import { PreDepartureChecklist, Vehicle, Document } from '../types';

export interface FleetAlert {
  id: string;
  type: 'maintenance' | 'document' | 'checklist_issue';
  severity: 'urgent' | 'high' | 'medium';
  message: string;
  details?: string;
  resourceId: string; // ID of the related resource (vehicle, document, checklist)
  createdAt: string;
}

export const useAlertsData = () => {
  const { fleetData, isLoadingFleet } = useFleetData();
  const { vehicles, documents, pre_departure_checklists: preDepartureChecklists } = fleetData;

  const alerts = useMemo(() => {
    if (isLoadingFleet) return [];

    const generatedAlerts: FleetAlert[] = [];

    // Maintenance Alerts
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

    // Sort alerts by creation date (most recent first)
    return generatedAlerts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  }, [isLoadingFleet, vehicles, documents, preDepartureChecklists]);

  return {
    alerts,
    isLoadingAlerts: isLoadingFleet,
  };
};