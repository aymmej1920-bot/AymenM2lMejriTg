import { useState, useEffect, useCallback } from 'react';
import { Truck, Users, Route, Fuel, FileText, Wrench, BarChart3, LogOut, ClipboardCheck } from 'lucide-react';
import Dashboard from './components/Dashboard';
import Vehicles from './components/Vehicles';
import Drivers from './components/Drivers';
import Tours from './components/Tours';
import FuelManagement from './components/FuelManagement';
import Documents from './components/Documents';
import Maintenance from './components/Maintenance';
import Summary from './components/Summary';
import PreDepartureChecklistComponent from './components/PreDepartureChecklist';
import Login from './pages/Login';
import { FleetData, AuthUser, Vehicle, Driver, Tour, FuelEntry, Document, MaintenanceEntry, PreDepartureChecklist } from './types';
import { useSession } from './components/SessionContextProvider';
import { supabase } from './integrations/supabase/client';
import { showSuccess, showError, showLoading, dismissToast } from './utils/toast';
import SkeletonLoader from './components/SkeletonLoader';

function App() {
  const { session, isLoading } = useSession();
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [fleetData, setFleetData] = useState<FleetData>({
    vehicles: [],
    drivers: [],
    tours: [],
    fuel: [],
    documents: [],
    maintenance: [],
    pre_departure_checklists: [],
  });
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [dataLoading, setDataLoading] = useState(true);

  const fetchData = useCallback(async (userId: string) => {
    setDataLoading(true);
    try {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('first_name, last_name, role')
        .eq('id', userId)
        .single();

      if (profileError) throw profileError;

      const [
        { data: vehiclesData, error: vehiclesError },
        { data: driversData, error: driversError },
        { data: toursData, error: toursError },
        { data: fuelData, error: fuelError },
        { data: documentsData, error: documentsError },
        { data: maintenanceData, error: maintenanceError },
        { data: checklistsData, error: checklistsError },
      ] = await Promise.all([
        supabase.from('vehicles').select('*').eq('user_id', userId),
        supabase.from('drivers').select('*').eq('user_id', userId),
        supabase.from('tours').select('*').eq('user_id', userId),
        supabase.from('fuel_entries').select('*').eq('user_id', userId),
        supabase.from('documents').select('*').eq('user_id', userId),
        supabase.from('maintenance_entries').select('*').eq('user_id', userId),
        supabase.from('pre_departure_checklists').select('*').eq('user_id', userId),
      ]);

      if (vehiclesError) throw vehiclesError;
      if (driversError) throw driversError;
      if (toursError) throw toursError;
      if (fuelError) throw fuelError;
      if (documentsError) throw documentsError;
      if (maintenanceError) throw maintenanceError;
      if (checklistsError) throw checklistsError;

      setFleetData({
        vehicles: vehiclesData as Vehicle[],
        drivers: driversData as Driver[],
        tours: toursData as Tour[],
        fuel: fuelData as FuelEntry[],
        documents: documentsData as Document[],
        maintenance: maintenanceData as MaintenanceEntry[],
        pre_departure_checklists: checklistsData as PreDepartureChecklist[],
      });

      setCurrentUser({
        id: session?.user?.id || userId,
        email: session?.user?.email || '',
        name: profileData?.first_name || session?.user?.email?.split('@')[0] || 'User',
        role: profileData?.role || 'utilisateur', // Use the actual role from profileData, default to 'utilisateur'
      });

    } catch (error) {
      console.error('Error fetching fleet data or profile:', error);
      showError('Erreur lors du chargement des données de flotte ou du profil.');
    } finally {
      setDataLoading(false);
    }
  }, [session]);

  useEffect(() => {
    if (session?.user) {
      fetchData(session.user.id);
    } else {
      setCurrentUser(null);
      setFleetData({
        vehicles: [],
        drivers: [],
        tours: [],
        fuel: [],
        documents: [],
        maintenance: [],
        pre_departure_checklists: [],
      });
      setDataLoading(false);
    }
  }, [session, fetchData]);

  const handleUpdateData = async (tableName: string, newData: any, action: 'insert' | 'update' | 'delete') => {
    if (!currentUser?.id) return;

    const loadingToastId = showLoading(`Opération en cours sur ${tableName}...`);

    try {
      let response;
      if (action === 'insert') {
        response = await supabase.from(tableName).insert({ ...newData, user_id: currentUser.id }).select();
      } else if (action === 'update') {
        response = await supabase.from(tableName).update(newData).eq('id', newData.id).eq('user_id', currentUser.id).select();
      } else if (action === 'delete') {
        response = await supabase.from(tableName).delete().eq('id', newData.id).eq('user_id', currentUser.id);
      }

      if (response?.error) throw response.error;
      
      dismissToast(loadingToastId);
      showSuccess(`Données ${action === 'insert' ? 'ajoutées' : action === 'update' ? 'mises à jour' : 'supprimées'} avec succès !`);
      
      fetchData(currentUser.id);
    } catch (error) {
      console.error(`Error ${action}ing data in ${tableName}:`, error);
      dismissToast(loadingToastId);
      showError(`Erreur lors de la ${action === 'insert' ? 'création' : action === 'update' ? 'mise à jour' : 'suppression'} des données.`);
    }
  };

  const handleLogout = async () => {
    const loadingToastId = showLoading('Déconnexion...');
    await supabase.auth.signOut();
    setCurrentUser(null);
    setFleetData({
      vehicles: [],
      drivers: [],
      tours: [],
      fuel: [],
      documents: [],
      maintenance: [],
      pre_departure_checklists: [],
    });
    dismissToast(loadingToastId);
    showSuccess('Déconnexion réussie.');
  };

  const tabs = [
    { id: 'dashboard', name: 'Dashboard', icon: BarChart3 },
    { id: 'vehicles', name: 'Véhicules', icon: Truck },
    { id: 'drivers', name: 'Conducteurs', icon: Users },
    { id: 'tours', name: 'Tournées', icon: Route },
    { id: 'fuel', name: 'Carburant', icon: Fuel },
    { id: 'documents', name: 'Documents', icon: FileText },
    { id: 'maintenance', name: 'Maintenance', icon: Wrench },
    { id: 'checklists', name: 'Checklists', icon: ClipboardCheck },
    { id: 'summary', name: 'Résumé', icon: BarChart3 }
  ];

  if (isLoading || dataLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <header className="bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg">
          <div className="container mx-auto px-6 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="bg-white bg-opacity-20 p-3 rounded-full">
                  <Truck className="w-8 h-8" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold">Fleet Manager Pro</h1>
                  <p className="text-purple-100 text-sm">Système de Gestion de Flotte Avancé</p>
                </div>
              </div>
              <SkeletonLoader height="h-10" className="w-32" />
            </div>
          </div>
        </header>
        <nav className="bg-white shadow-md sticky top-0 z-40">
          <div className="container mx-auto px-6">
            <div className="flex space-x-1 overflow-x-auto py-2">
              <SkeletonLoader count={tabs.length} height="h-12" className="w-32" />
            </div>
          </div>
        </nav>
        <main className="container mx-auto px-6 py-8 flex-grow">
          <SkeletonLoader count={5} height="h-16" className="w-full mb-4" />
          <SkeletonLoader count={3} height="h-24" className="w-full mb-4" />
          <SkeletonLoader count={2} height="h-64" className="w-full mb-4" />
        </main>
      </div>
    );
  }

  if (!session) {
    return <Login />;
  }

  const renderContent = () => {
    const userRole = currentUser?.role || 'utilisateur'; // Default to 'utilisateur' if role is not set

    switch (currentTab) {
      case 'dashboard':
        return <Dashboard key="dashboard-view" data={fleetData} userRole={userRole} />;
      case 'vehicles':
        return <Vehicles key="vehicles-view" data={fleetData} userRole={userRole} onUpdate={(newData: Vehicle) => handleUpdateData('vehicles', newData, 'update')} onDelete={(id: string) => handleUpdateData('vehicles', { id }, 'delete')} onAdd={(newData: Omit<Vehicle, 'id' | 'user_id' | 'created_at'>) => handleUpdateData('vehicles', newData, 'insert')} />;
      case 'drivers':
        return <Drivers key="drivers-view" data={fleetData} userRole={userRole} onUpdate={(newData: Driver) => handleUpdateData('drivers', newData, 'update')} onDelete={(id: string) => handleUpdateData('drivers', { id }, 'delete')} onAdd={(newData: Omit<Driver, 'id' | 'user_id' | 'created_at'>) => handleUpdateData('drivers', newData, 'insert')} />;
      case 'tours':
        return <Tours key="tours-view" data={fleetData} userRole={userRole} onUpdate={(newData: Tour) => handleUpdateData('tours', newData, 'update')} onDelete={(id: string) => handleUpdateData('tours', { id }, 'delete')} onAdd={(newData: Omit<Tour, 'id' | 'user_id' | 'created_at'>) => handleUpdateData('tours', newData, 'insert')} />;
      case 'fuel':
        return <FuelManagement key="fuel-view" data={fleetData} userRole={userRole} onUpdate={(newData: FuelEntry) => handleUpdateData('fuel_entries', newData, 'update')} onDelete={(id: string) => handleUpdateData('fuel_entries', { id }, 'delete')} onAdd={(newData: Omit<FuelEntry, 'id' | 'user_id' | 'created_at'>) => handleUpdateData('fuel_entries', newData, 'insert')} />;
      case 'documents':
        return <Documents key="documents-view" data={fleetData} userRole={userRole} onUpdate={(newData: Document) => handleUpdateData('documents', newData, 'update')} onDelete={(id: string) => handleUpdateData('documents', { id }, 'delete')} onAdd={(newData: Omit<Document, 'id' | 'user_id' | 'created_at'>) => handleUpdateData('documents', newData, 'insert')} />;
      case 'maintenance':
        return <Maintenance 
          key="maintenance-view"
          data={fleetData} 
          userRole={userRole} 
          onUpdate={(newData) => handleUpdateData('vehicles', newData, 'update')} 
          onAdd={(newData) => handleUpdateData('maintenance_entries', newData, 'insert')} 
          preDepartureChecklists={fleetData.pre_departure_checklists}
        />;
      case 'checklists':
        return <PreDepartureChecklistComponent 
          key="checklists-view" 
          data={fleetData} 
          userRole={userRole} 
          onAdd={(newData: Omit<PreDepartureChecklist, 'id' | 'user_id' | 'created_at'>) => handleUpdateData('pre_departure_checklists', newData, 'insert')} 
        />;
      case 'summary':
        return <Summary key="summary-view" data={fleetData} />;
      default:
        return <Dashboard key="default-dashboard-view" data={fleetData} userRole={userRole} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="bg-white bg-opacity-20 p-3 rounded-full">
                <Truck className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">Fleet Manager Pro</h1>
                <p className="text-purple-100 text-sm">Système de Gestion de Flotte Avancé</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm">Bienvenue, {currentUser?.name} ({currentUser?.role})</span>
              <button
                onClick={handleLogout}
                className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg transition-all duration-300 flex items-center space-x-2"
              >
                <LogOut className="w-4 h-4" />
                <span>Déconnexion</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <nav className="bg-white shadow-md sticky top-0 z-40">
        <div className="container mx-auto px-6">
          <div className="flex space-x-1 overflow-x-auto py-2"> 
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setCurrentTab(tab.id)}
                  className={`px-6 py-4 rounded-lg whitespace-nowrap transition-all duration-300 flex items-center space-x-2 ${
                    currentTab === tab.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 hover:bg-indigo-200 text-gray-700'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{tab.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-6 py-8">
        {renderContent()}
      </main>
    </div>
  );
}

export default App;