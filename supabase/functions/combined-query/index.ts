/**
 * Edge Function: Consulta Distribuida (PostgreSQL + MongoDB)
 * 
 * Este endpoint expone las consultas distribuidas combinando datos de:
 * - PostgreSQL (Supabase) - Datos relacionales estructurados
 * - MongoDB Atlas - Logs y datos no estructurados
 * 
 * Ruta: /functions/v1/combined-query
 */

import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';
import { MongoClient } from 'npm:mongodb@6.3.0';

// Headers CORS para permitir llamadas desde el frontend
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Inicializa el cliente de Supabase para consultas SQL
 */
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Cliente MongoDB con conexión lazy (se conecta solo cuando se usa)
 */
let mongoClient: MongoClient | null = null;

async function getMongoClient(): Promise<MongoClient> {
  if (mongoClient) {
    return mongoClient;
  }

  const mongoUri = Deno.env.get('MONGODB_URI');
  if (!mongoUri) {
    throw new Error('MONGODB_URI no está configurada');
  }

  mongoClient = new MongoClient(mongoUri);
  await mongoClient.connect();
  console.log('✅ Conectado a MongoDB');
  return mongoClient;
}

/**
 * Handler principal del endpoint
 */
const handler = async (req: Request): Promise<Response> => {
  // Manejar preflight CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { pathname } = new URL(req.url);
    
    // GET /combined-query/estudiante/:id - Perfil completo de estudiante
    if (req.method === 'GET' && pathname.includes('/estudiante/')) {
      const estudianteId = pathname.split('/').pop();
      
      if (!estudianteId) {
        return new Response(
          JSON.stringify({ error: 'ID de estudiante requerido' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Consulta paralela a ambas bases de datos
      const [datosSQL, datosNoSQL] = await Promise.all([
        // PostgreSQL: Datos del estudiante
        supabase
          .from('estudiantes')
          .select('id, nombres, apellidos, email, dni, estado')
          .eq('id', estudianteId)
          .single(),
        
        // MongoDB: Logs de actividad
        (async () => {
          try {
            const client = await getMongoClient();
            const db = client.db('school_management');
            const collection = db.collection('estudiantes_logs');
            
            const logs = await collection
              .find({ estudiante_id: estudianteId })
              .sort({ timestamp: -1 })
              .limit(20)
              .toArray();
            
            return { logs, error: null };
          } catch (error) {
            console.error('Error MongoDB:', error);
            return { logs: [], error: error.message };
          }
        })(),
      ]);

      // Combinar resultados
      const resultado = {
        success: true,
        estudiante: datosSQL.data,
        logs: datosNoSQL.logs,
        estadisticas: {
          total_logs: datosNoSQL.logs.length,
          ultima_actividad: datosNoSQL.logs[0]?.timestamp || null,
        },
        errores: {
          sql: datosSQL.error?.message || null,
          nosql: datosNoSQL.error,
        },
      };

      return new Response(JSON.stringify(resultado), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // GET /combined-query/dashboard - Estadísticas generales
    if (req.method === 'GET' && pathname.includes('/dashboard')) {
      const [statsSQL, statsNoSQL] = await Promise.all([
        // PostgreSQL: Conteo de estudiantes
        supabase
          .from('estudiantes')
          .select('id', { count: 'exact', head: true })
          .eq('estado', 'activo'),
        
        // MongoDB: Métricas de logs
        (async () => {
          const client = await getMongoClient();
          const db = client.db('school_management');
          const collection = db.collection('estudiantes_logs');
          
          const hoy = new Date();
          hoy.setHours(0, 0, 0, 0);
          
          const [totalLogs, logsHoy] = await Promise.all([
            collection.countDocuments(),
            collection.countDocuments({ timestamp: { $gte: hoy } }),
          ]);
          
          return { totalLogs, logsHoy };
        })(),
      ]);

      const resultado = {
        success: true,
        estadisticas: {
          estudiantes_activos: statsSQL.count || 0,
          total_logs_sistema: statsNoSQL.totalLogs,
          actividad_hoy: statsNoSQL.logsHoy,
        },
        timestamp: new Date().toISOString(),
      };

      return new Response(JSON.stringify(resultado), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // POST /combined-query/log - Registrar nueva actividad
    if (req.method === 'POST' && pathname.includes('/log')) {
      const body = await req.json();
      const { estudiante_id, accion, detalles } = body;

      if (!estudiante_id || !accion) {
        return new Response(
          JSON.stringify({ error: 'estudiante_id y accion son requeridos' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Insertar log en MongoDB
      const client = await getMongoClient();
      const db = client.db('school_management');
      const collection = db.collection('estudiantes_logs');

      const result = await collection.insertOne({
        estudiante_id,
        accion,
        detalles: detalles || {},
        timestamp: new Date(),
        ip: req.headers.get('x-forwarded-for') || 'unknown',
      });

      return new Response(
        JSON.stringify({
          success: true,
          log_id: result.insertedId.toString(),
          message: 'Log registrado exitosamente',
        }),
        { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Ruta no encontrada
    return new Response(
      JSON.stringify({ error: 'Ruta no encontrada' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error en edge function:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
};

serve(handler);
