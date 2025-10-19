import React from 'react';
import { PERMISSION_MAP, UserRole, Resource, Action } from '../utils/permissions';
import { CheckCircle, XCircle, Info } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card'; // Assuming shadcn/ui Card components

const PermissionsOverview: React.FC = () => {
  const roles: UserRole[] = ['admin', 'direction', 'utilisateur'];
  const resources: Resource[] = [
    'vehicles', 'drivers', 'tours', 'fuel_entries', 'documents',
    'maintenance_entries', 'pre_departure_checklists', 'users', 'profile'
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

  return (
    <div className="space-y-8">
      <h2 className="text-4xl font-bold text-gray-800">Gestion des Accès (Frontend)</h2>
      <p className="text-gray-600">
        Cet aperçu montre les permissions définies pour chaque rôle dans l'interface utilisateur.
        Ces règles contrôlent la visibilité des boutons et des champs de formulaire.
        <br />
        <span className="font-semibold text-red-600">Important :</span> La sécurité réelle des données est gérée par les politiques RLS (Row Level Security) dans Supabase.
        Assurez-vous que les politiques RLS de votre base de données correspondent à ces permissions.
      </p>

      <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-r-lg flex items-start space-x-3">
        <Info className="w-5 h-5 text-blue-400 mt-1" />
        <div>
          <h3 className="text-blue-800 font-semibold">Comment modifier les permissions ?</h3>
          <p className="text-blue-700 text-sm">
            Pour modifier ces permissions, éditez directement le fichier <code className="font-mono bg-blue-100 px-1 py-0.5 rounded">src/utils/permissions.ts</code>.
            Après avoir modifié le fichier, n'oubliez pas de mettre à jour les politiques RLS correspondantes dans votre base de données Supabase pour que les changements soient effectifs et sécurisés.
          </p>
        </div>
      </div>

      <div className="overflow-x-auto bg-white rounded-xl shadow-lg p-6">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Ressource</th>
              {roles.map(role => (
                <th key={role} colSpan={actions.length} className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider border-l border-gray-200">
                  {getRoleLabel(role)}
                </th>
              ))}
            </tr>
            <tr>
              <th className="px-4 py-2 bg-gray-100"></th>
              {roles.map(role => (
                <React.Fragment key={`${role}-actions`}>
                  {actions.map(action => (
                    <th key={`${role}-${action}`} className="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase border-l border-gray-200">
                      {getActionLabel(action)}
                    </th>
                  ))}
                </React.Fragment>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {resources.map(resource => (
              <tr key={resource} className="hover:bg-gray-50">
                <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {getResourceLabel(resource)}
                </td>
                {roles.map(role => (
                  <React.Fragment key={`${resource}-${role}`}>
                    {actions.map(action => (
                      <td key={`${resource}-${role}-${action}`} className="px-4 py-4 whitespace-nowrap text-center text-sm">
                        {PERMISSION_MAP[role]?.[resource]?.[action] ? (
                          <CheckCircle className="w-5 h-5 text-green-500 mx-auto" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-500 mx-auto" />
                        )}
                      </td>
                    ))}
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