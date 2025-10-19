import { useState, useEffect, useCallback } from 'react';
import { Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import { Truck, Users, Route as RouteIcon, Fuel, FileText, Wrench, BarChart3, LogOut, ClipboardCheck, FileText as ReportIcon, UserCog, User as UserIcon } from 'lucide-react';
import Dashboard from './components/Dashboard';
import Vehicles from './components/Vehicles';
import Drivers from './components/Drivers';
import Tours from './components/Tours';
import FuelManagement from './components/FuelManagement';
import Documents from './components/Documents';
import Maintenance from './components/Maintenance';
import Summary from './components/Summary';
import PreDepartureChecklistComponent from './components/PreDepartureChecklist';
import Reports from './pages/Reports';
import Login from './pages/Login';
import Profile from './pages/Profile'; // Import the new Profile page
import UserManagement from './components/UserManagement';
import ProtectedRoute from './components/ProtectedRoute'; // Import ProtectedRoute
import { FleetData, Vehicle, Driver, Tour, FuelEntry, Document, MaintenanceEntry, PreDepartureChecklist } from './types';
import { useSession } from './components/SessionContextProvider';
import { supabase } from './integrations/supabase/client';
import { showSuccess, showError, showLoading, dismissToast } from './utils/toast';
import SkeletonLoader from './components/SkeletonLoader';

function App() {
  const { session, currentUser, isLoading, isProfileLoading } = useSession(); // Use currentUser from context
  const navigate = useNavigate();
  const location = useLocation();
  const [fleetData, setFleetData] = useState<FleetData>({
    vehicles: [],
    drivers: [],
    tours: [],
    fuel: [],
    documents: [],
    maintenance: [],
    pre_departure_checklists: [],
  });
  const [dataLoading, setDataLoading] = useState(true); // Only for fleet data, not session/profile

  const fetchData = useCallback(async (userId: string) => {
    setDataLoading(true);
    try {
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

    } catch (error) {
      console.error('Error fetching fleet data:', error);
      showError('Erreur lors du chargement des données de flotte.');
    } finally {
      setDataLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isLoading && !isProfileLoading) {
      if (session?.user) {
        fetchData(session.user.id);
        // Redirect to dashboard if on login page after successful authentication
        if (location.pathname === '/login' || location.pathname === '/') {
          navigate('/dashboard');
        }
      } else {
        // If not authenticated, ensure we are on the login page
        if (location.pathname !== '/login') {
          navigate('/login');
        }
        // Clear fleet data if user logs out
        setFleetData({
          vehicles: [], drivers: [], tours: [], fuel: [], documents: [], maintenance: [], pre_departure_checklists: [],
        });
        setDataLoading(false);
      }
    }
  }, [session, isLoading, isProfileLoading, fetchData, navigate, location.pathname]);

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

  const handleUpdateUserRole = async (userId: string, newRole: 'admin' | 'direction' | 'utilisateur') => {
    if (currentUser?.role !== 'admin') {
      showError('Seuls les administrateurs peuvent modifier les rôles.');
      return;
    }
    const loadingToastId = showLoading(`Mise à jour du rôle de l'utilisateur ${userId}...`);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId);

      if (error) throw error;
      dismissToast(loadingToastId);
      showSuccess('Rôle utilisateur mis à jour avec succès !');
      // Re-fetch data to update user list and potentially current user's role if it was changed
      if (currentUser?.id) fetchData(currentUser.id);
    } catch (error: any) {
      console.error('Error updating user role:', error.message);
      dismissToast(loadingToastId);
      showError(`Erreur lors de la mise à jour du rôle : ${error.message}`);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (currentUser?.role !== 'admin') {
      showError('Seuls les administrateurs peuvent supprimer des utilisateurs.');
      return;
    }
    const loadingToastId = showLoading(`Suppression de l'utilisateur ${userId}...`);
    try {
      const { error: authError } = await supabase.auth.admin.deleteUser(userId);

      if (authError) throw authError;
      dismissToast(loadingToastId);
      showSuccess('Utilisateur supprimé avec succès !');
      // Re-fetch data to update user list
      if (currentUser?.id) fetchData(currentUser.id);
    } catch (error: any) {
      console.error('Error deleting user:', error.message);
      dismissToast(loadingToastId);
      showError(`Erreur lors de la suppression de l'utilisateur : ${error.message}`);
    }
  };

  const handleLogout = async () => {
    const loadingToastId = showLoading('Déconnexion...');
    await supabase.auth.signOut();
    // SessionContextProvider will handle clearing currentUser and user states
    dismissToast(loadingToastId);
    showSuccess('Déconnexion réussie.');
    navigate('/login'); // Redirect to login page after logout
  };

  const tabs = [
    { id: 'dashboard', name: 'Dashboard', icon: BarChart3, path: '/dashboard' },
    { id: 'vehicles', name: 'Véhicules', icon: Truck, path: '/vehicles' },
    { id: 'drivers', name: 'Conducteurs', icon: Users, path: '/drivers' },
    { id: 'tours', name: 'Tournées', icon: RouteIcon, path: '/tours' },
    { id: 'fuel', name: 'Carburant', icon: Fuel, path: '/fuel' },
    { id: 'documents', name: 'Documents', icon: FileText, path: '/documents' },
    { id: 'maintenance', name: 'Maintenance', icon: Wrench, path: '/maintenance' },
    { id: 'checklists', name: 'Checklists', icon: ClipboardCheck, path: '/checklists' },
    { id: 'reports', name: 'Rapports', icon: ReportIcon, path: '/reports' },
    { id: 'summary', name: 'Résumé', icon: BarChart3, path: '/summary' },
    { id: 'profile', name: 'Mon Profil', icon: UserIcon, path: '/profile' }, // New Profile tab
    // Only show User Management tab if the current user is an admin
    ...(currentUser?.role === 'admin' ? [{ id: 'user-management', name: 'Gestion Utilisateurs', icon: UserCog, path: '/user-management' }] : []),
  ];

  if (isLoading || isProfileLoading || dataLoading) {
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
                  <p className="text-purple-100 text-xs mt-1">M2L&TG</p>
                </div>
              </div>
              <SkeletonLoader height="h-10" className="w-32" />
            </div>
          </div>
        </header>
        <div className="flex flex-1">
          <aside className="w-64 bg-white shadow-md p-4">
            <div className="flex flex-col space-y-2">
              <SkeletonLoader count={tabs.length} height="h-12" className="w-full" />
            </div>
          </aside>
          <main className="flex-1 px-6 py-8 min-w-0 overflow-x-auto w-full">
            <SkeletonLoader count={5} height="h-16" className="w-full mb-4" />
            <SkeletonLoader count={3} height="h-24" className="w-full mb-4" />
            <SkeletonLoader count={2} height="h-64" className="w-full mb-4" />
          </main>
        </div>
      </div>
    );
  }

  // If not authenticated, only render the Login route. ProtectedRoute will handle redirection for others.
  if (!session) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Login />} />
      </Routes>
    );
  }

  const userRole = currentUser?.role || 'utilisateur';

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
                <p className="text-purple-100 text-xs mt-1">M2L&TG</p>
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

      <div className="flex flex-1">
        <aside className="w-64 bg-white shadow-md sticky top-0 h-screen overflow-y-auto z-40">
          <nav className="p-4">
            <div className="flex flex-col space-y-2">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <Link
                    key={tab.id}
                    to={tab.path}
                    className={`w-full px-4 py-3 rounded-lg transition-all duration-300 flex items-center space-x-3 justify-start ${
                      location.pathname === tab.path
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 hover:bg-indigo-200 text-gray-700'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{tab.name}</span>
                  </Link>
                );
              })}
            </div>
          </nav>
        </aside>

        <main className="flex-1 px-6 py-8 min-w-0 overflow-x-auto w-full">
          <Routes>
            {/* Public route for login */}
            <Route path="/login" element={<Login />} />

            {/* Protected routes */}
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard key="dashboard-view" data={fleetData} userRole={userRole} preDepartureChecklists={fleetData.pre_departure_checklists} /></ProtectedRoute>} />
            <Route path="/vehicles" element={<ProtectedRoute><Vehicles key="vehicles-view" data={fleetData} userRole={userRole} onUpdate={(newData: Vehicle) => handleUpdateData('vehicles', newData, 'update')} onDelete={(id: string) => handleUpdateData('vehicles', { id }, 'delete')} onAdd={(newData: Omit<Vehicle, 'id' | 'user_id' | 'created_at'>) => handleUpdateData('vehicles', newData, 'insert')} /></ProtectedRoute>} />
            <Route path="/drivers" element={<ProtectedRoute><Drivers key="drivers-view" data={fleetData} userRole={userRole} onUpdate={(newData: Driver) => handleUpdateData('drivers', newData, 'update')} onDelete={(id: string) => handleUpdateData('drivers', { id }, 'delete')} onAdd={(newData: Omit<Driver, 'id' | 'user_id' | 'created_at'>) => handleUpdateData('drivers', newData, 'insert')} /></ProtectedRoute>} />
            <Route path="/tours" element={<ProtectedRoute><Tours key="tours-view" data={fleetData} userRole={userRole} onUpdate={(newData: Tour) => handleUpdateData('tours', newData, 'update')} onDelete={(id: string) => handleUpdateData('tours', { id }, 'delete')} onAdd={(newData: Omit<Tour, 'id' | 'user_id' | 'created_at'>) => handleUpdateData('tours', newData, 'insert')} /></ProtectedRoute>} />
            <Route path="/fuel" element={<ProtectedRoute><FuelManagement key="fuel-view" data={fleetData} userRole={userRole} onUpdate={(newData: FuelEntry) => handleUpdateData('fuel_entries', newData, 'update')} onDelete={(id: string) => handleUpdateData('fuel_entries', { id }, 'delete')} onAdd={(newData: Omit<FuelEntry, 'id' | 'user_id' | 'created_at'>) => handleUpdateData('fuel_entries', newData, 'insert')} /></ProtectedRoute>} />
            <Route path="/documents" element={<ProtectedRoute><Documents key="documents-view" data={fleetData} userRole={userRole} onUpdate={(newData: Document) => handleUpdateData('documents', newData, 'update')} onDelete={(id: string) => handleUpdateData('documents', { id }, 'delete')} onAdd={(newData: Omit<Document, 'id' | 'user_id' | 'created_at'>) => handleUpdateData('documents', newData, 'insert')} /></ProtectedRoute>} />
            <Route path="/maintenance" element={<ProtectedRoute><Maintenance 
              key="maintenance-view"
              data={fleetData} 
              userRole={userRole} 
              onUpdate={(newData) => handleUpdateData('vehicles', newData, 'update')} 
              onAdd={(newData) => handleUpdateData('maintenance_entries', newData, 'insert')} 
              onDelete={(id: string) => handleUpdateData('maintenance_entries', { id }, 'delete')}
              preDepartureChecklists={fleetData.pre_departure_checklists}
            /></ProtectedRoute>} />
            <Route path="/checklists" element={<ProtectedRoute><PreDepartureChecklistComponent 
              key="checklists-view" 
              data={fleetData} 
              userRole={userRole} 
              onAdd={(newData: Omit<PreDepartureChecklist, 'id' | 'user_id' | 'created_at'>) => handleUpdateData('pre_departure_checklists', newData, 'insert')} 
            /></ProtectedRoute>} />
            <Route path="/reports" element={<ProtectedRoute><Reports key="reports-view" data={fleetData} userRole={userRole} /></ProtectedRoute>} />
            <Route path="/summary" element={<ProtectedRoute><Summary key="summary-view" data={fleetData} /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Profile key="profile-view" /></ProtectedRoute>} /> {/* New Profile Route */}
            <Route path="/user-management" element={<ProtectedRoute allowedRoles={['admin']}><UserManagement 
                key="user-management-view" 
                currentUserRole={userRole} 
                onUpdateUserRole={handleUpdateUserRole}
                onDeleteUser={handleDeleteUser}
              /></ProtectedRoute>} />
            <Route path="*" element={<ProtectedRoute><Dashboard key="default-dashboard-view" data={fleetData} userRole={userRole} preDepartureChecklists={fleetData.pre_departure_checklists} /></ProtectedRoute>} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default App;