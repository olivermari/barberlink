import Link from "next/link";
import { NavigationIcon, PhoneIcon, WalletIcon, ZapIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/supabase/require-profile";
import { getPendingRequest } from "@/lib/barber-request";
import { distanceKm } from "@/lib/distance";
import { formatPeso, manilaDayStart, nowMs, PAYMENT_METHOD_LABEL } from "@/lib/format";
import { readSettings } from "@/lib/platform-settings";
import { cn } from "@/lib/utils";
import { AvailabilityToggle, GoOnlineButton } from "@/components/barber/availability-toggle";
import { NextStepButton } from "@/components/barber/booking-action-buttons";
import { RequestCard } from "@/components/barber/incoming-request";
import { JobMap } from "@/components/barber/job-map-lazy";
import { BookingChat } from "@/components/chat/booking-chat";
import { Caption, Card, DOTTED_GROUND, DOTTED_RAIL, Photo } from "@/components/customer/ui";
import { Button } from "@/components/ui/button";

const JOB_STATUSES = ["accepted", "on_the_way", "in_service"];

const STATUS_TITLE: Record<string, string> = {
  accepted: "Accepted",
  on_the_way: "On the way",
  in_service: "In service",
};

const VERIFICATION_LABEL: Record<string, string> = {
  verified: "Verified",
  pending: "Verification pending",
  needs_info: "More info needed",
  rejected: "Not verified",
};

type Job = {
  id: string;
  status: string;
  address_text: string;
  address_lat: number;
  address_lng: number;
  price: number;
  platform_fee: number;
  barber_payout: number;
  customer_id: string;
  service_id: string | null;
  payment_method: string | null;
  payment_status: string;
  accepted_at: string | null;
  on_the_way_at: string | null;
  in_service_at: string | null;
};

type Queued = {
  id: string;
  address_text: string;
  address_lat: number;
  address_lng: number;
  price: number;
  customer_id: string;
  service_id: string | null;
};

const INK_PILL =
  "rounded-[20px] bg-[#16130f] px-[9px] py-[5px] text-[11px] font-bold whitespace-nowrap text-white";
const HAIRLINE_ICON =
  "flex size-[38px] shrink-0 items-center justify-center rounded-[10px] border border-[#e0d9ca]";

// Barber UI B1/B2 (phone) and W1 (web): one screen, two trees — the phone
// is a single column under an ink band, the web is three panes (job and
// queue, map with its actions, and a rail for the timed request and the
// live chat).
export default async function BarberJobsPage() {
  const { user, profile } = await requireProfile();
  const supabase = await createClient();
  const serverNow = nowMs();

  const [
    { data: barber },
    { data: jobRows },
    { data: queuedRows },
    { data: todayRows },
    settings,
  ] = await Promise.all([
    supabase
      .from("barber_profiles")
      .select(
        "is_available, verification_status, current_lat, current_lng, token_balance, rating_avg, rating_count",
      )
      .eq("id", user.id)
      .single(),
    supabase
      .from("bookings")
      .select(
        "id, status, address_text, address_lat, address_lng, price, platform_fee, barber_payout, customer_id, service_id, payment_method, payment_status, accepted_at, on_the_way_at, in_service_at",
      )
      .eq("barber_id", user.id)
      .in("status", JOB_STATUSES)
      .order("requested_at", { ascending: true })
      .limit(1),
    supabase
      .from("bookings")
      .select("id, address_text, address_lat, address_lng, price, customer_id, service_id")
      .eq("barber_id", user.id)
      .eq("status", "queued"),
    supabase
      .from("bookings")
      .select("barber_payout")
      .eq("barber_id", user.id)
      .eq("status", "completed")
      .gte("completed_at", manilaDayStart()),
    readSettings(supabase),
  ]);

  const position =
    barber?.current_lat != null && barber?.current_lng != null
      ? { lat: barber.current_lat, lng: barber.current_lng }
      : null;
  const request = await getPendingRequest(supabase, user.id, position);

  const job = ((jobRows as Job[] | null) ?? [])[0] ?? null;
  // Nearest first — the order 0007's promote trigger will pick them in.
  const queue = ((queuedRows as Queued[] | null) ?? [])
    .map((b) => ({
      ...b,
      km: position ? distanceKm(position, { lat: b.address_lat, lng: b.address_lng }) : null,
    }))
    .sort((a, b) => (a.km ?? 0) - (b.km ?? 0));

  const customerIds = [...new Set([job?.customer_id, ...queue.map((b) => b.customer_id)])].filter(
    Boolean,
  ) as string[];
  const serviceIds = [...new Set([job?.service_id, ...queue.map((b) => b.service_id)])].filter(
    Boolean,
  ) as string[];

  const [{ data: customers }, { data: services }] = await Promise.all([
    customerIds.length
      ? supabase.from("profiles").select("id, full_name, avatar_url, phone").in("id", customerIds)
      : Promise.resolve({
          data: [] as {
            id: string;
            full_name: string | null;
            avatar_url: string | null;
            phone: string | null;
          }[],
        }),
    serviceIds.length
      ? supabase.from("services").select("id, name").in("id", serviceIds)
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
  ]);

  const customerById = new Map((customers ?? []).map((c) => [c.id, c]));
  const serviceName = new Map((services ?? []).map((s) => [s.id, s.name]));

  const isAvailable = barber?.is_available ?? false;
  const verificationStatus = barber?.verification_status ?? "pending";
  const verified = verificationStatus === "verified";
  const balance = Number(barber?.token_balance ?? 0);
  const todayTotal = (todayRows ?? []).reduce((sum, r) => sum + Number(r.barber_payout), 0);
  const todayCount = todayRows?.length ?? 0;
  const ratingCount = barber?.rating_count ?? 0;
  const identity = [
    VERIFICATION_LABEL[verificationStatus] ?? "Not verified",
    ratingCount > 0 ? `★ ${Number(barber?.rating_avg ?? 0).toFixed(1)} (${ratingCount})` : "No ratings yet",
  ].join(" · ");

  const hasJob = job != null;
  const jobCustomer = job ? customerById.get(job.customer_id) : undefined;
  const jobCustomerName = jobCustomer?.full_name ?? "Customer";
  const jobService = job ? (serviceName.get(job.service_id ?? "") ?? "Service") : "";
  const jobMethod = job ? (PAYMENT_METHOD_LABEL[job.payment_method ?? ""] ?? "Payment") : "";
  // Cash jobs settle when completed (0018), drawing the commission then.
  const cashCommission = job?.payment_method === "cod" ? Number(job.platform_fee) : null;
  const mapsUrl = job
    ? `https://www.google.com/maps/dir/?api=1&destination=${job.address_lat},${job.address_lng}`
    : "";
  const jobKm =
    job && position ? distanceKm(position, { lat: job.address_lat, lng: job.address_lng }) : null;
  // The same rough estimate the customer sees: road distance at city speed.
  const eta =
    job?.status === "on_the_way" && jobKm != null
      ? Math.max(1, Math.round(((jobKm * 1.3) / 20) * 60))
      : null;
  const servedMinutes =
    job?.status === "in_service" && job.in_service_at
      ? Math.max(0, Math.floor((serverNow - new Date(job.in_service_at).getTime()) / 60_000))
      : null;

  const status = statusCard({
    verificationStatus,
    isAvailable,
    balance,
    minWallet: settings.min_wallet_to_go_online,
    hasJob,
  });

  const statusBody = status && (
    <>
      <div className="flex items-center gap-2.5">
        {status.action === "go-online" && (
          <ZapIcon className="size-[19px] shrink-0 fill-primary text-primary" aria-hidden />
        )}
        <p className="text-base font-bold">{status.title}</p>
      </div>
      <p className="text-[13.5px] leading-[1.5] text-[#4c463d]">{status.body}</p>
      {status.action === "go-online" && <GoOnlineButton barberId={user.id} isAvailable={isAvailable} />}
      {status.action === "top-up" && (
        <Button
          className="h-auto rounded-[11px] p-[15px] text-base font-bold"
          nativeButton={false}
          render={<Link href="/barber/earnings" />}
        >
          Top up wallet
        </Button>
      )}
      {status.action === "documents" && (
        <Button
          className="h-auto rounded-[11px] p-[15px] text-base font-bold"
          nativeButton={false}
          render={<Link href="/barber/profile#documents" />}
        >
          {verificationStatus === "needs_info" ? "See what's needed" : "Upload documents"}
        </Button>
      )}
    </>
  );

  const queueLabel = `Queue · ${queue.length} waiting`;

  return (
    <>
      <h1 className="sr-only">Jobs</h1>

      {/* ——————————————— Phone: B1 / B2 ——————————————— */}
      <div className={cn("flex flex-1 flex-col lg:hidden", DOTTED_GROUND)}>
        <div className="bg-[#16130f] pb-[26px] text-white">
          <div className="flex items-center justify-between gap-3 px-[18px] pt-[18px]">
            <div className="flex min-w-0 items-center gap-2.5">
              <Photo
                src={profile.avatar_url}
                name={profile.full_name}
                className="size-[38px] border-[#4c463d] bg-[#3a342c] text-[#a49c90]"
              />
              <div className="flex min-w-0 flex-col gap-0.5">
                <span className="truncate text-[15px] font-bold">{profile.full_name ?? "You"}</span>
                <span className="truncate text-[12.5px] text-[#a49c90]">{identity}</span>
              </div>
            </div>
            {verified && <AvailabilityToggle barberId={user.id} isAvailable={isAvailable} dark />}
          </div>
          <div className="flex px-[18px] pt-5">
            <div className="flex flex-1 flex-col gap-0.5">
              <span className="text-[11.5px] text-[#a49c90]">Earned today</span>
              <span className="text-[25px] font-extrabold tracking-[-0.02em]">{formatPeso(todayTotal)}</span>
            </div>
            <div className="flex flex-1 flex-col gap-0.5 border-l border-[#3a342c] pl-5">
              <span className="text-[11.5px] text-[#a49c90]">{isAvailable ? "Wallet" : "Jobs done"}</span>
              <span
                className={cn(
                  "text-[25px] font-extrabold tracking-[-0.02em]",
                  isAvailable && balance < settings.min_wallet_to_go_online && "text-[#e8402f]",
                )}
              >
                {isAvailable ? formatPeso(balance) : todayCount}
              </span>
            </div>
          </div>
        </div>

        <div className="-mt-3.5 flex flex-1 flex-col gap-3 px-[18px] pb-4">
          {job ? (
            <Card className="shrink-0 overflow-hidden shadow-[0_8px_20px_rgba(22,19,15,0.09)]">
              <Link href="/barber/job" className="block">
                <div className="isolate h-[132px] overflow-hidden border-b border-line bg-photo">
                  <JobMap customer={{ lat: job.address_lat, lng: job.address_lng }} barber={position} />
                </div>
              </Link>
              <div className="flex flex-col gap-[11px] p-3.5">
                <div className="flex items-center justify-between gap-2.5">
                  <Link href="/barber/job" className="text-[17px] font-extrabold tracking-[-0.02em]">
                    {STATUS_TITLE[job.status]}
                  </Link>
                  <span className={INK_PILL}>
                    {jobMethod.toUpperCase()} ₱{job.price}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <Link href="/barber/job" className="flex min-w-0 flex-1 items-center gap-3">
                    <Photo src={jobCustomer?.avatar_url} name={jobCustomerName} className="size-[42px]" />
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="truncate text-[15px] font-bold">{jobCustomerName}</span>
                      <span className="truncate text-[12.5px] text-faint">
                        {[
                          job.address_text,
                          jobKm != null ? `${jobKm.toFixed(1)} km` : null,
                          eta != null ? `ETA ${eta} min` : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </span>
                  </Link>
                  {jobCustomer?.phone && (
                    <a
                      href={`tel:${jobCustomer.phone}`}
                      aria-label={`Call ${jobCustomerName}`}
                      className={HAIRLINE_ICON}
                    >
                      <PhoneIcon className="size-4" aria-hidden />
                    </a>
                  )}
                </div>
                <div className="flex gap-[9px]">
                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 rounded-[10px] border border-foreground p-[13px] text-center text-sm font-bold"
                  >
                    Navigate
                  </a>
                  <NextStepButton
                    bookingId={job.id}
                    barberId={user.id}
                    status={job.status}
                    cashCommission={cashCommission}
                    className="h-auto flex-1 rounded-[10px] p-[13px] text-sm"
                  />
                </div>
              </div>
            </Card>
          ) : (
            status && (
              <div
                className={cn(
                  "flex shrink-0 flex-col gap-[9px] rounded-[14px] bg-white p-[15px] shadow-[0_8px_20px_rgba(22,19,15,0.09)]",
                  status.emphasis ? "border-2 border-primary" : "border border-line",
                )}
              >
                {statusBody}
              </div>
            )
          )}

          {!isAvailable && !job && (
            <Card className="flex shrink-0 items-center gap-3 p-3.5">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-[11px] border border-wash-border bg-wash">
                <WalletIcon className="size-[18px]" aria-hidden />
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <Caption>Token wallet</Caption>
                <span
                  className={cn(
                    "text-xl font-extrabold tracking-[-0.02em]",
                    balance < settings.min_wallet_to_go_online && "text-destructive",
                  )}
                >
                  {formatPeso(balance)}
                </span>
              </span>
              <Link href="/barber/earnings" className="text-[13px] font-bold text-primary">
                Top up
              </Link>
            </Card>
          )}

          <Caption className="shrink-0">{queueLabel}</Caption>
          {queue.length === 0 ? (
            <p className="text-[13.5px] text-[#6a635a]">Nobody waiting.</p>
          ) : (
            queue.map((b, i) => {
              const c = customerById.get(b.customer_id);
              const name = serviceName.get(b.service_id ?? "") ?? "Service";
              const cName = c?.full_name ?? "Customer";
              if (!hasJob && i === 0) {
                return (
                  <Card key={b.id} className="flex shrink-0 flex-col gap-2 p-3.5">
                    <div className="flex items-center justify-between gap-2.5">
                      <span className="text-[15.5px] font-bold">{name}</span>
                      <span className="text-[17px] font-extrabold">₱{b.price}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Photo src={c?.avatar_url} name={cName} square className="size-[38px] rounded-[10px]" />
                      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span className="truncate text-[13.5px] font-semibold">{cName}</span>
                        <span className="truncate text-[12.5px] text-faint">
                          {[b.address_text, b.km != null ? `${b.km.toFixed(1)} km` : null]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                      </span>
                      {queue.length > 1 && (
                        <span className="rounded-[20px] border border-wash-border bg-wash px-2 py-1 text-[11px] font-bold">
                          NEAREST
                        </span>
                      )}
                    </div>
                  </Card>
                );
              }
              return (
                <Card
                  key={b.id}
                  className={cn(
                    "flex shrink-0 items-center gap-3 p-[13px]",
                    !hasJob && "border-[#eee8db] opacity-75",
                  )}
                >
                  <Photo src={c?.avatar_url} name={cName} square className="size-[38px] rounded-[10px]" />
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="truncate text-sm font-bold">{name}</span>
                    <span className="truncate text-[12.5px] text-faint">
                      {cName}
                      {b.km != null && ` · ${b.km.toFixed(1)} km`}
                    </span>
                  </span>
                  <span className="text-base font-extrabold">₱{b.price}</span>
                </Card>
              );
            })
          )}
        </div>
      </div>

      {/* ——————————————— Web: W1 ——————————————— */}
      <div className="hidden min-h-0 flex-1 lg:grid lg:grid-cols-[340px_minmax(0,1fr)_330px]">
        <div
          className={cn(
            "flex min-h-0 min-w-0 flex-col gap-3 overflow-y-auto border-r border-line-soft p-[18px]",
            DOTTED_GROUND,
          )}
        >
          {!job && status && (
            <div
              className={cn(
                "flex flex-col gap-[9px] rounded-[13px] bg-white p-3.5",
                status.emphasis ? "border-2 border-primary" : "border border-line",
              )}
            >
              {statusBody}
            </div>
          )}
          <Caption>Current job</Caption>
          {job ? (
            <div className="flex flex-col gap-[9px] rounded-[13px] border-2 border-primary bg-white p-3.5">
              <div className="flex items-center justify-between gap-2.5">
                <span className="text-[17px] font-extrabold tracking-[-0.02em]">{jobService}</span>
                <span className={INK_PILL}>{STATUS_TITLE[job.status].toUpperCase()}</span>
              </div>
              <div className="flex items-center gap-[11px]">
                <Photo src={jobCustomer?.avatar_url} name={jobCustomerName} className="size-10" />
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="truncate text-[14.5px] font-bold">{jobCustomerName}</span>
                  <span className="truncate text-[12.5px] text-faint">{job.address_text}</span>
                </span>
              </div>
              <div className="flex items-baseline justify-between border-t border-[#f1ebdf] pt-[9px]">
                <span className="text-[13px] text-[#6a635a]">
                  {jobMethod} ₱{job.price} · you earn
                </span>
                <span className="text-[19px] font-extrabold">₱{job.barber_payout}</span>
              </div>
            </div>
          ) : (
            <p className="text-[13.5px] text-[#6a635a]">No active job. New requests show up on the right.</p>
          )}

          <Caption>{queueLabel}</Caption>
          {queue.length === 0 ? (
            <p className="text-[13.5px] text-[#6a635a]">Nobody waiting.</p>
          ) : (
            queue.map((b, i) => {
              const c = customerById.get(b.customer_id);
              const name = serviceName.get(b.service_id ?? "") ?? "Service";
              const cName = c?.full_name ?? "Customer";
              if (i === 0) {
                return (
                  <Card key={b.id} className="flex flex-col gap-2 rounded-[13px] p-[13px]">
                    <div className="flex items-center justify-between">
                      <span className="text-[15px] font-bold">{name}</span>
                      <span className="text-base font-extrabold">₱{b.price}</span>
                    </div>
                    <div className="flex items-center gap-[11px]">
                      <Photo src={c?.avatar_url} name={cName} square className="size-[34px] rounded-[9px]" />
                      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span className="truncate text-[13px] font-semibold">{cName}</span>
                        <span className="text-[12.5px] text-faint">
                          {b.km != null ? `${b.km.toFixed(1)} km` : b.address_text}
                        </span>
                      </span>
                      {queue.length > 1 && (
                        <span className="rounded-[20px] border border-wash-border bg-wash px-2 py-1 text-[11px] font-bold">
                          NEAREST
                        </span>
                      )}
                    </div>
                  </Card>
                );
              }
              return (
                <Card key={b.id} className="flex items-center gap-[11px] rounded-[13px] p-[13px]">
                  <Photo src={c?.avatar_url} name={cName} square className="size-[34px] rounded-[9px]" />
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="truncate text-sm font-bold">{name}</span>
                    <span className="truncate text-[12.5px] text-faint">
                      {cName}
                      {b.km != null && ` · ${b.km.toFixed(1)} km`}
                    </span>
                  </span>
                  <span className="text-base font-extrabold">₱{b.price}</span>
                </Card>
              );
            })
          )}

          <div className="mt-auto grid grid-cols-2 gap-2.5 pt-3">
            <div className="flex flex-col gap-[3px] rounded-[13px] bg-[#16130f] p-[13px] text-white">
              <span className="text-[11px] tracking-[0.1em] text-[#a49c90] uppercase">Today</span>
              <span className="text-[21px] font-extrabold tracking-[-0.02em]">{formatPeso(todayTotal)}</span>
            </div>
            <div className="flex flex-col gap-[3px] rounded-[13px] bg-[#16130f] p-[13px] text-white">
              <span className="text-[11px] tracking-[0.1em] text-[#a49c90] uppercase">Jobs</span>
              <span className="text-[21px] font-extrabold tracking-[-0.02em]">{todayCount}</span>
            </div>
          </div>
        </div>

        <div className="relative isolate min-h-0 overflow-hidden bg-photo">
          <JobMap
            customer={job ? { lat: job.address_lat, lng: job.address_lng } : null}
            barber={position}
          />
          {job ? (
            <>
              <div className="absolute top-[18px] left-[18px] z-[500] flex items-center gap-3.5 rounded-[11px] bg-[#16130f] px-4 py-[13px] text-white shadow-[0_8px_24px_rgba(22,19,15,0.18)]">
                <span className="text-[15px] font-bold">{STATUS_TITLE[job.status]}</span>
                {(servedMinutes != null || eta != null) && (
                  <>
                    <span className="h-[18px] w-px bg-[#3a342c]" aria-hidden />
                    <span className="text-[15px] font-bold">
                      {servedMinutes != null ? `${servedMinutes} min` : `ETA ${eta} min`}
                    </span>
                  </>
                )}
                <span className="text-[13px] text-[#a49c90]">{jobCustomerName}</span>
              </div>
              <div className="absolute inset-x-[18px] bottom-[18px] z-[500] flex gap-[11px]">
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-1 items-center justify-center gap-2 rounded-[11px] border border-[#e0d9ca] bg-white p-3.5 text-[15px] font-bold shadow-[0_6px_18px_rgba(22,19,15,0.1)]"
                >
                  <NavigationIcon className="size-[18px]" aria-hidden />
                  Navigate — open in Maps
                </a>
                <NextStepButton
                  bookingId={job.id}
                  barberId={user.id}
                  status={job.status}
                  cashCommission={cashCommission}
                  className="h-auto flex-1 rounded-[11px] p-3.5 text-[15px] shadow-[0_6px_18px_rgba(207,36,23,0.22)]"
                />
              </div>
            </>
          ) : (
            <div className="absolute top-4 left-1/2 z-[500] -translate-x-1/2 rounded-full border border-line bg-white px-3.5 py-[7px] text-[13px] font-bold shadow-sm">
              {isAvailable ? "Waiting for requests" : "You're offline"}
            </div>
          )}
        </div>

        <div
          className={cn(
            "flex min-h-0 min-w-0 flex-col gap-3 overflow-y-auto border-l border-line-soft p-[18px]",
            DOTTED_RAIL,
          )}
        >
          {request && <RequestCard request={request} />}
          {job ? (
            <BookingChat
              bookingId={job.id}
              currentUserId={user.id}
              otherPartyLabel={jobCustomerName}
              otherPartyAvatarUrl={jobCustomer?.avatar_url}
              variant="barber"
              className="flex-1"
            />
          ) : (
            !request && (
              <p className="text-[13.5px] text-[#6a635a]">
                Chat with your customer opens here once you accept a job.
              </p>
            )
          )}
        </div>
      </div>
    </>
  );
}

function statusCard({
  verificationStatus,
  isAvailable,
  balance,
  minWallet,
  hasJob,
}: {
  verificationStatus: string;
  isAvailable: boolean;
  balance: number;
  minWallet: number;
  hasJob: boolean;
}): {
  title: string;
  body: string;
  action: "go-online" | "top-up" | "documents" | null;
  emphasis: boolean;
} | null {
  if (verificationStatus === "rejected") {
    return {
      title: "Verification rejected",
      body: "An admin couldn't verify your account. Contact support to sort it out.",
      action: null,
      emphasis: false,
    };
  }
  if (verificationStatus === "needs_info") {
    return {
      title: "An admin needs more from you",
      body: "See what they asked for on your profile, fix it, then send it back for review.",
      action: "documents",
      emphasis: true,
    };
  }
  if (verificationStatus !== "verified") {
    return {
      title: "Verification pending",
      body: "Upload your ID, a selfie and your permit so an admin can approve you. Meanwhile, finish your profile and portfolio.",
      action: "documents",
      emphasis: false,
    };
  }
  if (balance < minWallet) {
    return {
      title: "Top up to go online",
      body:
        balance < 0
          ? `You owe ₱${Math.abs(balance)} in commission from cash jobs, so you've been taken offline. Top up to take new jobs again.`
          : `Your wallet needs at least ₱${minWallet} to go online. Top up to take new jobs.`,
      action: "top-up",
      emphasis: true,
    };
  }
  if (!isAvailable) {
    return {
      title: "Go online to receive jobs",
      body: "GPS must stay on while you're online — customers are matched to your live position.",
      action: "go-online",
      emphasis: true,
    };
  }
  if (!hasJob) {
    return {
      title: "You're online",
      body: "Waiting for requests near you. Keep this open with GPS on — a request gives you a short window to accept.",
      action: null,
      emphasis: false,
    };
  }
  return null;
}
