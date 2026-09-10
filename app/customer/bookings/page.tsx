import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/supabase/require-profile";
import { formatShortDate, PAYMENT_METHOD_LABEL } from "@/lib/format";
import { cn } from "@/lib/utils";
import { QueueCard } from "@/components/customer/queue-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SectionLabel } from "@/components/ui/section-label";

const ACTIVE_STATUSES = ["queued", "pending", "accepted", "on_the_way", "in_service"];

const LIVE_TITLE: Record<string, string> = {
  pending: "Waiting for your barber to accept",
  accepted: "Your barber accepted",
  on_the_way: "Your barber is on the way",
  in_service: "Your cut is in progress",
};

const ENDED_LABEL: Record<string, string> = {
  cancelled: "Cancelled",
  declined: "Declined",
};

// Wireframe C5: the current booking up top (with the queue escape hatch
// when queued), then past bookings with what's left to do on each.
export default async function CustomerBookingsPage() {
  const { user } = await requireProfile();
  const supabase = await createClient();

  const { data: bookings } = await supabase
    .from("bookings")
    .select("id, requested_at, status, price, barber_id, service_id, payment_method")
    .eq("customer_id", user.id)
    .order("requested_at", { ascending: false });

  const rows = bookings ?? [];
  const barberIds = [...new Set(rows.map((b) => b.barber_id))];
  const serviceIds = [...new Set(rows.map((b) => b.service_id).filter(Boolean))] as string[];
  const completedIds = rows.filter((b) => b.status === "completed").map((b) => b.id);
  const queued = rows.filter((b) => b.status === "queued");

  const [{ data: barberNames }, { data: serviceNames }, { data: reviews }, queueDepths] =
    await Promise.all([
      barberIds.length
        ? supabase.from("profiles").select("id, full_name").in("id", barberIds)
        : Promise.resolve({ data: [] as { id: string; full_name: string | null }[] }),
      serviceIds.length
        ? supabase.from("services").select("id, name").in("id", serviceIds)
        : Promise.resolve({ data: [] as { id: string; name: string }[] }),
      completedIds.length
        ? supabase.from("reviews").select("booking_id, rating").in("booking_id", completedIds)
        : Promise.resolve({ data: [] as { booking_id: string; rating: number }[] }),
      Promise.all(
        queued.map(async (b) => {
          const { data } = await supabase.rpc("queue_depth", { target_booking_id: b.id });
          return [b.id, (data as number | null) ?? null] as const;
        }),
      ),
    ]);

  const barberName = new Map((barberNames ?? []).map((b) => [b.id, b.full_name ?? "Barber"]));
  const serviceName = new Map((serviceNames ?? []).map((s) => [s.id, s.name]));
  const ratingFor = new Map((reviews ?? []).map((r) => [r.booking_id, r.rating]));
  const depthFor = new Map(queueDepths);

  const active = rows.filter((b) => ACTIVE_STATUSES.includes(b.status));
  const past = rows.filter((b) => !ACTIVE_STATUSES.includes(b.status));
  const lastBarberId = rows.find((b) => b.status === "completed")?.barber_id;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 p-4 sm:p-6">
      <h1 className="text-2xl font-black">Bookings</h1>

      {active.map((b) =>
        b.status === "queued" ? (
          <QueueCard
            key={b.id}
            bookingId={b.id}
            barberId={b.barber_id}
            barberName={barberName.get(b.barber_id) ?? "Your barber"}
            queueDepth={depthFor.get(b.id) ?? null}
            detailHref={`/customer/bookings/${b.id}`}
          />
        ) : (
          <Link
            key={b.id}
            href={`/customer/bookings/${b.id}`}
            className="flex flex-col gap-1 rounded-lg border-2 border-primary p-4 transition-colors hover:bg-muted"
          >
            <span className="flex items-baseline justify-between gap-3">
              <span className="text-lg font-bold">{LIVE_TITLE[b.status] ?? b.status}</span>
              <span className="shrink-0 text-sm font-semibold text-primary">Track</span>
            </span>
            <span className="text-sm text-ink-soft">
              {serviceName.get(b.service_id ?? "") ?? "Service"} with{" "}
              {barberName.get(b.barber_id) ?? "your barber"} · ₱{b.price}
            </span>
          </Link>
        ),
      )}

      {rows.length === 0 && (
        <div className="flex flex-col items-start gap-3 rounded-lg border-[1.5px] border-border p-4">
          <p className="text-base font-semibold">No bookings yet</p>
          <p className="text-sm text-muted-foreground">
            Quick Match sends the nearest free barber to your door.
          </p>
          <Button nativeButton={false} render={<Link href="/customer" />}>
            Find a barber
          </Button>
        </div>
      )}

      {past.length > 0 && (
        <section className="flex flex-col gap-2.5">
          <SectionLabel>Past bookings</SectionLabel>
          <ul className="flex flex-col gap-2.5">
            {past.map((b) => {
              const completed = b.status === "completed";
              const rating = ratingFor.get(b.id);
              const needsRating = completed && rating == null;
              const detail = completed
                ? [`₱${b.price}`, PAYMENT_METHOD_LABEL[b.payment_method ?? ""]]
                    .filter(Boolean)
                    .join(" · ")
                : (ENDED_LABEL[b.status] ?? b.status);

              return (
                <li key={b.id}>
                  <Link
                    href={`/customer/bookings/${b.id}`}
                    className={cn(
                      "flex items-center justify-between gap-3 rounded-lg border-[1.5px] p-3.5 transition-colors hover:bg-muted",
                      needsRating ? "border-outline" : "border-border",
                    )}
                  >
                    <span className="flex min-w-0 flex-col gap-0.5">
                      <span className="truncate text-base font-semibold">
                        {serviceName.get(b.service_id ?? "") ?? "Service"} ·{" "}
                        {barberName.get(b.barber_id) ?? "Barber"}
                      </span>
                      <span className="text-[13px] text-muted-foreground">
                        {formatShortDate(b.requested_at)} · {detail}
                      </span>
                    </span>
                    {needsRating ? (
                      <Badge variant="outline" className="h-6 shrink-0 px-2">
                        RATE
                      </Badge>
                    ) : rating != null ? (
                      <span className="shrink-0 text-[13px] text-muted-foreground">
                        ★ {Number(rating).toFixed(1)}
                      </span>
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {lastBarberId && (
        <Button
          variant="outline"
          size="lg"
          className="mt-auto h-12 text-[15px]"
          nativeButton={false}
          render={<Link href={`/customer/barbers/${lastBarberId}`} />}
        >
          Book again with {barberName.get(lastBarberId) ?? "your barber"}
        </Button>
      )}
    </div>
  );
}
