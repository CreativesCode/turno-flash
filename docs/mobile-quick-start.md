# 🚀 Guía Rápida - Desarrollo Móvil

## 📱 Primeros Pasos

### 1. Instalación

```bash
npm install
```

### 2. Desarrollo en Navegador

La forma más rápida de ver los cambios móviles:

```bash
npm run dev
```

Luego abre Chrome DevTools:

1. Presiona `F12` o `Ctrl+Shift+I` (Windows) / `Cmd+Option+I` (Mac)
2. Click en el ícono de dispositivo móvil o `Ctrl+Shift+M` / `Cmd+Shift+M`
3. Selecciona un dispositivo (ej: iPhone 12 Pro, Pixel 5)
4. Recarga la página

### 3. Testear en Dispositivo Real

#### iOS (requiere Mac)

```bash
# Primera vez
npm run mobile:build:ios

# Esto hará:
# 1. Build de Next.js
# 2. Sync con Capacitor iOS
# 3. Abrirá Xcode

# En Xcode:
# - Conecta tu iPhone
# - Selecciona tu dispositivo
# - Presiona el botón Play ▶️
```

#### Android

```bash
# Primera vez
npm run mobile:build:android

# Esto hará:
# 1. Build de Next.js
# 2. Sync con Capacitor Android
# 3. Abrirá Android Studio

# En Android Studio:
# - Conecta tu dispositivo Android o abre un emulador
# - Presiona el botón Play ▶️
```

## 🎯 Características Móviles Implementadas

### ✅ Navbar Móvil

- Aparece solo en pantallas < 1024px
- Botón hamburguesa para abrir el menú
- Respeta la barra de estado del teléfono
- Tema claro/oscuro adaptativo

### ✅ Sidebar Adaptativo

- **Móvil**: Drawer deslizante desde la izquierda
- **Desktop**: Siempre visible
- Overlay oscuro al abrir en móvil
- Cierra automáticamente al navegar

### ✅ Safe Areas

- Notch de iPhone respetado
- Barra de estado protegida
- Home indicator respetado
- Bordes curvos considerados

### ✅ Status Bar Nativa

- Color según tema (claro/oscuro)
- Se integra con el diseño
- Solo en apps nativas (no en web)

## 🔍 Testing Checklist

Cuando hagas cambios, verifica:

### En Navegador (Chrome DevTools)

- [ ] Navbar aparece en móvil
- [ ] Sidebar se abre con el botón hamburguesa
- [ ] Sidebar se cierra al hacer click fuera
- [ ] Sidebar se cierra al navegar
- [ ] En desktop, sidebar está siempre visible
- [ ] Tema claro/oscuro funciona

### En Dispositivo iOS

- [ ] Safe area respetado (no hay contenido bajo el notch)
- [ ] Status bar tiene el color correcto
- [ ] Navbar no se solapa con la hora/batería
- [ ] Gestos de iOS funcionan (swipe back)
- [ ] No hay scroll bounce extraño

### En Dispositivo Android

- [ ] Status bar tiene el color correcto
- [ ] No hay contenido bajo los botones de navegación
- [ ] Navbar se ve correctamente
- [ ] El drawer se abre suavemente

## 🛠️ Scripts Útiles

```bash
# Desarrollo web normal
npm run dev

# Build y sync con ambas plataformas
npm run mobile:build

# Solo iOS
npm run mobile:build:ios

# Solo Android
npm run mobile:build:android

# Sync rápido (sin rebuild completo)
npm run cap:sync
```

## 🐛 Problemas Comunes

### "Safe area no funciona"

**Solución**: Verifica que el viewport incluye `viewport-fit=cover` en `app/layout.tsx`

### "Status bar blanca en iOS"

**Solución**: El status bar se configura automáticamente. Verifica que `@capacitor/status-bar` está instalado.

### "El sidebar no se abre"

**Solución**:

1. Verifica la consola del navegador
2. Asegúrate de estar en vista móvil (< 1024px)
3. Limpia el cache del navegador

### "Cambios no se reflejan en la app"

**Solución**:

```bash
npm run mobile:build
```

Luego recompila la app en Xcode o Android Studio.

## 📚 Más Información

- [Documentación Completa](./mobile-implementation.md)
- [Capacitor Docs](https://capacitorjs.com/docs)
- [Next.js Docs](https://nextjs.org/docs)

## 💡 Tips

1. **Hot Reload en Dispositivo**: Usa la IP de tu computadora en lugar de localhost

   ```typescript
   // capacitor.config.ts
   server: {
     url: 'http://192.168.1.100:3000', // Tu IP local
     cleartext: true
   }
   ```

2. **DevTools Remotos**:

   - iOS: Safari > Develop > [tu dispositivo]
   - Android: Chrome > chrome://inspect

3. **Performance**: El primer build puede tardar. Builds subsecuentes son más rápidos.

4. **Emuladores**: Son más rápidos para testing rápido que dispositivos reales.

## 🎨 Personalización

### Cambiar altura del navbar:

`components/MobileNavbar.tsx`:

```typescript
<div className="flex h-14 items-center..."> // Cambia h-14
```

### Cambiar ancho del sidebar:

`components/Sidebar.tsx`:

```typescript
<aside className="... w-64 ..."> // Cambia w-64
```

### Modificar breakpoint móvil/desktop:

Busca `lg:` en los archivos y cambia por `md:` o `xl:` según necesites.

## 🚀 Deploy

Para producción, construye las apps nativas:

```bash
# Build optimizado
npm run build

# Sync con plataformas
npm run cap:sync

# Abre para crear release
npm run cap:ios      # Submit a App Store
npm run cap:android  # Submit a Play Store
```

---

¿Preguntas? Revisa la [documentación completa](./mobile-implementation.md) o abre un issue.
