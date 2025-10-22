import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../../integrations/supabase/client';
import { showSuccess, showError, showLoading, dismissToast } from '../../utils/toast';
import { usePermissions } from '../usePermissions';
import { useSession } from '../../components/SessionContextProvider';
import { UserRole } from '../../types';
import { z } from 'zod';
import { inviteUserSchema, manualUserSchema } from '../../types/formSchemas';

export interface Profile { // Exported Profile interface
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  role: UserRole;
  updated_at: string;
}

type InviteUserFormData = z.infer<typeof inviteUserSchema>;
type ManualUserFormData = z.infer<typeof manualUserSchema>;

export const useUserManagement = (onUpdateUserRole: (userId: string, newRole: UserRole) => Promise<void>) => {
  const { canAccess } = usePermissions();
  const { currentUser } = useSession();

  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dialog states
  const [showConfirmDeleteDialog, setShowConfirmDeleteDialog] = useState(false);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  const [showEditRoleDialog, setShowEditRoleDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<Profile | null>(null);
  const [newRole, setNewRole] = useState<UserRole>('utilisateur');
  const [showInviteUserDialog, setShowInviteUserDialog] = useState(false);
  const [isInviting, setIsInviting] = useState(false);
  const [showManualAddUserDialog, setShowManualAddUserDialog] = useState(false);
  const [isCreatingManualUser, setIsCreatingManualUser] = useState(false);

  // Table states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('');
  const [sortColumn, setSortColumn] = useState<keyof Profile>('first_name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const itemsPerPageOptions = [10, 25, 50];

  const fetchUsers = useCallback(async () => {
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
    } catch (err: unknown) {
      console.error('Error fetching users:', err instanceof Error ? err.message : String(err));
      setError('Erreur lors du chargement des utilisateurs: ' + (err instanceof Error ? err.message : String(err)));
      showError('Erreur lors du chargement des utilisateurs.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (canAccess('users', 'view')) {
      fetchUsers();
    } else {
      setError('Vous n\'avez pas les permissions pour accéder à cette page.');
      setLoading(false);
    }
  }, [canAccess, fetchUsers]);

  const filteredAndSortedUsers = useMemo(() => {
    let filtered = users.filter(user => {
      const lowerCaseSearchTerm = searchTerm.toLowerCase();
      const matchesSearch =
        (user.first_name || '').toLowerCase().includes(lowerCaseSearchTerm) ||
        (user.last_name || '').toLowerCase().includes(lowerCaseSearchTerm) ||
        user.email.toLowerCase().includes(lowerCaseSearchTerm) ||
        user.role.toLowerCase().includes(lowerCaseSearchTerm);

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

  const handleEditRole = useCallback((user: Profile) => {
    setEditingUser(user);
    setNewRole(user.role);
    setShowEditRoleDialog(true);
  }, []);

  const handleSaveRole = useCallback(async () => {
    if (editingUser) {
      await onUpdateUserRole(editingUser.id, newRole);
      showSuccess(`Rôle de ${editingUser.email} mis à jour en ${newRole}.`);
      setShowEditRoleDialog(false);
      setEditingUser(null);
      fetchUsers();
    }
  }, [editingUser, newRole, onUpdateUserRole, fetchUsers]);

  const confirmDeleteUser = useCallback((userId: string) => {
    setUserToDelete(userId);
    setShowConfirmDeleteDialog(true);
  }, []);

  const executeDeleteUser = useCallback(async () => {
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
    } catch (err: unknown) {
      console.error('Error deleting user:', err instanceof Error ? err.message : String(err));
      dismissToast(loadingToastId);
      showError(`Erreur lors de la suppression de l'utilisateur : ${err instanceof Error ? err.message : String(err)}`);
    }
  }, [userToDelete, fetchUsers]);

  const handleInviteUser = useCallback(async (formData: InviteUserFormData) => {
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
      setShowInviteUserDialog(false);
      fetchUsers();
    } catch (err: unknown) {
      console.error('Error inviting user:', err instanceof Error ? err.message : String(err));
      dismissToast(loadingToastId);
      showError(`Erreur lors de l'invitation : ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsInviting(false);
    }
  }, [fetchUsers]);

  const handleManualAddUser = useCallback(async (formData: ManualUserFormData) => {
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
      setShowManualAddUserDialog(false);
      fetchUsers();
    } catch (err: unknown) {
      console.error('Error creating user manually:', err instanceof Error ? err.message : String(err));
      dismissToast(loadingToastId);
      showError(`Erreur lors de la création de l'utilisateur : ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsCreatingManualUser(false);
    }
  }, [fetchUsers]);

  const handleSort = useCallback((column: keyof Profile) => {
    if (sortColumn === column) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  }, [sortColumn]);

  const canInvite = canAccess('users', 'add');
  const canCreateManualUser = canAccess('users', 'add');
  const canEditRole = canAccess('users', 'edit');
  const canDeleteUser = canAccess('users', 'delete');

  return {
    users,
    loading,
    error,
    currentUser,
    filteredAndSortedUsers,
    totalPages,
    currentUsers,
    itemsPerPageOptions,
    searchTerm,
    setSearchTerm,
    selectedRoleFilter,
    setSelectedRoleFilter,
    sortColumn,
    sortDirection,
    handleSort,
    currentPage,
    setCurrentPage,
    itemsPerPage,
    setItemsPerPage,
    // Dialog states and handlers
    showConfirmDeleteDialog,
    setShowConfirmDeleteDialog,
    userToDelete,
    executeDeleteUser,
    confirmDeleteUser,
    showEditRoleDialog,
    setShowEditRoleDialog,
    editingUser,
    handleEditRole,
    newRole,
    setNewRole,
    handleSaveRole,
    showInviteUserDialog,
    setShowInviteUserDialog,
    isInviting,
    handleInviteUser,
    showManualAddUserDialog,
    setShowManualAddUserDialog,
    isCreatingManualUser,
    handleManualAddUser,
    // Permissions
    canInvite,
    canCreateManualUser,
    canEditRole,
    canDeleteUser,
    fetchUsers, // Expose fetchUsers for re-fetching
  };
};