import React, { useState } from 'react';
    import { Settings, ChevronUp, ChevronDown } from 'lucide-react';
    import { DashboardWidgetConfig } from '../types';
    import { formatDate } from '../utils/date';
    import { useDashboardCustomization } from '../hooks/useDashboardCustomization';
    import { Button } from './ui/button';
    import {
      Dialog,
      DialogContent,
      DialogHeader,
      DialogFooter,
      DialogTitle,
      DialogDescription,
    } from './ui/dialog';
    import { dashboardWidgetMap } from './dashboard/DashboardWidgets'; // Import the widget map
    // import { usePermissions } from '../hooks/usePermissions'; // Removed import
    import { useFleetData } from '../components/FleetDataProvider'; // Import useFleetData

    interface DashboardProps {
      // userRole: 'admin' | 'direction' | 'utilisateur'; // Removed userRole prop
      // registerRefetch: (resource: Resource, refetch: () => Promise<void>) => void; // Removed
    }

    const Dashboard: React.FC<DashboardProps> = () => { // Removed userRole prop
      // const { canAccess } = usePermissions(); // Removed usePermissions hook
      const { widgets, toggleWidgetVisibility, moveWidget, resetToDefault } = useDashboardCustomization();
      const [showCustomizeDialog, setShowCustomizeDialog] = useState(false);

      // Consume data from FleetContext
      const { isLoadingFleet } = useFleetData();

      const visibleWidgets = widgets.filter(widget => widget.isVisible);

      const chartWidgets = visibleWidgets.filter(
        widget => widget.componentKey === 'vehicleStatusChart' || widget.componentKey === 'monthlyFuelConsumptionChart'
      );

      const otherWidgets = visibleWidgets.filter(
        widget => !(widget.componentKey === 'vehicleStatusChart' || widget.componentKey === 'monthlyFuelConsumptionChart')
      );

      if (isLoadingFleet) {
        return (
          <div className="flex justify-center items-center h-64">
            <p className="text-gray-600">Chargement du tableau de bord...</p>
          </div>
        );
      }

      return (
        <div className="space-y-8 animate-fade-in">
          <div className="flex items-center justify-between">
            <h2 className="text-4xl font-bold text-gray-800">Tableau de Bord</h2>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-500">
                Dernière mise à jour: {formatDate(new Date().toISOString())}
              </div>
              {/* Customization is now always available for authenticated users */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowCustomizeDialog(true)}
                className="text-gray-600 hover:text-blue-600 hover-lift"
              >
                <Settings className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {otherWidgets.map((widget: DashboardWidgetConfig) => {
            const WidgetComponent = dashboardWidgetMap[widget.componentKey];
            return WidgetComponent ? (
              <WidgetComponent key={widget.id} />
            ) : null;
          })}

          {chartWidgets.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {chartWidgets.map((widget: DashboardWidgetConfig) => {
                const WidgetComponent = dashboardWidgetMap[widget.componentKey];
                return WidgetComponent ? (
                  <WidgetComponent key={widget.id} />
                ) : null;
              })}
            </div>
          )}

          {/* Customization dialog is now always available for authenticated users */}
          <Dialog open={showCustomizeDialog} onOpenChange={setShowCustomizeDialog}>
            <DialogContent className="sm:max-w-[425px] glass animate-scale-in">
              <DialogHeader>
                <DialogTitle>Personnaliser le Tableau de Bord</DialogTitle>
                <DialogDescription>
                  Choisissez les widgets à afficher et réorganisez-les.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-2 py-4">
                {widgets.map((widget: DashboardWidgetConfig, index: number) => (
                  <div key={widget.id} className="flex items-center justify-between p-2 border rounded-md bg-white/20 glass-effect">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`widget-${widget.id}`}
                        checked={widget.isVisible}
                        onChange={() => toggleWidgetVisibility(widget.id)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor={`widget-${widget.id}`} className="text-sm font-medium text-gray-700">
                        {widget.title}
                      </label>
                    </div>
                    <div className="flex space-x-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => moveWidget(widget.id, 'up')}
                        disabled={index === 0}
                        className="hover-lift"
                      >
                        <ChevronUp className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => moveWidget(widget.id, 'down')}
                        disabled={index === widgets.length - 1}
                        className="hover-lift"
                      >
                        <ChevronDown className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={resetToDefault} className="hover-lift">
                  Réinitialiser par défaut
                </Button>
                <Button onClick={() => setShowCustomizeDialog(false)} className="hover-lift">
                  Fermer
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      );
    };

    export default Dashboard;