# Flujo de Estados de Turnos - TurnoFlash

## 📊 Estados Disponibles

El sistema tiene los siguientes estados para los turnos:

| Estado             | Icono | Descripción                                                        |
| ------------------ | ----- | ------------------------------------------------------------------ |
| `pending`          | ⏳    | Pendiente de aprobación (cuando el servicio requiere confirmación) |
| `confirmed`        | ✓     | Confirmado por el staff                                            |
| `reminded`         | 🔔    | Recordatorio enviado al cliente                                    |
| `client_confirmed` | 👤    | Cliente confirmó su asistencia                                     |
| `checked_in`       | 📍    | Cliente llegó al local (check-in)                                  |
| `in_progress`      | 🚀    | Servicio en progreso                                               |
| `completed`        | ✅    | Servicio completado                                                |
| `cancelled`        | ❌    | Turno cancelado                                                    |
| `no_show`          | ⚠️    | Cliente no se presentó                                             |
| `rescheduled`      | 🔄    | Turno reagendado (futuro)                                          |

---

## 🔄 Flujo Normal de Estados

### Camino Feliz (Happy Path)

```
1. CREACIÓN
   ├─ Servicio requiere aprobación → "pending"
   └─ Servicio NO requiere aprobación → "confirmed"

2. CONFIRMACIÓN DEL STAFF (si estaba en pending)
   "pending" → [Staff confirma] → "confirmed"

3. ENVÍO DE RECORDATORIO
   "confirmed" → [Staff envía recordatorio] → "reminded"

4. CONFIRMACIÓN DEL CLIENTE
   "reminded" → [Staff marca que cliente confirmó] → "client_confirmed"

5. CHECK-IN (Cliente llega)
   "client_confirmed" → [Staff hace check-in] → "checked_in"

6. INICIO DEL SERVICIO
   "checked_in" → [Staff inicia servicio] → "in_progress"

7. COMPLETAR
   "in_progress" → [Staff completa servicio] → "completed"
```

### Estados Finales

Los siguientes estados son **finales** (no se pueden cambiar después):

- ✅ `completed` - Servicio completado exitosamente
- ❌ `cancelled` - Turno cancelado
- ⚠️ `no_show` - Cliente no se presentó

---

## 🎯 Botones de Acción por Estado

### Estado: `pending` (⏳ Pendiente)

**Acciones disponibles:**

- ✓ **Confirmar** → `confirmed`
- 👤 **Cliente Confirmó** → `client_confirmed` (saltar paso)
- 📍 **Check-in** → `checked_in` (saltar pasos)
- 🚀 **Iniciar Servicio** → `in_progress` (saltar pasos)
- ✅ **Completar** → `completed` (saltar todos los pasos)
- 🔔 **Enviar Recordatorio** → `reminded`
- ⚠️ **No se presentó** → `no_show`
- ❌ **Cancelar** → `cancelled`

---

### Estado: `confirmed` (✓ Confirmado)

**Acciones disponibles:**

- 👤 **Cliente Confirmó** → `client_confirmed`
- 📍 **Check-in** → `checked_in`
- 🚀 **Iniciar Servicio** → `in_progress` (saltar paso)
- ✅ **Completar** → `completed` (saltar pasos)
- 🔔 **Enviar Recordatorio** → `reminded`
- ⚠️ **No se presentó** → `no_show`
- ❌ **Cancelar** → `cancelled`

---

### Estado: `reminded` (🔔 Recordado)

**Acciones disponibles:**

- 👤 **Cliente Confirmó** → `client_confirmed`
- 📍 **Check-in** → `checked_in`
- 🚀 **Iniciar Servicio** → `in_progress` (saltar paso)
- ✅ **Completar** → `completed` (saltar pasos)
- 🔔 **Enviar Recordatorio** → vuelve a enviar
- ⚠️ **No se presentó** → `no_show`
- ❌ **Cancelar** → `cancelled`

---

### Estado: `client_confirmed` (👤 Cliente Confirmó)

**Acciones disponibles:**

- 📍 **Check-in** → `checked_in`
- 🚀 **Iniciar Servicio** → `in_progress` (saltar paso)
- ✅ **Completar** → `completed` (saltar pasos)
- 🔔 **Enviar Recordatorio** → vuelve a enviar
- ⚠️ **No se presentó** → `no_show`
- ❌ **Cancelar** → `cancelled`

---

### Estado: `checked_in` (📍 Check-in)

**Acciones disponibles:**

- 🚀 **Iniciar Servicio** → `in_progress`
- ✅ **Completar** → `completed` (saltar paso)
- ⚠️ **No se presentó** → `no_show`
- ❌ **Cancelar** → `cancelled`

---

### Estado: `in_progress` (🚀 En Progreso)

**Acciones disponibles:**

- ✅ **Completar** → `completed`
- ⚠️ **No se presentó** → `no_show` (si el cliente se fue)
- ❌ **Cancelar** → `cancelled` (si hubo algún problema)

---

### Estados Finales

No hay acciones disponibles para:

- ✅ `completed` (Completado)
- ❌ `cancelled` (Cancelado)
- ⚠️ `no_show` (No Asistió)

---

## 🚀 Flexibilidad del Sistema

### Saltos de Estado Permitidos

El sistema permite **saltar estados** para cubrir casos donde el staff olvidó marcar un paso anterior:

**Ejemplos:**

1. **Olvidé hacer check-in, pero ya empecé el servicio**

   ```
   "confirmed" → [Iniciar Servicio] → "in_progress" ✓
   ```

2. **Cliente llegó pero olvidé el check-in, ahora ya terminé**

   ```
   "confirmed" → [Completar] → "completed" ✓
   ```

3. **Cliente confirmó por teléfono, lo marco directamente**

   ```
   "confirmed" → [Cliente Confirmó] → "client_confirmed" ✓
   ```

4. **Cliente llegó sin confirmar antes**
   ```
   "pending" → [Check-in] → "checked_in" ✓
   ```

### Estados que NO se pueden cambiar

Una vez que un turno está en un **estado final**, no se puede cambiar:

- ✅ Completado
- ❌ Cancelado
- ⚠️ No Asistió

Si necesitas modificarlo, deberías:

1. Crear un nuevo turno
2. O tener un sistema de "reabrir turno" (por implementar)

---

## 💡 Casos de Uso Comunes

### Caso 1: Flujo Completo Normal

```
1. Se crea turno → "confirmed"
2. Se envía recordatorio → "reminded"
3. Cliente confirma por WhatsApp → "client_confirmed"
4. Cliente llega → "checked_in"
5. Se inicia el servicio → "in_progress"
6. Se completa el servicio → "completed" ✓
```

### Caso 2: Cliente Llegó Sin Avisar

```
1. Se crea turno → "confirmed"
2. Cliente aparece sin confirmar → "checked_in"
3. Se inicia servicio → "in_progress"
4. Se completa → "completed" ✓
```

### Caso 3: Cliente No Se Presentó

```
1. Se crea turno → "confirmed"
2. Se envía recordatorio → "reminded"
3. Cliente nunca llegó → "no_show" ⚠️
```

### Caso 4: Staff Olvidó Marcar Check-in

```
1. Se crea turno → "confirmed"
2. Cliente llegó (olvidé marcar)
3. Inicié el servicio → "in_progress"
4. Completé → "completed" ✓
```

### Caso 5: Servicio Requiere Aprobación

```
1. Cliente solicita turno online → "pending"
2. Staff revisa y aprueba → "confirmed"
3. ... (continúa flujo normal)
```

### Caso 6: Cancelación Anticipada

```
1. Se crea turno → "confirmed"
2. Cliente cancela por teléfono → "cancelled" ❌
```

---

## 🎨 Colores de Estados

Para identificación visual rápida:

- 🟡 **Amarillo** (`pending`) - Requiere atención
- 🟢 **Verde** (`confirmed`) - Confirmado, todo bien
- 💗 **Rosa** (`reminded`) - Recordatorio enviado
- 🔵 **Teal** (`client_confirmed`) - Cliente confirmó
- 🟣 **Morado** (`checked_in`, `in_progress`) - En proceso
- 🔵 **Azul** (`completed`) - Completado exitosamente
- 🔴 **Rojo** (`cancelled`) - Cancelado
- 🟠 **Naranja** (`no_show`) - No se presentó

---

## 📱 Acciones Disponibles

### En la Vista de Lista/Calendario

En la vista compacta se muestran solo las **acciones principales siguientes**:

- Botón del siguiente estado lógico
- Botón "No vino"
- Botón "Cancelar"

### En el Modal de Detalle

Se muestran **todas las acciones posibles**:

- Todos los estados a los que puede avanzar
- Enviar recordatorio (si aplica)
- Marcar como "No se presentó"
- Cancelar turno

---

## 🔔 Recordatorios

Los recordatorios se pueden enviar desde estos estados:

- ⏳ `pending`
- ✓ `confirmed`
- 🔔 `reminded` (reenviar)
- 👤 `client_confirmed` (reenviar)

**¿Qué hace el botón "Enviar Recordatorio"?**

1. Registra el envío en `reminder_logs`
2. Actualiza el estado del turno a `reminded`
3. Abre WhatsApp con un mensaje pre-escrito
4. El staff envía el mensaje manualmente

**Mensaje de ejemplo:**

```
🗓️ Recordatorio de Turno

Hola Juan! 👋

Te recordamos que tienes un turno programado:

📅 Fecha: martes 14 de enero
⏰ Hora: 15:00
💇 Servicio: Corte de pelo
👤 Con: María

Por favor confirma tu asistencia respondiendo:
✅ SÍ - Confirmo mi turno
❌ NO - No podré asistir

¡Te esperamos! 🙌
```

---

## 📊 Estadísticas

Los turnos en diferentes estados afectan las estadísticas:

- **Turnos Pendientes**: `pending`
- **Turnos Confirmados**: `confirmed`, `reminded`, `client_confirmed`
- **En Progreso**: `checked_in`, `in_progress`
- **Completados**: `completed`
- **Cancelados**: `cancelled`, `no_show`

---

## 🎯 Mejores Prácticas

1. **Confirma siempre los turnos pendientes** antes de que sea la fecha
2. **Envía recordatorios** 24h antes para reducir no-shows
3. **Haz check-in** cuando el cliente llega para tener control de tiempos
4. **Marca "Iniciar servicio"** para saber cuánto duró realmente
5. **Completa el turno** cuando termines para las estadísticas
6. **Marca "No se presentó"** en vez de cancelar si el cliente no llegó

---

## 🔮 Futuras Mejoras

Posibles mejoras al sistema:

1. **Confirmación automática del cliente**: Link público para confirmar
2. **Recordatorios automáticos**: Cron job que envíe recordatorios
3. **Auto check-in**: QR code en el local
4. **Detección automática de no-show**: Si pasó la hora y no hay check-in
5. **Reagendación**: Sistema completo de reprogramación
6. **Historial de cambios**: Log de cambios de estado
7. **Notificaciones push**: Alertas al staff cuando cliente confirma

---

## ❓ Preguntas Frecuentes

**P: ¿Puedo volver a un estado anterior?**
R: No, solo puedes avanzar estados. Si te equivocaste, tendrías que crear un nuevo turno.

**P: ¿Qué hago si me olvidé de marcar check-in?**
R: Puedes saltar directamente a "Iniciar Servicio" o "Completar". El sistema lo permite.

**P: ¿Cuándo uso "No se presentó" vs "Cancelar"?**
R:

- **No se presentó**: Cliente nunca llegó y no avisó
- **Cancelar**: Cliente canceló con anticipación o tú lo cancelaste

**P: ¿Puedo reenviar un recordatorio?**
R: Sí, el botón está disponible incluso después de enviarlo una vez.

**P: ¿Qué pasa si el cliente confirma por teléfono?**
R: Usa el botón "Cliente Confirmó" para marcarlo manualmente.

**P: ¿Los recordatorios son automáticos?**
R: Por defecto son manuales. Puedes configurar recordatorios automáticos con la Edge Function.

---

## 📚 Documentos Relacionados

- [Configuración de Recordatorios](./REMINDERS-SETUP.md)
- [Sistema de Turnos](./APPOINTMENT-SYSTEM.md)
- [Guía de Inicio Rápido](./QUICK-START.md)
