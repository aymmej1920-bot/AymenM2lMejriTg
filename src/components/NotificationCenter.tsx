import React from 'react';
import { Wrench, FileText, ClipboardCheck, Info } from 'lucide-react'; // Removed AlertTriangle
import { useAlertsData, FleetAlert } from '../hooks/useAlertsData';
import SkeletonLoader from './SkeletonLoader';
import { formatDate } from '../utils/date';

const NotificationCenter: React.FC = () => {
  const { alerts, isLoadingAlerts } = useAlertsData();

  const getIconForAlertType = (type: FleetAlert['type']) => {
    switch (type) {
      case 'maintenance': return <Wrench className="w-5 h-5" />;
      case 'document': return <FileText className="w-5 h-5" />;
      case 'checklist_issue': return <ClipboardCheck className="w-5 h-5" />;
      default: return <Info className="w-5 h-5" />;
    }
  };

  const getSeverityClasses = (severity: FleetAlert['severity']) => {
    switch (severity) {
      case 'urgent': return 'bg-red-100 text-red-800 border-red-400';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-400';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-400';
      default: return 'bg-blue-100 text-blue-800 border-blue-400';
    }
  };

  if (isLoadingAlerts) {
    return (
      <div className="flex justify-center items-center h-64">
        <SkeletonLoader count={3} height="h-16" className="w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <h2 className="text-4xl font-bold text-gray-800">Centre de Notifications</h2>

      {alerts.length === 0 ? (
        <div className="glass rounded-xl shadow-lg p-6 text-center text-gray-600">
          Aucune notification pour le moment. Tout est en ordre !
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {alerts.map((alert) => (
            <div key={alert.id} className={`flex items-start space-x-4 p-4 rounded-lg border-l-4 glass ${getSeverityClasses(alert.severity)}`}>
              <div className="flex-shrink-0 p-2 rounded-full bg-white/50">
                {getIconForAlertType(alert.type)}
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg">{alert.message}</h3>
                {alert.details && <p className="text-sm mt-1">{alert.details}</p>}
                <p className="text-xs text-gray-600 mt-2">
                  Date de l'alerte: {formatDate(alert.createdAt)}
                </p>
              </div>
              {/* Future: Add actions like "Mark as read", "View details" */}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default NotificationCenter;