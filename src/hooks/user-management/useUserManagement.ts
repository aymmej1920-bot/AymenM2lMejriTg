import { useState, useEffect, useCallback } from 'react';
    import { supabase } from '../../integrations/supabase/client';
    import { showSuccess, showError, showLoading, dismissToast } from '../../utils/toast';
    // import { usePermissions } from '../usePermissions'; // Removed import
    import { useSession } from '../../components/SessionContextProvider';
    // import { UserRole } from '../../types'; // Removed UserRole
    import { z } from 'zod';
    import { inviteUserSchema, manualUserSchema } from '../../types/formSchemas';

    export interface Profile { // Exported Profile interface
      id: string;
      first_name: string | null;
      last_name: string | null;
      email: string;
      // role: UserRole; // Removed role
      updated_at: string;
    }

    type InviteUserFormData = z.infer<typeof inviteUserSchema>;
    type ManualUserFormData = z.infer<typeof manualUserSchema>;

    export const useUserManagement = () => { // Removed onUpdateUserRole prop
      // const { canAccess } = usePermissions(); // Removed usePermissions
      const { currentUser } = useSession();

      const [users, setUsers] = useState<Profile[]>([]);
      const [loading, setLoading] = useState(true);
      const [error, setError] = useState<string | null>(null);
      const [totalUsersCount, setTotalUsersCount] = useState<number>(0); // New state for total count

      // Dialog states
      const [showConfirmDeleteDialog, setShowConfirmDeleteDialog] = useState(false);
      const [userToDelete, setUserToDelete] = useState<string | null>(null);
      // const [showEditRoleDialog, setShowEditRoleDialog] = useState(false); // Removed
      // const [editingUser, setEditingUser] = useState<Profile | null>(null); // Removed
      // const [newRole, setNewRole] = useState<UserRole>('utilisateur'); // Removed
      const [showInviteUserDialog, setShowInviteUserDialog] = useState(false); // Kept for invite dialog
      const [isInviting, setIsInviting] = useState(false);
      const [showManualAddUserDialog, setShowManualAddUserDialog] = useState(false);
      const [isCreatingManualUser, setIsCreatingManualUser] = useState(false);

      // Table states
      const [searchTerm, setSearchTerm] = useState('');
      const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>(''); // This filter will no longer be functional
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

          // No permission check needed as access management is eliminated.

          // Construct query parameters for pagination and sorting
          const queryParams = new URLSearchParams();
          queryParams.append('page', currentPage.toString());
          queryParams.append('pageSize', itemsPerPage.toString());
          queryParams.append('sortByColumn', sortColumn);
          queryParams.append('sortByDirection', sortDirection);
          if (searchTerm) queryParams.append('searchTerm', searchTerm);
          // selectedRoleFilter is no longer used
          // if (selectedRoleFilter) queryParams.append('roleFilter', selectedRoleFilter);


          const response = await fetch(`https://iqaymjchscdvlofvuacn.supabase.co/functions/v1/manage-users?${queryParams.toString()}`, {
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

          setUsers(result.users as Profile[]);
          setTotalUsersCount(result.totalCount); // Set total count from API response
        } catch (err: unknown) {
          console.error('Error fetching users:', err instanceof Error ? err.message : String(err));
          setError('Erreur lors du chargement des utilisateurs: ' + (err instanceof Error ? err.message : String(err)));
          showError('Erreur lors du chargement des utilisateurs.');
        } finally {
          setLoading(false);
        }
      }, [currentPage, itemsPerPage, sortColumn, sortDirection, searchTerm, selectedRoleFilter]); // Add pagination/sorting/filter dependencies

      useEffect(() => {
        // All authenticated users can view users
        if (currentUser) {
          fetchUsers();
        } else {
          setError('Vous devez être connecté pour accéder à cette page.');
          setLoading(false);
        }
      }, [currentUser, fetchUsers]);

      // filteredAndSortedUsers is no longer needed as filtering/sorting/pagination is done on server
      // We will just use `users` directly from the state, which is already the paginated/sorted data.
      const filteredAndSortedUsers = users; // Renamed for clarity in components

      const totalPages = Math.ceil(totalUsersCount / itemsPerPage); // Use totalUsersCount for total pages
      const currentUsers = users; // The `users` state already holds the current page's data

      // handleEditRole and handleSaveRole are removed as roles are removed
      // const handleEditRole = useCallback((user: Profile) => { ... });
      // const handleSaveRole = useCallback(async () => { ... });

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
        } finally {
          setShowConfirmDeleteDialog(false); // Ensure dialog closes even on error
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
      }, [fetchUsers, setShowInviteUserDialog]);

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
      }, [fetchUsers, setShowManualAddUserDialog]);

      const handleSort = useCallback((column: keyof Profile) => {
        if (sortColumn === column) {
          setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
        } else {
          setSortColumn(column);
          setSortDirection('asc');
        }
        setCurrentPage(1); // Reset to first page on sort change
      }, [sortColumn]);

      // All authenticated users can perform these actions
      const canInvite = true;
      const canCreateManualUser = true;
      // const canEditRole = true; // Removed
      const canDeleteUser = true;

      return {
        users,
        loading,
        error,
        currentUser,
        filteredAndSortedUsers, // This is now just `users`
        totalPages,
        currentUsers, // This is now just `users`
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
        // showEditRoleDialog, // Removed
        // setShowEditRoleDialog, // Removed
        // editingUser, // Removed
        // handleEditRole, // Removed
        // newRole, // Removed
        // setNewRole, // Removed
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
        // canEditRole, // Removed
        canDeleteUser,
        fetchUsers, // Expose fetchUsers for re-fetching
      };
    };