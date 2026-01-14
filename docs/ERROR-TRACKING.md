# Sistema de Error Tracking con Supabase

Sistema completo de monitoreo y logging de errores usando Supabase (100% gratis, sin límites).

## 📋 Tabla de Contenidos

- [Características](#características)
- [Instalación](#instalación)
- [Uso](#uso)
- [Componentes](#componentes)
- [API](#api)

## ✨ Características

- ✅ **100% Gratis** - Sin límites de eventos
- ✅ **Error Boundaries** - Captura errores de React automáticamente
- ✅ **Logger Utility** - API simple para loggear errores manualmente
- ✅ **Dashboard de Errores** - Interfaz para ver y gestionar errores
- ✅ **Agregación Automática** - Errores duplicados se agrupan automáticamente
- ✅ **RLS (Row Level Security)** - Solo admins y owners pueden ver errores
- ✅ **Estadísticas** - Dashboard con métricas de errores

## 🚀 Instalación

### 1. Ejecutar la migración SQL

```bash
# Si usas Supabase CLI
supabase migration up

# O ejecuta manualmente el archivo:
# supabase/migrations/011_error_logging.sql
```

### 2. Verificar que los componentes estén integrados

El `ErrorBoundary` ya está integrado en `app/layout.tsx` y capturará automáticamente todos los errores de React.

## 📖 Uso

### Error Boundary (Automático)

El `ErrorBoundary` está configurado globalmente y captura automáticamente todos los errores de React. No necesitas hacer nada adicional.

Si quieres un ErrorBoundary específico para una sección:

```tsx
import { ErrorBoundary } from "@/components/ErrorBoundary";

<ErrorBoundary>
  <YourComponent />
</ErrorBoundary>
```

### Logger Manual

Para loggear errores manualmente en tu código:

```tsx
import { logger } from "@/utils/logger";

// Error básico
try {
  // código que puede fallar
} catch (error) {
  await logger.error("Failed to load data", error);
}

// Error con contexto
await logger.error("Failed to create appointment", error, {
  userId: user.id,
  appointmentId: appointment.id,
  action: "create_appointment",
});

// Helpers específicos
await logger.apiError("/api/appointments", error, { body: formData });
await logger.validationError("email", emailValue, "must be valid email");
await logger.permissionError("delete", "appointment", user.id);
```

### Ver Errores en el Dashboard

1. Accede a `/dashboard/errors` (solo admin/owner)
2. Verás estadísticas y lista de errores
3. Puedes filtrar por:
   - Estado (resuelto/no resuelto)
   - Período de tiempo (1, 7, 30, 90 días)
   - Búsqueda por mensaje

## 🧩 Componentes

### ErrorBoundary

Componente que captura errores de React y los registra automáticamente.

**Props:**
- `children`: ReactNode - Componentes hijos a proteger
- `fallback?`: ReactNode - Componente personalizado a mostrar en caso de error
- `onError?`: (error: Error, errorInfo: ErrorInfo) => void - Callback cuando ocurre un error

**Ejemplo:**
```tsx
<ErrorBoundary
  fallback={<CustomErrorPage />}
  onError={(error, errorInfo) => {
    console.log("Error capturado:", error);
  }}
>
  <App />
</ErrorBoundary>
```

### Logger

Utility class para loggear errores manualmente.

**Métodos:**
- `logger.error(message, error?, options?)` - Loggear un error
- `logger.warn(message, context?)` - Loggear una advertencia
- `logger.info(message, context?)` - Loggear información
- `logger.debug(message, context?)` - Loggear debug (solo en desarrollo)
- `logger.apiError(endpoint, error, requestData?)` - Helper para errores de API
- `logger.validationError(field, value, rule)` - Helper para errores de validación
- `logger.permissionError(action, resource, userId?)` - Helper para errores de permisos

## 🔌 API / Hooks

### useErrorLogsQuery

Hook para obtener logs de errores.

```tsx
import { useErrorLogsQuery } from "@/hooks";

const { data: errorLogs, isLoading } = useErrorLogsQuery({
  resolved: false, // solo no resueltos
  days: 7, // últimos 7 días
  limit: 50,
  search: "error message", // búsqueda opcional
});
```

### useErrorStatsQuery

Hook para obtener estadísticas de errores.

```tsx
import { useErrorStatsQuery } from "@/hooks";

const { data: stats } = useErrorStatsQuery(7); // últimos 7 días

// stats contiene:
// - total_errors
// - unresolved_errors
// - resolved_errors
// - unique_errors
// - most_common_error
// - errors_today
```

### useResolveError / useUnresolveError

Hooks para marcar errores como resueltos/no resueltos.

```tsx
import { useResolveError, useUnresolveError } from "@/hooks";

const resolveMutation = useResolveError();
const unresolveMutation = useUnresolveError();

// Marcar como resuelto
await resolveMutation.mutateAsync({
  errorId: "error-id",
  resolutionNotes: "Se corrigió el bug X",
});

// Marcar como no resuelto
await unresolveMutation.mutateAsync("error-id");
```

## 🗄️ Estructura de la Base de Datos

### Tabla: error_logs

```sql
- id: UUID (PK)
- error_message: TEXT
- error_stack: TEXT
- component_stack: TEXT
- user_agent: TEXT
- url: TEXT
- context: JSONB
- user_id: UUID (FK -> auth.users)
- organization_id: UUID (FK -> organizations)
- timestamp: TIMESTAMPTZ
- resolved: BOOLEAN
- resolved_at: TIMESTAMPTZ
- resolved_by: UUID (FK -> auth.users)
- resolution_notes: TEXT
- error_count: INTEGER (agregación automática)
- last_occurrence: TIMESTAMPTZ
```

### Funciones SQL

- `get_error_stats(p_organization_id, p_days)` - Obtener estadísticas
- `increment_error_count()` - Trigger para agregar errores duplicados

## 🔒 Seguridad (RLS)

- **Insert**: Cualquier usuario autenticado puede insertar errores
- **Select**: Solo admins y owners pueden ver errores de su organización
- **Update**: Solo admins y owners pueden marcar errores como resueltos

## 📊 Dashboard de Errores

Accede a `/dashboard/errors` para:

- Ver estadísticas en tiempo real
- Filtrar errores por estado, fecha, búsqueda
- Ver detalles completos (stack trace, contexto)
- Marcar errores como resueltos/no resueltos
- Ver cuántas veces ha ocurrido cada error

## 🎯 Mejores Prácticas

1. **Usa logger.error() para errores críticos** que necesitas rastrear
2. **No loggees información sensible** (passwords, tokens, etc.)
3. **Proporciona contexto útil** cuando loggeas errores manualmente
4. **Revisa el dashboard regularmente** para identificar patrones
5. **Marca errores como resueltos** cuando los corrijas

## 🔄 Migración desde Sentry

Si estabas usando Sentry, simplemente:

1. Elimina las dependencias de Sentry
2. El ErrorBoundary ya está configurado para usar Supabase
3. Reemplaza `Sentry.captureException()` con `logger.error()`
4. Accede a `/dashboard/errors` en lugar del dashboard de Sentry

## 📝 Ejemplos de Uso

### En un componente React

```tsx
"use client";

import { logger } from "@/utils/logger";
import { useState } from "react";

export function MyComponent() {
  const [loading, setLoading] = useState(false);

  const handleAction = async () => {
    try {
      setLoading(true);
      // tu código aquí
    } catch (error) {
      await logger.error("Failed to perform action", error, {
        component: "MyComponent",
        action: "handleAction",
      });
    } finally {
      setLoading(false);
    }
  };

  return <button onClick={handleAction}>Action</button>;
}
```

### En un servicio/API

```tsx
import { logger } from "@/utils/logger";

export async function createAppointment(data: AppointmentData) {
  try {
    // validación
    if (!data.customer_id) {
      await logger.validationError("customer_id", data.customer_id, "required");
      throw new Error("Customer ID is required");
    }

    // crear appointment
    const result = await supabase.from("appointments").insert(data);
    
    if (result.error) {
      throw result.error;
    }

    return result.data;
  } catch (error) {
    await logger.error("Failed to create appointment", error, {
      data,
      action: "createAppointment",
    });
    throw error;
  }
}
```

## 🐛 Troubleshooting

### Los errores no se están registrando

1. Verifica que la migración SQL se ejecutó correctamente
2. Verifica que el usuario está autenticado (los errores se registran igual, pero con user_id null)
3. Revisa la consola del navegador para ver si hay errores de conexión a Supabase

### No puedo ver errores en el dashboard

1. Verifica que tu rol es "admin" o "owner"
2. Verifica que tienes una organización asignada (para errores de organización)
3. Verifica los filtros aplicados

### Los errores duplicados no se están agregando

El trigger `increment_error_count` solo agrega errores que:
- Tienen el mismo mensaje
- Tienen la misma URL (o ambas son null)
- Ocurrieron en las últimas 24 horas
- No están resueltos

Si un error está resuelto, se creará una nueva entrada en lugar de incrementar el contador.

## 📚 Referencias

- [Error Boundaries en React](https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary)
- [Supabase RLS](https://supabase.com/docs/guides/auth/row-level-security)
- [React Query](https://tanstack.com/query/latest)
