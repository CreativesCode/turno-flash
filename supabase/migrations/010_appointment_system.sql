-- Migración: Sistema de Gestión de Turnos para Clientes
-- TurnoFlash - Sistema de appointments/citas
-- Ejecutar después de 009_update_handle_new_user_for_org_assignment.sql

-- ============================================
-- 1. ENUMS
-- ============================================

-- Estado de turnos
CREATE TYPE appointment_status AS ENUM (
  'pending',           -- Pendiente de aprobación
  'confirmed',         -- Confirmado
  'reminded',          -- Recordatorio enviado
  'client_confirmed',  -- Cliente confirmó asistencia
  'checked_in',        -- Cliente llegó
  'in_progress',       -- Servicio en progreso
  'completed',         -- Completado
  'cancelled',         -- Cancelado
  'no_show',          -- Cliente no se presentó
  'rescheduled'       -- Reagendado
);

-- Fuente de la reserva
CREATE TYPE appointment_source AS ENUM (
  'web',              -- Reserva online
  'whatsapp',         -- Por WhatsApp
  'phone',            -- Por teléfono
  'walk_in',          -- Cliente llegó directamente
  'admin'             -- Creado manualmente por staff
);

-- Método de recordatorio
CREATE TYPE reminder_method AS ENUM (
  'whatsapp',
  'sms',
  'email',
  'call',
  'push'
);

-- Tipo de excepción de horario
CREATE TYPE schedule_exception_type AS ENUM (
  'time_off',         -- Tiempo libre
  'holiday',          -- Día festivo
  'special_hours',    -- Horario especial
  'blocked'           -- Bloqueado
);

-- Tipo de solicitud de tiempo libre
CREATE TYPE time_off_type AS ENUM (
  'vacation',
  'sick_leave',
  'personal',
  'unpaid',
  'other'
);

-- Estado de solicitudes
CREATE TYPE request_status AS ENUM (
  'pending',
  'approved',
  'rejected',
  'cancelled',
  'expired'
);

-- Nivel de experiencia
CREATE TYPE proficiency_level AS ENUM (
  'junior',
  'intermediate',
  'senior',
  'expert'
);

-- Estado de lista de espera
CREATE TYPE waitlist_status AS ENUM (
  'active',
  'notified',
  'booked',
  'expired',
  'cancelled'
);

COMMENT ON TYPE appointment_status IS 'Estados posibles de un turno/cita';
COMMENT ON TYPE appointment_source IS 'Fuente de origen de la reserva';
COMMENT ON TYPE reminder_method IS 'Método de envío de recordatorios';

-- ============================================
-- 2. TABLA: service_categories (Categorías de Servicios)
-- ============================================

CREATE TABLE public.service_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  color TEXT DEFAULT '#3B82F6',
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_service_categories_org ON public.service_categories(organization_id);

COMMENT ON TABLE public.service_categories IS 'Categorías para agrupar servicios (ej: Cortes, Color, Tratamientos)';

-- ============================================
-- 3. TABLA: services (Servicios)
-- ============================================

CREATE TABLE public.services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.service_categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  duration_minutes INTEGER NOT NULL DEFAULT 30,
  buffer_time_minutes INTEGER DEFAULT 0,
  price DECIMAL(10, 2),
  currency TEXT DEFAULT 'USD',
  color TEXT DEFAULT '#3B82F6',
  is_active BOOLEAN DEFAULT true,
  requires_approval BOOLEAN DEFAULT false,
  max_advance_booking_days INTEGER DEFAULT 60,
  min_advance_booking_hours INTEGER DEFAULT 2,
  available_for_online_booking BOOLEAN DEFAULT true,
  image_url TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_services_org ON public.services(organization_id);
CREATE INDEX idx_services_category ON public.services(category_id);
CREATE INDEX idx_services_active ON public.services(organization_id, is_active);

COMMENT ON TABLE public.services IS 'Servicios que ofrece el negocio (ej: Corte de pelo, Manicure)';
COMMENT ON COLUMN public.services.duration_minutes IS 'Duración estimada del servicio en minutos';
COMMENT ON COLUMN public.services.buffer_time_minutes IS 'Tiempo de buffer después del servicio';
COMMENT ON COLUMN public.services.requires_approval IS 'Si requiere aprobación manual del dueño/staff';

-- ============================================
-- 4. TABLA: staff_members (Personal/Profesionales)
-- ============================================

CREATE TABLE public.staff_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  nickname TEXT,
  email TEXT,
  phone TEXT,
  photo_url TEXT,
  color TEXT DEFAULT '#3B82F6',
  bio TEXT,
  specialties TEXT[],
  is_active BOOLEAN DEFAULT true,
  is_bookable BOOLEAN DEFAULT true,
  accepts_online_bookings BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_staff_org ON public.staff_members(organization_id);
CREATE INDEX idx_staff_user ON public.staff_members(user_id);
CREATE INDEX idx_staff_active ON public.staff_members(organization_id, is_active);

COMMENT ON TABLE public.staff_members IS 'Personal/profesionales que atienden a los clientes';
COMMENT ON COLUMN public.staff_members.user_id IS 'Usuario del sistema (nullable si es solo un recurso)';
COMMENT ON COLUMN public.staff_members.is_bookable IS 'Si se pueden hacer reservas con esta persona';

-- ============================================
-- 5. TABLA: staff_services (Relación Staff-Servicios)
-- ============================================

CREATE TABLE public.staff_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES public.staff_members(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  proficiency_level proficiency_level DEFAULT 'intermediate',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(staff_id, service_id)
);

CREATE INDEX idx_staff_services_staff ON public.staff_services(staff_id);
CREATE INDEX idx_staff_services_service ON public.staff_services(service_id);

COMMENT ON TABLE public.staff_services IS 'Relación muchos a muchos entre staff y servicios que pueden realizar';

-- ============================================
-- 6. TABLA: staff_availability (Disponibilidad de Staff)
-- ============================================

CREATE TABLE public.staff_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES public.staff_members(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_available BOOLEAN DEFAULT true,
  effective_from DATE,
  effective_until DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_staff_availability_staff ON public.staff_availability(staff_id);
CREATE INDEX idx_staff_availability_day ON public.staff_availability(staff_id, day_of_week);

COMMENT ON TABLE public.staff_availability IS 'Horarios de disponibilidad del staff por día de la semana';
COMMENT ON COLUMN public.staff_availability.day_of_week IS '0=Domingo, 1=Lunes, ..., 6=Sábado';

-- ============================================
-- 7. TABLA: staff_exceptions (Excepciones de Horario)
-- ============================================

CREATE TABLE public.staff_exceptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID REFERENCES public.staff_members(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  exception_type schedule_exception_type NOT NULL,
  start_datetime TIMESTAMPTZ NOT NULL,
  end_datetime TIMESTAMPTZ NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  is_recurring BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_staff_exceptions_staff ON public.staff_exceptions(staff_id);
CREATE INDEX idx_staff_exceptions_org ON public.staff_exceptions(organization_id);
CREATE INDEX idx_staff_exceptions_dates ON public.staff_exceptions(start_datetime, end_datetime);

COMMENT ON TABLE public.staff_exceptions IS 'Excepciones de horario (vacaciones, días festivos, bloqueos)';
COMMENT ON COLUMN public.staff_exceptions.staff_id IS 'Si es NULL aplica a toda la organización';

-- ============================================
-- 8. TABLA: customers (Clientes)
-- ============================================

CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT NOT NULL,
  phone_country_code TEXT DEFAULT '+1',
  whatsapp_number TEXT,
  date_of_birth DATE,
  gender TEXT,
  notes TEXT,
  tags TEXT[],
  photo_url TEXT,
  preferred_staff_id UUID REFERENCES public.staff_members(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  total_appointments INTEGER DEFAULT 0,
  missed_appointments INTEGER DEFAULT 0,
  last_appointment_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

CREATE INDEX idx_customers_org ON public.customers(organization_id);
CREATE INDEX idx_customers_phone ON public.customers(organization_id, phone);
CREATE INDEX idx_customers_email ON public.customers(organization_id, email);
CREATE INDEX idx_customers_name ON public.customers(organization_id, first_name, last_name);

COMMENT ON TABLE public.customers IS 'Clientes del negocio que solicitan turnos';
COMMENT ON COLUMN public.customers.total_appointments IS 'Total de turnos históricos';
COMMENT ON COLUMN public.customers.missed_appointments IS 'Contador de no-shows';

-- ============================================
-- 9. TABLA: appointments (Turnos/Citas)
-- ============================================

CREATE TABLE public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  appointment_number TEXT,
  
  -- Relaciones
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE RESTRICT,
  staff_id UUID REFERENCES public.staff_members(id) ON DELETE SET NULL,
  
  -- Fecha y hora
  appointment_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  timezone TEXT DEFAULT 'UTC',
  actual_start_time TIMESTAMPTZ,
  actual_end_time TIMESTAMPTZ,
  
  -- Estado
  status appointment_status DEFAULT 'confirmed',
  source appointment_source DEFAULT 'admin',
  
  -- Comunicación
  confirmation_sent_at TIMESTAMPTZ,
  reminder_sent_at TIMESTAMPTZ,
  client_confirmed_at TIMESTAMPTZ,
  reminder_method reminder_method,
  
  -- Información adicional
  notes TEXT,
  internal_notes TEXT,
  cancellation_reason TEXT,
  cancelled_by UUID REFERENCES auth.users(id),
  cancelled_at TIMESTAMPTZ,
  
  -- Financiero
  price_charged DECIMAL(10, 2),
  was_paid BOOLEAN DEFAULT false,
  payment_method TEXT,
  
  -- Feedback
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  feedback TEXT,
  
  -- Auditoría
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_appointments_org_date ON public.appointments(organization_id, appointment_date);
CREATE INDEX idx_appointments_customer ON public.appointments(customer_id);
CREATE INDEX idx_appointments_staff_date ON public.appointments(staff_id, appointment_date);
CREATE INDEX idx_appointments_status ON public.appointments(organization_id, status);
CREATE INDEX idx_appointments_datetime ON public.appointments(appointment_date, start_time);

COMMENT ON TABLE public.appointments IS 'Turnos/citas de los clientes';
COMMENT ON COLUMN public.appointments.appointment_number IS 'Número de turno único (ej: T-001)';
COMMENT ON COLUMN public.appointments.actual_start_time IS 'Hora real cuando empezó el servicio';
COMMENT ON COLUMN public.appointments.internal_notes IS 'Notas que solo ve el staff';

-- ============================================
-- 10. TABLA: appointment_requests (Solicitudes de Turno)
-- ============================================

CREATE TABLE public.appointment_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  preferred_staff_id UUID REFERENCES public.staff_members(id) ON DELETE SET NULL,
  preferred_date DATE NOT NULL,
  preferred_time TIME NOT NULL,
  alternative_dates JSONB,
  notes TEXT,
  status request_status DEFAULT 'pending',
  source TEXT NOT NULL,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ
);

CREATE INDEX idx_appointment_requests_org ON public.appointment_requests(organization_id);
CREATE INDEX idx_appointment_requests_status ON public.appointment_requests(organization_id, status);

COMMENT ON TABLE public.appointment_requests IS 'Solicitudes de turno pendientes de aprobación';

-- ============================================
-- 11. TABLA: business_settings (Configuración del Negocio)
-- ============================================

CREATE TABLE public.business_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL UNIQUE REFERENCES public.organizations(id) ON DELETE CASCADE,
  
  -- Configuración general
  business_hours_config JSONB,
  slot_duration_minutes INTEGER DEFAULT 30,
  
  -- Reservas online
  allow_online_booking BOOLEAN DEFAULT true,
  require_approval BOOLEAN DEFAULT false,
  max_advance_booking_days INTEGER DEFAULT 60,
  min_advance_booking_hours INTEGER DEFAULT 2,
  allow_same_day_booking BOOLEAN DEFAULT true,
  cancellation_policy_hours INTEGER DEFAULT 24,
  
  -- Features
  enable_waitlist BOOLEAN DEFAULT true,
  enable_reminders BOOLEAN DEFAULT true,
  reminder_settings JSONB,
  
  -- Página de reservas
  booking_page_url TEXT,
  booking_page_enabled BOOLEAN DEFAULT false,
  
  -- WhatsApp
  whatsapp_integration_enabled BOOLEAN DEFAULT false,
  whatsapp_bot_number TEXT,
  
  -- UI
  default_appointment_color TEXT DEFAULT '#3B82F6',
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_business_settings_org ON public.business_settings(organization_id);

COMMENT ON TABLE public.business_settings IS 'Configuración específica del negocio para gestión de turnos';

-- ============================================
-- 12. TABLA: waitlist (Lista de Espera)
-- ============================================

CREATE TABLE public.waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  preferred_staff_id UUID REFERENCES public.staff_members(id) ON DELETE SET NULL,
  preferred_date DATE NOT NULL,
  preferred_time TIME,
  flexible_dates BOOLEAN DEFAULT false,
  flexible_times BOOLEAN DEFAULT false,
  notes TEXT,
  status waitlist_status DEFAULT 'active',
  priority INTEGER DEFAULT 0,
  notified_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_waitlist_org ON public.waitlist(organization_id);
CREATE INDEX idx_waitlist_status ON public.waitlist(organization_id, status);
CREATE INDEX idx_waitlist_date ON public.waitlist(preferred_date);

COMMENT ON TABLE public.waitlist IS 'Lista de espera cuando no hay disponibilidad';

-- ============================================
-- 13. TABLA: customer_history (Historial de Cliente)
-- ============================================

CREATE TABLE public.customer_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  description TEXT NOT NULL,
  metadata JSONB,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_customer_history_customer ON public.customer_history(customer_id);
CREATE INDEX idx_customer_history_created ON public.customer_history(created_at);

COMMENT ON TABLE public.customer_history IS 'Historial de interacciones y eventos del cliente';

-- ============================================
-- 14. TABLA: notifications (Notificaciones)
-- ============================================

CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  action_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_notifications_user ON public.notifications(user_id, is_read);
CREATE INDEX idx_notifications_org ON public.notifications(organization_id);

COMMENT ON TABLE public.notifications IS 'Notificaciones para el staff del sistema';

-- ============================================
-- 15. TABLA: reminder_logs (Log de Recordatorios)
-- ============================================

CREATE TABLE public.reminder_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  reminder_type TEXT NOT NULL,
  method reminder_method NOT NULL,
  message_content TEXT,
  sent_at TIMESTAMPTZ DEFAULT now(),
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'sent',
  error_message TEXT
);

CREATE INDEX idx_reminder_logs_appointment ON public.reminder_logs(appointment_id);
CREATE INDEX idx_reminder_logs_sent ON public.reminder_logs(sent_at);

COMMENT ON TABLE public.reminder_logs IS 'Registro de recordatorios enviados';

-- ============================================
-- 16. FUNCIONES AUXILIARES
-- ============================================

-- Función para generar número de turno
CREATE OR REPLACE FUNCTION generate_appointment_number(org_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  next_number INTEGER;
  prefix TEXT;
BEGIN
  -- Obtener el siguiente número para esta organización
  SELECT COALESCE(MAX(CAST(SUBSTRING(appointment_number FROM '\d+') AS INTEGER)), 0) + 1
  INTO next_number
  FROM appointments
  WHERE organization_id = org_id;
  
  -- Generar el número con formato T-001
  prefix := 'T-';
  RETURN prefix || LPAD(next_number::TEXT, 4, '0');
END;
$$;

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para updated_at
CREATE TRIGGER update_service_categories_updated_at BEFORE UPDATE ON service_categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_services_updated_at BEFORE UPDATE ON services
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_staff_members_updated_at BEFORE UPDATE ON staff_members
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_staff_availability_updated_at BEFORE UPDATE ON staff_availability
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_staff_exceptions_updated_at BEFORE UPDATE ON staff_exceptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON appointments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_business_settings_updated_at BEFORE UPDATE ON business_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger para generar appointment_number automáticamente
CREATE OR REPLACE FUNCTION set_appointment_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.appointment_number IS NULL THEN
    NEW.appointment_number := generate_appointment_number(NEW.organization_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_appointment_number_trigger
BEFORE INSERT ON appointments
FOR EACH ROW EXECUTE FUNCTION set_appointment_number();

-- Trigger para actualizar estadísticas de cliente
CREATE OR REPLACE FUNCTION update_customer_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.status != NEW.status) THEN
    -- Actualizar total de appointments
    UPDATE customers
    SET 
      total_appointments = (
        SELECT COUNT(*) 
        FROM appointments 
        WHERE customer_id = NEW.customer_id 
          AND status IN ('completed', 'no_show')
      ),
      missed_appointments = (
        SELECT COUNT(*) 
        FROM appointments 
        WHERE customer_id = NEW.customer_id 
          AND status = 'no_show'
      ),
      last_appointment_date = (
        SELECT MAX(appointment_date::TIMESTAMPTZ) 
        FROM appointments 
        WHERE customer_id = NEW.customer_id 
          AND status = 'completed'
      )
    WHERE id = NEW.customer_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_customer_stats_trigger
AFTER INSERT OR UPDATE ON appointments
FOR EACH ROW EXECUTE FUNCTION update_customer_stats();

-- ============================================
-- 17. ROW LEVEL SECURITY (RLS)
-- ============================================

-- Habilitar RLS en todas las tablas
ALTER TABLE public.service_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_exceptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointment_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminder_logs ENABLE ROW LEVEL SECURITY;

-- Políticas básicas: usuarios pueden ver/editar datos de su organización

-- Categorías de servicios
CREATE POLICY "Users can view service categories of their org"
ON service_categories FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM user_profiles WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can manage service categories of their org"
ON service_categories FOR ALL
USING (
  organization_id IN (
    SELECT organization_id FROM user_profiles 
    WHERE user_id = auth.uid() 
      AND role IN ('admin', 'owner')
  )
);

-- Servicios
CREATE POLICY "Users can view services of their org"
ON services FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM user_profiles WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can manage services of their org"
ON services FOR ALL
USING (
  organization_id IN (
    SELECT organization_id FROM user_profiles 
    WHERE user_id = auth.uid() 
      AND role IN ('admin', 'owner')
  )
);

-- Staff
CREATE POLICY "Users can view staff of their org"
ON staff_members FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM user_profiles WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can manage staff of their org"
ON staff_members FOR ALL
USING (
  organization_id IN (
    SELECT organization_id FROM user_profiles 
    WHERE user_id = auth.uid() 
      AND role IN ('admin', 'owner')
  )
);

-- Staff services
CREATE POLICY "Users can view staff services of their org"
ON staff_services FOR SELECT
USING (
  staff_id IN (
    SELECT id FROM staff_members 
    WHERE organization_id IN (
      SELECT organization_id FROM user_profiles WHERE user_id = auth.uid()
    )
  )
);

CREATE POLICY "Users can manage staff services of their org"
ON staff_services FOR ALL
USING (
  staff_id IN (
    SELECT id FROM staff_members 
    WHERE organization_id IN (
      SELECT organization_id FROM user_profiles 
      WHERE user_id = auth.uid() 
        AND role IN ('admin', 'owner')
    )
  )
);

-- Staff availability
CREATE POLICY "Users can view staff availability of their org"
ON staff_availability FOR SELECT
USING (
  staff_id IN (
    SELECT id FROM staff_members 
    WHERE organization_id IN (
      SELECT organization_id FROM user_profiles WHERE user_id = auth.uid()
    )
  )
);

CREATE POLICY "Users can manage staff availability of their org"
ON staff_availability FOR ALL
USING (
  staff_id IN (
    SELECT id FROM staff_members 
    WHERE organization_id IN (
      SELECT organization_id FROM user_profiles 
      WHERE user_id = auth.uid() 
        AND role IN ('admin', 'owner')
    )
  )
);

-- Staff exceptions
CREATE POLICY "Users can view staff exceptions of their org"
ON staff_exceptions FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM user_profiles WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can manage staff exceptions of their org"
ON staff_exceptions FOR ALL
USING (
  organization_id IN (
    SELECT organization_id FROM user_profiles 
    WHERE user_id = auth.uid() 
      AND role IN ('admin', 'owner')
  )
);

-- Clientes
CREATE POLICY "Users can view customers of their org"
ON customers FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM user_profiles WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can manage customers of their org"
ON customers FOR ALL
USING (
  organization_id IN (
    SELECT organization_id FROM user_profiles WHERE user_id = auth.uid()
  )
);

-- Appointments
CREATE POLICY "Users can view appointments of their org"
ON appointments FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM user_profiles WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can manage appointments of their org"
ON appointments FOR ALL
USING (
  organization_id IN (
    SELECT organization_id FROM user_profiles WHERE user_id = auth.uid()
  )
);

-- Appointment requests
CREATE POLICY "Users can view appointment requests of their org"
ON appointment_requests FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM user_profiles WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can manage appointment requests of their org"
ON appointment_requests FOR ALL
USING (
  organization_id IN (
    SELECT organization_id FROM user_profiles WHERE user_id = auth.uid()
  )
);

-- Business settings
CREATE POLICY "Users can view business settings of their org"
ON business_settings FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM user_profiles WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Owners can manage business settings"
ON business_settings FOR ALL
USING (
  organization_id IN (
    SELECT organization_id FROM user_profiles 
    WHERE user_id = auth.uid() 
      AND role IN ('admin', 'owner')
  )
);

-- Waitlist
CREATE POLICY "Users can view waitlist of their org"
ON waitlist FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM user_profiles WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can manage waitlist of their org"
ON waitlist FOR ALL
USING (
  organization_id IN (
    SELECT organization_id FROM user_profiles WHERE user_id = auth.uid()
  )
);

-- Customer history
CREATE POLICY "Users can view customer history of their org"
ON customer_history FOR SELECT
USING (
  customer_id IN (
    SELECT id FROM customers 
    WHERE organization_id IN (
      SELECT organization_id FROM user_profiles WHERE user_id = auth.uid()
    )
  )
);

CREATE POLICY "Users can manage customer history of their org"
ON customer_history FOR ALL
USING (
  customer_id IN (
    SELECT id FROM customers 
    WHERE organization_id IN (
      SELECT organization_id FROM user_profiles WHERE user_id = auth.uid()
    )
  )
);

-- Notifications
CREATE POLICY "Users can view their own notifications"
ON notifications FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications"
ON notifications FOR UPDATE
USING (user_id = auth.uid());

-- Reminder logs
CREATE POLICY "Users can view reminder logs of their org"
ON reminder_logs FOR SELECT
USING (
  appointment_id IN (
    SELECT id FROM appointments 
    WHERE organization_id IN (
      SELECT organization_id FROM user_profiles WHERE user_id = auth.uid()
    )
  )
);

-- ============================================
-- 18. VISTAS ÚTILES
-- ============================================

-- Vista de appointments con información completa
CREATE OR REPLACE VIEW appointments_with_details AS
SELECT 
  a.*,
  c.first_name as customer_first_name,
  c.last_name as customer_last_name,
  c.phone as customer_phone,
  c.email as customer_email,
  s.name as service_name,
  s.duration_minutes,
  s.price as service_price,
  st.first_name as staff_first_name,
  st.last_name as staff_last_name,
  st.nickname as staff_nickname,
  o.name as organization_name,
  o.timezone as organization_timezone
FROM appointments a
JOIN customers c ON a.customer_id = c.id
JOIN services s ON a.service_id = s.id
LEFT JOIN staff_members st ON a.staff_id = st.id
JOIN organizations o ON a.organization_id = o.id;

COMMENT ON VIEW appointments_with_details IS 'Vista completa de appointments con toda la información relacionada';

-- ============================================
-- 19. DATOS INICIALES OPCIONALES
-- ============================================

-- Función para inicializar configuración de negocio
CREATE OR REPLACE FUNCTION initialize_business_settings(org_id UUID)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO business_settings (
    organization_id,
    business_hours_config,
    reminder_settings
  ) VALUES (
    org_id,
    jsonb_build_object(
      'monday', jsonb_build_object('open', '09:00', 'close', '18:00'),
      'tuesday', jsonb_build_object('open', '09:00', 'close', '18:00'),
      'wednesday', jsonb_build_object('open', '09:00', 'close', '18:00'),
      'thursday', jsonb_build_object('open', '09:00', 'close', '18:00'),
      'friday', jsonb_build_object('open', '09:00', 'close', '18:00'),
      'saturday', jsonb_build_object('open', '10:00', 'close', '15:00'),
      'sunday', jsonb_build_object('closed', true)
    ),
    jsonb_build_object(
      'confirmation', jsonb_build_object('enabled', true, 'method', 'whatsapp'),
      'reminder_24h', jsonb_build_object('enabled', true, 'hours_before', 24),
      'reminder_2h', jsonb_build_object('enabled', true, 'hours_before', 2)
    )
  ) ON CONFLICT (organization_id) DO NOTHING;
END;
$$;

COMMENT ON FUNCTION initialize_business_settings IS 'Inicializa la configuración por defecto para una nueva organización';

-- ============================================
-- FINALIZACIÓN
-- ============================================

-- Dar permisos a authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
