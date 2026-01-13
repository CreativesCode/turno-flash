# Configuración de Supabase para Autenticación y Roles

Este documento contiene las instrucciones SQL que debes ejecutar en Supabase para configurar el sistema de autenticación con roles.

## 🚨 IMPORTANTE: Configurar URLs de Redirección PRIMERO

Antes de ejecutar las migraciones, configura las URLs permitidas en Supabase:

### En Supabase Dashboard:

1. Ve a tu proyecto en [supabase.com](https://supabase.com)
2. Ve a **Authentication** → **URL Configuration**
3. En **Redirect URLs**, agrega:
   ```
   http://localhost:3000/auth/callback
   https://tu-dominio.com/auth/callback (para producción)
   capacitor://localhost/auth/callback (para app móvil)
   ```

Sin esto, los magic links NO funcionarán correctamente.

## Pasos para ejecutar las migraciones

1. Ve a tu proyecto en Supabase Dashboard
2. Navega a **SQL Editor**
3. Ejecuta el contenido del archivo `supabase/migrations/001_auth_and_roles.sql`
4. Verifica que las tablas y funciones se hayan creado correctamente

## Lo que crea esta migración

### Tablas

- **`user_profiles`**: Perfiles de usuario vinculados a `auth.users` con roles y organización

### Tipos

- **`user_role`**: Enum con los roles disponibles:
  - `admin`: Administrador global (acceso total al sistema)
  - `owner`: Dueño del negocio (gestiona su organización)
  - `staff`: Empleado normal
  - `special`: Usuario con permisos especiales

### Funciones

- **`handle_new_user()`**: Crea automáticamente un perfil cuando un usuario se registra
- **`get_user_role()`**: Obtiene el rol del usuario actual
- **`is_admin_or_owner()`**: Verifica si el usuario es admin u owner

### Políticas RLS

- Los usuarios pueden ver y actualizar su propio perfil (excepto role y organization_id)
- Solo admins pueden ver todos los perfiles
- Solo admins y owners pueden crear perfiles manualmente
- Solo admins pueden cambiar roles y organization_id

## Crear el primer usuario admin

Después de ejecutar la migración, necesitas crear manualmente el primer usuario admin:

```sql
-- 1. Primero, crea el usuario en auth.users (esto normalmente se hace desde la app con signup)
-- O desde el dashboard de Supabase: Authentication > Users > Add User

-- 2. Luego, actualiza su perfil para ser admin:
UPDATE public.user_profiles
SET role = 'admin'
WHERE email = 'tu-email@admin.com';
```

**Nota**: Si quieres crear un admin directamente desde SQL (solo para desarrollo/testing):

```sql
-- Esto crea un usuario en auth.users y luego actualiza su perfil
-- ⚠️ SOLO para desarrollo/testing. En producción usa el flujo normal de registro

-- Paso 1: Insertar en auth.users (requiere permisos de service_role)
-- (Mejor hacerlo desde el dashboard de Supabase)

-- Paso 2: Una vez creado el usuario, actualizar su perfil:
UPDATE public.user_profiles
SET role = 'admin'
WHERE user_id = 'UUID-DEL-USUARIO-CREADO';
```

## Verificar que todo funciona

Ejecuta estas consultas para verificar:

```sql
-- Ver todos los perfiles (como admin)
SELECT * FROM public.user_profiles;

-- Ver tu propio perfil
SELECT * FROM public.user_profiles WHERE user_id = auth.uid();

-- Verificar funciones
SELECT public.get_user_role();
SELECT public.is_admin_or_owner();
```

## Notas importantes

1. **El primer usuario**: El trigger `handle_new_user` crea automáticamente un perfil con rol `staff` cuando alguien se registra. Necesitas actualizar manualmente el primer usuario a `admin`.

2. **Seguridad**: Las políticas RLS aseguran que solo los usuarios autorizados puedan ver/modificar perfiles según su rol.

3. **Organizaciones**: El campo `organization_id` puede ser NULL para admins globales. Los owners y staff deben tener una organización asignada.

4. **Activación/Desactivación**: El campo `is_active` permite desactivar usuarios sin eliminarlos.

## Próximos pasos

Después de ejecutar esta migración:

1. Configura las variables de entorno en tu proyecto local
2. Ejecuta la aplicación y prueba el registro/login
3. Actualiza el primer usuario a admin desde SQL Editor
4. Continúa con las demás migraciones (organizations, services, etc.)
