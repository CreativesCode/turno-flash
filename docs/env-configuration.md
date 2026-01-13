# Configuración de Variables de Entorno

Este documento describe las variables de entorno necesarias para la aplicación.

## Archivo .env.local

Crea un archivo `.env.local` en la raíz del proyecto con las siguientes variables:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# License Management
# Período de gracia en días después de que expire la licencia
# Durante este período, los usuarios pueden seguir usando la app pero recibirán notificaciones
NEXT_PUBLIC_LICENSE_GRACE_PERIOD_DAYS=7

# Application Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Variables de Licencia

### NEXT_PUBLIC_LICENSE_GRACE_PERIOD_DAYS

Define el número de días de gracia que tienen las organizaciones después de que expire su licencia.

- **Valor por defecto**: 7 días
- **Comportamiento**: Durante el período de gracia, los usuarios pueden seguir usando la aplicación pero recibirán notificaciones indicando que la licencia ha expirado y deben renovarla.
- **Después del período de gracia**: La organización quedará bloqueada y no podrá usar la aplicación hasta renovar la licencia.

## Ejemplo de uso

```typescript
// Obtener el período de gracia desde las variables de entorno
const gracePeriodDays = parseInt(
  process.env.NEXT_PUBLIC_LICENSE_GRACE_PERIOD_DAYS || '7'
);
```
