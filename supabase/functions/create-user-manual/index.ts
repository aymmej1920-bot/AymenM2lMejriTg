import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient, User, AuthError, PostgrestError } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
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
      .eq('action', 'add')
      .single();

    if (permissionsError || !permissionsData?.allowed) {
      console.error(`Forbidden: Role '${userRole}' does not have 'users:add' permission.`);
      return new Response(JSON.stringify({ error: `Forbidden: You do not have permission to create users manually.` }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  }

  const { email, password, first_name, last_name, role } = await req.json();

  if (!email || !password || !first_name || !last_name || !role) {
    return new Response(JSON.stringify({ error: 'Email, password, first name, last name, and role are required.' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const { data: newUserAuth, error: createUserError }: { data: { user: User | null }, error: AuthError | null } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { first_name, last_name },
    });

    if (createUserError) throw createUserError;

    const { error: updateProfileError }: { error: PostgrestError | null } = await supabaseAdmin
      .from('profiles')
      .update({ role, first_name, last_name })
      .eq('id', newUserAuth.user?.id);

    if (updateProfileError) throw updateProfileError;

    return new Response(JSON.stringify({ message: 'User created successfully!', user: newUserAuth.user }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('Error creating user manually:', error instanceof Error ? error.message : String(error));
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'An unknown error occurred' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});