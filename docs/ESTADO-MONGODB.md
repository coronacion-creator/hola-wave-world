# Estado de MongoDB en el Proyecto

## ⚠️ MongoDB Temporalmente Deshabilitado

**Fecha:** 17 de noviembre de 2025  
**Estado:** Deshabilitado  
**Razón:** Incompatibilidad del driver de MongoDB con Deno Edge Functions

---

## Problema Encontrado

El driver de MongoDB para Deno (`deno.land/x/mongo@v0.32.0`) presentaba errores de conexión TLS/SSL con MongoDB Atlas:

```
InvalidData: received fatal alert: InternalError
at WireProtocol.send (https://deno.land/x/mongo@v0.32.0/src/protocol/protocol.ts:68:13)
```

Este error impide que las Edge Functions se conecten correctamente a MongoDB Atlas.

---

## Solución Actual

El sistema de logging está **temporalmente deshabilitado**. Los logs ahora se registran en:

1. **Consola del navegador** (para desarrollo)
   - Presiona `F12` para abrir Developer Tools
   - Ve a la pestaña "Console"
   - Los logs aparecen con formato: `✅ Actividad: {...}`

2. **Console.log en el servidor** (Edge Functions logs)
   - Los logs se pueden ver en Cloud → Logs

---

## Estado del Código

### Archivos Modificados

1. **`src/services/activityLogger.ts`**
   - Función `callEdgeFunction()` deshabilitada
   - Registra logs solo en `console.log`
   - Métodos de consulta retornan arrays vacíos

2. **`src/components/LogsViewer.tsx`**
   - Muestra mensaje de "Temporalmente Deshabilitado"
   - Explica al usuario cómo ver logs en consola
   - Estadísticas muestran ceros

3. **`supabase/functions/activity-logger/index.ts`**
   - Edge Function mantiene código MongoDB (para futura reactivación)
   - No se está invocando actualmente

### Funcionalidad que SÍ Funciona

✅ Login/logout se registran en consola  
✅ Signup se registra en consola  
✅ Hook `useActivityLogger` funciona (log en consola)  
✅ No interfiere con el flujo principal de la aplicación  
✅ No causa errores en producción

---

## Opciones para el Futuro

### Opción 1: Usar Solo PostgreSQL (Recomendado)

**Ventajas:**
- Ya está funcionando perfectamente
- No requiere configuración adicional
- Más simple de mantener
- Queries más rápidos (misma DB)
- RLS policies ya implementadas

**Implementación:**
```sql
-- Crear tabla de logs en PostgreSQL
CREATE TABLE activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  activity_type TEXT NOT NULL,
  module TEXT NOT NULL,
  action_description TEXT NOT NULL,
  success BOOLEAN DEFAULT true,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_created_at ON activity_logs(created_at DESC);
CREATE INDEX idx_activity_logs_module ON activity_logs(module);

-- RLS Policy
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all logs"
ON activity_logs FOR SELECT
USING (has_role(auth.uid(), 'admin'));
```

### Opción 2: Reactivar MongoDB (Más Complejo)

**Requisitos:**
1. Usar MongoDB Atlas correctamente configurado
2. Instalar driver compatible con Deno:
   ```typescript
   // Opción A: Driver moderno de npm
   import { MongoClient } from 'npm:mongodb@6.3.0';
   
   // Opción B: Cliente REST HTTP
   // Usar MongoDB Data API (no requiere driver)
   ```

3. Configurar correctamente la URI de conexión
4. Asegurar que Network Access está abierto para Supabase IPs

**Pasos para reactivar:**
1. Actualizar `supabase/functions/activity-logger/index.ts`
2. Verificar conexión con MongoDB Atlas
3. Descomentar código en `src/services/activityLogger.ts`
4. Actualizar `LogsViewer.tsx`

### Opción 3: Usar Lovable AI para Logs (No Implementado)

Lovable Cloud podría usar su propia infraestructura de logs en lugar de MongoDB externo.

---

## Recomendación Final

### ✅ **Usar PostgreSQL para logs**

**Razones:**
1. ✅ Ya tienes PostgreSQL funcionando
2. ✅ No necesitas configuración externa
3. ✅ Consultas más rápidas (misma DB)
4. ✅ RLS policies ya implementadas
5. ✅ Backup automático incluido
6. ✅ Más simple de mantener

**Contra MongoDB:**
- ❌ Requiere configuración externa
- ❌ Driver incompatible con Deno
- ❌ Latencia adicional (DB externa)
- ❌ Costo adicional (MongoDB Atlas)
- ❌ Complejidad innecesaria

---

## Próximos Pasos

Si decides implementar logs:

### 1. PostgreSQL (Recomendado)
```bash
# Crear la tabla usando migration tool
supabase migration new create_activity_logs
```

### 2. MongoDB (Solo si es absolutamente necesario)
```bash
# Investigar driver compatible con Deno
# Configurar MongoDB Atlas correctamente
# Verificar conexión desde Edge Functions
```

---

## Archivos de Documentación Relacionados

- `docs/4.2-conexion-bases-datos.md` - Documentación de conexión (desactualizada)
- `docs/guia-uso-activity-logger.md` - Guía de uso (parcialmente válida)
- `docs/ejemplo-integracion-logger-pagos.md` - Ejemplo de uso (válido para estructura)

---

## Conclusión

MongoDB está **temporalmente deshabilitado** y el sistema funciona correctamente sin él. 

**Recomendación:** Migrar a PostgreSQL para logs o simplemente usar los logs nativos de Supabase Edge Functions.
