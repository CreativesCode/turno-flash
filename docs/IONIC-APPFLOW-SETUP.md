# Configuración para Ionic Appflow

## Problema

Al construir la aplicación en Ionic Appflow, aparece el error:

```
[error] android platform has not been added yet.
```

Esto ocurre porque Ionic Appflow ejecuta `npx cap sync android` pero la plataforma Android no ha sido agregada previamente.

## Solución Implementada (Automática) ✅

**Esta solución ya está implementada en el proyecto.**

El script `build` en `package.json` ahora ejecuta automáticamente `scripts/ensure-platforms.js` después de construir la aplicación. Este script:

1. Detecta automáticamente qué plataforma se está construyendo usando las variables de entorno de Ionic Appflow (`PLATFORM_NAME` o `DEFAULT_PLATFORM`)
2. Agrega la plataforma correspondiente (Android o iOS) si no existe
3. Se ejecuta automáticamente después de cada `npm run build`

**No necesitas hacer nada adicional** - esto funciona automáticamente en Ionic Appflow.

### Cómo funciona

Cuando Ionic Appflow ejecuta:

```bash
npm run build  # Ejecuta: next build && node scripts/ensure-platforms.js
npx cap sync android  # Ahora la plataforma ya está agregada
```

El script `ensure-platforms.js` se ejecuta automáticamente después del build y agrega la plataforma antes del sync.

### Variables de entorno detectadas

El script detecta automáticamente la plataforma usando:

- `PLATFORM_NAME` (preferido) - e.g., "android" o "ios"
- `DEFAULT_PLATFORM` (fallback) - e.g., "ios"

Si ninguna variable está presente (desarrollo local), agrega ambas plataformas.

## Soluciones Alternativas (Si la automática no funciona)

Si por alguna razón la solución automática no funciona, puedes:

### Opción 1: Committear las carpetas de plataforma

Ver `docs/ADD-PLATFORMS-TO-REPO.md` para instrucciones detalladas sobre cómo committear las carpetas `android/` e `ios/` al repositorio.

**Nota:** Las carpetas son grandes (~50-100MB cada una) y normalmente no se committean, pero es la solución tradicional para Ionic Appflow cuando no puedes modificar los pasos del build.
