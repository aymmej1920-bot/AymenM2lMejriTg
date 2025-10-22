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
      const { data: authUsersData, error: authUsersError }: { data: { users: User[] }, error: AuthError | null } = await supabaseAdmin.auth.admin.listUsers();
      if (authUsersError) throw authUsersError;
      const allAuthUsers = authUsersData.users;

      const { data: profilesData, error: profilesError }: { data: DbProfile[] | null, error: PostgrestError | null } = await supabaseAdmin
        .from('profiles')
        .select('id, first_name, last_name, role, updated_at');
      if (profilesError) throw profilesError;
      const allProfiles = profilesData || [];

      const profilesMap = new Map<string, DbProfile>();
      allProfiles.forEach((p: DbProfile) => profilesMap.set(p.id, p));

      const usersToDisplay = allAuthUsers.map((user: User) => {
        const profile = profilesMap.get(user.id);
        return {
          id: user.id,
          email: user.email || 'N/A',
          first_name: profile?.first_name || user.user_metadata?.first_name || 'N/A',
          last_name: profile?.last_name || user.user_metadata?.last_name || 'N/A',
          role: profile?.role || 'utilisateur',
          updated_at: profile?.updated_at || user.created_at,
        };
      });

      return new Response(JSON.stringify(usersToDisplay), {
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