# Sistema de Gestión de Licencias

Este documento describe el sistema de gestión de licencias implementado para las organizaciones en la aplicación.

## Descripción General

El sistema permite gestionar licencias por organización con las siguientes características:

- **Fechas de vigencia**: Cada organización puede tener una fecha de inicio y fin de licencia
- **Período de gracia**: Configurable en días (por defecto 7 días)
- **Notificaciones**: Los usuarios reciben notificaciones cuando la licencia está por expirar o ha expirado
- **Bloqueo automático**: Después del período de gracia, la organización queda bloqueada

## Estados de Licencia

### 1. `active` - Licencia Activa
- La licencia está vigente
- El usuario puede usar la aplicación sin restricciones
- Si quedan menos de 7 días, se muestra una notificación de advertencia

### 2. `grace_period` - Período de Gracia
- La licencia ha expirado pero aún está en el período de gracia
- El usuario puede seguir usando la aplicación
- Se muestran notificaciones urgentes indicando que debe renovar
- Indica cuántos días quedan antes del bloqueo

### 3. `expired` - Licencia Expirada
- La licencia expiró y el período de gracia terminó
- La organización está bloqueada y no puede usar la aplicación
- Se muestra una pantalla de bloqueo

### 4. `no_license` - Sin Licencia Configurada
- No se han configurado fechas de licencia
- La organización tiene acceso ilimitado
- No se muestran notificaciones

## Configuración

### Variables de Entorno

Crea un archivo `.env.local` con:

```env
NEXT_PUBLIC_LICENSE_GRACE_PERIOD_DAYS=7
```

Este valor define cuántos días de gracia tiene una organización después de que expire su licencia.

### Base de Datos

Ejecuta la migración `008_add_license_management.sql` para agregar las funcionalidades:

```bash
# Con Supabase CLI
supabase db push

# O directamente en el SQL Editor de Supabase
```

La migración agrega:
- Campos `license_start_date`, `license_end_date`, `is_active` a `organizations`
- Función `check_license_status()` para verificar estado
- Función `get_my_organization_license_status()` para obtener el estado del usuario actual
- Vista `organizations_with_license_status` para consultas

## Uso en la Aplicación

### 1. Hook `useLicense()`

El hook más fácil de usar para verificar el estado de licencia:

```typescript
import { useLicense } from "@/hooks/useLicense";

function MyComponent() {
  const {
    licenseStatus,      // Objeto completo del estado
    loading,            // Si está cargando
    error,              // Error si ocurrió
    canUse,             // Boolean: puede usar la app
    shouldShowNotification, // Boolean: debe mostrar notificación
    isBlocked,          // Boolean: está bloqueado
    isInGracePeriod,    // Boolean: está en período de gracia
    isExpired,          // Boolean: está expirada
    isActive,           // Boolean: está activa
    daysRemaining,      // Número de días restantes
    title,              // Título del mensaje
    message,            // Mensaje descriptivo
    alertType,          // Tipo de alerta: 'error' | 'warning' | 'info'
  } = useLicense();

  if (isBlocked) {
    return <div>Acceso bloqueado</div>;
  }

  return (
    <div>
      {shouldShowNotification && <Alert>{message}</Alert>}
      {/* Tu contenido */}
    </div>
  );
}
```

### 2. Componentes de Notificación

#### `LicenseNotification`

Notificación completa con información detallada:

```typescript
import { LicenseNotification } from "@/components/license-notification";

<LicenseNotification
  licenseStatus={licenseStatus}
  onClose={() => console.log("Cerrada")}
  dismissible={true}
/>
```

#### `LicenseNotificationBanner`

Banner compacto para la parte superior:

```typescript
import { LicenseNotificationBanner } from "@/components/license-notification";

<LicenseNotificationBanner licenseStatus={licenseStatus} />
```

### 3. Funciones de Utilidad

Si prefieres no usar el hook:

```typescript
import {
  getMyOrganizationLicenseStatus,
  canUseApplication,
  shouldShowLicenseNotification,
  getLicenseAlertType,
  getLicenseMessageTitle,
  formatLicenseMessage,
  getGracePeriodDays,
} from "@/utils/license";

// Obtener estado
const status = await getMyOrganizationLicenseStatus();

// Verificar si puede usar
const canUse = canUseApplication(status);

// Verificar si mostrar notificación
const showNotif = shouldShowLicenseNotification(status);

// Obtener período de gracia configurado
const graceDays = getGracePeriodDays(); // 7 por defecto
```

## Crear Organización con Licencia

Al crear una organización desde el formulario `/dashboard/organizations/new`, puedes especificar:

- **Fecha de inicio**: Cuándo comienza la licencia
- **Fecha de fin**: Cuándo expira la licencia

Si dejas estos campos vacíos, la organización tendrá acceso ilimitado.

### Ejemplo via API

```typescript
const params: CreateOrganizationParams = {
  org_name: "Mi Empresa",
  org_slug: "mi-empresa",
  org_timezone: "America/Argentina/Buenos_Aires",
  owner_user_id: "user-uuid",
  license_start_date: "2024-01-01T00:00:00Z",
  license_end_date: "2024-12-31T23:59:59Z",
};

const { data, error } = await supabase.rpc(
  "create_organization_with_owner",
  params
);
```

## Verificación Manual en SQL

Puedes verificar el estado de una organización directamente:

```sql
-- Ver estado de una organización específica
SELECT * FROM check_license_status(
  'organization-uuid-here',
  7  -- días de gracia
);

-- Ver todas las organizaciones con su estado
SELECT * FROM organizations_with_license_status;

-- Ver el estado de licencia del usuario actual
SELECT * FROM get_my_organization_license_status(7);
```

## Comportamiento por Rol

### Admin
- No se verifica licencia (acceso ilimitado)
- No ve notificaciones de licencia
- Puede crear y gestionar licencias de organizaciones

### Owner / Staff / Special
- Se verifica licencia de su organización
- Ven notificaciones cuando corresponde
- Quedan bloqueados si la licencia expira completamente

## Flujo de Usuario

1. **Licencia activa con más de 7 días**
   - Uso normal sin notificaciones

2. **Licencia activa con menos de 7 días**
   - Notificación de advertencia: "Tu licencia expirará en X días"

3. **Licencia expirada (período de gracia)**
   - Notificación urgente: "Licencia vencida - X días de gracia restantes"
   - Puede seguir usando la aplicación

4. **Licencia expirada sin período de gracia**
   - Pantalla de bloqueo
   - No puede acceder a ninguna funcionalidad
   - Debe contactar al administrador

## Renovación de Licencia

Para renovar una licencia, un administrador debe:

1. Ir a la gestión de organizaciones
2. Actualizar los campos `license_start_date` y `license_end_date`
3. Los cambios se reflejan inmediatamente

### SQL directo:

```sql
UPDATE organizations
SET 
  license_start_date = '2024-01-01T00:00:00Z',
  license_end_date = '2025-01-01T00:00:00Z'
WHERE id = 'organization-uuid';
```

## Desactivación Manual

Además de la expiración automática, puedes desactivar una organización manualmente:

```sql
UPDATE organizations
SET is_active = false
WHERE id = 'organization-uuid';
```

Esto bloqueará inmediatamente el acceso sin importar el estado de la licencia.

## Testing

### Probar período de gracia:

```sql
-- Establecer licencia expirada hace 2 días
UPDATE organizations
SET 
  license_start_date = now() - interval '92 days',
  license_end_date = now() - interval '2 days'
WHERE slug = 'tu-organizacion';
```

### Probar licencia expirada completamente:

```sql
-- Establecer licencia expirada hace 10 días (más que el período de gracia)
UPDATE organizations
SET 
  license_start_date = now() - interval '100 days',
  license_end_date = now() - interval '10 days'
WHERE slug = 'tu-organizacion';
```

### Probar licencia por expirar:

```sql
-- Establecer licencia que expira en 3 días
UPDATE organizations
SET 
  license_start_date = now() - interval '87 days',
  license_end_date = now() + interval '3 days'
WHERE slug = 'tu-organizacion';
```

## Troubleshooting

### No se muestran notificaciones

1. Verifica que el usuario tenga una organización asignada
2. Verifica que la organización tenga fechas de licencia configuradas
3. Revisa la consola del navegador por errores

### Usuario bloqueado incorrectamente

1. Verifica el estado en la base de datos:
   ```sql
   SELECT * FROM get_my_organization_license_status(7);
   ```
2. Verifica que `is_active = true`
3. Verifica las fechas de licencia

### Cambios no se reflejan

- El estado se carga al montar el componente
- Recarga la página después de actualizar una licencia
- En futuras versiones se puede agregar polling o websockets para actualizaciones en tiempo real

## Próximas Mejoras

- [ ] Dashboard de gestión de licencias para admins
- [ ] Historial de renovaciones
- [ ] Notificaciones por email antes de expiración
- [ ] Integración con sistema de pagos
- [ ] Panel de renovación automática
- [ ] Métricas de uso durante período de gracia
