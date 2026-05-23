# 🗓️ TurnoFlash - Sistema de Gestión de Turnos

Sistema completo de gestión de citas/turnos para negocios de servicios. Ideal para peluquerías, consultorios médicos, spas, talleres, y cualquier negocio que necesite agendar citas con clientes.

![Estado](https://img.shields.io/badge/Estado-Production%20Ready-success)
![Next.js](https://img.shields.io/badge/Next.js-14+-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5+-blue)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-green)

---

## ✨ Características Principales

### 🎯 Gestión Completa de Turnos

- ✅ Crear, editar y cancelar turnos/citas
- ✅ **10 estados de turno** con flujo completo y flexible
- ✅ Asignación de clientes, servicios y profesionales
- ✅ Cálculo automático de duración
- ✅ Filtros y búsqueda avanzada
- ✅ Estadísticas en tiempo real
- ✅ **Sistema de recordatorios** manual y automático (WhatsApp)
- ✅ Saltos de estado permitidos (flexibilidad operativa)

### 👥 Gestión de Clientes

- ✅ Base de datos completa de clientes
- ✅ Historial de turnos y ausencias
- ✅ Tags y notas personalizadas
- ✅ Búsqueda rápida por nombre, teléfono o email
- ✅ Tracking automático de visitas

### 📦 Gestión de Servicios

- ✅ Catálogo de servicios con precios y duraciones
- ✅ Buffer time entre servicios
- ✅ Configuración de anticipación de reservas
- ✅ Disponibilidad para reserva online
- ✅ Categorización de servicios

### 👨‍💼 Gestión de Profesionales

- ✅ Staff/equipo de trabajo
- ✅ Especialidades y biografía
- ✅ Horarios de disponibilidad (próximamente)
- ✅ Configuración de reservas

### 🔐 Sistema de Roles y Permisos

- ✅ **Admin** - Control total del sistema
- ✅ **Owner** - Gestión completa de su negocio
- ✅ **Staff** - Operación diaria de turnos

### 🏢 Multi-Organización

- ✅ Múltiples negocios en una instancia
- ✅ Aislamiento de datos por organización
- ✅ Sistema de licencias por organización
- ✅ Configuración independiente

---

## 🚀 Inicio Rápido

### Prerrequisitos

- Node.js 18+
- Cuenta de Supabase
- npm o yarn

### Instalación

```bash
# Clonar el repositorio
git clone <repo-url>
cd turno-flash

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env.local
# Editar .env.local con tus credenciales de Supabase
```

### Configurar Base de Datos

```bash
# Opción 1: Con Supabase CLI
supabase db push

# Opción 2: Manualmente
# 1. Ve a tu proyecto en https://supabase.com
# 2. SQL Editor
# 3. Ejecuta los archivos en orden:
#    - supabase/migrations/001_auth_and_roles.sql
#    - supabase/migrations/007_allow_create_organizations.sql
#    - supabase/migrations/008_add_license_management.sql
#    - supabase/migrations/009_update_handle_new_user_for_org_assignment.sql
#    - supabase/migrations/010_appointment_system.sql ⭐
```

### Ejecutar en Desarrollo

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000)

---

## 📚 Documentación

### Guías Principales

- **[RESUMEN-FINAL.md](docs/RESUMEN-FINAL.md)** - 📋 Resumen ejecutivo completo
- **[QUICK-START.md](docs/QUICK-START.md)** - 🚀 Guía de inicio rápido
- **[mobile-quick-start.md](docs/mobile-quick-start.md)** - 📱 Desarrollo móvil rápido ⭐ NUEVO
- **[ROLES-AND-PERMISSIONS.md](docs/ROLES-AND-PERMISSIONS.md)** - 🔐 Sistema de permisos

### Documentación Técnica

- **[APPOINTMENT-SYSTEM.md](docs/APPOINTMENT-SYSTEM.md)** - 📖 Análisis técnico completo
- **[APPOINTMENT-FLOW.md](docs/APPOINTMENT-FLOW.md)** - 🔄 Flujo de estados de turnos
- **[REMINDERS-SETUP.md](docs/REMINDERS-SETUP.md)** - 🔔 Sistema de recordatorios
- **[mobile-implementation.md](docs/mobile-implementation.md)** - 📱 Implementación móvil detallada ⭐ NUEVO
- **[IMPLEMENTATION-PROGRESS.md](docs/IMPLEMENTATION-PROGRESS.md)** - 📊 Estado de implementación
- **[SETUP-LICENCIAS.md](docs/SETUP-LICENCIAS.md)** - 🎫 Sistema de licencias

---

## 🎭 Roles del Sistema

### Admin (Administrador)

- ✅ Control total del sistema
- ✅ Gestionar todas las organizaciones
- ✅ Crear usuarios y asignar roles
- ✅ No afectado por licencias

### Owner (Dueño)

- ✅ Gestión completa de su organización
- ✅ Crear/editar servicios, staff, clientes, turnos
- ✅ Invitar usuarios a su organización
- ⚠️ Sujeto a licencia

### Staff (Empleado)

- ✅ Crear y gestionar turnos
- ✅ Ver y editar clientes
- ✅ Ver servicios y staff (solo lectura)
- ⚠️ Sujeto a licencia

---

## 🔄 Flujo de Estados de Turnos

El sistema maneja **10 estados diferentes** para los turnos, permitiendo un control completo del ciclo de vida:

### Estados Disponibles

| Estado             | Icono | Descripción                 |
| ------------------ | ----- | --------------------------- |
| `pending`          | ⏳    | Pendiente de aprobación     |
| `confirmed`        | ✓     | Confirmado por el staff     |
| `reminded`         | 🔔    | Recordatorio enviado        |
| `client_confirmed` | 👤    | Cliente confirmó asistencia |
| `checked_in`       | 📍    | Cliente llegó al local      |
| `in_progress`      | 🚀    | Servicio en progreso        |
| `completed`        | ✅    | Servicio completado         |
| `cancelled`        | ❌    | Turno cancelado             |
| `no_show`          | ⚠️    | Cliente no se presentó      |

### Flujo Típico

```
Crear → Confirmar → Recordar → Cliente Confirma → Check-in → Iniciar → Completar
```

### Flexibilidad

✅ **Se permite saltar estados** para cubrir casos reales:

- Olvidaste marcar check-in → Puedes ir directo a "Completar"
- Cliente llegó sin confirmar → Puedes hacer check-in directamente
- Staff necesita marcar retrospectivamente → Estados flexibles

📖 **Ver documentación completa**: [APPOINTMENT-FLOW.md](docs/APPOINTMENT-FLOW.md)

---

## 🏗️ Arquitectura

### Stack Tecnológico

- **Frontend:** Next.js 14, React 18, TypeScript
- **Styling:** Tailwind CSS, Lucide Icons
- **Backend:** Supabase (PostgreSQL, Auth, Realtime)
- **Seguridad:** Row Level Security (RLS)
- **Deployment:** Vercel (recomendado)

### Estructura del Proyecto

```
turno-flash/
├── app/                    # Páginas Next.js (App Router)
│   ├── dashboard/         # Dashboard principal
│   │   ├── appointments/  # 🗓️ Gestión de turnos
│   │   ├── customers/     # 👥 Gestión de clientes
│   │   ├── services/      # 📦 Gestión de servicios
│   │   ├── staff/         # 👨‍💼 Gestión de profesionales
│   │   ├── organizations/ # 🏢 Organizaciones (Admin)
│   │   └── users/         # 👤 Usuarios (Admin)
│   ├── auth/              # Autenticación
│   └── api/               # API routes
├── components/            # Componentes React
├── contexts/             # Context providers
├── hooks/                # Custom hooks
├── types/                # TypeScript types
├── utils/                # Utilidades
├── supabase/             # Configuración Supabase
│   ├── migrations/       # Migraciones SQL
│   └── functions/        # Edge functions
└── docs/                 # Documentación
```

---

## 📊 Base de Datos

### Tablas Principales

| Tabla               | Descripción              | Registros |
| ------------------- | ------------------------ | --------- |
| `organizations`     | Negocios/empresas        | 1+        |
| `user_profiles`     | Usuarios del sistema     | N         |
| `customers`         | Clientes de los negocios | N         |
| `services`          | Servicios ofrecidos      | N         |
| `staff_members`     | Profesionales/empleados  | N         |
| `appointments`      | **Turnos/citas** ⭐      | N         |
| `business_settings` | Configuración            | 1 por org |

**14 tablas totales** con Row Level Security completo.

---

## 🎯 Casos de Uso

### Peluquería

```
Servicios: Corte hombre (30min), Tintura (120min), Manicure (45min)
Staff: María (Estilista), Pedro (Barbero), Laura (Colorista)

Flujo:
1. Cliente llama pidiendo turno
2. Recepcionista busca al cliente
3. Selecciona "Corte hombre" con "Pedro"
4. Elige horario disponible: Hoy 15:00
5. Sistema calcula fin: 15:30 (automático)
6. Turno creado ✅
7. Cliente llega → Check-in
8. Servicio completado → Marcar como completado
```

### Consultorio Médico

```
Servicios: Consulta (30min), Seguimiento (15min), Procedimiento (60min)
Staff: Dr. García, Dra. Martínez

Flujo similar con gestión de citas médicas
```

### Taller Mecánico

```
Servicios: Diagnóstico (30min), Service completo (90min)
Staff: Mecánicos especializados

Gestión de citas para revisiones y reparaciones
```

**El sistema es flexible y se adapta a cualquier tipo de negocio de servicios.**

---

## 🔒 Seguridad

### Row Level Security (RLS)

Todas las tablas tienen políticas RLS que aseguran:

- ✅ Usuarios solo ven datos de su organización
- ✅ Admins pueden ver todo
- ✅ Staff tiene acceso limitado según rol
- ✅ Validación a nivel de base de datos

### Sistema de Licencias

- ✅ Control de acceso por organización
- ✅ Período de gracia configurable (7 días default)
- ✅ Bloqueo automático al expirar
- ✅ Notificaciones de vencimiento

---

## 📱 App Móvil Nativa (Capacitor)

### Características Móviles ⭐

- ✅ **Navbar móvil** con hamburger menu
- ✅ **Safe areas** para barra de estado (notch, status bar)
- ✅ **Status bar nativa** con color adaptativo según tema
- ✅ **Sidebar drawer** con overlay y animaciones suaves
- ✅ **Componente de debug** para desarrollo (solo dev)
- ✅ **Build listo para iOS y Android**

### Responsive Design

- ✅ Desktop (1920px+) - Sidebar fijo
- ✅ Laptop (1024px) - Sidebar fijo
- ✅ Tablet (768px) - Navbar + Drawer
- ✅ Mobile (375px+) - Navbar + Drawer
- ✅ **Apps Nativas** (iOS/Android) - Safe areas + Status bar

📖 **Ver guía móvil completa**: [mobile-quick-start.md](docs/mobile-quick-start.md)

---

## 🎨 UI/UX

### Características

- ✅ Dark mode completo
- ✅ Animaciones suaves
- ✅ Feedback visual inmediato
- ✅ Iconos consistentes
- ✅ Colores personalizables
- ✅ Búsqueda en tiempo real
- ✅ Filtros inteligentes

### Componentes

- Modales para formularios
- Tarjetas informativas
- Badges de estado
- Loading states
- Empty states
- Error messages

---

## 📈 Estado del Proyecto

### Implementado ✅

- [x] Sistema de autenticación y roles
- [x] Gestión de organizaciones
- [x] Sistema de licencias
- [x] CRUD completo de clientes
- [x] CRUD completo de servicios
- [x] CRUD completo de staff/profesionales
- [x] Gestión básica de turnos
- [x] Filtros y búsquedas
- [x] Dashboard con permisos
- [x] Estadísticas básicas
- [x] Row Level Security
- [x] Responsive design

### En Desarrollo 🚧

- [ ] Calendario visual (día/semana/mes)
- [ ] Sistema de recordatorios automáticos
- [ ] Página pública de reservas
- [ ] Validación avanzada de disponibilidad
- [ ] Configuración de horarios de staff

### Implementado Recientemente ⚡

- [x] **App móvil con Capacitor** 📱
- [x] Navbar móvil adaptativo
- [x] Safe areas para iOS/Android
- [x] Status bar nativa
- [x] Componente de debug móvil

### Planeado 📋

- [ ] WhatsApp bot completo
- [ ] Reportes avanzados
- [ ] Lista de espera inteligente
- [ ] Integración con pagos
- [ ] IA para sugerencias
- [ ] Calendario visual mejorado

**Progreso Total: ~70%**

---

## 🤝 Contribuir

Este es un proyecto privado. Para contribuir:

1. Crea una rama feature
2. Haz tus cambios
3. Escribe tests (si aplica)
4. Crea un Pull Request

---

## 📝 Variables de Entorno

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=tu_url_de_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_clave_anon

# Licencias
NEXT_PUBLIC_LICENSE_GRACE_PERIOD_DAYS=7

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 💬 Integración WhatsApp (OpenWA)

TurnoFlash se integra con [OpenWA](https://github.com/rmyndharis/OpenWA) (gateway open-source de WhatsApp) para mandar y recibir mensajes automáticamente.

### Qué hace la integración

| # | Caso | Trigger | Resultado |
|---|------|---------|-----------|
| 1 | Confirmación de turno | INSERT en `appointments` (trigger DB) | WA al cliente + WA al negocio |
| 2 | Recordatorio T-24h | Cron cada 15 min | WA al cliente, marca `reminded` |
| 3 | Recordatorio T-1h | Cron cada 15 min | WA al cliente |
| 4 | Cancelar / Confirmar por reply | Webhook `message.received` | UPDATE `appointments` + ack al cliente + WA al negocio |

### 1. Levantar OpenWA en local

```bash
git clone https://github.com/rmyndharis/OpenWA.git
cd OpenWA
npm install
cp .env.minimal .env
mkdir -p data/sessions data/media
npm run start:dev
```

- API: `http://localhost:2785/api`
- Swagger: `http://localhost:2785/api/docs`
- La API key se autogenera en `data/.api-key` (formato `owa_<32 chars>`)

### 2. Crear y conectar la sesión WhatsApp

```bash
# Variables locales para los comandos
$env:OPENWA_BASE_URL = "http://localhost:2785/api"
$env:OPENWA_API_KEY  = "owa_xxxxx"   # leer de OpenWA/data/.api-key

# Crear sesión
curl -X POST "$env:OPENWA_BASE_URL/sessions" `
  -H "X-API-Key: $env:OPENWA_API_KEY" `
  -H "Content-Type: application/json" `
  -d '{"name":"turnoflash-prod"}'

# Iniciarla
curl -X POST "$env:OPENWA_BASE_URL/sessions/{sessionId}/start" `
  -H "X-API-Key: $env:OPENWA_API_KEY"

# Pedir QR y escanear desde el WhatsApp del negocio
curl "$env:OPENWA_BASE_URL/sessions/{sessionId}/qr" `
  -H "X-API-Key: $env:OPENWA_API_KEY"
```

Guardá el `sessionId` (`sess_xxx`) — lo necesitás en el paso 4.

### 3. Configurar secrets de Supabase Edge Functions

> Cuando despliegues OpenWA a una VPS, sólo cambias `OPENWA_BASE_URL` con el mismo comando. Nada más cambia.

```bash
npx supabase secrets set \
  OPENWA_BASE_URL=http://host.docker.internal:2785/api \
  OPENWA_API_KEY=owa_xxxxx \
  OPENWA_WEBHOOK_SECRET=$(openssl rand -hex 32)
```

(`host.docker.internal` funciona desde Edge Functions corriendo en Supabase local. Para producción usá el dominio de la VPS.)

### 4. Aplicar migración + configurar negocio

```bash
npx supabase db push   # aplica supabase/migrations/014_whatsapp_integration.sql
```

En el dashboard de Supabase Studio (o vía SQL), activá WhatsApp para tu organización:

```sql
-- 1. Tu organización debe tener el número del negocio para recibir notificaciones
UPDATE organizations
SET whatsapp_phone = '5491155556666'   -- sin '+', código país + número
WHERE id = '<tu-org-id>';

-- 2. Activá la integración y guardá el sessionId de OpenWA
UPDATE business_settings
SET
  whatsapp_integration_enabled = true,
  openwa_session_id = 'sess_xxxxx'
WHERE organization_id = '<tu-org-id>';

-- 3. Config para que el trigger DB pueda llamar a las Edge Functions
INSERT INTO app_config (key, value, description) VALUES
  ('SUPABASE_URL',              'http://kong:8000',          'URL interna usada por triggers DB'),
  ('SUPABASE_SERVICE_ROLE_KEY', 'eyJhbGciOi...',             'Service role key (no exponer)')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
```

> Producción: `SUPABASE_URL` será `https://<proyecto>.supabase.co`.

### 5. Desplegar las Edge Functions

```bash
npx supabase functions deploy wa-send
npx supabase functions deploy wa-inbound
npx supabase functions deploy send-reminders
```

### 6. Registrar el webhook inbound en OpenWA

OpenWA tiene que poder alcanzar la URL pública de `wa-inbound`. Para desarrollo con OpenWA local + Supabase remoto, la URL es:

```
https://<proyecto>.supabase.co/functions/v1/wa-inbound
```

Registrar (una sola vez por sesión):

```bash
curl -X POST "$env:OPENWA_BASE_URL/sessions/{sessionId}/webhooks" `
  -H "X-API-Key: $env:OPENWA_API_KEY" `
  -H "Content-Type: application/json" `
  -d '{
    "url": "https://<proyecto>.supabase.co/functions/v1/wa-inbound",
    "events": ["message.received","session.disconnected","session.qr"],
    "secret": "<el-mismo-OPENWA_WEBHOOK_SECRET-del-paso-3>"
  }'
```

### 7. Cron para recordatorios

En el SQL Editor de Supabase:

```sql
-- pg_cron ya viene habilitado en Supabase
SELECT cron.schedule(
  'wa-reminders',
  '*/15 * * * *',
  $$ SELECT net.http_post(
       url := 'https://<proyecto>.supabase.co/functions/v1/send-reminders',
       headers := jsonb_build_object(
         'Authorization', 'Bearer <SUPABASE_SERVICE_ROLE_KEY>',
         'Content-Type', 'application/json'
       )
     ); $$
);

-- Cleanup diario de idempotencia
SELECT cron.schedule(
  'wa-cleanup-idempotency',
  '0 4 * * *',
  $$ SELECT public.cleanup_wa_processed_events(); $$
);
```

### 8. Probar la integración end-to-end

```sql
-- Crear un appointment de prueba → debería disparar la confirmación
INSERT INTO appointments (
  organization_id, customer_id, service_id,
  appointment_date, start_time, end_time,
  status, source
) VALUES (
  '<tu-org-id>', '<customer-id>', '<service-id>',
  CURRENT_DATE + 1, '10:00', '10:30',
  'confirmed', 'admin'
);

-- Ver los envíos
SELECT * FROM wa_outbound_messages ORDER BY sent_at DESC LIMIT 10;
```

### Cambiar la URL de OpenWA (al mover a VPS)

```bash
npx supabase secrets set OPENWA_BASE_URL=https://wa.tu-dominio.com/api
# Y volver a registrar el webhook en OpenWA-VPS apuntando al mismo Supabase
```

### Tablas e items que crea la migración

- `app_config` — bridge para credenciales Supabase usadas por triggers DB
- `business_settings.openwa_session_id` — sesión OpenWA por negocio
- `wa_outbound_messages` — registro de cada envío (status, error, ack)
- `wa_processed_events` — idempotencia de webhooks
- Trigger `trg_wa_send_on_appointment_insert` — confirmación + notif al negocio
- RPC `wa_appointments_in_window` — usado por `send-reminders`

### ⚠️ Riesgos a tener en cuenta

- WhatsApp puede banear números por uso no oficial → usar un número dedicado, no el personal.
- Si la sesión cae, `wa-inbound` registra una notificación interna (`type=wa_session_down`); hay que re-escanear el QR desde OpenWA.
- Rate limit OpenWA: 60 envíos/min por sesión. Suficiente para confirmaciones 1-a-1; para broadcasts usar `send-bulk`.

---

## 🐛 Troubleshooting

### No puedo ver las nuevas páginas

- ✅ Verifica que ejecutaste todas las migraciones
- ✅ Reinicia el servidor de desarrollo
- ✅ Limpia el caché del navegador

### Error de permisos

- ✅ Verifica que tu usuario tenga una organización asignada
- ✅ Verifica que la licencia de tu organización esté activa
- ✅ Verifica tu rol en la tabla `user_profiles`

### No aparecen datos

- ✅ Verifica que estés logueado
- ✅ Verifica la consola del navegador
- ✅ Verifica que los datos pertenezcan a tu organización
- ✅ Revisa las políticas RLS en Supabase

---

## 📞 Soporte

Para problemas o preguntas:

1. Revisa la [documentación](docs/)
2. Verifica los [issues conocidos](#troubleshooting)
3. Contacta al equipo de desarrollo

---

## 📄 Licencia

Copyright © 2026 TurnoFlash. Todos los derechos reservados.

---

## 🎉 Agradecimientos

Construido con ❤️ usando:

- [Next.js](https://nextjs.org/)
- [React](https://react.dev/)
- [Supabase](https://supabase.com/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Lucide Icons](https://lucide.dev/)

---

<div align="center">

**TurnoFlash** - Gestiona tu negocio de manera profesional

[Documentación](docs/) • [Inicio Rápido](docs/QUICK-START.md) • [Roles y Permisos](docs/ROLES-AND-PERMISSIONS.md)

</div>
