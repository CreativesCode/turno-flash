---
name: license-enforcement
description: Cómo se bloquea el uso de la app cuando el trial/licencia expira (cliente + servidor) y un acoplamiento a vigilar
metadata:
  type: project
---

El bloqueo por trial/licencia vencida es de dos capas:
- **Servidor (no esquivable):** función `public.org_license_usable(uuid)` (migración 027) usada en el `USING`/`WITH CHECK` de las políticas RLS de **escritura** de las tablas operativas (appointments, customers, services, service_categories, staff_*, appointment_requests, waitlist). Bloquea INSERT/UPDATE/DELETE cuando la licencia no es usable; las **lecturas quedan abiertas** (modo solo-lectura). `service_role` omite RLS, así que edge functions/triggers no se ven afectados.
- **Cliente:** `components/license-gate.tsx` envuelve el layout del dashboard (`app/(app)/dashboard/layout.tsx`) y reemplaza todas las subrutas por una pantalla de bloqueo. Deja pasar `/dashboard/subscription` y `/dashboard/account` para que el usuario pueda renovar sin quedar encerrado. Admins nunca se bloquean.

**Acoplamiento a vigilar:** el período de gracia está **hardcodeado en 7 días** dentro de `org_license_usable` (llama a `check_license_status(org, 7)`). Debe mantenerse en sync con `NEXT_PUBLIC_LICENSE_GRACE_PERIOD_DAYS` (default 7) del cliente. Si cambia uno, cambiar el otro. El corte duro real es trial (7d) + gracia (7d) ≈ 14 días.

Relacionado: [[turno-flash-tooling]].

**Migración 048 (2026-10-06):** un owner ya no puede cambiar por API `license_*`, `subscription_*` ni
`is_active` de su organización. El trigger `enforce_module_change_is_admin` lo bloquea para quien no sea
admin; `service_role` (webhook de RevenueCat, self-signup) sigue pasando.
**Decisión D-10 (Roberto, 2026-10-06):** con la licencia vencida el negocio queda **bloqueado del todo**,
no en solo lectura. Hoy las lecturas siguen abiertas: hay que cerrarlas (punto pendiente del plan
`qa-piloto-cuba`). El cobro en Cuba será por transferencia más WhatsApp a soporte, y el admin extiende la
licencia a mano. No hay licencias largas para los negocios piloto.
