import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatAgo, formatArea, formatPesoCompact, manilaDayStart, nowMs } from "@/lib/format";
import { readSettings } from "@/lib/platform-settings";
import { cn } from "@/lib/utils";
import { OpsMap } from "@/components/admin/ops-map-lazy";
import { Button } from "@/components/ui/button";
import { SectionLabel } from "@/components/ui/section-label";

const RANGES = [
  { value: "today", label: "Today", days: 0 },
  { value: "7d", label: "7 days", days: 6 },
  { value: "30d", label: "30 days", days: 29 },
] as const;

const ACTIVE_STATUSES = ["pending", "accepted", "on_the_way", "in_service"];

type Point = { lat: number; lng: number };

function plural(n: number, word: string) {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

// Wireframes A1 (web) and A4 (phone). Dispatch platforms fail at the
// supply edge, so this leads with unmatched demand rather than revenue.
export default async function AdminLiveOpsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const { range: rangeParam } = await searchParams;
  const range = RANGES.find((r) => r.value === rangeParam) ?? RANGES[0];
  const since = manilaDayStart(range.days);
  const now = nowMs();
  const supabase = await createClient();
  const settings = await readSettings(supabase);

  const [
    { count: activeCount },
    { count: queuedCount },
    { data: onlineBarbers },
    { data: expired },
    { data: commissionRows },
    { data: openDisputes },
    { count: pendingCount },
    { count: pendingToday },
    { count: lowWallets },
    { data: demand },
  ] = await Promise.all([
    supabase
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .in("status", ACTIVE_STATUSES),
    supabase.from("bookings").select("id", { count: "exact", head: true }).eq("status", "queued"),
    supabase
      .from("barber_profiles")
      .select("current_lat, current_lng")
      .eq("is_available", true)
      .eq("verification_status", "verified"),
    supabase
      .from("bookings")
      .select("requested_at, address_text")
      .eq("status", "declined")
      .eq("decline_reason", "timeout")
      .gte("requested_at", since)
      .order("requested_at", { ascending: false }),
    supabase
      .from("bookings")
      .select("platform_fee")
      .eq("status", "completed")
      .eq("payment_status", "paid")
      .gte("completed_at", since),
    supabase
      .from("disputes")
      .select("created_at")
      .in("status", ["open", "investigating"])
      .order("created_at", { ascending: true }),
    supabase
      .from("barber_profiles")
      .select("id", { count: "exact", head: true })
      .eq("verification_status", "pending"),
    supabase
      .from("barber_profiles")
      .select("id", { count: "exact", head: true })
      .eq("verification_status", "pending")
      .gte("created_at", manilaDayStart()),
    supabase
      .from("barber_profiles")
      .select("id", { count: "exact", head: true })
      .lt("token_balance", settings.min_wallet_to_go_online),
    supabase
      .from("bookings")
      .select("address_lat, address_lng, status, decline_reason")
      .gte("requested_at", since)
      .limit(500),
  ]);

  const barberPoints: Point[] = (onlineBarbers ?? [])
    .filter((b) => b.current_lat != null && b.current_lng != null)
    .map((b) => ({ lat: b.current_lat, lng: b.current_lng }));
  const requestPoints = (demand ?? [])
    .filter((d) => d.address_lat != null && d.address_lng != null)
    .map((d) => ({
      lat: d.address_lat,
      lng: d.address_lng,
      expired: d.status === "declined" && d.decline_reason === "timeout",
    }));

  const expiredCount = expired?.length ?? 0;
  const disputeCount = openDisputes?.length ?? 0;
  const commission = (commissionRows ?? []).reduce((sum, r) => sum + Number(r.platform_fee), 0);
  const latestExpired = expired?.[0];
  const oldestDispute = openDisputes?.[0];

  const attention = [
    expiredCount > 0 && {
      href: "/admin/bookings?tab=expired",
      urgent: true,
      title: `${plural(expiredCount, "request")} expired unanswered`,
      detail: latestExpired
        ? `Latest ${formatAgo(latestExpired.requested_at, now)} · ${formatArea(latestExpired.address_text)}`
        : "",
    },
    disputeCount > 0 && {
      href: "/admin/disputes",
      urgent: true,
      title: `${plural(disputeCount, "open dispute")}`,
      detail: oldestDispute ? `Oldest opened ${formatAgo(oldestDispute.created_at, now)}` : "",
    },
    (pendingCount ?? 0) > 0 && {
      href: "/admin/barbers",
      urgent: false,
      title: `${plural(pendingCount ?? 0, "barber")} awaiting verification`,
      detail: `${pendingToday ?? 0} submitted today`,
    },
    (lowWallets ?? 0) > 0 && {
      href: "/admin/barbers?tab=wallet",
      urgent: false,
      title: `${plural(lowWallets ?? 0, "wallet")} below ₱${settings.min_wallet_to_go_online}`,
      detail: "Blocked from going online",
    },
  ].filter(Boolean) as { href: string; urgent: boolean; title: string; detail: string }[];

  const kpis = [
    { label: "Active jobs", value: String(activeCount ?? 0) },
    { label: "Barbers online", value: String(barberPoints.length) },
    { label: "Queued", value: String(queuedCount ?? 0) },
    { label: "Unmatched", value: String(expiredCount), urgent: expiredCount > 0 },
    {
      label: range.value === "today" ? "Commission today" : `Commission · ${range.label}`,
      value: formatPesoCompact(commission),
      desktopOnly: true,
    },
  ];

  return (
    <div className="flex flex-col gap-4 p-4 sm:gap-[18px] sm:p-[22px]">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="text-[25px] font-black">Live ops</h1>
        <nav aria-label="Range" className="flex gap-2 text-[13px]">
          {RANGES.map((r) => (
            <Link
              key={r.value}
              href={r.value === "today" ? "/admin" : `/admin?range=${r.value}`}
              aria-current={r.value === range.value ? "page" : undefined}
              className={cn(
                "rounded-[5px] px-3 py-2",
                r.value === range.value
                  ? "border-[1.5px] border-outline font-semibold"
                  : "border-[1.5px] border-border text-muted-foreground hover:text-foreground",
              )}
            >
              {r.label}
            </Link>
          ))}
        </nav>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fit,minmax(150px,1fr))]">
        {kpis.map((k) => (
          <div
            key={k.label}
            className={cn(
              "flex flex-col gap-1 rounded-lg border-[1.5px] border-outline p-3.5",
              k.desktopOnly && "hidden sm:flex",
            )}
          >
            <SectionLabel>{k.label}</SectionLabel>
            <span className={cn("text-[29px] leading-tight font-black", k.urgent && "text-primary")}>
              {k.value}
            </span>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3.5 lg:grid lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <div className="relative isolate h-[220px] overflow-hidden rounded-lg border border-input bg-placeholder max-lg:order-2 lg:h-[300px]">
          <OpsMap barbers={barberPoints} requests={requestPoints} />
          <div className="absolute bottom-2 left-2 z-[500] flex flex-wrap gap-3 rounded-md bg-background/90 px-2.5 py-1.5 text-xs">
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-foreground" aria-hidden /> Online barber
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-primary/30" aria-hidden /> Request
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-primary/70" aria-hidden /> Expired
            </span>
          </div>
        </div>

        <section className="flex min-w-0 flex-col gap-3 rounded-lg border-[1.5px] border-outline p-4 max-lg:order-1">
          <SectionLabel>Needs attention</SectionLabel>
          {attention.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing needs you right now.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {attention.map((item) => (
                <li key={item.title}>
                  <Link
                    href={item.href}
                    className={cn(
                      "flex flex-col gap-0.5 border-l-[3px] pl-3 hover:bg-muted",
                      item.urgent ? "border-primary" : "border-input",
                    )}
                  >
                    <span className="text-[15px] font-semibold">{item.title}</span>
                    {item.detail && (
                      <span className="text-[13px] text-muted-foreground">{item.detail}</span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <Button
            className="mt-auto h-11"
            nativeButton={false}
            render={<Link href="/admin/barbers" />}
          >
            Open the queue
          </Button>
        </section>
      </div>
    </div>
  );
}
