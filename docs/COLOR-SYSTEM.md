# Sistema de Colores TurnoFlash

Este documento describe el sistema de colores de TurnoFlash y cómo usarlos correctamente en los componentes.

## 🎨 Paleta de Colores

### Colores Principales

#### Primary (Verde)
- **Uso**: Acciones principales, confirmaciones, estados de éxito, CTAs principales
- **Color base**: `#22c55e` (Green-500)
- **Clases**: `bg-primary`, `text-primary`, `border-primary`, etc.
- **Variantes**: `primary-50` a `primary-950`

#### Secondary (Rosa/Fuchsia)
- **Uso**: Recordatorios, notificaciones destacadas, acciones secundarias
- **Color base**: `#db2777` (Fuchsia-500)
- **Clases**: `bg-secondary`, `text-secondary`, `border-secondary`, etc.
- **Variantes**: `secondary-50` a `secondary-950`

### Colores Semánticos

#### Success (Verde - igual que Primary)
- **Uso**: Estados positivos, completados, confirmaciones
- **Color base**: `#22c55e`
- **Clases**: `bg-success`, `text-success-600`, `bg-success-100 text-success-800` (para badges)
- **Nota**: Puede usarse indistintamente con `primary`

#### Danger (Rojo)
- **Uso**: Errores, cancelaciones, acciones destructivas, estados críticos
- **Color base**: `#ef4444` (Red-500)
- **Clases**: `bg-danger`, `text-danger`, `bg-danger-100 text-danger-800` (para badges)

#### Warning (Naranja/Amber)
- **Uso**: Advertencias, estados pendientes, atención requerida
- **Color base**: `#f59e0b` (Amber-500)
- **Clases**: `bg-warning`, `text-warning`, `bg-warning-100 text-warning-800` (para badges)

#### Info (Azul)
- **Uso**: Información general, enlaces, navegación, acciones informativas
- **Color base**: `#3b82f6` (Blue-500)
- **Clases**: `bg-info`, `text-info`, `bg-info-100 text-info-800` (para badges)

### Colores Semánticos del Sistema

- **Background**: `bg-background` - Fondo principal de la aplicación
- **Surface**: `bg-surface` - Superficies de tarjetas, modales
- **Muted**: `bg-muted` - Fondos sutiles
- **Subtle**: `bg-subtle` - Fondos muy sutiles
- **Border**: `border-border` - Bordes estándar
- **Foreground**: `text-foreground` - Texto principal
- **Foreground Muted**: `text-foreground-muted` - Texto secundario

## 📋 Guía de Uso

### Botones

#### Botón Primario (Acción principal)
```tsx
<button className="bg-primary text-white hover:bg-primary-700 focus:ring-2 focus:ring-primary-500">
  Crear Turno
</button>
```

#### Botón Secundario (Acción secundaria)
```tsx
<button className="bg-secondary text-white hover:bg-secondary-700 focus:ring-2 focus:ring-secondary-500">
  Enviar Recordatorio
</button>
```

#### Botón Info (Información/navegación)
```tsx
<button className="bg-info text-white hover:bg-info-700 focus:ring-2 focus:ring-info-500">
  Ver Detalles
</button>
```

#### Botón Danger (Acción destructiva)
```tsx
<button className="bg-danger text-white hover:bg-danger-700 focus:ring-2 focus:ring-danger-500">
  Cancelar Turno
</button>
```

#### Botón Ghost/Outline
```tsx
<button className="bg-transparent border border-border text-foreground hover:bg-surface">
  Cancelar
</button>
```

### Badges de Estado

#### Estado: Confirmado/Completado
```tsx
<span className="bg-success-100 text-success-800 dark:bg-success-900/20 dark:text-success-400">
  ✓ Confirmado
</span>
```

#### Estado: Pendiente
```tsx
<span className="bg-warning-100 text-warning-800 dark:bg-warning-900/20 dark:text-warning-400">
  ⏳ Pendiente
</span>
```

#### Estado: Cancelado/Error
```tsx
<span className="bg-danger-100 text-danger-800 dark:bg-danger-900/20 dark:text-danger-400">
  ❌ Cancelado
</span>
```

#### Estado: Información
```tsx
<span className="bg-info-100 text-info-800 dark:bg-info-900/20 dark:text-info-400">
  📋 Información
</span>
```

### Alertas/Mensajes

#### Alerta de Éxito
```tsx
<div className="bg-success-50 text-success-800 dark:bg-success-900/20 dark:text-success-400">
  Operación completada exitosamente
</div>
```

#### Alerta de Error
```tsx
<div className="bg-danger-50 text-danger-800 dark:bg-danger-900/20 dark:text-danger-400">
  Error al procesar la solicitud
</div>
```

#### Alerta de Advertencia
```tsx
<div className="bg-warning-50 text-warning-800 dark:bg-warning-900/20 dark:text-warning-400">
  Atención: acción requerida
</div>
```

#### Alerta Informativa
```tsx
<div className="bg-info-50 text-info-800 dark:bg-info-900/20 dark:text-info-400">
  Información importante
</div>
```

### Fondos y Superficies

```tsx
{/* Fondo principal */}
<div className="bg-background">

{/* Tarjeta/Superficie */}
<div className="bg-surface border border-border rounded-lg">

{/* Fondo sutil */}
<div className="bg-muted">
```

### Textos

```tsx
{/* Texto principal */}
<p className="text-foreground">

{/* Texto secundario */}
<p className="text-foreground-muted">

{/* Texto con color semántico */}
<p className="text-primary">
<p className="text-danger">
```

## 🔄 Mapeo de Colores Antiguos → Nuevos

| Colores Antiguos (Hardcodeados) | Nuevo Token Semántico | Contexto |
|----------------------------------|----------------------|----------|
| `bg-blue-600` | `bg-info` | Botones informativos, navegación |
| `bg-green-600` | `bg-success` o `bg-primary` | Acciones de éxito, confirmaciones |
| `bg-red-600` | `bg-danger` | Acciones destructivas, cancelaciones |
| `bg-purple-600` | `bg-primary` o `bg-secondary` | Depende del contexto |
| `bg-pink-600` | `bg-secondary` | Recordatorios, notificaciones |
| `bg-orange-600` | `bg-warning` | Advertencias, pendientes |
| `bg-yellow-100 text-yellow-800` | `bg-warning-100 text-warning-800` | Badges de advertencia |
| `bg-zinc-50 dark:bg-black` | `bg-background` | Fondos principales |
| `bg-white dark:bg-zinc-900` | `bg-surface` | Superficies de tarjetas |

## 🌙 Modo Oscuro

Todos los colores tienen soporte automático para modo oscuro a través de las variables CSS. Las clases de Tailwind se adaptan automáticamente usando las variables definidas en `globals.css`.

Para badges y elementos con fondos claros, usa el patrón:
```tsx
className="bg-{color}-100 text-{color}-800 dark:bg-{color}-900/20 dark:text-{color}-400"
```

## 🎯 Principios de Diseño

1. **Consistencia**: Usa siempre los tokens semánticos, nunca colores hardcodeados
2. **Jerarquía**: Primary para acciones principales, Info para navegación, Danger para destructivas
3. **Accesibilidad**: Los contrastes están verificados para WCAG AA
4. **Semántica**: Los colores comunican significado (success = positivo, danger = negativo)

## 📝 Notas

- El color `success` es idéntico a `primary` pero se mantiene separado por claridad semántica
- Los colores están definidos en `app/globals.css` usando variables CSS
- Para cambiar los colores globalmente, edita las variables en `globals.css`
- Todos los colores incluyen una escala completa de 50 a 950 para flexibilidad
