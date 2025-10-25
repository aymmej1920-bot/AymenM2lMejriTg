import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
    import { createClient, User, AuthError, PostgrestError } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    };

    interface DbProfile {
      id: string;
      first_name: string | null;
      last_name: string | null;
      updated_at: string;
    }

    serve(async (req: Request) => {
      if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
      }

      const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      const authHeader = req.headers.get('Authorization');
      if (!authHeader) {
        console.log('Unauthorized: No Authorization header');
        return new Response(JSON.stringify({ error: 'Unauthorized: No Authorization header' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const token = authHeader.replace('Bearer ', '');
      const { data: { user: authUser }, error: userError }: { data: { user: User | null }, error: AuthError | null } = await supabaseAdmin.auth.getUser(token);

      if (userError || !authUser) {
        console.error('JWT verification failed:', userError?.message);
        return new Response(JSON.stringify({ error: 'Unauthorized: Invalid token' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // No role-based permission check needed as access management is eliminated.
      // Any authenticated user can manage other users.

      try {
        if (req.method === 'GET') {
          const url = new URL(req.url);
          const page = parseInt(url.searchParams.get('page') || '1');
          const pageSize = parseInt(url.searchParams.get('pageSize') || '10');
          const sortByColumn = url.searchParams.get('sortByColumn') || 'first_name';
          const sortByDirection = url.searchParams.get('sortByDirection') === 'desc' ? false : true; // true for asc, false for desc
          const searchTerm = url.searchParams.get('searchTerm') || '';
          // roleFilter is no longer used

          const from = (page - 1) * pageSize;
          const to = from + pageSize - 1;

          let profilesQuery = supabaseAdmin
            .from('profiles')
            .select('id, first_name, last_name, updated_at', { count: 'exact' });

          // No roleFilter applied

          const { data: allProfilesData, error: allProfilesError, count: totalCount } = await profilesQuery;
          if (allProfilesError) throw allProfilesError;

          let filteredProfiles = allProfilesData || [];

          if (searchTerm) {
            const lowerCaseSearchTerm = searchTerm.toLowerCase();
            filteredProfiles = filteredProfiles.filter(profile =>
              (profile.first_name?.toLowerCase().includes(lowerCaseSearchTerm) ||
               profile.last_name?.toLowerCase().includes(lowerCaseSearchTerm))
            );
          }

          filteredProfiles.sort((a, b) => {
            const aValue = (a as any)[sortByColumn];
            const bValue = (b as any)[sortByColumn];

            if (typeof aValue === 'string' && typeof bValue === 'string') {
              return sortByDirection ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
            }
            return 0;
          });

          const paginatedProfiles = filteredProfiles.slice(from, to + 1);

          const userIds = paginatedProfiles.map(p => p.id);
          const { data: authUsersData, error: authUsersError } = await supabaseAdmin.auth.admin.listUsers({
            perPage: 1000,
          });
          if (authUsersError) throw authUsersError;
          const authUsersMap = new Map(authUsersData.users.map(u => [u.id, u]));

          const usersToDisplay = paginatedProfiles.map(profile => {
            const authUser = authUsersMap.get(profile.id);
            return {
              id: profile.id,
              email: authUser?.email || 'N/A',
              first_name: profile.first_name || authUser?.user_metadata?.first_name || 'N/A',
              last_name: profile.last_name || authUser?.user_metadata?.last_name || 'N/A',
              updated_at: profile.updated_at,
            };
          });

          return new Response(JSON.stringify({ users: usersToDisplay, totalCount: filteredProfiles.length }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        } else if (req.method === 'DELETE') {
          console.log('DELETE request received for manage-users');
          const { userId } = await req.json();
          console.log('Attempting to delete user with ID:', userId);

          if (!userId) {
            console.log('Error: User ID is required for deletion.');
            return new Response(JSON.stringify({ error: 'User ID is required for deletion.' }), {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }

          const { error: deleteError }: { error: AuthError | null } = await supabaseAdmin.auth.admin.deleteUser(userId);
          if (deleteError) {
            console.error('Error from supabaseAdmin.auth.admin.deleteUser:', deleteError.message);
            throw deleteError;
          }

          console.log('User deleted successfully:', userId);
          return new Response(JSON.stringify({ message: 'User deleted successfully!' }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        console.log('Method Not Allowed:', req.method);
        return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
          status: 405,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      } catch (error: unknown) {
        console.error('Error in manage-users edge function (catch block):', error instanceof Error ? error.message : String(error));
        return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'An unknown error occurred' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    });