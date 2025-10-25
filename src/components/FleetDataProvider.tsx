import React, { useEffect, createContext, useContext, useCallback, ReactNode, useRef, useState } from 'react';
import { useSession } from './SessionContextProvider';
import { useSupabaseData } from '../hooks/useSupabaseData';
import { FleetData, FleetContextType, Resource, Vehicle, Driver, Tour, FuelEntry, Document, MaintenanceEntry, PreDepartureChecklist, MaintenanceSchedule } from '../types';
import SkeletonLoader from './SkeletonLoader';

// Define types for pagination and sorting states
interface ResourcePaginationState {
  currentPage: number;
  itemsPerPage: number;
  sortColumn: string;
  sortDirection: 'asc' | 'desc';
  totalCount: number;
}

// Extend FleetContextType to include setters for pagination and sorting
interface FleetContextTypeWithPagination extends FleetContextType {
  getResourcePaginationState: (resource: Resource) => ResourcePaginationState | undefined;
  setResourcePaginationState: (resource: Resource, newState: Partial<ResourcePaginationState>) => void;
}

const FleetContext = createContext<FleetContextTypeWithPagination | undefined>(undefined);

export const FleetDataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { currentUser, isLoading: isSessionLoading } = useSession();
  const isMounted = useRef(false);

  // State to hold pagination and sorting for each resource
  const [resourceStates, setResourceStates] = useState<Record<Resource, ResourcePaginationState>>({
    vehicles: { currentPage: 1, itemsPerPage: 10, sortColumn: 'plate', sortDirection: 'asc', totalCount: 0 },
    drivers: { currentPage: 1, itemsPerPage: 10, sortColumn: 'name', sortDirection: 'asc', totalCount: 0 },
    tours: { currentPage: 1, itemsPerPage: 10, sortColumn: 'date', sortDirection: 'desc', totalCount: 0 },
    fuel_entries: { currentPage: 1, itemsPerPage: 10, sortColumn: 'date', sortDirection: 'desc', totalCount: 0 },
    documents: { currentPage: 1, itemsPerPage: 10, sortColumn: 'expiration', sortDirection: 'asc', totalCount: 0 },
    maintenance_entries: { currentPage: 1, itemsPerPage: 10, sortColumn: 'date', sortDirection: 'desc', totalCount: 0 },
    pre_departure_checklists: { currentPage: 1, itemsPerPage: 10, sortColumn: 'date', sortDirection: 'desc', totalCount: 0 },
    maintenance_schedules: { currentPage: 1, itemsPerPage: 10, sortColumn: 'next_due_date', sortDirection: 'asc', totalCount: 0 }, // New resource
    users: { currentPage: 1, itemsPerPage: 10, sortColumn: 'first_name', sortDirection: 'asc', totalCount: 0 },
    profile: { currentPage: 1, itemsPerPage: 10, sortColumn: 'id', sortDirection: 'asc', totalCount: 0 },
    permissions: { currentPage: 1, itemsPerPage: 10, sortColumn: 'role', sortDirection: 'asc', totalCount: 0 },
    dashboard: { currentPage: 1, itemsPerPage: 10, sortColumn: 'id', sortDirection: 'asc', totalCount: 0 },
  });

  const getResourcePaginationState = useCallback((resource: Resource) => resourceStates[resource], [resourceStates]);

  const setResourcePaginationState = useCallback((resource: Resource, newState: Partial<ResourcePaginationState>) => {
    setResourceStates(prevStates => ({
      ...prevStates,
      [resource]: { ...prevStates[resource], ...newState },
    }));
  }, []);

  // Options communes pour les hooks useSupabaseData
  const commonOptions = (resource: Resource) => {
    const state = getResourcePaginationState(resource);
    return {
      manualFetch: true, // Empêche le fetch automatique par les hooks individuels
      skipUserIdFilter: currentUser?.role === 'admin' || currentUser?.role === 'direction',
      page: state?.currentPage,
      pageSize: state?.itemsPerPage,
      sortBy: state?.sortColumn ? {
        column: state.sortColumn,
        direction: state.sortDirection,
      } : undefined,
    };
  };

  // Utilisation de useSupabaseData pour chaque ressource
  const { data: vehicles, isLoading: isLoadingVehicles, refetch: refetchVehicles, totalCount: totalVehiclesCount } = useSupabaseData<Vehicle>('vehicles', { enabled: !!currentUser, ...commonOptions('vehicles') });
  const { data: drivers, isLoading: isLoadingDrivers, refetch: refetchDrivers, totalCount: totalDriversCount } = useSupabaseData<Driver>('drivers', { enabled: !!currentUser, ...commonOptions('drivers') });
  const { data: tours, isLoading: isLoadingTours, refetch: refetchTours, totalCount: totalToursCount } = useSupabaseData<Tour>('tours', { enabled: !!currentUser, ...commonOptions('tours') });
  const { data: fuelEntries, isLoading: isLoadingFuel, refetch: refetchFuel, totalCount: totalFuelEntriesCount } = useSupabaseData<FuelEntry>('fuel_entries', { enabled: !!currentUser, ...commonOptions('fuel_entries') });
  const { data: documents, isLoading: isLoadingDocuments, refetch: refetchDocuments, totalCount: totalDocumentsCount } = useSupabaseData<Document>('documents', { enabled: !!currentUser, ...commonOptions('documents') });
  const { data: maintenance, isLoading: isLoadingMaintenance, refetch: refetchMaintenance, totalCount: totalMaintenanceCount } = useSupabaseData<MaintenanceEntry>('maintenance_entries', { enabled: !!currentUser, ...commonOptions('maintenance_entries') });
  const { data: preDepartureChecklists, isLoading: isLoadingChecklists, refetch: refetchChecklists, totalCount: totalChecklistsCount } = useSupabaseData<PreDepartureChecklist>('pre_departure_checklists', { enabled: !!currentUser, ...commonOptions('pre_departure_checklists') });
  const { data: maintenanceSchedules, isLoading: isLoadingMaintenanceSchedules, refetch: refetchMaintenanceSchedules, totalCount: totalMaintenanceSchedulesCount } = useSupabaseData<MaintenanceSchedule>('maintenance_schedules', { enabled: !!currentUser, ...commonOptions('maintenance_schedules') }); // New hook call

  // Update total counts in resourceStates
  useEffect(() => {
    setResourceStates(prevStates => ({
      ...prevStates,
      vehicles: { ...prevStates.vehicles, totalCount: totalVehiclesCount },
      drivers: { ...prevStates.drivers, totalCount: totalDriversCount },
      tours: { ...prevStates.tours, totalCount: totalToursCount },
      fuel_entries: { ...prevStates.fuel_entries, totalCount: totalFuelEntriesCount },
      documents: { ...prevStates.documents, totalCount: totalDocumentsCount },
      maintenance_entries: { ...prevStates.maintenance_entries, totalCount: totalMaintenanceCount },
      pre_departure_checklists: { ...prevStates.pre_departure_checklists, totalCount: totalChecklistsCount },
      maintenance_schedules: { ...prevStates.maintenance_schedules, totalCount: totalMaintenanceSchedulesCount }, // Update total count for new resource
    }));
  }, [totalVehiclesCount, totalDriversCount, totalToursCount, totalFuelEntriesCount, totalDocumentsCount, totalMaintenanceCount, totalChecklistsCount, totalMaintenanceSchedulesCount]);


  const fleetData: FleetData = {
    vehicles,
    drivers,
    tours,
    fuel_entries: fuelEntries,
    documents,
    maintenance,
    pre_departure_checklists: preDepartureChecklists,
    maintenance_schedules: maintenanceSchedules, // Add new resource to fleetData
  };

  const isLoadingFleet = isLoadingVehicles || isLoadingDrivers || isLoadingTours || isLoadingFuel || isLoadingDocuments || isLoadingMaintenance || isLoadingChecklists || isLoadingMaintenanceSchedules || isSessionLoading; // Update loading state

  // Map des fonctions de refetch pour les ressources individuelles
  const refetchMap = useRef<Record<Resource, () => Promise<void>>>({
    vehicles: async () => {},
    drivers: async () => {},
    tours: async () => {},
    fuel_entries: async () => {},
    documents: async () => {},
    maintenance_entries: async () => {},
    pre_departure_checklists: async () => {},
    maintenance_schedules: async () => {}, // Add new resource refetch
    users: async () => {},
    profile: async () => {},
    permissions: async () => {},
    dashboard: async () => {},
  });

  // Effet pour maintenir refetchMap.current à jour avec les dernières fonctions de refetch
  useEffect(() => {
    refetchMap.current = {
      vehicles: refetchVehicles,
      drivers: refetchDrivers,
      tours: refetchTours,
      fuel_entries: refetchFuel,
      documents: refetchDocuments,
      maintenance_entries: refetchMaintenance,
      pre_departure_checklists: refetchChecklists,
      maintenance_schedules: refetchMaintenanceSchedules, // Update refetch for new resource
      users: async () => {},
      profile: async () => {},
      permissions: async () => {},
      dashboard: async () => {},
    };
  }, [refetchVehicles, refetchDrivers, refetchTours, refetchFuel, refetchDocuments, refetchMaintenance, refetchChecklists, refetchMaintenanceSchedules]); // Add new refetch dependency

  // Fonction pour refetcher toutes les données
  const refetchFleetData = useCallback(async () => {
    if (!currentUser) return; // Ne refetch que si un utilisateur est connecté
    const refetchPromises = Object.values(refetchMap.current).map(refetchFn => refetchFn());
    await Promise.all(refetchPromises);
  }, [currentUser]);

  // Fonction pour refetcher une ressource spécifique
  const refetchResource = useCallback(async (resource: Resource) => {
    if (!currentUser) return;
    const refetchFn = refetchMap.current[resource];
    if (refetchFn) {
      await refetchFn();
    } else {
      console.warn(`Aucune fonction de refetch enregistrée pour la ressource : ${resource}`);
    }
  }, [currentUser]);

  // Fetch initial lorsque la session utilisateur est chargée
  useEffect(() => {
    if (!isSessionLoading && currentUser && !isMounted.current) {
      refetchFleetData();
      isMounted.current = true;
    } else if (!isSessionLoading && !currentUser) {
      // Les hooks useSupabaseData individuels gèrent déjà la suppression de leurs données si !enabled.
      // Donc, pas besoin de vider explicitement fleetData ici.
    }
  }, [isSessionLoading, currentUser, refetchFleetData]);

  if (isSessionLoading || (currentUser && isLoadingFleet && !isMounted.current)) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <SkeletonLoader count={1} height="h-16" className="w-1/2" />
        <p className="mt-4 text-gray-600">Chargement des données de la flotte...</p>
      </div>
    );
  }

  return (
    <FleetContext.Provider value={{ fleetData, isLoadingFleet, refetchFleetData, refetchResource, getResourcePaginationState, setResourcePaginationState }}>
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