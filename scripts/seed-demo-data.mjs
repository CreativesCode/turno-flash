// Enriquece la organización demo (barberia-demo) con staff, clientes y turnos
// para que las capturas de Play Store muestren la app con datos reales.
// Uso: node scripts/seed-demo-data.mjs   (idempotente)

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const env = {};
for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const match = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (match) env[match[1]] = match[2].trim();
}

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const { data: org } = await supabase
  .from("organizations")
  .select("id")
  .eq("slug", "barberia-demo")
  .single();

if (!org) {
  console.error("No existe la org demo. Ejecuta antes create-review-account.mjs");
  process.exit(1);
}
const orgId = org.id;

// ── Staff ────────────────────────────────────────────────
const { count: staffCount } = await supabase
  .from("staff_members")
  .select("id", { count: "exact", head: true })
  .eq("organization_id", orgId);

if (!staffCount) {
  const { error } = await supabase.from("staff_members").insert([
    {
      organization_id: orgId,
      first_name: "Diego",
      last_name: "Ramírez",
      specialties: ["Cortes clásicos", "Barba"],
      color: "#6366f1",
    },
    {
      organization_id: orgId,
      first_name: "Lucía",
      last_name: "Fernández",
      specialties: ["Coloración", "Peinados"],
      color: "#ec4899",
    },
  ]);
  console.log(error ? `Staff: ${error.message}` : "Staff demo creado");
}

// ── Más clientes ─────────────────────────────────────────
const EXTRA_CUSTOMERS = [
  ["Sofía", "Hernández", "5215511223344"],
  ["Andrés", "Molina", "5215522334455"],
  ["Valentina", "Ruiz", "5215533445566"],
  ["Javier", "Ortega", "5215544556677"],
];

const { data: existingCustomers } = await supabase
  .from("customers")
  .select("id, first_name")
  .eq("organization_id", orgId);

const have = new Set((existingCustomers ?? []).map((c) => c.first_name));
const toInsert = EXTRA_CUSTOMERS.filter(([f]) => !have.has(f)).map(
  ([first_name, last_name, phone]) => ({
    organization_id: orgId,
    first_name,
    last_name,
    phone,
  })
);
if (toInsert.length) {
  const { error } = await supabase.from("customers").insert(toInsert);
  console.log(error ? `Clientes: ${error.message}` : `+${toInsert.length} clientes`);
}

// ── Turnos (hoy y mañana, estados variados) ──────────────
const { data: customers } = await supabase
  .from("customers")
  .select("id, first_name")
  .eq("organization_id", orgId)
  .order("created_at");
const { data: services } = await supabase
  .from("services")
  .select("id, name, duration_minutes, price")
  .eq("organization_id", orgId)
  .order("created_at");
const { data: staff } = await supabase
  .from("staff_members")
  .select("id, first_name")
  .eq("organization_id", orgId)
  .order("created_at");

const { count: apptCount } = await supabase
  .from("appointments")
  .select("id", { count: "exact", head: true })
  .eq("organization_id", orgId);

if (apptCount) {
  console.log(`Ya hay ${apptCount} turnos; no se crean más.`);
  process.exit(0);
}

const day = (offset) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
};
const at = (h, m = 0) =>
  `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`;
const endOf = (h, m, dur) => {
  const total = h * 60 + m + dur;
  return at(Math.floor(total / 60), total % 60);
};

const c = (i) => customers[i % customers.length];
const s = (i) => services[i % services.length];
const st = (i) => staff[i % staff.length];

// [dayOffset, hour, min, customerIdx, serviceIdx, staffIdx, status, extras]
const PLAN = [
  [-1, 10, 0, 0, 0, 0, "completed", { was_paid: true, rating: 5 }],
  [-1, 16, 30, 3, 1, 1, "completed", { was_paid: true, rating: 4 }],
  [0, 9, 30, 1, 1, 0, "checked_in", {}],
  [0, 11, 0, 2, 0, 1, "client_confirmed", {}],
  [0, 15, 0, 3, 2, 1, "confirmed", {}],
  [0, 17, 30, 4, 0, 0, "pending", {}],
  [1, 10, 0, 5, 1, 0, "confirmed", {}],
  [1, 12, 30, 0, 2, 1, "pending", {}],
];

const rows = PLAN.map(([off, h, m, ci, si, sti, status, extras]) => ({
  organization_id: orgId,
  customer_id: c(ci).id,
  service_id: s(si).id,
  staff_id: st(sti).id,
  appointment_date: day(off),
  start_time: at(h, m),
  end_time: endOf(h, m, s(si).duration_minutes),
  status,
  price_charged: s(si).price,
  source: "admin",
  ...extras,
}));

const { error: apptError } = await supabase.from("appointments").insert(rows);
console.log(
  apptError ? `Turnos: ${apptError.message}` : `${rows.length} turnos demo creados`
);
