import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, password, role } = await req.json()

    if (!email || !password || !role) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Email, contraseña y rol son requeridos' 
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Validate role
    const validRoles = ['admin', 'teacher', 'student']
    if (!validRoles.includes(role)) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Rol inválido' 
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    console.log('Creating user with email:', email, 'and role:', role)

    // Create user with admin API
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (authError) {
      console.error('Auth error:', authError)
      throw authError
    }

    if (!authData.user) {
      throw new Error('No se pudo crear el usuario')
    }

    console.log('User created:', authData.user.id)

    // Insert user role
    const { error: roleError } = await supabase
      .from('user_roles')
      .insert({
        user_id: authData.user.id,
        role: role
      })

    if (roleError) {
      console.error('Role error:', roleError)
      throw roleError
    }

    console.log('Role assigned:', role)

    // Create profile
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        user_id: authData.user.id
      })

    if (profileError) {
      console.error('Profile error:', profileError)
      throw profileError
    }

    console.log('Profile created')

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Usuario ${email} creado exitosamente como ${role}`,
        user_id: authData.user.id
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
    console.error('Error creating user:', errorMessage)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage,
        message: 'Error al crear usuario'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
