---
name: tasknic
description: Turno Flash enlazado con Tasknic (gestor de tareas del equipo) via skill tasknic
metadata:
  type: reference
---

- **Conectado el 2026-10-15.** La key `TASKNIC_API_KEY` vive en `.env.local` (ignorado por git; nunca commitearla).
  Cada programador pone la suya en su propio `.env.local`.
- Proyecto en Tasknic: **«Turno Flash»** (códigos `TUR0001`…). En el mismo workspace está también «LensSpace».
- Equipo: Roberto Gabriel Cabrera Álvarez (admin), Claudia Rodríguez Rodríguez (admin) y «Claude (Agente IA)».
- **Atribución:** cuando Roberto pide crear tareas/comentarios, `requested_by: "Roberto Gabriel Cabrera Álvarez"`
  (lo pidió el 2026-10-15). Si quien chatea es otra persona, usar su nombre, no este.
- Tareas iniciales (2026-10-15): TUR0001 «Analizar y cerrar pendientes» (en progreso), TUR0002 petición de Aicenis
  (acortar el horario visible del calendario, p. ej. hasta las 2 pm), TUR0003 cobro de anticipos en turnos (como en
  pasajes), TUR0004 actualizar README y ayuda con fotos reales.
- **Pestaña «Despliegue» (2026-10-15):** el texto «Notas de despliegue» **no se puede editar por la API** (lo pega
  Roberto a mano). «Qué corre ahora» sí: `POST /projects/Turno%20Flash/deployments` con un `sha` ya pusheado
  (`git rev-parse origin/main`), `status`, `verified` (true solo si se comprobó en vivo), `target`
  (`web`, `migrations`, `edge-functions/<nombre>`; sin target = todo) y `migrations_applied`.
  **Registrar cada despliegue a producción al terminarlo.** Primer registro: `2966d61`, sin verificar.
  Además hay una nota larga «Despliegue» en Documentos del Espacio.
