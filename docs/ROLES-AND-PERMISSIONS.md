# Roles y Permisos - TurnoFlash

## 📋 Roles del Sistema

El sistema TurnoFlash tiene 3 roles principales:

1. **Admin** - Administrador del sistema
2. **Owner** - Dueño de una organización/negocio
3. **Staff** - Empleado de una organización

---

## 🔐 Permisos por Rol

### 1. Admin (Administrador)

**Permisos Globales:**

- ✅ Ver y gestionar TODAS las organizaciones
- ✅ Crear nuevas organizaciones
- ✅ Editar organizaciones (licencias, configuración)
- ✅ Desactivar/activar organizaciones
- ✅ Ver y gestionar TODOS los usuarios del sistema
- ✅ Invitar nuevos usuarios al sistema
- ✅ Asignar roles a usuarios
- ✅ Asignar usuarios a organizaciones
- ✅ NO está afectado por licencias

**Acceso a Funcionalidades:**

| Funcionalidad             | Permiso              |
| ------------------------- | -------------------- |
| Dashboard de Admin        | ✅ Completo          |
| Gestión de Organizaciones | ✅ Completo          |
| Gestión de Usuarios       | ✅ Completo          |
| Invitar Usuarios          | ✅ Sí                |
| Ver Turnos                | ✅ De todas las orgs |
| Crear/Editar Turnos       | ✅ En cualquier org  |
| Ver Clientes              | ✅ De todas las orgs |
| Gestionar Clientes        | ✅ En cualquier org  |
| Ver Servicios             | ✅ De todas las orgs |
| Gestionar Servicios       | ✅ En cualquier org  |
| Ver Staff                 | ✅ De todas las orgs |
| Gestionar Staff           | ✅ En cualquier org  |

**Páginas Accesibles:**

- `/dashboard` - Dashboard principal
- `/dashboard/organizations` - Gestión de organizaciones
- `/dashboard/users` - Gestión de usuarios
- `/dashboard/invite` - Invitar usuarios
- `/dashboard/appointments` - Ver/gestionar turnos
- `/dashboard/customers` - Ver/gestionar clientes
- `/dashboard/services` - Ver/gestionar servicios
- `/dashboard/staff` - Ver/gestionar profesionales

---

### 2. Owner (Dueño de Organización)

**Permisos en su Organización:**

- ✅ Ver y gestionar SU organización
- ✅ Ver detalles de licencia
- ✅ Gestionar todos los turnos de su organización
- ✅ Gestionar todos los clientes
- ✅ Crear, editar y eliminar servicios
- ✅ Gestionar profesionales/staff
- ✅ Invitar nuevos usuarios a su organización
- ✅ Ver reportes y estadísticas
- ✅ Configurar horarios y disponibilidad

**Restricciones:**

- ❌ No puede ver otras organizaciones
- ❌ No puede gestionar usuarios globales
- ❌ No puede cambiar su propia licencia
- ⚠️ Está sujeto a las restricciones de licencia

**Acceso a Funcionalidades:**

| Funcionalidad             | Permiso      |
| ------------------------- | ------------ |
| Dashboard de Admin        | ❌ No        |
| Gestión de Organizaciones | ❌ No        |
| Gestión de Usuarios       | ❌ No        |
| Invitar Usuarios          | ✅ A su org  |
| Ver Turnos                | ✅ De su org |
| Crear/Editar Turnos       | ✅ En su org |
| Actualizar Estado Turno   | ✅ Sí        |
| Cancelar Turno            | ✅ Sí        |
| Ver Clientes              | ✅ De su org |
| Crear/Editar Clientes     | ✅ Sí        |
| Eliminar Clientes         | ✅ Sí        |
| Ver Servicios             | ✅ De su org |
| Crear/Editar Servicios    | ✅ Sí        |
| Eliminar Servicios        | ✅ Sí        |
| Ver Staff                 | ✅ De su org |
| Crear/Editar Staff        | ✅ Sí        |
| Eliminar Staff            | ✅ Sí        |

**Páginas Accesibles:**

- `/dashboard` - Dashboard principal con gestión de turnos
- `/dashboard/invite` - Invitar usuarios a su organización
- `/dashboard/appointments` - Gestionar turnos completo
- `/dashboard/customers` - Gestionar clientes completo
- `/dashboard/services` - Gestionar servicios completo
- `/dashboard/staff` - Gestionar profesionales completo

---

### 3. Staff (Empleado)

**Permisos en su Organización:**

- ✅ Ver turnos de su organización
- ✅ Crear nuevos turnos para clientes
- ✅ Actualizar estado de turnos (check-in, completar, etc.)
- ✅ Ver información de clientes
- ✅ Crear y editar clientes
- ✅ Ver servicios disponibles
- ✅ Ver lista de profesionales

**Restricciones:**

- ❌ No puede gestionar servicios (solo ver)
- ❌ No puede gestionar profesionales (solo ver)
- ❌ No puede eliminar turnos
- ❌ No puede eliminar clientes
- ❌ No puede invitar usuarios
- ❌ No puede acceder a configuración avanzada
- ⚠️ Está sujeto a las restricciones de licencia

**Acceso a Funcionalidades:**

| Funcionalidad             | Permiso         |
| ------------------------- | --------------- |
| Dashboard de Admin        | ❌ No           |
| Gestión de Organizaciones | ❌ No           |
| Gestión de Usuarios       | ❌ No           |
| Invitar Usuarios          | ❌ No           |
| Ver Turnos                | ✅ De su org    |
| Crear Turno               | ✅ Sí           |
| Actualizar Estado Turno   | ✅ Sí           |
| Cancelar Turno            | ✅ Sí           |
| Eliminar Turno            | ❌ No           |
| Ver Clientes              | ✅ De su org    |
| Crear Cliente             | ✅ Sí           |
| Editar Cliente            | ✅ Sí           |
| Eliminar Cliente          | ❌ No           |
| Ver Servicios             | ✅ Solo lectura |
| Crear/Editar Servicios    | ❌ No           |
| Ver Staff                 | ✅ Solo lectura |
| Crear/Editar Staff        | ❌ No           |

**Páginas Accesibles:**

- `/dashboard` - Dashboard principal (solo lectura de gestión avanzada)
- `/dashboard/appointments` - Ver y crear turnos
- `/dashboard/customers` - Ver y crear/editar clientes
- `/dashboard/services` - Ver servicios (solo lectura)
- `/dashboard/staff` - Ver profesionales (solo lectura)

---

## 🎯 Resumen Visual de Permisos

### Crear/Editar/Eliminar

|                       | Admin  | Owner  | Staff  |
| --------------------- | :----: | :----: | :----: |
| **Organizaciones**    | ✅✅✅ | ❌❌❌ | ❌❌❌ |
| **Usuarios Globales** | ✅✅✅ | ❌❌❌ | ❌❌❌ |
| **Invitar a Org**     |   ✅   |   ✅   |   ❌   |
| **Turnos**            | ✅✅✅ | ✅✅✅ | ✅✅❌ |
| **Clientes**          | ✅✅✅ | ✅✅✅ | ✅✅❌ |
| **Servicios**         | ✅✅✅ | ✅✅✅ | ✅❌❌ |
| **Staff**             | ✅✅✅ | ✅✅✅ | ✅❌❌ |

**Leyenda:**

- Primer ✅/❌ = Crear
- Segundo ✅/❌ = Editar
- Tercer ✅/❌ = Eliminar

---

## 🔒 Sistema de Licencias

### Afecta a:

- ✅ **Owner** - Completamente afectado
- ✅ **Staff** - Completamente afectado
- ❌ **Admin** - NO afectado (puede gestionar siempre)

### Estados de Licencia:

1. **Sin Licencia** (`no_license`)

   - Acceso completo para desarrollo/prueba
   - Owner y Staff pueden usar el sistema normalmente

2. **Licencia Activa** (`active`)

   - ✅ Acceso completo
   - Todas las funcionalidades disponibles

3. **Por Expirar** (< 7 días)

   - ⚠️ Advertencia visible
   - ✅ Acceso completo
   - Notificación en dashboard

4. **Período de Gracia** (`grace_period`)

   - ⚠️ Advertencia crítica
   - ✅ Acceso completo pero limitado
   - X días de gracia restantes

5. **Licencia Expirada** (`expired`)
   - ❌ Acceso bloqueado para Owner y Staff
   - Solo puede ver pantalla de bloqueo
   - Debe contactar admin para renovar

---

## 📊 Flujos de Trabajo por Rol

### Admin - Configuración Inicial

```
1. Crear organización
   └─> Asignar licencia (fechas inicio/fin)
   └─> Configurar zona horaria

2. Crear usuario Owner
   └─> Asignar rol "owner"
   └─> Asignar a la organización

3. Owner inicia sesión
   └─> Configura su negocio
```

### Owner - Configuración del Negocio

```
1. Crear servicios
   └─> "Corte de pelo" (30min, $500)
   └─> "Manicure" (45min, $600)

2. Agregar profesionales
   └─> María (Estilista)
   └─> Pedro (Barbero)

3. Configurar disponibilidad (próximamente)
   └─> Horarios de atención
   └─> Días laborables

4. Invitar staff
   └─> Enviar invitación
   └─> Staff crea cuenta y se une
```

### Staff - Operación Diaria

```
1. Ver turnos del día
   └─> Dashboard muestra agenda

2. Cliente llega sin turno
   └─> Buscar cliente o crear nuevo
   └─> Crear turno
   └─> Seleccionar servicio y hora

3. Cliente con turno llega
   └─> Hacer check-in
   └─> Marcar "en progreso"
   └─> Completar turno

4. Cliente cancela
   └─> Marcar como cancelado
```

---

## 🛡️ Validaciones de Seguridad

### Frontend

- ✅ Botones/enlaces ocultos según rol
- ✅ Validación de permisos antes de acciones
- ✅ Mensajes de error descriptivos
- ✅ Redirección a página apropiada

### Backend (RLS en Supabase)

- ✅ Row Level Security en todas las tablas
- ✅ Usuarios solo ven datos de su organización
- ✅ Admins pueden ver todo
- ✅ Políticas específicas por tabla

### Ejemplo de Política RLS:

```sql
-- Los usuarios pueden ver turnos de su organización
CREATE POLICY "Users can view appointments of their org"
ON appointments FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id
    FROM user_profiles
    WHERE user_id = auth.uid()
  )
);
```

---

## 🚨 Casos Especiales

### Usuario sin Organización

Si un usuario (no admin) no tiene organización asignada:

- ❌ No puede acceder a gestión de turnos
- ❌ No puede ver clientes, servicios, staff
- ⚠️ Ve mensaje informativo en dashboard
- 📧 Debe solicitar a un admin que lo asigne

### Licencia Expirada

Si la licencia de la organización expira:

- ❌ Owner y Staff quedan bloqueados
- 🔒 Ven pantalla de "Acceso Bloqueado"
- ℹ️ Información sobre la expiración
- 🔑 Solo admin puede renovar

### Cambio de Rol

Si se cambia el rol de un usuario:

- ✅ Los cambios aplican al siguiente login
- ✅ Las páginas se actualizan automáticamente
- ⚠️ Owner → Staff: pierde permisos de gestión
- ⚠️ Staff → Owner: gana permisos completos

---

## 📝 Mejores Prácticas

### Para Admins:

1. Asignar licencias con suficiente antelación
2. Verificar que los owners tengan todo configurado
3. No asignar rol de admin innecesariamente
4. Mantener registro de usuarios inactivos

### Para Owners:

1. Configurar servicios antes de dar turnos
2. Agregar profesionales con información completa
3. Capacitar al staff en el uso del sistema
4. Mantener actualizada la información de clientes

### Para Staff:

1. Verificar información del cliente antes de crear turno
2. Actualizar estados de turnos en tiempo real
3. Agregar notas relevantes en los turnos
4. Reportar problemas al owner

---

## 🔄 Próximas Implementaciones

### Permisos Avanzados (Futuro):

- [ ] Permisos personalizados por usuario
- [ ] Roles custom por organización
- [ ] Permisos a nivel de departamento
- [ ] Historial de acciones por usuario
- [ ] Logs de auditoría detallados
- [ ] 2FA para admins y owners

---

## 📚 Documentación Relacionada

- `QUICK-START.md` - Guía de inicio rápido
- `APPOINTMENT-SYSTEM.md` - Documentación técnica completa
- `IMPLEMENTATION-PROGRESS.md` - Estado de implementación
- `SETUP-LICENCIAS.md` - Sistema de licencias

---

**Última actualización:** 13 de enero de 2026
**Versión del sistema:** 1.0.0
