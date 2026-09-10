---
name: update-tf
description: "Actualizar Titan Factory a la ultima version. Activar cuando el usuario dice: actualiza el template, hay nueva version, update Titan Factory, quiero la ultima version, o cuando se detecta que el template esta desactualizado."
allowed-tools: Read, Bash
---

# Update Titan Factory

Este skill actualiza las herramientas de desarrollo (carpeta `.claude/`) a la ultima version disponible.

## Proceso

### Paso 1: Buscar el alias titan-factory

Busca el alias `titan-factory` en los archivos de configuracion del shell del usuario:

```bash
# Search in zshrc
grep "alias titan-factory" ~/.zshrc

# If not found, search in bashrc
grep "alias titan-factory" ~/.bashrc
```

El alias tiene este formato:
```bash
alias titan-factory="cp -r /path/to/repo/titan-factory/. ."
```

**Extrae la ruta del repo** del alias (la parte entre `cp -r ` y `/titan-factory/.`).

Si no encuentras el alias, pregunta al usuario:
> No encontre el alias `titan-factory`. Por favor, indica la ruta donde tienes el repositorio de Titan Factory.

### Paso 2: Actualizar el repositorio fuente

Una vez tengas la ruta del repo, actualiza con git:

```bash
cd [TF_REPO_PATH]
git pull origin main
```

Si hay errores de git (cambios locales, etc.), informa al usuario y sugiere solucion.

### Paso 3: Actualizar .claude/ de forma SELECTIVA (NUNCA `rm -rf .claude/`)

**CRITICO: nunca borres la carpeta `.claude/` completa.** Varios proyectos acumulan ahi
memoria persistente real, PRPs de features ya implementadas, y skills/agentes
personalizados (integraciones a medida con APIs/ERPs del cliente) que NO existen en el
repo fuente de Titan Factory. Un `rm -rf .claude/` + copia completa destruye todo eso.

En vez de eso, sincroniza SOLO el toolbox generico, respetando estas reglas:

1. **Skills y agentes: solo agregar/actualizar, NUNCA borrar lo que no este en el origen.**
   Para cada carpeta dentro de `[TF_REPO_PATH]/titan-factory/.claude/skills/` y
   `.claude/agents/`, copia/sobrescribe la version del origen en el proyecto. NO uses
   `rsync --delete` ni borres carpetas del proyecto que no existan en el origen — esas
   son casi siempre skills/agentes personalizados del proyecto (ej. integraciones ERP
   especificas del cliente), no versiones desactualizadas del template.
   ```bash
   cp -rf [TF_REPO_PATH]/titan-factory/.claude/skills/. .claude/skills/
   cp -rf [TF_REPO_PATH]/titan-factory/.claude/agents/. .claude/agents/
   ```
   Si detectas skills/agentes en el proyecto que no existen en el origen, mencionalos
   en el resumen final (paso 4) — no los toques, solo informa que existen.

2. **design-systems/ y hooks/: seguros de sincronizar en espejo completo** (son contenido
   estatico del template, no suele personalizarse por proyecto):
   ```bash
   rsync -a --delete [TF_REPO_PATH]/titan-factory/.claude/design-systems/ .claude/design-systems/
   rsync -a --delete [TF_REPO_PATH]/titan-factory/.claude/hooks/ .claude/hooks/
   ```

3. **README.md y example.mcp.json: sobrescribir siempre**, son documentacion/plantilla:
   ```bash
   cp -f [TF_REPO_PATH]/titan-factory/.claude/README.md .claude/README.md
   cp -f [TF_REPO_PATH]/titan-factory/.claude/example.mcp.json .claude/example.mcp.json
   ```

4. **settings.json: solo crear si NO existe. Si ya existe, NUNCA sobrescribir** — puede
   tener permisos/configuracion real del proyecto (no solo `autoMemoryEnabled`):
   ```bash
   [ -f .claude/settings.json ] || cp [TF_REPO_PATH]/titan-factory/.claude/settings.json .claude/settings.json
   ```

5. **`.claude/memory/` y `.claude/PRPs/`: NUNCA tocar.** No los leas como parte de este
   proceso, no los sincronices, no los borres. Son datos reales del proyecto, no
   contenido del template.

6. Skills viejos con nombres pre-rebranding (ej. `eject-sf`, `update-sf`) que ya no
   existen en el origen pueden eliminarse manualmente si los encuentras (son basura de
   una version anterior), pero hazlo de forma explicita y puntual — nunca vía borrado
   masivo de toda la carpeta.

### Paso 4: Confirmar actualizacion

Informa al usuario:

```
Titan Factory actualizado correctamente.

Cambios aplicados (toolbox generico, sincronizado de forma selectiva):
- .claude/skills/ y .claude/agents/ (actualizados/agregados, nada borrado)
- .claude/design-systems/ y .claude/hooks/ (sincronizados)
- .claude/README.md, .claude/example.mcp.json (actualizados)
- .claude/settings.json (creado solo si no existia)

NO tocado (datos reales del proyecto):
- .claude/memory/ (memoria persistente)
- .claude/PRPs/ (features ya planeadas/implementadas)
- CLAUDE.md, GEMINI.md (tu configuracion de proyecto — si el cambio de version
  incluye una regla nueva del Factory OS, ofrece agregarla ahi manualmente)
- .mcp.json (tus tokens y credenciales)
- src/ (tu codigo)

[Si el paso 3.1 encontro skills/agentes personalizados sin equivalente en el origen,
listalos aqui: "Se detectaron skills/agentes propios del proyecto, no tocados: ..."]
```

## Notas

- Este skill NO modifica `CLAUDE.md`, `.mcp.json`, `.claude/memory/`, `.claude/PRPs/`
  ni el codigo fuente
- Solo actualiza la "toolbox" de desarrollo, de forma no destructiva (nunca borra
  contenido del proyecto que no venga del template)
- Si necesitas actualizar `CLAUDE.md`/`GEMINI.md` manualmente, revisa el template en
  el repo TF y aplica los cambios de forma quirurgica, respetando las personalizaciones
  del proyecto
