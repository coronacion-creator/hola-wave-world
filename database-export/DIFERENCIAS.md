# Diferencias entre Lovable Cloud y tu Supabase

## 🔄 Cambios que Deberás Hacer

### 1. Variables de Entorno

**Antes (Lovable Cloud):**
```env
VITE_SUPABASE_URL=https://envwnvzqvitevxqgdfpo.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGc...
VITE_SUPABASE_PROJECT_ID=envwnvzqvitevxqgdfpo
```

**Después (Tu Supabase):**
```env
VITE_SUPABASE_URL=https://TU-PROJECT-REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=TU-ANON-KEY
VITE_SUPABASE_PROJECT_ID=TU-PROJECT-REF
```

### 2. Edge Functions

**En Lovable Cloud:**
- Se despliegan automáticamente al hacer cambios
- Configuración en `supabase/config.toml`

**En tu Supabase:**
- Debes desplegarlas manualmente:
```bash
supabase functions deploy nombre-funcion
```
- Necesitas configurar secretos manualmente:
```bash
supabase secrets set SECRET_NAME=value
```

### 3. Gestión de Migraciones

**En Lovable Cloud:**
- Las migraciones se aplican automáticamente
- No tienes acceso directo a la consola SQL

**En tu Supabase:**
- Tienes control total vía SQL Editor
- Puedes usar el CLI para migraciones:
```bash
supabase migration new nombre_migracion
supabase db push
```

### 4. Monitoreo y Logs

**En Lovable Cloud:**
- Logs limitados a través de la interfaz de Lovable

**En tu Supabase:**
- Dashboard completo con:
  - Logs de Edge Functions
  - Métricas de base de datos
  - Monitoreo de API
  - Logs de autenticación

### 5. Configuración de Autenticación

**En Lovable Cloud:**
- Configuración limitada
- Auth pre-configurado

**En tu Supabase:**
- Control completo de:
  - Proveedores de OAuth
  - Plantillas de email
  - URLs de redirección
  - Configuración SMTP personalizada

## 💰 Costos

### Lovable Cloud
- Incluido en tu suscripción de Lovable
- Sin límites adicionales

### Tu Supabase
**Plan Gratuito:**
- 500 MB base de datos
- 1 GB ancho de banda
- 2 GB almacenamiento
- 2 millones invocaciones Edge Functions

**Plan Pro ($25/mes):**
- 8 GB base de datos
- 250 GB ancho de banda
- 100 GB almacenamiento
- Backups automáticos

## 🎯 Ventajas de tu Propio Supabase

### ✅ Pros
1. **Control Total**: Acceso completo al dashboard y SQL
2. **Escalabilidad**: Puedes elegir tu plan según necesidades
3. **Independencia**: No dependes de Lovable para el backend
4. **Backups**: Control sobre backups y restauración
5. **Monitoreo**: Métricas y logs detallados
6. **Personalización**: Configuración avanzada de auth y storage

### ❌ Contras
1. **Mantenimiento**: Debes gestionar el proyecto tú mismo
2. **Despliegues**: Edge Functions no se despliegan automáticamente
3. **Costos**: Potencialmente debes pagar según uso
4. **Complejidad**: Mayor responsabilidad técnica

## 🔧 Gestión Continua

### Backups (Recomendado)

**Configurar backups automáticos:**
1. Ve a **Settings** → **Database** → **Backups**
2. Habilita backups automáticos (Plan Pro)

**Backup manual:**
```bash
# Exportar estructura
pg_dump -h db.TU-PROJECT.supabase.co -U postgres --schema-only > backup-schema.sql

# Exportar datos
pg_dump -h db.TU-PROJECT.supabase.co -U postgres --data-only > backup-data.sql
```

### Actualizaciones de Seguridad

Revisa regularmente:
1. **Políticas RLS**: Asegúrate de que estén activas
2. **API Keys**: Rota keys si se comprometen
3. **Edge Functions**: Mantén dependencias actualizadas

### Monitoreo

Configura alertas para:
- Uso de CPU/Memoria alto
- Errores en Edge Functions
- Intentos de autenticación fallidos
- Límites de plan alcanzados

## 📊 Migración de Datos Paso a Paso

### Opción 1: Script SQL de Exportación

```sql
-- Ejemplo para tabla estudiantes
COPY (SELECT * FROM estudiantes) TO STDOUT WITH CSV HEADER;
```

Guarda el output y luego en tu Supabase:

```sql
COPY estudiantes FROM STDIN WITH CSV HEADER;
-- Pega los datos aquí
\.
```

### Opción 2: Usar pg_dump/pg_restore

```bash
# Exportar desde Lovable Cloud
pg_dump -h LOVABLE_HOST -U postgres --clean --if-exists > dump.sql

# Importar a tu Supabase
psql -h db.TU-PROJECT.supabase.co -U postgres < dump.sql
```

## 🚨 Checklist de Seguridad Post-Migración

- [ ] RLS habilitado en todas las tablas
- [ ] Políticas RLS validadas
- [ ] Service role key guardada de forma segura (nunca en el código)
- [ ] Anon key expuesta solo en frontend
- [ ] CORS configurado correctamente en Edge Functions
- [ ] Backups programados (Plan Pro)
- [ ] Monitoreo de logs activo
- [ ] Auth configurado con confirmación de email
- [ ] Rate limiting configurado (si es necesario)

## 💡 Consejos

1. **Empieza con el plan gratuito**: Prueba primero antes de pagar
2. **Monitorea el uso**: Revisa métricas para no exceder límites
3. **Documenta cambios**: Mantén registro de migraciones
4. **Testa en desarrollo**: Crea un proyecto de prueba primero
5. **Versiona las migraciones**: Usa git para trackear cambios en SQL

## 📚 Recursos Útiles

- [Documentación Oficial de Supabase](https://supabase.com/docs)
- [Supabase CLI Reference](https://supabase.com/docs/reference/cli)
- [Guía de RLS](https://supabase.com/docs/guides/auth/row-level-security)
- [Best Practices](https://supabase.com/docs/guides/database/best-practices)
- [Comunidad Discord](https://discord.supabase.com)

¡Buena suerte con tu migración! 🚀
