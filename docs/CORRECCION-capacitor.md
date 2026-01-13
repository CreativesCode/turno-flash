# CORRECCIÓN IMPORTANTE: Capacitor + Auth

## El Problema Detectado

Capacitor **NECESITA** archivos estáticos (`output: 'export'`) pero el middleware **NO funciona** con static export.

## La Verdad sobre Protección

### Protección REAL vs Protección UX

1. **Protección REAL:** RLS en Supabase (server-side) ✅

   - La base de datos rechaza queries no autorizadas
   - Funciona en web Y móvil
   - **Esto es lo importante**

2. **Protección UX:** Middleware Next.js (solo mejora experiencia)
   - Solo redirige antes de cargar la página
   - No protege datos (RLS lo hace)
   - **Es opcional, cosmético**

## Solución Correcta para SPA + Capacitor

### Opción A: Client-Side Auth (RECOMENDADO para Capacitor) ✅

```typescript
// next.config.ts
const nextConfig = {
  output: "export", // ✅ SÍ para Capacitor
  images: { unoptimized: true },
};
```

**Flujo:**

1. Usuario intenta acceder a ruta protegida
2. Página carga (porque es static)
3. React hook verifica auth
4. Si no autenticado → redirige a /login (client-side)
5. De todas formas, Supabase RLS protege los datos

**Ventajas:**

- ✅ Funciona en Capacitor
- ✅ Funciona en web
- ✅ Mismo código para ambos
- ✅ RLS protege datos de verdad
- ✅ Deploy ultra barato (CDN)

**Desventajas:**

- ⚠️ Usuarios ven flash de página protegida antes de redirigir
- ⚠️ URLs no están "protegidas" (pero los datos sí)

### Opción B: Dual Mode (Web con Middleware, Móvil Sin) ⚠️

Diferentes configs para web vs móvil:

**Para Web (Vercel):**

```typescript
// Sin output: 'export'
// Con middleware
```

**Para Móvil (Capacitor):**

```typescript
output: "export";
// Sin middleware
```

**Ventajas:**

- Mejor UX en web (middleware)
- Funciona en móvil

**Desventajas:**

- ❌ Dos deploys diferentes
- ❌ Más complejo
- ❌ Código diferente para cada plataforma
- ❌ Rompe el principio "un solo código"

### Opción C: Servidor Embebido en App (Avanzado) 🚫

Empaquetar servidor Node.js en la app móvil.

**NO recomendado:**

- Demasiado complejo
- Mayor tamaño de app
- Más consumo de recursos
- Capacitor no está diseñado para esto

## Recomendación Final

### Para este proyecto: Opción A (Client-Side Auth) ✅

**Razones:**

1. **Capacitor es requisito no negociable** (dice indications.md)
2. **RLS en Supabase es la protección real**
3. **Simplicidad > Complejidad**
4. **Mismo código web + móvil**
5. **Deploy barato (CDN)**

### Cambios Necesarios

1. ✅ Mantener `AuthProvider` (Context API)
2. ✅ Restaurar `output: 'export'`
3. ❌ Remover middleware
4. ❌ Remover route handler `/auth/callback`
5. ✅ Usar solo Magic Link (no OTP con callback)
6. ✅ Protección de rutas en componentes (useEffect)

## Implementación Correcta

### 1. next.config.ts

```typescript
const nextConfig: NextConfig = {
  output: "export", // ✅ Necesario para Capacitor
  images: {
    unoptimized: true,
  },
};
```

### 2. Protección de Rutas (Client-Side)

```typescript
// components/protected-route.tsx
export function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading]);

  if (loading) return <Loading />;
  if (!user) return null;

  return <>{children}</>;
}
```

### 3. Login con Magic Link

```typescript
// Sin callbacks complejos
const { error } = await supabase.auth.signInWithOtp({
  email,
  options: {
    // Para web: redirige a la misma página
    emailRedirectTo: window.location.origin,
  },
});
```

### 4. RLS en Supabase (La protección real)

```sql
-- Esto es lo que REALMENTE protege
CREATE POLICY "Users can only see their data"
  ON bookings FOR SELECT
  USING (auth.uid() = user_id);
```

## Comparación

| Feature                  | Con Middleware | Client-Side    |
| ------------------------ | -------------- | -------------- |
| Funciona en Capacitor    | ❌ NO          | ✅ SÍ          |
| Deploy en CDN            | ❌ NO          | ✅ SÍ          |
| Mismo código web/móvil   | ❌ NO          | ✅ SÍ          |
| Protege datos            | ✅ SÍ (RLS)    | ✅ SÍ (RLS)    |
| Redirige antes de cargar | ✅ SÍ          | ❌ NO          |
| Flash de contenido       | ✅ NO          | ⚠️ SÍ (mínimo) |
| Complejidad              | Alta           | Baja           |
| Costo hosting            | $$$$           | $              |

## Rutas Dinámicas y Static Export

Con `output: 'export'`, Next.js requiere que todas las rutas dinámicas como `[id]` tengan `generateStaticParams()`. Esto es problemático porque:

1. **No sabemos todas las rutas en build time** - Las organizaciones/usuarios se crean dinámicamente
2. **Requiere generar rutas vacías** - `generateStaticParams()` debe retornar todas las rutas posibles
3. **Complejidad innecesaria** - Para una SPA, es más simple usar query parameters

### Solución: Query Parameters en lugar de Rutas Dinámicas

**❌ NO hacer:**

```
/dashboard/organizations/[id]/page.tsx
```

**✅ Hacer:**

```
/dashboard/organizations/details/page.tsx?id=xxx
```

**Ejemplo:**

```typescript
// Usar useSearchParams() de Next.js
const searchParams = useSearchParams();
const id = searchParams.get("id");

// Navegación
router.push(`/dashboard/organizations/details?id=${orgId}`);
```

**Ventajas:**

- ✅ No requiere `generateStaticParams()`
- ✅ Funciona perfectamente con static export
- ✅ Más simple y directo para SPAs
- ✅ Mismo comportamiento en runtime

## Conclusión

Para **SPA + Capacitor**, la auth **debe ser client-side**. El middleware es incompatible con static export que Capacitor requiere.

La buena noticia: **RLS en Supabase protege los datos de verdad**. El middleware solo mejoraba la UX marginalmente.

**Regla general:** Con `output: 'export'`, evitar rutas dinámicas `[param]`. Usar query parameters `?param=value` en su lugar.

## Action Items

- [ ] Restaurar `output: 'export'` en next.config.ts
- [ ] Remover middleware.ts
- [ ] Remover app/auth/callback/route.ts
- [ ] Actualizar login para solo Magic Link
- [ ] Crear componente ProtectedRoute
- [ ] Actualizar documentación
- [ ] Probar build con `npm run build`
- [ ] Probar con `npx cap sync`
