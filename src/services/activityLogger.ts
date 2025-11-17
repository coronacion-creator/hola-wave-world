/**
 * Servicio de Registro de Actividades (Activity Logger)
 * 
 * Este servicio se comunica con la Edge Function para registrar
 * actividades en MongoDB (backend).
 */

import { supabase } from '@/integrations/supabase/client';

/**
 * Tipos de actividades que se pueden registrar
 */
export type ActivityType = 
  | 'login'
  | 'logout'
  | 'signup'
  | 'create'
  | 'update'
  | 'delete'
  | 'view'
  | 'export'
  | 'payment'
  | 'error'
  | 'security_alert';

/**
 * Módulos del sistema
 */
export type ActivityModule = 
  | 'auth'
  | 'estudiantes'
  | 'profesores'
  | 'cursos'
  | 'matriculas'
  | 'pagos'
  | 'evaluaciones'
  | 'inventario'
  | 'reportes'
  | 'configuracion';

/**
 * Interfaz del documento de log
 */
export interface ActivityLog {
  _id?: string;
  user_id: string;
  user_email?: string;
  user_role?: string;
  activity_type: ActivityType;
  module: ActivityModule;
  action_description: string;
  metadata?: {
    entity_id?: string;
    entity_type?: string;
    previous_data?: any;
    new_data?: any;
    ip_address?: string;
    user_agent?: string;
    [key: string]: any;
  };
  timestamp: Date;
  created_at: Date;
  success: boolean;
  error_message?: string;
  duration_ms?: number;
}

/**
 * Clase principal del Activity Logger
 */
class ActivityLogger {
  /**
   * NOTA: MongoDB deshabilitado temporalmente debido a problemas de conexión.
   * Los logs se registran en consola hasta que se configure correctamente.
   */
  private async callEdgeFunction(action: string, data: any): Promise<any> {
    // Temporalmente deshabilitado - solo log en consola
    console.log('📝 [Activity Logger - Temporalmente en consola]', { action, ...data });
    return null;
  }

  /**
   * Registra una actividad (actualmente solo en consola)
   */
  async log(logData: Omit<ActivityLog, '_id' | 'timestamp' | 'created_at'>): Promise<string | null> {
    try {
      // Temporalmente solo log en consola
      console.log('✅ Actividad:', {
        type: logData.activity_type,
        module: logData.module,
        description: logData.action_description,
        user: logData.user_email,
      });
      return 'console-log';
    } catch (error) {
      console.error('❌ Error al registrar actividad:', error);
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
   * Obtiene los últimos logs de un usuario (temporalmente retorna vacío)
   */
  async getUserLogs(userId: string, limit: number = 50) {
    console.log('📊 getUserLogs llamado para:', userId);
    return []; // Temporalmente vacío
  }

  /**
   * Obtiene logs por módulo (temporalmente retorna vacío)
   */
  async getModuleLogs(module: ActivityModule, limit: number = 100) {
    console.log('📊 getModuleLogs llamado para:', module);
    return []; // Temporalmente vacío
  }

  /**
   * Obtiene logs recientes del sistema (temporalmente retorna vacío)
   */
  async getRecentLogs(limit: number = 100) {
    console.log('📊 getRecentLogs llamado');
    return []; // Temporalmente vacío
  }

  /**
   * Estadísticas de actividad (temporalmente retorna ceros)
   */
  async getActivityStats(userId?: string) {
    console.log('📊 getActivityStats llamado');
    return {
      total_logs: 0,
      logs_hoy: 0,
      total_logins: 0,
    };
  }
}

// Exportar instancia única del logger (Singleton)
export const activityLogger = new ActivityLogger();
