/**
 * Servicio de Registro de Actividades (Activity Logger)
 * 
 * Este servicio registra todas las acciones de usuarios en MongoDB:
 * - Inicios de sesión (login/logout)
 * - Acciones CRUD (crear, actualizar, eliminar)
 * - Consultas importantes
 * - Errores y fallos de seguridad
 */

import { getCollection } from '@/integrations/mongodb/client';

/**
 * Tipos de actividades que se pueden registrar
 */
export type ActivityType = 
  | 'login'              // Usuario inició sesión
  | 'logout'             // Usuario cerró sesión
  | 'signup'             // Nuevo usuario registrado
  | 'create'             // Creó un registro
  | 'update'             // Actualizó un registro
  | 'delete'             // Eliminó un registro
  | 'view'               // Consultó/visualizó datos
  | 'export'             // Exportó datos
  | 'payment'            // Procesó un pago
  | 'error'              // Error en el sistema
  | 'security_alert';    // Alerta de seguridad

/**
 * Módulos del sistema donde ocurren las actividades
 */
export type ActivityModule = 
  | 'auth'               // Autenticación
  | 'estudiantes'        // Gestión de estudiantes
  | 'profesores'         // Gestión de profesores
  | 'cursos'             // Gestión de cursos
  | 'matriculas'         // Matrículas
  | 'pagos'              // Pagos y finanzas
  | 'evaluaciones'       // Evaluaciones académicas
  | 'inventario'         // Inventario
  | 'reportes'           // Reportes y estadísticas
  | 'configuracion';     // Configuración del sistema

/**
 * Interfaz del documento de log en MongoDB
 */
export interface ActivityLog {
  _id?: string;
  
  // Usuario que realiza la acción
  user_id: string;
  user_email?: string;
  user_role?: string;
  
  // Detalles de la actividad
  activity_type: ActivityType;
  module: ActivityModule;
  action_description: string;
  
  // Datos adicionales (flexible)
  metadata?: {
    entity_id?: string;           // ID del registro afectado
    entity_type?: string;          // Tipo de entidad (ej: 'estudiante')
    previous_data?: any;           // Datos antes del cambio
    new_data?: any;                // Datos después del cambio
    ip_address?: string;           // IP del usuario
    user_agent?: string;           // Navegador del usuario
    [key: string]: any;            // Otros datos personalizados
  };
  
  // Timestamps
  timestamp: Date;
  created_at: Date;
  
  // Contexto técnico
  success: boolean;
  error_message?: string;
  duration_ms?: number;            // Duración de la operación
}

/**
 * Clase principal del Activity Logger
 */
class ActivityLogger {
  private collectionName = 'activity_logs';

  /**
   * Registra una actividad en MongoDB
   * 
   * @param logData - Datos de la actividad a registrar
   * @returns ID del log insertado
   */
  async log(logData: Omit<ActivityLog, '_id' | 'timestamp' | 'created_at'>): Promise<string | null> {
    try {
      const collection = await getCollection<ActivityLog>(this.collectionName);
      
      const document: ActivityLog = {
        ...logData,
        timestamp: new Date(),
        created_at: new Date(),
      };

      const result = await collection.insertOne(document);
      console.log('✅ Actividad registrada:', logData.activity_type, logData.action_description);
      
      return result.insertedId.toString();
    } catch (error) {
      console.error('❌ Error al registrar actividad:', error);
      // No lanzamos el error para no interrumpir el flujo principal
      return null;
    }
  }

  /**
   * Registra un inicio de sesión exitoso
   */
  async logLogin(userId: string, userEmail: string, userRole: string) {
    return this.log({
      user_id: userId,
      user_email: userEmail,
      user_role: userRole,
      activity_type: 'login',
      module: 'auth',
      action_description: `Usuario ${userEmail} inició sesión`,
      success: true,
      metadata: {
        ip_address: await this.getClientIP(),
        user_agent: navigator.userAgent,
      },
    });
  }

  /**
   * Registra un cierre de sesión
   */
  async logLogout(userId: string, userEmail: string) {
    return this.log({
      user_id: userId,
      user_email: userEmail,
      activity_type: 'logout',
      module: 'auth',
      action_description: `Usuario ${userEmail} cerró sesión`,
      success: true,
    });
  }

  /**
   * Registra un intento de login fallido
   */
  async logFailedLogin(email: string, errorMessage: string) {
    return this.log({
      user_id: 'anonymous',
      user_email: email,
      activity_type: 'login',
      module: 'auth',
      action_description: `Intento fallido de inicio de sesión para ${email}`,
      success: false,
      error_message: errorMessage,
      metadata: {
        ip_address: await this.getClientIP(),
        user_agent: navigator.userAgent,
      },
    });
  }

  /**
   * Registra creación de un registro
   */
  async logCreate(
    userId: string,
    module: ActivityModule,
    entityType: string,
    entityId: string,
    data: any
  ) {
    return this.log({
      user_id: userId,
      activity_type: 'create',
      module,
      action_description: `Creó ${entityType} con ID ${entityId}`,
      success: true,
      metadata: {
        entity_id: entityId,
        entity_type: entityType,
        new_data: data,
      },
    });
  }

  /**
   * Registra actualización de un registro
   */
  async logUpdate(
    userId: string,
    module: ActivityModule,
    entityType: string,
    entityId: string,
    previousData: any,
    newData: any
  ) {
    return this.log({
      user_id: userId,
      activity_type: 'update',
      module,
      action_description: `Actualizó ${entityType} con ID ${entityId}`,
      success: true,
      metadata: {
        entity_id: entityId,
        entity_type: entityType,
        previous_data: previousData,
        new_data: newData,
      },
    });
  }

  /**
   * Registra eliminación de un registro
   */
  async logDelete(
    userId: string,
    module: ActivityModule,
    entityType: string,
    entityId: string,
    deletedData: any
  ) {
    return this.log({
      user_id: userId,
      activity_type: 'delete',
      module,
      action_description: `Eliminó ${entityType} con ID ${entityId}`,
      success: true,
      metadata: {
        entity_id: entityId,
        entity_type: entityType,
        previous_data: deletedData,
      },
    });
  }

  /**
   * Registra un pago procesado
   */
  async logPayment(
    userId: string,
    estudianteId: string,
    monto: number,
    metodoPago: string,
    concepto: string
  ) {
    return this.log({
      user_id: userId,
      activity_type: 'payment',
      module: 'pagos',
      action_description: `Procesó pago de S/. ${monto} para estudiante ${estudianteId}`,
      success: true,
      metadata: {
        entity_id: estudianteId,
        entity_type: 'pago',
        monto,
        metodo_pago: metodoPago,
        concepto,
      },
    });
  }

  /**
   * Registra consulta/visualización de datos
   */
  async logView(
    userId: string,
    module: ActivityModule,
    description: string,
    filters?: any
  ) {
    return this.log({
      user_id: userId,
      activity_type: 'view',
      module,
      action_description: description,
      success: true,
      metadata: {
        filters,
      },
    });
  }

  /**
   * Registra un error del sistema
   */
  async logError(
    userId: string,
    module: ActivityModule,
    errorMessage: string,
    errorStack?: string
  ) {
    return this.log({
      user_id: userId,
      activity_type: 'error',
      module,
      action_description: 'Error en el sistema',
      success: false,
      error_message: errorMessage,
      metadata: {
        error_stack: errorStack,
      },
    });
  }

  /**
   * Registra una alerta de seguridad
   */
  async logSecurityAlert(
    userId: string,
    description: string,
    metadata?: any
  ) {
    return this.log({
      user_id: userId,
      activity_type: 'security_alert',
      module: 'auth',
      action_description: description,
      success: true,
      metadata,
    });
  }

  /**
   * Obtiene los últimos logs de un usuario
   */
  async getUserLogs(userId: string, limit: number = 50) {
    try {
      const collection = await getCollection<ActivityLog>(this.collectionName);
      
      const logs = await collection
        .find({ user_id: userId })
        .sort({ timestamp: -1 })
        .limit(limit)
        .toArray();
      
      return logs;
    } catch (error) {
      console.error('Error al obtener logs del usuario:', error);
      return [];
    }
  }

  /**
   * Obtiene logs por módulo
   */
  async getModuleLogs(module: ActivityModule, limit: number = 100) {
    try {
      const collection = await getCollection<ActivityLog>(this.collectionName);
      
      const logs = await collection
        .find({ module })
        .sort({ timestamp: -1 })
        .limit(limit)
        .toArray();
      
      return logs;
    } catch (error) {
      console.error('Error al obtener logs del módulo:', error);
      return [];
    }
  }

  /**
   * Obtiene logs recientes del sistema
   */
  async getRecentLogs(limit: number = 100) {
    try {
      const collection = await getCollection<ActivityLog>(this.collectionName);
      
      const logs = await collection
        .find({})
        .sort({ timestamp: -1 })
        .limit(limit)
        .toArray();
      
      return logs;
    } catch (error) {
      console.error('Error al obtener logs recientes:', error);
      return [];
    }
  }

  /**
   * Estadísticas de actividad
   */
  async getActivityStats(userId?: string) {
    try {
      const collection = await getCollection<ActivityLog>(this.collectionName);
      
      const filter = userId ? { user_id: userId } : {};
      
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      
      const [totalLogs, logsHoy, loginCount] = await Promise.all([
        collection.countDocuments(filter),
        collection.countDocuments({
          ...filter,
          timestamp: { $gte: hoy },
        }),
        collection.countDocuments({
          ...filter,
          activity_type: 'login',
        }),
      ]);
      
      return {
        total_logs: totalLogs,
        logs_hoy: logsHoy,
        total_logins: loginCount,
      };
    } catch (error) {
      console.error('Error al obtener estadísticas:', error);
      return {
        total_logs: 0,
        logs_hoy: 0,
        total_logins: 0,
      };
    }
  }

  /**
   * Obtiene la IP del cliente (mejor esfuerzo)
   */
  private async getClientIP(): Promise<string> {
    try {
      // En producción, esto debería venir del servidor
      // Por ahora retornamos 'unknown'
      return 'unknown';
    } catch {
      return 'unknown';
    }
  }
}

// Exportar instancia única del logger (Singleton)
export const activityLogger = new ActivityLogger();
