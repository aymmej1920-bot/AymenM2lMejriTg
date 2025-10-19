import React, { useState, useEffect, useCallback } from 'react';
import { useSession } from '../components/SessionContextProvider';
import { supabase } from '../integrations/supabase/client';
import { showSuccess, showError, showLoading, dismissToast } from '../utils/toast';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { profileSchema } from '../types/formSchemas';
import { z } from 'zod';
import FormField from '../components/forms/FormField';
import { Button } from '../components/ui/button';
import { User, Camera } from 'lucide-react';
import SkeletonLoader from '../components/SkeletonLoader';
import { usePermissions } from '../hooks/usePermissions'; // Import usePermissions

type ProfileFormData = z.infer<typeof profileSchema>;

const Profile: React.FC = () => {
  const { currentUser, user, isProfileLoading, refetchCurrentUser } = useSession();
  const { canAccess } = usePermissions(); // Use usePermissions hook
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const methods = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      first_name: currentUser?.name.split(' ')[0] || '',
      last_name: currentUser?.name.split(' ').slice(1).join(' ') || '',
      avatar_url: currentUser?.avatar_url || null,
    },
  });

  const { handleSubmit, reset } = methods;

  // Update form defaults when currentUser changes
  useEffect(() => {
    if (currentUser) {
      const firstNameFromProfile = currentUser.name.split(' ')[0];
      const lastNameFromProfile = currentUser.name.split(' ').slice(1).join(' ');

      reset({
        first_name: firstNameFromProfile,
        last_name: lastNameFromProfile,
        avatar_url: currentUser.avatar_url || null,
      });
      setAvatarPreview(currentUser.avatar_url || null);
    }
  }, [currentUser, reset]);

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const uploadAvatar = useCallback(async (file: File, userId: string): Promise<string | null> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}-${Math.random()}.${fileExt}`;
    const filePath = `${fileName}`;

    const loadingToastId = showLoading('Téléchargement de l\'avatar...');
    try {
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
      dismissToast(loadingToastId);
      showSuccess('Avatar téléchargé avec succès !');
      return data.publicUrl;
    } catch (error: any) {
      dismissToast(loadingToastId);
      showError(`Erreur lors du téléchargement de l'avatar: ${error.message}`);
      return null;
    }
  }, []);

  const onSubmit = async (formData: ProfileFormData) => {
    if (!user) {
      showError('Utilisateur non authentifié.');
      return;
    }
    if (!canAccess('profile', 'edit')) { // Use canAccess from hook
      showError('Vous n\'avez pas la permission de modifier votre profil.');
      return;
    }

    setIsSubmitting(true);
    const loadingToastId = showLoading('Mise à jour du profil...');

    let newAvatarUrl = formData.avatar_url;

    if (avatarFile) {
      newAvatarUrl = await uploadAvatar(avatarFile, user.id);
      if (!newAvatarUrl) {
        setIsSubmitting(false);
        dismissToast(loadingToastId);
        return;
      }
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: formData.first_name,
          last_name: formData.last_name,
          avatar_url: newAvatarUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) throw error;

      dismissToast(loadingToastId);
      showSuccess('Profil mis à jour avec succès !');
      await refetchCurrentUser(); // Appel de la fonction de rafraîchissement
    } catch (error: any) {
      dismissToast(loadingToastId);
      showError(`Erreur lors de la mise à jour du profil: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const canEditProfile = canAccess('profile', 'edit'); // Use canAccess from hook

  if (isProfileLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <SkeletonLoader count={1} height="h-16" className="w-1/2" />
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-r-lg">
        <p className="text-red-700">Impossible de charger le profil utilisateur.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-2xl mx-auto p-6 glass rounded-2xl shadow-lg animate-fade-in">
      <h2 className="text-4xl font-bold text-gray-800 text-center">Mon Profil</h2>

      <FormProvider {...methods}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="flex flex-col items-center space-y-4">
            <div className="relative w-32 h-32 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden border-4 border-blue-200">
              {avatarPreview ? (
                <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <User className="w-16 h-16 text-gray-500" />
              )}
              {canEditProfile && (
                <label htmlFor="avatar-upload" className="absolute bottom-0 right-0 bg-blue-600 p-2 rounded-full cursor-pointer hover:bg-blue-700 transition-colors">
                  <Camera className="w-5 h-5 text-white" />
                  <input
                    id="avatar-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="hidden"
                    disabled={isSubmitting}
                  />
                </label>
              )}
            </div>
            <p className="text-lg font-medium text-gray-700">{currentUser.email}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField name="first_name" label="Prénom" type="text" placeholder="Votre prénom" disabled={isSubmitting || !canEditProfile} />
            <FormField name="last_name" label="Nom" type="text" placeholder="Votre nom" disabled={isSubmitting || !canEditProfile} />
          </div>

          {canEditProfile && (
            <div className="flex justify-end">
              <Button type="submit" disabled={isSubmitting} className="hover-lift">
                {isSubmitting ? 'Sauvegarde en cours...' : 'Sauvegarder les modifications'}
              </Button>
            </div>
          )}
        </form>
      </FormProvider>
    </div>
  );
};

export default Profile;