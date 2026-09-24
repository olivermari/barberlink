import Link from "next/link";
import { DownloadIcon, XIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  ACTIVE_STATUSES,
  BOOKING_TABS,
  countBookings,
  fetchBookingById,
  fetchBookingNames,
  fetchBookings,
  openDisputeBookingIds,
  parseBookingTab,
  shortBookingId,
  type AdminBookingRow,
} from "@/lib/admin-bookings";
import { formatAgo, formatDateTime, formatPeso, nowMs, PAYMENT_METHOD_LABEL } from "@/lib/format";
import { readSettings } from "@/lib/platform-settings";
import { CHOSEN_BARBER_SURCHARGE } from "@/lib/pricing";
import { cn } from "@/lib/utils";
import { DisputeActions } from "@/components/admin/dispute-actions";
import { Button } from "@/components/ui/button";
import { SectionLabel } from "@/components/ui/section-label";

const STATUS_LABEL: Record<string, string> = {
  pending: "PENDING",
  accepted: "ACCEPTED",
  on_the_way: "ON THE WAY",
  in_service: "IN SERVICE",
  queued: "QUEUED",
  completed: "COMPLETED",
  declined: "DECLINED",
  cancelled: "CANCELLED",
};

const PAYMENT_STATUS_LABEL: Record<string, string> = {
  paid: "Paid",
  pending: "Unpaid",
  failed: "Failed",
  refunded: "Refunded",
};

const DISPUTE_CATEGORY: Record<string, string> = {
  service_quality: "Service quality",
  no_show: "No-show",
  payment_issue: "Payment issue",
  other: "Other",
};

type Tone = "ink" | "red" | "muted";

function statusChip(b: AdminBookingRow, disputed: boolean, now: number): { label: string; tone: Tone } {
  if (disputed) return { label: "DISPUTED", tone: "red" };
  if (b.status === "pending") {
    const minutes = b.pending_since
      ? Math.max(0, Math.floor((now - new Date(b.pending_since).getTime()) / 60_000))
      : null;
    return { label: minutes != null ? `PENDING ${minutes}m` : "PENDING", tone: "red" };
  }
  if (b.status === "declined" && b.decline_reason === "timeout") return { label: "EXPIRED", tone: "red" };
  if (ACTIVE_STATUSES.includes(b.status)) return { label: STATUS_LABEL[b.status], tone: "ink" };
  return { label: STATUS_LABEL[b.status] ?? b.status.toUpperCase(), tone: "muted" };
}

function Chip({ label, tone }: { label: string; tone: Tone }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 w-fit items-center rounded-[3px] px-2 text-[11px] font-bold whitespace-nowrap",
        tone === "ink" && "bg-foreground text-background",
        tone === "red" && "border border-primary text-primary",
        tone === "muted" && "border border-input text-muted-foreground",
      )}
    >
      {label}
    </span>
  );
}

// Wireframe A3: every booking, filterable, with the dispute panel inline
// so resolving one doesn't mean leaving the table.
export default async function AdminBookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; b?: string }>;
}) {
  const params = await searchParams;
  const tab = parseBookingTab(params.tab);
  const now = nowMs();
  const supabase = await createClient();

  const disputedIds = await openDisputeBookingIds(supabase);
  const disputed = new Set(disputedIds);
  const [counts, rows, settings] = await Promise.all([
    Promise.all(BOOKING_TABS.map((t) => countBookings(supabase, t.value, disputedIds))),
    fetchBookings(supabase, tab, disputedIds, 100),
    readSettings(supabase),
  ]);

  const selected = params.b
    ? (rows.find((r) => r.id === params.b) ?? (await fetchBookingById(supabase, params.b)))
    : null;
  const names = await fetchBookingNames(supabase, selected ? [...rows, selected] : rows);

  const [{ data: dispute }, { count: messageCount }] = selected
    ? await Promise.all([
        supabase
          .from("disputes")
          .select("id, category, description, status, resolution_notes, created_at, raised_by")
          .eq("booking_id", selected.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("booking_messages")
          .select("id", { count: "exact", head: true })
          .eq("booking_id", selected.id),
      ])
    : [{ data: null }, { count: 0 }];

  const tabHref = (value: string) => (value === "all" ? "/admin/bookings" : `/admin/bookings?tab=${value}`);
  const rowHref = (id: string) => `/admin/bookings?${new URLSearchParams({ tab, b: id }).toString()}`;
  const person = (id: string) => names.person.get(id) ?? "Unnamed";
  const serviceName = (b: AdminBookingRow) => names.service.get(b.service_id ?? "") ?? "Service";
  const payment = (b: AdminBookingRow) =>
    `${PAYMENT_METHOD_LABEL[b.payment_method ?? ""] ?? "—"} ${formatPeso(Number(b.price))}`;

  return (
    <div className="flex flex-1 flex-col lg:grid lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="flex min-w-0 flex-col gap-4 p-4 sm:p-[22px] lg:border-r lg:border-border">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h1 className="text-[25px] font-black">Bookings</h1>
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={<a href={`/admin/bookings/export?tab=${tab}`} />}
          >
            <DownloadIcon />
            Export
          </Button>
        </div>

        <nav aria-label="Booking status" className="-mx-4 flex gap-2 overflow-x-auto px-4 text-[13px] sm:mx-0 sm:px-0">
          {BOOKING_TABS.map((t, i) => (
            <Link
              key={t.value}
              href={tabHref(t.value)}
              aria-current={t.value === tab ? "page" : undefined}
              className={cn(
                "shrink-0 rounded-[5px] px-3 py-2",
                t.value === tab
                  ? "border-2 border-primary font-bold"
                  : "border-[1.5px] border-border text-muted-foreground hover:text-foreground",
              )}
            >
              {t.label} {counts[i].toLocaleString("en-US")}
            </Link>
          ))}
        </nav>

        <div className="overflow-hidden rounded-lg border-[1.5px] border-outline">
          <div className="hidden grid-cols-[84px_minmax(0,1.2fr)_minmax(0,1.2fr)_minmax(0,1fr)_128px_minmax(0,0.9fr)] gap-3 border-b-[1.5px] border-outline bg-muted px-3.5 py-2.5 text-xs font-bold tracking-[0.1em] text-muted-foreground uppercase md:grid">
            <span>ID</span>
            <span>Customer</span>
            <span>Barber</span>
            <span>Service</span>
            <span>Status</span>
            <span>Payment</span>
          </div>
          {rows.length === 0 ? (
            <p className="px-3.5 py-6 text-sm text-muted-foreground">No bookings here.</p>
          ) : (
            <ul>
              {rows.map((b) => {
                const chip = statusChip(b, disputed.has(b.id), now);
                return (
                  <li key={b.id} className="border-b border-border last:border-b-0">
                    <Link
                      href={rowHref(b.id)}
                      scroll={false}
                      aria-current={b.id === selected?.id ? "true" : undefined}
                      className={cn(
                        "grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1 px-3.5 py-3 text-sm transition-colors md:grid-cols-[84px_minmax(0,1.2fr)_minmax(0,1.2fr)_minmax(0,1fr)_128px_minmax(0,0.9fr)] md:items-center",
                        b.id === selected?.id ? "bg-primary/5" : "hover:bg-muted",
                      )}
                    >
                      <span className="font-mono text-xs text-muted-foreground max-md:hidden">
                        {shortBookingId(b.id)}
                      </span>
                      <span className="truncate font-semibold md:font-normal">{person(b.customer_id)}</span>
                      <span className="truncate text-muted-foreground max-md:hidden">
                        {person(b.barber_id)}
                      </span>
                      <span className="truncate text-muted-foreground max-md:hidden">{serviceName(b)}</span>
                      <span className="max-md:col-start-2 max-md:row-start-1">
                        <Chip {...chip} />
                      </span>
                      <span className="text-muted-foreground max-md:col-span-2 md:text-foreground">
                        <span className="md:hidden">
                          {serviceName(b)} · {person(b.barber_id)} ·{" "}
                        </span>
                        {payment(b)}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        {rows.length === 100 && (
          <p className="text-xs text-muted-foreground">Showing the latest 100 — export for the full list.</p>
        )}
      </div>

      <aside
        className={cn(
          "flex-col gap-3.5 border-b border-border bg-muted p-4 max-lg:order-first sm:p-[22px] lg:flex lg:border-b-0",
          selected ? "flex" : "hidden",
        )}
      >
        {selected ? (
          <>
            <div className="flex items-center justify-between gap-3">
              <SectionLabel>Booking {shortBookingId(selected.id)}</SectionLabel>
              <Link
                href={tabHref(tab)}
                scroll={false}
                aria-label="Close booking"
                className="rounded-md p-1 text-muted-foreground hover:bg-accent"
              >
                <XIcon className="size-4" />
              </Link>
            </div>
            <Chip {...statusChip(selected, disputed.has(selected.id), now)} />

            {dispute && (
              <section className="flex flex-col gap-2.5 rounded-lg border-2 border-primary bg-background p-3.5">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-[15px] font-bold">
                    Dispute · {DISPUTE_CATEGORY[dispute.category ?? ""] ?? "Report"}
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    Opened {formatAgo(dispute.created_at, now)}
                  </span>
                </div>
                <p className="text-sm text-ink-soft">
                  {person(dispute.raised_by)}: {dispute.description || "No description."}
                </p>
                <dl className="flex flex-col gap-1 text-sm">
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">
                      {PAYMENT_STATUS_LABEL[selected.payment_status] ?? selected.payment_status}
                    </dt>
                    <dd className="font-semibold">{payment(selected)}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">Commission</dt>
                    <dd className="font-semibold">{formatPeso(Number(selected.platform_fee))}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">Chat log</dt>
                    <dd className="font-semibold">
                      {messageCount ?? 0} message{messageCount === 1 ? "" : "s"}
                    </dd>
                  </div>
                </dl>
                <DisputeActions
                  key={`${dispute.id}-${dispute.status}`}
                  disputeId={dispute.id}
                  status={dispute.status}
                  initialNotes={dispute.resolution_notes}
                  paymentMethod={selected.payment_method}
                />
              </section>
            )}

            <dl className="flex flex-col gap-1.5 text-sm">
              {[
                ["Customer", person(selected.customer_id)],
                ["Barber", person(selected.barber_id)],
                ["Service", serviceName(selected)],
                ["Booked via", selected.dispatch_mode === "chosen" ? "Chose barber" : selected.dispatch_mode === "quick" ? "Quick Match" : "—"],
                ["Where", selected.address_text],
                ["Payment", `${PAYMENT_METHOD_LABEL[selected.payment_method ?? ""] ?? "—"} · ${PAYMENT_STATUS_LABEL[selected.payment_status] ?? selected.payment_status}`],
                ["Total", formatPeso(Number(selected.price))],
                ["Commission", formatPeso(Number(selected.platform_fee))],
                ["Barber gets", formatPeso(Number(selected.barber_payout))],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between gap-3">
                  <dt className="shrink-0 text-muted-foreground">{label}</dt>
                  <dd className="min-w-0 truncate text-right font-semibold">{value}</dd>
                </div>
              ))}
            </dl>

            <ol className="flex flex-col gap-1 border-t border-border pt-3 text-[13px] text-muted-foreground">
              {[
                ["Requested", selected.requested_at],
                ["Accepted", selected.accepted_at],
                ["On the way", selected.on_the_way_at],
                ["In service", selected.in_service_at],
                ["Completed", selected.completed_at],
              ]
                .filter(([, at]) => at)
                .map(([label, at]) => (
                  <li key={label} className="flex justify-between gap-3">
                    <span>{label}</span>
                    <span>{formatDateTime(at as string)}</span>
                  </li>
                ))}
            </ol>
          </>
        ) : (
          <>
            <SectionLabel>Pricing & policy</SectionLabel>
            <dl className="flex flex-col gap-2.5 rounded-lg border-[1.5px] border-outline bg-background p-3.5 text-sm">
              {[
                ["Platform commission", "Of the price, not the distance fee", `${settings.fee_percentage}%`],
                ["Choose-your-barber fee", "Added at booking", formatPeso(CHOSEN_BARBER_SURCHARGE)],
                ["Max match radius", "Quick Match ceiling", `${settings.max_match_radius_km} km`],
                [
                  "Distance fee",
                  `Per km beyond ${settings.distance_free_km} km, barber keeps it`,
                  formatPeso(settings.distance_fee_per_km),
                ],
                ["Min wallet to go online", "Blocks lower balances", formatPeso(settings.min_wallet_to_go_online)],
              ].map(([label, hint, value]) => (
                <div key={label} className="flex items-baseline justify-between gap-3">
                  <dt className="flex flex-col">
                    <span className="font-semibold">{label}</span>
                    <span className="text-xs text-muted-foreground">{hint}</span>
                  </dt>
                  <dd className="text-base font-bold">{value}</dd>
                </div>
              ))}
            </dl>
            <Button variant="outline" nativeButton={false} render={<Link href="/admin/pricing" />}>
              Edit settings
            </Button>
          </>
        )}
      </aside>
    </div>
  );
}
