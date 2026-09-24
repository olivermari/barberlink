import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/supabase/require-profile";
import { formatDayTime, formatPeso, manilaYear, nowMs, PAYMENT_METHOD_LABEL } from "@/lib/format";
import { CHOSEN_BARBER_SURCHARGE } from "@/lib/pricing";
import { MobileHeader, Photo, Segmented, SegLink, StatusPill } from "@/components/customer/ui";
import { ReceiptPanel, type ReceiptView } from "@/components/customer/receipt-panel";
import { ReportProblemDialog } from "@/components/report-problem-dialog";
import { cn } from "@/lib/utils";

const ACTIVE = ["queued", "pending", "accepted", "on_the_way", "in_service"];

const TABS = [
  { value: "completed", label: "Completed", statuses: ["completed"] },
  // Same-day bookings only — "upcoming" is whatever is still in flight.
  { value: "upcoming", label: "Upcoming", statuses: ACTIVE },
  { value: "cancelled", label: "Cancelled", statuses: ["cancelled", "declined"] },
] as const;

const PAGE = 20;

const ACTIVE_LABEL: Record<string, string> = {
  queued: "In queue",
  pending: "Requested",
  accepted: "Accepted",
  on_the_way: "On the way",
  in_service: "In progress",
};

function pillFor(status: string) {
  if (status === "completed") return { tone: "ok" as const, label: "Completed" };
  if (status === "cancelled") return { tone: "bad" as const, label: "Cancelled" };
  if (status === "declined") return { tone: "bad" as const, label: "Declined" };
  return { tone: "quiet" as const, label: ACTIVE_LABEL[status] ?? status };
}

// Customer UI History (mobile) and W4 (web): a dark header with the year's
// numbers, three filters, and the bookings — price and status right-aligned
// so the column scans. Selecting a booking opens its receipt in the rail on
// web (no navigation) and full-screen on phones.
export default async function CustomerHistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; b?: string; more?: string }>;
}) {
  const { tab: tabParam, b, more } = await searchParams;
  const tab = TABS.find((t) => t.value === tabParam) ?? TABS[0];
  const { user } = await requireProfile();
  const supabase = await createClient();

  const { data: rows } = await supabase
    .from("bookings")
    .select(
      "id, requested_at, completed_at, status, price, barber_id, service_id, payment_method, payment_status, dispatch_mode, address_text",
    )
    .eq("customer_id", user.id)
    .order("requested_at", { ascending: false });
  const all = rows ?? [];

  const thisYear = manilaYear(new Date(nowMs()).toISOString());
  const doneThisYear = all.filter(
    (r) => r.status === "completed" && manilaYear(r.completed_at ?? r.requested_at) === thisYear,
  );
  const spent = doneThisYear.reduce((sum, r) => sum + Number(r.price), 0);

  const inTab = all.filter((r) => (tab.statuses as readonly string[]).includes(r.status));
  const shown = more === "1" ? inTab : inTab.slice(0, PAGE);
  // The receipt shows the requested booking, else the first in the list.
  const selected = all.find((r) => r.id === b) ?? shown[0] ?? null;

  const barberIds = [...new Set(all.map((r) => r.barber_id))];
  const serviceIds = [...new Set(all.map((r) => r.service_id).filter(Boolean))] as string[];
  const completedIds = all.filter((r) => r.status === "completed").map((r) => r.id);
  const [{ data: barbers }, { data: services }, { data: reviews }] = await Promise.all([
    barberIds.length
      ? supabase.from("profiles").select("id, full_name, avatar_url").in("id", barberIds)
      : Promise.resolve({ data: [] as { id: string; full_name: string | null; avatar_url: string | null }[] }),
    serviceIds.length
      ? supabase.from("services").select("id, name").in("id", serviceIds)
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
    completedIds.length
      ? supabase.from("reviews").select("booking_id, rating, comment").in("booking_id", completedIds)
      : Promise.resolve({ data: [] as { booking_id: string; rating: number; comment: string | null }[] }),
  ]);
  const barberById = new Map((barbers ?? []).map((x) => [x.id, x]));
  const serviceName = new Map((services ?? []).map((s) => [s.id, s.name]));
  const reviewFor = new Map((reviews ?? []).map((r) => [r.booking_id, r]));

  function receiptFor(r: (typeof all)[number]): ReceiptView {
    const barber = barberById.get(r.barber_id);
    const total = Number(r.price);
    const chosenFee = r.dispatch_mode === "chosen" ? CHOSEN_BARBER_SURCHARGE : 0;
    const review = reviewFor.get(r.id);
    return {
      id: r.id,
      barberId: r.barber_id,
      barberName: barber?.full_name ?? "Barber",
      barberAvatarUrl: barber?.avatar_url ?? null,
      when: formatDayTime(r.completed_at ?? r.requested_at),
      serviceName: serviceName.get(r.service_id ?? "") ?? "Service",
      servicePrice: total - chosenFee,
      chosenFee,
      method: PAYMENT_METHOD_LABEL[r.payment_method ?? ""] ?? "—",
      total,
      address: r.address_text,
      refunded: r.payment_status === "refunded",
      review: review ? { rating: review.rating, comment: review.comment } : null,
    };
  }

  const receipt = selected ? receiptFor(selected) : null;
  const reportSlot = selected ? (
    <ReportProblemDialog bookingId={selected.id} raisedBy={user.id} variant="ink" />
  ) : null;
  const tabHref = (t: string) => `/customer/history?tab=${t}`;

  const list =
    shown.length === 0 ? (
      <div className="flex flex-col items-start gap-3 rounded-[14px] border border-line bg-white p-4">
        <p className="text-base font-bold">
          {tab.value === "completed"
            ? "Nothing here yet"
            : tab.value === "upcoming"
              ? "Nothing in progress"
              : "No cancelled bookings"}
        </p>
        <p className="text-sm text-[#6a635a]">
          {tab.value === "completed"
            ? "Finished bookings show up here once you have one."
            : tab.value === "upcoming"
              ? "Book a barber and follow them from the Track tab."
              : "Cancelled and declined bookings would show up here."}
        </p>
        <Link href="/customer" className="text-sm font-bold text-primary">
          Find a barber
        </Link>
      </div>
    ) : (
      <ul className="flex flex-col gap-[11px]">
        {shown.map((r) => {
          const barber = barberById.get(r.barber_id);
          const pill = pillFor(r.status);
          const isActive = ACTIVE.includes(r.status);
          const on = selected?.id === r.id;
          const when = formatDayTime(r.completed_at ?? r.requested_at);
          return (
            <li key={r.id}>
              <Link
                href={isActive ? "/customer/track" : `/customer/history?tab=${tab.value}&b=${r.id}`}
                className={cn(
                  "flex items-center gap-3 rounded-[14px] border bg-white p-[13px] transition-colors hover:bg-wash lg:gap-[13px] lg:rounded-[13px] lg:p-3.5",
                  "border-line",
                  on && "lg:border-foreground",
                )}
              >
                <Photo
                  src={barber?.avatar_url}
                  name={barber?.full_name}
                  square
                  className="size-[46px] rounded-[11px] lg:size-11"
                />
                <span className="flex min-w-0 flex-1 flex-col gap-[3px] lg:gap-0.5">
                  <span className="truncate text-[15px] font-bold">
                    {serviceName.get(r.service_id ?? "") ?? "Service"}
                  </span>
                  <span className="truncate text-[13px] text-[#6a635a]">
                    {barber?.full_name ?? "Barber"}
                    <span className="hidden lg:inline"> · {when}</span>
                  </span>
                  <span className="text-[12.5px] text-faint lg:hidden">{when}</span>
                </span>
                <span className="flex flex-col items-end gap-1.5 lg:flex-row lg:items-center lg:gap-3">
                  <span className="text-base font-extrabold">{formatPeso(Number(r.price))}</span>
                  <StatusPill tone={pill.tone}>{pill.label}</StatusPill>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    );

  const tabs = (
    <Segmented className="bg-white shadow-[0_8px_20px_rgba(22,19,15,0.09)]">
      {TABS.map((t) => (
        <SegLink
          key={t.value}
          href={tabHref(t.value)}
          active={t.value === tab.value}
          className="px-2 py-2.5 text-[13.5px] lg:px-4 lg:py-[9px] lg:text-sm"
        >
          {t.label}
        </SegLink>
      ))}
    </Segmented>
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col lg:grid lg:grid-cols-[minmax(0,1fr)_400px] lg:bg-wash lg:[background-image:radial-gradient(#e2dbcb_1px,transparent_1.2px)] lg:[background-size:15px_15px]">
      <div className="flex min-w-0 flex-col lg:overflow-y-auto">
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4 bg-foreground px-[18px] pt-2.5 pb-[26px] text-white lg:px-6 lg:pt-5 lg:pb-[34px]">
          <h1 className="w-full text-[22px] font-extrabold tracking-[-0.02em] lg:w-auto lg:text-[26px]">History</h1>
          <div className="flex w-full lg:w-auto lg:gap-[26px]">
            <div className="flex flex-1 flex-col gap-0.5 lg:flex-none">
              <span className="text-[11.5px] text-[#a49c90]">This year</span>
              <span className="text-[25px] font-extrabold tracking-[-0.02em] lg:text-[23px]">
                {doneThisYear.length} cut{doneThisYear.length === 1 ? "" : "s"}
              </span>
            </div>
            <div className="flex flex-1 flex-col gap-0.5 border-l border-[#3a342c] pl-5 lg:flex-none lg:pl-[26px]">
              <span className="text-[11.5px] text-[#a49c90]">Spent</span>
              <span className="text-[25px] font-extrabold tracking-[-0.02em] lg:text-[23px]">{formatPeso(spent)}</span>
            </div>
          </div>
        </div>
        <div className="-mt-3.5 flex flex-col gap-[15px] px-[18px] pb-4 lg:-mt-5 lg:px-6 lg:pb-[22px]">
          <div className="flex lg:justify-end [&>div]:flex-1 lg:[&>div]:flex-none">{tabs}</div>
          {list}
          {inTab.length > shown.length && (
            <Link
              href={`/customer/history?tab=${tab.value}&more=1`}
              className="rounded-[13px] border border-dashed border-[#ddd6c7] bg-white p-3.5 text-center text-sm font-semibold text-faint transition-colors hover:bg-wash"
            >
              Load older bookings
            </Link>
          )}
        </div>
      </div>

      {/* Web: receipt rail */}
      <aside className="hidden flex-col border-l border-line-soft bg-white px-5 py-[22px] lg:flex lg:overflow-y-auto">
        {receipt ? (
          <ReceiptPanel receipt={receipt} reportSlot={reportSlot} />
        ) : (
          <p className="text-sm text-[#6a635a]">Select a booking to see its receipt.</p>
        )}
      </aside>

      {/* Phone: the receipt opens full-screen once a booking is chosen */}
      {b && receipt && (
        <div className="fixed inset-0 z-[60] flex flex-col overflow-y-auto bg-white lg:hidden">
          <MobileHeader title="Receipt" backHref={tabHref(tab.value)} />
          <div className="px-[18px] pb-8">
            <ReceiptPanel receipt={receipt} reportSlot={reportSlot} />
          </div>
        </div>
      )}
    </div>
  );
}
