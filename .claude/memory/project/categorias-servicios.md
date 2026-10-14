---
name: categorias-servicios
description: Categorías de servicios, marcas, orden y duplicar (PRP-004, pedido de Aicenis); qué hace cada pieza y dónde vive
metadata:
  type: project
---

# Categorías de servicios (PRP-004) — implementado 2026-10-14

- **Origen:** Aicenis (Espiral Studio) tiene ~29 paquetes de fotos en Familiares / Embarazo / Boda / Quince /
  Fotos sueltas; el mismo paquete cambia de precio según la sesión. Plan y aprendizajes en
  `.claude/PRPs/prp-service-categories.md`.
- **Estado:** hecho y verificado con Playwright; migración **085** aplicada en producción; 7 commits en `main`
  **sin push** (lo hace Roberto). La web cambia al publicar en Vercel; no requiere APK nueva.
- **Decisiones de Roberto:** un solo nivel (el tipo Álbum/Photobook va en el nombre); categorías opcionales (sin
  categorías todo igual que antes); marcas fijas Recomendado / Más popular / Nuevo / Oferta que **no reordenan**;
  descripción hasta 1000; asignar por categoría = atajo «Marcar todos» (no asignación viva); «Duplicar»; enlace
  por categoría; tarjeta en la landing. **Fuera:** pedidos de fotos sueltas por tamaño y reportes por categoría.

## Espiral Studio cargado (2026-10-14, noche, después del push)

- 5 categorías (Familiares 12, Embarazo 4, Boda 7, Quince 6, Fotos sueltas 1) = 30 servicios transcritos de sus 11
  fotos: nombre «<paquete> (<sesión>)» (los nombres son únicos por negocio), 1 h cada uno (Aicenis debe ajustar),
  descripción por líneas + «Total: N fotos» + «Máximo N cambios de vestuario», marcas como en sus folletos, color por
  categoría, solo **Emilio** asignado (decisión de Roberto). Embarazo solo trae Básico y Revista: preguntarle si hay más.
- Los 2 servicios de prueba quedaron **pausados**, no borrados: la FK de turnos es RESTRICT y ES-0002 (Derwil Medina,
  reserva web, +5359467140) podría ser un cliente real. Borrarlos cuando Roberto lo confirme.
- **Emilio estaba desactivado** (lo hizo alguien desde el panel) y la página quedó sin servicios; Roberto pidió
  reactivarlo. Verificado en producción: categorías, paquetes, marcas, «Más fechas» y horarios de Emilio.

## Dónde vive

- **BD (085):** `services.badge` (CHECK con las 4 claves), nombre de categoría único por negocio
  (`lower(btrim(name))`), FK compuesta `(category_id, organization_id)` con `ON DELETE SET NULL (category_id)`
  (nadie puede usar la categoría de otro negocio), `service_categories` en realtime, y `public_booking_info` devuelve
  `category_id`, `badge` y `categories` (solo activas con servicios listados). La tabla y sus RLS venían de la 010/027.
- **Un solo agrupador:** `utils/group-services.ts` (respeta el orden de entrada; «sin categoría» al final; sin
  categorías = un grupo plano). Lo usan Servicios, «Horario y servicios», «Nuevo turno» y `/book`.
- **Marcas:** `config/service-badges.ts` + `components/services/ServiceBadge.tsx`.
- **Panel:** `CategoriesSheet` (crear, describir, ordenar, copiar enlace, borrar avisando cuántos servicios quedan
  sin categoría), modo «Ordenar» con flechas, «Duplicar este servicio» dentro del formulario (copia también los
  profesionales), precio en la línea de detalles para que el nombre tenga 2 líneas.
- **`/book`:** paso «¿Qué te interesa?» solo con 2+ grupos; `/book?b=<slug>&c=<id>` abre una categoría (Atrás muestra
  la lista; id inválido → lista); «Ver detalle» para descripciones de más de 3 líneas o 140 letras.
- **Offline:** `service_categories` está en `PERSISTED_ROOTS`.

**Why:** un cliente de embarazo no debía recorrer los paquetes de 15; y cargar 29 paquetes a mano era inviable.
**How to apply:** cualquier vista nueva que liste servicios debe pasar por `groupServices` con las categorías activas
y ordenar por `sort_order, name` si los datos no vienen ya ordenados.
