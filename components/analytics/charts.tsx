"use client";

import type {
  AppointmentsByMonth,
  RevenueByDay,
  StatusCount,
  TopService,
} from "@/types/analytics";
import { formatMoney } from "@/components/analytics/widgets";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

/**
 * Componentes recharts de los dashboards de analítica.
 * Importar SIEMPRE con next/dynamic ({ ssr: false }) para no engordar el
 * bundle inicial (mismo patrón que DayCalendar/WeekCalendar).
 */

const COLORS = {
  primary: "var(--color-primary-500, #22c55e)",
  info: "#3b82f6",
  grid: "var(--color-border, #e5e7eb)",
  text: "var(--color-foreground-muted, #6b7280)",
};

const TOOLTIP_STYLE: React.CSSProperties = {
  backgroundColor: "var(--color-surface, #fff)",
  border: "1px solid var(--color-border, #e5e7eb)",
  borderRadius: 10,
  fontSize: 12,
  color: "var(--color-foreground, #111)",
};

export const CHART_STATUS_COLORS: Record<string, string> = {
  completed: "#22c55e",
  confirmed: "#3b82f6",
  client_confirmed: "#2563eb",
  reminded: "#06b6d4",
  pending: "#f59e0b",
  checked_in: "#8b5cf6",
  in_progress: "#a855f7",
  cancelled: "#ef4444",
  no_show: "#f97316",
  rescheduled: "#64748b",
};

function shortDay(day: string): string {
  // "2026-06-11" → "11/6"
  const [, m, d] = day.split("-");
  return `${Number(d)}/${Number(m)}`;
}

function shortMonth(month: string): string {
  // "2026-06" → "jun 26"
  const [y, m] = month.split("-");
  const names = [
    "ene", "feb", "mar", "abr", "may", "jun",
    "jul", "ago", "sep", "oct", "nov", "dic",
  ];
  return `${names[Number(m) - 1]} ${y.slice(2)}`;
}

/** Ingresos + turnos por día (dashboard de reportes). */
export function RevenueAreaChart({ data }: { data: RevenueByDay[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={COLORS.primary} stopOpacity={0.35} />
            <stop offset="100%" stopColor={COLORS.primary} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={COLORS.grid} strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="day"
          tickFormatter={shortDay}
          tick={{ fontSize: 11, fill: COLORS.text }}
          tickLine={false}
          axisLine={false}
          minTickGap={24}
        />
        <YAxis
          tickFormatter={(v: number) => formatMoney(v)}
          tick={{ fontSize: 11, fill: COLORS.text }}
          tickLine={false}
          axisLine={false}
          width={56}
        />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          labelFormatter={(label) => shortDay(String(label))}
          formatter={(value, name) =>
            name === "revenue"
              ? [formatMoney(Number(value)), "Ingresos"]
              : [value, "Turnos"]
          }
        />
        <Area
          type="monotone"
          dataKey="revenue"
          stroke={COLORS.primary}
          strokeWidth={2}
          fill="url(#revenueFill)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

/** Distribución de turnos por estado (donut). */
export function StatusDonut({
  data,
  getLabel,
}: {
  data: StatusCount[];
  getLabel: (status: string) => string;
}) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie
          data={data}
          dataKey="count"
          nameKey="status"
          innerRadius={55}
          outerRadius={85}
          paddingAngle={2}
          strokeWidth={0}
        >
          {data.map((entry) => (
            <Cell
              key={entry.status}
              fill={CHART_STATUS_COLORS[entry.status] ?? "#94a3b8"}
            />
          ))}
        </Pie>
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          formatter={(value, _name, item) => [
            value,
            getLabel(String((item?.payload as StatusCount)?.status ?? "")),
          ]}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

/** Top servicios por ingresos (barras horizontales). */
export function TopServicesBars({ data }: { data: TopService[] }) {
  const height = Math.max(160, data.length * 38 + 24);
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 0, right: 16, left: 0, bottom: 0 }}
      >
        <CartesianGrid stroke={COLORS.grid} strokeDasharray="3 3" horizontal={false} />
        <XAxis
          type="number"
          tickFormatter={(v: number) => formatMoney(v)}
          tick={{ fontSize: 11, fill: COLORS.text }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          type="category"
          dataKey="name"
          width={120}
          tick={{ fontSize: 11, fill: COLORS.text }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          formatter={(value, name) =>
            name === "revenue"
              ? [formatMoney(Number(value)), "Ingresos"]
              : [value, "Turnos"]
          }
        />
        <Bar dataKey="revenue" fill={COLORS.primary} radius={[0, 6, 6, 0]} barSize={18} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Turnos por mes en la plataforma (dashboard de admin). */
export function MonthlyBarChart({ data }: { data: AppointmentsByMonth[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={COLORS.grid} strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="month"
          tickFormatter={shortMonth}
          tick={{ fontSize: 11, fill: COLORS.text }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: COLORS.text }}
          tickLine={false}
          axisLine={false}
          width={40}
        />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          labelFormatter={(label) => shortMonth(String(label))}
          formatter={(value, name) =>
            name === "revenue"
              ? [formatMoney(Number(value)), "Ingresos"]
              : [value, "Turnos"]
          }
        />
        <Bar dataKey="count" fill={COLORS.info} radius={[6, 6, 0, 0]} barSize={28} />
      </BarChart>
    </ResponsiveContainer>
  );
}
