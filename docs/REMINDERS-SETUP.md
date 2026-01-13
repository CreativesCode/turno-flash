# Sistema de Recordatorios - TurnoFlash

## 📋 Descripción

El sistema de recordatorios permite enviar notificaciones a los clientes antes de sus turnos programados. Hay dos modalidades:

1. **Recordatorios Manuales**: El staff envía recordatorios individualmente vía WhatsApp
2. **Recordatorios Automáticos**: Edge Function que procesa recordatorios automáticamente

---

## 🚀 Recordatorios Manuales

### Cómo usar

1. Ve a **Dashboard > Recordatorios** (`/dashboard/reminders`)
2. Selecciona el día a revisar (Hoy, Mañana, 2 días, 3 días)
3. Verás la lista de turnos pendientes de recordatorio
4. Haz clic en **"WhatsApp"** para enviar el recordatorio

### Flujo

```
1. Staff abre página de Recordatorios
2. Selecciona turno a recordar
3. Clic en "WhatsApp"
4. Se abre WhatsApp Web/App con mensaje pre-escrito
5. Staff envía el mensaje
6. El turno se marca como "Recordado" en el sistema
```

### Mensaje de ejemplo

```
🗓️ *Recordatorio de Turno*

Hola María! 👋

Te recordamos que tienes un turno programado:

📅 *Fecha:* martes 14 de enero
⏰ *Hora:* 15:00
💇 *Servicio:* Corte de pelo
👤 *Con:* Pedro

Por favor confirma tu asistencia respondiendo:
✅ *SÍ* - Confirmo mi turno
❌ *NO* - No podré asistir

¡Te esperamos! 🙌
```

---

## ⚡ Recordatorios Automáticos

### Edge Function

Se incluye una Edge Function en `supabase/functions/send-reminders/` que puede:

- Obtener turnos pendientes de recordatorio
- Generar mensajes personalizados
- Registrar en `reminder_logs`
- Actualizar estado del turno a "reminded"

### Desplegar la función

```bash
# Desde la raíz del proyecto
supabase functions deploy send-reminders
```

### Invocar manualmente

```bash
# Recordatorios para mañana (default)
curl -X POST 'https://your-project.supabase.co/functions/v1/send-reminders' \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json"

# Recordatorios para fecha específica
curl -X POST 'https://your-project.supabase.co/functions/v1/send-reminders' \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"date": "2026-01-15"}'

# Recordatorios para organización específica
curl -X POST 'https://your-project.supabase.co/functions/v1/send-reminders' \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"organization_id": "uuid-de-organizacion"}'
```

### Configurar Cron Job

Para ejecutar automáticamente, configura un cron job usando:

#### Opción 1: Supabase pg_cron

```sql
-- Ejecutar todos los días a las 9:00 AM
SELECT cron.schedule(
  'send-daily-reminders',
  '0 9 * * *',
  $$
  SELECT net.http_post(
    url := 'https://your-project.supabase.co/functions/v1/send-reminders',
    headers := '{"Authorization": "Bearer YOUR_SERVICE_KEY", "Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  )
  $$
);
```

#### Opción 2: GitHub Actions

```yaml
# .github/workflows/send-reminders.yml
name: Send Daily Reminders

on:
  schedule:
    - cron: "0 12 * * *" # 9:00 AM Argentina (UTC-3)
  workflow_dispatch: # Permite ejecutar manualmente

jobs:
  send-reminders:
    runs-on: ubuntu-latest
    steps:
      - name: Send Reminders
        run: |
          curl -X POST '${{ secrets.SUPABASE_URL }}/functions/v1/send-reminders' \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_SERVICE_KEY }}" \
            -H "Content-Type: application/json"
```

#### Opción 3: Vercel Cron

```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/send-reminders",
      "schedule": "0 12 * * *"
    }
  ]
}
```

---

## 🔧 Integración con WhatsApp Business API

Para envío automático real de mensajes, necesitas integrar con:

### Twilio

```typescript
// Ejemplo de integración
import twilio from "twilio";

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

async function sendWhatsAppMessage(phone: string, message: string) {
  return client.messages.create({
    body: message,
    from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
    to: `whatsapp:${phone}`,
  });
}
```

### Variables de entorno necesarias

```env
# Twilio
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_WHATSAPP_NUMBER=+14155238886
```

### Costo estimado

- Twilio WhatsApp: ~$0.005 por mensaje
- Para 100 mensajes/día: ~$15/mes

---

## 📊 Tabla de Logs

Los recordatorios se registran en `reminder_logs`:

| Campo           | Tipo      | Descripción                 |
| --------------- | --------- | --------------------------- |
| id              | UUID      | ID único                    |
| appointment_id  | UUID      | Turno relacionado           |
| reminder_type   | TEXT      | 'manual' o 'automatic'      |
| method          | TEXT      | 'whatsapp', 'sms', 'email'  |
| message_content | TEXT      | Contenido del mensaje       |
| status          | TEXT      | 'pending', 'sent', 'failed' |
| scheduled_for   | TIMESTAMP | Fecha programada            |
| sent_at         | TIMESTAMP | Fecha de envío              |
| sent_by         | UUID      | Usuario que envió (manual)  |
| error_message   | TEXT      | Error si falló              |

### Consultar logs

```sql
-- Recordatorios de hoy
SELECT * FROM reminder_logs
WHERE DATE(sent_at) = CURRENT_DATE
ORDER BY sent_at DESC;

-- Recordatorios fallidos
SELECT * FROM reminder_logs
WHERE status = 'failed'
ORDER BY created_at DESC;

-- Estadísticas por organización
SELECT
  o.name as organization,
  COUNT(*) as total_reminders,
  COUNT(*) FILTER (WHERE rl.status = 'sent') as sent,
  COUNT(*) FILTER (WHERE rl.status = 'failed') as failed
FROM reminder_logs rl
JOIN appointments a ON rl.appointment_id = a.id
JOIN organizations o ON a.organization_id = o.id
GROUP BY o.id, o.name;
```

---

## 🔄 Estados del Turno

Flujo de estados con recordatorios:

```
pending → confirmed → reminded → client_confirmed → checked_in → completed
   │          │          │              │
   │          │          │              └─→ cancelled
   │          │          └─→ no_show
   │          └─→ cancelled
   └─→ cancelled
```

### Descripción de estados

| Estado           | Descripción                          |
| ---------------- | ------------------------------------ |
| pending          | Turno creado, esperando confirmación |
| confirmed        | Turno confirmado por el negocio      |
| **reminded**     | Recordatorio enviado al cliente      |
| client_confirmed | Cliente confirmó asistencia          |
| checked_in       | Cliente llegó al local               |
| in_progress      | Servicio en curso                    |
| completed        | Servicio completado                  |
| cancelled        | Turno cancelado                      |
| no_show          | Cliente no se presentó               |

---

## ✅ Mejores Prácticas

### Timing

- **24 horas antes**: Enviar recordatorio principal
- **2-4 horas antes**: Recordatorio final (opcional)
- **Horario**: Entre 9:00 AM y 8:00 PM

### Contenido

- ✅ Nombre del cliente
- ✅ Fecha y hora clara
- ✅ Servicio programado
- ✅ Profesional asignado (si aplica)
- ✅ Instrucciones de confirmación
- ✅ Opción para cancelar/reprogramar

### No hacer

- ❌ Enviar muy temprano en la mañana
- ❌ Enviar muy tarde en la noche
- ❌ Múltiples recordatorios el mismo día
- ❌ Mensajes muy largos
- ❌ Forzar respuesta inmediata

---

## 🔐 Permisos

| Rol   | Puede enviar recordatorios |
| ----- | -------------------------- |
| Admin | ✅ Sí                      |
| Owner | ✅ Sí                      |
| Staff | ✅ Sí                      |

---

## 📱 Acceso

La página de recordatorios está disponible en:

```
/dashboard/reminders
```

También se puede acceder desde el Dashboard principal haciendo clic en la tarjeta **"Recordatorios"** (rosa/fucsia).

---

## 🐛 Troubleshooting

### El recordatorio no se envía

1. Verifica que el número de teléfono tenga formato correcto
2. Asegúrate de que WhatsApp esté instalado
3. Revisa que el turno no esté ya "reminded" o "cancelled"

### El mensaje no se ve bien

1. WhatsApp Web puede tener diferentes formatos
2. Verifica que los emojis se muestren correctamente
3. Prueba en diferentes dispositivos

### Los logs no se guardan

1. Verifica permisos de la tabla `reminder_logs`
2. Revisa las políticas RLS
3. Confirma que el usuario tenga `organization_id`

---

## 📚 Documentación Relacionada

- `QUICK-START.md` - Inicio rápido
- `APPOINTMENT-SYSTEM.md` - Sistema de turnos
- `ROLES-AND-PERMISSIONS.md` - Permisos

---

**Última actualización:** 13 de enero de 2026
