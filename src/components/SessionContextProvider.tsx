import React, { useState, useEffect, createContext, useContext } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../integrations/supabase/client';
import { AuthUser } from '../types'; // Import AuthUser type

interface SessionContextType {
  session: Session | null;
  user: User | null;
  currentUser: AuthUser | null; // Add currentUser to context
  isLoading: boolean; // For initial session loading
  isProfileLoading: boolean; // Add a loading state for profile
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export const SessionContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null); // State for currentUser with role
  const [isLoading, setIsLoading] = useState(true); // For initial session loading
  const [isProfileLoading, setIsProfileLoading] = useState(false); // For profile fetching

  // Effect to get initial session and set up auth state change listener
  useEffect(() => {
    const getInitialSession = async () => {
      setIsLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setUser(session?.user || null);
      setIsLoading(false);
    };

    getInitialSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Effect to fetch user profile when session or user changes
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (user) {
        setIsProfileLoading(true);
        try {
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('first_name, last_name, role')
            .eq('id', user.id)
            .single();

          if (profileError) throw profileError;

          setCurrentUser({
            id: user.id,
            email: user.email || '',
            name: profileData?.first_name || user.email?.split('@')[0] || 'User',
            role: profileData?.role || 'utilisateur',
          });
        } catch (error) {
          console.error('Error fetching user profile in SessionContextProvider:', error);
          setCurrentUser(null); // Clear user if profile fetch fails
        } finally {
          setIsProfileLoading(false);
        }
      } else {
        setCurrentUser(null);
        setIsProfileLoading(false);
      }
    };

    fetchUserProfile();
  }, [user]); // Depend on 'user' from session

  return (
    <SessionContext.Provider value={{ session, user, currentUser, isLoading, isProfileLoading }}>
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