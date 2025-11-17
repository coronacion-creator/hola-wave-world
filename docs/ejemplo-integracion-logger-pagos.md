# Ejemplo de Integración: Activity Logger en Módulo de Pagos

## Escenario Real

Vamos a implementar el logging completo en el módulo de pagos, registrando:
1. Creación de nuevos pagos
2. Reversión de pagos
3. Consulta de historial de pagos
4. Errores durante el procesamiento

---

## Implementación Paso a Paso

### 1. Importar el Hook

```typescript
import { useActivityLogger } from '@/hooks/useActivityLogger';
```

### 2. Inicializar en el Componente

```typescript
function PagosComponent() {
  const { logPayment, logView, logError, logUpdate } = useActivityLogger();
  const [pagos, setPagos] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // ... resto del código
}
```

### 3. Registrar al Cargar Datos

```typescript
const cargarPagos = async () => {
  try {
    setLoading(true);
    
    const { data, error } = await supabase
      .from('pagos')
      .select(`
        *,
        estudiantes (nombres, apellidos, dni),
        sedes (nombre)
      `)
      .order('fecha_pago', { ascending: false });

    if (error) throw error;

    setPagos(data || []);
    
    // 📝 Registrar consulta de pagos
    await logView(
      'pagos',
      'Consultó lista completa de pagos',
      {
        total_registros: data?.length || 0,
        filtros_aplicados: null,
      }
    );
    
  } catch (error) {
    console.error('Error al cargar pagos:', error);
    
    // 📝 Registrar error
    await logError(
      'pagos',
      'Error al cargar lista de pagos',
      error.stack
    );
  } finally {
    setLoading(false);
  }
};
```

### 4. Registrar al Procesar Pago

```typescript
const procesarPago = async (datosPago: {
  estudiante_id: string;
  sede_id: string;
  monto: number;
  concepto: string;
  metodo_pago: string;
}) => {
  try {
    setLoading(true);

    // 1. Crear pago en PostgreSQL
    const { data: pago, error: errorPago } = await supabase
      .from('pagos')
      .insert([{
        ...datosPago,
        estado: 'completado',
        fecha_pago: new Date().toISOString(),
      }])
      .select()
      .single();

    if (errorPago) throw errorPago;

    // 2. Actualizar deuda del estudiante
    const { error: errorDeuda } = await supabase.rpc(
      'procesar_pago',
      {
        p_estudiante_id: datosPago.estudiante_id,
        p_sede_id: datosPago.sede_id,
        p_monto: datosPago.monto,
        p_concepto: datosPago.concepto,
        p_metodo_pago: datosPago.metodo_pago,
      }
    );

    if (errorDeuda) throw errorDeuda;

    // 3. 📝 Registrar pago en MongoDB
    await logPayment(
      datosPago.estudiante_id,
      datosPago.monto,
      datosPago.metodo_pago,
      datosPago.concepto
    );

    toast.success('Pago procesado exitosamente');
    
    // Recargar lista de pagos
    await cargarPagos();
    
    return { success: true, pago };
    
  } catch (error: any) {
    console.error('Error al procesar pago:', error);
    
    // 📝 Registrar error crítico
    await logError(
      'pagos',
      `Error al procesar pago: ${error.message}`,
      error.stack
    );
    
    toast.error('Error al procesar el pago');
    return { success: false, error };
    
  } finally {
    setLoading(false);
  }
};
```

### 5. Registrar al Revertir Pago

```typescript
const revertirPago = async (pagoId: string, pagoData: any) => {
  try {
    setLoading(true);

    // Llamar a la función de Supabase para revertir
    const { data, error } = await supabase.rpc('revertir_pago', {
      p_pago_id: pagoId,
    });

    if (error) throw error;

    // 📝 Registrar reversión como actualización
    await logUpdate(
      'pagos',
      'pago',
      pagoId,
      { ...pagoData, estado: 'completado' },  // Estado anterior
      { ...pagoData, estado: 'revertido' }    // Estado nuevo
    );

    toast.success('Pago revertido exitosamente');
    await cargarPagos();
    
    return { success: true };
    
  } catch (error: any) {
    console.error('Error al revertir pago:', error);
    
    await logError(
      'pagos',
      `Error al revertir pago ${pagoId}: ${error.message}`,
      error.stack
    );
    
    toast.error('Error al revertir el pago');
    return { success: false, error };
    
  } finally {
    setLoading(false);
  }
};
```

### 6. Registrar Exportación de Datos

```typescript
const exportarPagos = async (formato: 'csv' | 'pdf') => {
  try {
    // Lógica de exportación...
    const resultado = await generarReporte(pagos, formato);

    // 📝 Registrar exportación
    await logActivity(
      'export',
      'pagos',
      `Exportó reporte de pagos en formato ${formato.toUpperCase()}`,
      {
        formato,
        total_registros: pagos.length,
        fecha_exportacion: new Date().toISOString(),
      }
    );

    return resultado;
    
  } catch (error: any) {
    await logError(
      'pagos',
      `Error al exportar pagos en ${formato}`,
      error.stack
    );
  }
};
```

---

## Componente Completo con Logging

```typescript
import { useState, useEffect } from 'react';
import { useActivityLogger } from '@/hooks/useActivityLogger';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, Download, RotateCcw } from 'lucide-react';

interface Pago {
  id: string;
  estudiante_id: string;
  monto: number;
  concepto: string;
  metodo_pago: string;
  estado: string;
  fecha_pago: string;
  estudiantes?: {
    nombres: string;
    apellidos: string;
    dni: string;
  };
}

export default function PagosConLogging() {
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [loading, setLoading] = useState(false);
  
  // 🎯 Hook de logging
  const { 
    logPayment, 
    logView, 
    logError, 
    logUpdate,
    logActivity 
  } = useActivityLogger();

  useEffect(() => {
    cargarPagos();
  }, []);

  // 📊 Cargar pagos con logging
  const cargarPagos = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('pagos')
        .select(`
          *,
          estudiantes (nombres, apellidos, dni)
        `)
        .order('fecha_pago', { ascending: false });

      if (error) throw error;

      setPagos(data || []);
      
      // 📝 Log de consulta
      await logView(
        'pagos',
        'Consultó lista de pagos',
        { total: data?.length || 0 }
      );
      
    } catch (error: any) {
      console.error('Error:', error);
      
      // 📝 Log de error
      await logError('pagos', error.message, error.stack);
      toast.error('Error al cargar pagos');
      
    } finally {
      setLoading(false);
    }
  };

  // 💰 Procesar nuevo pago
  const procesarNuevoPago = async (datosPago: any) => {
    try {
      setLoading(true);

      const { data: pago, error } = await supabase
        .from('pagos')
        .insert([datosPago])
        .select()
        .single();

      if (error) throw error;

      // 📝 Log de pago procesado
      await logPayment(
        datosPago.estudiante_id,
        datosPago.monto,
        datosPago.metodo_pago,
        datosPago.concepto
      );

      toast.success('Pago procesado');
      await cargarPagos();
      
    } catch (error: any) {
      await logError('pagos', error.message, error.stack);
      toast.error('Error al procesar pago');
    } finally {
      setLoading(false);
    }
  };

  // 🔄 Revertir pago
  const revertirPago = async (pago: Pago) => {
    try {
      setLoading(true);

      const { error } = await supabase.rpc('revertir_pago', {
        p_pago_id: pago.id,
      });

      if (error) throw error;

      // 📝 Log de reversión
      await logUpdate(
        'pagos',
        'pago',
        pago.id,
        { ...pago, estado: 'completado' },
        { ...pago, estado: 'revertido' }
      );

      toast.success('Pago revertido');
      await cargarPagos();
      
    } catch (error: any) {
      await logError('pagos', error.message, error.stack);
      toast.error('Error al revertir pago');
    } finally {
      setLoading(false);
    }
  };

  // 📥 Exportar reporte
  const exportarReporte = async () => {
    try {
      // Lógica de exportación...
      
      // 📝 Log de exportación
      await logActivity(
        'export',
        'pagos',
        'Exportó reporte de pagos',
        { formato: 'CSV', registros: pagos.length }
      );

      toast.success('Reporte exportado');
      
    } catch (error: any) {
      await logError('pagos', error.message, error.stack);
      toast.error('Error al exportar');
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Gestión de Pagos
        </CardTitle>
        <Button onClick={exportarReporte} variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          Exportar
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p>Cargando...</p>
        ) : (
          <div className="space-y-4">
            {pagos.map((pago) => (
              <div
                key={pago.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div>
                  <p className="font-medium">
                    {pago.estudiantes?.nombres} {pago.estudiantes?.apellidos}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    S/. {pago.monto} - {pago.concepto}
                  </p>
                </div>
                
                {pago.estado === 'completado' && (
                  <Button
                    onClick={() => revertirPago(pago)}
                    variant="outline"
                    size="sm"
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Revertir
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

---

## Verificación de Logs

Para verificar que los logs se están guardando correctamente:

### 1. En el navegador (consola)

```javascript
// Abrir consola del navegador y ejecutar:
import { activityLogger } from '@/services/activityLogger';

// Ver logs recientes
const logs = await activityLogger.getRecentLogs(10);
console.table(logs);

// Ver estadísticas
const stats = await activityLogger.getActivityStats();
console.log(stats);
```

### 2. En el componente LogsViewer

Navega a: **Admin Dashboard → Logs** para ver todos los registros en tiempo real.

### 3. Directamente en MongoDB

Si tienes acceso a MongoDB Atlas:

```javascript
// Conectar a tu cluster
use school_management

// Ver últimos 10 logs
db.activity_logs.find().sort({ timestamp: -1 }).limit(10).pretty()

// Contar logs por tipo
db.activity_logs.aggregate([
  { $group: { _id: "$activity_type", count: { $sum: 1 } } }
])

// Ver logs de pagos
db.activity_logs.find({ module: "pagos" }).sort({ timestamp: -1 })
```

---

## Resumen de Implementación

✅ **4 líneas de código** agregadas por operación:
```typescript
await logPayment(estudianteId, monto, metodoPago, concepto);
```

✅ **Mínima interferencia** con la lógica de negocio

✅ **No bloquea la ejecución** si MongoDB falla

✅ **Auditoría completa** de todas las operaciones

✅ **Trazabilidad** para cumplimiento normativo

✅ **Detección de anomalías** y patrones de uso

---

## Próximos Pasos

1. ✅ Implementar en **Estudiantes**
2. ✅ Implementar en **Profesores**  
3. ✅ Implementar en **Matrículas**
4. ✅ Implementar en **Evaluaciones**
5. ✅ Implementar en **Inventario**

Copia este patrón en cada módulo para tener logging completo del sistema.
