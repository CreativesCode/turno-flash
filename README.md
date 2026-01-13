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
