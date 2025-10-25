import React from 'react';
import { Download, UserPlus, UserCheck } from 'lucide-react';
import ConfirmDialog from './ConfirmDialog';
import { Button } from './ui/button';
import { UserRole } from '../types';
import { useUserManagement, Profile } from '../hooks/user-management/useUserManagement'; // Import Profile interface
import UserManagementTable from './user-management/UserManagementTable';
import UserRoleEditDialog from './user-management/UserRoleEditDialog';
import UserInviteDialog from './user-management/UserInviteDialog';
import UserManualAddDialog from './user-management/UserManualAddDialog';
import SkeletonLoader from './SkeletonLoader';
import { exportToXLSX } from '../utils/export'; // Import exportToXLSX
import { showSuccess } from '../utils/toast'; // Import showSuccess

interface UserManagementProps {
  onUpdateUserRole: (userId: string, newRole: UserRole) => Promise<void>;
}

const UserManagement: React.FC<UserManagementProps> = ({ onUpdateUserRole }) => {
  const {
    loading,
    error,
    // filteredAndSortedUsers, // Removed unused variable
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
    canInvite,
    canCreateManualUser,
    canEditRole,
    canDeleteUser,
    fetchUsers, // Expose fetchUsers for re-fetching
    users, // Full list of users needed for ConfirmDialog description
  } = useUserManagement(onUpdateUserRole);

  // Mark fetchUsers as void to explicitly ignore its unused status if not directly called here
  void fetchUsers;

  // Function to handle export from the table component
  const handleExportUsers = (usersToExport: Profile[]) => { // Type usersToExport
    const dataToExport = usersToExport.map(user => ({
      Nom: `${user.first_name || ''} ${user.last_name || ''}`.trim(),
      Email: user.email,
      Rôle: user.role,
      "Date Dernière Mise à Jour": new Date(user.updated_at).toLocaleDateString(),
    }));

    const headers = ["Nom", "Email", "Rôle", "Date Dernière Mise à Jour"];

    exportToXLSX(dataToExport, { fileName: 'utilisateurs', headers });
    showSuccess('Liste des utilisateurs exportée avec succès au format XLSX !');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <SkeletonLoader count={1} height="h-16" className="w-1/2" />
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

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <h2 className="text-4xl font-bold text-gray-800">Gestion des Utilisateurs</h2>
        <div className="flex space-x-4">
          <Button
            onClick={() => handleExportUsers(users)} // Pass the full list of users for export
            className="bg-gradient-success text-white px-6 py-3 rounded-lg flex items-center space-x-2 transition-all duration-300 hover-lift"
          >
            <Download className="w-5 h-5" />
            <span>Exporter XLSX</span>
          </Button>
          {canCreateManualUser && (
            <Button
              onClick={() => setShowManualAddUserDialog(true)}
              className="bg-gradient-brand text-white px-6 py-3 rounded-lg flex items-center space-x-2 transition-all duration-300 hover-lift"
            >
              <UserCheck className="w-5 h-5" />
              <span>Ajouter Utilisateur Manuellement</span>
            </Button>
          )}
          {canInvite && (
            <Button
              onClick={() => setShowInviteUserDialog(true)}
              className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg flex items-center space-x-2 transition-all duration-300 hover-lift"
            >
              <UserPlus className="w-5 h-5" />
              <span>Inviter Utilisateur</span>
            </Button>
          )}
        </div>
      </div>

      <UserManagementTable
        users={currentUsers} // Pass current page users
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        selectedRoleFilter={selectedRoleFilter}
        setSelectedRoleFilter={setSelectedRoleFilter}
        sortColumn={sortColumn}
        sortDirection={sortDirection}
        handleSort={handleSort}
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        itemsPerPage={itemsPerPage}
        setItemsPerPage={setItemsPerPage}
        totalPages={totalPages}
        itemsPerPageOptions={itemsPerPageOptions}
        onEditRole={handleEditRole}
        onDeleteUser={confirmDeleteUser}
        canEditRole={canEditRole}
        canDeleteUser={canDeleteUser}
      />

      <UserRoleEditDialog
        open={showEditRoleDialog}
        onOpenChange={setShowEditRoleDialog}
        user={editingUser}
        currentRole={newRole}
        onRoleChange={setNewRole}
        onSave={handleSaveRole}
      />

      <UserInviteDialog
        open={showInviteUserDialog}
        onOpenChange={setShowInviteUserDialog}
        onInvite={handleInviteUser}
        isInviting={isInviting}
      />

      <UserManualAddDialog
        open={showManualAddUserDialog}
        onOpenChange={setShowManualAddUserDialog}
        onAdd={handleManualAddUser}
        isCreating={isCreatingManualUser}
      />

      <ConfirmDialog
        open={showConfirmDeleteDialog}
        onOpenChange={setShowConfirmDeleteDialog}
        title="Confirmer la suppression de l'utilisateur"
        description={`Êtes-vous sûr de vouloir supprimer l'utilisateur ${userToDelete ? users.find((u: Profile) => u.id === userToDelete)?.email || 'cet utilisateur' : 'cet utilisateur'} ? Cette action est irréversible et supprimera également toutes les données associées à cet utilisateur.`}
        onConfirm={executeDeleteUser}
        confirmText="Supprimer"
        variant="destructive"
      />
    </div>
  );
};

export default UserManagement;