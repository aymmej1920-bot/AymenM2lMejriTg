import React, { useEffect, createContext, useContext, useCallback, ReactNode, useRef } from 'react';
import { useSession } from './SessionContextProvider';
import { useSupabaseData } from '../hooks/useSupabaseData';
import { FleetData, FleetContextType, Resource, Vehicle, Driver, Tour, FuelEntry, Document, MaintenanceEntry, PreDepartureChecklist } from '../types';
import SkeletonLoader from './SkeletonLoader';

const FleetContext = createContext<FleetContextType | undefined>(undefined);

export const FleetDataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { currentUser, isLoading: isSessionLoading } = useSession();
  const isMounted = useRef(false);

  // Options communes pour les hooks useSupabaseData
  const commonOptions = {
    manualFetch: true, // Empêche le fetch automatique par les hooks individuels
    skipUserIdFilter: currentUser?.role === 'admin' || currentUser?.role === 'direction',
  };

  // Utilisation de useSupabaseData pour chaque ressource
  const { data: vehicles, isLoading: isLoadingVehicles, refetch: refetchVehicles } = useSupabaseData<Vehicle>('vehicles', { enabled: !!currentUser, ...commonOptions });
  const { data: drivers, isLoading: isLoadingDrivers, refetch: refetchDrivers } = useSupabaseData<Driver>('drivers', { enabled: !!currentUser, ...commonOptions });
  const { data: tours, isLoading: isLoadingTours, refetch: refetchTours } = useSupabaseData<Tour>('tours', { enabled: !!currentUser, ...commonOptions });
  const { data: fuelEntries, isLoading: isLoadingFuel, refetch: refetchFuel } = useSupabaseData<FuelEntry>('fuel_entries', { enabled: !!currentUser, ...commonOptions });
  const { data: documents, isLoading: isLoadingDocuments, refetch: refetchDocuments } = useSupabaseData<Document>('documents', { enabled: !!currentUser, ...commonOptions });
  const { data: maintenance, isLoading: isLoadingMaintenance, refetch: refetchMaintenance } = useSupabaseData<MaintenanceEntry>('maintenance_entries', { enabled: !!currentUser, ...commonOptions });
  const { data: preDepartureChecklists, isLoading: isLoadingChecklists, refetch: refetchChecklists } = useSupabaseData<PreDepartureChecklist>('pre_departure_checklists', { enabled: !!currentUser, ...commonOptions });

  const fleetData: FleetData = {
    vehicles,
    drivers,
    tours,
    fuel_entries: fuelEntries,
    documents,
    maintenance,
    pre_departure_checklists: preDepartureChecklists,
  };

  const isLoadingFleet = isLoadingVehicles || isLoadingDrivers || isLoadingTours || isLoadingFuel || isLoadingDocuments || isLoadingMaintenance || isLoadingChecklists || isSessionLoading;

  // Map des fonctions de refetch pour les ressources individuelles
  const refetchMap = useRef<Record<Resource, () => Promise<void>>>({
    vehicles: async () => {},
    drivers: async () => {},
    tours: async () => {},
    fuel_entries: async () => {},
    documents: async () => {},
    maintenance_entries: async () => {},
    pre_departure_checklists: async () => {},
    users: async () => {}, // UserManagement gère son propre refetch pour 'users'
    profile: async () => {}, // La page Profile gère son propre refetch
    permissions: async () => {}, // PermissionsOverview gère son propre refetch
    dashboard: async () => {}, // Le tableau de bord n'a pas de ressource directement refetchable
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
      users: async () => {},
      profile: async () => {},
      permissions: async () => {},
      dashboard: async () => {},
    };
  }, [refetchVehicles, refetchDrivers, refetchTours, refetchFuel, refetchDocuments, refetchMaintenance, refetchChecklists]);

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