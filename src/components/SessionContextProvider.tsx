import React, { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../integrations/supabase/client';
import { AuthUser } from '../types';

interface SessionContextType {
  session: Session | null;
  user: User | null;
  currentUser: AuthUser | null;
  isLoading: boolean;
  isProfileLoading: boolean;
  refetchCurrentUser: () => Promise<void>; // Ajout de refetchCurrentUser
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export const SessionContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProfileLoading, setIsProfileLoading] = useState(false);

  // Fonction pour récupérer le profil utilisateur
  const fetchUserProfile = useCallback(async (loggedInUser: User) => {
    setIsProfileLoading(true);
    try {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('first_name, last_name, role, avatar_url')
        .eq('id', loggedInUser.id)
        .single();

      if (profileError) throw profileError;

      setCurrentUser({
        id: loggedInUser.id,
        email: loggedInUser.email || '',
        name: `${profileData?.first_name || ''} ${profileData?.last_name || ''}`.trim() || loggedInUser.email?.split('@')[0] || 'User',
        role: profileData?.role || 'utilisateur',
        avatar_url: profileData?.avatar_url || null,
      });
    } catch (error) {
      console.error('Error fetching user profile in SessionContextProvider:', error);
      setCurrentUser(null);
    } finally {
      setIsProfileLoading(false);
    }
  }, []);

  // Effet pour obtenir la session initiale et configurer l'écouteur de changement d'état d'authentification
  useEffect(() => {
    const getInitialSession = async () => {
      setIsLoading(true);
      const { data: { session: initialSession } } = await supabase.auth.getSession();
      setSession(initialSession);
      setUser(initialSession?.user || null);
      setIsLoading(false);
      if (initialSession?.user) {
        fetchUserProfile(initialSession.user);
      }
    };

    getInitialSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      setSession(currentSession);
      setUser(currentSession?.user || null);
      if (currentSession?.user) {
        fetchUserProfile(currentSession.user);
      } else {
        setCurrentUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchUserProfile]);

  return (
    <SessionContext.Provider value={{ session, user, currentUser, isLoading, isProfileLoading, refetchCurrentUser: () => user ? fetchUserProfile(user) : Promise.resolve() }}>
      {children}
    </SessionContext.Provider>
  );
};

export const useSession = () => {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error('useSession must be used within a SessionContextProvider');
  }
  return context;
};