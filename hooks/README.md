# Custom Hooks

Custom hooks reutilizables para TurnoFlash que encapsulan la lógica de gestión de recursos y estado.

## 🎣 Hooks Disponibles

### Resource Management Hooks

- **`useAppointments`** - Gestión completa de turnos/citas
- **`useCustomers`** - Gestión completa de clientes
- **`useServices`** - Gestión completa de servicios
- **`useStaff`** - Gestión completa de personal

### Utility Hooks

- **`useAuth`** - Autenticación y usuario actual (desde auth-context)
- **`useLicense`** - Gestión de licencias
- **`useCapacitor`** - Integración con Capacitor para apps nativas

## 📖 Uso Rápido

### Importación Simple

```typescript
import { useAppointments, useCustomers } from "@/hooks";
```

### Ejemplo Básico

```typescript
function MyComponent() {
  const { customers, loading, error, createCustomer } = useCustomers();

  if (loading) return <div>Cargando...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      {customers.map((customer) => (
        <div key={customer.id}>{customer.first_name}</div>
      ))}
    </div>
  );
}
```

### Con Filtros

```typescript
function FilteredAppointments() {
  const { appointments } = useAppointments({
    startDate: "2026-01-01",
    endDate: "2026-01-31",
    status: ["confirmed", "pending"],
    staffId: "staff-id-here",
  });

  return (
    <div>
      {appointments.map((apt) => (
        <div key={apt.id}>{apt.service_name}</div>
      ))}
    </div>
  );
}
```

### Operaciones CRUD

```typescript
function CustomerForm() {
  const { createCustomer, updateCustomer } = useCustomers();

  const handleSubmit = async (data) => {
    const result = await createCustomer(data);

    if (result.success) {
      alert("Cliente creado!");
    } else {
      alert(`Error: ${result.error}`);
    }
  };

  return <form onSubmit={handleSubmit}>...</form>;
}
```

## 🎯 Características

✅ **Auto-loading** - Los datos se cargan automáticamente al montar el componente  
✅ **Auto-refresh** - Se recargan cuando cambian los filtros  
✅ **Estado centralizado** - loading, error y data en un solo lugar  
✅ **Operaciones CRUD** - create, update, delete integradas  
✅ **Tipado completo** - TypeScript con autocompletado  
✅ **Manejo de errores** - Consistente en toda la aplicación  
✅ **Integración con servicios** - Usa la capa de servicios existente  
✅ **Refresh manual** - Función `refresh()` disponible

## 📚 Documentación Completa

Para más detalles, ejemplos avanzados y guías de migración, consulta:

- [**CUSTOM-HOOKS.md**](../docs/CUSTOM-HOOKS.md) - Documentación completa con ejemplos
- [**EXAMPLE-MIGRATION-CUSTOMERS.md**](../docs/EXAMPLE-MIGRATION-CUSTOMERS.md) - Ejemplo de migración paso a paso
- [**SERVICE-LAYER.md**](../docs/SERVICE-LAYER.md) - Documentación de la capa de servicios

## 🔗 API Reference

### useAppointments(filters?)

```typescript
{
  appointments: AppointmentWithDetails[];
  loading: boolean;
  error: string | null;
  createAppointment: (data: AppointmentFormData) => Promise<Result>;
  updateStatus: (id: string, status: AppointmentStatus, reason?: string) => Promise<Result>;
  deleteAppointment: (id: string, reason?: string) => Promise<Result>;
  sendReminder: (id: string, method?: 'whatsapp' | 'sms' | 'email') => Promise<Result>;
  checkAvailability: (...) => Promise<AvailabilityResult>;
  getStatistics: (startDate: string, endDate: string) => Promise<StatsResult>;
  refresh: () => Promise<void>;
}
```

### useCustomers(filters?)

```typescript
{
  customers: Customer[];
  loading: boolean;
  error: string | null;
  createCustomer: (data: CustomerFormData) => Promise<Result>;
  updateCustomer: (id: string, data: Partial<CustomerFormData>) => Promise<Result>;
  deactivateCustomer: (id: string) => Promise<Result>;
  reactivateCustomer: (id: string) => Promise<Result>;
  getCustomerById: (id: string) => Promise<Result>;
  getCustomerStatistics: (id: string) => Promise<StatsResult>;
  refresh: () => Promise<void>;
}
```

### useServices(filters?)

```typescript
{
  services: Service[];
  loading: boolean;
  error: string | null;
  createService: (data: ServiceFormData) => Promise<Result>;
  updateService: (id: string, data: Partial<ServiceFormData>) => Promise<Result>;
  deactivateService: (id: string) => Promise<Result>;
  reactivateService: (id: string) => Promise<Result>;
  getServiceById: (id: string) => Promise<Result>;
  reorderServices: (serviceIds: string[]) => Promise<Result>;
  refresh: () => Promise<void>;
}
```

### useStaff(filters?)

```typescript
{
  staff: StaffMember[];
  loading: boolean;
  error: string | null;
  createStaffMember: (data: StaffMemberFormData) => Promise<Result>;
  updateStaffMember: (id: string, data: Partial<StaffMemberFormData>) => Promise<Result>;
  deactivateStaffMember: (id: string) => Promise<Result>;
  reactivateStaffMember: (id: string) => Promise<Result>;
  getStaffById: (id: string) => Promise<Result>;
  reorderStaff: (staffIds: string[]) => Promise<Result>;
  refresh: () => Promise<void>;
}
```

## 💡 Tips

### 1. Usa filtros para optimizar queries

```typescript
// ✅ Bueno - Solo carga clientes activos
const { customers } = useCustomers({ isActive: true });

// ❌ Malo - Carga todos y filtra después
const { customers: allCustomers } = useCustomers();
const activeCustomers = allCustomers.filter((c) => c.is_active);
```

### 2. Maneja errores apropiadamente

```typescript
const { error, loading, customers } = useCustomers();

if (error) {
  return <ErrorAlert message={error} />;
}

if (loading) {
  return <Spinner />;
}

return <CustomerList customers={customers} />;
```

### 3. Usa refresh cuando lo necesites

```typescript
const { customers, refresh } = useCustomers();

const handleExternalUpdate = async () => {
  await someExternalOperation();
  await refresh(); // Recarga los datos
};
```

### 4. Combina múltiples hooks

```typescript
function AppointmentForm() {
  const { customers } = useCustomers({ isActive: true });
  const { services } = useServices({ isActive: true });
  const { staff } = useStaff({ isBookable: true });
  const { createAppointment } = useAppointments();

  // Usa todos juntos
}
```

## 🚀 Migración

Para migrar componentes existentes que usan Supabase directamente:

**Antes:**

```typescript
const [data, setData] = useState([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState(null);

useEffect(() => {
  const load = async () => {
    const { data, error } = await supabase.from("customers").select("*");
    // ... handle response
  };
  load();
}, []);
```

**Después:**

```typescript
const { customers, loading, error } = useCustomers();
```

Ver [EXAMPLE-MIGRATION-CUSTOMERS.md](../docs/EXAMPLE-MIGRATION-CUSTOMERS.md) para un ejemplo completo.

## 🧪 Testing

Los hooks pueden ser testeados usando `@testing-library/react-hooks`:

```typescript
import { renderHook } from "@testing-library/react-hooks";
import { useCustomers } from "@/hooks";

test("loads customers", async () => {
  const { result, waitForNextUpdate } = renderHook(() => useCustomers());

  expect(result.current.loading).toBe(true);

  await waitForNextUpdate();

  expect(result.current.loading).toBe(false);
  expect(result.current.customers).toBeDefined();
});
```

---

**Implementado:** Enero 2026  
**Versión:** 1.0.0  
**Mantenedor:** Equipo TurnoFlash
