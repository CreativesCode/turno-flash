# Hook useToast

Hook personalizado para mostrar notificaciones toast elegantes usando Sonner.

## 🚀 Instalación

El sistema de toasts ya está configurado en el proyecto. Solo necesitas importar y usar:

```tsx
import { useToast } from "@/hooks";
```

## 📖 Uso Básico

### En Componentes React

```tsx
import { useToast } from "@/hooks";

function MyComponent() {
  const toast = useToast();

  const handleAction = async () => {
    try {
      // Tu lógica aquí
      toast.success("Operación exitosa");
    } catch (error) {
      toast.error("Error al procesar", error.message);
    }
  };

  return <button onClick={handleAction}>Ejecutar</button>;
}
```

### Fuera de Componentes (Funciones)

```tsx
import { toast } from "@/hooks";

// En cualquier función, sin necesidad de hook
async function processData() {
  try {
    await someAsyncOperation();
    toast.success("Datos procesados correctamente");
  } catch (error) {
    toast.error("Error al procesar datos");
  }
}
```

## 🎨 Tipos de Notificaciones

### ✅ Éxito

```tsx
toast.success("Turno creado exitosamente");
toast.success("Cliente agregado", "El cliente ha sido registrado en el sistema");
```

### ❌ Error

```tsx
toast.error("Error al guardar");
toast.error("Error de conexión", "No se pudo conectar con el servidor");
```

### ⚠️ Advertencia

```tsx
toast.warning("Atención requerida");
toast.warning("Licencia próxima a vencer", "Tu licencia expira en 7 días");
```

### ℹ️ Información

```tsx
toast.info("Información importante");
toast.info("Nueva actualización disponible", "Hay una nueva versión del sistema");
```

### ⏳ Carga

```tsx
const loadingToast = toast.loading("Guardando cambios...");

// Cuando termine la operación
toast.dismiss(loadingToast);
toast.success("Cambios guardados");
```

## 🔍 Errores de Validación

Para errores de validación Zod, usa `validationError` que formatea automáticamente el mensaje:

```tsx
try {
  await createAppointment.mutateAsync(data);
} catch (error) {
  if (error instanceof Error && error.message.includes("Validación fallida")) {
    toast.validationError(error.message);
    // Muestra: "Error de validación"
    // Descripción: "Fecha inválida. Formato esperado: YYYY-MM-DD"
    // Campo: "appointment_date"
  }
}
```

## 🎯 Ejemplos Completos

### Crear con Feedback Visual

```tsx
import { useCreateAppointment, useToast } from "@/hooks";

function CreateAppointmentForm() {
  const createAppointment = useCreateAppointment();
  const toast = useToast();

  const handleSubmit = async (data) => {
    const loadingToast = toast.loading("Creando turno...");
    
    try {
      await createAppointment.mutateAsync(data);
      toast.dismiss(loadingToast);
      toast.success("Turno creado", "El turno ha sido agendado correctamente");
    } catch (error) {
      toast.dismiss(loadingToast);
      
      if (error instanceof Error) {
        if (error.message.includes("Validación fallida")) {
          toast.validationError(error.message);
        } else {
          toast.error("Error al crear turno", error.message);
        }
      }
    }
  };

  return <form onSubmit={handleSubmit}>...</form>;
}
```

### Actualizar con Confirmación

```tsx
import { useUpdateCustomer, useToast } from "@/hooks";

function UpdateCustomerForm() {
  const updateCustomer = useUpdateCustomer();
  const toast = useToast();

  const handleUpdate = async (customerId, data) => {
    try {
      await updateCustomer.mutateAsync({ customerId, data });
      toast.success("Cliente actualizado", "Los cambios se han guardado correctamente");
    } catch (error) {
      toast.error("Error al actualizar", "No se pudieron guardar los cambios");
    }
  };

  return <button onClick={() => handleUpdate(id, formData)}>Guardar</button>;
}
```

### Eliminar con Confirmación

```tsx
import { useDeleteAppointment, useToast } from "@/hooks";

function DeleteAppointmentButton({ appointmentId }) {
  const deleteAppointment = useDeleteAppointment();
  const toast = useToast();

  const handleDelete = async () => {
    if (!confirm("¿Estás seguro de eliminar este turno?")) {
      return;
    }

    const loadingToast = toast.loading("Eliminando turno...");
    
    try {
      await deleteAppointment.mutateAsync({ appointmentId });
      toast.dismiss(loadingToast);
      toast.success("Turno eliminado", "El turno ha sido cancelado correctamente");
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error("Error al eliminar", "No se pudo eliminar el turno");
    }
  };

  return <button onClick={handleDelete}>Eliminar</button>;
}
```

## 🎨 Personalización

El Toaster está configurado en `app/layout.tsx` con:

- **Posición**: `top-right`
- **Colores ricos**: Activados para mejor visibilidad
- **Botón de cerrar**: Visible en todas las notificaciones
- **Duración**: 4 segundos (5 segundos para errores)
- **Estilos personalizados**: Colores consistentes con el tema

## 📚 API Completa

### useToast() Hook

```typescript
const toast = useToast();

// Métodos disponibles
toast.success(message: string, description?: string): string | number
toast.error(message: string, description?: string): string | number
toast.warning(message: string, description?: string): string | number
toast.info(message: string, description?: string): string | number
toast.loading(message: string): string | number
toast.validationError(errorMessage: string): string | number
toast.dismiss(toastId: string | number): void
toast.dismissAll(): void
```

### toast (Exportación Directa)

Misma API que el hook, pero para usar fuera de componentes React.

## 💡 Mejores Prácticas

1. **Siempre muestra feedback**: Usa toasts para todas las acciones del usuario
2. **Mensajes claros**: Sé específico sobre qué pasó
3. **Loading states**: Muestra un toast de carga para operaciones asíncronas
4. **Errores descriptivos**: Incluye detalles útiles en la descripción
5. **Validación especial**: Usa `validationError` para errores de Zod
6. **No abuses**: No muestres toasts para acciones menores o automáticas

## 🔗 Referencias

- [Documentación de Sonner](https://sonner.emilkowal.ski/)
- [Ejemplos de Validación](../docs/VALIDATION-EXAMPLES.md)
