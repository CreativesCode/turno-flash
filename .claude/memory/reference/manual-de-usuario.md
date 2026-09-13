---
name: manual-de-usuario
description: Donde vive el manual para clientes (/help), como se construye y que hay que tocar cuando cambia una funcionalidad
metadata:
  type: reference
---

Manual para los negocios (no para developers), en español internacional, con 4 guías: Turnos o
Viajes × Dueño o Personal. Hecho el 2026-09-12.

- **Fuente única:** `docs/user-manual/turno-flash-user-manual.html`. Es una página autónoma (con su
  propio JS de pestañas), también publicada como Artifact:
  https://claude.ai/code/artifact/aabd8212-a6ff-4594-b8a4-2ea241cc47e7
- **En la app:** `/help` (`app/help/page.tsx`) lee ese archivo **en el build**, extrae el `<style>` y
  los 4 `<article class="panel">`, y `components/help/HelpManual.tsx` arma el encabezado, las
  pestañas y el índice. Entrada: "Ayuda" en `Sidebar` y `Drawer`. Abre sola la guía que le
  corresponde al usuario logueado (rol + módulos); un link `/help#vd-pasajeros` gana.
- Los tokens CSS del manual llevan prefijo `--hm-*` para no pisar los de la app, y el tema oscuro
  se engancha poniendo `data-theme` en `<html>` según la clase `.dark` de la app.
- El preflight de Tailwind quita viñetas y pone `svg { display: block }`: el CSS del manual
  restituye `list-style` a mano. Si algo se ve distinto en `/help` que en el Artifact, es eso.

**Why:** Roberto pidió el manual "en la misma app, en /help"; leerlo en build evita tener el texto
duplicado y la app nativa lo lleva offline.
**How to apply:** cuando cambie algo visible para el negocio (botones, flujos, límites), editar el
HTML de `docs/user-manual/`, respetando la estructura `article.panel` + `h2[id]`, y republicar el
Artifact con ese mismo path. La sección "Lo que todavía no se puede hacer" de cada guía lista
agujeros reales: sacar el ítem cuando se arregle.

Relacionado: [[modulo-reserva-asientos]], [[copy-espanol-internacional]], [[mapa-docs]].
