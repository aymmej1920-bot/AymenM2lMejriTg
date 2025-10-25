import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
    import { createClient, User, AuthError } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
    };

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
      // Any authenticated user can create other users.

      const { email, password, first_name, last_name } = await req.json(); // Removed 'role'

      if (!email || !password || !first_name || !last_name) {
        return new Response(JSON.stringify({ error: 'Email, password, first name, and last name are required.' }), {
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

        // The handle_new_user trigger will create the profile, no need to update role here.
        // The role column has been removed from the profiles table.

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