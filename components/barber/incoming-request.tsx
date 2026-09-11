"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { PAYMENT_METHOD_LABEL } from "@/lib/format";
import type { PendingRequest } from "@/lib/barber-request";
import { cn } from "@/lib/utils";
import { JobMap } from "@/components/barber/job-map-lazy";
import { Button } from "@/components/ui/button";

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
      toast.error(error.message);
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

// Wireframe B2: the only screen a barber reads mid-street, so payout,
// distance and payment method are the whole hierarchy. Full-screen and
// dark on phones; from lg up it's a timed card (B6) — docked bottom-right
// on most pages, and in the right rail on /barber, which renders its own.
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

  return (
    <>
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="incoming-request-title"
        className="dark fixed inset-0 z-[70] flex flex-col gap-4 bg-background p-4 text-foreground lg:hidden"
      >
        <div className="flex items-center justify-between text-[13px] text-muted-foreground">
          <span>New request</span>
          {label && <span>Auto-declines in {label}</span>}
        </div>
        <div className="h-[5px] overflow-hidden rounded-[3px] bg-border">
          <div
            className="h-full bg-primary transition-[width] duration-1000 ease-linear"
            style={{ width: `${fraction * 100}%` }}
          />
        </div>

        <div className="flex min-h-0 flex-1 flex-col justify-center gap-4 overflow-y-auto">
          <div className="flex flex-col gap-1">
            <h2 id="incoming-request-title" className="text-[31px] leading-tight font-black">
              {request.serviceName}
            </h2>
            <p className="text-[17px] text-muted-foreground">{subtitle}</p>
          </div>
          <dl className="flex gap-6 border-y py-4">
            {facts(request).map((f) => (
              <div key={f.label} className="flex flex-col gap-1.5">
                <dt className="text-xs font-semibold tracking-[0.12em] text-muted-foreground uppercase">
                  {f.label}
                </dt>
                <dd className="text-[27px] leading-none font-black">{f.value}</dd>
              </div>
            ))}
          </dl>
          <div className="isolate h-[170px] shrink-0 overflow-hidden rounded-lg border bg-muted">
            <JobMap customer={request.spot} barber={request.barber} />
          </div>
          <p className="text-[15px] text-muted-foreground">{request.addressText}</p>
        </div>

        <div className="flex flex-col gap-2.5">
          <Button
            size="lg"
            className="h-16 text-[19px]"
            onClick={() => respond(true)}
            disabled={loading !== null}
          >
            {loading === "accept" ? "Accepting…" : "Accept"}
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="h-13 text-base text-muted-foreground"
            onClick={() => respond(false)}
            disabled={loading !== null}
          >
            {loading === "decline" ? "Declining…" : "Decline"}
          </Button>
        </div>
      </div>

      {pathname !== "/barber" && (
        <div className="fixed right-6 bottom-6 z-[70] hidden w-[340px] rounded-lg bg-background shadow-lg lg:block">
          <RequestCard request={request} />
        </div>
      )}
    </>
  );
}

// The web version (B6): a timed card that leaves the active job visible.
export function RequestCard({
  request,
  className,
}: {
  request: PendingRequest;
  className?: string;
}) {
  const now = useNow(request.serverNowMs);
  const { loading, respond } = useRespond(request.id);
  const { label } = countdown(request, now);
  const details = [
    request.distanceKm != null ? `${request.distanceKm.toFixed(1)} km` : null,
    PAYMENT_METHOD_LABEL[request.paymentMethod ?? ""],
    request.customerName,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className={cn("flex flex-col gap-2 rounded-lg border-2 border-primary p-3.5", className)}>
      <div className="flex justify-between text-[13px] text-muted-foreground">
        <span className="font-bold text-primary">NEW REQUEST</span>
        {label && <span aria-label={`Auto-declines in ${label}`}>{label}</span>}
      </div>
      <p className="text-[17px] font-bold">
        {request.serviceName} · ₱{request.payout} to you
      </p>
      <p className="text-sm text-muted-foreground">{details}</p>
      <div className="mt-1 flex gap-2">
        <Button className="h-10 flex-1" onClick={() => respond(true)} disabled={loading !== null}>
          {loading === "accept" ? "Accepting…" : "Accept"}
        </Button>
        <Button
          variant="outline"
          className="h-10 px-4"
          onClick={() => respond(false)}
          disabled={loading !== null}
        >
          Decline
        </Button>
      </div>
    </div>
  );
}
