# Implementación Móvil con Capacitor

Esta aplicación está optimizada para funcionar como una app nativa en dispositivos móviles usando Capacitor.

## 🎯 Características Principales

### 1. **Navbar Móvil con Safe Areas**

- Navbar fijo en la parte superior solo visible en móvil (`<1024px`)
- Respeta la barra de estado del teléfono (notch, status bar)
- Botón hamburguesa para abrir/cerrar el sidebar
- Se oculta automáticamente en desktop

### 2. **Sidebar Adaptativo**

- **Móvil**: Se desliza desde la izquierda con overlay
- **Desktop**: Siempre visible en el lado izquierdo
- Respeta el safe area en móvil (notch y botones de navegación)
- Animaciones suaves para abrir/cerrar

### 3. **Safe Areas**

La aplicación maneja correctamente las áreas seguras de iOS y Android:

- **Status Bar**: Barra superior con hora, batería, señal
- **Notch**: Muesca en pantallas iPhone X+
- **Home Indicator**: Barra inferior de navegación
- **Bordes curvos**: Esquinas redondeadas de dispositivos modernos

## 📁 Archivos Clave

### Componentes

- `components/MobileNavbar.tsx`: Navbar móvil con safe area support
- `components/Sidebar.tsx`: Sidebar adaptativo móvil/desktop
- `hooks/useCapacitor.ts`: Hook para detectar Capacitor y manejar status bar

### Layouts

- `app/layout.tsx`: Layout principal con viewport config
- `app/dashboard/layout.tsx`: Layout del dashboard con integración de navbar y sidebar

### Estilos

- `app/globals.css`: Variables CSS para safe areas y utilidades

## 🔧 Configuración

### Variables CSS Safe Area

```css
:root {
  --safe-area-inset-top: env(safe-area-inset-top);
  --safe-area-inset-right: env(safe-area-inset-right);
  --safe-area-inset-bottom: env(safe-area-inset-bottom);
  --safe-area-inset-left: env(safe-area-inset-left);
}
```

### Viewport Meta Tag

```html
<meta
  name="viewport"
  content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover"
/>
```

El `viewport-fit=cover` es crucial para que iOS respete los safe areas.

## 🚀 Testing

### En el Navegador

```bash
npm run dev
```

- Abre Chrome DevTools
- Activa la vista móvil (Ctrl/Cmd + Shift + M)
- Selecciona un dispositivo (iPhone 12, etc.)
- Verifica que el navbar y sidebar funcionan correctamente

### En Capacitor (iOS)

```bash
# Sincronizar cambios
npm run build
npx cap sync ios

# Abrir en Xcode
npx cap open ios
```

### En Capacitor (Android)

```bash
# Sincronizar cambios
npm run build
npx cap sync android

# Abrir en Android Studio
npx cap open android
```

## 📱 Breakpoints

- **Móvil**: `< 1024px` (lg breakpoint de Tailwind)

  - Navbar visible
  - Sidebar como drawer
  - Safe areas activos

- **Desktop**: `>= 1024px`
  - Navbar oculto
  - Sidebar siempre visible
  - Sin safe areas

## 🎨 Comportamiento por Plataforma

### iOS

- Status bar transparente con overlay
- Respeta el notch y las esquinas redondeadas
- Home indicator respetado en la parte inferior

### Android

- Status bar con color según el tema
- Respeta los botones de navegación (si los tiene)
- Barra de estado configurable

### Web

- Funciona normalmente sin safe areas
- Responsive design estándar

## ⚡ Optimizaciones

1. **Performance**

   - Hook `useCapacitor` solo se ejecuta una vez al montar
   - Transiciones CSS en lugar de JavaScript
   - Detección de resize con debounce implícito

2. **UX**

   - Overlay semi-transparente al abrir el sidebar en móvil
   - Animaciones suaves (300ms)
   - Tap fuera del sidebar para cerrarlo
   - Cierre automático al navegar

3. **Accesibilidad**
   - Labels ARIA apropiados
   - Contraste adecuado
   - Touch targets de 44px mínimo

## 🔍 Debugging

### Status Bar no se ve correctamente

```typescript
// Verificar en useCapacitor.ts que se ejecuta:
await StatusBar.show();
await StatusBar.setStyle({ style: Style.Dark });
```

### Safe Areas no funcionan

1. Verificar viewport meta tag en `app/layout.tsx`
2. Verificar que incluye `viewport-fit=cover`
3. En iOS Simulator, verificar que el dispositivo tiene notch

### Sidebar no se abre

1. Verificar estado `sidebarOpen` en DevTools
2. Verificar que el overlay se renderiza
3. Verificar z-index de los elementos

## 📚 Referencias

- [Capacitor Status Bar](https://capacitorjs.com/docs/apis/status-bar)
- [Safe Area Insets](https://webkit.org/blog/7929/designing-websites-for-iphone-x/)
- [Viewport Fit](https://developer.mozilla.org/en-US/docs/Web/HTML/Viewport_meta_tag)
