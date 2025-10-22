import React, { useEffect, createContext, useContext, useCallback, ReactNode, useRef } from 'react';
import { useSession } from './SessionContextProvider';
import { useSupabaseData } from '../hooks/useSupabaseData';
import { FleetData, FleetContextType, Resource, Vehicle, Driver, Tour, FuelEntry, Document, MaintenanceEntry, PreDepartureChecklist } from '../types';
import SkeletonLoader from './SkeletonLoader';

const FleetContext = createContext<FleetContextType | undefined>(undefined);

export const FleetDataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { currentUser, isLoading: isSessionLoading } = useSession();
  const isMounted = useRef(false);

  // Use useSupabaseData for each resource, with manualFetch and skipUserIdFilter for admin/direction
  // The `enabled` prop will ensure data is only fetched if a user is logged in.
  const commonOptions = {
    manualFetch: true, // Prevent automatic fetching by individual hooks
    skipUserIdFilter: currentUser?.role === 'admin' || currentUser?.role === 'direction',
  };

  const { data: vehicles, isLoading: isLoadingVehicles, refetch: refetchVehicles } = useSupabaseData<Vehicle>('vehicles', { enabled: !!currentUser, ...commonOptions });
  const { data: drivers, isLoading: isLoadingDrivers, refetch: refetchDrivers } = useSupabaseData<Driver>('drivers', { enabled: !!currentUser, ...commonOptions });
  const { data: tours, isLoading: isLoadingTours, refetch: refetchTours } = useSupabaseData<Tour>('tours', { enabled: !!currentUser, ...commonOptions });
  const { data: fuel, isLoading: isLoadingFuel, refetch: refetchFuel } = useSupabaseData<FuelEntry>('fuel_entries', { enabled: !!currentUser, ...commonOptions });
  const { data: documents, isLoading: isLoadingDocuments, refetch: refetchDocuments } = useSupabaseData<Document>('documents', { enabled: !!currentUser, ...commonOptions });
  const { data: maintenance, isLoading: isLoadingMaintenance, refetch: refetchMaintenance } = useSupabaseData<MaintenanceEntry>('maintenance_entries', { enabled: !!currentUser, ...commonOptions });
  const { data: preDepartureChecklists, isLoading: isLoadingChecklists, refetch: refetchChecklists } = useSupabaseData<PreDepartureChecklist>('pre_departure_checklists', { enabled: !!currentUser, ...commonOptions });

  const fleetData: FleetData = {
    vehicles,
    drivers,
    tours,
    fuel,
    documents,
    maintenance,
    pre_departure_checklists: preDepartureChecklists, // Corrected typo here
  };

  const isLoadingFleet = isLoadingVehicles || isLoadingDrivers || isLoadingTours || isLoadingFuel || isLoadingDocuments || isLoadingMaintenance || isLoadingChecklists || isSessionLoading;

  // Map of refetch functions for individual resources
  const refetchMap = useRef<Record<Resource, () => Promise<void>>>({
    vehicles: refetchVehicles,
    drivers: refetchDrivers,
    tours: refetchTours,
    fuel_entries: refetchFuel,
    documents: refetchDocuments,
    maintenance_entries: refetchMaintenance,
    pre_departure_checklists: refetchChecklists,
    users: async () => {}, // UserManagement will handle its own refetch for 'users'
    profile: async () => {}, // Profile page handles its own refetch
    permissions: async () => {}, // PermissionsOverview handles its own refetch
    dashboard: async () => {}, // Dashboard doesn't have a direct refetchable resource
  });

  // Function to refetch all data
  const refetchFleetData = useCallback(async () => {
    if (!currentUser) return; // Only refetch if a user is logged in
    const refetchPromises = Object.values(refetchMap.current).map(refetchFn => refetchFn());
    await Promise.all(refetchPromises);
  }, [currentUser]);

  // Function to refetch a specific resource
  const refetchResource = useCallback(async (resource: Resource) => {
    if (!currentUser) return;
    const refetchFn = refetchMap.current[resource];
    if (refetchFn) {
      await refetchFn();
    } else {
      console.warn(`No refetch function registered for resource: ${resource}`);
    }
  }, [currentUser]);

  // Initial fetch when user session is loaded
  useEffect(() => {
    if (!isSessionLoading && currentUser && !isMounted.current) {
      refetchFleetData();
      isMounted.current = true;
    } else if (!isSessionLoading && !currentUser) {
      // Clear data if user logs out
      Object.keys(fleetData).forEach(key => {
        (fleetData as any)[key] = [];
      });
    }
  }, [isSessionLoading, currentUser, refetchFleetData, fleetData]);

  if (isSessionLoading || (currentUser && isLoadingFleet && !isMounted.current)) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <SkeletonLoader count={1} height="h-16" className="w-1/2" />
        <p className="mt-4 text-gray-600">Chargement des données de la flotte...</p>
      </div>
    );
  }

  return (
    <FleetContext.Provider value={{ fleetData, isLoadingFleet, refetchFleetData, refetchResource }}>
      {children}
    </FleetContext.Provider>
  );
};

export const useFleetData = () => {
  const context = useContext(FleetContext);
  if (context === undefined) {
    throw new Error('useFleetData must be used within a FleetDataProvider');
  }
  return context;
};