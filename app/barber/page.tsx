import Link from "next/link";
import { CheckIcon, NavigationIcon, PhoneIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/supabase/require-profile";
import { getPendingRequest } from "@/lib/barber-request";
import { distanceKm } from "@/lib/distance";
import { formatPeso, manilaDayStart, nowMs, PAYMENT_METHOD_LABEL } from "@/lib/format";
import { initials } from "@/lib/initials";
import { readSettings } from "@/lib/platform-settings";
import { cn } from "@/lib/utils";
import { AvailabilityToggle, GoOnlineButton } from "@/components/barber/availability-toggle";
import { NextStepButton } from "@/components/barber/booking-action-buttons";
import { RequestCard } from "@/components/barber/incoming-request";
import { JobMap } from "@/components/barber/job-map-lazy";
import { BookingChat } from "@/components/chat/booking-chat";
import { TimeAgo } from "@/components/time-ago";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SectionLabel } from "@/components/ui/section-label";

const JOB_STATUSES = ["accepted", "on_the_way", "in_service"];

const STATUS_TITLE: Record<string, string> = {
  accepted: "Accepted",
  on_the_way: "On the way",
  in_service: "In service",
};

const JOB_STEPS = [
  { status: "accepted", label: "Accepted", at: "accepted_at" },
  { status: "on_the_way", label: "On the way", at: "on_the_way_at" },
  { status: "in_service", label: "In service", at: "in_service_at" },
] as const;

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

// Wireframes B1 (idle), B3 (active job) and B6 (web). One tree: below lg
// the column wrappers are `display: contents`, so their children join a
// single column and `max-lg:order-*` sets the phone order; from lg up
// the wrappers become B6's three columns.
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
      .select("is_available, verification_status, current_lat, current_lng, token_balance")
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

  const status = statusCard({
    verificationStatus,
    isAvailable,
    balance,
    minWallet: settings.min_wallet_to_go_online,
    hasJob,
  });

  return (
    <div className="flex flex-1 flex-col gap-4 pb-4 lg:grid lg:min-h-[calc(100svh-61px)] lg:grid-cols-[340px_minmax(0,1fr)_320px] lg:gap-0 lg:pb-0">
      <h1 className="sr-only">Jobs</h1>

      {/* ——— Left rail (B6) · idle phone screen (B1) ——— */}
      <div className="contents lg:flex lg:flex-col lg:gap-3.5 lg:border-r-[1.5px] lg:border-outline lg:p-[18px]">
        <div
          className={cn(
            "flex items-center justify-between gap-3 px-4 pt-4 sm:hidden",
            hasJob ? "hidden" : "max-lg:order-1",
          )}
        >
          <div className="flex min-w-0 items-center gap-2.5">
            <Avatar className="size-9">
              {profile.avatar_url && (
                <AvatarImage src={profile.avatar_url} alt={profile.full_name ?? "You"} />
              )}
              <AvatarFallback>{initials(profile.full_name)}</AvatarFallback>
            </Avatar>
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-[15px] font-bold">{profile.full_name ?? "You"}</span>
              <span className="text-[13px] text-muted-foreground">
                {VERIFICATION_LABEL[verificationStatus] ?? "Not verified"}
              </span>
            </div>
          </div>
          {verified && <AvailabilityToggle barberId={user.id} isAvailable={isAvailable} />}
        </div>

        {status && (
          <div
            className={cn(
              "mx-4 flex flex-col gap-2 rounded-lg p-4 lg:mx-0",
              status.emphasis ? "border-2 border-primary" : "border-[1.5px] border-outline",
              hasJob ? "hidden lg:flex" : "max-lg:order-2",
            )}
          >
            <p className="text-[17px] font-bold">{status.title}</p>
            <p className="text-sm leading-snug text-ink-soft">{status.body}</p>
            {status.action === "go-online" && (
              <div className="mt-1 flex flex-col">
                <GoOnlineButton barberId={user.id} isAvailable={isAvailable} />
              </div>
            )}
            {status.action === "top-up" && (
              <Button
                size="lg"
                className="mt-1 h-12 text-base"
                nativeButton={false}
                render={<Link href="/barber/earnings" />}
              >
                Top up wallet
              </Button>
            )}
            {status.action === "documents" && (
              <Button
                size="lg"
                className="mt-1 h-12 text-base"
                nativeButton={false}
                render={<Link href="/barber/profile#documents" />}
              >
                {verificationStatus === "needs_info" ? "See what's needed" : "Upload documents"}
              </Button>
            )}
          </div>
        )}

        <div className="hidden flex-col gap-2 lg:flex">
          <SectionLabel>Current job</SectionLabel>
          {job ? (
            <div className="flex flex-col gap-1.5 rounded-lg border-2 border-primary p-3.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[17px] font-bold">{jobService}</span>
                <Badge className="h-6 px-2">{STATUS_TITLE[job.status]?.toUpperCase()}</Badge>
              </div>
              <span className="text-sm text-muted-foreground">
                {jobCustomerName} · {job.address_text}
              </span>
              <span className="text-sm font-bold">
                ₱{job.price} {jobMethod.toLowerCase()} · you earn ₱{job.barber_payout}
              </span>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No active job. New requests show up on the right.
            </p>
          )}
        </div>

        <section
          className={cn(
            "mx-4 flex flex-col gap-2.5 lg:mx-0",
            hasJob ? "hidden lg:flex" : "max-lg:order-4",
          )}
        >
          <SectionLabel>Queue · {queue.length} waiting</SectionLabel>
          {queue.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nobody waiting.</p>
          ) : (
            <ul className="flex flex-col gap-2.5">
              {queue.map((b, i) => (
                <li
                  key={b.id}
                  className={cn(
                    "flex flex-col gap-1 rounded-lg border-[1.5px] p-3.5",
                    i === 0 ? "border-outline" : "border-border",
                  )}
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-base font-bold">
                      {serviceName.get(b.service_id ?? "") ?? "Service"} · ₱{b.price}
                    </span>
                    {b.km != null && (
                      <span className="shrink-0 text-[13px] text-muted-foreground">
                        {b.km.toFixed(1)} km
                      </span>
                    )}
                  </div>
                  <span className="truncate text-sm text-muted-foreground">
                    {customerById.get(b.customer_id)?.full_name ?? "Customer"} · {b.address_text}
                  </span>
                  {i === 0 && queue.length > 1 && (
                    <span className="text-[13px] text-muted-foreground">
                      Nearest waiting — promoted first
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <div
          className={cn(
            "mx-4 grid grid-cols-2 gap-2.5 lg:mx-0 lg:mt-auto",
            hasJob ? "hidden lg:grid" : "max-lg:order-3",
          )}
        >
          <div className="flex flex-col gap-1 rounded-lg border-[1.5px] border-outline p-3.5">
            <SectionLabel>Today</SectionLabel>
            <span className="text-[25px] leading-tight font-black">{formatPeso(todayTotal)}</span>
            <span className="text-[13px] text-muted-foreground">
              {todayCount} job{todayCount === 1 ? "" : "s"} done
            </span>
          </div>
          <div className="flex flex-col gap-1 rounded-lg border-[1.5px] border-outline p-3.5">
            <SectionLabel>Wallet</SectionLabel>
            <span
              className={cn(
                "text-[25px] leading-tight font-black",
                balance < settings.min_wallet_to_go_online && "text-destructive",
              )}
            >
              {formatPeso(balance)}
            </span>
            <Link href="/barber/earnings" className="text-[13px] font-semibold text-primary">
              Top up
            </Link>
          </div>
        </div>
      </div>

      {/* ——— Centre: the map (B6) · top of the active-job phone screen (B3) ——— */}
      <div className="contents lg:flex lg:flex-col">
        <div
          className={cn(
            "relative isolate h-[250px] overflow-hidden bg-placeholder lg:h-auto lg:min-h-[560px] lg:flex-1",
            hasJob ? "max-lg:order-1" : "hidden lg:block",
          )}
        >
          <JobMap
            customer={job ? { lat: job.address_lat, lng: job.address_lng } : null}
            barber={position}
          />
          {job ? (
            <div className="absolute inset-x-3.5 bottom-3.5 z-[500] flex gap-2.5 lg:inset-x-4 lg:bottom-4">
              <Button
                variant="outline"
                className="h-12 flex-1 bg-background text-[15px] font-bold"
                nativeButton={false}
                render={<a href={mapsUrl} target="_blank" rel="noopener noreferrer" />}
              >
                <NavigationIcon />
                Navigate — open in Maps
              </Button>
              <NextStepButton
                bookingId={job.id}
                barberId={user.id}
                status={job.status}
                cashCommission={cashCommission}
                className="hidden h-12 flex-1 text-[15px] lg:inline-flex"
              />
            </div>
          ) : (
            <div className="absolute top-4 left-1/2 z-[500] -translate-x-1/2 rounded-md border-[1.5px] border-outline bg-background px-3 py-1.5 text-sm font-semibold">
              {isAvailable ? "Waiting for requests" : "You're offline"}
            </div>
          )}
        </div>

        {job && (
          <div className="mx-4 flex flex-col gap-3.5 max-lg:order-2 lg:hidden">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-[21px] font-black">{STATUS_TITLE[job.status]}</h2>
              <Badge className="h-6 px-2.5">
                {jobMethod.toUpperCase()} ₱{job.price}
              </Badge>
            </div>
            <div className="flex items-center gap-3 rounded-lg border-[1.5px] border-outline p-3.5">
              <Avatar className="size-[46px]">
                {jobCustomer?.avatar_url && (
                  <AvatarImage src={jobCustomer.avatar_url} alt={jobCustomerName} />
                )}
                <AvatarFallback>{initials(jobCustomerName)}</AvatarFallback>
              </Avatar>
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="truncate text-base font-bold">{jobCustomerName}</span>
                <span className="text-sm text-muted-foreground">{job.address_text}</span>
              </div>
              {jobCustomer?.phone && (
                <Button
                  variant="outline"
                  size="icon"
                  nativeButton={false}
                  render={<a href={`tel:${jobCustomer.phone}`} />}
                  aria-label={`Call ${jobCustomerName}`}
                >
                  <PhoneIcon />
                </Button>
              )}
            </div>
            <JobChecklist job={job} serverNow={serverNow} />
          </div>
        )}

        {job && (
          <div className="sticky bottom-16 z-10 flex flex-col gap-2 border-t bg-background px-4 py-3 max-lg:order-4 sm:bottom-0 lg:hidden">
            <NextStepButton
              bookingId={job.id}
              barberId={user.id}
              status={job.status}
              cashCommission={cashCommission}
            />
          </div>
        )}
      </div>

      {/* ——— Right rail (B6): the request card and chat ——— */}
      <div className="contents lg:flex lg:flex-col lg:gap-3.5 lg:border-l-[1.5px] lg:border-outline lg:p-[18px]">
        {request && <RequestCard request={request} className="hidden lg:flex" />}
        {job ? (
          <BookingChat
            bookingId={job.id}
            currentUserId={user.id}
            otherPartyLabel={jobCustomerName}
            className="mx-4 max-lg:order-3 lg:mx-0 lg:min-h-0 lg:flex-1"
          />
        ) : (
          !request && (
            <p className="hidden text-sm text-muted-foreground lg:block">
              Chat with your customer opens here once you accept a job.
            </p>
          )
        )}
      </div>
    </div>
  );
}

function JobChecklist({ job, serverNow }: { job: Job; serverNow: number }) {
  const current = JOB_STEPS.findIndex((s) => s.status === job.status);

  return (
    <ol className="flex flex-col gap-2.5">
      {JOB_STEPS.map((step, i) => {
        const state = i < current ? "done" : i === current ? "current" : "upcoming";
        const at = job[step.at];
        return (
          <li
            key={step.status}
            aria-current={state === "current" ? "step" : undefined}
            className={cn(
              "flex items-center gap-2.5",
              state === "current" ? "text-[15px] font-bold" : "text-sm text-muted-foreground",
            )}
          >
            <span
              className={cn(
                "flex size-[22px] shrink-0 items-center justify-center rounded-full text-xs",
                state === "done" && "bg-primary text-primary-foreground",
                state === "current" && "border-2 border-primary text-primary",
                state === "upcoming" && "border border-input",
              )}
            >
              {state === "done" ? <CheckIcon className="size-3.5" /> : i + 1}
            </span>
            <span>
              {step.label}
              {state === "current" && at && (
                <>
                  {" · started "}
                  <TimeAgo iso={at} serverNowMs={serverNow} />
                </>
              )}
            </span>
          </li>
        );
      })}
    </ol>
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
