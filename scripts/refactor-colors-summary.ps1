# Script de resumen de refactorización de colores
# Ejecutar para ver el progreso

Write-Host "=== REFACTORIZACIÓN DEL SISTEMA DE COLORES ===" -ForegroundColor Cyan
Write-Host ""

$completed = @(
    "components/Sidebar.tsx",
    "components/DashboardLayout.tsx",
    "app/dashboard/page.tsx",
    "app/dashboard/appointments/page.tsx",
    "app/dashboard/customers/page.tsx",
    "app/dashboard/services/page.tsx",
    "app/dashboard/staff/page.tsx"
)

$pending = @(
    "app/dashboard/reminders/page.tsx",
    "app/dashboard/users/page.tsx",
    "app/dashboard/organizations/page.tsx",
    "app/dashboard/invite/page.tsx",
    "components/calendar/DayCalendar.tsx",
    "components/calendar/WeekCalendar.tsx"
)

Write-Host "✅ COMPLETADOS ($($completed.Count)):" -ForegroundColor Green
foreach ($file in $completed) {
    Write-Host "  - $file" -ForegroundColor Green
}

Write-Host ""
Write-Host "⏳ PENDIENTES ($($pending.Count)):" -ForegroundColor Yellow
foreach ($file in $pending) {
    Write-Host "  - $file" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Progreso: $($completed.Count) / $($completed.Count + $pending.Count) archivos" -ForegroundColor Cyan
