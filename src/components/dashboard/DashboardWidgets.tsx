import React from 'react';
import { FleetData, PreDepartureChecklist } from '../../types';
import AlertsWidget from './AlertsWidget';
import KpisWidget from './KpisWidget';
import StatsWidget from './StatsWidget';
import VehicleStatusChartWidget from './VehicleStatusChartWidget';
import MonthlyFuelConsumptionChartWidget from './MonthlyFuelConsumptionChartWidget';
import RecentActivityWidget from './RecentActivityWidget';

// Interface for widgets that need data (some now fetch internally)
interface WidgetProps {
  data?: FleetData; // Make optional as some widgets fetch internally
  preDepartureChecklists?: PreDepartureChecklist[]; // Make optional
}

export const dashboardWidgetMap: Record<string, React.FC<WidgetProps>> = {
  alerts: AlertsWidget,
  kpis: KpisWidget,
  stats: StatsWidget,
  vehicleStatusChart: VehicleStatusChartWidget,
  monthlyFuelConsumptionChart: MonthlyFuelConsumptionChartWidget,
  recentActivity: RecentActivityWidget,
};