import React, { useMemo, useCallback } from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import 'moment/locale/fr'; // Import French locale for moment

import { useFleetData } from './FleetDataProvider';
import { Tour, MaintenanceEntry, Document } from '../types';
import { getDaysUntilExpiration } from '../utils/date';

// Set moment locale to French
moment.locale('fr');
const localizer = momentLocalizer(moment);

interface CalendarEvent {
  title: string;
  start: Date;
  end: Date;
  allDay?: boolean;
  resource?: any;
  type: 'tour' | 'maintenance' | 'document';
  status?: string; // For tours and maintenance
  priority?: 'low' | 'medium' | 'high' | 'urgent'; // For documents and maintenance alerts
}

const FleetCalendar: React.FC = () => {
  const { fleetData, isLoadingFleet } = useFleetData();
  const { tours, maintenance, documents, vehicles } = fleetData;

  const events = useMemo(() => {
    if (isLoadingFleet) return [];

    const allEvents: CalendarEvent[] = [];

    // Add Tours
    tours.forEach((tour: Tour) => {
      const vehicle = vehicles.find(v => v.id === tour.vehicle_id);
      allEvents.push({
        title: `Tournée: ${vehicle?.plate || 'N/A'} (${tour.status})`,
        start: new Date(tour.date),
        end: new Date(tour.date),
        allDay: true,
        type: 'tour',
        status: tour.status,
        resource: tour,
      });
    });

    // Add Maintenance Entries
    maintenance.forEach((entry: MaintenanceEntry) => {
      const vehicle = vehicles.find(v => v.id === entry.vehicle_id);
      allEvents.push({
        title: `Maintenance: ${vehicle?.plate || 'N/A'} (${entry.type})`,
        start: new Date(entry.date),
        end: new Date(entry.date),
        allDay: true,
        type: 'maintenance',
        status: entry.type,
        resource: entry,
      });
    });

    // Add Document Expirations
    documents.forEach((doc: Document) => {
      const daysLeft = getDaysUntilExpiration(doc.expiration);
      if (daysLeft <= 60) { // Show documents expiring within 60 days
        const vehicle = vehicles.find(v => v.id === doc.vehicle_id);
        let priority: 'low' | 'medium' | 'high' | 'urgent' = 'low';
        if (daysLeft < 0) priority = 'urgent';
        else if (daysLeft < 30) priority = 'high';
        else if (daysLeft < 60) priority = 'medium';

        allEvents.push({
          title: `Expiration: ${doc.type} - ${vehicle?.plate || 'N/A'} (${daysLeft < 0 ? 'Expiré' : `${daysLeft} jours restants`})`,
          start: new Date(doc.expiration),
          end: new Date(doc.expiration),
          allDay: true,
          type: 'document',
          priority: priority,
          resource: doc,
        });
      }
    });

    return allEvents;
  }, [isLoadingFleet, tours, maintenance, documents, vehicles]);

  const eventPropGetter = useCallback((event: CalendarEvent) => {
    let backgroundColor = '#3b82f6'; // Default blue for tours
    let textColor = '#ffffff';

    if (event.type === 'maintenance') {
      backgroundColor = '#f59e0b'; // Orange for maintenance
    } else if (event.type === 'document') {
      if (event.priority === 'urgent') backgroundColor = '#ef4444'; // Red for urgent
      else if (event.priority === 'high') backgroundColor = '#dc2626'; // Darker red for high
      else if (event.priority === 'medium') backgroundColor = '#fcd34d'; // Yellow for medium
      textColor = '#333333'; // Darker text for yellow background
    }

    return {
      style: {
        backgroundColor,
        color: textColor,
        borderRadius: '5px',
        border: 'none',
        fontSize: '12px',
        padding: '2px 5px',
      },
    };
  }, []);

  if (isLoadingFleet) {
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-gray-600">Chargement du calendrier de la flotte...</p>
      </div>
    );
  }

  return (
    <div className="glass rounded-xl shadow-lg p-6 h-[80vh] animate-fade-in">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Calendrier de la Flotte</h2>
      <Calendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        style={{ height: 'calc(100% - 40px)' }}
        messages={{
          allDay: 'Toute la journée',
          previous: 'Précédent',
          next: 'Suivant',
          today: 'Aujourd\'hui',
          month: 'Mois',
          week: 'Semaine',
          day: 'Jour',
          agenda: 'Agenda',
          date: 'Date',
          time: 'Heure',
          event: 'Événement',
          noEventsInRange: 'Aucun événement dans cette période.',
          showMore: (total) => `+ Voir ${total} de plus`,
        }}
        eventPropGetter={eventPropGetter}
      />
    </div>
  );
};

export default FleetCalendar;