# ✅ TurnoFlash - Action Checklist

**Objetivo:** Pasos concretos y accionables  
**Prioridad:** Impacto alto, esfuerzo bajo  
**Fecha:** 13 de enero de 2026

---

## 🔥 Quick Wins - Hacer HOY (12 horas)

### 1. Setup Sentry (1 hora)

```bash
npm install @sentry/nextjs

npx @sentry/wizard@latest -i nextjs
```

```typescript
// sentry.client.config.ts
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
  environment: process.env.NODE_ENV,
});
```

**Resultado:** Detectar errores en producción automáticamente

---

### 2. Toast Notifications (1 hora)

```bash
npm install sonner
```

```typescript
// app/layout.tsx
import { Toaster } from "sonner";

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Toaster position="top-right" />
      </body>
    </html>
  );
}

// En componentes
import { toast } from "sonner";

toast.success("Turno creado exitosamente");
toast.error("Error al crear turno");
```

**Resultado:** Feedback visual inmediato en todas las acciones

---

### 3. Confirmaciones en Acciones Destructivas (2 horas)

```typescript
// components/shared/ConfirmDialog.tsx
export function ConfirmDialog({
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = "Confirmar",
  cancelText = "Cancelar",
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white p-6 rounded-lg shadow-xl max-w-md">
        <h3 className="text-lg font-bold mb-2">{title}</h3>
        <p className="text-gray-600 mb-4">{message}</p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

// Uso
const handleDelete = async () => {
  if (confirm("¿Estás seguro de eliminar este turno?")) {
    await deleteAppointment(id);
  }
};
```

**Resultado:** Prevenir eliminaciones accidentales

---

### 4. Security Headers (1 hora)

```typescript
// next.config.ts
const nextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "geolocation=(), microphone=(), camera=()",
          },
        ],
      },
    ];
  },
};
```

**Resultado:** Protección básica contra XSS y clickjacking

---

### 5. JSDoc en Funciones Principales (2 horas)

````typescript
/**
 * Creates a new appointment for a customer
 *
 * @param data - The appointment data including customer, service, and time
 * @returns Promise with created appointment or error
 * @throws {ValidationError} If required fields are missing
 *
 * @example
 * ```ts
 * const appointment = await createAppointment({
 *   customer_id: '123',
 *   service_id: '456',
 *   start_time: '09:00',
 * });
 * ```
 */
export async function createAppointment(data: AppointmentFormData) {
  // ...
}
````

**Resultado:** Código auto-documentado, mejor IDE intellisense

---

### 6. Extraer Constantes (1 hora)

```typescript
// config/constants.ts
export const APPOINTMENT_STATUS = {
  PENDING: "pending",
  CONFIRMED: "confirmed",
  REMINDED: "reminded",
  CLIENT_CONFIRMED: "client_confirmed",
  CHECKED_IN: "checked_in",
  IN_PROGRESS: "in_progress",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
  NO_SHOW: "no_show",
} as const;

export const STATUS_COLORS = {
  [APPOINTMENT_STATUS.PENDING]: "bg-yellow-100 text-yellow-800",
  [APPOINTMENT_STATUS.CONFIRMED]: "bg-green-100 text-green-800",
  // ...
} as const;

export const STATUS_LABELS = {
  [APPOINTMENT_STATUS.PENDING]: "⏳ Pendiente",
  [APPOINTMENT_STATUS.CONFIRMED]: "✓ Confirmado",
  // ...
} as const;

// Uso
import { APPOINTMENT_STATUS, STATUS_COLORS } from "@/config/constants";

if (appointment.status === APPOINTMENT_STATUS.PENDING) {
  // Type-safe, auto-complete
}
```

**Resultado:** Fácil cambiar valores, type-safe

---

### 7. GitHub Actions CI Básico (2 horas)

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  lint-and-build:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "18"
          cache: "npm"

      - name: Install dependencies
        run: npm ci

      - name: Lint
        run: npm run lint

      - name: Type check
        run: npx tsc --noEmit

      - name: Build
        run: npm run build

      - name: Upload build artifacts
        uses: actions/upload-artifact@v4
        with:
          name: build
          path: out/
```

**Resultado:** Deployments seguros, bugs atrapados antes de producción

---

### 8. Rate Limiting Básico (2 horas)

```bash
npm install @upstash/ratelimit @upstash/redis
```

```typescript
// utils/rate-limit.ts
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// 10 requests por 10 segundos
const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, "10 s"),
});

export async function checkRateLimit(identifier: string) {
  const { success, limit, reset, remaining } = await ratelimit.limit(
    identifier
  );

  return {
    allowed: success,
    limit,
    remaining,
    resetAt: new Date(reset),
  };
}

// En API routes
export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for") ?? "127.0.0.1";
  const { allowed } = await checkRateLimit(ip);

  if (!allowed) {
    return new Response("Too Many Requests", { status: 429 });
  }

  // Procesar request
}
```

**Resultado:** Protección contra abuso de API

---

## 📅 Semana 1: Fundamentos (40 horas)

### Día 1-2: Estructura & Tipos (16h)

**Tarea 1:** Reorganizar carpetas

```
components/
  ├── ui/              # Button, Input, Modal, Badge
  ├── features/        # AppointmentCard, CustomerForm
  ├── layouts/         # DashboardLayout, AuthLayout
  └── shared/          # Navbar, Sidebar, Footer

services/
  ├── appointments.service.ts
  ├── customers.service.ts
  ├── services.service.ts
  └── staff.service.ts

config/
  ├── constants.ts
  ├── env.ts
  └── supabase.ts
```

**Tarea 2:** Generar tipos de Supabase

```bash
npx supabase gen types typescript --project-id YOUR_PROJECT > types/database.types.ts
```

```typescript
// types/index.ts
import { Database } from "./database.types";

export type Appointment = Database["public"]["Tables"]["appointments"]["Row"];
export type Customer = Database["public"]["Tables"]["customers"]["Row"];
// ...
```

---

### Día 3-4: React Query (16h)

**Instalar:**

```bash
npm install @tanstack/react-query @tanstack/react-query-devtools
```

**Setup:**

```typescript
// app/providers.tsx
"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState } from "react";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60, // 1 minuto
            cacheTime: 1000 * 60 * 5, // 5 minutos
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
```

**Ejemplo de uso:**

```typescript
// hooks/useAppointments.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export function useAppointments(organizationId: string) {
  return useQuery({
    queryKey: ["appointments", organizationId],
    queryFn: () => AppointmentService.getAll(organizationId),
  });
}

export function useCreateAppointment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: AppointmentService.create,
    onSuccess: () => {
      queryClient.invalidateQueries(["appointments"]);
      toast.success("Turno creado exitosamente");
    },
    onError: (error) => {
      toast.error("Error al crear turno");
    },
  });
}
```

---

### Día 5: Tests Setup (8h)

**Instalar:**

```bash
npm install -D @testing-library/react @testing-library/jest-dom jest jest-environment-jsdom
```

**Configurar:**

```javascript
// jest.config.js
const nextJest = require("next/jest");

const createJestConfig = nextJest({
  dir: "./",
});

const customJestConfig = {
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  testEnvironment: "jest-environment-jsdom",
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
};

module.exports = createJestConfig(customJestConfig);
```

```javascript
// jest.setup.js
import "@testing-library/jest-dom";
```

**Primer test:**

```typescript
// __tests__/components/AppointmentCard.test.tsx
import { render, screen } from "@testing-library/react";
import { AppointmentCard } from "@/components/features/AppointmentCard";

describe("AppointmentCard", () => {
  const mockAppointment = {
    id: "1",
    customer_first_name: "Juan",
    customer_last_name: "Pérez",
    status: "confirmed",
  };

  it("renders customer name", () => {
    render(<AppointmentCard appointment={mockAppointment} />);
    expect(screen.getByText("Juan Pérez")).toBeInTheDocument();
  });

  it("renders status badge", () => {
    render(<AppointmentCard appointment={mockAppointment} />);
    expect(screen.getByText(/confirmado/i)).toBeInTheDocument();
  });
});
```

---

## 📅 Semana 2: Performance & Seguridad (40 horas)

### Día 1-2: Optimización de Queries (16h)

**Índices en BD:**

```sql
-- supabase/migrations/011_performance_indexes.sql

-- Índices compuestos para queries frecuentes
CREATE INDEX idx_appointments_org_date
  ON appointments(organization_id, appointment_date);

CREATE INDEX idx_appointments_org_status
  ON appointments(organization_id, status);

CREATE INDEX idx_appointments_customer
  ON appointments(customer_id);

CREATE INDEX idx_appointments_staff
  ON appointments(staff_id);

-- Full-text search en customers
CREATE INDEX idx_customers_search
  ON customers USING gin(to_tsvector('spanish',
    first_name || ' ' || last_name || ' ' || phone));

-- Índice en teléfono para búsqueda rápida
CREATE INDEX idx_customers_phone
  ON customers(phone);

-- Análisis de queries
ANALYZE appointments;
ANALYZE customers;
ANALYZE services;
ANALYZE staff_members;
```

---

### Día 3: Paginación (8h)

**Backend (Supabase):**

```typescript
// services/appointments.service.ts
export class AppointmentService {
  static async getAll(organizationId: string, page = 1, pageSize = 50) {
    const start = (page - 1) * pageSize;
    const end = start + pageSize - 1;

    const { data, error, count } = await supabase
      .from("appointments")
      .select("*", { count: "exact" })
      .eq("organization_id", organizationId)
      .range(start, end)
      .order("appointment_date", { ascending: false });

    return {
      data: data || [],
      count: count || 0,
      page,
      pageSize,
      totalPages: Math.ceil((count || 0) / pageSize),
    };
  }
}
```

**Frontend:**

```typescript
// hooks/useAppointments.ts
import { useInfiniteQuery } from "@tanstack/react-query";

export function useInfiniteAppointments(organizationId: string) {
  return useInfiniteQuery({
    queryKey: ["appointments", organizationId],
    queryFn: ({ pageParam = 1 }) =>
      AppointmentService.getAll(organizationId, pageParam, 50),
    getNextPageParam: (lastPage) =>
      lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined,
  });
}
```

---

### Día 4-5: Seguridad (16h)

**Sanitización:**

```bash
npm install isomorphic-dompurify
```

```typescript
// utils/sanitize.ts
import DOMPurify from "isomorphic-dompurify";

export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ["b", "i", "em", "strong", "br"],
    ALLOWED_ATTR: [],
  });
}

export function sanitizeText(text: string): string {
  return text.replace(/[<>]/g, "");
}

// Uso
const sanitizedNotes = sanitizeHtml(formData.notes);
```

**Validación con Zod:**

```bash
npm install zod
```

```typescript
// schemas/appointment.schema.ts
import { z } from "zod";

export const appointmentSchema = z.object({
  customer_id: z.string().uuid("ID de cliente inválido"),
  service_id: z.string().uuid("ID de servicio inválido"),
  staff_id: z.string().uuid().nullable(),
  appointment_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida"),
  start_time: z.string().regex(/^\d{2}:\d{2}$/, "Hora inválida"),
  end_time: z.string().regex(/^\d{2}:\d{2}$/, "Hora inválida"),
  notes: z.string().max(500, "Notas muy largas").optional(),
});

export type AppointmentInput = z.infer<typeof appointmentSchema>;

// Validar
try {
  const validatedData = appointmentSchema.parse(formData);
  // Procesar
} catch (error) {
  if (error instanceof z.ZodError) {
    console.error("Validation errors:", error.issues);
  }
}
```

---

## 📋 Checklist de Progreso

### ✅ Quick Wins (Completar Hoy)

- [ ] Setup Sentry
- [ ] Toast notifications
- [ ] Confirmaciones en delete
- [ ] Security headers
- [ ] JSDoc principales funciones
- [ ] Extraer constantes
- [ ] GitHub Actions CI
- [ ] Rate limiting básico

### 📅 Semana 1

- [ ] Reorganizar carpetas
- [ ] Tipos de Supabase generados
- [ ] React Query instalado
- [ ] Custom hooks creados
- [ ] Tests setup completo
- [ ] 10+ tests unitarios

### 📅 Semana 2

- [ ] Índices en BD
- [ ] Paginación implementada
- [ ] Sanitización inputs
- [ ] Validación con Zod
- [ ] Error boundaries
- [ ] Lazy loading componentes pesados

### 📅 Semana 3

- [ ] Calendario completo
- [ ] Drag & drop
- [ ] Colores por servicio
- [ ] Tooltips
- [ ] Conflictos visuales

### 📅 Semana 4

- [ ] Recordatorios automáticos
- [ ] Edge function
- [ ] Twilio integrado
- [ ] Cron job configurado
- [ ] Plantillas de mensajes

---

## 🎯 KPIs por Semana

### Semana 1

- ✅ 8 Quick Wins completados
- ✅ Tests: 0 → 10+
- ✅ CI/CD: Manual → Automatizado
- ✅ Errores monitoreados: No → Sí (Sentry)

### Semana 2

- ✅ Performance: 75 → 85 (Lighthouse)
- ✅ Security headers: 0 → 5
- ✅ Validación: Manual → Zod
- ✅ Queries: Sin índices → Optimizado

### Semana 3

- ✅ UX Calendario: Básico → Profesional
- ✅ Conflictos: No detectados → Visualizados
- ✅ Colores: Monotono → Por servicio/staff

### Semana 4

- ✅ No-shows: 30% → 10% (con recordatorios)
- ✅ Automatización: Manual → Automático
- ✅ WhatsApp: Manual → API

---

## 📊 Priorización Visual

```
Impacto Alto + Esfuerzo Bajo = HACER YA ⭐⭐⭐
├── Quick Wins (8 items)
├── React Query
├── Paginación
└── Security headers

Impacto Alto + Esfuerzo Medio = Siguiente Sprint 🔥
├── Calendario completo
├── Recordatorios automáticos
├── Tests E2E
└── Página pública

Impacto Medio + Esfuerzo Bajo = Filler tasks ✅
├── JSDoc
├── Tooltips
├── Animaciones
└── Dark mode polish

Impacto Bajo / Esfuerzo Alto = Backlog 📋
├── Multi-idioma
├── IA features
└── White-label
```

---

## 🚀 Comandos Útiles

```bash
# Desarrollo
npm run dev

# Tests
npm test
npm test -- --watch
npm test -- --coverage

# Lint & Type check
npm run lint
npx tsc --noEmit

# Build
npm run build

# Mobile
npm run cap:sync
npm run mobile:build:ios
npm run mobile:build:android

# Supabase
npx supabase gen types typescript --project-id YOUR_ID > types/database.types.ts
npx supabase db push
npx supabase functions deploy send-reminders

# Database
psql -h YOUR_HOST -U postgres -d postgres -f supabase/migrations/011_performance_indexes.sql
```

---

## 📞 Recursos

- [Plan Completo](./PLAN-MEJORAS-PRO.md) - 96 mejoras detalladas
- [Roadmap 2026](./ROADMAP-2026.md) - Plan trimestral
- [React Query Docs](https://tanstack.com/query/latest)
- [Sentry Docs](https://docs.sentry.io/platforms/javascript/guides/nextjs/)
- [Supabase Docs](https://supabase.com/docs)

---

**¡A ejecutar! 🚀**

Empieza por los Quick Wins y avanza progresivamente. Cada mejora suma.
