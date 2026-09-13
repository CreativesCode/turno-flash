---
name: copy-espanol-internacional
description: El copy visible al usuario va en espanol internacional (tuteo), nunca rioplatense — ni en textos, ni en formatos de moneda y fecha
metadata:
  type: feedback
---

Todo el texto que ve el usuario final va en **espanol internacional con tuteo**. Nada de voseo
ni de regionalismos rioplatenses.

**Por que:** los negocios que usan Turno Flash no son argentinos (los primeros son cubanos), y
el producto apunta a toda Hispanoamerica. Un "tenes que guardar la seña" suena extranjero al
90% de los clientes. Roberto lo pidio explicitamente el 2026-09-12, cuando ya habia UI escrita
en voseo: *"todo esta como si fuera argentino y lo quisiera... español internacional"*.

**Como aplicar:**

- **Verbos en tu, no en vos:** elige / puedes / tienes / guarda / activa / crea / revisa /
  vuelve / comparte. Nunca elegi, podes, tenes, guarda(voseo), activa(voseo), crea(voseo).
- **Deixis:** "aqui", no "aca".
- **Palabras marcadas que ya se cambiaron:** "seña" -> **"anticipo"** (cuidado con el genero:
  *el* anticipo, *un* anticipo, anticipo *cobrado*), "guagua"/"omnibus" -> "autobus" cuando el
  texto es generico.
- **Formatos:** `fmtMoney` usa locale `"es"` (no `"es-AR"`) y su moneda por defecto es `USD`,
  igual que el default de la tabla. Las fechas van con `toLocaleDateString("es", ...)` o con
  el locale `es` de date-fns. **Ningun importe se formatea sin moneda**: en el dashboard se usa
  `useMoney()` (lee la moneda de la organizacion, migracion 039) y en las paginas publicas la
  moneda viaja en el payload de la edge function.
- Aplica igual al copy de las **Edge Functions** (mensajes de WhatsApp y errores de la API
  publica), no solo a la UI.

**Como verificarlo:** buscar palabras que terminen en vocal acentuada dentro de textos —
`grep -rnoE "(?<![A-Za-z])[A-Za-zñ]{3,}(á|é|í)(?![A-Za-z])"` sobre `app components
supabase/functions utils hooks services` — y revisar la lista: lo que quede deberia ser solo
futuro/tercera persona ("estara", "recibira") y palabras normales ("esta", "aqui", "tambien").

Relacionado: [[preferencias-roberto]], [[modulo-reserva-asientos]], [[convenciones-de-codigo]].
