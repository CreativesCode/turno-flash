# Sistema de Gestión de Turnos para Clientes - TurnoFlash

## 📋 Índice

1. [Visión General](#visión-general)
2. [Entidades Principales](#entidades-principales)
3. [Modelo de Datos](#modelo-de-datos)
4. [Casos de Uso](#casos-de-uso)
5. [Flujos de Trabajo](#flujos-de-trabajo)
6. [Consideraciones Técnicas](#consideraciones-técnicas)
7. [Plan de Implementación](#plan-de-implementación)

---

## 🎯 Visión General

TurnoFlash es un sistema para que negocios gestionen turnos/citas de sus clientes. Cualquier negocio que necesite agendar citas puede usar el sistema:

- 💇 Peluquerías y barberías
- 💅 Salones de belleza y spas
- 🏥 Consultorios médicos, dentistas, psicólogos
- 🔧 Talleres mecánicos
- 🍽️ Restaurantes (reservas)
- 🏋️ Gimnasios y entrenadores personales
- 👔 Estudios de fotografía
- 🎓 Clases particulares y tutorías
- ⚖️ Abogados, contadores, consultores
- 🐕 Veterinarias y grooming
- Y cualquier servicio que requiera citas

### Principios de Diseño

1. **Simplicidad**: Fácil para el dueño y fácil para el cliente
2. **Flexibilidad**: Adaptable a cualquier tipo de negocio
3. **Automatización**: Recordatorios automáticos, confirmaciones
4. **Multi-canal**: WhatsApp, web, teléfono
5. **Sin fricción**: Mínimos pasos para agendar
6. **Confiabilidad**: Evitar no-shows con recordatorios

---

## 🏗️ Entidades Principales

### 1. Clientes (Customers)

Los clientes del negocio que solicitan turnos.

**Campos:**

- `id` (UUID): Identificador único
- `organization_id` (UUID): Organización/negocio al que pertenece
- `first_name` (TEXT): Nombre
- `last_name` (TEXT): Apellido
- `email` (TEXT): Email (nullable)
- `phone` (TEXT): Teléfono (principal forma de contacto)
- `phone_country_code` (TEXT): Código de país (+54, +1, etc.)
- `whatsapp_number` (TEXT): WhatsApp (puede ser diferente al teléfono)
- `date_of_birth` (DATE): Fecha de nacimiento (opcional)
- `gender` (TEXT): Género (opcional)
- `notes` (TEXT): Notas sobre el cliente
- `tags` (TEXT[]): Etiquetas (VIP, frecuente, etc.)
- `photo_url` (TEXT): Foto del cliente
- `preferred_staff_id` (UUID): Staff preferido (nullable)
- `is_active` (BOOLEAN): Si está activo
- `total_appointments` (INTEGER): Total de turnos históricos
- `missed_appointments` (INTEGER): Turnos perdidos/no show
- `last_appointment_date` (TIMESTAMPTZ): Última visita
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)
- `created_by` (UUID): Quien lo agregó al sistema

**Índices:**

```sql
CREATE INDEX idx_customers_org_id ON customers(organization_id);
CREATE INDEX idx_customers_phone ON customers(phone);
CREATE INDEX idx_customers_email ON customers(email);
```

---

### 2. Servicios (Services)

Los servicios que ofrece el negocio.

**Campos:**

- `id` (UUID): Identificador único
- `organization_id` (UUID): Organización
- `category_id` (UUID): Categoría del servicio (nullable)
- `name` (TEXT): Nombre del servicio (ej: "Corte de pelo", "Manicure")
- `description` (TEXT): Descripción
- `duration_minutes` (INTEGER): Duración estimada en minutos
- `buffer_time_minutes` (INTEGER): Tiempo de buffer después del servicio
- `price` (DECIMAL): Precio (nullable)
- `currency` (TEXT): Moneda (USD, ARS, etc.)
- `color` (TEXT): Color para identificación visual (#HEX)
- `is_active` (BOOLEAN): Si está activo
- `requires_approval` (BOOLEAN): Si requiere aprobación manual
- `max_advance_booking_days` (INTEGER): Máximo días de anticipación para reservar
- `min_advance_booking_hours` (INTEGER): Mínimo horas de anticipación
- `available_for_online_booking` (BOOLEAN): Si se puede reservar online
- `image_url` (TEXT): Imagen del servicio
- `staff_ids` (UUID[]): Staff que puede realizar este servicio
- `sort_order` (INTEGER): Orden de visualización
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)

**Ejemplos por industria:**

- Peluquería: Corte hombre (30min), Corte mujer (45min), Tintura (120min), Barba (15min)
- Consultorio: Consulta (30min), Seguimiento (15min), Procedimiento (60min)
- Taller: Diagnóstico (30min), Service completo (90min), Cambio de aceite (20min)

---

### 3. Categorías de Servicios (Service Categories)

Agrupación de servicios.

**Campos:**

- `id` (UUID)
- `organization_id` (UUID)
- `name` (TEXT): Nombre (ej: "Cortes", "Color", "Tratamientos")
- `description` (TEXT)
- `icon` (TEXT): Nombre del ícono
- `color` (TEXT)
- `sort_order` (INTEGER)
- `is_active` (BOOLEAN)
- `created_at` (TIMESTAMPTZ)

---

### 4. Staff/Profesionales (Staff Members)

Personas que atienden a los clientes. Pueden ser usuarios del sistema o simplemente recursos.

**Campos:**

- `id` (UUID)
- `organization_id` (UUID)
- `user_id` (UUID): Usuario del sistema (nullable - puede ser solo un recurso)
- `first_name` (TEXT)
- `last_name` (TEXT)
- `nickname` (TEXT): Nombre para mostrar
- `email` (TEXT)
- `phone` (TEXT)
- `photo_url` (TEXT)
- `color` (TEXT): Color para calendario
- `bio` (TEXT): Biografía corta
- `specialties` (TEXT[]): Especialidades
- `is_active` (BOOLEAN)
- `is_bookable` (BOOLEAN): Si se puede reservar con esta persona
- `accepts_online_bookings` (BOOLEAN)
- `sort_order` (INTEGER)
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)

---

### 5. Horarios de Disponibilidad (Staff Availability)

Define cuándo está disponible cada staff para atender.

**Campos:**

- `id` (UUID)
- `staff_id` (UUID)
- `day_of_week` (INTEGER): 0=domingo, 6=sábado
- `start_time` (TIME): Hora de inicio
- `end_time` (TIME): Hora de fin
- `is_available` (BOOLEAN): Si está disponible o bloqueado
- `effective_from` (DATE): Desde cuándo aplica
- `effective_until` (DATE): Hasta cuándo (nullable)
- `created_at` (TIMESTAMPTZ)

**Ejemplo:**

```sql
-- Peluquero trabaja Lunes a Viernes de 9am a 6pm
INSERT INTO staff_availability (staff_id, day_of_week, start_time, end_time)
VALUES
  ('uuid', 1, '09:00', '18:00'), -- Lunes
  ('uuid', 2, '09:00', '18:00'), -- Martes
  ('uuid', 3, '09:00', '18:00'), -- Miércoles
  ('uuid', 4, '09:00', '18:00'), -- Jueves
  ('uuid', 5, '09:00', '18:00'); -- Viernes
```

---

### 6. Excepciones de Horario (Staff Exceptions)

Bloqueos o disponibilidades especiales (vacaciones, días festivos, horarios especiales).

**Campos:**

- `id` (UUID)
- `staff_id` (UUID): Staff afectado (nullable si es a nivel organización)
- `organization_id` (UUID)
- `exception_type` (ENUM): time_off, holiday, special_hours, blocked
- `start_datetime` (TIMESTAMPTZ): Inicio de la excepción
- `end_datetime` (TIMESTAMPTZ): Fin de la excepción
- `title` (TEXT): Título (ej: "Vacaciones", "Almuerzo")
- `description` (TEXT)
- `is_recurring` (BOOLEAN): Si se repite (ej: almuerzo todos los días)
- `created_at` (TIMESTAMPTZ)

---

### 7. Turnos/Citas (Appointments)

**El núcleo del sistema - representa una cita/turno.**

**Campos principales:**

- `id` (UUID)
- `organization_id` (UUID)
- `customer_id` (UUID): Cliente que tiene el turno
- `service_id` (UUID): Servicio reservado
- `staff_id` (UUID): Quién atenderá (nullable - puede ser "cualquiera disponible")
- `appointment_number` (TEXT): Número de turno (ej: "T-001")

**Campos de fecha/hora:**

- `appointment_date` (DATE): Fecha del turno
- `start_time` (TIME): Hora de inicio
- `end_time` (TIME): Hora estimada de fin
- `timezone` (TEXT): Zona horaria
- `actual_start_time` (TIMESTAMPTZ): Hora real de inicio
- `actual_end_time` (TIMESTAMPTZ): Hora real de fin

**Estado del turno:**

- `status` (ENUM):
  - `pending` - Solicitud pendiente de aprobación
  - `confirmed` - Confirmado pero no recordado
  - `reminded` - Ya se envió recordatorio
  - `client_confirmed` - Cliente confirmó asistencia
  - `checked_in` - Cliente llegó/check-in
  - `in_progress` - Servicio en progreso
  - `completed` - Completado
  - `cancelled` - Cancelado
  - `no_show` - Cliente no se presentó
  - `rescheduled` - Reagendado

**Campos de comunicación:**

- `source` (ENUM): web, whatsapp, phone, walk_in, admin
- `confirmation_sent_at` (TIMESTAMPTZ): Cuándo se envió confirmación
- `reminder_sent_at` (TIMESTAMPTZ): Cuándo se envió recordatorio
- `client_confirmed_at` (TIMESTAMPTZ): Cuándo el cliente confirmó
- `reminder_method` (ENUM): whatsapp, sms, email, call

**Campos adicionales:**

- `notes` (TEXT): Notas sobre el turno
- `internal_notes` (TEXT): Notas internas (no ve el cliente)
- `cancellation_reason` (TEXT): Por qué se canceló
- `cancelled_by` (UUID): Quién canceló
- `cancelled_at` (TIMESTAMPTZ)
- `price_charged` (DECIMAL): Precio cobrado
- `was_paid` (BOOLEAN): Si fue pagado
- `payment_method` (TEXT): Efectivo, tarjeta, etc.
- `rating` (INTEGER): Calificación del cliente (1-5)
- `feedback` (TEXT): Comentarios del cliente
- `created_by` (UUID): Quien creó el turno
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)

**Índices:**

```sql
CREATE INDEX idx_appointments_org_date ON appointments(organization_id, appointment_date);
CREATE INDEX idx_appointments_customer ON appointments(customer_id);
CREATE INDEX idx_appointments_staff_date ON appointments(staff_id, appointment_date);
CREATE INDEX idx_appointments_status ON appointments(status);
```

---

### 8. Solicitudes de Turno (Appointment Requests)

Cuando los clientes solicitan turnos (online, WhatsApp, etc.) antes de ser confirmados.

**Campos:**

- `id` (UUID)
- `organization_id` (UUID)
- `customer_name` (TEXT): Nombre del cliente
- `customer_phone` (TEXT): Teléfono
- `customer_email` (TEXT): Email (opcional)
- `service_id` (UUID): Servicio solicitado
- `preferred_staff_id` (UUID): Staff preferido (nullable)
- `preferred_date` (DATE): Fecha preferida
- `preferred_time` (TIME): Hora preferida
- `alternative_dates` (JSONB): Fechas alternativas
- `notes` (TEXT): Notas del cliente
- `status` (ENUM): pending, approved, rejected, expired
- `source` (TEXT): De dónde vino (web, whatsapp, etc.)
- `approved_by` (UUID): Quien aprobó
- `approved_at` (TIMESTAMPTZ)
- `appointment_id` (UUID): Turno creado (si fue aprobado)
- `rejection_reason` (TEXT)
- `created_at` (TIMESTAMPTZ)
- `expires_at` (TIMESTAMPTZ): Cuándo expira la solicitud

---

### 9. Recordatorios (Reminders)

Configuración y registro de recordatorios enviados.

**Configuración de recordatorios:**

- `id` (UUID)
- `organization_id` (UUID)
- `reminder_type` (ENUM): confirmation, reminder_24h, reminder_2h, followup
- `hours_before` (INTEGER): Cuántas horas antes del turno
- `method` (ENUM): whatsapp, sms, email, push
- `template` (TEXT): Plantilla del mensaje
- `is_active` (BOOLEAN)
- `created_at` (TIMESTAMPTZ)

**Registro de recordatorios enviados:**

- `id` (UUID)
- `appointment_id` (UUID)
- `reminder_type` (ENUM)
- `method` (ENUM)
- `message_content` (TEXT)
- `sent_at` (TIMESTAMPTZ)
- `delivered_at` (TIMESTAMPTZ)
- `read_at` (TIMESTAMPTZ)
- `status` (ENUM): pending, sent, delivered, read, failed
- `error_message` (TEXT)

---

### 10. Configuración del Negocio (Business Settings)

Configuración específica del negocio para la gestión de turnos.

**Campos:**

- `id` (UUID)
- `organization_id` (UUID)
- `business_hours_config` (JSONB): Horario general del negocio
- `slot_duration_minutes` (INTEGER): Duración de cada slot de tiempo (ej: 15, 30 min)
- `allow_online_booking` (BOOLEAN): Permitir reservas online
- `require_approval` (BOOLEAN): Requerir aprobación manual
- `max_advance_booking_days` (INTEGER): Máx días de anticipación
- `min_advance_booking_hours` (INTEGER): Mín horas de anticipación
- `allow_same_day_booking` (BOOLEAN)
- `cancellation_policy_hours` (INTEGER): Cuántas horas antes se puede cancelar
- `enable_waitlist` (BOOLEAN): Lista de espera
- `enable_reminders` (BOOLEAN)
- `reminder_settings` (JSONB): Configuración de recordatorios
- `booking_page_url` (TEXT): URL pública para reservas
- `booking_page_enabled` (BOOLEAN)
- `whatsapp_integration_enabled` (BOOLEAN)
- `whatsapp_bot_number` (TEXT)
- `default_appointment_color` (TEXT)
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)

**Ejemplo de configuración:**

```json
{
  "business_hours": {
    "monday": { "open": "09:00", "close": "18:00" },
    "tuesday": { "open": "09:00", "close": "18:00" },
    "wednesday": { "open": "09:00", "close": "18:00" },
    "thursday": { "open": "09:00", "close": "18:00" },
    "friday": { "open": "09:00", "close": "20:00" },
    "saturday": { "open": "10:00", "close": "15:00" },
    "sunday": { "closed": true }
  },
  "reminders": {
    "confirmation": {
      "enabled": true,
      "method": "whatsapp",
      "template": "confirmation_template_id"
    },
    "reminder_24h": { "enabled": true, "hours_before": 24 },
    "reminder_2h": { "enabled": true, "hours_before": 2 }
  }
}
```

---

### 11. Lista de Espera (Waitlist)

Para cuando no hay disponibilidad en la fecha/hora deseada.

**Campos:**

- `id` (UUID)
- `organization_id` (UUID)
- `customer_id` (UUID)
- `service_id` (UUID)
- `preferred_staff_id` (UUID): Nullable
- `preferred_date` (DATE)
- `preferred_time` (TIME)
- `flexible_dates` (BOOLEAN): Si acepta otras fechas
- `flexible_times` (BOOLEAN): Si acepta otros horarios
- `notes` (TEXT)
- `status` (ENUM): active, notified, booked, expired, cancelled
- `priority` (INTEGER): Prioridad en la lista
- `notified_at` (TIMESTAMPTZ): Cuando se le notificó de disponibilidad
- `expires_at` (TIMESTAMPTZ): Cuándo expira la oportunidad
- `created_at` (TIMESTAMPTZ)

---

### 12. Historial de Cliente (Customer History)

Registro de interacciones y turnos del cliente.

**Campos:**

- `id` (UUID)
- `customer_id` (UUID)
- `appointment_id` (UUID): Nullable
- `event_type` (ENUM): appointment_created, appointment_completed, appointment_cancelled, no_show, note_added, etc.
- `description` (TEXT)
- `metadata` (JSONB): Datos adicionales
- `created_by` (UUID)
- `created_at` (TIMESTAMPTZ)

---

### 13. Notificaciones (Notifications)

Sistema de notificaciones para el staff.

**Campos:**

- `id` (UUID)
- `user_id` (UUID): Usuario destinatario
- `organization_id` (UUID)
- `type` (ENUM): new_appointment, cancellation, appointment_soon, no_show, request_pending, etc.
- `title` (TEXT)
- `message` (TEXT)
- `appointment_id` (UUID): Nullable
- `customer_id` (UUID): Nullable
- `is_read` (BOOLEAN)
- `read_at` (TIMESTAMPTZ)
- `action_url` (TEXT)
- `created_at` (TIMESTAMPTZ)

---

## 🔄 Casos de Uso

### Casos de Uso Principales

#### 1. Cliente Solicita Turno por WhatsApp

**Flujo:**

1. Cliente escribe al WhatsApp del negocio: "Hola, necesito turno para corte"
2. Bot responde mostrando servicios disponibles
3. Cliente elige servicio y fecha/hora preferida
4. Sistema verifica disponibilidad
5. Si hay lugar: crea turno y confirma por WhatsApp
6. Si no hay lugar: ofrece alternativas o lista de espera

#### 2. Staff Crea Turno Manualmente

**Flujo:**

1. Cliente llama por teléfono
2. Staff abre la app
3. Busca o crea el cliente
4. Selecciona servicio, fecha, hora
5. Sistema valida disponibilidad
6. Confirma el turno
7. Sistema envía confirmación al cliente por WhatsApp

#### 3. Cliente Reserva Online

**Flujo:**

1. Cliente entra a la página de reservas del negocio
2. Ve calendario con disponibilidad
3. Selecciona servicio
4. Elige fecha y hora disponible
5. Ingresa sus datos (nombre, teléfono)
6. Confirma reserva
7. Si `require_approval = true`: queda pendiente de aprobación
8. Si `require_approval = false`: se confirma automáticamente
9. Recibe confirmación por WhatsApp

#### 4. Sistema Envía Recordatorio Automático

**Flujo:**

1. Job cron se ejecuta cada hora
2. Busca turnos para las próximas 24 horas sin recordatorio
3. Para cada turno:
   - Genera mensaje personalizado
   - Envía por WhatsApp/SMS
   - Marca como `reminded`
   - Registra en la tabla de recordatorios

#### 5. Cliente Confirma Asistencia

**Flujo:**

1. Cliente recibe recordatorio por WhatsApp
2. Mensaje incluye botones: "Confirmar" / "Cancelar"
3. Cliente hace clic en "Confirmar"
4. Sistema marca turno como `client_confirmed`
5. Staff ve en el dashboard que el cliente confirmó

#### 6. Cliente Cancela Turno

**Flujo:**

1. Cliente responde al recordatorio con "Cancelar" o llama
2. Staff abre el turno
3. Marca como cancelado y agrega razón
4. Sistema libera el horario
5. Si hay alguien en lista de espera: notifica disponibilidad

#### 7. Check-in de Cliente

**Flujo:**

1. Cliente llega al negocio
2. Staff abre la app, ve turnos del día
3. Marca al cliente como "Checked in"
4. Cliente pasa a esperar su turno
5. Cuando empieza el servicio: marca "In progress"
6. Cuando termina: marca "Completed"

#### 8. Cliente No Se Presenta (No Show)

**Flujo:**

1. Pasa la hora del turno + 15 minutos
2. Staff marca como "No show"
3. Sistema incrementa contador de no-shows del cliente
4. Si tiene muchos no-shows: puede requerir adelanto/depósito en futuros turnos

#### 9. Ver Agenda del Día

**Flujo:**

1. Staff abre la app en la mañana
2. Ve lista de turnos del día
3. Puede filtrar por staff, servicio, estado
4. Ve qué clientes confirmaron
5. Puede reorganizar o ajustar turnos

#### 10. Reportes y Estadísticas

**Flujo:**

1. Dueño abre sección de reportes
2. Ve estadísticas:
   - Turnos por día/semana/mes
   - Tasa de ocupación
   - Servicios más solicitados
   - Clientes frecuentes
   - Tasa de no-shows
   - Ingresos estimados
3. Puede exportar datos

---

## 📊 Flujos de Trabajo

### Flujo 1: Ciclo Completo de un Turno

```
Cliente solicita turno
  ↓
Staff/Sistema verifica disponibilidad
  ↓
Si disponible → Crea turno (estado: confirmed)
Si no disponible → Ofrece alternativas o waitlist
  ↓
Sistema envía confirmación inmediata (WhatsApp/SMS)
  ↓
24 horas antes: Sistema envía recordatorio
  ↓
Cliente confirma o no responde
  ↓
2 horas antes: Sistema envía recordatorio final
  ↓
Cliente llega → Staff hace check-in
  ↓
Servicio en progreso
  ↓
Servicio completado
  ↓
Opcionalmente: Sistema pide feedback
  ↓
Registro guardado en historial
```

### Flujo 2: Gestión de Cancelaciones

```
Cliente quiere cancelar
  ↓
¿Cuándo quiere cancelar?
  ↓
Con suficiente anticipación (> cancellation_policy_hours):
  → Cancela sin penalización
  → Sistema libera el horario
  → Busca en waitlist
  → Notifica a siguiente cliente en espera
  ↓
Sin anticipación suficiente:
  → Puede cancelar pero queda registrado
  → Puede aplicar penalización futura
```

### Flujo 3: Lista de Espera

```
Cliente quiere turno pero no hay disponibilidad
  ↓
Se agrega a lista de espera
  ↓
Cuando se libera un turno:
  → Sistema busca en waitlist
  → Notifica al primer cliente compatible
  → Cliente tiene X horas para confirmar
  → Si confirma: se crea el turno
  → Si no responde: se pasa al siguiente
```

---

## ⚙️ Consideraciones Técnicas

### 1. Sistema de Slots de Tiempo

Cada servicio tiene duración + buffer time. El sistema genera slots disponibles:

```typescript
// Ejemplo: Peluquería abre 9am-6pm, slots de 30 min
function generateAvailableSlots(
  date: Date,
  staffId: string,
  serviceId: string
) {
  const service = getService(serviceId);
  const duration = service.duration_minutes + service.buffer_time_minutes;

  // Obtener horario del staff ese día
  const availability = getStaffAvailability(staffId, date);

  // Obtener turnos existentes
  const existingAppointments = getAppointments(staffId, date);

  // Generar slots cada 30 minutos desde 9am hasta 6pm
  // Excluir los que están ocupados
  // Retornar slots disponibles
}
```

### 2. Recordatorios Automáticos

**Job de recordatorios (ejecutar cada hora):**

```sql
-- Encontrar turnos que necesitan recordatorio de 24h
SELECT *
FROM appointments
WHERE status IN ('confirmed', 'pending')
  AND appointment_date = CURRENT_DATE + INTERVAL '1 day'
  AND reminder_sent_at IS NULL
  AND organization_id IN (
    SELECT organization_id
    FROM business_settings
    WHERE enable_reminders = true
  );
```

**Plantilla de mensaje WhatsApp:**

```
¡Hola {customer_name}! 👋

Te recordamos tu turno mañana:
📅 {date}
🕐 {time}
💇 {service_name}
👤 Con {staff_name}

Por favor confirma tu asistencia respondiendo:
✅ SÍ - para confirmar
❌ NO - para cancelar

{business_name}
{business_address}
```

### 3. Integración con WhatsApp

**Opciones:**

1. **WhatsApp Business API** (oficial, costoso)
2. **Twilio WhatsApp** (más accesible)
3. **Baileys** (no oficial, gratis pero con riesgos)
4. **Evolution API** (wrapper de Baileys, más estable)

**Funcionalidades:**

- Enviar confirmaciones
- Enviar recordatorios
- Recibir respuestas (confirmar/cancelar)
- Bot conversacional para reservas

### 4. Validaciones Importantes

```typescript
// Validar que no se superpongan turnos
function validateNoOverlap(
  staffId: string,
  startTime: Date,
  endTime: Date
): boolean {
  // Buscar turnos del staff en ese rango
  // Si hay alguno activo -> retornar false
}

// Validar que esté dentro del horario de disponibilidad
function validateWithinAvailability(
  staffId: string,
  date: Date,
  time: Time
): boolean {
  // Verificar horario del día de la semana
  // Verificar excepciones (vacaciones, etc.)
}

// Validar anticipación mínima
function validateMinAdvance(appointmentDate: Date, minHours: number): boolean {
  const now = new Date();
  const diff = (appointmentDate.getTime() - now.getTime()) / (1000 * 60 * 60);
  return diff >= minHours;
}
```

### 5. Permisos (RLS)

```sql
-- Admins pueden ver todo
-- Owners pueden ver su organización
-- Staff puede ver turnos asignados a ellos o de su organización
-- Clientes solo ven sus propios turnos

CREATE POLICY "Users can view appointments of their organization"
ON appointments FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id
    FROM user_profiles
    WHERE user_id = auth.uid()
  )
);
```

### 6. Performance

**Índices críticos:**

```sql
CREATE INDEX idx_appointments_date_range
ON appointments(organization_id, appointment_date)
WHERE status NOT IN ('cancelled');

CREATE INDEX idx_customers_phone_lookup
ON customers(organization_id, phone);

CREATE INDEX idx_staff_availability_lookup
ON staff_availability(staff_id, day_of_week);
```

**Vista materializada para dashboard:**

```sql
CREATE MATERIALIZED VIEW daily_appointment_summary AS
SELECT
  organization_id,
  appointment_date,
  COUNT(*) as total_appointments,
  COUNT(*) FILTER (WHERE status = 'completed') as completed,
  COUNT(*) FILTER (WHERE status = 'no_show') as no_shows,
  COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled,
  SUM(price_charged) as total_revenue
FROM appointments
GROUP BY organization_id, appointment_date;
```

---

## 📅 Plan de Implementación

### Fase 1: Base de Datos y Backend (Semana 1)

- ✅ Migración completa de base de datos
- ✅ Tipos TypeScript
- ✅ Funciones de validación (overlaps, availability)
- ✅ RLS policies
- ✅ Seed data para testing

### Fase 2: Gestión de Clientes (Semana 2)

- ✅ Página de clientes (CRUD)
- ✅ Búsqueda de clientes
- ✅ Historial de cliente
- ✅ Etiquetas y notas

### Fase 3: Servicios y Staff (Semana 2-3)

- ✅ Página de servicios (CRUD)
- ✅ Categorías de servicios
- ✅ Página de staff (CRUD)
- ✅ Configuración de disponibilidad
- ✅ Excepciones de horario

### Fase 4: Calendario y Turnos (Semana 3-4)

- ✅ Vista de calendario (día, semana, mes)
- ✅ Crear turno manual
- ✅ Arrastrar y soltar para reprogramar
- ✅ Ver disponibilidad en tiempo real
- ✅ Validaciones de conflictos

### Fase 5: Recordatorios y Notificaciones (Semana 5)

- ✅ Configuración de recordatorios
- ✅ Job de recordatorios (cron)
- ✅ Integración WhatsApp básica
- ✅ Sistema de notificaciones in-app

### Fase 6: Reservas Online (Semana 6)

- ✅ Página pública de reservas
- ✅ Calendario de disponibilidad
- ✅ Formulario de reserva
- ✅ Confirmación automática
- ✅ URL personalizada por negocio

### Fase 7: Lista de Espera y Avanzado (Semana 7)

- ✅ Sistema de lista de espera
- ✅ Notificaciones automáticas de disponibilidad
- ✅ Reportes básicos
- ✅ Exportación de datos

### Fase 8: WhatsApp Bot (Semana 8)

- ✅ Bot conversacional
- ✅ Reservar por WhatsApp
- ✅ Confirmar/cancelar por WhatsApp
- ✅ Consultar turnos

### Fase 9: Móvil y PWA (Semana 9-10)

- ✅ PWA optimizada
- ✅ Notificaciones push
- ✅ Modo offline
- ✅ App Capacitor

### Fase 10: Reportes y Analytics (Semana 11)

- ✅ Dashboard de métricas
- ✅ Reportes personalizables
- ✅ Exportación a Excel/PDF
- ✅ Gráficos y tendencias

---

## 🎨 Diseño de UI/UX

### Dashboard Principal (Staff/Dueño)

```
┌─────────────────────────────────────────────┐
│  TurnoFlash - Mi Peluquería                 │
│  ┌──────┬──────┬──────┬──────┐             │
│  │ Hoy  │Mañana│Semana│ Mes  │             │
│  └──────┴──────┴──────┴──────┘             │
│                                             │
│  Turnos de Hoy - Martes 14 Ene            │
│  ┌─────────────────────────────────────┐   │
│  │ 09:00 - Juan Pérez                  │   │
│  │ 💇 Corte de pelo • María            │   │
│  │ ✅ Confirmado  [Check-in] [Ver]     │   │
│  ├─────────────────────────────────────┤   │
│  │ 10:00 - Ana García                  │   │
│  │ 💅 Manicure • Laura                 │   │
│  │ ⏰ Recordado  [Check-in] [Ver]      │   │
│  ├─────────────────────────────────────┤   │
│  │ 11:30 - Carlos López                │   │
│  │ 💇 Corte + Barba • María            │   │
│  │ ❓ Sin confirmar [Llamar] [Ver]     │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  [+ Nuevo Turno]  [Ver Calendario]         │
│                                             │
│  📊 Resumen:                                │
│  • 12 turnos hoy (10 confirmados)          │
│  • 85% ocupación                            │
│  • 2 solicitudes pendientes                 │
└─────────────────────────────────────────────┘
```

### Calendario

Vista semanal con columnas por staff/recurso:

```
┌─────────────────────────────────────────────────┐
│  Semana del 13-19 Enero 2025                    │
│  ┌───────┬─────────┬─────────┬─────────┐       │
│  │ Hora  │ María   │ Laura   │ Pedro   │       │
│  ├───────┼─────────┼─────────┼─────────┤       │
│  │ 09:00 │ [Juan P]│         │ [Ana M] │       │
│  │       │ Corte   │         │ Barba   │       │
│  ├───────┼─────────┼─────────┼─────────┤       │
│  │ 10:00 │         │ [Carlos]│ [Ana M] │       │
│  │       │         │ Manicure│ (cont.) │       │
│  ├───────┼─────────┼─────────┼─────────┤       │
│  │ 11:00 │ [Pedro]  │         │         │       │
│  │       │ Tintura │         │         │       │
│  └───────┴─────────┴─────────┴─────────┘       │
│                                                 │
│  [+ Agregar Turno]  [Hoy] [Filtros]           │
└─────────────────────────────────────────────────┘
```

### Página Pública de Reservas

```
┌─────────────────────────────────────────┐
│    💇 Peluquería Elegante                │
│                                          │
│  Reserva tu turno online                 │
│                                          │
│  1️⃣ Selecciona un servicio:             │
│  ┌──────────────────────────────────┐   │
│  │ 💇 Corte de pelo (30 min) - $500 │   │
│  │ 💇 Corte + Barba (45 min) - $700 │   │
│  │ 💅 Manicure (45 min) - $600      │   │
│  │ 🎨 Tintura (120 min) - $2000     │   │
│  └──────────────────────────────────┘   │
│                                          │
│  2️⃣ Elige fecha y hora:                 │
│  [📅 Calendario]                         │
│                                          │
│  3️⃣ Tus datos:                          │
│  Nombre: [____________]                  │
│  Teléfono: [____________]                │
│  Email (opcional): [____________]        │
│                                          │
│  [Confirmar Reserva]                     │
└─────────────────────────────────────────┘
```

---

## 🔐 Seguridad y Privacidad

### Datos Sensibles

- Teléfonos encriptados
- Emails encriptados
- GDPR compliance
- Retención de datos configurable
- Exportación de datos personales

### Logs de Auditoría

- Quién creó/modificó/canceló turnos
- Cambios en la información de clientes
- Accesos al sistema

---

## 📱 Características Mobile

### App para Staff (Capacitor)

- Dashboard de turnos del día
- Check-in rápido con QR
- Notificaciones push
- Modo offline

### App para Clientes (opcional)

- Ver mis turnos
- Reservar fácilmente
- Cancelar/reprogramar
- Historial

---

## 🚀 Tecnologías

**Frontend:**

- Next.js 14+ (App Router)
- React 18+
- TypeScript
- Tailwind CSS
- Shadcn/ui
- React Big Calendar / FullCalendar
- date-fns

**Backend:**

- Supabase (PostgreSQL)
- Row Level Security
- Realtime subscriptions
- Edge Functions

**Integraciones:**

- Twilio (WhatsApp/SMS)
- Evolution API (WhatsApp)
- SendGrid (Email)

**Cron Jobs:**

- Supabase pg_cron
- Vercel Cron (serverless functions)

---

## 📈 Métricas de Éxito

### KPIs

1. **Tasa de ocupación**: > 80%
2. **Tasa de no-shows**: < 10%
3. **Tiempo de reserva**: < 2 minutos
4. **Confirmaciones**: > 70% de clientes confirman
5. **Satisfacción**: Rating promedio > 4.5/5

---

## 🎯 Próximos Pasos Inmediatos

1. Crear migración de base de datos completa ✅
2. Crear tipos TypeScript ✅
3. Implementar CRUD de clientes ✅
4. Implementar CRUD de servicios ✅
5. Implementar CRUD de staff ✅
6. Crear componente de calendario ✅
7. Implementar creación de turnos ✅

**¡Empecemos! 🚀**
