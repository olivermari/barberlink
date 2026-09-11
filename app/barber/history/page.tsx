import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/supabase/require-profile";
import { formatPeso, formatShortDate, PAYMENT_METHOD_LABEL } from "@/lib/format";
import { MarkPaidButton } from "@/components/barber/mark-paid-button";
import { ReportProblemDialog } from "@/components/report-problem-dialog";
import { Badge } from "@/components/ui/badge";

export default async function BarberHistoryPage() {
  const { user } = await requireProfile();
  const supabase = await createClient();

  const { data: bookings } = await supabase
    .from("bookings")
    .select(
      "id, completed_at, updated_at, address_text, price, barber_payout, customer_id, service_id, payment_method, payment_status",
    )
    .eq("barber_id", user.id)
    .eq("status", "completed")
    .order("completed_at", { ascending: false, nullsFirst: false });

  const rows = bookings ?? [];
  const customerIds = [...new Set(rows.map((b) => b.customer_id))];
  const serviceIds = [
    ...new Set(rows.map((b) => b.service_id).filter(Boolean)),
  ] as string[];
  const bookingIds = rows.map((b) => b.id);

  const [{ data: customers }, { data: services }, { data: reviews }] =
    await Promise.all([
      customerIds.length
        ? supabase.from("profiles").select("id, full_name").in("id", customerIds)
        : Promise.resolve({ data: [] as { id: string; full_name: string | null }[] }),
      serviceIds.length
        ? supabase.from("services").select("id, name").in("id", serviceIds)
        : Promise.resolve({ data: [] as { id: string; name: string }[] }),
      bookingIds.length
        ? supabase
            .from("reviews")
            .select("booking_id, rating, comment")
            .in("booking_id", bookingIds)
        : Promise.resolve(
            { data: [] as { booking_id: string; rating: number; comment: string | null }[] },
          ),
    ]);

  const customerName = new Map((customers ?? []).map((c) => [c.id, c.full_name]));
  const serviceName = new Map((services ?? []).map((s) => [s.id, s.name]));
  const reviewByBooking = new Map((reviews ?? []).map((r) => [r.booking_id, r]));

  const totalEarned = rows.reduce((sum, b) => sum + Number(b.barber_payout), 0);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 p-4 sm:p-6">
      <div className="flex items-baseline justify-between gap-3">
        <h1 className="text-[23px] font-black">History</h1>
        <p className="text-sm text-muted-foreground">
          {rows.length} done · {formatPeso(totalEarned)} earned
        </p>
      </div>

      {rows.length === 0 && (
        <p className="text-sm text-muted-foreground">Completed jobs will show up here.</p>
      )}

      <ul className="flex flex-col gap-2.5">
        {rows.map((b) => {
          const review = reviewByBooking.get(b.id);
          const cashDue = b.payment_method === "cod" && b.payment_status !== "paid";
          return (
            <li
              key={b.id}
              className="flex flex-col gap-2 rounded-lg border-[1.5px] border-border p-3.5"
            >
              <div className="flex items-baseline justify-between gap-3">
                <span className="truncate text-base font-semibold">
                  {serviceName.get(b.service_id ?? "") ?? "Service"} ·{" "}
                  {customerName.get(b.customer_id) ?? "Customer"}
                </span>
                {review ? (
                  <span className="shrink-0 text-[13px] text-muted-foreground">
                    ★ {Number(review.rating).toFixed(1)}
                  </span>
                ) : cashDue ? (
                  <Badge variant="outline" className="h-6 shrink-0 px-2">
                    UNPAID
                  </Badge>
                ) : null}
              </div>
              <span className="text-[13px] text-muted-foreground">
                {formatShortDate(b.completed_at ?? b.updated_at)} · ₱{b.price} ·{" "}
                {PAYMENT_METHOD_LABEL[b.payment_method ?? ""] ?? "—"} · you earned ₱
                {b.barber_payout}
              </span>
              {review?.comment && (
                <p className="text-sm text-ink-soft">&ldquo;{review.comment}&rdquo;</p>
              )}
              <div className="flex flex-wrap items-center gap-2">
                {cashDue && <MarkPaidButton bookingId={b.id} className="h-9 text-sm" />}
                <ReportProblemDialog bookingId={b.id} raisedBy={user.id} />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
