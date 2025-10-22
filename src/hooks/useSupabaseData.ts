import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../integrations/supabase/client';
import { useSession } from '../components/SessionContextProvider';
import { showError } from '../utils/toast';
import { Resource } from '../types';

interface UseSupabaseDataOptions {
  enabled?: boolean; // Whether the query should run
  filters?: (query: any) => any; // Function to apply additional filters to the Supabase query
  skipUserIdFilter?: boolean; // New option to skip user_id filter
  manualFetch?: boolean; // New option to prevent automatic fetching on mount/session change
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
    if (!session?.user && !skipUserIdFilter) { // If not authenticated and not skipping user_id filter
      setData([]);
      setIsLoading(false);
      return;
    }
    if (!enabled) {
      setData([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      let query = supabase.from(tableName).select('*');

      // Apply user_id filter by default, unless skipUserIdFilter is true AND user is admin/direction
      const shouldSkipUserIdFilter = skipUserIdFilter && (currentUser?.role === 'admin' || currentUser?.role === 'direction');
      
      if (!shouldSkipUserIdFilter) {
        query = query.eq('user_id', session!.user.id); // session.user is guaranteed if !shouldSkipUserIdFilter
      }

      // Apply additional filters if provided
      if (filters) {
        query = filters(query);
      }

      const { data: fetchedData, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      setData(fetchedData as T[]);
    } catch (err: any) {
      console.error(`Error fetching data from ${tableName}:`, err.message);
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