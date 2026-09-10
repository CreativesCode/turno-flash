---
name: preferencias-roberto
description: Como quiere Roberto que se trabaje en turno-flash — idioma, ritmo de entregas y cambios quirurgicos
metadata:
  type: feedback
---

- **Idioma:** conversacion, docs y memorias en **espanol**. El codigo (identificadores,
  comentarios, commits) en **ingles**; el copy visible al usuario final, en espanol.
- **Landing:** actualizarla solo cuando un plan completo esta terminado, **no por fases**.
  **Por que:** evita publicar promesas de features a medio construir.
  **Como aplicar:** al cerrar un plan multi-fase, el ultimo paso es el landing.
- **Planes largos:** Roberto responde inline sobre el documento de plan (ver las respuestas
  "R:" en `docs/design/MIGRATION-PLAN.md`). Si un plan tiene decisiones abiertas, listarlas
  explicitamente al final para que las conteste ahi.
- **Cambios quirurgicos:** el proyecto ya esta en produccion en Google Play. No refactorizar
  de paso, no introducir dependencias nuevas (Zustand, shadcn/ui, Sentry...) sin preguntar:
  el stack real ya diverge del template de Titan Factory.

Relacionado: [[estado-actual-2026-09]], [[convenciones-de-codigo]].
