import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { UserRole } from '../../types';

interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  role: UserRole;
  updated_at: string;
}

interface UserRoleEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: Profile | null;
  currentRole: UserRole;
  onRoleChange: (role: UserRole) => void;
  onSave: () => void;
}

const UserRoleEditDialog: React.FC<UserRoleEditDialogProps> = ({
  open,
  onOpenChange,
  user,
  currentRole,
  onRoleChange,
  onSave,
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] glass animate-scale-in">
        <DialogHeader>
          <DialogTitle>Modifier le Rôle de {user?.email}</DialogTitle>
          <DialogDescription>
            Sélectionnez le nouveau rôle pour cet utilisateur.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <label htmlFor="role" className="block text-sm font-semibold mb-2 text-gray-900">Nouveau Rôle</label>
            <select
              id="role"
              value={currentRole}
              onChange={(e) => onRoleChange(e.target.value as UserRole)}
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
            onClick={() => onOpenChange(false)}
            className="hover-lift"
          >
            Annuler
          </Button>
          <Button
            type="submit"
            onClick={onSave}
            className="hover-lift"
          >
            Sauvegarder
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default UserRoleEditDialog;