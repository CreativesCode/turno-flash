/**
 * Tipos para las RPC de analítica (migración 022_analytics_functions.sql)
 * - get_organization_analytics → OrganizationAnalytics
 * - get_admin_platform_stats → PlatformStats
 */

// ───────────────────────────────────────────────────────────
// Dashboard de reportes (owner/admin con organización)
// ───────────────────────────────────────────────────────────

export interface AnalyticsSummary {
  total: number;
  completed: number;
  cancelled: number;
  no_show: number;
  revenue: number;
  revenue_paid: number;
  revenue_lost: number;
  avg_rating: number | null;
  ratings_count: number;
  unique_customers: number;
  new_customers: number;
}

/** Subconjunto del período anterior usado para calcular deltas. */
export interface AnalyticsPreviousSummary {
  total: number;
  completed: number;
  cancelled: number;
  no_show: number;
  revenue: number;
  unique_customers: number;
  new_customers: number;
}

export interface RevenueByDay {
  day: string; // YYYY-MM-DD
  revenue: number;
  appointments: number;
}

export interface StatusCount {
  status: string;
  count: number;
}

export interface SourceCount {
  source: string;
  count: number;
}

export interface TopService {
  name: string;
  appointments: number;
  revenue: number;
}

export interface TopStaff {
  name: string;
  appointments: number;
  revenue: number;
  avg_rating: number | null;
}

export interface HeatmapCell {
  /** Día de la semana: 0 = domingo … 6 = sábado */
  dow: number;
  /** Hora de inicio del turno (0-23) */
  hour: number;
  count: number;
}

export interface OrganizationAnalytics {
  organization_id: string;
  start_date: string;
  end_date: string;
  summary: AnalyticsSummary;
  previous: AnalyticsPreviousSummary;
  revenue_by_day: RevenueByDay[];
  status_counts: StatusCount[];
  source_counts: SourceCount[];
  top_services: TopService[];
  top_staff: TopStaff[];
  heatmap: HeatmapCell[];
}

// ───────────────────────────────────────────────────────────
// Dashboard de plataforma (solo admin)
// ───────────────────────────────────────────────────────────

export interface PlatformOrgStats {
  total: number;
  active: number;
  license_active: number;
  license_grace: number;
  license_expired: number;
  license_none: number;
}

export interface ExpiringOrg {
  id: string;
  name: string;
  license_end_date: string;
  subscription_platform: string | null;
  subscription_status: string | null;
}

export interface SubscriptionCount {
  status: string;
  platform: string | null;
  count: number;
}

export interface SubscriptionEventCount {
  event_type: string;
  count: number;
}

export interface AppointmentsByMonth {
  month: string; // YYYY-MM
  count: number;
  revenue: number;
}

export interface TopOrg {
  id: string;
  name: string;
  appointments: number;
}

export interface InactiveOrg {
  id: string;
  name: string;
  last_appointment_at: string | null;
}

export interface PlatformFunnel {
  orgs: number;
  with_services: number;
  with_staff: number;
  with_appointments: number;
  with_active_license: number;
}

export interface WhatsappStats {
  total: number;
  delivered: number;
  failed: number;
}

export interface ErrorStats {
  last_7d: number;
  unresolved: number;
}

export interface PlatformStats {
  generated_at: string;
  orgs: PlatformOrgStats;
  expiring_soon: ExpiringOrg[];
  subscriptions: SubscriptionCount[];
  subscription_events_30d: SubscriptionEventCount[];
  appointments_by_month: AppointmentsByMonth[];
  top_orgs_30d: TopOrg[];
  inactive_orgs_14d: InactiveOrg[];
  funnel: PlatformFunnel;
  whatsapp_30d: WhatsappStats;
  errors: ErrorStats;
}
