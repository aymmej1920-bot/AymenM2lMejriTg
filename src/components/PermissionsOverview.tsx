import React from 'react';
import { CheckCircle, XCircle, Info } from 'lucide-react';
import { usePermissions } from '../hooks/usePermissions'; // Import the new hook
import { UserRole, Resource, Action } from '../types'; // Import types
import { useSession } from '../components/SessionContextProvider'; // To get current user role for editing permissions

const PermissionsOverview: React.FC = () => {
  const { permissions, canAccess, updatePermission, isLoadingPermissions } = usePermissions();
  void canAccess; // Explicitly mark as "used" for TypeScript
  const { currentUser } = useSession(); // Get current user to check if they are admin

  const roles: UserRole[] = ['admin', 'direction', 'utilisateur'];
  const resources: Resource[] = [
    'vehicles', 'drivers', 'tours', 'fuel_entries', 'documents',
    'maintenance_entries', 'pre_departure_checklists', 'users', 'profile', 'permissions' // Add 'permissions' as a resource
  ];
  const actions: Action[] = ['view', 'add', 'edit', 'delete'];

  const getActionLabel = (action: Action) => {
    switch (action) {
      case 'view': return 'Voir';
      case 'add': return 'Ajouter';
      case 'edit': return 'Modifier';
      case 'delete': return 'Supprimer';
      default: return action;
    }
  };

  const getResourceLabel = (resource: Resource) => {
    switch (resource) {
      case 'vehicles': return 'Véhicules';
      case 'drivers': return 'Conducteurs';
      case 'tours': return 'Tournées';
      case 'fuel_entries': return 'Carburant';
      case 'documents': return 'Documents';
      case 'maintenance_entries': return 'Maintenance';
      case 'pre_departure_checklists': return 'Checklists Pré-départ';
      case 'users': return 'Utilisateurs';
      case 'profile': return 'Mon Profil';
      case 'permissions': return 'Permissions'; // Label for the new resource
      default: return resource;
    }
  };

  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case 'admin': return 'Admin';
      case 'direction': return 'Direction';
      case 'utilisateur': return 'Utilisateur';
      default: return role;
    }
  };

  const handleTogglePermission = async (role: UserRole, resource: Resource, action: Action, currentAllowed: boolean) => {
    if (currentUser?.role !== 'admin') {
      // This check is also in updatePermission, but good to have a UI-level feedback
      alert('Seuls les administrateurs peuvent modifier les permissions.');
      return;
    }
    await updatePermission(role, resource, action, !currentAllowed);
  };

  if (isLoadingPermissions) {
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-gray-600">Chargement des permissions...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <h2 className="text-4xl font-bold text-gray-800">Gestion des Accès (Frontend)</h2>
      <p className="text-gray-600">
        Cet aperçu montre les permissions définies pour chaque rôle dans l'interface utilisateur.
        Ces règles contrôlent la visibilité des boutons et des champs de formulaire.
        <br />
        <span className="font-semibold text-red-600">Important :</span> La sécurité réelle des données est gérée par les politiques RLS (Row Level Security) dans Supabase.
        **Les modifications apportées ici ne mettent PAS automatiquement à jour les politiques RLS de votre base de données.**
        Après avoir modifié les permissions ici, un administrateur doit manuellement mettre à jour les politiques RLS correspondantes dans Supabase pour que les changements soient sécurisés et effectifs au niveau de la base de données.
        Pour plus d'informations sur les RLS, consultez la <resource-link href="https://supabase.com/docs/guides/auth/row-level-security">documentation Supabase sur les RLS</resource-link>.
      </p>

      <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-r-lg flex items-start space-x-3 glass">
        <Info className="w-5 h-5 text-blue-400 mt-1" />
        <div>
          <h3 className="text-blue-800 font-semibold">Comment modifier les permissions ?</h3>
          <p className="text-blue-700 text-sm">
            En tant qu'administrateur, vous pouvez cliquer sur les icônes <CheckCircle className="inline w-4 h-4 text-green-500" /> ou <XCircle className="inline w-4 h-4 text-red-500" /> dans le tableau ci-dessous pour basculer une permission.
            Les changements seront sauvegardés dans la base de données et appliqués immédiatement dans l'interface utilisateur.
            <br />
            <span className="font-semibold text-red-600">Rappel :</span> N'oubliez pas de synchroniser ces changements avec vos politiques RLS Supabase.
          </p>
        </div>
      </div>

      <div className="overflow-x-auto glass rounded-xl shadow-lg p-6">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-white/20">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-800 uppercase tracking-wider">Ressource</th>
              {roles.map(role => (
                <th key={role} colSpan={actions.length} className="px-4 py-3 text-center text-xs font-semibold text-gray-800 uppercase tracking-wider border-l border-gray-200">
                  {getRoleLabel(role)}
                </th>
              ))}
            </tr>
            <tr>
              <th className="px-4 py-2 bg-white/30"></th>
              {roles.map(role => (
                <React.Fragment key={`${role}-actions`}>
                  {actions.map(action => (
                    <th key={`${role}-${action}`} className="px-2 py-2 text-center text-xs font-medium text-gray-700 uppercase border-l border-gray-200">
                      {getActionLabel(action)}
                    </th>
                  ))}
                </React.Fragment>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white/10 divide-y divide-gray-200">
            {resources.map(resource => (
              <tr key={resource} className="hover:bg-white/20">
                <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {getResourceLabel(resource)}
                </td>
                {roles.map(role => (
                  <React.Fragment key={`${resource}-${role}`}>
                    {actions.map(action => {
                      const isAllowed = permissions.find(
                        p => p.role === role && p.resource === resource && p.action === action
                      )?.allowed || false;
                      const canEditThisPermission = currentUser?.role === 'admin'; // Only admins can edit permissions in the UI

                      return (
                        <td
                          key={`${resource}-${role}-${action}`}
                          className={`px-4 py-4 whitespace-nowrap text-center text-sm ${canEditThisPermission ? 'cursor-pointer hover:bg-white/30' : ''}`}
                          onClick={canEditThisPermission ? () => handleTogglePermission(role, resource, action, isAllowed) : undefined}
                        >
                          {isAllowed ? (
                            <CheckCircle className="w-5 h-5 text-green-500 mx-auto" />
                          ) : (
                            <XCircle className="w-5 h-5 text-red-500 mx-auto" />
                          )}
                        </td>
                      );
                    })}
                  </React.Fragment>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PermissionsOverview;