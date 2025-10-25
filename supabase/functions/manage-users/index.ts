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
  role: 'admin' | 'direction' | 'utilisateur';
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

  const { data: userProfile, error: userProfileError }: { data: DbProfile | null, error: PostgrestError | null } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', authUser.id)
    .single();

  if (userProfileError || !userProfile) {
    console.error('User profile not found for authorization:', userProfileError?.message);
    return new Response(JSON.stringify({ error: 'Forbidden: User profile not found.' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const userRole = userProfile.role;

  if (userRole === 'admin') {
    // Admins are implicitly allowed all actions
  } else {
    const { data: permissionsData, error: permissionsError }: { data: { allowed: boolean } | null, error: PostgrestError | null } = await supabaseAdmin
      .from('permissions')
      .select('allowed')
      .eq('role', userRole)
      .eq('resource', 'users')
      .eq('action', 'view')
      .single();

    if (permissionsError || !permissionsData?.allowed) {
      console.error(`Forbidden: Role '${userRole}' does not have 'users:view' permission.`);
      return new Response(JSON.stringify({ error: `Forbidden: You do not have permission to manage users.` }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  }

  try {
    if (req.method === 'GET') {
      const url = new URL(req.url);
      const page = parseInt(url.searchParams.get('page') || '1');
      const pageSize = parseInt(url.searchParams.get('pageSize') || '10');
      const sortByColumn = url.searchParams.get('sortByColumn') || 'first_name';
      const sortByDirection = url.searchParams.get('sortByDirection') === 'desc' ? false : true; // true for asc, false for desc
      const searchTerm = url.searchParams.get('searchTerm') || '';
      const roleFilter = url.searchParams.get('roleFilter') || '';

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      // Fetch all profiles first to apply filters and sorting
      let profilesQuery = supabaseAdmin
        .from('profiles')
        .select('id, first_name, last_name, role, updated_at', { count: 'exact' });

      if (roleFilter) {
        profilesQuery = profilesQuery.eq('role', roleFilter);
      }

      // Apply search term to first_name, last_name, email (requires joining with auth.users or fetching all auth users)
      // For simplicity and to avoid complex joins in Edge Functions, we'll fetch all profiles and filter in memory for search term
      // A more robust solution for large user bases would involve a full-text search index or a more complex SQL query.
      const { data: allProfilesData, error: allProfilesError, count: totalCount } = await profilesQuery;
      if (allProfilesError) throw allProfilesError;

      let filteredProfiles = allProfilesData || [];

      if (searchTerm) {
        const lowerCaseSearchTerm = searchTerm.toLowerCase();
        // To filter by email, we need to fetch auth.users as well.
        // For now, we'll filter by first_name and last_name from profiles.
        // A full server-side search including email would require a different approach (e.g., a database view or a more complex query joining auth.users).
        filteredProfiles = filteredProfiles.filter(profile =>
          (profile.first_name?.toLowerCase().includes(lowerCaseSearchTerm) ||
           profile.last_name?.toLowerCase().includes(lowerCaseSearchTerm))
        );
      }

      // Apply sorting to the filtered profiles
      filteredProfiles.sort((a, b) => {
        const aValue = (a as any)[sortByColumn];
        const bValue = (b as any)[sortByColumn];

        if (typeof aValue === 'string' && typeof bValue === 'string') {
          return sortByDirection ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
        }
        return 0;
      });

      const paginatedProfiles = filteredProfiles.slice(from, to + 1);

      // Now, enrich with email from auth.users for the paginated profiles
      const userIds = paginatedProfiles.map(p => p.id);
      const { data: authUsersData, error: authUsersError } = await supabaseAdmin.auth.admin.listUsers({
        perPage: 1000, // Fetch a reasonable number to cover potential gaps, or fetch only specific IDs
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
          role: profile.role,
          updated_at: profile.updated_at,
        };
      });

      return new Response(JSON.stringify({ users: usersToDisplay, totalCount: filteredProfiles.length }), { // Return filteredProfiles.length as totalCount for client-side pagination logic
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