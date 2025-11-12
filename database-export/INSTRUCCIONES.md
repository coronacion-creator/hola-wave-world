# Instrucciones para Importar la Base de Datos a Supabase

Este directorio contiene todo el esquema de la base de datos del Sistema de Gestión Educativa para que puedas importarlo a tu propia instancia de Supabase.

## 📋 Contenido

- `schema-completo.sql` - Esquema completo de la base de datos con:
  - Enums (tipos personalizados)
  - Todas las tablas
  - Funciones de base de datos
  - Triggers
  - Políticas RLS (Row Level Security)

## 🚀 Pasos para Importar

### 1. Crear un Proyecto en Supabase

1. Ve a [https://supabase.com](https://supabase.com)
2. Crea una cuenta o inicia sesión
3. Crea un nuevo proyecto
4. Guarda las credenciales (URL y API Keys)

### 2. Ejecutar el Script SQL

#### Opción A: Desde el Dashboard de Supabase (Recomendado)

1. En tu proyecto de Supabase, ve a **SQL Editor**
2. Haz clic en **+ New query**
3. Copia todo el contenido del archivo `schema-completo.sql`
4. Pégalo en el editor
5. Haz clic en **Run** o presiona `Ctrl + Enter`

#### Opción B: Desde la Línea de Comandos (Avanzado)

```bash
# Instala el CLI de Supabase
npm install -g supabase

# Inicia sesión
supabase login

# Conecta a tu proyecto
supabase link --project-ref TU_PROJECT_REF

# Ejecuta el script
psql postgresql://postgres:[YOUR-PASSWORD]@[YOUR-PROJECT-REF].supabase.co:5432/postgres -f schema-completo.sql
```

### 3. Verificar la Importación

Después de ejecutar el script, verifica que:

1. **Tablas creadas**: Ve a **Table Editor** y confirma que todas las tablas están presentes
2. **Funciones creadas**: Ve a **Database** → **Functions** 
3. **RLS habilitado**: Verifica que las políticas RLS estén activas en **Authentication** → **Policies**

### 4. Configurar Autenticación

1. Ve a **Authentication** → **Settings**
2. Configura los métodos de autenticación que necesites (Email, etc.)
3. **IMPORTANTE**: Habilita "Confirm email" si quieres que los usuarios confirmen su email

### 5. Obtener las Credenciales

1. Ve a **Settings** → **API**
2. Copia:
   - `Project URL`
   - `anon/public key`
   - `service_role key` (mantén esto secreto)

### 6. Actualizar tu Aplicación

Actualiza el archivo `.env` en tu proyecto con las nuevas credenciales:

```env
VITE_SUPABASE_URL="https://TU-PROJECT-REF.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="tu-anon-key"
VITE_SUPABASE_PROJECT_ID="tu-project-ref"
```

## 📊 Migrar Datos Existentes

Si necesitas migrar los datos existentes de Lovable Cloud a tu Supabase:

### Método 1: Exportación Manual por Tabla

Para cada tabla importante:

```sql
-- En Lovable Cloud (SQL Editor)
SELECT * FROM estudiantes;
-- Copia los resultados

-- En tu Supabase
INSERT INTO estudiantes (columna1, columna2, ...) VALUES (...);
```

### Método 2: Usando el CLI (Recomendado para grandes volúmenes)

```bash
# Exportar desde Lovable Cloud
pg_dump -h [LOVABLE-HOST] -U postgres -t tabla_nombre --data-only --column-inserts > datos.sql

# Importar a tu Supabase
psql -h [TU-SUPABASE-HOST] -U postgres -d postgres -f datos.sql
```

## 🔐 Configurar Edge Functions (Opcional)

Si usas Edge Functions, deberás:

1. Copiar las funciones de `supabase/functions/` 
2. Desplegarlas en tu proyecto:

```bash
supabase functions deploy init-admin
supabase functions deploy create-user-with-role
supabase functions deploy assign-admin-role
```

3. Configurar los secretos necesarios:

```bash
supabase secrets set NOMBRE_SECRET=valor
```

## ⚙️ Configuración Adicional

### Storage Buckets (Si los usas)

Si tu aplicación usa almacenamiento de archivos, crea los buckets manualmente en:
**Storage** → **Create bucket**

### Realtime (Si lo usas)

Para habilitar realtime en tablas específicas:

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.nombre_tabla;
```

## ❗ Consideraciones Importantes

1. **Costos**: Revisa el plan de Supabase que necesitas según tu uso
2. **Límites**: El plan gratuito tiene límites de:
   - 500 MB de base de datos
   - 1 GB de ancho de banda
   - 2 GB de almacenamiento de archivos
3. **Backups**: Configura backups automáticos en proyectos de producción
4. **Seguridad**: Nunca expongas tu `service_role key` en el frontend

## 🆘 Solución de Problemas

### Error: "permission denied for schema public"
```sql
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO anon;
GRANT ALL ON SCHEMA public TO authenticated;
```

### Error: "relation already exists"
- El script está diseñado para no fallar si las tablas ya existen (`IF NOT EXISTS`)
- Si ves este error, algunas tablas pueden estar duplicadas

### Las políticas RLS no funcionan
1. Verifica que RLS esté habilitado: `ALTER TABLE tabla ENABLE ROW LEVEL SECURITY;`
2. Revisa que las funciones `has_role()` y `get_user_role()` existan
3. Confirma que los usuarios tengan roles asignados en `user_roles`

## 📞 Soporte

Si tienes problemas:
- Revisa la documentación de Supabase: [https://supabase.com/docs](https://supabase.com/docs)
- Comunidad de Supabase: [https://github.com/supabase/supabase/discussions](https://github.com/supabase/supabase/discussions)

## ✅ Checklist Post-Migración

- [ ] Todas las tablas importadas correctamente
- [ ] Funciones de base de datos funcionando
- [ ] Políticas RLS activas
- [ ] Usuario admin creado (usando edge function `init-admin`)
- [ ] Credenciales actualizadas en `.env`
- [ ] Edge Functions desplegadas (si aplica)
- [ ] Storage buckets creados (si aplica)
- [ ] Datos migrados (si aplica)
- [ ] Aplicación funcionando con el nuevo backend
- [ ] Pruebas de autenticación exitosas

¡Listo! Tu base de datos debería estar funcionando en tu propio Supabase.
