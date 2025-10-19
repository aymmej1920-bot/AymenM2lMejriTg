import { useState, useEffect, useCallback } from 'react';
import { DashboardWidgetConfig } from '../types';

const DEFAULT_WIDGETS: DashboardWidgetConfig[] = [
  { id: 'alerts', title: 'Alertes', componentKey: 'alerts', isVisible: true },
  { id: 'kpis', title: 'Indicateurs Clés', componentKey: 'kpis', isVisible: true },
  { id: 'stats', title: 'Statistiques Générales', componentKey: 'stats', isVisible: true },
  { id: 'vehicleStatusChart', title: 'État des Véhicules', componentKey: 'vehicleStatusChart', isVisible: true },
  { id: 'monthlyFuelConsumptionChart', title: 'Consommation Mensuelle', componentKey: 'monthlyFuelConsumptionChart', isVisible: true },
  { id: 'recentActivity', title: 'Activité Récente', componentKey: 'recentActivity', isVisible: true },
];

export const useDashboardCustomization = () => {
  const [widgets, setWidgets] = useState<DashboardWidgetConfig[]>([]);

  useEffect(() => {
    const savedWidgets = localStorage.getItem('dashboardWidgets');
    if (savedWidgets) {
      setWidgets(JSON.parse(savedWidgets));
    } else {
      setWidgets(DEFAULT_WIDGETS);
    }
  }, []);

  useEffect(() => {
    if (widgets.length > 0) {
      localStorage.setItem('dashboardWidgets', JSON.stringify(widgets));
    }
  }, [widgets]);

  const toggleWidgetVisibility = useCallback((id: string) => {
    setWidgets(prevWidgets =>
      prevWidgets.map(widget =>
        widget.id === id ? { ...widget, isVisible: !widget.isVisible } : widget
      )
    );
  }, []);

  const moveWidget = useCallback((id: string, direction: 'up' | 'down') => {
    setWidgets(prevWidgets => {
      const index = prevWidgets.findIndex(widget => widget.id === id);
      if (index === -1) return prevWidgets;

      const newWidgets = [...prevWidgets];
      const [movedWidget] = newWidgets.splice(index, 1);

      if (direction === 'up' && index > 0) {
        newWidgets.splice(index - 1, 0, movedWidget);
      } else if (direction === 'down' && index < newWidgets.length) {
        newWidgets.splice(index + 1, 0, movedWidget);
      }
      return newWidgets;
    });
  }, []);

  const resetToDefault = useCallback(() => {
    setWidgets(DEFAULT_WIDGETS);
  }, []);

  return {
    widgets,
    toggleWidgetVisibility,
    moveWidget,
    resetToDefault,
  };
};