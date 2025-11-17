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
          MongoDB (Temporalmente Deshabilitado)
        </Badge>
      </div>

      <Card className="border-orange-200 bg-orange-50/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-orange-900">
            <AlertTriangle className="h-5 w-5" />
            Sistema de Logging Temporalmente Deshabilitado
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-orange-800 space-y-2">
            <p className="font-medium">MongoDB no está disponible actualmente debido a problemas de conexión.</p>
            
            <div className="pl-4 space-y-1">
              <p><strong>Estado actual:</strong> Los logs se registran en la consola del navegador</p>
              <p><strong>Causa:</strong> Driver de MongoDB incompatible con Deno/Edge Functions</p>
            </div>

            <div className="mt-4 p-3 bg-white rounded border border-orange-200">
              <p className="font-medium mb-2">Opciones disponibles:</p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Usar solo PostgreSQL para logs (más simple y ya funciona)</li>
                <li>Configurar MongoDB correctamente con un driver compatible</li>
                <li>Ver logs en la consola del navegador (F12 → Console)</li>
              </ul>
            </div>

            <div className="mt-4 p-3 bg-blue-50 rounded border border-blue-200">
              <p className="font-medium text-blue-900 mb-2">📊 Ver logs actuales:</p>
              <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800">
                <li>Presiona <kbd className="px-2 py-1 bg-white rounded border">F12</kbd> para abrir Developer Tools</li>
                <li>Ve a la pestaña <strong>Console</strong></li>
                <li>Los logs aparecen con formato: <code className="px-1 bg-white rounded">✅ Actividad: &#123;...&#125;</code></li>
              </ol>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Estadísticas (Inactivas)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 border rounded-lg opacity-50">
              <Activity className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <div className="text-2xl font-bold text-muted-foreground">0</div>
              <p className="text-xs text-muted-foreground">Total de Logs</p>
            </div>
            <div className="text-center p-4 border rounded-lg opacity-50">
              <Activity className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <div className="text-2xl font-bold text-muted-foreground">0</div>
              <p className="text-xs text-muted-foreground">Actividad Hoy</p>
            </div>
            <div className="text-center p-4 border rounded-lg opacity-50">
              <LogIn className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <div className="text-2xl font-bold text-muted-foreground">0</div>
              <p className="text-xs text-muted-foreground">Total Logins</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
