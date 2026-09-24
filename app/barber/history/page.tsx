import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/supabase/require-profile";
import { formatPeso, formatShortDate, PAYMENT_METHOD_LABEL } from "@/lib/format";
import { MarkPaidButton } from "@/components/barber/mark-paid-button";
import { ReportProblemDialog } from "@/components/report-problem-dialog";
import { Card, DOTTED_GROUND, StatusPill } from "@/components/customer/ui";
import { cn } from "@/lib/utils";

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
    <div className={cn("flex min-h-0 flex-1 flex-col", DOTTED_GROUND)}>
      <div className="mx-auto flex w-full max-w-[720px] flex-col gap-4 px-4 py-4 pb-8 lg:py-8">
        <div className="flex items-baseline justify-between gap-3">
          <h1 className="text-[23px] font-extrabold tracking-[-0.02em]">History</h1>
          <p className="text-[13.5px] text-[#6a635a]">
            {rows.length} done · {formatPeso(totalEarned)} earned
          </p>
        </div>

        {rows.length === 0 && (
          <p className="text-[13.5px] text-[#6a635a]">Completed jobs will show up here.</p>
        )}

        <ul className="flex flex-col gap-2.5">
          {rows.map((b) => {
            const review = reviewByBooking.get(b.id);
            const cashDue = b.payment_method === "cod" && b.payment_status !== "paid";
            return (
              <li key={b.id}>
                <Card className="flex flex-col gap-2 p-3.5">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="truncate text-[15px] font-bold">
                      {serviceName.get(b.service_id ?? "") ?? "Service"} ·{" "}
                      {customerName.get(b.customer_id) ?? "Customer"}
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      {/* Was an either/or with the rating — a reviewed-but-
                          unpaid cash job hid the one badge that says money
                          is still owed. */}
                      {cashDue && <StatusPill tone="bad">Unpaid</StatusPill>}
                      {review && (
                        <span className="text-[13px] font-semibold">
                          ★ {Number(review.rating).toFixed(1)}
                        </span>
                      )}
                    </span>
                  </div>
                  <span className="text-[12.5px] text-faint">
                    {formatShortDate(b.completed_at ?? b.updated_at)} · ₱{b.price} ·{" "}
                    {PAYMENT_METHOD_LABEL[b.payment_method ?? ""] ?? "—"} · you earned ₱
                    {b.barber_payout}
                  </span>
                  {review?.comment && (
                    <p className="text-[13.5px] text-[#4c463d]">&ldquo;{review.comment}&rdquo;</p>
                  )}
                  <div className="flex flex-wrap items-center gap-2">
                    {cashDue && <MarkPaidButton bookingId={b.id} className="h-9 text-sm" />}
                    <ReportProblemDialog bookingId={b.id} raisedBy={user.id} variant="link" />
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
