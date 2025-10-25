import React from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from '../ui/dialog';
import { Button } from '../ui/button';
import FormField from '../forms/FormField';
import { manualUserSchema } from '../../types/formSchemas';
import { Loader2 } from 'lucide-react'; // Import Loader2

type ManualUserFormData = z.infer<typeof manualUserSchema>;

interface UserManualAddDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (formData: ManualUserFormData) => Promise<void>;
  isCreating: boolean;
}

const UserManualAddDialog: React.FC<UserManualAddDialogProps> = ({
  open,
  onOpenChange,
  onAdd,
  isCreating,
}) => {
  const methods = useForm<ManualUserFormData>({
    resolver: zodResolver(manualUserSchema),
    defaultValues: {
      email: '',
      password: '',
      first_name: '',
      last_name: '',
      role: 'utilisateur',
    },
  });

  const handleClose = () => {
    onOpenChange(false);
    methods.reset();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] glass animate-scale-in">
        <DialogHeader>
          <DialogTitle>Ajouter un Utilisateur Manuellement</DialogTitle>
          <DialogDescription>
            Créez un nouvel utilisateur avec un e-mail, un mot de passe et un rôle.
          </DialogDescription>
        </DialogHeader>
        <FormProvider {...methods}>
          <form onSubmit={methods.handleSubmit(onAdd)} className="space-y-4 py-4">
            <FormField name="email" label="Adresse E-mail" type="email" placeholder="email@example.com" disabled={isCreating} />
            <FormField name="password" label="Mot de passe" type="password" placeholder="Mot de passe (min. 6 caractères)" disabled={isCreating} />
            <FormField name="first_name" label="Prénom" type="text" placeholder="Prénom de l'utilisateur" disabled={isCreating} />
            <FormField name="last_name" label="Nom" type="text" placeholder="Nom de l'utilisateur" disabled={isCreating} />
            <FormField
              name="role"
              label="Rôle"
              type="select"
              options={[
                { value: 'utilisateur', label: 'Utilisateur' },
                { value: 'direction', label: 'Direction' },
                { value: 'admin', label: 'Admin' },
              ]}
              disabled={isCreating}
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isCreating}
                className="hover-lift"
              >
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={isCreating}
                className="hover-lift"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Création en cours...
                  </>
                ) : (
                  'Créer Utilisateur'
                )}
              </Button>
            </DialogFooter>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
};

export default UserManualAddDialog;