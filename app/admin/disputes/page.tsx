import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { nowMs } from "@/lib/format";
import { cn } from "@/lib/utils";
import { DisputeRow } from "@/components/admin/dispute-row";

const OPEN_STATUSES = new Set(["open", "investigating"]);

type BookingRow = {
  id: string;
  barber_id: string;
  service_id: string | null;
  price: number;
  address_text: string;
  payment_method: string | null;
};

export default async function AdminDisputesPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const { view } = await searchParams;
  const showResolved = view === "resolved";
  const now = nowMs();
  const supabase = await createClient();

  const { data: disputes } = await supabase
    .from("disputes")
    .select(
      "id, booking_id, raised_by, category, description, status, resolution_notes, created_at",
    )
    .order("created_at", { ascending: false });

  const rows = disputes ?? [];
  const bookingIds = [...new Set(rows.map((d) => d.booking_id))];
  const raiserIds = [...new Set(rows.map((d) => d.raised_by))];

  const { data: bookings } = bookingIds.length
    ? await supabase
        .from("bookings")
        .select("id, barber_id, service_id, price, address_text, payment_method")
        .in("id", bookingIds)
    : { data: [] as BookingRow[] };

  const barberIds = [...new Set((bookings ?? []).map((b) => b.barber_id))];
  const serviceIds = [
    ...new Set((bookings ?? []).map((b) => b.service_id).filter(Boolean)),
  ] as string[];
  const profileIds = [...new Set([...raiserIds, ...barberIds])];

  const [{ data: profiles }, { data: services }] = await Promise.all([
    profileIds.length
      ? supabase.from("profiles").select("id, full_name").in("id", profileIds)
      : Promise.resolve({ data: [] as { id: string; full_name: string | null }[] }),
    serviceIds.length
      ? supabase.from("services").select("id, name").in("id", serviceIds)
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
  ]);

  const bookingById = new Map((bookings ?? []).map((b) => [b.id, b]));
  const nameById = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));
  const serviceNameById = new Map((services ?? []).map((s) => [s.id, s.name]));

  const openDisputes = rows.filter((d) => OPEN_STATUSES.has(d.status));
  const resolvedDisputes = rows.filter((d) => !OPEN_STATUSES.has(d.status));
  const shown = showResolved ? resolvedDisputes : openDisputes;

  const views = [
    { href: "/admin/disputes", label: `Open ${openDisputes.length}`, active: !showResolved },
    { href: "/admin/disputes?view=resolved", label: `Resolved ${resolvedDisputes.length}`, active: showResolved },
  ];

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 p-4 sm:p-[22px]">
      <div>
        <h1 className="text-[25px] font-black">Disputes</h1>
        <p className="text-sm text-muted-foreground">
          Reports raised by customers and barbers on a booking.
        </p>
      </div>

      <nav aria-label="Dispute status" className="flex gap-2 text-[13px]">
        {views.map((v) => (
          <Link
            key={v.href}
            href={v.href}
            aria-current={v.active ? "page" : undefined}
            className={cn(
              "rounded-[5px] px-3 py-2",
              v.active
                ? "border-2 border-primary font-bold"
                : "border-[1.5px] border-border text-muted-foreground hover:text-foreground",
            )}
          >
            {v.label}
          </Link>
        ))}
      </nav>

      {shown.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {showResolved ? "Nothing resolved yet." : "No open disputes."}
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {shown.map((d) => {
            const booking = bookingById.get(d.booking_id);
            return (
              <DisputeRow
                key={d.id}
                disputeId={d.id}
                bookingId={d.booking_id}
                category={d.category}
                description={d.description}
                status={d.status}
                resolutionNotes={d.resolution_notes}
                createdAt={d.created_at}
                now={now}
                reporterName={nameById.get(d.raised_by) ?? "Someone"}
                barberName={booking ? (nameById.get(booking.barber_id) ?? "Barber") : null}
                serviceName={
                  booking?.service_id ? (serviceNameById.get(booking.service_id) ?? null) : null
                }
                bookingPrice={booking?.price ?? null}
                paymentMethod={booking?.payment_method ?? null}
                bookingAddress={booking?.address_text ?? null}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
