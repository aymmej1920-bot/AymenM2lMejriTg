// @ts-ignore
/// <reference lib="deno.ns" /> 
// @ts-ignore
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
// @ts-ignore
import { createClient, User } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Define an interface for the profile data fetched from the 'profiles' table
interface DbProfile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  role: 'admin' | 'direction' | 'utilisateur';
  created_at: string;
}

serve(async (req: Request) => {
  // Handle CORS OPTIONS request
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Create a Supabase client with the service role key
  const supabaseAdmin = createClient(
    // @ts-ignore
    Deno.env.get('SUPABASE_URL') ?? '',
    // @ts-ignore
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  // Verify the user's JWT from the request header
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Unauthorized: No Authorization header' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const token = authHeader.replace('Bearer ', '');
  const { data: { user: authUser }, error: userError } = await supabaseAdmin.auth.getUser(token);

  if (userError || !authUser) {
    console.error('JWT verification failed:', userError?.message);
    return new Response(JSON.stringify({ error: 'Unauthorized: Invalid token' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Check if the authenticated user is an admin
  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', authUser.id)
    .single();

  if (profileError || profile?.role !== 'admin') {
    console.error('User is not an admin or profile not found:', profileError?.message);
    return new Response(JSON.stringify({ error: 'Forbidden: Only administrators can manage users.' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    if (req.method === 'GET') {
      // Fetch profiles
      const { data: profiles, error: profilesError } = await supabaseAdmin
        .from('profiles')
        .select('id, first_name, last_name, role, created_at');

      if (profilesError) throw profilesError;

      // Fetch auth.users to get emails
      const { data: authUsers, error: authUsersError } = await supabaseAdmin.auth.admin.listUsers();

      if (authUsersError) throw authUsersError;

      const usersWithEmails = (profiles as DbProfile[]).map((profile: DbProfile) => {
        const authUser = authUsers.users.find((au: User) => au.id === profile.id);
        return {
          ...profile,
          email: authUser?.email || 'N/A',
          first_name: profile.first_name || authUser?.user_metadata?.first_name || 'N/A',
          last_name: profile.last_name || authUser?.user_metadata?.last_name || 'N/A',
        };
      });

      return new Response(JSON.stringify(usersWithEmails), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } else if (req.method === 'DELETE') {
      const { userId } = await req.json();
      if (!userId) {
        return new Response(JSON.stringify({ error: 'User ID is required for deletion.' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
      if (deleteError) throw deleteError;

      return new Response(JSON.stringify({ message: 'User deleted successfully!' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error in manage-users edge function:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});