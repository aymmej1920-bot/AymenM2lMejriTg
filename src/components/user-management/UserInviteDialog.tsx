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
import { inviteUserSchema } from '../../types/formSchemas';

type InviteUserFormData = z.infer<typeof inviteUserSchema>;

interface UserInviteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInvite: (formData: InviteUserFormData) => Promise<void>;
  isInviting: boolean;
}

const UserInviteDialog: React.FC<UserInviteDialogProps> = ({
  open,
  onOpenChange,
  onInvite,
  isInviting,
}) => {
  const methods = useForm<InviteUserFormData>({
    resolver: zodResolver(inviteUserSchema),
    defaultValues: {
      email: '',
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
          <DialogTitle>Inviter un Nouvel Utilisateur</DialogTitle>
          <DialogDescription>
            Entrez l'adresse e-mail de l'utilisateur à inviter. Un e-mail d'invitation lui sera envoyé.
          </DialogDescription>
        </DialogHeader>
        <FormProvider {...methods}>
          <form onSubmit={methods.handleSubmit(onInvite)} className="space-y-4 py-4">
            <FormField name="email" label="Adresse E-mail" type="email" placeholder="email@example.com" disabled={isInviting} />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
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
  );
};

export default UserInviteDialog;