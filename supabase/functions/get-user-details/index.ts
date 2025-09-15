import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function isAdmin(supabaseAdmin: any, req: Request): Promise<boolean> {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return false;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !user) return false;
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .limit(1)
      .single();
    return !profileError && profile.role === 'admin';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    if (!await isAdmin(supabaseAdmin, req)) {
        return new Response(JSON.stringify({ error: 'Acesso negado: Requer permissão de administrador.' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 403,
        });
    }

    const { userId } = await req.json();
    if (!userId) throw new Error("User ID is required");

    const { data: profiles, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('first_name, last_name, status')
      .eq('id', userId);

    if (profileError) throw profileError;

    const profile = profiles && profiles.length > 0 
      ? profiles[0] 
      : { first_name: null, last_name: null, status: 'inactive' };

    const { data: permissions, error: permsError } = await supabaseAdmin
      .from('user_permissions')
      .select('*')
      .eq('user_id', userId);
    if (permsError) throw permsError;

    return new Response(JSON.stringify({ profile, permissions }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
})