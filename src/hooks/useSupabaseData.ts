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
    console.log(`[useSupabaseData] Attempting to fetch data for table: ${tableName}. Enabled: ${enabled}. Current User ID: ${currentUser?.id}. Role: ${currentUser?.role}. Session active: ${!!session}. Skip User ID Filter option: ${skipUserIdFilter}`);

    if (!enabled) {
      console.log(`[useSupabaseData] Fetch for ${tableName} skipped because 'enabled' is false.`);
      setData([]);
      setIsLoading(false);
      return;
    }

    // If not skipping user_id filter, ensure a session user is present
    if (!skipUserIdFilter && !session?.user) {
      console.log(`[useSupabaseData] Fetch for ${tableName} skipped: User ID filter required but no session user found.`);
      setData([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      let query = supabase.from(tableName).select('*');

      const shouldApplyUserIdFilter = !skipUserIdFilter && session?.user;
      
      if (shouldApplyUserIdFilter) {
        console.log(`[useSupabaseData] Applying user_id filter for ${tableName} with user ID: ${session!.user!.id}`);
        query = query.eq('user_id', session!.user!.id);
      } else if (skipUserIdFilter && (currentUser?.role === 'admin' || currentUser?.role === 'direction')) {
        console.log(`[useSupabaseData] Skipping user_id filter for ${tableName} due to admin/direction role.`);
      } else {
        console.log(`[useSupabaseData] No user_id filter applied for ${tableName}.`);
      }

      if (filters) {
        console.log(`[useSupabaseData] Applying custom filters for ${tableName}.`);
        query = filters(query);
      }

      console.log(`[useSupabaseData] Executing Supabase query for ${tableName}...`);
      const { data: fetchedData, error: fetchError } = await query;

      if (fetchError) {
        console.error(`[useSupabaseData] Supabase Error during fetch for ${tableName}:`, fetchError);
        throw fetchError;
      }

      console.log(`[useSupabaseData] Successfully fetched data for ${tableName}. Count: ${fetchedData?.length || 0}`);
      setData((fetchedData || []) as T[]);
    } catch (err: unknown) {
      console.error(`[useSupabaseData] Caught error during fetch for ${tableName}:`, err instanceof Error ? err.message : String(err));
      setError(`Erreur lors du chargement des données de ${tableName}.`);
      showError(`Erreur lors du chargement des données de ${tableName}.`);
      setData([]);
    } finally {
      setIsLoading(false);
      console.log(`[useSupabaseData] Fetch for ${tableName} finished. IsLoading: false.`);
    }
  }, [session?.user, currentUser?.id, currentUser?.role, tableName, enabled, filters, skipUserIdFilter]);

  useEffect(() => {
    if (!manualFetch && !isSessionLoading) {
      fetchData();
    }
  }, [manualFetch, isSessionLoading, fetchData]);

  return { data, isLoading, error, refetch: fetchData };
};