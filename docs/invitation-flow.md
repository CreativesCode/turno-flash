# Flujo de Invitaciones y Autenticación

## Descripción General

El sistema utiliza un flujo de **invitaciones** para el registro de usuarios. Los usuarios no pueden registrarse por sí mismos; deben ser invitados por un administrador. Una vez invitados, configuran su contraseña y posteriormente inician sesión con email y contraseña.

## Flujo Completo

### 1. Invitación (Admin)

**Página:** `/dashboard/invite`
**Acceso:** Solo administradores

1. El administrador accede a la página de invitaciones desde el dashboard
2. Ingresa el correo electrónico del nuevo usuario
3. El sistema envía un **magic link** de invitación al correo especificado
4. El magic link incluye el parámetro `type=invite` para identificar que es una invitación

**Código relevante:**

```typescript
const { error } = await supabase.auth.signInWithOtp({
  email,
  options: {
    emailRedirectTo: window.location.origin + "/auth/callback?type=invite",
  },
});
```

### 2. Callback de Autenticación

**Página:** `/auth/callback`
**Propósito:** Procesar el magic link y redirigir según el tipo de autenticación

El callback maneja dos flujos:

#### Flujo PKCE (código de autorización)
```typescript
const code = urlParams.get("code");
if (code) {
  const { data } = await supabase.auth.exchangeCodeForSession(code);
  session = data.session;
}
```

#### Flujo implícito (hash fragments)
```typescript
const hashParams = new URLSearchParams(window.location.hash.substring(1));
const accessToken = hashParams.get("access_token");
const refreshToken = hashParams.get("refresh_token");

if (accessToken && refreshToken) {
  const { data } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });
  session = data.session;
}
```

#### Decisión de redirección

```typescript
const type = urlParams.get("type") || hashType;

if (type === "magiclink" || type === "invite") {
  // Usuario invitado → configurar contraseña
  router.push("/auth/setup-password");
} else {
  // Usuario existente → dashboard
  router.push("/dashboard");
}
```

### 3. Configuración de Contraseña

**Página:** `/auth/setup-password`
**Acceso:** Usuarios con sesión activa que vienen de un magic link de invitación

1. El usuario llega con una sesión activa (autenticado por el magic link)
2. Se le solicita crear una contraseña
3. Las validaciones incluyen:
   - Contraseña mínima de 6 caracteres
   - Confirmación de contraseña
4. Una vez configurada, se actualiza el usuario en Supabase
5. Redirección al dashboard

**Código relevante:**

```typescript
const { error } = await supabase.auth.updateUser({
  password: password,
});

if (!error) {
  router.push("/dashboard");
}
```

### 4. Login Regular

**Página:** `/login`
**Acceso:** Público

1. El usuario ingresa su email y contraseña
2. Se autentica usando `signInWithPassword`
3. Si es exitoso, se redirige al dashboard

**Código relevante:**

```typescript
const { error } = await supabase.auth.signInWithPassword({
  email,
  password,
});

if (!error) {
  router.push("/dashboard");
}
```

## Diagrama de Flujo

```
┌─────────────────────────────────────────────────────────────┐
│                    FLUJO DE INVITACIÓN                      │
└─────────────────────────────────────────────────────────────┘

1. Admin envía invitación
   ┌──────────────┐
   │ /dashboard   │
   │   /invite    │ → Envía magic link con type=invite
   └──────┬───────┘
          │
          ↓
2. Usuario recibe email y hace clic
   ┌──────────────┐
   │ Email client │ → Click en magic link
   └──────┬───────┘
          │
          ↓
3. Callback procesa la autenticación
   ┌──────────────┐
   │ /auth/       │
   │  callback    │ → Establece sesión y detecta type=invite
   └──────┬───────┘
          │
          ↓
4. Usuario configura contraseña
   ┌──────────────┐
   │ /auth/setup- │
   │  password    │ → Crea contraseña y actualiza usuario
   └──────┬───────┘
          │
          ↓
5. Acceso al dashboard
   ┌──────────────┐
   │ /dashboard   │ → Usuario autenticado
   └──────────────┘

┌─────────────────────────────────────────────────────────────┐
│                     FLUJO DE LOGIN                          │
└─────────────────────────────────────────────────────────────┘

1. Usuario con contraseña ya configurada
   ┌──────────────┐
   │   /login     │ → Ingresa email + contraseña
   └──────┬───────┘
          │
          ↓
2. Autenticación con Supabase
   ┌──────────────┐
   │ signInWith   │
   │  Password    │ → Verifica credenciales
   └──────┬───────┘
          │
          ↓
3. Acceso al dashboard
   ┌──────────────┐
   │ /dashboard   │ → Usuario autenticado
   └──────────────┘
```

## Seguridad y Consideraciones

### Protección de Rutas

- **`/dashboard`**: Protegido con `ProtectedRoute`, requiere autenticación
- **`/dashboard/invite`**: Requiere autenticación + rol de admin
- **`/auth/setup-password`**: Requiere sesión activa (viene del magic link)
- **`/login`**: Público

### Validaciones

#### En `/auth/setup-password`:
- Sesión activa requerida
- Contraseña mínima de 6 caracteres
- Confirmación de contraseña coincidente

#### En `/dashboard/invite`:
- Usuario autenticado
- Rol de admin verificado desde la base de datos

### Base de Datos

El sistema asume las siguientes tablas (según migraciones previas):

**`user_profiles`**
- `id` (UUID, FK a auth.users)
- `email` (VARCHAR)
- `full_name` (VARCHAR, opcional)
- `role` (VARCHAR: 'admin', 'manager', 'staff')
- `organization_id` (UUID, FK)
- `is_active` (BOOLEAN)
- Timestamps: `created_at`, `updated_at`

## Configuración Requerida

### Supabase Auth

Asegúrate de tener configurado en Supabase:

1. **Email templates** para magic links
2. **Redirect URLs** permitidas:
   - `http://localhost:3000/auth/callback`
   - `https://tudominio.com/auth/callback`
3. **Email confirmación** deshabilitada (opcional, según necesidades)

### Variables de Entorno

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

## Casos de Uso

### Caso 1: Nuevo usuario invitado

1. Admin va a `/dashboard/invite`
2. Ingresa `nuevo@ejemplo.com`
3. Sistema envía magic link
4. Usuario hace clic → `/auth/callback?type=invite`
5. Callback redirige a `/auth/setup-password`
6. Usuario crea contraseña → `/dashboard`

### Caso 2: Usuario existente inicia sesión

1. Usuario va a `/login`
2. Ingresa email y contraseña
3. Sistema autentica → `/dashboard`

### Caso 3: Usuario intenta acceder sin contraseña

1. Usuario va a `/login`
2. No tiene contraseña configurada
3. Login falla (credenciales inválidas)
4. Debe solicitar nueva invitación al admin

## Mejoras Futuras

1. **Reset de contraseña**: Agregar flujo para recuperación de contraseña
2. **Reinvitar usuarios**: Permitir reenviar invitaciones a usuarios que no completaron el setup
3. **Expiración de invitaciones**: Limitar el tiempo de validez de los magic links
4. **Registro de invitaciones**: Tabla para trackear qué admin invitó a quién y cuándo
5. **Bulk invitations**: Permitir invitar múltiples usuarios a la vez
6. **Templates personalizados**: Customizar el email de invitación

## Solución de Problemas

### Usuario no recibe el email de invitación

1. Verificar configuración de SMTP en Supabase
2. Revisar carpeta de spam
3. Confirmar que el email está en la whitelist (si aplica)

### Magic link no funciona

1. Verificar que las Redirect URLs estén configuradas en Supabase
2. Confirmar que el link no haya expirado
3. Revisar consola del navegador para errores en el callback

### Usuario no puede configurar contraseña

1. Verificar que tiene una sesión activa (viene del magic link)
2. Confirmar que la contraseña cumple con las validaciones
3. Revisar permisos de Supabase Auth

### No aparece el botón de invitar usuarios

1. Verificar que el usuario tiene rol `admin` en la tabla `user_profiles`
2. Confirmar que el AuthContext está funcionando correctamente
3. Revisar RLS policies en Supabase

## Conclusión

Este flujo de invitaciones proporciona un sistema seguro donde:
- ✅ Solo admins pueden invitar usuarios
- ✅ No hay registro público
- ✅ Los usuarios crean su propia contraseña de forma segura
- ✅ El login usa credenciales tradicionales (email + contraseña)
- ✅ Los magic links solo se usan para la invitación inicial
