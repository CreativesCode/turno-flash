---
name: manual-de-usuario
description: Donde vive el manual para clientes (/help), como se construye y que hay que tocar cuando cambia una funcionalidad
metadata:
  type: reference
---

Manual para los negocios (no para developers), en español internacional, con 4 guías: Turnos o
Viajes × Dueño o Personal. Hecho el 2026-09-12.

- **Fuente única:** `docs/user-manual/turno-flash-user-manual.html`. Es una página autónoma (con su
  propio JS de pestañas). Estuvo publicada como Artifact
  (`.../artifact/aabd8212-a6ff-4594-b8a4-2ea241cc47e7`), pero **ese enlace ya no se puede leer desde
  2026-10-06** (borrado o de otra cuenta): no intentar republicarlo. Si Roberto quiere una copia
  publicada, crear una nueva y anotar aquí el enlace
- **En la app:** `/help` (`app/(app)/help/page.tsx`) lee ese archivo **en el build**, extrae el `<style>` y
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
HTML de `docs/user-manual/`, respetando la estructura `article.panel` + `h2[id]`, (los avisos van como
`<div class="callout tip|note|warn"><span class="tag">…</span>…</div>`). La sección "Lo que todavía no se puede hacer" de cada guía lista
agujeros reales: sacar el ítem cuando se arregle.

Relacionado: [[modulo-reserva-asientos]], [[copy-espanol-internacional]], [[mapa-docs]].

**Guía de primeros pasos (2026-10-06):** además del manual, el dueño nuevo ve en Inicio la tarjeta
"Pon en marcha tu negocio" (`components/onboarding/SetupGuide.tsx`), mencionada en las secciones
"Puesta en marcha" del manual. Si cambia un paso de la guía, revisar también esas secciones.
