import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient, User, AuthError, PostgrestError } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
      .eq('action', 'add')
      .single();

    if (permissionsError || !permissionsData?.allowed) {
      console.error(`Forbidden: Role '${userRole}' does not have 'users:add' permission.`);
      return new Response(JSON.stringify({ error: `Forbidden: You do not have permission to invite users.` }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  }

  const { email, first_name, last_name } = await req.json();

  if (!email) {
    return new Response(JSON.stringify({ error: 'Email is required.' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const redirectToUrl = `https://aymenm2lmejritg.vercel.app/login`; 

    const { data, error }: { data: { user: User | null }, error: AuthError | null } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: { first_name, last_name },
      redirectTo: redirectToUrl,
    });

    if (error) throw error;

    return new Response(JSON.stringify({ message: 'Invitation sent successfully!', user: data.user }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('Error inviting user:', error instanceof Error ? error.message : String(error));
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'An unknown error occurred' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});