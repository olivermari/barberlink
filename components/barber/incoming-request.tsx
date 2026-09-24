"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { MapPinIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { friendlyError } from "@/lib/friendly-error";
import { PAYMENT_METHOD_LABEL } from "@/lib/format";
import type { PendingRequest } from "@/lib/barber-request";
import { cn } from "@/lib/utils";
import { JobMap } from "@/components/barber/job-map-lazy";

// Starts from the server's clock so the first paint matches the server
// render, then ticks on the device clock.
function useNow(serverNowMs: number) {
  const [now, setNow] = useState(serverNowMs);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  return now;
}

function countdown(request: PendingRequest, now: number) {
  if (request.deadlineMs == null) return { label: null, fraction: 1 };
  const remaining = Math.max(0, request.deadlineMs - now);
  const seconds = Math.ceil(remaining / 1000);
  return {
    label: `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`,
    fraction: Math.min(1, remaining / (request.timeoutSeconds * 1000)),
  };
}

function useRespond(bookingId: string) {
  const router = useRouter();
  const [loading, setLoading] = useState<"accept" | "decline" | null>(null);

  async function respond(accept: boolean) {
    setLoading(accept ? "accept" : "decline");
    const supabase = createClient();
    // Only while it's still open — it may have just expired or been
    // cancelled by the customer.
    const { data, error } = await supabase
      .from("bookings")
      .update(accept ? { status: "accepted" } : { status: "declined", decline_reason: "barber" })
      .eq("id", bookingId)
      .eq("status", "pending")
      .select("id")
      .maybeSingle();
    setLoading(null);

    if (error) {
      toast.error(friendlyError(error, "Couldn't respond to that request. Try again."));
      return;
    }
    if (!data) toast.info("This request is no longer open.");
    else toast.success(accept ? "Accepted — head to the customer." : "Request declined.");
    router.refresh();
  }

  return { loading, respond };
}

function facts(request: PendingRequest) {
  return [
    { label: "You earn", value: `₱${request.payout}` },
    {
      label: "Distance",
      value: request.distanceKm != null ? `${request.distanceKm.toFixed(1)} km` : "—",
    },
    { label: "Pays by", value: PAYMENT_METHOD_LABEL[request.paymentMethod ?? ""] ?? "—" },
  ];
}

// B3: the one screen that stays dark and full-bleed — payout, distance
// and payment method are the whole hierarchy, read at arm's length. From
// lg up (W1) it is a timed card: docked bottom-right on most pages, and in
// the right rail on /barber, which renders its own.
export function IncomingRequest({ request }: { request: PendingRequest }) {
  const pathname = usePathname();
  const now = useNow(request.serverNowMs);
  const { loading, respond } = useRespond(request.id);
  const { label, fraction } = countdown(request, now);
  const subtitle = [
    request.durationMinutes ? `${request.durationMinutes} min` : null,
    request.customerName,
  ]
    .filter(Boolean)
    .join(" · ");

  // A barber reading this mid-street needs more than a small grey
  // number to notice the clock is running out — vibrate once when a new
  // request arrives (guarded: not every browser has the API).
  const vibratedRef = useRef<string | null>(null);
  useEffect(() => {
    if (vibratedRef.current === request.id) return;
    vibratedRef.current = request.id;
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate([200, 100, 200]);
    }
  }, [request.id]);

  return (
    <>
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="incoming-request-title"
        className="fixed inset-0 z-[70] flex flex-col bg-[#16130f] text-white lg:hidden"
      >
        <div className="flex flex-col gap-2.5 px-5 pt-5">
          <div className="flex items-center justify-between text-[12.5px]">
            <span className="font-bold tracking-[0.1em] text-[#e8402f] uppercase">New request</span>
            {label && <span className="text-[#a49c90]">Auto-declines in {label}</span>}
          </div>
          <div className="h-[5px] overflow-hidden rounded-[3px] bg-[#3a342c]">
            <div
              className="h-[5px] bg-[#e8402f] transition-[width] duration-1000 ease-linear"
              style={{ width: `${fraction * 100}%` }}
            />
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col justify-center gap-[18px] overflow-y-auto p-5">
          <div className="flex flex-col gap-[5px]">
            <h2
              id="incoming-request-title"
              className="text-[33px] leading-[1.05] font-extrabold tracking-[-0.03em]"
            >
              {request.serviceName}
            </h2>
            <p className="text-base text-[#a49c90]">{subtitle}</p>
          </div>
          <dl className="flex border-y border-[#3a342c] py-4">
            {facts(request).map((f, i) => (
              <div
                key={f.label}
                className={cn(
                  "flex flex-1 flex-col gap-[3px]",
                  i > 0 && "border-l border-[#3a342c] pl-[18px]",
                )}
              >
                <dt className="text-[11.5px] tracking-[0.1em] text-[#a49c90] uppercase">{f.label}</dt>
                <dd className="text-[26px] font-extrabold tracking-[-0.02em]">{f.value}</dd>
              </div>
            ))}
          </dl>
          <div className="isolate h-[186px] shrink-0 overflow-hidden rounded-[14px] border border-[#3a342c] bg-[#241f19]">
            <JobMap customer={request.spot} barber={request.barber} />
          </div>
          <div className="flex items-center gap-[11px]">
            <MapPinIcon className="size-[18px] shrink-0 text-[#a49c90]" aria-hidden />
            <span className="text-[14.5px] text-[#cfc8bd]">{request.addressText}</span>
          </div>
        </div>

        <div className="flex flex-col gap-2.5 px-5 pb-6">
          <button
            type="button"
            onClick={() => respond(true)}
            disabled={loading !== null}
            className="rounded-[13px] bg-[#e8402f] p-[19px] text-center text-[19px] font-bold text-white disabled:opacity-60"
          >
            {loading === "accept" ? "Accepting…" : "Accept"}
          </button>
          <button
            type="button"
            onClick={() => respond(false)}
            disabled={loading !== null}
            className="rounded-[13px] border border-[#6f675c] p-[15px] text-center text-base font-bold text-[#a49c90] disabled:opacity-60"
          >
            {loading === "decline" ? "Declining…" : "Decline"}
          </button>
        </div>
      </div>

      {pathname !== "/barber" && (
        <div className="fixed right-6 bottom-6 z-[70] hidden w-[340px] shadow-lg lg:block">
          <RequestCard request={request} />
        </div>
      )}
    </>
  );
}

// W1: a timed card that lands above the live chat and leaves the active
// job visible.
export function RequestCard({
  request,
  className,
}: {
  request: PendingRequest;
  className?: string;
}) {
  const now = useNow(request.serverNowMs);
  const { loading, respond } = useRespond(request.id);
  const { label, fraction } = countdown(request, now);
  const details = [
    request.distanceKm != null ? `${request.distanceKm.toFixed(1)} km` : null,
    PAYMENT_METHOD_LABEL[request.paymentMethod ?? ""],
    request.customerName,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div
      className={cn(
        "flex flex-col gap-[9px] rounded-[13px] border-2 border-primary bg-[#16130f] p-3.5 text-white",
        className,
      )}
    >
      <div className="flex items-center justify-between text-xs">
        <span className="font-bold tracking-[0.1em] text-[#e8402f] uppercase">New request</span>
        {label && (
          <span className="text-[#a49c90]" aria-label={`Auto-declines in ${label}`}>
            {label}
          </span>
        )}
      </div>
      <div className="h-1 overflow-hidden rounded-sm bg-[#3a342c]">
        <div
          className="h-1 bg-[#e8402f] transition-[width] duration-1000 ease-linear"
          style={{ width: `${fraction * 100}%` }}
        />
      </div>
      <div className="flex flex-col gap-0.5">
        <span className="text-[18px] font-extrabold tracking-[-0.02em]">
          {request.serviceName} · ₱{request.payout} to you
        </span>
        <span className="text-[13px] text-[#a49c90]">{details}</span>
      </div>
      <div className="mt-0.5 flex gap-[9px]">
        <button
          type="button"
          onClick={() => respond(true)}
          disabled={loading !== null}
          className="flex-1 rounded-[10px] bg-[#e8402f] p-3 text-center text-sm font-bold text-white disabled:opacity-60"
        >
          {loading === "accept" ? "Accepting…" : "Accept"}
        </button>
        <button
          type="button"
          onClick={() => respond(false)}
          disabled={loading !== null}
          className="rounded-[10px] border border-[#6f675c] px-[15px] py-3 text-sm font-bold text-[#a49c90] disabled:opacity-60"
        >
          Decline
        </button>
      </div>
    </div>
  );
}
