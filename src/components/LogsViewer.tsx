/**
 * Componente para visualizar los logs de actividad del sistema
 * Solo accesible para administradores
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { activityLogger, ActivityLog } from '@/services/activityLogger';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Activity,
  LogIn,
  LogOut,
  UserPlus,
  FileText,
  Edit,
  Trash,
  Eye,
  DollarSign,
  AlertTriangle,
  ShieldAlert,
} from 'lucide-react';

const activityIcons: Record<string, any> = {
  login: LogIn,
  logout: LogOut,
  signup: UserPlus,
  create: FileText,
  update: Edit,
  delete: Trash,
  view: Eye,
  payment: DollarSign,
  error: AlertTriangle,
  security_alert: ShieldAlert,
};

const activityColors: Record<string, string> = {
  login: 'bg-green-500',
  logout: 'bg-gray-500',
  signup: 'bg-blue-500',
  create: 'bg-emerald-500',
  update: 'bg-yellow-500',
  delete: 'bg-red-500',
  view: 'bg-purple-500',
  payment: 'bg-indigo-500',
  error: 'bg-red-600',
  security_alert: 'bg-orange-600',
};

export default function LogsViewer() {
  const { role } = useAuth();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total_logs: 0,
    logs_hoy: 0,
    total_logins: 0,
  });

  useEffect(() => {
    loadLogs();
    loadStats();
  }, []);

  const loadLogs = async () => {
    try {
      setLoading(true);
      const recentLogs = await activityLogger.getRecentLogs(100);
      setLogs(recentLogs);
    } catch (error) {
      console.error('Error al cargar logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const statistics = await activityLogger.getActivityStats();
      setStats(statistics);
    } catch (error) {
      console.error('Error al cargar estadísticas:', error);
    }
  };

  // Solo admins pueden ver los logs
  if (role !== 'admin') {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6">
            <p className="text-center text-muted-foreground">
              No tienes permisos para ver los logs del sistema.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Logs de Actividad del Sistema</h1>
        <Badge variant="outline" className="text-sm">
          MongoDB NoSQL
        </Badge>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Logs</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_logs}</div>
            <p className="text-xs text-muted-foreground">Registros totales</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Actividad Hoy</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.logs_hoy}</div>
            <p className="text-xs text-muted-foreground">Registros hoy</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Logins</CardTitle>
            <LogIn className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_logins}</div>
            <p className="text-xs text-muted-foreground">Inicios de sesión</p>
          </CardContent>
        </Card>
      </div>

      {/* Lista de logs */}
      <Card>
        <CardHeader>
          <CardTitle>Actividad Reciente</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Cargando logs...</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No hay logs disponibles</p>
            </div>
          ) : (
            <ScrollArea className="h-[600px] w-full">
              <div className="space-y-4">
                {logs.map((log) => {
                  const Icon = activityIcons[log.activity_type] || Activity;
                  const color = activityColors[log.activity_type] || 'bg-gray-500';

                  return (
                    <div
                      key={log._id}
                      className="flex items-start space-x-4 p-4 border rounded-lg hover:bg-accent transition-colors"
                    >
                      <div className={`${color} p-2 rounded-full text-white`}>
                        <Icon className="h-4 w-4" />
                      </div>

                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between">
                          <p className="font-medium">{log.action_description}</p>
                          <Badge variant={log.success ? 'default' : 'destructive'}>
                            {log.success ? 'Éxito' : 'Error'}
                          </Badge>
                        </div>

                        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                          <span>{log.user_email || log.user_id}</span>
                          <span>•</span>
                          <span>{log.module}</span>
                          <span>•</span>
                          <span>
                            {format(new Date(log.timestamp), "d 'de' MMMM 'a las' HH:mm", {
                              locale: es,
                            })}
                          </span>
                        </div>

                        {log.error_message && (
                          <p className="text-sm text-destructive mt-2">
                            Error: {log.error_message}
                          </p>
                        )}

                        {log.metadata && Object.keys(log.metadata).length > 0 && (
                          <details className="mt-2">
                            <summary className="text-sm text-muted-foreground cursor-pointer hover:text-foreground">
                              Ver detalles
                            </summary>
                            <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-x-auto">
                              {JSON.stringify(log.metadata, null, 2)}
                            </pre>
                          </details>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
