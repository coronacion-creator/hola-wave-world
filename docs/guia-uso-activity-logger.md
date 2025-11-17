# Guía de Uso del Activity Logger (MongoDB)

## Introducción

El sistema de Activity Logger registra automáticamente todas las actividades importantes del sistema en una base de datos MongoDB NoSQL. Esto incluye:

- ✅ Inicios y cierres de sesión
- ✅ Creación, actualización y eliminación de registros
- ✅ Visualización de datos sensibles
- ✅ Procesamiento de pagos
- ✅ Errores del sistema
- ✅ Alertas de seguridad

---

## 1. Logging Automático en Autenticación

El logging de autenticación está **configurado automáticamente** en `src/hooks/useAuth.tsx`:

### ✅ Login exitoso
```typescript
// Se registra automáticamente cuando el usuario inicia sesión
await activityLogger.logLogin(userId, email, userRole);
```

### ✅ Login fallido
```typescript
// Se registra automáticamente cuando falla el login
await activityLogger.logFailedLogin(email, errorMessage);
```

### ✅ Logout
```typescript
// Se registra automáticamente cuando el usuario cierra sesión
await activityLogger.logLogout(userId, email);
```

### ✅ Registro de nuevo usuario
```typescript
// Se registra automáticamente cuando se crea una cuenta
await activityLogger.log({
  user_id: userId,
  activity_type: 'signup',
  // ... más datos
});
```

---

## 2. Uso en Componentes React (Hook)

Para registrar actividades en tus componentes, usa el hook `useActivityLogger`:

### Ejemplo: Crear un estudiante

```typescript
import { useActivityLogger } from '@/hooks/useActivityLogger';

function EstudiantesComponent() {
  const { logCreate } = useActivityLogger();

  const handleCreateEstudiante = async (data) => {
    // 1. Crear el estudiante en PostgreSQL
    const { data: estudiante, error } = await supabase
      .from('estudiantes')
      .insert([data])
      .select()
      .single();

    if (!error && estudiante) {
      // 2. Registrar la acción en MongoDB
      await logCreate(
        'estudiantes',           // Módulo
        'estudiante',           // Tipo de entidad
        estudiante.id,          // ID del registro creado
        estudiante              // Datos completos
      );
    }
  };

  return (
    // ... tu componente
  );
}
```

### Ejemplo: Actualizar un estudiante

```typescript
const { logUpdate } = useActivityLogger();

const handleUpdateEstudiante = async (id, newData, oldData) => {
  const { data, error } = await supabase
    .from('estudiantes')
    .update(newData)
    .eq('id', id)
    .select()
    .single();

  if (!error) {
    await logUpdate(
      'estudiantes',
      'estudiante',
      id,
      oldData,     // Datos anteriores
      newData      // Datos nuevos
    );
  }
};
```

### Ejemplo: Eliminar un estudiante

```typescript
const { logDelete } = useActivityLogger();

const handleDeleteEstudiante = async (id, estudianteData) => {
  const { error } = await supabase
    .from('estudiantes')
    .delete()
    .eq('id', id);

  if (!error) {
    await logDelete(
      'estudiantes',
      'estudiante',
      id,
      estudianteData  // Datos del registro eliminado
    );
  }
};
```

### Ejemplo: Registrar pago

```typescript
const { logPayment } = useActivityLogger();

const handleProcesarPago = async (pagoData) => {
  const { data, error } = await supabase
    .from('pagos')
    .insert([pagoData])
    .select()
    .single();

  if (!error) {
    await logPayment(
      pagoData.estudiante_id,
      pagoData.monto,
      pagoData.metodo_pago,
      pagoData.concepto
    );
  }
};
```

### Ejemplo: Registrar visualización de datos

```typescript
const { logView } = useActivityLogger();

const handleVerEstudiantes = async (filters) => {
  // Consultar estudiantes
  const { data } = await supabase
    .from('estudiantes')
    .select('*');

  // Registrar que se consultaron estudiantes
  await logView(
    'estudiantes',
    'Consultó lista de estudiantes',
    filters  // Filtros aplicados (opcional)
  );
};
```

### Ejemplo: Registrar error

```typescript
const { logError } = useActivityLogger();

try {
  // Operación que puede fallar
  await algunaOperacionRiesgosa();
} catch (error) {
  // Registrar el error
  await logError(
    'estudiantes',
    error.message,
    error.stack
  );
}
```

---

## 3. Uso Directo del Logger (Sin Hook)

Si necesitas registrar actividades fuera de un componente React:

```typescript
import { activityLogger } from '@/services/activityLogger';

// Ejemplo: Edge Function o servicio puro
async function procesarMatricula(estudianteId: string) {
  // ... lógica de matrícula

  await activityLogger.log({
    user_id: estudianteId,
    user_email: 'estudiante@example.com',
    activity_type: 'create',
    module: 'matriculas',
    action_description: 'Estudiante se matriculó en curso',
    success: true,
    metadata: {
      curso_id: 'curso-123',
      periodo: '2025-1',
    },
  });
}
```

---

## 4. Consultar Logs

### Obtener logs de un usuario específico

```typescript
import { activityLogger } from '@/services/activityLogger';

const logs = await activityLogger.getUserLogs('user-id', 50);
console.log('Últimas 50 actividades del usuario:', logs);
```

### Obtener logs de un módulo

```typescript
const logs = await activityLogger.getModuleLogs('pagos', 100);
console.log('Últimas 100 actividades de pagos:', logs);
```

### Obtener logs recientes del sistema

```typescript
const logs = await activityLogger.getRecentLogs(200);
console.log('Últimas 200 actividades del sistema:', logs);
```

### Obtener estadísticas

```typescript
// Estadísticas globales
const stats = await activityLogger.getActivityStats();
console.log('Total logs:', stats.total_logs);
console.log('Logs hoy:', stats.logs_hoy);
console.log('Total logins:', stats.total_logins);

// Estadísticas de un usuario
const userStats = await activityLogger.getActivityStats('user-id');
```

---

## 5. Visualizar Logs en la Interfaz

El componente `LogsViewer` muestra los logs en tiempo real:

```typescript
import LogsViewer from '@/components/LogsViewer';

// En tu ruta de administración
<Route path="/admin/logs" element={<LogsViewer />} />
```

Este componente:
- 📊 Muestra estadísticas de actividad
- 📋 Lista todos los logs con detalles
- 🔍 Permite expandir metadatos
- 🎨 Usa iconos y colores según el tipo de actividad
- 🔒 Solo accesible para administradores

---

## 6. Tipos de Actividades Soportadas

| Tipo | Descripción | Uso |
|------|-------------|-----|
| `login` | Inicio de sesión | Automático |
| `logout` | Cierre de sesión | Automático |
| `signup` | Registro de usuario | Automático |
| `create` | Crear registro | Manual en cada módulo |
| `update` | Actualizar registro | Manual en cada módulo |
| `delete` | Eliminar registro | Manual en cada módulo |
| `view` | Ver datos | Opcional |
| `payment` | Procesar pago | Cuando se procese pago |
| `error` | Error del sistema | En catches |
| `security_alert` | Alerta de seguridad | Manual cuando detectes problemas |

---

## 7. Módulos Disponibles

| Módulo | Descripción |
|--------|-------------|
| `auth` | Autenticación y autorización |
| `estudiantes` | Gestión de estudiantes |
| `profesores` | Gestión de profesores |
| `cursos` | Gestión de cursos |
| `matriculas` | Proceso de matrículas |
| `pagos` | Pagos y finanzas |
| `evaluaciones` | Evaluaciones académicas |
| `inventario` | Control de inventario |
| `reportes` | Reportes y estadísticas |
| `configuracion` | Configuración del sistema |

---

## 8. Mejores Prácticas

### ✅ DO (Hacer)

- ✅ Registra todas las operaciones CRUD importantes
- ✅ Registra pagos y transacciones financieras
- ✅ Registra accesos a datos sensibles
- ✅ Incluye metadata útil para auditoría
- ✅ Maneja errores en los logs sin interrumpir el flujo

### ❌ DON'T (No hacer)

- ❌ No registres contraseñas ni tokens
- ❌ No registres datos personales innecesarios (GDPR)
- ❌ No lances errores si falla el logging
- ❌ No registres cada consulta SELECT trivial
- ❌ No almacenes datos sensibles sin encriptar

---

## 9. Estructura del Documento en MongoDB

```typescript
{
  _id: ObjectId("..."),
  
  // Usuario
  user_id: "uuid-del-usuario",
  user_email: "usuario@ejemplo.com",
  user_role: "admin",
  
  // Actividad
  activity_type: "create",
  module: "estudiantes",
  action_description: "Creó estudiante Juan Pérez",
  
  // Metadata flexible
  metadata: {
    entity_id: "estudiante-uuid",
    entity_type: "estudiante",
    new_data: { /* datos del estudiante */ },
    ip_address: "192.168.1.1",
    user_agent: "Chrome/...",
  },
  
  // Estado
  success: true,
  error_message: null,
  
  // Timestamps
  timestamp: ISODate("2025-11-17T12:34:56.789Z"),
  created_at: ISODate("2025-11-17T12:34:56.789Z")
}
```

---

## 10. Ejemplo Completo: Módulo de Pagos

```typescript
import { useActivityLogger } from '@/hooks/useActivityLogger';
import { supabase } from '@/integrations/supabase/client';

function PagosComponent() {
  const { logPayment, logError } = useActivityLogger();

  const procesarPago = async (pagoData) => {
    try {
      // 1. Insertar pago en PostgreSQL
      const { data: pago, error: errorPago } = await supabase
        .from('pagos')
        .insert([pagoData])
        .select()
        .single();

      if (errorPago) throw errorPago;

      // 2. Actualizar deuda del estudiante
      const { error: errorDeuda } = await supabase
        .from('deudas_estudiantes')
        .update({
          deuda_pendiente: /* ... */
        })
        .eq('estudiante_id', pagoData.estudiante_id);

      if (errorDeuda) throw errorDeuda;

      // 3. Registrar pago en MongoDB
      await logPayment(
        pagoData.estudiante_id,
        pagoData.monto,
        pagoData.metodo_pago,
        pagoData.concepto
      );

      return { success: true, pago };
    } catch (error) {
      // 4. Registrar error
      await logError(
        'pagos',
        error.message,
        error.stack
      );

      return { success: false, error };
    }
  };

  return (
    // ... UI del componente
  );
}
```

---

## 11. Consultas Útiles en MongoDB

Si necesitas consultar directamente en MongoDB:

```javascript
// Logs de hoy
db.activity_logs.find({
  timestamp: { $gte: new Date(new Date().setHours(0,0,0,0)) }
})

// Logins fallidos
db.activity_logs.find({
  activity_type: "login",
  success: false
})

// Actividad de un usuario específico
db.activity_logs.find({
  user_id: "uuid-del-usuario"
}).sort({ timestamp: -1 })

// Alertas de seguridad
db.activity_logs.find({
  activity_type: "security_alert"
})

// Contar logs por tipo
db.activity_logs.aggregate([
  { $group: { _id: "$activity_type", count: { $sum: 1 } } },
  { $sort: { count: -1 } }
])
```

---

## 12. Conclusión

El sistema de Activity Logger proporciona:

✅ **Auditoría completa** de todas las acciones del sistema  
✅ **Trazabilidad** para cumplimiento normativo  
✅ **Detección de anomalías** y problemas de seguridad  
✅ **Análisis de uso** para optimizar el sistema  
✅ **Recuperación de datos** en caso de errores

Recuerda: **El logging es automático para autenticación**, solo necesitas implementarlo manualmente en operaciones CRUD importantes.
