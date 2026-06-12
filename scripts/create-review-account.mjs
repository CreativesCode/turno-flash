// Crea la cuenta de prueba para la revisión de Google Play:
// usuario owner + organización demo con licencia activa + datos de ejemplo.
// Uso: node scripts/create-review-account.mjs
// Lee NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY de .env.local

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const env = {};
for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const match = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (match) env[match[1]] = match[2].trim();
}

const REVIEW_EMAIL = "review.googleplay@turnoflash.app";
const REVIEW_PASSWORD = "TurnoFlash#Review2026";
const ORG_NAME = "Barbería Demo";
const ORG_SLUG = "barberia-demo";

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// 1. Usuario de Auth (email confirmado, sin verificación por correo)
const { data: created, error: createError } =
  await supabase.auth.admin.createUser({
    email: REVIEW_EMAIL,
    password: REVIEW_PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: "Cuenta de Revisión Google Play" },
  });

let userId = created?.user?.id;
if (createError) {
  if (!createError.message.includes("already been registered")) {
    console.error("Error creando usuario:", createError.message);
    process.exit(1);
  }
  const { data: list } = await supabase.auth.admin.listUsers();
  userId = list.users.find((u) => u.email === REVIEW_EMAIL)?.id;
  console.log("Usuario ya existía, reutilizando:", userId);
} else {
  console.log("Usuario creado:", userId);
}

// 2. Organización demo con licencia de 5 años (idempotente por slug)
const { data: existingOrg } = await supabase
  .from("organizations")
  .select("id")
  .eq("slug", ORG_SLUG)
  .maybeSingle();

let orgId = existingOrg?.id;
if (!orgId) {
  const start = new Date();
  const end = new Date(start);
  end.setFullYear(end.getFullYear() + 5);

  const { data: rpcResult, error: rpcError } = await supabase.rpc(
    "create_organization_with_owner",
    {
      org_name: ORG_NAME,
      org_slug: ORG_SLUG,
      org_timezone: "America/Mexico_City",
      owner_user_id: userId,
      license_start_date: start.toISOString(),
      license_end_date: end.toISOString(),
    }
  );
  if (rpcError) {
    console.error("Error creando organización:", rpcError.message);
    process.exit(1);
  }
  orgId = rpcResult.organization_id;
  console.log("Organización creada:", orgId);
} else {
  console.log("Organización ya existía:", orgId);
}

// 3. Datos demo: servicios y clientes (solo si no existen aún)
const { count: serviceCount } = await supabase
  .from("services")
  .select("id", { count: "exact", head: true })
  .eq("organization_id", orgId);

if (!serviceCount) {
  const { error } = await supabase.from("services").insert([
    {
      organization_id: orgId,
      name: "Corte de cabello",
      duration_minutes: 30,
      price: 12,
      currency: "USD",
      color: "#6366f1",
    },
    {
      organization_id: orgId,
      name: "Corte + barba",
      duration_minutes: 45,
      price: 18,
      currency: "USD",
      color: "#22c55e",
    },
    {
      organization_id: orgId,
      name: "Coloración",
      duration_minutes: 90,
      price: 35,
      currency: "USD",
      color: "#f59e0b",
    },
  ]);
  console.log(error ? `Servicios: ${error.message}` : "Servicios demo creados");
}

const { count: customerCount } = await supabase
  .from("customers")
  .select("id", { count: "exact", head: true })
  .eq("organization_id", orgId);

if (!customerCount) {
  const { error } = await supabase.from("customers").insert([
    {
      organization_id: orgId,
      first_name: "Martina",
      last_name: "Gómez",
      phone: "5215511112222",
    },
    {
      organization_id: orgId,
      first_name: "Carlos",
      last_name: "Pérez",
      phone: "5215533334444",
    },
  ]);
  console.log(error ? `Clientes: ${error.message}` : "Clientes demo creados");
}

console.log("\n=== DATOS PARA PLAY CONSOLE ===");
console.log("Email:   ", REVIEW_EMAIL);
console.log("Password:", REVIEW_PASSWORD);
