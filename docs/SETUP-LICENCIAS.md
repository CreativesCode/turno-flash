# Instalación del Sistema de Licencias

Este documento describe los pasos necesarios para activar el sistema de gestión de licencias en tu aplicación.

## ✅ Archivos Creados/Modificados

### Nuevos Archivos

1. **Base de Datos**
   - `supabase/migrations/008_add_license_management.sql` - Migración principal

2. **Utilidades**
   - `utils/license.ts` - Funciones de utilidad para gestión de licencias
   - `hooks/useLicense.ts` - Hook React para usar licencias fácilmente

3. **Componentes**
   - `components/license-notification.tsx` - Componentes de notificación de licencia

4. **Documentación**
   - `docs/license-management.md` - Documentación completa del sistema
   - `docs/env-configuration.md` - Configuración de variables de entorno
   - `docs/SETUP-LICENCIAS.md` - Este archivo

### Archivos Modificados

1. `types/organization.ts` - Agregados tipos de licencia
2. `app/dashboard/organizations/new/page.tsx` - Formulario con campos de licencia
3. `app/dashboard/organizations/page.tsx` - Lista con estado de licencias
4. `app/dashboard/page.tsx` - Integración de verificación de licencias

## 📋 Pasos de Instalación

### 1. Ejecutar Migración de Base de Datos

#### Opción A: Con Supabase CLI (Recomendado)

```bash
# Desde la raíz del proyecto
supabase db push
```

#### Opción B: Manualmente en Supabase Dashboard

1. Ve a tu proyecto en https://supabase.com
2. Navega a "SQL Editor"
3. Copia el contenido de `supabase/migrations/008_add_license_management.sql`
4. Pégalo en el editor y ejecuta

### 2. Configurar Variables de Entorno

Crea o actualiza tu archivo `.env.local` en la raíz del proyecto:

```env
# Configuración existente de Supabase
NEXT_PUBLIC_SUPABASE_URL=tu_url_de_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_clave_anon

# Nueva configuración de licencias
NEXT_PUBLIC_LICENSE_GRACE_PERIOD_DAYS=7

# Otras configuraciones
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Importante**: El valor de `NEXT_PUBLIC_LICENSE_GRACE_PERIOD_DAYS` define cuántos días de gracia tienen las organizaciones después de que expire su licencia.

### 3. Instalar Dependencias (si es necesario)

El sistema usa dependencias que ya están instaladas:
- `lucide-react` - Para iconos
- `@supabase/supabase-js` - Cliente de Supabase

Si por alguna razón no las tienes:

```bash
npm install lucide-react @supabase/supabase-js
```

### 4. Verificar la Instalación

#### Verificar la Base de Datos

Ejecuta esta consulta en el SQL Editor de Supabase:

```sql
-- Verificar que las nuevas columnas existen
SELECT 
  column_name, 
  data_type 
FROM information_schema.columns 
WHERE table_name = 'organizations' 
  AND column_name IN ('license_start_date', 'license_end_date', 'is_active');

-- Verificar que las funciones existen
SELECT 
  routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name IN ('check_license_status', 'get_my_organization_license_status');

-- Verificar que la vista existe
SELECT table_name 
FROM information_schema.views 
WHERE table_schema = 'public' 
  AND table_name = 'organizations_with_license_status';
```

Deberías ver 3 columnas, 2 funciones y 1 vista.

#### Probar la Aplicación

1. Reinicia el servidor de desarrollo:
   ```bash
   npm run dev
   ```

2. Inicia sesión como administrador

3. Ve a "Gestión de organizaciones"

4. Crea una nueva organización con fechas de licencia de prueba

5. Inicia sesión con un usuario de esa organización

6. Deberías ver notificaciones si la licencia está por expirar

## 🎯 Funcionalidades Implementadas

### Para Administradores

- ✅ Crear organizaciones con fechas de licencia
- ✅ Ver el estado de todas las licencias en la página de organizaciones
- ✅ Los administradores no son afectados por las licencias

### Para Usuarios de Organizaciones

- ✅ Ver notificaciones cuando la licencia está por expirar
- ✅ Ver notificaciones durante el período de gracia
- ✅ Bloqueo de acceso cuando la licencia expira completamente
- ✅ Pantalla informativa de licencia expirada

### Estados de Licencia

1. **Sin licencia configurada** - Acceso ilimitado
2. **Licencia activa** - Uso normal
3. **Por expirar** (≤7 días) - Notificación de advertencia
4. **Período de gracia** - Notificación urgente pero acceso permitido
5. **Expirada** - Acceso bloqueado

## 🧪 Testing

### Probar Licencia Activa

```sql
-- Establecer licencia que expira en 30 días
UPDATE organizations
SET 
  license_start_date = now(),
  license_end_date = now() + interval '30 days',
  is_active = true
WHERE slug = 'tu-organizacion';
```

### Probar Licencia Por Expirar

```sql
-- Establecer licencia que expira en 3 días
UPDATE organizations
SET 
  license_start_date = now() - interval '87 days',
  license_end_date = now() + interval '3 days',
  is_active = true
WHERE slug = 'tu-organizacion';
```

### Probar Período de Gracia

```sql
-- Establecer licencia expirada hace 2 días (dentro del período de gracia de 7 días)
UPDATE organizations
SET 
  license_start_date = now() - interval '92 days',
  license_end_date = now() - interval '2 days',
  is_active = true
WHERE slug = 'tu-organizacion';
```

### Probar Licencia Expirada

```sql
-- Establecer licencia expirada hace 10 días (fuera del período de gracia)
UPDATE organizations
SET 
  license_start_date = now() - interval '100 days',
  license_end_date = now() - interval '10 days',
  is_active = true
WHERE slug = 'tu-organizacion';
```

### Probar Sin Licencia

```sql
-- Eliminar fechas de licencia
UPDATE organizations
SET 
  license_start_date = NULL,
  license_end_date = NULL,
  is_active = true
WHERE slug = 'tu-organizacion';
```

## 📊 Consultas Útiles

### Ver Estado de Todas las Organizaciones

```sql
SELECT 
  name,
  slug,
  license_status,
  days_remaining,
  is_usable,
  license_message
FROM organizations_with_license_status
ORDER BY 
  CASE license_status
    WHEN 'expired' THEN 1
    WHEN 'grace_period' THEN 2
    WHEN 'active' THEN 3
    WHEN 'no_license' THEN 4
  END,
  days_remaining NULLS LAST;
```

### Ver Organizaciones Que Expiran Pronto

```sql
SELECT 
  name,
  slug,
  license_end_date,
  days_remaining
FROM organizations_with_license_status
WHERE license_status = 'active'
  AND days_remaining IS NOT NULL
  AND days_remaining <= 30
ORDER BY days_remaining;
```

### Ver Organizaciones en Período de Gracia

```sql
SELECT 
  name,
  slug,
  license_end_date,
  days_remaining,
  license_message
FROM organizations_with_license_status
WHERE license_status = 'grace_period'
ORDER BY days_remaining;
```

### Ver Organizaciones Bloqueadas

```sql
SELECT 
  name,
  slug,
  license_end_date,
  license_message
FROM organizations_with_license_status
WHERE license_status = 'expired'
ORDER BY license_end_date DESC;
```

## 🔧 Mantenimiento

### Renovar una Licencia

```sql
-- Extender licencia por 1 año más
UPDATE organizations
SET 
  license_end_date = license_end_date + interval '1 year'
WHERE slug = 'tu-organizacion';
```

### Desactivar una Organización Manualmente

```sql
-- Desactivar sin importar el estado de la licencia
UPDATE organizations
SET is_active = false
WHERE slug = 'tu-organizacion';
```

### Reactivar una Organización

```sql
-- Reactivar y establecer nueva licencia
UPDATE organizations
SET 
  is_active = true,
  license_start_date = now(),
  license_end_date = now() + interval '1 year'
WHERE slug = 'tu-organizacion';
```

## 📝 Notas Importantes

1. **Admins**: Los usuarios con rol `admin` nunca son afectados por las licencias
2. **Sin organización**: Los usuarios sin organización asignada tampoco son verificados
3. **Tiempo real**: El estado de la licencia se calcula en tiempo real al hacer login
4. **Período de gracia**: Es configurable pero aplica globalmente a todas las organizaciones
5. **Fechas opcionales**: Si una organización no tiene fechas de licencia, tiene acceso ilimitado

## 🐛 Troubleshooting

### No se muestran las notificaciones

1. Verifica que `.env.local` esté configurado correctamente
2. Verifica que la migración se ejecutó correctamente
3. Revisa la consola del navegador por errores
4. Verifica que el usuario tenga una organización asignada

### Usuario bloqueado incorrectamente

1. Verifica el estado en la base de datos:
   ```sql
   SELECT * FROM organizations_with_license_status WHERE slug = 'tu-organizacion';
   ```
2. Verifica que `is_active = true`
3. Verifica las fechas de licencia

### Cambios no se reflejan

1. Limpia el caché del navegador
2. Cierra sesión y vuelve a iniciar
3. Verifica que los cambios en la base de datos se guardaron correctamente

## 📚 Más Información

- Ver `docs/license-management.md` para documentación completa
- Ver `docs/env-configuration.md` para configuración de variables de entorno
- Ver ejemplos de uso del hook en `app/dashboard/page.tsx`

## ✨ Próximos Pasos Sugeridos

1. **Dashboard de Licencias**: Crear una página dedicada para gestionar licencias
2. **Notificaciones por Email**: Enviar emails antes de que expire una licencia
3. **Integración de Pagos**: Conectar con un sistema de pagos para renovación automática
4. **Reportes**: Generar reportes de uso y renovaciones
5. **API para Partners**: Permitir que integradores gestionen licencias via API
