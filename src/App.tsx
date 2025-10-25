import { useEffect } from 'react';
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
import Profile from './pages/Profile';
import UserManagement from './components/UserManagement';
import PermissionsOverview from './components/PermissionsOverview';
import ProtectedRoute from './components/ProtectedRoute';
import { Resource, Action, UserRole, OperationResult } from './types';
import { useSession } from './components/SessionContextProvider';
import { supabase } from './integrations/supabase/client';
import { showSuccess, showError, showLoading, dismissToast } from './utils/toast';
import SkeletonLoader from './components/SkeletonLoader';
import { usePermissions } from './hooks/usePermissions';
import { useFleetData } from './components/FleetDataProvider';


export default function App() {
  const { session, currentUser, isLoading, isProfileLoading, refetchCurrentUser } = useSession();
  const { canAccess, isLoadingPermissions } = usePermissions();
  const { refetchResource } = useFleetData();
  const navigate = useNavigate();
  const location = useLocation();
  
  useEffect(() => {
    if (!isLoading && !isProfileLoading && !isLoadingPermissions) {
      if (session?.user) {
        if (location.pathname === '/login' || location.pathname === '/') {
          navigate('/dashboard');
        }
      } else {
        if (location.pathname !== '/login') {
          navigate('/login');
        }
      }
    }
  }, [session, isLoading, isProfileLoading, isLoadingPermissions, navigate, location.pathname]);

  const handleUpdateData = async (tableName: Resource, newData: any, action: Action): Promise<OperationResult> => {
    console.log(`[handleUpdateData] Attempting ${action} on ${tableName} with data:`, newData);

    if (!currentUser?.id) {
      console.error(`[handleUpdateData] Unauthorized: No current user for ${action} on ${tableName}.`);
      return { success: false, error: `Utilisateur non authentifié. Impossible d'effectuer l'opération sur ${tableName}.` };
    }
    if (!canAccess(tableName, action)) {
      console.warn(`[handleUpdateData] Permission denied: User role '${currentUser.role}' cannot ${action} on ${tableName}.`);
      return { success: false, error: `Vous n'avez pas la permission d'effectuer cette action sur ${tableName}.` };
    }

    try {
      let response;
      if (action === 'add') {
        console.log(`[handleUpdateData] Inserting into ${tableName}:`, { ...newData, user_id: currentUser.id }); // ADDED LOG
        response = await supabase.from(tableName).insert({ ...newData, user_id: currentUser.id }).select();
      } else if (action === 'edit') {
        console.log(`[handleUpdateData] Updating ${tableName} with ID ${newData.id}:`, newData); // ADDED LOG
        response = await supabase.from(tableName).update(newData).eq('id', newData.id).eq('user_id', currentUser.id).select();
      } else if (action === 'delete') {
        console.log(`[handleUpdateData] Deleting from ${tableName} with ID ${newData.id}`); // ADDED LOG
        response = await supabase.from(tableName).delete().eq('id', newData.id).eq('user_id', currentUser.id);
      } else {
        throw new Error('Action non supportée.');
      }

      console.log(`[handleUpdateData] Supabase raw response for ${action} on ${tableName}:`, response); // IMPROVED LOG

      if (response?.error) {
        console.error(`[handleUpdateData] Supabase Error during ${action} on ${tableName}:`, response.error);
        throw response.error;
      }
      
      if ((action === 'add' || action === 'edit') && (!response.data || response.data.length === 0)) {
        const errorMessage = `L'opération ${action} sur ${tableName} a échoué : aucune donnée retournée par la base de données.`;
        console.error(`[handleUpdateData] ${errorMessage}`);
        return { success: false, error: errorMessage };
      }

      await refetchResource(tableName);
      console.log(`[handleUpdateData] Refetched resource: ${tableName}`);

      return { success: true, message: `Données ${action === 'add' ? 'ajoutées' : action === 'edit' ? 'mises à jour' : 'supprimées'} avec succès !`, id: (response?.data?.[0] as any)?.id };
    } catch (error: unknown) {
      console.error(`[handleUpdateData] Error in handleUpdateData for ${tableName} (${action}):`, error instanceof Error ? error.message : String(error));
      return { success: false, error: `Erreur lors de la ${action === 'add' ? 'création' : action === 'edit' ? 'mise à jour' : 'suppression'} des données: ${(error as any)?.message || 'Une erreur inconnue est survenue.'}` };
    }
  };

  const handleUpdateUserRole = async (userId: string, newRole: UserRole) => {
    if (!currentUser || !canAccess('users', 'edit')) {
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
      if (userId === currentUser.id) {
        await refetchCurrentUser();
      }
    } catch (error: unknown) {
      console.error('Error updating user role:', error instanceof Error ? error.message : String(error));
      dismissToast(loadingToastId);
      showError(`Erreur lors de la mise à jour du rôle : ${error instanceof Error ? error.message : String(error)}`);
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
    ...(canAccess('permissions', 'view') ? [{ id: 'permissions-overview', name: 'Gestion Accès', icon: ShieldCheck, path: '/permissions-overview' }] : []),
  ];

  if (isLoading || isProfileLoading || isLoadingPermissions) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <header className="glass rounded-b-3xl m-4 mb-0 animate-fade-in">
          <div className="container mx-auto px-6 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gradient-brand rounded-xl flex items-center justify-center">
                  <Truck className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-800">Fleet Manager Pro</h1>
                  <p className="text-gray-600 text-sm">Système de Gestion de Flotte Avancé</p>
                  <p className="text-gray-500 text-xs mt-1">M2L&TG</p>
                </div>
              </div>
              <SkeletonLoader height="h-10" className="w-32" />
            </div>
          </div>
        </header>
        <div className="flex flex-1">
          <aside className="w-64 glass rounded-tr-2xl m-4 mt-0 p-4 animate-slide-up">
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
    <div className="min-h-screen flex flex-col">
      <header className="glass rounded-b-3xl m-4 mb-0 animate-fade-in">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-brand rounded-xl flex items-center justify-center">
                <Truck className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-800">Fleet Manager Pro</h1>
                <p className="text-gray-600 text-sm">Système de Gestion de Flotte Avancé</p>
                <p className="text-gray-500 text-xs mt-1">M2L&TG</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">Bienvenue, <span className="font-semibold">{currentUser?.name}</span> (<span className="font-semibold">{currentUser?.role}</span>)</span>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all duration-300 flex items-center space-x-2 hover-lift"
              >
                <LogOut className="w-4 h-4" />
                <span>Déconnexion</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        <aside className="w-64 glass rounded-tr-2xl m-4 mt-0 p-4 animate-slide-up">
          <nav className="p-4">
            <div className="flex flex-col space-y-2">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <Link
                    key={tab.id}
                    to={tab.path}
                    className={`w-full px-4 py-3 rounded-lg transition-all duration-300 flex items-center space-x-3 justify-start hover-lift ${
                      location.pathname === tab.path
                        ? 'bg-gradient-brand text-white shadow-md'
                        : 'bg-white/20 hover:bg-white/30 text-gray-800'
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
                <Route path="/dashboard" element={<ProtectedRoute><Dashboard key="dashboard-view" userRole={userRole} /></ProtectedRoute>} />
                <Route path="/vehicles" element={<ProtectedRoute><Vehicles key="vehicles-view" onUpdate={handleUpdateData} onDelete={handleUpdateData} onAdd={handleUpdateData} /></ProtectedRoute>} />
                <Route path="/drivers" element={<ProtectedRoute><Drivers key="drivers-view" onUpdate={handleUpdateData} onDelete={handleUpdateData} onAdd={handleUpdateData} /></ProtectedRoute>} />
                <Route path="/tours" element={<ProtectedRoute><Tours key="tours-view" onUpdate={handleUpdateData} onDelete={handleUpdateData} onAdd={handleUpdateData} /></ProtectedRoute>} />
                <Route path="/fuel" element={<ProtectedRoute><FuelManagement key="fuel-view" onUpdate={handleUpdateData} onDelete={handleUpdateData} onAdd={handleUpdateData} /></ProtectedRoute>} />
                <Route path="/documents" element={<ProtectedRoute><Documents key="documents-view" onUpdate={handleUpdateData} onDelete={handleUpdateData} onAdd={handleUpdateData} /></ProtectedRoute>} />
                <Route path="/maintenance" element={<ProtectedRoute><Maintenance 
                  key="maintenance-view"
                  onUpdate={handleUpdateData} 
                  onAdd={handleUpdateData} 
                  onDelete={handleUpdateData}
                /></ProtectedRoute>} />
                <Route path="/checklists" element={<ProtectedRoute><PreDepartureChecklistComponent 
                  key="checklists-view" 
                  onAdd={handleUpdateData} 
                  onDelete={handleUpdateData}
                /></ProtectedRoute>} />
                <Route path="/reports" element={<ProtectedRoute><Reports key="reports-view" userRole={userRole} /></ProtectedRoute>} />
                <Route path="/summary" element={<ProtectedRoute><Summary key="summary-view" /></ProtectedRoute>} />
                <Route path="/profile" element={<ProtectedRoute><Profile key="profile-view" /></ProtectedRoute>} />
                <Route path="/user-management" element={<ProtectedRoute allowedRoles={['admin']}><UserManagement 
                    key="user-management-view" 
                    onUpdateUserRole={handleUpdateUserRole}
                  /></ProtectedRoute>} />
                <Route path="/permissions-overview" element={<ProtectedRoute allowedRoles={['admin']}><PermissionsOverview key="permissions-overview-view" /></ProtectedRoute>} />
                <Route path="*" element={<ProtectedRoute><Dashboard key="default-dashboard-view" userRole={userRole} /></ProtectedRoute>} />
              </Routes>
        </main>
      </div>
    </div>
  );
}