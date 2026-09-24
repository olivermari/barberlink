import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/supabase/require-profile";
import { formatDateTime, formatPeso, manilaDayStart } from "@/lib/format";
import { readSettings } from "@/lib/platform-settings";
import { cn } from "@/lib/utils";
import { WalletCard } from "@/components/barber/wallet-topup-form";
import { DownloadStatement } from "@/components/barber/download-statement";
import { Caption, Card, DOTTED_GROUND, Segmented, SegLink } from "@/components/customer/ui";

type LedgerEntry = {
  id: string;
  type: string;
  token_amount: number;
  created_at: string;
  booking_id: string | null;
};

// One line of the ledger, whatever it came from: the wallet's own rows,
// cash jobs (paid to the barber's hand, so they never touch the wallet),
// and top-ups still waiting on GCash.
type Row = {
  id: string;
  at: string;
  title: string;
  method: string;
  amount: number;
  pending?: boolean;
};

const RANGES = [
  { value: "week", label: "Week", days: 6, noun: "week" },
  { value: "month", label: "Month", days: 29, noun: "month" },
  // Reached from "Load older entries".
  { value: "quarter", label: "90 days", days: 89, noun: "90 days" },
] as const;

// Barber UI B5 (phone) and W2 (web): one ledger running both directions —
// payouts, commission and top-ups read as a single balance.
export default async function BarberEarningsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const { range: rangeParam } = await searchParams;
  const range = RANGES.find((r) => r.value === rangeParam) ?? RANGES[0];
  const { user } = await requireProfile();
  const supabase = await createClient();
  const since = manilaDayStart(range.days);

  const [
    { data: barber },
    { data: ledgerRows },
    { data: commissions },
    { data: pendingTopups },
    { data: jobRows },
    { data: cheapest },
    settings,
  ] = await Promise.all([
    supabase.from("barber_profiles").select("token_balance").eq("id", user.id).single(),
    supabase
      .from("token_ledger")
      .select("id, type, token_amount, created_at, booking_id")
      .eq("barber_id", user.id)
      .gte("created_at", since)
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
    // What the barber actually took home — cash included. The wallet only
    // ever shows the platform's cut, never the job itself.
    supabase
      .from("bookings")
      .select("id, service_id, barber_payout, platform_fee, payment_method, completed_at")
      .eq("barber_id", user.id)
      .eq("status", "completed")
      .gte("completed_at", since)
      .order("completed_at", { ascending: false }),
    supabase
      .from("services")
      .select("price")
      .eq("barber_id", user.id)
      .eq("is_active", true)
      .order("price", { ascending: true })
      .limit(1)
      .maybeSingle(),
    readSettings(supabase),
  ]);

  const ledger = (ledgerRows as LedgerEntry[] | null) ?? [];
  const jobs = jobRows ?? [];
  const serviceIds = [...new Set(jobs.map((j) => j.service_id).filter(Boolean))] as string[];
  const { data: services } = serviceIds.length
    ? await supabase.from("services").select("id, name").in("id", serviceIds)
    : { data: [] as { id: string; name: string }[] };
  const serviceNameById = new Map((services ?? []).map((s) => [s.id, s.name]));
  const jobById = new Map(jobs.map((j) => [j.id, j]));
  const serviceFor = (bookingId: string | null) => {
    const job = bookingId ? jobById.get(bookingId) : undefined;
    return (job && serviceNameById.get(job.service_id ?? "")) || "job";
  };

  const pct = settings.fee_percentage;
  const rows: Row[] = [
    ...(pendingTopups ?? []).map((t) => ({
      id: `topup-${t.id}`,
      at: t.created_at,
      title: "Wallet top-up",
      method: "GCash",
      amount: Number(t.amount),
      pending: true,
    })),
    ...ledger.map((e): Row => {
      const amount = Number(e.token_amount);
      switch (e.type) {
        case "earned":
          return { id: e.id, at: e.created_at, title: `Job completed · ${serviceFor(e.booking_id)}`, method: "GCash", amount };
        case "tip":
          return { id: e.id, at: e.created_at, title: `Tip · ${serviceFor(e.booking_id)}`, method: "GCash", amount };
        case "withdrawal":
          return { id: e.id, at: e.created_at, title: "Withdrawal", method: "Wallet", amount };
        case "adjustment":
          if (amount < 0) {
            return { id: e.id, at: e.created_at, title: `Platform commission ${pct}%`, method: "Wallet", amount };
          }
          return e.booking_id
            ? { id: e.id, at: e.created_at, title: "Adjustment", method: "Wallet", amount }
            : { id: e.id, at: e.created_at, title: "Wallet top-up", method: "GCash", amount };
        default:
          return { id: e.id, at: e.created_at, title: e.type, method: "Wallet", amount };
      }
    }),
    // Cash jobs put the money straight in the barber's hand.
    ...jobs
      .filter((j) => j.payment_method === "cod" && j.completed_at)
      .map((j) => ({
        id: `cash-${j.id}`,
        at: j.completed_at as string,
        title: `Job completed · ${serviceNameById.get(j.service_id ?? "") ?? "job"}`,
        method: "Cash",
        amount: Number(j.barber_payout),
      })),
  ].sort((a, b) => +new Date(b.at) - +new Date(a.at));

  const totalIncome = jobs.reduce((sum, r) => sum + Number(r.barber_payout), 0);
  const totalCommission = jobs.reduce((sum, r) => sum + Number(r.platform_fee), 0);
  const jobCount = jobs.length;
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

  // "How a cash job settles", worked through with the barber's own
  // cheapest service and the platform's real percentage.
  const examplePrice = Number(cheapest?.price ?? 250);
  const exampleFee = Math.round((examplePrice * pct) / 100);

  const hasRows = rows.length > 0;
  const ledgerLabel = range.value === "week" ? "week" : range.value === "month" ? "month" : "quarter";

  return (
    <div className={cn("flex flex-1 flex-col lg:grid lg:min-h-0 lg:grid-cols-[minmax(0,1fr)_380px]", DOTTED_GROUND)}>
      {/* ——— Left: ink band, the range switch and the ledger ——— */}
      <div className="contents lg:flex lg:min-h-0 lg:min-w-0 lg:flex-col lg:overflow-y-auto">
        <div className="flex flex-col gap-[15px] bg-[#16130f] px-[18px] pt-[18px] pb-7 text-white max-lg:order-1 lg:flex-row lg:flex-wrap lg:items-end lg:justify-between lg:gap-6 lg:px-6 lg:pt-5 lg:pb-[34px]">
          <h1 className="text-[22px] font-extrabold tracking-[-0.02em] lg:text-[26px]">Earnings</h1>
          <div className="flex lg:gap-[26px]">
            <div className="flex flex-1 flex-col gap-0.5 lg:flex-none">
              <span className="text-[11.5px] text-[#a49c90]">This {range.noun}</span>
              <span className="text-[25px] font-extrabold tracking-[-0.02em] lg:text-[23px]">
                {formatPeso(totalIncome)}
              </span>
            </div>
            <div className="flex flex-1 flex-col gap-0.5 border-l border-[#3a342c] pl-5 lg:flex-none lg:pl-[26px]">
              <span className="text-[11.5px] text-[#a49c90]">Commission</span>
              <span className="text-[25px] font-extrabold tracking-[-0.02em] lg:text-[23px]">
                {formatPeso(totalCommission)}
              </span>
            </div>
            <div className="hidden flex-col gap-0.5 border-l border-[#3a342c] pl-[26px] lg:flex">
              <span className="text-[11.5px] text-[#a49c90]">Jobs</span>
              <span className="text-[23px] font-extrabold tracking-[-0.02em]">{jobCount}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 px-[18px] pb-6 max-lg:order-3 max-lg:pt-3 lg:-mt-5 lg:gap-3.5 lg:px-6 lg:pb-[22px]">
          <div className="flex items-center justify-between gap-3 lg:justify-end">
            <Caption className="lg:hidden">Ledger</Caption>
            <Segmented className="w-[176px] border-wash-border bg-white p-1 shadow-[0_8px_20px_rgba(22,19,15,0.09)] max-lg:shadow-none">
              {RANGES.slice(0, 2).map((r) => (
                <SegLink
                  key={r.value}
                  href={r.value === "week" ? "/barber/earnings" : `/barber/earnings?range=${r.value}`}
                  active={r.value === range.value || (range.value === "quarter" && r.value === "month")}
                  className="py-2 text-[13.5px]"
                >
                  {r.label}
                </SegLink>
              ))}
            </Segmented>
          </div>

          {hasRows ? (
            <>
              {/* Phone: cards */}
              <Card className="divide-y divide-[#f1ebdf] overflow-hidden lg:hidden">
                {rows.map((r) => (
                  <div key={r.id} className="flex items-center justify-between gap-3 px-3.5 py-3">
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <span className="truncate text-[14.5px] font-semibold">{r.title}</span>
                      <span className="text-[12.5px] text-faint">
                        {formatDateTime(r.at)} · {r.pending ? "waiting for GCash to confirm" : r.method}
                      </span>
                    </div>
                    <Amount value={r.amount} pending={r.pending} className="text-[15px]" />
                  </div>
                ))}
              </Card>
              {/* Web: four columns */}
              <Card className="hidden overflow-hidden lg:block">
                <div className="grid grid-cols-[minmax(0,1.6fr)_1fr_1fr_120px] gap-3 border-b border-[#eee8db] bg-wash px-4 py-[11px] text-[11.5px] font-bold tracking-[0.08em] text-[#6a635a] uppercase">
                  <span>Entry</span>
                  <span>When</span>
                  <span>Method</span>
                  <span className="text-right">Amount</span>
                </div>
                {rows.map((r) => (
                  <div
                    key={r.id}
                    className="grid grid-cols-[minmax(0,1.6fr)_1fr_1fr_120px] items-center gap-3 border-b border-[#f1ebdf] px-4 py-[13px] text-sm last:border-b-0"
                  >
                    <span className="truncate font-semibold">{r.title}</span>
                    <span className="text-[#6a635a]">{formatDateTime(r.at)}</span>
                    <span className="text-[#6a635a]">{r.pending ? "GCash · pending" : r.method}</span>
                    <Amount value={r.amount} pending={r.pending} className="text-right" />
                  </div>
                ))}
              </Card>
            </>
          ) : (
            <p className="text-[13.5px] text-[#6a635a]">
              Nothing in the last {range.value === "week" ? "7" : range.value === "month" ? "30" : "90"} days.
              Earnings, commission and top-ups show up here.
            </p>
          )}

          {range.value !== "quarter" && hasRows && (
            <Link
              href="/barber/earnings?range=quarter"
              className="rounded-[13px] border border-dashed border-[#ddd6c7] p-3.5 text-center text-sm font-semibold text-faint transition-colors hover:bg-white"
            >
              Load older entries
            </Link>
          )}
        </div>
      </div>

      {/* ——— Right rail: wallet, and how a cash job settles ——— */}
      <div className="contents lg:flex lg:min-h-0 lg:flex-col lg:gap-[13px] lg:overflow-y-auto lg:border-l lg:border-line-soft lg:bg-white lg:px-5 lg:py-[22px]">
        <WalletCard
          balance={balance}
          copy={walletCopy}
          className="-mt-4 px-[18px] max-lg:order-2 lg:mt-0 lg:px-0"
        />

        <div className="hidden flex-col gap-2.5 rounded-[14px] border border-line p-[15px] lg:flex">
          <Caption>How a cash job settles</Caption>
          <div className="flex justify-between text-sm text-[#4c463d]">
            <span>Customer pays you</span>
            <span className="font-semibold">{formatPeso(examplePrice)}</span>
          </div>
          <div className="flex justify-between text-sm text-[#4c463d]">
            <span>Commission {pct}%</span>
            <span className="font-semibold text-primary">−{formatPeso(exampleFee)}</span>
          </div>
          <div className="h-px bg-[#eee8db]" />
          <div className="flex items-baseline justify-between">
            <span className="text-[15px] font-bold">You keep</span>
            <span className="text-2xl font-extrabold">{formatPeso(examplePrice - exampleFee)}</span>
          </div>
          <p className="text-[13px] leading-[1.5] text-[#6a635a]">
            Commission is deducted from your wallet, not from the cash in your hand.
          </p>
        </div>

        <div className="hidden flex-col lg:flex lg:mt-auto">
          <DownloadStatement
            label={ledgerLabel}
            rows={rows.map((r) => ({
              entry: r.title,
              when: formatDateTime(r.at),
              method: r.method,
              amount: r.amount,
            }))}
          />
        </div>
      </div>
    </div>
  );
}

// "+₱187", and commission in red — a top-up still waiting on GCash is grey.
function Amount({
  value,
  pending,
  className,
}: {
  value: number;
  pending?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "shrink-0 font-extrabold",
        value < 0 && "text-primary",
        pending && "font-bold text-faint",
        className,
      )}
    >
      {value < 0 ? "−" : "+"}
      {formatPeso(Math.abs(value))}
    </span>
  );
}
