# Guía Rápida - Sistema de Turnos TurnoFlash

## 🚀 Inicio Rápido

### 1. Ejecutar Migración de Base de Datos

```bash
cd c:\Local-Disc-D\Project\enterpreneurship\turno-flash

# Con Supabase CLI
supabase db push
```

O manualmente en Supabase Dashboard:

1. Ve a tu proyecto en https://supabase.com
2. Navega a "SQL Editor"
3. Copia el contenido de `supabase/migrations/010_appointment_system.sql`
4. Ejecuta

### 2. Iniciar el Servidor de Desarrollo

```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:3000`

### 3. Iniciar Sesión

1. Ve a `/login`
2. Inicia sesión con tu cuenta de administrador
3. Serás redirigido al dashboard

---

## 📋 Funcionalidades Disponibles

### ✅ Gestión de Clientes

**Ruta:** `/dashboard/customers`

**Funcionalidades:**

- Crear nuevo cliente
- Ver lista de clientes
- Buscar clientes por nombre, teléfono o email
- Editar información del cliente
- Eliminar cliente
- Ver estadísticas (turnos totales, ausencias)
- Agregar tags/etiquetas
- Notas personalizadas

**Campos del cliente:**

- Nombre y apellido
- Teléfono (obligatorio)
- Email (opcional)
- WhatsApp (opcional)
- Notas
- Estado activo/inactivo

### ✅ Gestión de Servicios

**Ruta:** `/dashboard/services`

**Funcionalidades:**

- Crear nuevo servicio
- Ver lista de servicios
- Buscar servicios
- Editar servicio
- Eliminar servicio
- Activar/desactivar servicio

**Configuración de servicio:**

- Nombre del servicio
- Descripción
- Duración en minutos
- Tiempo de buffer (preparación/limpieza)
- Precio y moneda
- Color de identificación
- Disponibilidad para reserva online
- Requiere aprobación manual
- Máximo de días de anticipación
- Mínimo de horas de anticipación

**Ejemplos de servicios:**

- Peluquería: "Corte de pelo" (30 min, $500)
- Spa: "Manicure" (45 min, $600)
- Consultorio: "Consulta" (30 min, $1000)

### ✅ Gestión de Profesionales

**Ruta:** `/dashboard/staff`

**Funcionalidades:**

- Crear nuevo profesional
- Ver lista de profesionales
- Buscar profesionales
- Editar profesional
- Eliminar profesional
- Activar/desactivar profesional

**Información del profesional:**

- Nombre y apellido
- Apodo/nickname
- Teléfono y email
- Biografía
- Especialidades (tags)
- Color de identificación
- Configuración:
  - ¿Es reservable?
  - ¿Acepta reservas online?
  - ¿Está activo?

### 🚧 Gestión de Turnos (Por implementar)

**Ruta:** `/dashboard/appointments`

**Funcionalidades planificadas:**

- Vista de calendario (día/semana/mes)
- Crear turno manual
- Asignar cliente a turno
- Asignar servicio y profesional
- Ver disponibilidad en tiempo real
- Check-in de clientes
- Marcar como completado
- Cancelar turnos
- Reprogramar turnos

---

## 🎨 UI/UX

### Diseño Implementado

- **Responsive**: Funciona en desktop, tablet y móvil
- **Dark Mode**: Soporte completo de tema oscuro
- **Iconos**: Lucide React para iconografía consistente
- **Colores**: Sistema de colores personalizables por entidad
- **Modal Forms**: Formularios en modales para mejor UX
- **Search**: Búsqueda en tiempo real en todas las listas
- **Empty States**: Estados vacíos informativos
- **Loading States**: Indicadores de carga
- **Error Handling**: Manejo de errores con mensajes claros

### Paleta de Colores

- **Azul** (`#3B82F6`): Turnos, acciones principales
- **Verde** (`#10B981`): Clientes, confirmaciones
- **Púrpura** (`#8B5CF6`): Servicios
- **Naranja** (`#F59E0B`): Profesionales/Staff
- **Rojo** (`#EF4444`): Cancelaciones, eliminaciones

---

## 🗃️ Estructura de Base de Datos

### Tablas Principales

1. **customers** - Clientes del negocio
2. **services** - Servicios ofrecidos
3. **service_categories** - Categorías de servicios
4. **staff_members** - Profesionales/empleados
5. **staff_services** - Relación staff-servicios
6. **staff_availability** - Horarios de disponibilidad
7. **staff_exceptions** - Excepciones (vacaciones, etc.)
8. **appointments** - Turnos/citas (TABLA PRINCIPAL)
9. **appointment_requests** - Solicitudes pendientes
10. **business_settings** - Configuración del negocio
11. **waitlist** - Lista de espera
12. **customer_history** - Historial del cliente
13. **notifications** - Notificaciones del sistema
14. **reminder_logs** - Log de recordatorios enviados

### Relaciones Clave

```
customers (1) ──→ (N) appointments
services (1) ──→ (N) appointments
staff_members (1) ──→ (N) appointments
staff_members (N) ←→ (N) services (via staff_services)
```

---

## 🔐 Permisos y Seguridad

### Roles

- **admin**: Acceso completo a todo el sistema
- **owner**: Acceso completo a su organización
- **staff**: Acceso limitado a su organización

### Row Level Security (RLS)

Todas las tablas están protegidas con RLS:

- Los usuarios solo ven datos de su organización
- Los admins ven todo
- Los staff solo ven lo necesario para su trabajo

---

## 📊 Dashboard Principal

### Secciones

1. **Información del Usuario**

   - Email, rol, organización
   - Estado de cuenta

2. **Notificaciones de Licencia**

   - Estado de la licencia
   - Días restantes
   - Alertas de expiración

3. **Gestión de Turnos** (4 tarjetas principales)

   - 🗓️ Turnos - Gestionar citas
   - 👤 Clientes - Base de clientes
   - 📦 Servicios - Servicios ofrecidos
   - 👥 Profesionales - Equipo de trabajo

4. **Acceso Rápido**

   - Nuevo Turno
   - Nuevo Cliente
   - Ver Calendario

5. **Para Administradores**
   - Gestión de usuarios
   - Gestión de organizaciones
   - Invitar usuarios

---

## 🔄 Flujo de Trabajo Típico

### 1. Configuración Inicial (Primera vez)

```
1. Crear servicios
   └─→ Ir a /dashboard/services
   └─→ Agregar "Corte de pelo", "Manicure", etc.

2. Agregar profesionales
   └─→ Ir a /dashboard/staff
   └─→ Agregar tu equipo

3. Configurar disponibilidad (próximamente)
   └─→ Definir horarios de cada profesional

4. Agregar clientes existentes
   └─→ Ir a /dashboard/customers
   └─→ Importar o agregar manualmente
```

### 2. Operación Diaria

```
1. Cliente llama pidiendo turno
   └─→ Buscar cliente en /dashboard/customers
   └─→ Si no existe, crear nuevo
   └─→ Ir a /dashboard/appointments
   └─→ Crear turno seleccionando:
       • Cliente
       • Servicio
       • Profesional
       • Fecha y hora
   └─→ Sistema envía confirmación automática (próximamente)

2. Día del turno
   └─→ Cliente llega
   └─→ Hacer check-in
   └─→ Servicio se realiza
   └─→ Marcar como completado
   └─→ Opcionalmente pedir feedback
```

### 3. Gestión de Cancelaciones

```
1. Cliente cancela
   └─→ Buscar turno en calendario
   └─→ Marcar como cancelado
   └─→ Agregar razón de cancelación
   └─→ Sistema libera el horario
   └─→ Notificar si hay lista de espera
```

---

## 🎯 Próximos Pasos

### Prioridad Alta (Próxima sesión)

1. **Página de Turnos/Appointments**

   - Vista de lista
   - Formulario de creación
   - Validación de disponibilidad
   - Estados del turno

2. **Componente de Calendario**

   - Vista diaria
   - Vista semanal
   - Vista mensual
   - Interactivo

3. **Validaciones**
   - No permitir turnos superpuestos
   - Verificar disponibilidad del staff
   - Validar horario del negocio

### Prioridad Media

1. **Configuración de Disponibilidad**

   - Horarios por día de semana
   - Excepciones (vacaciones)
   - Bloques de tiempo

2. **Sistema de Recordatorios**

   - Configurar recordatorios automáticos
   - Integración con WhatsApp/SMS
   - Plantillas de mensajes
   - Job cron para envíos

3. **Página Pública de Reservas**
   - URL pública
   - Selección de servicio
   - Calendario de disponibilidad
   - Formulario de reserva

### Prioridad Baja

1. **Reportes y Analíticas**
2. **WhatsApp Bot**
3. **App Móvil**
4. **Integración de pagos**

---

## 📝 Notas Importantes

### Tipos de Negocio Soportados

El sistema es flexible y funciona para:

- 💇 Peluquerías y barberías
- 💅 Salones de belleza
- 🏥 Consultorios médicos
- 🏋️ Gimnasios y entrenadores
- 🍽️ Restaurantes (reservas)
- 🔧 Talleres mecánicos
- ⚖️ Estudios profesionales (abogados, contadores)
- Y muchos más...

### Personalización por Tipo de Negocio

Cada negocio puede configurar:

- Sus propios servicios
- Duraciones específicas
- Precios personalizados
- Horarios de atención
- Equipo de trabajo

### Escalabilidad

El sistema está diseñado para:

- ✅ Negocios pequeños (1-5 profesionales)
- ✅ Negocios medianos (5-20 profesionales)
- ✅ Negocios grandes (20+ profesionales)
- ✅ Múltiples ubicaciones (via organizaciones)

---

## 🆘 Soporte

### Problemas Comunes

1. **No puedo ver las nuevas páginas**

   - Verifica que ejecutaste la migración de base de datos
   - Reinicia el servidor de desarrollo

2. **Error de permisos**

   - Verifica que tu usuario tenga una organización asignada
   - Verifica que tu organización tenga una licencia válida

3. **No aparecen los datos**
   - Verifica que estés logueado
   - Verifica la consola del navegador por errores
   - Revisa que los datos pertenezcan a tu organización

### Logs y Debug

```bash
# Ver logs del servidor
npm run dev

# Ver logs de Supabase
# Ve a Supabase Dashboard > Logs
```

---

## 📚 Documentación Adicional

- `APPOINTMENT-SYSTEM.md` - Análisis completo del sistema
- `IMPLEMENTATION-PROGRESS.md` - Progreso de implementación
- `SETUP-LICENCIAS.md` - Sistema de licencias
- `supabase-setup.md` - Configuración de Supabase

---

**¡El sistema está listo para empezar a gestionar turnos! 🎉**

La base está completa. El próximo paso es implementar la gestión de turnos y el calendario.
