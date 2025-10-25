import React from 'react';
import { AlertTriangle, ClipboardCheck, FileText, Wrench } from 'lucide-react'; // Added FileText and Wrench icons
import { useAlertsData, FleetAlert } from '../../hooks/useAlertsData'; // Import the new hook

const AlertsWidget: React.FC = () => {
  const { alerts, isLoadingAlerts } = useAlertsData();

  if (isLoadingAlerts) {
    return null; // Or a small skeleton loader if preferred
  }

  if (alerts.length === 0) {
    return null; // No alerts to display
  }

  // Group alerts by type for display in the widget
  const maintenanceAlerts = alerts.filter(alert => alert.type === 'maintenance');
  const expiringDocs = alerts.filter(alert => alert.type === 'document');
  const checklistsWithIssues = alerts.filter(alert => alert.type === 'checklist_issue');

  return (
    <div className="space-y-4 animate-slide-up">
      {maintenanceAlerts.length > 0 && (
        <div className="bg-orange-50 border-l-4 border-orange-400 p-4 rounded-r-lg glass">
          <div className="flex items-center">
            <Wrench className="w-5 h-5 text-orange-400 mr-3" /> {/* Changed icon to Wrench */}
            <div>
              <h3 className="text-orange-800 font-semibold">Maintenance Requise</h3>
              <p className="text-orange-700">
                {maintenanceAlerts.length} véhicule(s) nécessitent une maintenance prochainement ou sont en retard.
              </p>
            </div>
          </div>
        </div>
      )}
      
      {expiringDocs.length > 0 && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-r-lg glass">
          <div className="flex items-center">
            <FileText className="w-5 h-5 text-red-400 mr-3" /> {/* Changed icon to FileText */}
            <div>
              <h3 className="text-red-800 font-semibold">Documents à Renouveler</h3>
              <p className="text-red-700">
                {expiringDocs.length} document(s) expirent bientôt ou sont déjà expirés.
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