"use client";

import { ProtectedRoute } from "@/components/protected-route";
import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const { profile, signOut } = useAuth();
  const router = useRouter();

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-zinc-50 dark:bg-black">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-black dark:text-zinc-50">
                Panel de Control
              </h1>
              <p className="mt-2 text-zinc-600 dark:text-zinc-400">
                Bienvenido, {profile?.full_name || profile?.email || "Usuario"}
              </p>
            </div>
            <div className="flex gap-3">
              {profile?.role === "admin" && (
                <>
                  <button
                    onClick={() => router.push("/dashboard/users")}
                    className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                  >
                    Gestión de usuarios
                  </button>
                  <button
                    onClick={() => router.push("/dashboard/invite")}
                    className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  >
                    Invitar usuarios
                  </button>
                </>
              )}
              <button
                onClick={() => signOut().then(() => router.push("/login"))}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              >
                Cerrar sesión
              </button>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-lg bg-white p-6 shadow-sm dark:bg-zinc-900">
              <h2 className="text-lg font-semibold text-black dark:text-zinc-50">
                Información del Usuario
              </h2>
              <dl className="mt-4 space-y-2">
                <div>
                  <dt className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                    Email
                  </dt>
                  <dd className="mt-1 text-sm text-black dark:text-zinc-50">
                    {profile?.email || "N/A"}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                    Rol
                  </dt>
                  <dd className="mt-1 text-sm text-black dark:text-zinc-50">
                    <span className="inline-flex rounded-full bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
                      {profile?.role || "staff"}
                    </span>
                  </dd>
                </div>
                {profile?.organization_id && (
                  <div>
                    <dt className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                      Organización
                    </dt>
                    <dd className="mt-1 text-sm text-black dark:text-zinc-50">
                      {profile.organization_id}
                    </dd>
                  </div>
                )}
              </dl>
            </div>

            <div className="rounded-lg bg-white p-6 shadow-sm dark:bg-zinc-900">
              <h2 className="text-lg font-semibold text-black dark:text-zinc-50">
                Estado
              </h2>
              <div className="mt-4">
                <span
                  className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                    profile?.is_active
                      ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
                      : "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400"
                  }`}
                >
                  {profile?.is_active ? "Activo" : "Inactivo"}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-8 rounded-lg bg-white p-6 shadow-sm dark:bg-zinc-900">
            <h2 className="text-lg font-semibold text-black dark:text-zinc-50">
              Próximos pasos
            </h2>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              Esta es una página de ejemplo del dashboard. Aquí puedes agregar
              las funcionalidades del panel del dueño según las indicaciones del
              proyecto.
            </p>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
