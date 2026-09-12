---
name: secretos-en-assets-del-template
description: Assets binarios de Titan Factory pueden traer API keys en su metadata; como detectarlo y limpiarlo sin romper la historia
metadata:
  type: reference
---

**2026-09-11:** GitHub push protection (GH013) rechazo el push de 7 commits por una
**API key de OpenRouter (`sk-or-v1-...`) incrustada en el chunk XMP de
`.claude/skills/video-visuals/assets/levy.png`**, un asset que llego con el template de
Titan Factory (commit `b6bd18e`, 2026-09-07). No era una key de Roberto: no coincide con
`.env.local`. La key **nunca llego a GitHub** — el push fue rechazado antes.

**Why:** las imagenes generadas por IA guardan en metadata el comando/params que las creo,
incluida la key. `git grep` no las ve: son binarios. Solo aparecen con `grep -a` o al pushear.

**How to apply:**

- Antes de commitear un asset binario que no generaste tu:
  `grep -a -c -E 'sk-[A-Za-z0-9-]{8}|api[_-]?key' <archivo>`
- Para limpiar la metadata sin perder la imagen (sharp ya esta en el proyecto, correr desde
  la raiz para que resuelva el modulo — no desde el scratchpad):
  `node -e "const s=require('sharp'),f=require('fs');s('<ruta>').png({compressionLevel:9}).toBuffer().then(b=>f.writeFileSync('<ruta>',b))"`
  `.png()` descarta la metadata por defecto. El archivo crecio de 910 KB a 1,26 MB por la
  recompresion; la imagen (1080x1080) queda intacta y el skill `video-visuals` sigue igual.
- Si el secreto ya esta en un commit **sin pushear**, reescribir en vez de usar el enlace
  "allow secret" de GitHub (ese enlace lo publica de verdad):
  1. `git branch backup-pre-secret-fix main`
  2. `NEWBLOB=$(git hash-object -w <ruta>)` y `git checkout -- <ruta>` (filter-branch exige tree limpio)
  3. `FILTER_BRANCH_SQUELCH_WARNING=1 git filter-branch --force --index-filter \
      "git update-index --cacheinfo 100644,$NEWBLOB,<ruta>" -- origin/main..HEAD`
  4. Verificar blob por blob antes de pushear:
     `for c in $(git rev-list origin/main..HEAD); do git rev-parse $c:<ruta>; done | sort -u`
- Los `sk-or-v1-` de `.claude/skills/ai/references/` son placeholders (`sk-or-v1-tu-key`),
  no los toques.

Ver [[convenciones-de-codigo]] y [[turno-flash-tooling]].
