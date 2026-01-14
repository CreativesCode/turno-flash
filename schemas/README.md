# Esquemas de Validación Zod

Este directorio contiene todos los esquemas de validación Zod para el sistema TurnoFlash.

## 📦 Estructura

```
schemas/
├── index.ts                  # Punto de exportación central
├── appointment.schema.ts     # Validaciones de turnos
├── customer.schema.ts        # Validaciones de clientes
├── service.schema.ts         # Validaciones de servicios
├── staff.schema.ts           # Validaciones de personal
└── README.md                 # Esta documentación
```

## 🚀 Uso Básico

### Importación

```typescript
import {
  appointmentFormSchema,
  customerFormSchema,
  serviceFormSchema,
  staffFormSchema,
} from "@/schemas";
```

### Validación Manual

```typescript
import { appointmentFormSchema } from "@/schemas";

// Validar datos
try {
  const validatedData = appointmentFormSchema.parse(formData);
  // Los datos son válidos
} catch (error) {
  if (error instanceof ZodError) {
    // Manejar errores de validación
    console.error(error.errors);
  }
}
```

### Uso con React Hook Form

```typescript
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { appointmentFormSchema, AppointmentFormInput } from "@/schemas";

function AppointmentForm() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AppointmentFormInput>({
    resolver: zodResolver(appointmentFormSchema),
  });

  const onSubmit = (data: AppointmentFormInput) => {
    // Los datos ya están validados
    console.log(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>{/* Campos del formulario */}</form>
  );
}
```

## 📋 Esquemas Disponibles

### Appointments (Turnos)

- **`appointmentFormSchema`**: Validación completa para crear/editar turnos
  - Campos requeridos: `customer_id`, `service_id`, `appointment_date`, `start_time`, `end_time`
  - Validaciones adicionales: fecha no en el pasado, hora de fin posterior a hora de inicio
- **`appointmentUpdateStatusSchema`**: Validación para actualizar estado
- **`sendReminderSchema`**: Validación para enviar recordatorios
- **`checkAvailabilitySchema`**: Validación para verificar disponibilidad
- **`appointmentRequestSchema`**: Validación para solicitudes de turnos

### Customers (Clientes)

- **`customerFormSchema`**: Validación completa para crear clientes
  - Campos requeridos: `first_name`, `last_name`, `phone`
  - Validaciones: email válido, teléfono formato internacional, fecha de nacimiento
- **`customerUpdateSchema`**: Validación parcial para actualizaciones
- **`customerFilterSchema`**: Validación de filtros de búsqueda
- **`customerImportSchema`**: Validación para importación masiva

### Services (Servicios)

- **`serviceFormSchema`**: Validación completa para crear servicios
  - Campos requeridos: `name`, `duration_minutes`
  - Validaciones: duración entre 5-480 minutos, precio no negativo, color hexadecimal
- **`serviceCategoryFormSchema`**: Validación para categorías de servicios
- **`serviceUpdateSchema`**: Validación parcial para actualizaciones
- **`serviceFilterSchema`**: Validación de filtros
- **`staffServiceSchema`**: Validación para asignación de servicios a personal

### Staff (Personal)

- **`staffFormSchema`**: Validación completa para crear personal
  - Campos requeridos: `first_name`, `last_name`
  - Validaciones: email válido, teléfono formato internacional, color hexadecimal
- **`staffAvailabilitySchema`**: Validación de disponibilidad horaria
  - Validación: hora de fin posterior a hora de inicio
- **`staffExceptionSchema`**: Validación de excepciones (vacaciones, días libres)
- **`timeOffRequestSchema`**: Validación de solicitudes de tiempo libre
- **`staffUpdateSchema`**: Validación parcial para actualizaciones

## 🎯 Tipos TypeScript

Cada esquema exporta su tipo TypeScript correspondiente:

```typescript
import type {
  AppointmentFormInput,
  CustomerFormInput,
  ServiceFormInput,
  StaffFormInput,
} from "@/schemas";
```

## ✅ Validaciones Comunes

### Formatos

- **UUID**: `z.string().uuid()`
- **Email**: `z.string().email()`
- **Fecha**: `z.string().regex(/^\d{4}-\d{2}-\d{2}$/)`
- **Hora**: `z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/)`
- **Teléfono**: `z.string().regex(/^[+]?[(]?[0-9]{1,4}...$/)`
- **Color Hex**: `z.string().regex(/^#[0-9A-Fa-f]{6}$/)`

### Valores Opcionales

```typescript
// Campo opcional que puede ser undefined
z.string().optional();

// Campo opcional que puede ser string o vacío
z.string().optional().or(z.literal(""));

// Campo nullable
z.string().nullable();
```

### Rangos

```typescript
// Número entre min y max
z.number().min(0).max(100);

// String con longitud mínima/máxima
z.string().min(2).max(50);

// Array con cantidad limitada de elementos
z.array(z.string()).max(10);
```

## 🔧 Integración con Hooks

Los esquemas están integrados en todos los hooks de React Query:

- ✅ `useCreateAppointment` - Valida con `appointmentFormSchema`
- ✅ `useUpdateAppointmentStatus` - Valida con `appointmentUpdateStatusSchema`
- ✅ `useCreateCustomer` - Valida con `customerFormSchema`
- ✅ `useUpdateCustomer` - Valida con `customerUpdateSchema`
- ✅ `useCreateService` - Valida con `serviceFormSchema`
- ✅ `useUpdateService` - Valida con `serviceUpdateSchema`
- ✅ `useCreateStaffMember` - Valida con `staffFormSchema`
- ✅ `useUpdateStaffMember` - Valida con `staffUpdateSchema`

Los errores de validación se propagan como errores de mutación con mensajes descriptivos.

## 📊 Beneficios

1. **Type Safety al 100%**: Los tipos TypeScript se infieren automáticamente de los esquemas
2. **Validación +90%**: Todas las entradas se validan antes de llegar a la base de datos
3. **Mensajes de Error Claros**: Mensajes en español con el campo específico que falló
4. **DRY**: Una única fuente de verdad para validaciones
5. **Mantenibilidad**: Cambios centralizados en un solo lugar

## 🎓 Recursos

- [Documentación oficial de Zod](https://zod.dev)
- [React Hook Form + Zod](https://react-hook-form.com/get-started#SchemaValidation)
- [Zod Error Handling](https://zod.dev/ERROR_HANDLING)

## 📝 Notas

- Todos los mensajes de error están en español
- Las validaciones incluyen tanto formato como lógica de negocio
- Los esquemas de actualización (update) son parciales del esquema completo
- Los campos opcionales pueden ser `undefined`, `null` o string vacío según el caso
