import React from 'react';
    import { Trash2, ChevronUp, ChevronDown, Search } from 'lucide-react';
    import { Button } from '../ui/button';
    // import { UserRole } from '../../types'; // Removed UserRole

    interface Profile {
      id: string;
      first_name: string | null;
      last_name: string | null;
      email: string;
      // role: UserRole; // Removed role
      updated_at: string;
    }

    interface UserManagementTableProps {
      users: Profile[]; // Now represents the current page's data
      searchTerm: string;
      setSearchTerm: (term: string) => void;
      // selectedRoleFilter: string; // This filter will no longer be functional
      // setSelectedRoleFilter: (role: string) => void; // This filter will no longer be functional
      sortColumn: keyof Profile;
      sortDirection: 'asc' | 'desc';
      handleSort: (column: keyof Profile) => void;
      currentPage: number;
      setCurrentPage: (page: number) => void; // Changed to accept number directly
      itemsPerPage: number;
      setItemsPerPage: (count: number) => void;
      totalPages: number;
      itemsPerPageOptions: number[];
      // onEditRole: (user: Profile) => void; // Removed
      onDeleteUser: (userId: string) => void;
      // canEditRole: boolean; // Removed
      canDeleteUser: boolean;
    }

    const UserManagementTable: React.FC<UserManagementTableProps> = ({
      users,
      searchTerm,
      setSearchTerm,
      // selectedRoleFilter, // This filter will no longer be functional
      // setSelectedRoleFilter, // This filter will no longer be functional
      sortColumn,
      sortDirection,
      handleSort,
      currentPage,
      setCurrentPage,
      itemsPerPage,
      setItemsPerPage,
      totalPages,
      itemsPerPageOptions,
      // onEditRole, // Removed
      onDeleteUser,
      // canEditRole, // Removed
      canDeleteUser,
    }) => {

      const renderSortIcon = (column: keyof Profile) => {
        if (sortColumn === column) {
          return sortDirection === 'asc' ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />;
        }
        return null;
      };

      // All authenticated users can edit user details (except role)
      const canEditUserDetail = true;

      return (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher par nom ou email..." // Removed 'rôle'
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                }}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all glass"
              />
            </div>

            {/* Role filter is removed */}
            {/* <div>
              <select
                value={selectedRoleFilter}
                onChange={(e) => {
                  setSelectedRoleFilter(e.target.value);
                }}
                className="w-full glass border border-gray-300 rounded-lg px-4 py-3 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Tous les rôles</option>
                <option value="admin">Admin</option>
                <option value="direction">Direction</option>
                <option value="utilisateur">Utilisateur</option>
              </select>
            </div> */}
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
                  {/* Role column is removed */}
                  {/* <th className="px-6 py-4 text-left text-xs font-semibold text-gray-800 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('role')}>
                    <div className="flex items-center">
                      Rôle {renderSortIcon('role')}
                    </div>
                  </th> */}
                  {(canEditUserDetail || canDeleteUser) && ( // Simplified condition
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-800 uppercase tracking-wider">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white/10 divide-y divide-gray-200">
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-4 text-center text-gray-600"> {/* Adjusted colspan */}
                      Aucun utilisateur trouvé.
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user.id} className="hover:bg-white/20 transition-colors">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {user.first_name} {user.last_name}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{user.email}</td>
                      {/* Role badge is removed */}
                      {/* <td className="px-6 py-4 text-sm">
                        <span className={`px-3 py-1 text-xs rounded-full font-medium ${
                          user.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                          user.role === 'direction' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {user.role}
                        </span>
                      </td> */}
                      {(canEditUserDetail || canDeleteUser) && ( // Simplified condition
                        <td className="px-6 py-4 text-sm">
                          <div className="flex space-x-2">
                            {/* Edit role button is removed, but a generic edit button could be added if there were other editable user details */}
                            {/* {canEditRole && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => onEditRole(user)}
                                className="text-blue-600 hover:text-blue-900 transition-colors hover-lift"
                              >
                                <Edit2 className="w-4 h-4" />
                              </Button>
                            )} */}
                            {canDeleteUser && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => onDeleteUser(user.id)}
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

          {totalPages > 1 && (
            <div className="flex justify-center items-center space-x-2 mt-4">
              <Button
                variant="outline"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
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
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 bg-white/20 rounded-lg hover:bg-white/30 disabled:opacity-50 disabled:cursor-not-allowed glass"
              >
                Suivant
              </Button>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1); // Reset to first page when items per page changes
                }}
                className="ml-4 bg-white/20 border border-gray-300 rounded-lg px-3 py-2 shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm glass"
              >
                {itemsPerPageOptions.map((option: number) => (
                  <option key={option} value={option}>{option} par page</option>
                ))}
              </select>
            </div>
          )}
        </>
      );
    };

    export default UserManagementTable;