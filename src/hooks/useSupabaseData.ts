import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../integrations/supabase/client';
import { useSession } from '../components/SessionContextProvider';
import { showError } from '../utils/toast';
import { Resource } from '../types';

interface UseSupabaseDataOptions {
  enabled?: boolean;
  filters?: (query: any) => any;
  skipUserIdFilter?: boolean;
  manualFetch?: boolean;
}

export const useSupabaseData = <T>(
  tableName: Resource,
  options?: UseSupabaseDataOptions
) => {
  const { session, currentUser, isLoading: isSessionLoading } = useSession();
  const [data, setData] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { enabled = true, filters, skipUserIdFilter = false, manualFetch = false } = options || {};

  const fetchData = useCallback(async () => {
    if (!enabled) {
      setData([]);
      setIsLoading(false);
      return;
    }

    // If not skipping user_id filter, ensure a session user is present
    if (!skipUserIdFilter && !session?.user) {
      setData([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      let query = supabase.from(tableName).select('*');

      const shouldSkipUserIdFilter = skipUserIdFilter && (currentUser?.role === 'admin' || currentUser?.role === 'direction');
      
      if (!shouldSkipUserIdFilter && session?.user) {
        // Apply user_id filter only if not skipping and session user is available
        query = query.eq('user_id', session.user.id);
      } else if (!shouldSkipUserIdFilter && !session?.user) {
        // This case should ideally be caught by the early return above, but as a fallback
        setData([]);
        setIsLoading(false);
        return;
      }
      // If shouldSkipUserIdFilter is true, no user_id filter is applied, which is correct.

      if (filters) {
        query = filters(query);
      }

      const { data: fetchedData, error: fetchError } = await query;

      if (fetchError) {
        throw fetchError;
      }

      setData((fetchedData || []) as T[]); // Ensure it's always an array, even if fetchedData is null/undefined
    } catch (err: unknown) {
      console.error(`Erreur lors du chargement des données de ${tableName}:`, err instanceof Error ? err.message : String(err));
      setError(`Erreur lors du chargement des données de ${tableName}.`);
      showError(`Erreur lors du chargement des données de ${tableName}.`);
      setData([]);
    } finally {
      setIsLoading(false);
    }
  }, [session?.user, currentUser?.role, tableName, enabled, filters, skipUserIdFilter]);

  useEffect(() => {
    if (!manualFetch && !isSessionLoading) {
      fetchData();
    }
  }, [manualFetch, isSessionLoading, fetchData]);

  return { data, isLoading, error, refetch: fetchData };
};