import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/supabase/require-profile";
import { formatDateTime, formatPeso, manilaDayStart } from "@/lib/format";
import { cn } from "@/lib/utils";
import { WalletTopupForm } from "@/components/barber/wallet-topup-form";
import { SectionLabel } from "@/components/ui/section-label";

type LedgerEntry = {
  id: string;
  type: string;
  token_amount: number;
  created_at: string;
  booking_id: string | null;
};

const RANGES = [
  { value: "week", label: "Week", days: 6 },
  { value: "month", label: "Month", days: 29 },
] as const;

function describe(entry: LedgerEntry, service: string | undefined) {
  const job = service ?? "job";
  switch (entry.type) {
    case "earned":
      return { title: `Job completed · ${job}`, detail: "GCash" };
    case "tip":
      return { title: `Tip · ${job}`, detail: "GCash" };
    case "withdrawal":
      return { title: "Withdrawal", detail: null };
    case "adjustment":
      if (entry.token_amount < 0) return { title: `Platform commission · ${job}`, detail: "cash job" };
      return entry.booking_id
        ? { title: "Adjustment", detail: null }
        : { title: "Wallet top-up", detail: "GCash" };
    default:
      return { title: entry.type, detail: null };
  }
}

// Wireframe B4: one ledger, both directions — earnings and commission
// read as a single running balance.
export default async function BarberEarningsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const { range: rangeParam } = await searchParams;
  const range = RANGES.find((r) => r.value === rangeParam) ?? RANGES[0];
  const { user } = await requireProfile();
  const supabase = await createClient();

  const [{ data: barber }, { data: ledgerRows }, { data: commissions }, { data: pendingTopups }] =
    await Promise.all([
      supabase.from("barber_profiles").select("token_balance").eq("id", user.id).single(),
      supabase
        .from("token_ledger")
        .select("id, type, token_amount, created_at, booking_id")
        .eq("barber_id", user.id)
        .gte("created_at", manilaDayStart(range.days))
        .order("created_at", { ascending: false }),
      supabase
        .from("token_ledger")
        .select("token_amount")
        .eq("barber_id", user.id)
        .eq("type", "adjustment")
        .lt("token_amount", 0)
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("wallet_topups")
        .select("id, amount, created_at")
        .eq("barber_id", user.id)
        .eq("status", "pending")
        .gte("created_at", manilaDayStart(6))
        .order("created_at", { ascending: false }),
    ]);

  const ledger = (ledgerRows as LedgerEntry[] | null) ?? [];
  const bookingIds = [...new Set(ledger.map((e) => e.booking_id).filter(Boolean))] as string[];
  const { data: bookings } = bookingIds.length
    ? await supabase.from("bookings").select("id, service_id").in("id", bookingIds)
    : { data: [] as { id: string; service_id: string | null }[] };
  const serviceIds = [...new Set((bookings ?? []).map((b) => b.service_id).filter(Boolean))] as string[];
  const { data: services } = serviceIds.length
    ? await supabase.from("services").select("id, name").in("id", serviceIds)
    : { data: [] as { id: string; name: string }[] };

  const serviceNameById = new Map((services ?? []).map((s) => [s.id, s.name]));
  const serviceForBooking = new Map(
    (bookings ?? []).map((b) => [b.id, serviceNameById.get(b.service_id ?? "")]),
  );

  const balance = Number(barber?.token_balance ?? 0);
  const recentCommissions = (commissions ?? []).map((c) => Math.abs(Number(c.token_amount)));
  const avgCommission = recentCommissions.length
    ? recentCommissions.reduce((a, b) => a + b, 0) / recentCommissions.length
    : 0;
  const jobsLeft = avgCommission > 0 ? Math.floor(balance / avgCommission) : null;

  const walletCopy =
    balance < 0
      ? `You owe ₱${Math.abs(balance)} in commission from cash jobs. Top up to go online again.`
      : jobsLeft != null
        ? `About ${jobsLeft} more cash job${jobsLeft === 1 ? "" : "s"} before you need to top up. You can't go online at a negative balance.`
        : "Cash jobs draw the platform's commission from here. You can't go online at a negative balance.";

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 p-4 sm:p-6">
      <h1 className="text-[23px] font-black">Earnings</h1>

      <section className="flex flex-col gap-2.5 rounded-lg border-2 border-primary p-4">
        <div className="flex items-baseline justify-between gap-3">
          <SectionLabel>Token wallet</SectionLabel>
          <span className="text-right text-[13px] text-muted-foreground">
            Commission is drawn from here
          </span>
        </div>
        <p className={cn("text-[42px] leading-none font-black", balance < 0 && "text-destructive")}>
          {formatPeso(balance)}
        </p>
        <p className="text-sm leading-snug text-ink-soft">{walletCopy}</p>
        <WalletTopupForm />
      </section>

      <section className="flex flex-col gap-1">
        <div className="flex items-center justify-between gap-3">
          <SectionLabel>Ledger</SectionLabel>
          <nav aria-label="Ledger range" className="flex gap-1">
            {RANGES.map((r) => (
              <Link
                key={r.value}
                href={r.value === "week" ? "/barber/earnings" : `/barber/earnings?range=${r.value}`}
                aria-current={r.value === range.value ? "page" : undefined}
                className={cn(
                  "rounded-[5px] px-2.5 py-1 text-[13px]",
                  r.value === range.value
                    ? "bg-foreground font-semibold text-background"
                    : "text-muted-foreground hover:bg-muted",
                )}
              >
                {r.label}
              </Link>
            ))}
          </nav>
        </div>

        <ul className="flex flex-col divide-y divide-border">
          {(pendingTopups ?? []).map((t) => (
            <li key={t.id} className="flex items-center justify-between gap-3 py-3">
              <div className="flex min-w-0 flex-col gap-0.5">
                <span className="truncate text-[15px] font-semibold">Wallet top-up · GCash</span>
                <span className="text-[13px] text-muted-foreground">
                  {formatDateTime(t.created_at)} · waiting for GCash to confirm
                </span>
              </div>
              <span className="shrink-0 text-[15px] font-bold text-muted-foreground">
                +{formatPeso(Number(t.amount))}
              </span>
            </li>
          ))}
          {ledger.map((entry) => {
            const amount = Number(entry.token_amount);
            const { title, detail } = describe(
              entry,
              entry.booking_id ? serviceForBooking.get(entry.booking_id) : undefined,
            );
            return (
              <li key={entry.id} className="flex items-center justify-between gap-3 py-3">
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="truncate text-[15px] font-semibold">{title}</span>
                  <span className="text-[13px] text-muted-foreground">
                    {formatDateTime(entry.created_at)}
                    {detail && ` · ${detail}`}
                  </span>
                </div>
                <span className="shrink-0 text-[15px] font-bold">
                  {amount < 0 ? "−" : "+"}
                  {formatPeso(Math.abs(amount))}
                </span>
              </li>
            );
          })}
        </ul>
        {ledger.length === 0 && (pendingTopups ?? []).length === 0 && (
          <p className="py-3 text-sm text-muted-foreground">
            Nothing in the last {range.value === "week" ? "7" : "30"} days. Earnings, commission
            and top-ups show up here.
          </p>
        )}
      </section>
    </div>
  );
}
