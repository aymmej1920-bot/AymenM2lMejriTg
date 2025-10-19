import React, { useState, useEffect, useCallback, createContext, useContext, ReactNode } from 'react';
import { supabase } from '../integrations/supabase/client';
import { useSession } from '../components/SessionContextProvider';
import { UserRole, Resource, Action, Permission } from '../types';
import { showError, showSuccess } from '../utils/toast';

interface PermissionsContextType {
  permissions: Permission[];
  canAccess: (resource: Resource, action: Action) => boolean;
  updatePermission: (role: UserRole, resource: Resource, action: Action, allowed: boolean) => Promise<void>;
  isLoadingPermissions: boolean;
}

const PermissionsContext = createContext<PermissionsContextType | undefined>(undefined);

export const PermissionsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { currentUser, isLoading: isLoadingSession } = useSession();
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [isLoadingPermissions, setIsLoadingPermissions] = useState(true);

  const fetchPermissions = useCallback(async () => {
    setIsLoadingPermissions(true);
    try {
      const { data, error } = await supabase
        .from('permissions')
        .select('*');

      if (error) throw error;
      setPermissions(data as Permission[]);
    } catch (error: any) {
      console.error('Error fetching permissions:', error.message);
      showError('Erreur lors du chargement des permissions.');
    } finally {
      setIsLoadingPermissions(false);
    }
  }, []);

  useEffect(() => {
    if (!isLoadingSession && currentUser) {
      fetchPermissions();
    } else if (!isLoadingSession && !currentUser) {
      // If no user, clear permissions and stop loading
      setPermissions([]);
      setIsLoadingPermissions(false);
    }
  }, [isLoadingSession, currentUser, fetchPermissions]);

  const canAccess = useCallback((resource: Resource, action: Action): boolean => {
    if (!currentUser) return false; // No user, no access

    // Admins always have full access to everything, including permissions management
    if (currentUser.role === 'admin') {
      return true;
    }

    const permission = permissions.find(
      p => p.role === currentUser.role && p.resource === resource && p.action === action
    );
    return permission?.allowed || false;
  }, [currentUser, permissions]);

  const updatePermission = useCallback(async (role: UserRole, resource: Resource, action: Action, allowed: boolean) => {
    if (!currentUser || currentUser.role !== 'admin') {
      showError('Seuls les administrateurs peuvent modifier les permissions.');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('permissions')
        .upsert({ role, resource, action, allowed, updated_at: new Date().toISOString() }, { onConflict: 'role,resource,action' })
        .select();

      if (error) throw error;

      setPermissions(prev => {
        const existingIndex = prev.findIndex(p => p.role === role && p.resource === resource && p.action === action);
        if (existingIndex > -1) {
          const newPermissions = [...prev];
          newPermissions[existingIndex] = data[0] as Permission;
          return newPermissions;
        } else {
          return [...prev, data[0] as Permission];
        }
      });
      showSuccess('Permission mise à jour avec succès !');
    } catch (error: any) {
      console.error('Error updating permission:', error.message);
      showError('Erreur lors de la mise à jour de la permission.');
    }
  }, [currentUser]);

  return (
    <PermissionsContext.Provider value={{ permissions, canAccess, updatePermission, isLoadingPermissions }}>
      {children}
    </PermissionsContext.Provider>
  );
};

export const usePermissions = () => {
  const context = useContext(PermissionsContext);
  if (context === undefined) {
    throw new Error('usePermissions must be used within a PermissionsProvider');
  }
  return context;
};