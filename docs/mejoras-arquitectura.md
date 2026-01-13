# Mejoras de Arquitectura y Buenas Prácticas

Este documento resume las mejoras implementadas siguiendo las buenas prácticas de React, Next.js, y el patrón SPA + Capacitor.

## ✅ Cambios Implementados

### 1. Context API para Estado Global (IMPORTANTE)

**Antes:** Hook `useAuth` que duplicaba lógica en cada componente

**Ahora:** `AuthProvider` con Context API centralizado

**Archivo:** `contexts/auth-context.tsx`

```typescript
<AuthProvider>
  <App />
</AuthProvider>
```

**Beneficios:**

- ✅ Un solo lugar para la lógica de autenticación
- ✅ Estado compartido eficientemente entre componentes
- ✅ Subscripción única a cambios de auth (más eficiente)
- ✅ Fácil de testear y mantener
- ✅ Compatible con Capacitor (no depende de server)

**Uso:**

```typescript
// En cualquier componente
const { user, profile, loading, signOut } = useAuth();
```

### 2. Estructura de Carpetas Mejorada

```
/
  app/                    # Rutas Next.js
  contexts/              # ✅ NUEVO: Context providers
    auth-context.tsx
  hooks/                 # Hooks reutilizables
  types/                 # Tipos TypeScript
  utils/                 # Utilidades
  components/            # (Para futuro)
    ui/
    features/
```

### 3. Layout Root Actualizado

**Archivo:** `app/layout.tsx`

**Cambios:**

- ✅ Agregado `AuthProvider` envolviendo toda la app
- ✅ Cambiado lang a "es"
- ✅ Metadata actualizada

```typescript
export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
```

### 4. Decisión sobre Static Export

**Archivo:** `docs/decision-static-export.md`

**Decisión:** **NO usar `output: 'export'`** para esta app

**Razones:**

1. Middleware es esencial para auth
2. Route handlers necesarios para callbacks
3. Mejor seguridad con protección server-side
4. Las indicaciones dicen "cuando aplique" - aquí NO aplica

**Actualizado:** `next.config.ts` - removido `output: 'export'`

### 5. Documentación de Buenas Prácticas

**Archivo:** `docs/indications.md`

**Nueva sección:** "Patrones de diseño y buenas prácticas (React + Next.js)"

**Incluye:**

- Context API para estado global
- Hooks personalizados
- Componentes optimizados
- Manejo de datos con Supabase
- Caché y optimización
- TypeScript estricto
- Manejo de errores
- Testing (futuro)

### 6. Migración de Hook a Context

**Antes:**

```typescript
// hooks/use-auth.ts
export function useAuth() {
  // Lógica duplicada en cada uso
  const [user, setUser] = useState(null);
  // ...
}
```

**Después:**

```typescript
// hooks/use-auth.ts (deprecated)
export { useAuth } from "@/contexts/auth-context";

// contexts/auth-context.tsx (nuevo)
export function AuthProvider({ children }) {
  // Lógica centralizada
}
```

**Todos los componentes actualizados:**

- ✅ `app/page.tsx`
- ✅ `app/dashboard/page.tsx`
- ✅ `app/layout.tsx`

## 📋 Patrones Establecidos

### Para Estado Global

✅ **Usar Context API:**

- Autenticación
- Tema (dark/light)
- Configuración de organización
- Idioma/locale

❌ **NO usar Redux** (overkill para este proyecto)

### Para Lógica Reutilizable

✅ **Usar hooks personalizados:**

- Interacciones con Supabase
- Realtime subscriptions
- Formularios complejos
- Validaciones

### Para Componentes

✅ **Client Components cuando:**

- Necesitas hooks (useState, useEffect)
- Necesitas interactividad
- Necesitas acceso a Context
- Mayoría de los componentes en SPA

✅ **Server Components cuando:**

- Solo lectura de datos
- SEO crítico
- Generación estática de contenido
- (Poco común en SPA)

## 🔄 Flujo de Datos

```
Supabase Auth
    ↓
AuthProvider (Context)
    ↓
useAuth() hook
    ↓
Componentes
```

**Ventajas:**

1. Single source of truth
2. Actualizaciones automáticas en toda la app
3. Fácil debugging
4. Compatible con Capacitor
5. Funciona offline (con caché)

## 🎯 Principios Clave

### 1. Separación de Responsabilidades

- **UI:** Componentes
- **Lógica:** Hooks y utils
- **Estado:** Contexts
- **Tipos:** types/
- **API:** utils/supabase/

### 2. Composición sobre Herencia

```typescript
// ✅ BIEN: Composición
<AuthProvider>
  <ThemeProvider>
    <App />
  </ThemeProvider>
</AuthProvider>;

// ❌ MAL: Herencia
class AuthComponent extends BaseComponent {}
```

### 3. Props Explícitas

```typescript
// ✅ BIEN
interface BookingCardProps {
  booking: Booking;
  onCancel: (id: string) => void;
}

// ❌ MAL
function BookingCard(props: any) {}
```

### 4. TypeScript Estricto

- Siempre tipar props
- Usar interfaces sobre types cuando sea posible
- Evitar `any`
- Usar tipos generados de Supabase

## 📱 Consideraciones Capacitor

### Estado Global

✅ Context API funciona perfecto en Capacitor

❌ Evitar server-side state (no funciona en móvil)

### Offline First

```typescript
// Patrón recomendado
const { data, loading } = useBookings();

if (!navigator.onLine && cachedData) {
  return cachedData; // Mostrar caché
}
```

### Performance

- Usar `memo()` para componentes pesados
- Lazy loading con `dynamic()`
- Optimizar imágenes
- Limitar requests

## 📚 Referencias

- [React Context API](https://react.dev/learn/passing-data-deeply-with-context)
- [Next.js Patterns](https://nextjs.org/docs/app/building-your-application/rendering/composition-patterns)
- [Capacitor Best Practices](https://capacitorjs.com/docs/guides/security)
- [Supabase Auth](https://supabase.com/docs/guides/auth)

## 🚀 Próximos Pasos

Para mantener estas buenas prácticas:

1. **Siempre usar Context para estado global**
2. **Crear hooks para lógica reutilizable**
3. **Tipar todo con TypeScript**
4. **Separar responsabilidades**
5. **Documentar decisiones importantes**

## ✨ Resultado Final

Una arquitectura:

- ✅ Escalable
- ✅ Mantenible
- ✅ Testeable
- ✅ Compatible con SPA + Capacitor
- ✅ Siguiendo mejores prácticas de React
- ✅ Optimizada para móvil
- ✅ Type-safe con TypeScript
