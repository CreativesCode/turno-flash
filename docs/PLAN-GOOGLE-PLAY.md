# Plan de Publicación en Google Play + Suscripciones (RevenueCat)

> Fecha: 2026-06-11
> Estado del proyecto al momento de este plan: typecheck limpio, 16 páginas funcionales,
> Capacitor 8 + Next.js static export + Supabase. Sin sistema de pagos (solo licencias manuales).

---

## 1. Diagnóstico actual (verificado)

| Aspecto | Estado | Notas |
|---|---|---|
| TypeScript (`tsc --noEmit`) | ✅ Sin errores | |
| Static export (`output: "export"`) | ✅ Correcto | Compatible con Capacitor, sin API routes |
| Capacitor | ✅ v8, `appId: com.turnoflash.app` | webDir `out` |
| Android target/compile SDK | ✅ 36 (min 24) | Cumple requisito de Play (target ≥ 35) |
| Firma de release (keystore) | ❌ NO configurada | **Bloqueante** para publicar |
| versionCode / versionName | ⚠️ 1 / "1.0" | Incrementar `versionCode` en cada release |
| Pagos / suscripciones | ❌ No existían | Solo licencias manuales por organización (migración 008) |
| Política de privacidad | ❌ No existe | **Obligatoria** en Play Console |
| Eliminación de cuenta | ❌ No existe | **Obligatoria** (Play exige flujo de borrado si hay registro) |

---

## 2. Suscripciones con RevenueCat — SÍ es viable ✅

**Confirmado:** el plugin oficial `@revenuecat/purchases-capacitor` v13.x requiere
`@capacitor/core >= 8.0.0` — exactamente la versión del proyecto. RevenueCat gestiona
Google Play Billing por debajo y expone webhooks para sincronizar el backend.

### 2.1 Arquitectura elegida (integrada con el sistema de licencias existente)

La clave: **no se reemplaza el sistema de licencias, se alimenta automáticamente**.
RevenueCat se convierte en la fuente que actualiza `organizations.license_end_date`.

```
┌─────────────┐  compra   ┌─────────────┐  webhook   ┌──────────────────────┐
│ App (owner) │ ────────► │ RevenueCat  │ ─────────► │ Edge Function        │
│ Capacitor   │           │ (+ Google   │            │ revenuecat-webhook   │
│             │           │  Play)      │            │                      │
└─────────────┘           └─────────────┘            │ 1. Verifica auth     │
      │                                              │ 2. Audita evento     │
      │ logIn(organization_id)                       │ 3. Actualiza         │
      │ → app_user_id = org id                       │    license_end_date  │
      └──────────────────────────────────────────────┴──────────────────────┘
                                                     ▼
                                  Sistema de licencias existente (008)
                                  check_license_status() sigue funcionando igual
```

Decisiones de diseño:

- **`app_user_id` de RevenueCat = `organization_id`**. La suscripción pertenece a la
  organización (no al usuario), igual que la licencia actual. El webhook mapea
  `app_user_id → organizations.id` directamente.
- **Entitlement único: `pro`**. Mientras esté activo, la licencia se extiende hasta
  `expiration_at` del entitlement. El período de gracia existente (7 días) sigue aplicando.
- **Solo `owner`/`admin` pueden comprar** (igual que hoy gestionan la licencia).
- **Fuente de verdad: el webhook**, no el cliente. El cliente refresca `CustomerInfo`
  tras la compra para UX inmediata, pero la BD se actualiza vía webhook (sobrevive a
  renovaciones, cancelaciones, reembolsos, billing issues).
- Las **licencias manuales siguen funcionando**: un admin puede seguir poniendo fechas
  a mano (clientes que pagan por fuera, períodos de prueba, etc.).

### 2.2 Productos sugeridos (crear en Play Console → Monetización → Suscripciones)

| Producto (ID en Play) | Plan base | Entitlement RC |
|---|---|---|
| `tf_pro` | `monthly` (mensual) | `pro` |
| `tf_pro` | `yearly` (anual, con descuento) | `pro` |

### 2.3 Implementado en este repo (hoy)

- [x] `@revenuecat/purchases-capacitor` instalado
- [x] `utils/revenuecat.ts` — wrapper: configure + logIn(orgId), offerings, compra, restore
- [x] `hooks/useSubscription.ts` — estado de suscripción para la UI
- [x] `app/dashboard/subscription/page.tsx` — paywall/gestión (solo owner/admin; en web
      muestra aviso de que la compra es desde la app)
- [x] `supabase/migrations/021_revenuecat_subscriptions.sql` — columnas de suscripción en
      `organizations` + tabla `subscription_events` (auditoría) + función
      `apply_revenuecat_event()`
- [x] `supabase/functions/revenuecat-webhook/index.ts` — recibe eventos, verifica el header
      `Authorization`, audita y actualiza la licencia

### 2.4 Pasos manuales pendientes (consolas — no se pueden automatizar)

> Estado 2026-06-11: Supabase ✅ completo (migración 021 aplicada, webhook desplegado y
> probado, secret configurado). RevenueCat 🟡 en progreso con **Test Store**: offering
> `default` con packages `$rc_monthly`/`$rc_annual` y webhook configurado.

1. **Google Play Console**
   - [ ] Crear la app `com.turnoflash.app` y subir un primer AAB firmado (closed testing basta).
   - [ ] Crear la suscripción `tf_pro` con planes base `monthly` y `yearly`.
   - [ ] Vincular un proyecto de Google Cloud y crear credenciales de service account
     para RevenueCat (Play Android Publisher API).
2. **RevenueCat (app.revenuecat.com)**
   - [x] Crear proyecto → por ahora con app **Test Store** (productos `monthly` y `yearly`).
   - [ ] **Crear entitlement `pro` y adjuntar AMBOS productos** — sin esto la app no
     reconoce la suscripción (`entitlements.active["pro"]`).
   - [x] Crear Offering `default` con los packages `$rc_monthly` y `$rc_annual`.
   - [ ] Copiar la **API key pública** de la app Test Store (`test_xxx`) → `.env.local`:
     `NEXT_PUBLIC_REVENUECAT_ANDROID_API_KEY=test_xxx`
     (cuando exista la app de Play Store, reemplazar por la key `goog_xxx`).
   - [x] Configurar webhook → URL
     `https://gotetvnmnlrsfhsnounn.supabase.co/functions/v1/revenuecat-webhook`
     con Authorization header secreto.
   - [ ] Cuando Play esté listo: crear la app Android en RevenueCat, subir el JSON de la
     service account, adjuntar los productos reales de Play al entitlement `pro` y al
     offering `default`.
3. **Supabase** ✅ HECHO (2026-06-11)
   - [x] Migración 021 aplicada en remoto (`supabase db push`; historial 001–020 reparado).
   - [x] Función desplegada: `revenuecat-webhook` (--no-verify-jwt).
   - [x] Secret `REVENUECAT_WEBHOOK_AUTH` configurado (valor en `supabase/.temp/revenuecat-webhook-auth.txt`, gitignored).
   - [x] Probado en vivo: auth inválida → 401, evento TEST → 200.
4. **Probar**
   - [ ] Ahora: compra simulada con Test Store en el emulador/dispositivo Android.
   - [ ] Después: tester de licencia (Play Console → License testing) en closed testing.

---

## 3. Checklist de publicación en Google Play

### 3.1 Bloqueantes técnicos

- [x] **Keystore de release** ✅ HECHO (2026-06-11):
      - Keystore: `C:/Users/rober/keystores/turno-flash-upload.jks` (alias `turnoflash`)
      - Credenciales: `C:/Users/rober/keystores/turno-flash-upload-CREDENCIALES.txt`
        ⚠️ **HAZ BACKUP de esa carpeta fuera de esta PC** (nube/USB).
      - `android/key.properties` (gitignored) + `signingConfigs.release` en build.gradle:
        `gradlew bundleRelease` ya genera el AAB firmado automáticamente.
- [ ] **Instalar Android Studio** (no está en esta PC) — necesario para compilar el AAB
      (incluye el JDK 17+ y el SDK de Android que faltan).
- [ ] **Build AAB**: `cd android && .\gradlew bundleRelease` (genera `app-release.aab`).
- [ ] Incrementar `versionCode` (build.gradle) en cada subida.
- [ ] Permiso de billing: el plugin de RevenueCat añade `com.android.vending.BILLING`
      automáticamente (verificar en el manifest mergeado).
- [ ] Probar la app release en dispositivo real (minify/proguard no está activo, OK).

### 3.2 Bloqueantes de política (Play Console)

- [x] **Política de privacidad** ✅ creada: `/privacy` (2026-06-11). Falta hostearla en
      una URL pública (desplegar la web, p. ej. Vercel) para pegarla en Play Console.
- [x] **Términos y condiciones** ✅ creada: `/terms` (2026-06-11). Igual: necesita URL pública.
- [x] **Eliminación de cuenta** ✅ creada (2026-06-11): página en-app `/dashboard/account`
      (sección "Mi cuenta" del menú) + URL pública `/account-deletion` + Edge Function
      `delete-account` desplegada. Necesita URL pública para el formulario de Play.
- [ ] **Data Safety form**: declarar recolección de email, nombre, teléfono (clientes),
      datos de citas. Compartidos con: Supabase (procesador). Cifrado en tránsito: sí.
- [ ] **Cuenta de desarrollador** ($25 una vez) verificada.
- [ ] Clasificación de contenido (cuestionario IARC) — app de productividad/negocios.
- [ ] Declaración de anuncios: sin anuncios.

### 3.3 Assets de la ficha (Store Listing) 
Hacer las capturas desde la misma IA (claude) hacer unas 8 fotos para móvile, table de 7', tablet de 10' y descktop

- [ ] Icono 512×512 (ya hay `scripts/generate-icons.js` — reutilizar arte)
- [ ] Feature graphic 1024×500
- [ ] Mínimo 2 capturas de teléfono (recomendado 4–8, se pueden tomar del emulador)
- [ ] Título (máx 30), descripción corta (80), descripción larga (4000) — en español
- [ ] Email de contacto de soporte

### 3.4 Estrategia de lanzamiento

1. **Internal testing** (hasta 100 testers, sin revisión) → validar compra de suscripción.
2. **Closed testing** → ⚠️ cuentas personales nuevas requieren 12 testers durante 14 días
   antes de poder pasar a producción.
3. **Producción** con rollout gradual (20% → 50% → 100%).

---

## 4. Páginas faltantes (gap analysis)

### Obligatorias para Google Play (prioridad ALTA)

| Página | Ruta | Estado |
|---|---|---|
| Política de privacidad | `/privacy` | ✅ creada (2026-06-11) |
| Términos y condiciones | `/terms` | ✅ creada (2026-06-11) |
| Eliminación de cuenta | `/dashboard/account` + pública `/account-deletion` | ✅ creadas (2026-06-11) |
| Suscripción / paywall | `/dashboard/subscription` | ✅ creada (2026-06-11) |

> Pendiente para cerrar §3.2: **desplegar la web en una URL pública** (p. ej. Vercel)
> para que Play Console pueda enlazar `/privacy` y `/account-deletion`.

### Del roadmap del producto (prioridad MEDIA — no bloquean Play)

| Página | Ruta propuesta | Estado |
|---|---|---|
| Vista de calendario | `/dashboard/calendar` | Planeada Feb 2026, no iniciada |
| Reserva pública | `/book/[slug]` | Planeada Mar 2026, no iniciada. ⚠️ Con static export, rutas dinámicas requieren `generateStaticParams` o usar query param (`/book?org=slug`) |
| Página de perfil de usuario | `/dashboard/profile` | No existe (editar nombre, contraseña) |
| Onboarding post-registro | `/dashboard/onboarding` | Mejoraría activación; opcional |

### Recomendación de orden

1. `/privacy` + `/terms` (estáticas, rápidas) → desbloquean Play Console.
2. Flujo de eliminación de cuenta (RPC de Supabase + página) → desbloquea Play.
3. Suscripciones end-to-end (código listo, falta configurar consolas) → monetización.
4. Calendario y reserva pública → roadmap normal post-lanzamiento.

---

## 5. Cronograma sugerido

| Semana | Objetivo |
|---|---|
| 1 | Keystore + AAB + cuenta Play Console + páginas legales + eliminación de cuenta |
| 1–2 | Configurar productos en Play + proyecto RevenueCat + webhook desplegado |
| 2 | Internal testing: validar compra/renovación/cancelación con license testers |
| 2–4 | Closed testing (los 14 días corren en paralelo mientras se desarrolla calendario) |
| 4+ | Producción con rollout gradual |

---

## 6. Variables de entorno nuevas

```bash
# .env.local (cliente)
NEXT_PUBLIC_REVENUECAT_ANDROID_API_KEY=goog_xxx   # API key pública Android de RevenueCat
# NEXT_PUBLIC_REVENUECAT_IOS_API_KEY=appl_xxx     # cuando se publique en iOS

# Supabase secrets (Edge Function)
REVENUECAT_WEBHOOK_AUTH=<token secreto del webhook>
```
