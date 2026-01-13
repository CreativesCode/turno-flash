# Agregar Plataformas Capacitor al Repositorio

## Para Ionic Appflow (cuando no puedes modificar los pasos del build)

Cuando Ionic Appflow ejecuta `npx cap sync android` directamente y no puedes modificar los pasos del build, necesitas committear las carpetas de plataforma al repositorio.

## Pasos

### 1. Construir la aplicación

Primero, asegúrate de construir la aplicación para generar la carpeta `out/`:

```bash
npm run build
```

### 2. Agregar las plataformas de Capacitor

Ejecuta los siguientes comandos para agregar las plataformas Android e iOS:

```bash
npx cap add android
npx cap add ios
```

Esto creará las carpetas `android/` e `ios/` en la raíz del proyecto.

### 3. Verificar que .gitignore NO ignore las carpetas

El archivo `.gitignore` actual NO está ignorando las carpetas `android/` e `ios/`, así que están listas para ser commitheadas.

Si en el futuro necesitas ignorarlas, NO agregues estas líneas al `.gitignore` si usas Ionic Appflow:

```gitignore
# NO agregar estas líneas si usas Ionic Appflow:
# android/
# ios/
```

### 4. Agregar las carpetas al repositorio

```bash
git add android/
git add ios/
git commit -m "Add Capacitor platform folders for Ionic Appflow builds"
git push
```

### 5. Verificar el tamaño

Las carpetas `android/` e `ios/` son grandes (~50-100MB cada una). Asegúrate de que tu repositorio pueda manejar estos tamaños.

## Nota Importante

- ⚠️ Estas carpetas son generadas y pueden cambiar con cada actualización de Capacitor
- ⚠️ Son específicas de la plataforma y pueden contener configuraciones que necesitas mantener
- ✅ Para Ionic Appflow, esto es la solución estándar cuando no puedes modificar los pasos del build
- ✅ Una vez commitheadas, los builds en Ionic Appflow deberían funcionar correctamente

## Alternativa: Usar Git LFS (Opcional)

Si el tamaño es un problema, puedes usar Git LFS para las carpetas de plataforma:

```bash
git lfs install
git lfs track "android/**"
git lfs track "ios/**"
git add .gitattributes
git add android/ ios/
git commit -m "Add Capacitor platforms with Git LFS"
git push
```

Pero normalmente no es necesario para repositorios privados.
