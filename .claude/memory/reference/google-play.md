---
name: google-play
description: Estado de Turno Flash en Google Play Console (cuenta, canales, clasificación IARC) y qué avisos son automáticos
metadata:
  type: reference
---

## Cuenta y canales (foto del 2026-10-16)

- Cuenta de desarrollador de Play: **«Ismel»** (así aparece como «Company» en los avisos de IARC). La app es «Turno Flash».
- Canales en «Probar y publicar»: **prueba interna 1.0.0** (12 jun 2026) y **prueba cerrada «alpha» 1.0.1** (13 jun 2026).
  **Nada en producción.** Sin cambios pendientes de publicar. Coincide con que la APK va muy por detrás de la web
  (ver [[rediseno-v2]] y [[estado-actual-2026-09]]): todo lo de sep-oct 2026 no está en Play.
- La app Android se genera en Ionic (dashboard.ionicframework.com), no en local (ver [[turno-flash-tooling]]).

## Clasificación de contenido (IARC)

- Cuestionario rellenado el **12 jun 2026**. Global Rating ID: `e26fd054-a60d-8020-8dc0-3fa99efe307e`.
- Resultado: **apta para todos los públicos en todas las regiones**: L (Brasil), E (ESRB), PEGI 3, USK 0, IARC 3+,
  3 (Australia) y 3 (Corea). Es lo correcto para una app de gestión de turnos; no hay nada que pedir revisar.
- Dónde verla en Play Console: **Monitorizar y mejorar → Política y programas → Contenido de la aplicación →
  Clasificaciones del contenido** (o buscar «Clasificación de contenido» en la barra superior).
- **Aviso automático:** el 2026-10-14 llegó un correo «IARC Live Rating Notice» fechado ese día, pero en la consola el
  cuestionario sigue con fecha 12 jun: nadie lo volvió a rellenar. IARC reemite el aviso por su cuenta (cambios en su
  sistema o nueva autoridad). **No requiere acción**; solo guardar el ID por si se publica en otra tienda con IARC.
- Si en una versión futura cambian las respuestas del cuestionario (p. ej. compras dentro de la app, chat entre
  usuarios, ubicación), hay que rellenarlo de nuevo y llega un aviso nuevo con fecha real.
