# Turno Flash — Sistema de Reservas (Next.js SPA + Capacitor + Supabase)

Sistema de **reservas/turnos** para salones, barberías, clínicas y talleres, pensado para **bajo costo**, **bajo consumo de datos** y operación cómoda **desde el móvil del dueño**.

---

## Objetivo del Producto

- Reducir **doble reserva**, llamadas y desorden
- Dar al negocio:
  - **Calendario** móvil-first (día/semana) + gestión de turnos
  - **Página pública de reservas** ultraligera
  - Confirmaciones por **WhatsApp** (manual → semi-auto → auto)

---

## Stack Tecnológico

### Frontend

- **Next.js** con `output: "export"` (static export) - **OBLIGATORIO para Capacitor**
- **React** 19+ con Context API para estado global
- **Tailwind CSS** para estilos
- **TypeScript** estricto

### Móvil

- **Capacitor** (iOS/Android) - **un solo código base**
- Build: `npm run build` → `npx cap sync` → build nativo

### Backend

- **Supabase** (PostgreSQL + Auth + Realtime + Edge Functions + Storage)
  - **RLS (Row Level Security)** - protección real de datos
  - Auth con magic links para invitaciones + contraseñas para login
  - Edge Functions para operaciones sensibles (invitaciones, etc.)

---

## Arquitectura Implementada

### ✅ Estado Actual

El proyecto usa **static export** (`output: "export"`) porque:

- ✅ **Capacitor requiere archivos estáticos** en `/out`
- ✅ Deploy ultra barato (CDN)
- ✅ Un solo código para web + móvil

### Autenticación: 100% Client-Side

**IMPORTANTE:** Con static export **NO se puede usar**:

- ❌ Middleware de Next.js
- ❌ Route handlers (API routes)
- ❌ Server Components con datos dinámicos

**SOLUCIÓN IMPLEMENTADA:**

- ✅ **AuthContext** (React Context API) para estado global
- ✅ **ProtectedRoute** (componente client-side) para UX
- ✅ **RLS en Supabase** para protección REAL de datos
- ✅ Magic links para invitaciones
- ✅ Login con contraseña para usuarios existentes

### Flujo de Autenticación

1. **Sistema de Invitaciones:**

   - Solo admins pueden invitar usuarios (`/dashboard/invite`)
   - Se envía magic link de invitación
   - Usuario configurable su contraseña (`/auth/setup-password`)
   - Después del setup, login con email + contraseña

2. **Login Regular:**

   - Usuarios existentes usan `/login` con email + contraseña
   - Redirige a `/dashboard` si es exitoso

3. **Protección de Rutas:**
   - `<ProtectedRoute>` verifica autenticación client-side
   - Si no autenticado → redirige a `/login`
   - **RLS en Supabase** protege los datos (server-side)

### Seguridad

**RLS (Row Level Security) es la ÚNICA protección real:**

- Cada query SQL pasa por políticas RLS
- Funciona en web, móvil, y desde cualquier cliente
- No depende de Next.js ni middleware
- Las políticas SQL controlan acceso a datos

Ver `docs/CORRECCION-capacitor.md` para más detalles sobre esta decisión arquitectónica.

---

## Estructura del Proyecto

```
/
├── app/                    # Next.js App Router
│   ├── layout.tsx         # Root con AuthProvider
│   ├── page.tsx           # Home (redirige según auth)
│   ├── login/             # Login público (email + contraseña)
│   ├── auth/
│   │   ├── callback/      # Procesa magic links
│   │   └── setup-password/ # Usuarios invitados crean contraseña
│   └── dashboard/         # Panel protegido
│       ├── invite/        # Invitar usuarios (solo admin)
│       └── users/         # Gestión de usuarios (solo admin)
│
├── components/
│   └── protected-route.tsx # HOC para proteger rutas
│
├── contexts/
│   └── auth-context.tsx   # Estado global de autenticación
│
├── hooks/
│   └── use-auth.ts        # Re-export desde context
│
├── types/
│   └── auth.ts            # Tipos de auth y roles
│
├── utils/
│   ├── auth.ts            # Helpers de permisos
│   └── supabase/
│       └── client.ts      # Cliente de Supabase
│
├── supabase/
│   ├── migrations/        # Migraciones SQL (RLS)
│   │   └── 001_auth_and_roles.sql
│   └── functions/         # Edge Functions
│       └── invite-user/   # Función para invitar usuarios
│
├── out/                   # ⭐ Generado por `npm run build`
│   └── ...               # Archivos estáticos para Capacitor
│
├── ios/                   # Proyecto iOS (Capacitor)
├── android/              # Proyecto Android (Capacitor)
│
├── capacitor.config.ts   # Config: webDir: "out"
└── next.config.ts        # Config: output: "export"
```

---

## Configuración y Setup

### 1. Variables de Entorno

Crea `.env.local` en la raíz:

```env
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key-aqui
```

### 2. Setup de Supabase

**IMPORTANTE:** Ejecuta las migraciones SQL antes de usar la app.

1. Ve a Supabase Dashboard → SQL Editor
2. Ejecuta el contenido de `supabase/migrations/001_auth_and_roles.sql`
3. Configura Redirect URLs en Authentication → URL Configuration:
   - `http://localhost:3000/auth/callback`
   - `https://tu-dominio.com/auth/callback` (producción)
   - `capacitor://localhost/auth/callback` (móvil)

Ver `docs/supabase-setup.md` para más detalles.

### 3. Crear Primer Usuario Admin

1. Crea un usuario desde la app (`/login`)
2. En Supabase SQL Editor, ejecuta:

```sql
UPDATE public.user_profiles
SET role = 'admin'
WHERE email = 'tu-email@ejemplo.com';
```

### 4. Desplegar Edge Function (Opcional)

Para que las invitaciones funcionen automáticamente, despliega la edge function:

```bash
npx supabase login
npx supabase link --project-ref TU_PROJECT_REF
npx supabase functions deploy invite-user
```

Ver `docs/deploy-edge-function.md` para instrucciones completas.

**Alternativa:** Puedes invitar usuarios manualmente desde Supabase Dashboard → Authentication → Users → Invite user.

---

## Comandos Importantes

### Desarrollo

```bash
npm run dev              # Next.js dev server (http://localhost:3000)
npm run build            # Genera /out con archivos estáticos
npm run lint             # Verificar código
```

### Build para Producción

```bash
npm run build            # Genera /out con archivos estáticos
```

### Capacitor (Móvil)

```bash
npm run build            # Primero generar /out
npx cap sync             # Copiar /out a ios/ y android/
npx cap open ios         # Abrir Xcode
npx cap open android     # Abrir Android Studio
```

### Supabase (Opcional - Local)

```bash
npx supabase start       # Supabase local
npx supabase db push     # Aplicar migraciones
npx supabase gen types   # Generar tipos TypeScript
```

---

## Roles y Permisos

### Roles Disponibles

- **`admin`**: Acceso total al sistema

  - Puede gestionar usuarios, organizaciones, servicios, bookings
  - Puede cambiar roles de otros usuarios
  - No tiene restricciones

- **`owner`**: Dueño del negocio

  - Gestiona su organización
  - Puede gestionar servicios y bookings
  - No puede gestionar usuarios (solo admins)

- **`staff`**: Empleado normal

  - Puede ver y gestionar bookings
  - No puede modificar configuración

- **`special`**: Usuario con permisos especiales
  - Permisos personalizables según necesidad

### Permisos

- `manage_users`: Gestionar usuarios (solo admin)
- `manage_organization`: Gestionar organización
- `manage_services`: Gestionar servicios
- `manage_bookings`: Gestionar reservas
- `view_bookings`: Ver reservas
- `manage_settings`: Gestionar configuración

---

## Flujo de Invitaciones

El sistema utiliza un flujo de **invitaciones** para el registro de usuarios:

1. **Admin invita usuario:**

   - Va a `/dashboard/invite`
   - Ingresa email del nuevo usuario
   - Sistema envía magic link de invitación

2. **Usuario invitado:**

   - Recibe email con magic link
   - Hace clic → `/auth/callback?type=invite`
   - Redirige a `/auth/setup-password`
   - Crea su contraseña
   - Redirige a `/dashboard`

3. **Login subsiguiente:**
   - Usuario va a `/login`
   - Ingresa email + contraseña
   - Accede a `/dashboard`

**Ver `docs/invitation-flow.md` para documentación técnica completa.**

---

## Estrategia de Despliegue

### Multi-instancia "sin forks"

- **Un solo repositorio template**
- Por **cada cliente**:

  - 1 **Proyecto Supabase** (idealmente en cuenta del cliente)
  - 1 **Proyecto Vercel/CDN** con env vars apuntando a "su" Supabase

- Beneficio: actualizas el template una vez y puedes replicar cambios sin la pesadilla de forks

### Consideraciones de Costo

- **Supabase Free:**

  - Se pausan tras 1 semana de inactividad
  - Límite de 2 proyectos activos en free
  - Recomendación: que cada cliente sea owner de su Supabase

- **Vercel Hobby (gratis):**

  - Restringido a uso personal/no comercial
  - Para clientes reales: Vercel Pro/Enterprise o CDN estático

- **Static Export:**
  - Permite deploy en cualquier CDN (Vercel, Netlify, Cloudflare, S3+CloudFront)
  - Costo mínimo o $0 dependiendo del proveedor

---

## Modelo de Datos (Propuesto)

### Tablas Principales

- **`user_profiles`**: Perfiles de usuario con roles
- **`organizations`**: Organizaciones/negocios
- **`services`**: Servicios ofrecidos
- **`availability_rules`**: Horarios semanales
- **`availability_exceptions`**: Excepciones (feriados, etc.)
- **`customers`**: Clientes
- **`bookings`**: Reservas/turnos

### Reglas de Negocio

- **Anti solape:** Un turno no puede solaparse con otro del mismo recurso
- **RLS:** Todas las tablas protegidas con Row Level Security
- **Validaciones:** En base de datos (triggers, constraints) + UI

---

## WhatsApp: Niveles de Integración (Futuro)

### Nivel A — "Click to WhatsApp" (MVP, costo ~0)

- No API. Se usa `wa.me` con mensaje prellenado
- El sistema crea el turno y muestra botones
- Ventajas: rápido, cero verificación, funciona con WhatsApp normal

### Nivel B — Semi-automático (costo ~0)

- Plantillas de texto pre-armadas dentro del panel
- Historial básico de "mensajes preparados"

### Nivel C — WhatsApp Business Platform (automático)

- Envío automático desde Edge Function + webhook
- Requiere Message Templates aprobados
- Pricing variable según Meta

> En el template, Nivel C debe estar implementado como **add-on**, para que el cliente pague el costo variable.

---

## Principios Inmutables

1. **`output: 'export'` es obligatorio** (Capacitor lo requiere)
2. **RLS es la única seguridad real** (todo lo demás es UX)
3. **Client-side auth es suficiente** (con RLS protegiendo datos)
4. **Un solo código para web + móvil** (no crear variantes)
5. **Edge Functions para secretos** (nunca en el cliente)

---

## Troubleshooting Común

### Build genera server, no /out

❌ **Problema:** Falta `output: 'export'` en next.config.ts

✅ **Solución:** Verifica que `next.config.ts` tenga `output: "export"`

### Capacitor app muestra pantalla en blanco

❌ **Problema:** `webDir` incorrecto o /out no existe

✅ **Solución:**

1. Ejecuta `npm run build` (debe generar `/out`)
2. Verifica que `capacitor.config.ts` tenga `webDir: "out"`
3. Ejecuta `npx cap sync`

### Auth no funciona

❌ **Problema:** Variables de entorno o migraciones no ejecutadas

✅ **Solución:**

1. Verifica `.env.local` con las variables correctas
2. Ejecuta migración SQL en Supabase Dashboard
3. Verifica Redirect URLs en Supabase
4. Reinicia el servidor de desarrollo

### No puedo invitar usuarios

❌ **Problema:** No eres admin o edge function no desplegada

✅ **Solución:**

1. Verifica que tu rol sea `admin` en `user_profiles`
2. Puedes invitar manualmente desde Supabase Dashboard
3. O despliega la edge function `invite-user` (ver `docs/deploy-edge-function.md`)

---

## Próximos Pasos / Roadmap

### MVP Pendiente

- [ ] Gestión de organizaciones
- [ ] CRUD de servicios
- [ ] Sistema de reservas/bookings
- [ ] Calendario móvil-first
- [ ] Integración WhatsApp (Nivel A)
- [ ] Página pública de reservas (`/{slug}`)

### Futuro

- Multi-staff y asignación automática por servicio
- Recordatorios automáticos (WhatsApp Nivel C)
- Reprogramación por link
- Depósito/pagos (Stripe) como add-on
- Métricas: ocupación, cancelaciones, clientes recurrentes
- Roles: recepcionista vs dueño

---

## Documentación Adicional

- `docs/CORRECCION-capacitor.md` - Explicación detallada de la arquitectura client-side
- `docs/invitation-flow.md` - Documentación técnica del flujo de invitaciones
- `docs/supabase-setup.md` - Instrucciones detalladas de setup de Supabase
- `docs/deploy-edge-function.md` - Cómo desplegar edge functions
- `docs/mejoras-arquitectura.md` - Patrones y buenas prácticas (opcional)

---

## Referencias

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Next.js Static Export](https://nextjs.org/docs/app/building-your-application/deploying/static-exports)
- [Capacitor Documentation](https://capacitorjs.com/docs)
- [Supabase RLS](https://supabase.com/docs/guides/auth/row-level-security)
