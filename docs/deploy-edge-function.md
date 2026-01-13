# Desplegar Edge Function para Invitaciones

## ⚠️ IMPORTANTE: Sin esta función, las invitaciones NO funcionarán

## El Problema

Cuando usas `signInWithOtp` para invitar usuarios, Supabase usa el flujo PKCE que almacena un `code_verifier` en el navegador que inicia la solicitud. Cuando el usuario invitado hace clic en el link desde otro navegador, no tiene ese verifier y falla con:

```
AuthPKCECodeVerifierMissingError: PKCE code verifier not found in storage
```

## La Solución

Usamos una Edge Function que llama a la Admin API de Supabase (`inviteUserByEmail`), la cual genera links con tokens en el hash fragment en lugar de usar PKCE.

## 🚀 Solución Temporal (mientras despliegas la Edge Function)

Puedes invitar usuarios manualmente desde el Dashboard de Supabase:

1. Ve a [Supabase Dashboard](https://supabase.com/dashboard)
2. Selecciona tu proyecto **TurnoFlash**
3. Ve a **Authentication** → **Users**
4. Click en **Invite user** (botón verde arriba a la derecha)
5. Ingresa el email del usuario
6. El usuario recibirá un email y podrá configurar su contraseña

Esta es la forma más rápida de invitar usuarios mientras configuras la Edge Function.

## Pasos para Desplegar

### Opción A: Usando Supabase CLI (Recomendado)

#### 1. Instalar Supabase CLI

**En Windows, NO uses `npm install -g supabase`** (no está soportado). Usa una de estas opciones:

**Opción A1: Con npx (sin instalar)**

```powershell
# No necesitas instalar, npx lo ejecuta directamente
npx supabase login
```

**Opción A2: Con Winget**

```powershell
winget install Supabase.CLI
```

**Opción A3: Con Scoop**

```powershell
# Instalar Scoop si no lo tienes
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
Invoke-RestMethod -Uri https://get.scoop.sh | Invoke-Expression

# Instalar Supabase CLI
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

#### 2. Login en Supabase

```powershell
npx supabase login
# O si instalaste con winget/scoop:
supabase login
```

#### 3. Vincular tu proyecto

Tu Project ID es: `gotetvnmnlrsfhsnounn`

```powershell
cd turno-flash
npx supabase link --project-ref gotetvnmnlrsfhsnounn
# O si instalaste con winget/scoop:
supabase link --project-ref gotetvnmnlrsfhsnounn
```

> **Nota:** El `project-ref` lo encuentras en Settings → General → Reference ID

#### 4. Desplegar la Edge Function

```powershell
npx supabase functions deploy invite-user
# O si instalaste con winget/scoop:
supabase functions deploy invite-user
```

### Opción B: Desde el Dashboard (Manual)

Si prefieres no usar el CLI, puedes crear la función manualmente:

1. Ve a tu proyecto en [Supabase Dashboard](https://supabase.com/dashboard)
2. En el menú lateral, busca **"Edge Functions"** (no está en Settings General)
3. Si es la primera vez, puede que te pida activar Edge Functions
4. Click en **"Create a new function"** o **"New Function"**
5. Nombre: `invite-user`
6. Pega el código completo de `supabase/functions/invite-user/index.ts`
7. Click en **"Deploy"** o **"Save"**

### 5. Configurar variables de entorno (automático)

Las Edge Functions tienen acceso automático a:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

No necesitas configurar nada adicional.

## Verificar el Despliegue

1. Ve al Dashboard de Supabase
2. Edge Functions → Deberías ver `invite-user`
3. Revisa los logs si hay errores

## Probar la Función

Desde la página `/dashboard/invite`, envía una invitación. Ahora:

1. El usuario invitado recibirá un email
2. Al hacer clic, será redirigido a `/auth/callback?type=invite`
3. El callback usará los tokens del hash (no PKCE)
4. Será redirigido a `/auth/setup-password` para configurar su contraseña

## Troubleshooting

### Error 401: No autorizado

- Verifica que estés logueado como admin
- Verifica que el token de sesión esté siendo enviado

### Error 403: Solo administradores pueden invitar

- El usuario que intenta invitar no tiene rol `admin` en `user_profiles`

### Error al invocar la función

- Verifica que la función esté desplegada: `supabase functions list`
- Revisa los logs: `supabase functions logs invite-user`
