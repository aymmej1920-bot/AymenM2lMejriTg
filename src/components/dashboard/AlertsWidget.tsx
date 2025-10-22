import React from 'react';
import { AlertTriangle, ClipboardCheck } from 'lucide-react';
import { getDaysUntilExpiration } from '../../utils/date';
import { useFleetData } from '../FleetDataProvider'; // Import useFleetData

interface AlertsWidgetProps {
  // data: FleetData; // No longer needed as data is fetched internally
  // preDepartureChecklists: PreDepartureChecklist[]; // No longer needed
}

const AlertsWidget: React.FC<AlertsWidgetProps> = () => {
  // Consume data from FleetContext
  const { fleetData, isLoadingFleet } = useFleetData();
  const { vehicles, documents, pre_departure_checklists: preDepartureChecklists } = fleetData;

  const maintenanceAlerts = vehicles.filter(vehicle => {
    const nextService = (vehicle.last_service_mileage || 0) + 10000;
    const kmUntilService = nextService - vehicle.mileage;
    return kmUntilService <= 1000;
  });

  const expiringDocs = documents.filter(doc => {
    const daysLeft = getDaysUntilExpiration(doc.expiration);
    return daysLeft <= 30;
  });

  const checklistsWithIssues = preDepartureChecklists.filter(cl => cl.issues_to_address && cl.issues_to_address.trim() !== '');

  if (isLoadingFleet) {
    return null; // Or a small skeleton loader if preferred
  }

  if (maintenanceAlerts.length === 0 && expiringDocs.length === 0 && checklistsWithIssues.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4 animate-slide-up">
      {maintenanceAlerts.length > 0 && (
        <div className="bg-orange-50 border-l-4 border-orange-400 p-4 rounded-r-lg glass">
          <div className="flex items-center">
            <AlertTriangle className="w-5 h-5 text-orange-400 mr-3" />
            <div>
              <h3 className="text-orange-800 font-semibold">Maintenance Requise</h3>
              <p className="text-orange-700">
                {maintenanceAlerts.length} véhicule(s) nécessitent une maintenance prochainement
              </p>
            </div>
          </div>
        </div>
      )}
      
      {expiringDocs.length > 0 && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-r-lg glass">
          <div className="flex items-center">
            <AlertTriangle className="w-5 h-5 text-red-400 mr-3" />
            <div>
              <h3 className="text-red-800 font-semibold">Documents à Renouveler</h3>
              <p className="text-red-700">
                {expiringDocs.length} document(s) expirent dans moins de 30 jours
              </p>
            </div>
          </div>
        </div>
      )}

      {checklistsWithIssues.length > 0 && (
        <div className="bg-purple-50 border-l-4 border-purple-400 p-4 rounded-r-lg glass">
          <div className="flex items-center">
            <ClipboardCheck className="w-5 h-5 text-purple-400 mr-3" />
            <div>
              <h3 className="text-purple-800 font-semibold">Points à Traiter (Checklists)</h3>
              <p className="text-purple-700">
                {checklistsWithIssues.length} checklist(s) contiennent des problèmes à résoudre.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AlertsWidget;