/**
 * Servicio de Consultas Distribuidas
 * 
 * Este servicio combina consultas de PostgreSQL (Supabase) y MongoDB
 * para obtener datos de múltiples fuentes en paralelo.
 */

import { supabase } from '@/integrations/supabase/client';
import { getCollection } from '@/integrations/mongodb/client';

/**
 * Interfaz para los datos del estudiante desde PostgreSQL
 */
interface EstudianteSQL {
  id: string;
  nombres: string;
  apellidos: string;
  email: string;
  dni: string;
  estado: string;
}

/**
 * Interfaz para los logs de actividad desde MongoDB
 */
interface LogActividad {
  _id?: string;
  estudiante_id: string;
  accion: string;
  detalles?: any;
  timestamp: Date;
}

/**
 * Interfaz para el resultado combinado
 */
interface ResultadoCombinado {
  estudiante: EstudianteSQL | null;
  logs: LogActividad[];
  estadisticas: {
    total_logs: number;
    ultima_actividad: Date | null;
  };
}

/**
 * Consulta distribuida: Obtiene datos de estudiante (SQL) y sus logs (NoSQL)
 * 
 * Esta función demuestra cómo realizar consultas paralelas a múltiples
 * bases de datos y combinar los resultados.
 * 
 * @param {string} estudianteId - UUID del estudiante
 * @returns {Promise<ResultadoCombinado>} Datos combinados de ambas fuentes
 */
export async function obtenerPerfilCompletoEstudiante(
  estudianteId: string
): Promise<ResultadoCombinado> {
  try {
    // 1. Ejecutar ambas consultas en paralelo usando Promise.all
    // Esto optimiza el tiempo de respuesta al no esperar una tras otra
    const [datosPostgres, datosMongoResult] = await Promise.all([
      // Consulta a PostgreSQL (Supabase) - Datos estructurados del estudiante
      supabase
        .from('estudiantes')
        .select('id, nombres, apellidos, email, dni, estado')
        .eq('id', estudianteId)
        .single(),
      
      // Consulta a MongoDB - Logs de actividad no estructurados
      (async () => {
        try {
          const collection = await getCollection<LogActividad>('estudiantes_logs');
          
          // Buscar logs del estudiante ordenados por fecha
          const logs = await collection
            .find({ estudiante_id: estudianteId })
            .sort({ timestamp: -1 })
            .limit(50)
            .toArray();
          
          return { logs, error: null };
        } catch (error) {
          console.error('Error en consulta MongoDB:', error);
          return { logs: [], error };
        }
      })(),
    ]);

    // 2. Manejar errores parciales - Si una DB falla, devolver datos parciales
    const estudiante = datosPostgres.error ? null : datosPostgres.data;
    const logs = datosMongoResult.logs;

    // 3. Calcular estadísticas a partir de los logs
    const estadisticas = {
      total_logs: logs.length,
      ultima_actividad: logs.length > 0 ? logs[0].timestamp : null,
    };

    // 4. Combinar y devolver resultados
    return {
      estudiante,
      logs,
      estadisticas,
    };
  } catch (error) {
    console.error('Error en consulta distribuida:', error);
    throw new Error(`Error al obtener perfil completo: ${error}`);
  }
}

/**
 * Ejemplo de escritura distribuida: Registra un estudiante y su primer log
 * 
 * @param {Object} datosEstudiante - Datos del nuevo estudiante
 * @returns {Promise<Object>} IDs generados en ambas bases de datos
 */
export async function registrarEstudianteConLog(datosEstudiante: {
  sede_id: string;
  dni: string;
  nombres: string;
  apellidos: string;
  email: string;
}) {
  try {
    // 1. Insertar en PostgreSQL (datos estructurados)
    const { data: estudiante, error: errorSQL } = await supabase
      .from('estudiantes')
      .insert([datosEstudiante])
      .select()
      .single();

    if (errorSQL || !estudiante) {
      throw new Error(`Error al crear estudiante en SQL: ${errorSQL?.message}`);
    }

    // 2. Insertar log inicial en MongoDB (datos no estructurados)
    const collection = await getCollection('estudiantes_logs');
    const resultMongo = await collection.insertOne({
      estudiante_id: estudiante.id,
      accion: 'registro',
      detalles: {
        sede_id: datosEstudiante.sede_id,
        metodo: 'web',
        ip: 'N/A', // En producción, obtener del request
      },
      timestamp: new Date(),
    });

    console.log('✅ Estudiante registrado en ambas bases de datos');

    return {
      success: true,
      estudiante_id: estudiante.id,
      log_id: resultMongo.insertedId.toString(),
    };
  } catch (error) {
    console.error('Error en registro distribuido:', error);
    throw error;
  }
}

/**
 * Consulta agregada: Dashboard con estadísticas de múltiples fuentes
 * 
 * Combina conteos de PostgreSQL con métricas de MongoDB
 */
export async function obtenerEstadisticasDashboard() {
  try {
    const [statsSQL, statsMongo] = await Promise.all([
      // Estadísticas SQL: Conteo de estudiantes activos
      supabase
        .from('estudiantes')
        .select('id', { count: 'exact', head: true })
        .eq('estado', 'activo'),
      
      // Estadísticas NoSQL: Actividad reciente
      (async () => {
        const collection = await getCollection('estudiantes_logs');
        
        const [totalLogs, logsHoy] = await Promise.all([
          collection.countDocuments(),
          collection.countDocuments({
            timestamp: {
              $gte: new Date(new Date().setHours(0, 0, 0, 0)),
            },
          }),
        ]);
        
        return { totalLogs, logsHoy };
      })(),
    ]);

    return {
      estudiantes_activos: statsSQL.count || 0,
      total_logs_sistema: statsMongo.totalLogs,
      actividad_hoy: statsMongo.logsHoy,
    };
  } catch (error) {
    console.error('Error en estadísticas dashboard:', error);
    return {
      estudiantes_activos: 0,
      total_logs_sistema: 0,
      actividad_hoy: 0,
      error: 'Error al obtener estadísticas',
    };
  }
}
