# Guía para Solucionar Problemas de OpenGraph en WhatsApp

## Problema
La imagen OpenGraph no aparece cuando se comparte el enlace en WhatsApp, a pesar de estar correctamente configurada.

## Diagnóstico Inicial

### ✅ Lo que ya está bien configurado:
1. ✅ La imagen existe: `/public/opengraph.jpg` (140KB - dentro del límite de 300KB)
2. ✅ Middleware configurado para excluir la imagen de autenticación
3. ✅ Headers configurados en `next.config.ts` y `vercel.json`
4. ✅ Meta tags de OpenGraph correctamente definidos en `app/layout.tsx`
5. ✅ Dimensiones y tipo de archivo correctos (1200x630, JPEG)

### ❓ Lo que necesita verificación:

## Pasos para Resolver el Problema

### 1. Verificar que estás probando en producción (NO localhost)

**IMPORTANTE:** WhatsApp NO puede acceder a localhost. Debes probar con tu URL de producción.

```bash
# Verificar si tienes una URL de producción configurada
echo $NEXT_PUBLIC_SITE_URL
echo $NEXT_PUBLIC_VERCEL_URL
```

Si no tienes variables de entorno configuradas, necesitas:
1. Desplegar tu aplicación en Vercel o similar
2. Configurar `NEXT_PUBLIC_SITE_URL` con tu dominio de producción

### 2. Verificar accesibilidad de la imagen

Visita en tu navegador:
```
https://TU-DOMINIO-PRODUCCION/opengraph.jpg
```

La imagen DEBE:
- ✅ Cargar sin errores (status 200)
- ✅ Ser accesible sin autenticación
- ✅ Tener headers correctos (Content-Type: image/jpeg)
- ✅ Usar HTTPS (no HTTP)

### 3. Usar la página de debug

Visita en producción:
```
https://TU-DOMINIO-PRODUCCION/debug-og
```

Esta página mostrará:
- Todos los meta tags OpenGraph
- URLs que se están generando
- Variables de entorno
- Validadores para probar

### 4. Probar la API de test

Visita en producción:
```
https://TU-DOMINIO-PRODUCCION/api/test-og
```

Esto mostrará si la imagen es accesible desde el servidor.

### 5. Validar con herramientas externas

#### A) Facebook Sharing Debugger (también funciona para WhatsApp)
1. Ve a: https://developers.facebook.com/tools/debug/
2. Ingresa tu URL de producción
3. Haz clic en "Scrape Again" para forzar actualización
4. Verifica que la imagen se muestre correctamente

**IMPORTANTE:** Usa el botón "Scrape Again" varias veces si no aparece la imagen.

#### B) OpenGraph.xyz
1. Ve a: https://www.opengraph.xyz/
2. Ingresa tu URL de producción
3. Verifica que todos los meta tags aparezcan

#### C) LinkedIn Post Inspector
1. Ve a: https://www.linkedin.com/post-inspector/
2. Ingresa tu URL
3. Verifica la vista previa

### 6. Limpiar caché de WhatsApp

WhatsApp cachea las imágenes OpenGraph de forma **MUY AGRESIVA** (puede tardar días o semanas en actualizar).

#### Solución A: Cambiar el nombre del archivo (RECOMENDADO)

```bash
# Renombrar la imagen
mv public/opengraph.jpg public/opengraph-v2.jpg
```

Luego actualizar en `app/layout.tsx`:

```typescript
// Cambiar línea 45:
const ogImageUrl = `${siteUrl}/opengraph-v2.jpg`;
```

#### Solución B: Agregar parámetro de versión (alternativa)

```typescript
// En app/layout.tsx, línea 45:
const ogImageUrl = `${siteUrl}/opengraph.jpg?v=${Date.now()}`;
```

**NOTA:** Esta solución B puede no funcionar siempre debido al caché agresivo de WhatsApp.

### 7. Configurar variables de entorno en producción

Si estás desplegando en Vercel:

1. Ve a tu proyecto en Vercel Dashboard
2. Settings → Environment Variables
3. Agrega:
   ```
   NEXT_PUBLIC_SITE_URL=https://tu-dominio.com
   ```

Si tienes dominio personalizado:
```
NEXT_PUBLIC_SITE_URL=https://follow-it.com
```

Si usas el dominio de Vercel:
```
NEXT_PUBLIC_SITE_URL=https://follow-it.vercel.app
```

### 8. Verificar que no haya bloqueos de CORS

Asegúrate de que tu `vercel.json` tenga el header CORS correcto:

```json
{
  "headers": [
    {
      "source": "/opengraph.jpg",
      "headers": [
        {
          "key": "Access-Control-Allow-Origin",
          "value": "*"
        }
      ]
    }
  ]
}
```

✅ Este ya está configurado en tu proyecto.

### 9. Verificar el tamaño y formato de la imagen

```bash
# Verificar tamaño del archivo
ls -lh public/opengraph.jpg

# Debe ser:
# - Menor a 300KB (✅ tu archivo es 140KB)
# - Formato: JPEG, PNG o GIF
# - Dimensiones recomendadas: 1200x630px (ratio 1.91:1)
```

### 10. Probar en WhatsApp

**PASOS CORRECTOS:**

1. Asegúrate de estar en producción (no localhost)
2. Limpia el caché de WhatsApp (o cambia el nombre de la imagen)
3. Copia la URL de tu sitio en producción
4. Envía el mensaje a un contacto o grupo
5. Espera unos segundos para que WhatsApp genere la vista previa

**IMPORTANTE:** Si ya compartiste el enlace antes:
- WhatsApp tiene la versión en caché
- Necesitas cambiar el nombre de la imagen O esperar días/semanas
- Probar con otro enlace (ejemplo: agregar ?test=1 al final)

## Checklist Final

Antes de probar en WhatsApp, verifica:

- [ ] La app está desplegada en producción (no localhost)
- [ ] La variable `NEXT_PUBLIC_SITE_URL` está configurada en producción
- [ ] La imagen `/opengraph.jpg` es accesible públicamente
- [ ] Los meta tags aparecen correctamente en la página de debug
- [ ] El Facebook Debugger muestra la imagen correctamente
- [ ] Has usado "Scrape Again" en Facebook Debugger
- [ ] Has cambiado el nombre de la imagen o agregado parámetro de versión
- [ ] La URL usa HTTPS (no HTTP)
- [ ] No hay errores en la consola del navegador
- [ ] La imagen carga directamente en el navegador

## Solución Rápida de Emergencia

Si necesitas que funcione YA:

1. Cambia el nombre de la imagen:
   ```bash
   cp public/opengraph.jpg public/og-$(date +%s).jpg
   ```

2. Actualiza `app/layout.tsx` con el nuevo nombre

3. Despliega a producción

4. Usa Facebook Sharing Debugger para hacer scrape

5. Prueba el nuevo enlace en WhatsApp

## Recursos Adicionales

- [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/)
- [OpenGraph Protocol](https://ogp.me/)
- [Twitter Card Validator](https://cards-dev.twitter.com/validator)
- [LinkedIn Post Inspector](https://www.linkedin.com/post-inspector/)
- [Next.js Metadata](https://nextjs.org/docs/app/building-your-application/optimizing/metadata)

## Notas Importantes sobre WhatsApp

1. **Caché agresivo:** WhatsApp cachea por días o semanas
2. **Requiere HTTPS:** No funciona con HTTP o localhost
3. **Sin autenticación:** La imagen debe ser pública
4. **Límite de tamaño:** Máximo 300KB
5. **Formatos soportados:** JPEG, PNG, GIF
6. **Dimensiones:** 1200x630px es el estándar (ratio 1.91:1)
7. **Primera impresión:** La primera vez que se comparte es crítica
8. **Actualización:** Muy difícil actualizar una vez cacheada

## Contacto

Si después de seguir todos estos pasos el problema persiste, revisa:
1. Los logs del servidor de producción
2. Las herramientas de desarrollo del navegador (Network tab)
3. La configuración de tu CDN o proxy inverso (si usas uno)
