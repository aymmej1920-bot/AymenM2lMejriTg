import { useState, useEffect, useCallback } from 'react';
import { Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import { Truck, Users, Route as RouteIcon, Fuel, FileText, Wrench, BarChart3, LogOut, ClipboardCheck, FileText as ReportIcon, UserCog, User as UserIcon, ShieldCheck } from 'lucide-react';
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
import PermissionsOverview from './components/PermissionsOverview'; // Import PermissionsOverview
import ProtectedRoute from './components/ProtectedRoute'; // Import ProtectedRoute
import { FleetData, Vehicle, Driver, Tour, FuelEntry, Document, MaintenanceEntry, PreDepartureChecklist, UserRole, Resource, Action } from './types'; // Import types
import { useSession } from './components/SessionContextProvider';
import { supabase } from './integrations/supabase/client';
import { showSuccess, showError, showLoading, dismissToast } from './utils/toast';
import SkeletonLoader from './components/SkeletonLoader';
import { PermissionsProvider, usePermissions } from './hooks/usePermissions'; // Import PermissionsProvider and usePermissions

function AppContent() { // Renamed App to AppContent
  const { session, currentUser, isLoading, isProfileLoading } = useSession();
  const { canAccess, isLoadingPermissions } = usePermissions(); // Use usePermissions hook
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
  const [dataLoading, setDataLoading] = useState(true);

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
    if (!isLoading && !isProfileLoading && !isLoadingPermissions) { // Wait for permissions to load
      if (session?.user) {
        fetchData(session.user.id);
        if (location.pathname === '/login' || location.pathname === '/') {
          navigate('/dashboard');
        }
      } else {
        if (location.pathname !== '/login') {
          navigate('/login');
        }
        setFleetData({
          vehicles: [], drivers: [], tours: [], fuel: [], documents: [], maintenance: [], pre_departure_checklists: [],
        });
        setDataLoading(false);
      }
    }
  }, [session, isLoading, isProfileLoading, isLoadingPermissions, fetchData, navigate, location.pathname]);

  const handleUpdateData = async (tableName: Resource, newData: any, action: Action) => {
    if (!currentUser?.id) return;
    if (!canAccess(tableName, action)) { // Use canAccess from hook
      showError(`Vous n'avez pas la permission d'effectuer cette action sur ${tableName}.`);
      return;
    }

    const loadingToastId = showLoading(`Opération en cours sur ${tableName}...`);

    try {
      let response;
      if (action === 'add') { // Changed 'insert' to 'add' to match Action type
        response = await supabase.from(tableName).insert({ ...newData, user_id: currentUser.id }).select();
      } else if (action === 'edit') { // Changed 'update' to 'edit'
        response = await supabase.from(tableName).update(newData).eq('id', newData.id).eq('user_id', currentUser.id).select();
      } else if (action === 'delete') {
        response = await supabase.from(tableName).delete().eq('id', newData.id).eq('user_id', currentUser.id);
      } else {
        throw new Error('Action non supportée.');
      }

      if (response?.error) throw response.error;
      
      dismissToast(loadingToastId);
      showSuccess(`Données ${action === 'add' ? 'ajoutées' : action === 'edit' ? 'mises à jour' : 'supprimées'} avec succès !`);
      
      fetchData(currentUser.id);
    } catch (error) {
      console.error(`Error ${action}ing data in ${tableName}:`, error);
      dismissToast(loadingToastId);
      showError(`Erreur lors de la ${action === 'add' ? 'création' : action === 'edit' ? 'mise à jour' : 'suppression'} des données.`);
    }
  };

  const handleUpdateUserRole = async (userId: string, newRole: UserRole) => { // Use UserRole type
    if (!currentUser || !canAccess('users', 'edit')) { // Use canAccess from hook
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
      if (currentUser?.id) fetchData(currentUser.id);
    } catch (error: any) {
      console.error('Error updating user role:', error.message);
      dismissToast(loadingToastId);
      showError(`Erreur lors de la mise à jour du rôle : ${error.message}`);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!currentUser || !canAccess('users', 'delete')) { // Use canAccess from hook
      showError('Seuls les administrateurs peuvent supprimer des utilisateurs.');
      return;
    }
    const loadingToastId = showLoading(`Suppression de l'utilisateur ${userId}...`);
    try {
      const { error: authError } = await supabase.auth.admin.deleteUser(userId);

      if (authError) throw authError;
      dismissToast(loadingToastId);
      showSuccess('Utilisateur supprimé avec succès !');
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
    dismissToast(loadingToastId);
    showSuccess('Déconnexion réussie.');
    navigate('/login');
  };

  const userRole = currentUser?.role || 'utilisateur';

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
    { id: 'profile', name: 'Mon Profil', icon: UserIcon, path: '/profile' },
    ...(canAccess('users', 'view') ? [{ id: 'user-management', name: 'Gestion Utilisateurs', icon: UserCog, path: '/user-management' }] : []),
    ...(canAccess('permissions', 'view') ? [{ id: 'permissions-overview', name: 'Gestion Accès', icon: ShieldCheck, path: '/permissions-overview' }] : []), // Use 'permissions' resource
  ];

  if (isLoading || isProfileLoading || dataLoading || isLoadingPermissions) { // Wait for permissions to load
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

  if (!session) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Login />} />
      </Routes>
    );
  }

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
            <Route path="/login" element={<Login />} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard key="dashboard-view" data={fleetData} userRole={userRole} preDepartureChecklists={fleetData.pre_departure_checklists} /></ProtectedRoute>} />
            <Route path="/vehicles" element={<ProtectedRoute><Vehicles key="vehicles-view" data={fleetData} onUpdate={(newData: Vehicle) => handleUpdateData('vehicles', newData, 'edit')} onDelete={(id: string) => handleUpdateData('vehicles', { id }, 'delete')} onAdd={(newData: Omit<Vehicle, 'id' | 'user_id' | 'created_at'>) => handleUpdateData('vehicles', newData, 'add')} /></ProtectedRoute>} />
            <Route path="/drivers" element={<ProtectedRoute><Drivers key="drivers-view" data={fleetData} onUpdate={(newData: Driver) => handleUpdateData('drivers', newData, 'edit')} onDelete={(id: string) => handleUpdateData('drivers', { id }, 'delete')} onAdd={(newData: Omit<Driver, 'id' | 'user_id' | 'created_at'>) => handleUpdateData('drivers', newData, 'add')} /></ProtectedRoute>} />
            <Route path="/tours" element={<ProtectedRoute><Tours key="tours-view" data={fleetData} onUpdate={(newData: Tour) => handleUpdateData('tours', newData, 'edit')} onDelete={(id: string) => handleUpdateData('tours', { id }, 'delete')} onAdd={(newData: Omit<Tour, 'id' | 'user_id' | 'created_at'>) => handleUpdateData('tours', newData, 'add')} /></ProtectedRoute>} />
            <Route path="/fuel" element={<ProtectedRoute><FuelManagement key="fuel-view" data={fleetData} onUpdate={(newData: FuelEntry) => handleUpdateData('fuel_entries', newData, 'edit')} onDelete={(id: string) => handleUpdateData('fuel_entries', { id }, 'delete')} onAdd={(newData: Omit<FuelEntry, 'id' | 'user_id' | 'created_at'>) => handleUpdateData('fuel_entries', newData, 'add')} /></ProtectedRoute>} />
            <Route path="/documents" element={<ProtectedRoute><Documents key="documents-view" data={fleetData} onUpdate={(newData: Document) => handleUpdateData('documents', newData, 'edit')} onDelete={(id: string) => handleUpdateData('documents', { id }, 'delete')} onAdd={(newData: Omit<Document, 'id' | 'user_id' | 'created_at'>) => handleUpdateData('documents', newData, 'add')} /></ProtectedRoute>} />
            <Route path="/maintenance" element={<ProtectedRoute><Maintenance 
              key="maintenance-view"
              data={fleetData} 
              onUpdate={(newData) => handleUpdateData('vehicles', newData, 'edit')} 
              onAdd={(newData) => handleUpdateData('maintenance_entries', newData, 'add')} 
              onDelete={(id: string) => handleUpdateData('maintenance_entries', { id }, 'delete')}
              preDepartureChecklists={fleetData.pre_departure_checklists}
            /></ProtectedRoute>} />
            <Route path="/checklists" element={<ProtectedRoute><PreDepartureChecklistComponent 
              key="checklists-view" 
              data={fleetData} 
              onAdd={(newData: Omit<PreDepartureChecklist, 'id' | 'user_id' | 'created_at'>) => handleUpdateData('pre_departure_checklists', newData, 'add')} 
            /></ProtectedRoute>} />
            <Route path="/reports" element={<ProtectedRoute><Reports key="reports-view" data={fleetData} userRole={userRole} /></ProtectedRoute>} />
            <Route path="/summary" element={<ProtectedRoute><Summary key="summary-view" data={fleetData} /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Profile key="profile-view" /></ProtectedRoute>} />
            <Route path="/user-management" element={<ProtectedRoute allowedRoles={['admin']}><UserManagement 
                key="user-management-view" 
                currentUserRole={userRole} 
                onUpdateUserRole={handleUpdateUserRole}
                onDeleteUser={handleDeleteUser}
              /></ProtectedRoute>} />
            <Route path="/permissions-overview" element={<ProtectedRoute allowedRoles={['admin']}><PermissionsOverview key="permissions-overview-view" /></ProtectedRoute>} />
            <Route path="*" element={<ProtectedRoute><Dashboard key="default-dashboard-view" data={fleetData} userRole={userRole} preDepartureChecklists={fleetData.pre_departure_checklists} /></ProtectedRoute>} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

function App() {
  return (
    <PermissionsProvider>
      <AppContent />
    </PermissionsProvider>
  );
}

export default App;