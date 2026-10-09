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
- **Guías y ayudas para el negocio (2026-10-06):** pensarlas para **personas poco duchas en tecnología**
  e incluir **fotos reales del sistema**, no ilustraciones ni texto solo.
  **Por que:** los dueños del piloto en Cuba usan casi todo desde el teléfono y no tienen costumbre de apps.
  **Como aplicar:** un paso a la vez, frases cortas, el botón que hay que tocar resaltado en la captura y
  nombrado tal cual, y un botón que lleve directo a la pantalla. Vale para la guía de primeros pasos y para
  cualquier ayuda nueva (también el manual de `/help` si se le agregan imágenes). Las capturas se sacan sobre
  un negocio desechable con datos cubanos ([[qa-piloto-cuba]]), nunca sobre uno real.

Relacionado: [[estado-actual-2026-09]], [[convenciones-de-codigo]].

- **Commits (2026-10-08):** pidió los commits «en trozos, aunque no sea por tareas específicas, como para no hacer
  uno solo». Se hicieron por área (licencia, página pública, base de datos, WhatsApp, panel, docs), sobre `main`,
  que es donde trabaja. **El push lo hace él** (subió los 70 commits el 2026-10-08 desde su editor, sin pedírmelo):
  no hacer push salvo que lo pida, y antes de escribir «sin subir» comprobar `git status -sb`.
- **Carpetas de herramientas** (`.playwright-mcp/`): pidió ignorarlas en git, no commitearlas.
- **Ritmo:** con «continúa» espera que siga con lo que no depende de sus respuestas y que junte las preguntas al
  final. Las preguntas sin responder no cuentan como permiso (no desplegué ni commiteé hasta que lo dijo).
- **Cierre de sesión:** pidió dejar las memorias al día con todo lo hecho.
