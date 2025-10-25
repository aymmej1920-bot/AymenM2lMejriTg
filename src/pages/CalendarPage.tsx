import React from 'react';
import FleetCalendar from '../components/FleetCalendar';

const CalendarPage: React.FC = () => {
  return (
    <div className="space-y-8 animate-fade-in">
      <FleetCalendar />
    </div>
  );
};

export default CalendarPage;