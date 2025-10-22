import React, { useState, useEffect, useMemo } from 'react';
import { Settings, ChevronUp, ChevronDown } from 'lucide-react';
import { FleetData, DashboardWidgetConfig, Resource, Vehicle, Driver, Tour, FuelEntry, Document, MaintenanceEntry, PreDepartureChecklist } from '../types';
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
import { usePermissions } from '../hooks/usePermissions'; // Import usePermissions
import { useSupabaseData } from '../hooks/useSupabaseData'; // Import useSupabaseData

interface DashboardProps {
  userRole: 'admin' | 'direction' | 'utilisateur';
  registerRefetch: (resource: Resource, refetch: () => Promise<void>) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ userRole, registerRefetch }) => {
  void userRole; // userRole is not directly used here, but passed from App.tsx
  const { canAccess } = usePermissions(); // Use usePermissions hook
  const { widgets, toggleWidgetVisibility, moveWidget, resetToDefault } = useDashboardCustomization();
  const [showCustomizeDialog, setShowCustomizeDialog] = useState(false);

  // Fetch all data types needed for dashboard widgets
  const { data: vehicles, isLoading: isLoadingVehicles, refetch: refetchVehicles } = useSupabaseData<Vehicle>('vehicles');
  const { data: drivers, isLoading: isLoadingDrivers, refetch: refetchDrivers } = useSupabaseData<Driver>('drivers');
  const { data: tours, isLoading: isLoadingTours, refetch: refetchTours } = useSupabaseData<Tour>('tours');
  const { data: fuel, isLoading: isLoadingFuel, refetch: refetchFuel } = useSupabaseData<FuelEntry>('fuel_entries');
  const { data: documents, isLoading: isLoadingDocuments, refetch: refetchDocuments } = useSupabaseData<Document>('documents');
  const { data: maintenance, isLoading: isLoadingMaintenance, refetch: refetchMaintenance } = useSupabaseData<MaintenanceEntry>('maintenance_entries');
  const { data: preDepartureChecklists, isLoading: isLoadingChecklists, refetch: refetchChecklists } = useSupabaseData<PreDepartureChecklist>('pre_departure_checklists');

  // Register refetch functions for all resources
  useEffect(() => {
    registerRefetch('vehicles', refetchVehicles);
    registerRefetch('drivers', refetchDrivers);
    registerRefetch('tours', refetchTours);
    registerRefetch('fuel_entries', refetchFuel);
    registerRefetch('documents', refetchDocuments);
    registerRefetch('maintenance_entries', refetchMaintenance);
    registerRefetch('pre_departure_checklists', refetchChecklists);
  }, [registerRefetch, refetchVehicles, refetchDrivers, refetchTours, refetchFuel, refetchDocuments, refetchMaintenance, refetchChecklists]);

  const fleetData: FleetData = useMemo(() => ({
    vehicles,
    drivers,
    tours,
    fuel,
    documents,
    maintenance,
    pre_departure_checklists: preDepartureChecklists,
  }), [vehicles, drivers, tours, fuel, documents, maintenance, preDepartureChecklists]);

  const visibleWidgets = widgets.filter(widget => widget.isVisible);

  const chartWidgets = visibleWidgets.filter(
    widget => widget.componentKey === 'vehicleStatusChart' || widget.componentKey === 'monthlyFuelConsumptionChart'
  );

  const otherWidgets = visibleWidgets.filter(
    widget => !(widget.componentKey === 'vehicleStatusChart' || widget.componentKey === 'monthlyFuelConsumptionChart')
  );

  const isLoadingCombined = isLoadingVehicles || isLoadingDrivers || isLoadingTours || isLoadingFuel || isLoadingDocuments || isLoadingMaintenance || isLoadingChecklists;

  if (isLoadingCombined) {
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
          {canAccess('dashboard', 'edit') && ( // Check permission for customizing dashboard
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowCustomizeDialog(true)}
              className="text-gray-600 hover:text-blue-600 hover-lift"
            >
              <Settings className="w-5 h-5" />
            </Button>
          )}
        </div>
      </div>

      {otherWidgets.map((widget: DashboardWidgetConfig) => {
        const WidgetComponent = dashboardWidgetMap[widget.componentKey];
        return WidgetComponent ? (
          <WidgetComponent key={widget.id} data={fleetData} preDepartureChecklists={fleetData.pre_departure_checklists} />
        ) : null;
      })}

      {chartWidgets.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {chartWidgets.map((widget: DashboardWidgetConfig) => {
            const WidgetComponent = dashboardWidgetMap[widget.componentKey];
            return WidgetComponent ? (
              <WidgetComponent key={widget.id} data={fleetData} preDepartureChecklists={fleetData.pre_departure_checklists} />
            ) : null;
          })}
        </div>
      )}

      {canAccess('dashboard', 'edit') && ( // Conditionally render customize dialog
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
      )}
    </div>
  );
};

export default Dashboard;