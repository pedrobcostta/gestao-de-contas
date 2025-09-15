import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    const { email, password, first_name, last_name, permissions } = await req.json();

    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { first_name, last_name },
    });

    if (error) {
      if (error.message.includes("User already registered")) {
        throw new Error("Este e-mail já está cadastrado.");
      }
      if (error.message.includes("Password should be at least 6 characters")) {
        throw new Error("A senha deve ter no mínimo 6 caracteres.");
      }
      throw error;
    }

    if (permissions && permissions.length > 0) {
        const permsToInsert = permissions.map((p: any) => ({ ...p, user_id: data.user.id }));
        const { error: insertPermsError } = await supabaseAdmin
          .from('user_permissions')
          .insert(permsToInsert);
        if (insertPermsError) {
            await supabaseAdmin.auth.admin.deleteUser(data.user.id);
            throw insertPermsError;
        }
    }

    return new Response(JSON.stringify({ user: data.user }), {
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