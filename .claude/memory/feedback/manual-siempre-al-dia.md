---
name: manual-siempre-al-dia
description: Todo cambio visible para el negocio exige ajustar el manual de /help en el mismo trabajo, fotos incluidas
metadata:
  type: feedback
---

**Regla (Roberto, 2026-10-16):** cada vez que un cambio afecte a algo que explica el manual de `/help`
(`docs/user-manual/turno-flash-user-manual.html`), se ajusta el manual **en el mismo trabajo**, no después:
textos, la sección «Lo que todavía no se puede hacer» y **las fotos** de `public/images/help/` si la pantalla
fotografiada cambió (botones, nombres, orden, colores, pasos nuevos).

**Why:** el manual está pensado para dueños poco duchos en tecnología que siguen las fotos al pie de la letra; una
foto vieja los confunde más que no tener foto. Lo pidió al dar por buena la tarea TUR0004 (fotos reales en la ayuda).

**How to apply:**
- Al cerrar cualquier cambio de UI o de flujo, revisar qué secciones y fotos del manual toca y actualizarlas antes
  de dar el trabajo por terminado; nombrarlo en el resumen («manual: secciones X, foto Y rehecha»).
- Rehacer una foto con la receta de [[manual-de-usuario]] (negocios desechables `qa-fixture-ayuda-*` con WhatsApp
  apagado, reloj fijo a las 10:40, 390x700 a 2x → webp de 520 px) y borrar los negocios al terminar.
- Lo mismo vale para las fotos de la guía de primeros pasos (`public/images/guide/`).

Relacionado: [[manual-de-usuario]], [[preferencias-roberto]].
