import React, { useMemo, useCallback } from 'react'; // Added useCallback import
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'moment/locale/fr'; // Import French locale for moment
import { FleetData, Tour, MaintenanceEntry } from '../types';
import { Truck, Wrench } from 'lucide-react';

// Set moment locale to French
moment.locale('fr');
const localizer = momentLocalizer(moment);

interface CalendarViewProps {
  data: FleetData;
}

interface CustomCalendarEvent {
  title: string;
  start: Date;
  end: Date;
  allDay?: boolean;
  resource?: Tour | MaintenanceEntry;
  type: 'tour' | 'maintenance';
  bgColor: string;
  icon?: React.ElementType;
}

const CalendarView: React.FC<CalendarViewProps> = ({ data }) => {
  const events = useMemo(() => {
    const allEvents: CustomCalendarEvent[] = [];

    // Add Tours as events
    data.tours.forEach(tour => {
      const vehicle = data.vehicles.find(v => v.id === tour.vehicle_id);
      const driver = data.drivers.find(d => d.id === tour.driver_id);
      
      let bgColor = '#3174ad'; // Default blue for planned
      if (tour.status === 'En cours') bgColor = '#f0ad4e'; // Orange
      if (tour.status === 'Terminé') bgColor = '#5cb85c'; // Green
      if (tour.status === 'Annulé') bgColor = '#d9534f'; // Red

      allEvents.push({
        title: `Tournée: ${vehicle?.plate || 'N/A'} - ${driver?.name || 'N/A'} (${tour.status})`,
        start: new Date(tour.date),
        end: new Date(tour.date),
        allDay: true,
        resource: tour,
        type: 'tour',
        bgColor: bgColor,
        icon: Truck,
      });
    });

    // Add Maintenance Entries as events
    data.maintenance.forEach(entry => {
      const vehicle = data.vehicles.find(v => v.id === entry.vehicle_id);
      
      allEvents.push({
        title: `Maintenance: ${vehicle?.plate || 'N/A'} - ${entry.type} (${entry.cost.toFixed(2)} TND)`,
        start: new Date(entry.date),
        end: new Date(entry.date),
        allDay: true,
        resource: entry,
        type: 'maintenance',
        bgColor: '#777', // Grey for maintenance
        icon: Wrench,
      });
    });

    return allEvents;
  }, [data]);

  const eventPropGetter = useCallback((event: CustomCalendarEvent) => {
    return {
      style: {
        backgroundColor: event.bgColor,
        borderRadius: '5px',
        opacity: 0.8,
        color: 'white',
        border: '0px',
        display: 'block',
      },
    };
  }, []);

  const EventComponent = ({ event }: { event: CustomCalendarEvent }) => {
    const Icon = event.icon;
    return (
      <div className="flex items-center space-x-1 text-white text-xs">
        {Icon && <Icon className="w-3 h-3" />}
        <span className="font-medium">{event.title}</span>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <h2 className="text-4xl font-bold text-gray-800">Calendrier de la Flotte</h2>
      <div className="bg-white rounded-xl shadow-lg p-6 h-[700px]"> {/* Fixed height for calendar */}
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          style={{ height: '100%' }}
          messages={{
            next: 'Suivant',
            previous: 'Précédent',
            today: 'Aujourd\'hui',
            month: 'Mois',
            week: 'Semaine',
            day: 'Jour',
            agenda: 'Agenda',
            date: 'Date',
            time: 'Heure',
            event: 'Événement',
            noEventsInRange: 'Aucun événement dans cette période.',
            showMore: (total: number) => `+ Voir ${total} de plus`, // Typed 'total' as number
          }}
          eventPropGetter={eventPropGetter}
          components={{
            event: EventComponent, // Custom event component to show icon
          }}
        />
      </div>
    </div>
  );
};

export default CalendarView;