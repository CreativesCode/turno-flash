"use client";

import { PageMetadata } from "@/components/page-metadata";
import { ProtectedRoute } from "@/components/protected-route";
import { ManualBookingSheet } from "@/components/trips/ManualBookingSheet";
import { PassengerPrintSheet } from "@/components/trips/PassengerPrintSheet";
import { PassengerRow } from "@/components/trips/PassengerRow";
import { PaymentSheet } from "@/components/trips/PaymentSheet";
import { Button, Field, Sheet, sheetInputClasses } from "@/components/ui";
import { useAuth } from "@/contexts/auth-context";
import { TripService } from "@/services/trips.service";
import {
  useCreateManualBooking,
  useOrganizationModules,
  useSetAmountPaid,
  useSetBookingStatus,
  useToast,
  useTripBookingsQuery,
  useTripsQuery,
  useUpdatePassengerNames,
} from "@/hooks";
import {
  bookingPending,
  bookingTotal,
  seatPrice,
  type ManualBookingFormState,
  type TripBookingWithCustomer,
} from "@/types/trips";
import { downloadCsv, todayForFilename } from "@/utils/csv";
import { useMoney } from "@/hooks/useMoney";
import { ArrowLeft, Download, Plus, Printer, Users } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useCallback, useMemo, useState } from "react";

const EMPTY_BOOKING: ManualBookingFormState = {
  first_name: "",
  last_name: "",
  phone: "",
  email: "",
  seats: 1,
  trip_type: "one_way",
  passenger_names: [""],
  notes: "",
  pickup_point_id: "",
  amount_paid: "",
  extra_description: "",
  extra_amount: "",
};

const STATUS_TEXT: Record<string, string> = {
  pending: "Por aprobar",
  confirmed: "Confirmada",
  cancelled: "Cancelada",
  completed: "Viajó",
  no_show: "No se presentó",
};

const DEPOSIT_TEXT: Record<string, string> = {
  pending: "Pendiente",
  paid: "Cobrado",
  refunded: "Devuelto",
  waived: "Sin anticipo",
};

function TripDetailsContent() {
  const searchParams = useSearchParams();
  const tripId = searchParams.get("id");
  const { profile } = useAuth();
  const { modules } = useOrganizationModules();
  const { format: money } = useMoney();
  const toast = useToast();

  const [showManual, setShowManual] = useState(false);
  const [manualForm, setManualForm] =
    useState<ManualBookingFormState>(EMPTY_BOOKING);
  const [editingNames, setEditingNames] =
    useState<TripBookingWithCustomer | null>(null);
  const [nameDrafts, setNameDrafts] = useState<string[]>([]);
  const [paying, setPaying] = useState<TripBookingWithCustomer | null>(null);

  // The trip comes from the list the dashboard already has in cache.
  const { trips, loading: tripsLoading } = useTripsQuery({ includePast: true });
  const trip = useMemo(
    () => trips.find((candidate) => candidate.id === tripId) ?? null,
    [trips, tripId]
  );

  const { bookings, loading, error } = useTripBookingsQuery(tripId);

  const setAmountPaid = useSetAmountPaid();
  const setStatus = useSetBookingStatus();
  const updateNames = useUpdatePassengerNames();
  const createManual = useCreateManualBooking();

  const canManage = profile?.role === "admin" || profile?.role === "owner";
  const organizationId = profile?.organization_id ?? null;

  const liveBookings = useMemo(
    () => bookings.filter((booking) => booking.status !== "cancelled"),
    [bookings]
  );
  const seatsTaken = useMemo(
    () => liveBookings.reduce((total, booking) => total + booking.seats, 0),
    [liveBookings]
  );
  const pendingApproval = liveBookings.filter(
    (booking) => booking.status === "pending"
  ).length;
  const pendingDeposits = liveBookings.filter(
    (booking) => booking.deposit_status === "pending"
  ).length;
  const owed = useMemo(
    () => liveBookings.reduce((total, booking) => total + bookingPending(booking), 0),
    [liveBookings]
  );
  const photoUrl = TripService.vehiclePhotoUrl(trip?.vehicle_photo_path);

  const handleSavePayment = useCallback(
    async (payload: {
      amountPaid: number;
      method: string;
      extraDescription: string;
      extraAmount: number;
    }) => {
      if (!paying) return;
      try {
        await setAmountPaid.mutateAsync({
          bookingId: paying.id,
          amountPaid: payload.amountPaid,
          method: payload.method,
          extra: {
            description: payload.extraDescription,
            amount: payload.extraAmount,
          },
        });
        toast.success("Cobro registrado", "La aprobación de la reserva no cambió");
        setPaying(null);
      } catch (err) {
        toast.error(
          "Error",
          err instanceof Error ? err.message : "No se pudo registrar el cobro"
        );
      }
    },
    [paying, setAmountPaid, toast]
  );

  const handleApprove = useCallback(
    async (booking: TripBookingWithCustomer) => {
      try {
        await setStatus.mutateAsync({
          bookingId: booking.id,
          status: "confirmed",
        });
        toast.success("Reserva confirmada", "El cobro del anticipo no cambió");
      } catch (err) {
        toast.error(
          "Error",
          err instanceof Error ? err.message : "No se pudo confirmar"
        );
      }
    },
    [setStatus, toast]
  );

  const handleReject = useCallback(
    async (booking: TripBookingWithCustomer) => {
      try {
        await setStatus.mutateAsync({
          bookingId: booking.id,
          status: "cancelled",
        });
        toast.success("Reserva cancelada", "Los asientos vuelven a estar libres");
      } catch (err) {
        toast.error(
          "Error",
          err instanceof Error ? err.message : "No se pudo cancelar"
        );
      }
    },
    [setStatus, toast]
  );

  const handleEditNames = useCallback((booking: TripBookingWithCustomer) => {
    setEditingNames(booking);
    setNameDrafts(
      Array.from(
        { length: booking.seats },
        (_, index) => booking.passenger_names[index] ?? ""
      )
    );
  }, []);

  const handleSaveNames = useCallback(async () => {
    if (!editingNames) return;
    try {
      await updateNames.mutateAsync({
        bookingId: editingNames.id,
        names: nameDrafts,
      });
      toast.success("Nombres guardados");
      setEditingNames(null);
    } catch (err) {
      toast.error(
        "Error",
        err instanceof Error ? err.message : "No se pudieron guardar"
      );
    }
  }, [editingNames, nameDrafts, toast, updateNames]);

  const handleManualSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      if (!trip || !organizationId) return;
      try {
        // The chosen stop sets the price; without stops, the trip's own.
        const point = trip.pickup_points.find(
          (candidate) => candidate.id === manualForm.pickup_point_id
        );
        await createManual.mutateAsync({
          organizationId,
          tripId: trip.id,
          form: manualForm,
          pricePerSeat: seatPrice(trip, point, manualForm.trip_type),
          depositPerSeat: point
            ? point.deposit_per_seat
            : trip.deposit_per_seat,
          requiresApproval: trip.requires_approval,
        });
        toast.success("Reserva cargada");
        setShowManual(false);
        setManualForm(EMPTY_BOOKING);
      } catch (err) {
        toast.error(
          "Error",
          err instanceof Error ? err.message : "No se pudo cargar la reserva"
        );
      }
    },
    [createManual, manualForm, organizationId, toast, trip]
  );

  /**
   * One row per passenger, with what THAT passenger owes: dividing by seats
   * is the whole point — a 4-seat booking of 2000 is 500 per person.
   * Cancelled bookings are left out: nobody boards or pays for them.
   */
  const passengerRows = useMemo(() => {
    if (!trip) return [];
    const rows: {
      passenger: string;
      bookedBy: string;
      phone: string;
      bookingNumber: string;
      status: string;
      tripType: string;
      deposit: string;
      depositEach: number;
      priceEach: number;
      paidEach: number;
      pendingEach: number;
      extra: string;
    }[] = [];
    for (const booking of liveBookings) {
      const bookedBy = booking.customer
        ? `${booking.customer.first_name} ${booking.customer.last_name}`.trim()
        : "";
      const seats = booking.seats || 1;
      const depositEach = (booking.deposit_amount ?? 0) / seats;
      const priceEach = bookingTotal(booking) / seats;
      const paidEach = (booking.amount_paid ?? 0) / seats;
      const pendingEach = bookingPending(booking) / seats;
      for (let seat = 0; seat < booking.seats; seat += 1) {
        rows.push({
          passenger: booking.passenger_names[seat] ?? "(sin nombre)",
          bookedBy,
          phone: booking.customer?.phone ?? "",
          bookingNumber: booking.booking_number ?? "",
          status: STATUS_TEXT[booking.status] ?? booking.status,
          tripType:
            booking.trip_type === "round_trip" ? "Ida y vuelta" : "Solo ida",
          deposit: DEPOSIT_TEXT[booking.deposit_status] ?? booking.deposit_status,
          depositEach,
          priceEach,
          paidEach,
          pendingEach,
          extra: booking.extra_description ?? "",
        });
      }
    }
    return rows;
  }, [liveBookings, trip]);

  const handleExport = useCallback(() => {
    if (!trip) return;
    downloadCsv(
      `pasajeros-${trip.departure_date}-${todayForFilename()}`,
      [
        "Pasajero",
        "Reservó",
        "Teléfono",
        "Reserva",
        "Estado",
        "Viaje",
        "Anticipo",
        "Anticipo por pasajero",
        "Total por pasajero",
        "Pagado por pasajero",
        "Falta por pasajero",
        "Extra",
      ],
      passengerRows.map((row) => [
        row.passenger,
        row.bookedBy,
        row.phone,
        row.bookingNumber,
        row.status,
        row.tripType,
        row.deposit,
        row.depositEach,
        row.priceEach,
        row.paidEach,
        row.pendingEach,
        row.extra,
      ])
    );
  }, [passengerRows, trip]);

  if (tripsLoading || loading) {
    return (
      <ProtectedRoute>
        <div className="flex min-h-screen w-full items-center justify-center bg-background">
          <div className="flex flex-col items-center text-center">
            <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-border border-t-foreground" />
            <p className="text-sm text-foreground-muted">Cargando pasajeros...</p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (!trip) {
    return (
      <ProtectedRoute>
        <div className="mx-auto max-w-3xl px-4 py-10 text-center">
          <h1 className="text-base font-bold text-foreground">
            No encontramos esa salida
          </h1>
          <Link
            href="/dashboard/trips"
            className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-primary-700 dark:text-primary-400"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver a Viajes
          </Link>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <PageMetadata
        title={`Pasajeros · ${trip.title}`}
        description="Lista de pasajeros de la salida, con el estado de cada reserva y de su anticipo."
      />

      <PassengerPrintSheet
        organizationName={modules.name}
        trip={trip}
        rows={passengerRows}
      />

      <div className="relative min-h-screen bg-background pb-24 print:hidden">
        <div className="sticky top-0 z-20 border-b border-border bg-surface/95 backdrop-blur supports-backdrop-filter:bg-surface/80 print:hidden">
          <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 pb-3 pt-3 sm:px-6 lg:px-8">
            <Link
              href="/dashboard/trips"
              className="inline-flex w-fit items-center gap-1.5 text-xs font-semibold text-foreground-muted transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Viajes
            </Link>

            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h1 className="truncate text-xl font-extrabold tracking-tight text-foreground sm:text-2xl">
                  {trip.title}
                </h1>
                <p className="text-xs text-foreground-muted">
                  {trip.departure_date} · {trip.departure_time.slice(0, 5)} ·{" "}
                  {seatsTaken} de {trip.total_seats} asientos
                </p>
              </div>

              {canManage && (
                <Button
                  variant="mesh-primary"
                  onClick={() => {
                    setManualForm(EMPTY_BOOKING);
                    setShowManual(true);
                  }}
                  className="hidden sm:inline-flex"
                >
                  <Plus className="h-4 w-4" />
                  Cargar reserva
                </Button>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <Button variant="ghost" onClick={handleExport}>
                <Download className="h-4 w-4" />
                Exportar CSV
              </Button>
              <Button variant="ghost" onClick={() => window.print()}>
                <Printer className="h-4 w-4" />
                Imprimir
              </Button>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-5xl px-4 py-4 sm:px-6 lg:px-8">
          {error && (
            <div className="mb-4 rounded-lg bg-danger-50 p-3 text-sm text-danger-800 dark:bg-danger-900/20 dark:text-danger-400">
              {error}
            </div>
          )}

          {(trip.driver_name ||
            trip.vehicle_description ||
            trip.vehicle_photo_path) && (
            <div className="mb-4 flex items-center gap-3 rounded-xl border border-border bg-surface p-3 shadow-sm print:hidden">
              {photoUrl && (
                // eslint-disable-next-line @next/next/no-img-element -- Storage URL, no loader configured
                <img
                  src={photoUrl}
                  alt="Foto del vehículo"
                  className="h-16 w-24 shrink-0 rounded-lg border border-border object-cover"
                />
              )}
              <div className="min-w-0 text-xs">
                <p className="font-bold text-foreground">
                  {trip.vehicle_description || "Vehículo"}
                </p>
                {trip.driver_name && (
                  <p className="mt-0.5 text-foreground-muted">
                    Chofer: {trip.driver_name}
                    {trip.driver_phone ? ` · ${trip.driver_phone}` : ""}
                  </p>
                )}
                <p className="mt-0.5 text-foreground-subtle">
                  Esto es lo que ve el pasajero en tu página de reservas.
                </p>
              </div>
            </div>
          )}

          {(pendingApproval > 0 || pendingDeposits > 0) && (
            <div className="mb-4 flex flex-wrap gap-2 text-xs font-semibold print:hidden">
              {pendingApproval > 0 && (
                <span className="rounded-full border border-warning-600 bg-warning-50 px-3 py-1 text-warning-600 dark:border-warning-400 dark:bg-warning-900/20 dark:text-warning-300">
                  {pendingApproval} por aprobar
                </span>
              )}
              {pendingDeposits > 0 && (
                <span className="rounded-full border border-border-2 bg-muted px-3 py-1 text-foreground-muted">
                  {pendingDeposits} con anticipo pendiente
                </span>
              )}
              {owed > 0 && (
                <span className="rounded-full border border-border-2 bg-muted px-3 py-1 text-foreground-muted">
                  Falta cobrar {money(owed)}
                </span>
              )}
            </div>
          )}

          {bookings.length === 0 ? (
            <div className="rounded-xl border border-border bg-surface p-10 text-center shadow-sm">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-surface-2 text-foreground-subtle">
                <Users className="h-6 w-6" />
              </div>
              <h3 className="mt-3 text-base font-bold text-foreground">
                Todavía no hay pasajeros
              </h3>
              <p className="mt-1 text-sm text-foreground-muted">
                Cuando alguien reserve desde tu página lo verás aquí. También
                puedes cargar una reserva a mano.
              </p>
              {canManage && (
                <Button
                  variant="mesh-primary"
                  onClick={() => {
                    setManualForm(EMPTY_BOOKING);
                    setShowManual(true);
                  }}
                  className="mx-auto mt-4"
                >
                  <Plus className="h-4 w-4" />
                  Cargar reserva
                </Button>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {bookings.map((booking) => (
                <PassengerRow
                  key={booking.id}
                  booking={booking}
                  canManage={canManage}
                  requiresApproval={trip.requires_approval}
                  onApprove={handleApprove}
                  onReject={handleReject}
                  onRegisterPayment={setPaying}
                  onEditNames={handleEditNames}
                />
              ))}
            </div>
          )}
        </div>

        {canManage && (
          <button
            type="button"
            onClick={() => {
              setManualForm(EMPTY_BOOKING);
              setShowManual(true);
            }}
            aria-label="Cargar reserva"
            className="mesh-primary fixed bottom-24 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full text-white shadow-glow-primary transition-transform hover:-translate-y-px sm:hidden print:hidden"
          >
            <Plus className="h-6 w-6" />
          </button>
        )}
      </div>

      {paying && (
        <PaymentSheet
          key={paying.id}
          booking={paying}
          onClose={() => setPaying(null)}
          onSave={handleSavePayment}
          isSaving={setAmountPaid.isPending}
        />
      )}

      <ManualBookingSheet
        open={showManual}
        onClose={() => setShowManual(false)}
        trip={trip}
        form={manualForm}
        onChange={(patch) => setManualForm((prev) => ({ ...prev, ...patch }))}
        onSubmit={handleManualSubmit}
        isSubmitting={createManual.isPending}
      />

      <Sheet
        open={!!editingNames}
        onClose={() => setEditingNames(null)}
        title="Nombres de los pasajeros"
        subtitle={
          editingNames
            ? `${editingNames.seats} asiento(s) · ${money(
                editingNames.deposit_amount ?? 0
              )} de anticipo`
            : undefined
        }
      >
        <div className="flex flex-col gap-4">
          <Field label="Un nombre por asiento">
            <div className="flex flex-col gap-2">
              {nameDrafts.map((name, index) => (
                <input
                  key={index}
                  type="text"
                  value={name}
                  onChange={(e) => {
                    const next = [...nameDrafts];
                    next[index] = e.target.value;
                    setNameDrafts(next);
                  }}
                  className={sheetInputClasses}
                  placeholder={`Pasajero ${index + 1}`}
                />
              ))}
            </div>
          </Field>

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setEditingNames(null)}
              className="flex-1 justify-center"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="mesh-primary"
              onClick={handleSaveNames}
              disabled={updateNames.isPending}
              className="flex-2 justify-center"
            >
              {updateNames.isPending ? "Guardando…" : "Guardar"}
            </Button>
          </div>
        </div>
      </Sheet>
    </ProtectedRoute>
  );
}

export default function TripDetailsPage() {
  return (
    <Suspense
      fallback={
        <ProtectedRoute>
          <div className="flex min-h-screen w-full items-center justify-center bg-background">
            <div className="flex flex-col items-center text-center">
              <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-border border-t-foreground" />
              <p className="text-sm text-foreground-muted">Cargando...</p>
            </div>
          </div>
        </ProtectedRoute>
      }
    >
      <TripDetailsContent />
    </Suspense>
  );
}
