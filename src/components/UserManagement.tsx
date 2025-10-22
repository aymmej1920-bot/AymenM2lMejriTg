import React, { useState, useMemo, useEffect } from 'react';
import { Edit2, Trash2, ChevronUp, ChevronDown, Search, Download, UserPlus, UserCheck } from 'lucide-react';
import { showSuccess, showError, showLoading, dismissToast } from '../utils/toast';
import ConfirmDialog from './ConfirmDialog';
import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from './ui/dialog';
import { supabase } from '../integrations/supabase/client';
import { exportToXLSX } from '../utils/export';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { inviteUserSchema, manualUserSchema } from '../types/formSchemas'; // Import manualUserSchema
import { z } from 'zod';
import FormField from './forms/FormField';
import { usePermissions } from '../hooks/usePermissions';
import { UserRole, Resource } from '../types';
import { useSession } from './SessionContextProvider'; // Import useSession


interface UserManagementProps {
  onUpdateUserRole: (userId: string, newRole: UserRole) => Promise<void>;
  // registerRefetch: (resource: Resource, refetch: () => Promise<void>) => void; // Removed
}

interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  role: UserRole;
  updated_at: string;
}

type InviteUserFormData = z.infer<typeof inviteUserSchema>;
type ManualUserFormData = z.infer<typeof manualUserSchema>; // New type for manual user form

const UserManagement: React.FC<UserManagementProps> = ({ onUpdateUserRole }) => { // Removed registerRefetch from props
  const { canAccess } = usePermissions();
  const { currentUser } = useSession(); // Get current user for permission checks
  void currentUser; // Explicitly mark as used

  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  const [showEditRoleModal, setShowEditRoleModal] = useState(false);
  const [editingUser, setEditingUser] = useState<Profile | null>(null);
  const [newRole, setNewRole] = useState<UserRole>('utilisateur');
  const [showInviteUserModal, setShowInviteUserModal] = useState(false);
  const [isInviting, setIsInviting] = useState(false);

  // New states for manual user creation
  const [showManualAddUserModal, setShowManualAddUserModal] = useState(false);
  const [isCreatingManualUser, setIsCreatingManualUser] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('');
  const [sortColumn, setSortColumn] = useState<keyof Profile>('first_name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const itemsPerPageOptions = [10, 25, 50];

  const inviteMethods = useForm<InviteUserFormData>({
    resolver: zodResolver(inviteUserSchema),
    defaultValues: {
      email: '',
    },
  });

  const manualUserMethods = useForm<ManualUserFormData>({ // New form methods for manual user
    resolver: zodResolver(manualUserSchema),
    defaultValues: {
      email: '',
      password: '',
      first_name: '',
      last_name: '',
      role: 'utilisateur',
    },
  });

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      if (!token) {
        throw new Error('No session token found. Please log in.');
      }

      const response = await fetch('https://iqaymjchscdvlofvuacn.supabase.co/functions/v1/manage-users', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch users.');
      }

      setUsers(result as Profile[]);
    } catch (err: any) {
      console.error('Error fetching users:', err.message);
      setError('Erreur lors du chargement des utilisateurs: ' + err.message);
      showError('Erreur lors du chargement des utilisateurs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (canAccess('users', 'view')) {
      fetchUsers();
      // registerRefetch('users', fetchUsers); // Removed
    } else {
      setError('Vous n\'avez pas les permissions pour accéder à cette page.');
      setLoading(false);
    }
  }, [canAccess]); // Removed registerRefetch from dependencies

  const filteredAndSortedUsers = useMemo(() => {
    let filtered = users.filter(user => {
      const matchesSearch =
        (user.first_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (user.last_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.role.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesRole = selectedRoleFilter ? user.role === selectedRoleFilter : true;

      return matchesSearch && matchesRole;
    });

    filtered.sort((a, b) => {
      const aValue = a[sortColumn];
      const bValue = b[sortColumn];

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
      }
      return 0;
    });
    return filtered;
  }, [users, searchTerm, selectedRoleFilter, sortColumn, sortDirection]);

  const totalPages = Math.ceil(filteredAndSortedUsers.length / itemsPerPage);
  const currentUsers = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredAndSortedUsers.slice(startIndex, endIndex);
  }, [filteredAndSortedUsers, currentPage, itemsPerPage]);

  const handleEditRole = (user: Profile) => {
    setEditingUser(user);
    setNewRole(user.role);
    setShowEditRoleModal(true);
  };

  const handleSaveRole = async () => {
    if (editingUser) {
      await onUpdateUserRole(editingUser.id, newRole);
      showSuccess(`Rôle de ${editingUser.email} mis à jour en ${newRole}.`);
      setShowEditRoleModal(false);
      setEditingUser(null);
      fetchUsers(); // Re-fetch users to update the list
    }
  };

  const confirmDeleteUser = (userId: string) => {
    setUserToDelete(userId);
    setShowConfirmDialog(true);
  };

  const executeDeleteUser = async () => {
    if (!userToDelete) return;

    const loadingToastId = showLoading(`Suppression de l'utilisateur ${userToDelete}...`);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      if (!token) {
        throw new Error('No session token found. Please log in.');
      }

      const response = await fetch('https://iqaymjchscdvlofvuacn.supabase.co/functions/v1/manage-users', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ userId: userToDelete }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete user.');
      }

      dismissToast(loadingToastId);
      showSuccess('Utilisateur supprimé avec succès !');
      setUserToDelete(null);
      fetchUsers();
    } catch (error: any) {
      console.error('Error deleting user:', error.message);
      dismissToast(loadingToastId);
      showError(`Erreur lors de la suppression de l'utilisateur : ${error.message}`);
    }
  };

  const handleSort = (column: keyof Profile) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const renderSortIcon = (column: keyof Profile) => {
    if (sortColumn === column) {
      return sortDirection === 'asc' ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />;
    }
    return null;
  };

  const handleExportUsers = () => {
    const dataToExport = filteredAndSortedUsers.map(user => ({
      Nom: `${user.first_name || ''} ${user.last_name || ''}`.trim(),
      Email: user.email,
      Rôle: user.role,
      "Date Dernière Mise à Jour": new Date(user.updated_at).toLocaleDateString(),
    }));

    const headers = ["Nom", "Email", "Rôle", "Date Dernière Mise à Jour"];

    exportToXLSX(dataToExport, { fileName: 'utilisateurs', headers });
    showSuccess('Liste des utilisateurs exportée avec succès au format XLSX !');
  };

  const handleInviteUser = async (formData: InviteUserFormData) => {
    setIsInviting(true);
    const loadingToastId = showLoading(`Envoi de l'invitation à ${formData.email}...`);
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) throw new Error('No session token found.');

      const response = await fetch('https://iqaymjchscdvlofvuacn.supabase.co/functions/v1/invite-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ email: formData.email }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to send invitation.');
      }

      dismissToast(loadingToastId);
      showSuccess(`Invitation envoyée à ${formData.email} avec succès !`);
      setShowInviteUserModal(false);
      inviteMethods.reset();
      fetchUsers();
    } catch (error: any) {
      console.error('Error inviting user:', error.message);
      dismissToast(loadingToastId);
      showError(`Erreur lors de l'invitation : ${error.message}`);
    } finally {
      setIsInviting(false);
    }
  };

  const handleManualAddUser = async (formData: ManualUserFormData) => {
    setIsCreatingManualUser(true);
    const loadingToastId = showLoading(`Création de l'utilisateur ${formData.email}...`);
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) throw new Error('No session token found.');

      const response = await fetch('https://iqaymjchscdvlofvuacn.supabase.co/functions/v1/create-user-manual', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create user manually.');
      }

      dismissToast(loadingToastId);
      showSuccess(`Utilisateur ${formData.email} créé avec succès !`);
      setShowManualAddUserModal(false);
      manualUserMethods.reset();
      fetchUsers(); // Re-fetch users to update the list
    } catch (error: any) {
      console.error('Error creating user manually:', error.message);
      dismissToast(loadingToastId);
      showError(`Erreur lors de la création de l'utilisateur : ${error.message}`);
    } finally {
      setIsCreatingManualUser(false);
    }
  };

  const canInvite = canAccess('users', 'add');
  const canCreateManualUser = canAccess('users', 'add'); // Same permission for now
  const canEditRole = canAccess('users', 'edit');
  const canDeleteUser = canAccess('users', 'delete');

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-gray-600">Chargement des utilisateurs...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-r-lg glass">
        <p className="text-red-700">{error}</p>
      </div>
    );
  }

  if (!canAccess('users', 'view')) {
    return (
      <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-r-lg glass">
        <p className="text-red-700">Accès refusé. Vous n'avez pas les permissions pour accéder à cette page.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <h2 className="text-4xl font-bold text-gray-800">Gestion des Utilisateurs</h2>
        <div className="flex space-x-4">
          <Button
            onClick={handleExportUsers}
            className="bg-gradient-success text-white px-6 py-3 rounded-lg flex items-center space-x-2 transition-all duration-300 hover-lift"
          >
            <Download className="w-5 h-5" />
            <span>Exporter XLSX</span>
          </Button>
          {canCreateManualUser && (
            <Button
              onClick={() => setShowManualAddUserModal(true)}
              className="bg-gradient-brand text-white px-6 py-3 rounded-lg flex items-center space-x-2 transition-all duration-300 hover-lift"
            >
              <UserCheck className="w-5 h-5" />
              <span>Ajouter Utilisateur Manuellement</span>
            </Button>
          )}
          {canInvite && (
            <Button
              onClick={() => setShowInviteUserModal(true)}
              className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg flex items-center space-x-2 transition-all duration-300 hover-lift"
            >
              <UserPlus className="w-5 h-5" />
              <span>Inviter Utilisateur</span>
            </Button>
          )}
        </div>
      </div>

      {/* Search and Filter Inputs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher par nom, email ou rôle..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all glass"
          />
        </div>

        <div>
          <select
            value={selectedRoleFilter}
            onChange={(e) => {
              setSelectedRoleFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full glass border border-gray-300 rounded-lg px-4 py-3 shadow-sm focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Tous les rôles</option>
            <option value="admin">Admin</option>
            <option value="direction">Direction</option>
            <option value="utilisateur">Utilisateur</option>
          </select>
        </div>
      </div>

      <div className="glass rounded-xl shadow-lg overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-white/20">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-800 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('first_name')}>
                <div className="flex items-center">
                  Nom {renderSortIcon('first_name')}
                </div>
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-800 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('email')}>
                <div className="flex items-center">
                  Email {renderSortIcon('email')}
                </div>
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-800 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('role')}>
                <div className="flex items-center">
                  Rôle {renderSortIcon('role')}
                </div>
              </th>
              {(canEditRole || canDeleteUser) && (
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-800 uppercase tracking-wider">Actions</th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white/10 divide-y divide-gray-200">
            {currentUsers.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-4 text-center text-gray-600">
                  Aucun utilisateur trouvé.
                </td>
              </tr>
            ) : (
              currentUsers.map((user) => (
                <tr key={user.id} className="hover:bg-white/20 transition-colors">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    {user.first_name} {user.last_name}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{user.email}</td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`px-3 py-1 text-xs rounded-full font-medium ${
                      user.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                      user.role === 'direction' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  {(canEditRole || canDeleteUser) && (
                    <td className="px-6 py-4 text-sm">
                      <div className="flex space-x-2">
                        {canEditRole && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditRole(user)}
                            className="text-blue-600 hover:text-blue-900 transition-colors hover-lift"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                        )}
                        {canDeleteUser && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => confirmDeleteUser(user.id)}
                            className="text-red-600 hover:text-red-900 transition-colors hover-lift"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center space-x-2 mt-4">
          <Button
            variant="outline"
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 bg-white/20 rounded-lg hover:bg-white/30 disabled:opacity-50 disabled:cursor-not-allowed glass"
          >
            Précédent
          </Button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
            <Button
              key={page}
              variant={currentPage === page ? 'default' : 'outline'}
              onClick={() => setCurrentPage(page)}
              className={`px-4 py-2 rounded-lg ${
                currentPage === page ? 'bg-gradient-brand text-white shadow-md' : 'bg-white/20 hover:bg-white/30 text-gray-800 glass'
              }`}
            >
              {page}
            </Button>
          ))}
          <Button
            variant="outline"
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
            className="px-4 py-2 bg-white/20 rounded-lg hover:bg-white/30 disabled:opacity-50 disabled:cursor-not-allowed glass"
          >
            Suivant
          </Button>
          <select
            value={itemsPerPage}
            onChange={(e) => {
              setItemsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="ml-4 bg-white/20 border border-gray-300 rounded-lg px-3 py-2 shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm glass"
          >
            {itemsPerPageOptions.map((option: number) => (
              <option key={option} value={option}>{option} par page</option>
            ))}
          </select>
        </div>
      )}

      {/* Edit Role Modal */}
      <Dialog open={showEditRoleModal} onOpenChange={setShowEditRoleModal}>
        <DialogContent className="sm:max-w-[425px] glass animate-scale-in">
          <DialogHeader>
            <DialogTitle>Modifier le Rôle de {editingUser?.email}</DialogTitle>
            <DialogDescription>
              Sélectionnez le nouveau rôle pour cet utilisateur.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label htmlFor="role" className="block text-sm font-semibold mb-2 text-gray-900">Nouveau Rôle</label>
              <select
                id="role"
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as UserRole)}
                className="w-full glass border border-gray-300 rounded-lg px-4 py-3 shadow-sm focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="utilisateur">Utilisateur</option>
                <option value="direction">Direction</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowEditRoleModal(false)}
              className="hover-lift"
            >
              Annuler
            </Button>
            <Button
              type="submit"
              onClick={handleSaveRole}
              className="hover-lift"
            >
              Sauvegarder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invite User Modal */}
      <Dialog open={showInviteUserModal} onOpenChange={setShowInviteUserModal}>
        <DialogContent className="sm:max-w-[425px] glass animate-scale-in">
          <DialogHeader>
            <DialogTitle>Inviter un Nouvel Utilisateur</DialogTitle>
            <DialogDescription>
              Entrez l'adresse e-mail de l'utilisateur à inviter. Un e-mail d'invitation lui sera envoyé.
            </DialogDescription>
          </DialogHeader>
          <FormProvider {...inviteMethods}>
            <form onSubmit={inviteMethods.handleSubmit(handleInviteUser)} className="space-y-4 py-4">
              <FormField name="email" label="Adresse E-mail" type="email" placeholder="email@example.com" disabled={isInviting} />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowInviteUserModal(false);
                    inviteMethods.reset();
                  }}
                  disabled={isInviting}
                  className="hover-lift"
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  disabled={isInviting}
                  className="hover-lift"
                >
                  {isInviting ? 'Envoi en cours...' : 'Envoyer l\'invitation'}
                </Button>
              </DialogFooter>
            </form>
          </FormProvider>
        </DialogContent>
      </Dialog>

      {/* Manual Add User Modal */}
      <Dialog open={showManualAddUserModal} onOpenChange={setShowManualAddUserModal}>
        <DialogContent className="sm:max-w-[425px] glass animate-scale-in">
          <DialogHeader>
            <DialogTitle>Ajouter un Utilisateur Manuellement</DialogTitle>
            <DialogDescription>
              Créez un nouvel utilisateur avec un e-mail, un mot de passe et un rôle.
            </DialogDescription>
          </DialogHeader>
          <FormProvider {...manualUserMethods}>
            <form onSubmit={manualUserMethods.handleSubmit(handleManualAddUser)} className="space-y-4 py-4">
              <FormField name="email" label="Adresse E-mail" type="email" placeholder="email@example.com" disabled={isCreatingManualUser} />
              <FormField name="password" label="Mot de passe" type="password" placeholder="Mot de passe (min. 6 caractères)" disabled={isCreatingManualUser} />
              <FormField name="first_name" label="Prénom" type="text" placeholder="Prénom de l'utilisateur" disabled={isCreatingManualUser} />
              <FormField name="last_name" label="Nom" type="text" placeholder="Nom de l'utilisateur" disabled={isCreatingManualUser} />
              <FormField
                name="role"
                label="Rôle"
                type="select"
                options={[
                  { value: 'utilisateur', label: 'Utilisateur' },
                  { value: 'direction', label: 'Direction' },
                  { value: 'admin', label: 'Admin' },
                ]}
                disabled={isCreatingManualUser}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowManualAddUserModal(false);
                    manualUserMethods.reset();
                  }}
                  disabled={isCreatingManualUser}
                  className="hover-lift"
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  disabled={isCreatingManualUser}
                  className="hover-lift"
                >
                  {isCreatingManualUser ? 'Création en cours...' : 'Créer Utilisateur'}
                </Button>
              </DialogFooter>
            </form>
          </FormProvider>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={showConfirmDialog}
        onOpenChange={setShowConfirmDialog}
        title="Confirmer la suppression de l'utilisateur"
        description="Êtes-vous sûr de vouloir supprimer cet utilisateur ? Cette action est irréversible et supprimera également toutes les données associées à cet utilisateur."
        onConfirm={executeDeleteUser}
        confirmText="Supprimer"
        variant="destructive"
      />
    </div>
  );
};

export default UserManagement;