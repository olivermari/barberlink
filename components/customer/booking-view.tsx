"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  CarIcon,
  CheckIcon,
  ClockIcon,
  MapPinIcon,
  MessageSquareIcon,
  PhoneIcon,
  ScissorsIcon,
  TriangleAlertIcon,
  WalletIcon,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { distanceKm } from "@/lib/distance";
import { useRoute } from "@/lib/use-route";
import { formatShortDate, PAYMENT_METHOD_LABEL } from "@/lib/format";
import { REVIEW_TAG_LABEL } from "@/lib/review-tags";
import { cn } from "@/lib/utils";
import { TrackingMap } from "@/components/map/tracking-map-lazy";
import { BookingChat } from "@/components/chat/booking-chat";
import { CancelBookingButton } from "@/components/cancel-booking-button";
import { InlineReview } from "@/components/customer/inline-review";
import { QueueCard } from "@/components/customer/queue-card";
import { Caption, Card, MobileHeader, Photo, Rating } from "@/components/customer/ui";
import { Button } from "@/components/ui/button";

export type TrackedBooking = {
  id: string;
  status: string;
  // 'barber' or 'timeout' (0017) once declined.
  declineReason: string | null;
  price: number;
  paymentMethod: string | null;
  paymentStatus: string;
  addressText: string;
  addressLat: number | null;
  addressLng: number | null;
  requestedAt: string;
  serviceName: string;
};

export type TrackedBarber = {
  id: string;
  name: string;
  avatarUrl: string | null;
  phone: string | null;
  ratingAvg: number;
  ratingCount: number;
  lat: number | null;
  lng: number | null;
};

type Review = { rating: number; comment: string | null; tags: string[] };
type Tip = { amount: number; status: string };

// The design's five steps. There's no "arrived" status in the database —
// it's derived: the barber is on the way and their live position is at
// the door.
const STEP_LABELS = ["Booked", "On the Way", "Arrived", "In Progress", "Done"];
const ARRIVED_KM = 0.05;

function stepFor(status: string, arrived: boolean) {
  switch (status) {
    case "on_the_way":
      return arrived ? 2 : 1;
    case "in_service":
      return 3;
    case "completed":
      return 4;
    default:
      return 0; // queued, pending, accepted
  }
}

// No toast for "cancelled": the customer is almost always the one who
// cancelled, and the cancel button already confirms it.
const STATUS_TOAST: Record<string, string> = {
  pending: "You're up — waiting for your barber to accept.",
  accepted: "Your barber accepted.",
  on_the_way: "Your barber is on the way!",
  in_service: "Your cut has started.",
  completed: "All done — how was it?",
  declined: "Your barber couldn't take this one.",
};

const PAYMENT_STATUS_LABEL: Record<string, string> = {
  paid: "Paid",
  pending: "Pending",
  failed: "Failed",
  refunded: "Refunded",
};

// Straight-line distance × 1.3 for roads, at ~20 km/h for a motorbike
// in town traffic. Rough on purpose — it's shown with a "~".
function etaMinutes(km: number) {
  return Math.max(1, Math.round(((km * 1.3) / 20) * 60));
}

// Customer UI Track (mobile) and W3 (web), plus the queued state, the
// "All set!" completion screen and the declined / cancelled endings of
// the same booking.
export function BookingView({
  booking,
  barber,
  currentUserId,
  requestTimeoutSeconds,
  initialQueueDepth,
  review,
  tip,
  reportSlot,
}: {
  booking: TrackedBooking;
  barber: TrackedBarber;
  currentUserId: string;
  // How long a barber has to answer (platform_settings) — shown while
  // pending so "waiting" doesn't feel indefinite.
  requestTimeoutSeconds: number;
  initialQueueDepth: number | null;
  review: Review | null;
  tip: Tip | null;
  reportSlot: React.ReactNode;
}) {
  const [status, setStatus] = useState(booking.status);
  const [declineReason, setDeclineReason] = useState(booking.declineReason);
  const [serverStatus, setServerStatus] = useState(booking.status);
  const statusRef = useRef(booking.status);
  const [barberPos, setBarberPos] = useState(
    barber.lat != null && barber.lng != null ? { lat: barber.lat, lng: barber.lng } : null,
  );
  // When the live position last changed, so a frozen pin can be called
  // out instead of quietly implying an exact live ETA.
  const [posUpdatedAt, setPosUpdatedAt] = useState<number | null>(() => (barberPos ? Date.now() : null));
  const [nowTick, setNowTick] = useState(() => Date.now());
  const [queueDepth, setQueueDepth] = useState(initialQueueDepth);

  useEffect(() => {
    const timer = setInterval(() => setNowTick(Date.now()), 5000);
    return () => clearInterval(timer);
  }, []);

  // A server refresh (e.g. after cancelling) can land before the
  // realtime event does.
  if (booking.status !== serverStatus) {
    setServerStatus(booking.status);
    setStatus(booking.status);
    setDeclineReason(booking.declineReason);
  }

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    async function start() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (cancelled) return;
      // Without this, the channel joins successfully but RLS silently
      // drops every event — the realtime client's auth sync from
      // @supabase/ssr's cookie-based session lags the initial subscribe.
      if (session) supabase.realtime.setAuth(session.access_token);

      channel = supabase
        .channel(`booking-view-${booking.id}`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "bookings",
            filter: `id=eq.${booking.id}`,
          },
          (payload) => {
            const row = payload.new as { status: string; decline_reason: string | null };
            if (statusRef.current === row.status) return;
            statusRef.current = row.status;
            const message =
              row.status === "declined" && row.decline_reason === "timeout"
                ? "Your barber didn't respond in time."
                : STATUS_TOAST[row.status];
            if (message) toast.info(message);
            setDeclineReason(row.decline_reason);
            setStatus(row.status);
          },
        )
        // Live barber position for the map and the ETA (0016 adds
        // barber_profiles to the realtime publication).
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "barber_profiles",
            filter: `id=eq.${barber.id}`,
          },
          (payload) => {
            const row = payload.new as { current_lat: number | null; current_lng: number | null };
            if (row.current_lat != null && row.current_lng != null) {
              setBarberPos({ lat: row.current_lat, lng: row.current_lng });
              setPosUpdatedAt(Date.now());
            }
          },
        )
        .subscribe();
    }

    start();

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [booking.id, barber.id]);

  // Other customers leave the queue without this booking's row changing,
  // so the count is polled rather than pushed.
  useEffect(() => {
    if (status !== "queued") return;
    const supabase = createClient();
    const timer = setInterval(async () => {
      const { data } = await supabase.rpc("queue_depth", { target_booking_id: booking.id });
      if (typeof data === "number") setQueueDepth(data);
    }, 30_000);
    return () => clearInterval(timer);
  }, [status, booking.id]);

  // Road-following route and ETA (OSRM) while the barber is heading
  // over; null falls back to the straight line and etaMinutes() below.
  // Called before the early returns so hook order stays stable.
  const route = useRoute(
    barberPos,
    booking.addressLat != null && booking.addressLng != null
      ? { lat: booking.addressLat, lng: booking.addressLng }
      : null,
    status === "accepted" || status === "on_the_way",
  );

  const methodLabel = PAYMENT_METHOD_LABEL[booking.paymentMethod ?? ""] ?? "Payment";

  if (status === "completed") {
    return (
      <CompletedView
        booking={booking}
        barber={barber}
        methodLabel={methodLabel}
        review={review}
        tip={tip}
        reportSlot={reportSlot}
      />
    );
  }

  if (status === "declined" || status === "cancelled") {
    return (
      <EndedView
        status={status}
        declineReason={declineReason}
        booking={booking}
        barber={barber}
        methodLabel={methodLabel}
        reportSlot={reportSlot}
      />
    );
  }

  const spot =
    booking.addressLat != null && booking.addressLng != null
      ? { lat: booking.addressLat, lng: booking.addressLng }
      : null;
  const km = barberPos && spot ? distanceKm(barberPos, spot) : null;
  // "Arrived" means at the door, so it stays on straight-line distance;
  // what's shown to the customer uses the road route when there is one.
  const arrived = status === "on_the_way" && km != null && km <= ARRIVED_KM;
  const shownKm = route?.remainingKm ?? km;
  const shownEta = route?.etaMin ?? (km != null ? etaMinutes(km) : null);
  const step = stepFor(status, arrived);
  const posAgeSeconds = posUpdatedAt != null ? Math.round((nowTick - posUpdatedAt) / 1000) : null;
  // A frozen pin still looks like a precise live ETA otherwise — call
  // out staleness once the last update is more than a couple minutes old.
  const staleness =
    status === "on_the_way" && posAgeSeconds != null && posAgeSeconds > 120
      ? `Stale position — last update ${Math.round(posAgeSeconds / 60)} min ago`
      : null;

  const headline = arrived
    ? { Icon: MapPinIcon, title: `${barber.name} has arrived`, sub: "Your barber is at your door." }
    : status === "on_the_way"
      ? {
          Icon: CarIcon,
          title: "Barber is on the way",
          sub:
            shownKm != null && shownEta != null
              ? `ETA ${shownEta} min · ${shownKm.toFixed(1)} km`
              : "On the way to you",
        }
      : status === "in_service"
        ? { Icon: ScissorsIcon, title: "Your cut is in progress", sub: "Sit back — you're in good hands." }
        : status === "accepted"
          ? { Icon: CheckIcon, title: `${barber.name} accepted`, sub: "Getting ready to head your way." }
          : {
              Icon: ClockIcon,
              title: `Waiting for ${barber.name} to accept`,
              sub: `Barbers usually answer within ${requestTimeoutSeconds}s`,
            };
  const cancellable = ["queued", "pending", "accepted", "on_the_way"].includes(status);

  const stepsHorizontal = (
    <ol className="flex px-[18px]">
      {STEP_LABELS.map((label, i) => {
        const done = i <= step;
        return (
          <li
            key={label}
            aria-current={i === step ? "step" : undefined}
            className="flex w-1/5 flex-col items-center gap-[7px]"
          >
            <span
              className={cn(
                "flex size-[30px] items-center justify-center rounded-full text-[13px] font-bold",
                done ? "bg-primary text-white" : "border-[1.5px] border-[#4c463d] text-faint",
              )}
            >
              {i + 1}
            </span>
            <span
              className={cn(
                "text-[10.5px] whitespace-nowrap",
                i === step ? "font-bold text-white" : done ? "text-[#cfc8bd]" : "text-faint",
              )}
            >
              {label}
            </span>
          </li>
        );
      })}
    </ol>
  );

  const stepsVertical = (
    <ol className="flex flex-col gap-[13px]">
      {STEP_LABELS.map((label, i) => {
        const done = i <= step;
        return (
          <li key={label} aria-current={i === step ? "step" : undefined} className="flex items-center gap-3">
            <span
              className={cn(
                "flex size-7 shrink-0 items-center justify-center rounded-full text-[13px] font-bold",
                done ? "bg-primary text-white" : "border-[1.5px] border-field text-[#a49c90]",
              )}
            >
              {i + 1}
            </span>
            <span
              className={cn(
                "text-[14.5px]",
                i === step ? "font-bold" : done ? "font-medium" : "font-medium text-faint",
              )}
            >
              {label}
            </span>
            {i === step && <span className="ml-auto text-[12.5px] font-bold text-primary">now</span>}
          </li>
        );
      })}
    </ol>
  );

  const barberRow = (
    <div className="flex items-center gap-[11px]">
      <Photo src={barber.avatarUrl} name={barber.name} className="size-[42px] lg:size-[46px]" />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-[15px] font-bold">{barber.name}</span>
        <Rating avg={barber.ratingAvg} count={barber.ratingCount} />
      </div>
      {barber.phone && (
        <a
          href={`tel:${barber.phone}`}
          aria-label={`Call ${barber.name}`}
          className="flex size-[38px] items-center justify-center rounded-[10px] border border-field transition-colors hover:bg-wash"
        >
          <PhoneIcon className="size-[18px]" aria-hidden />
        </a>
      )}
      <a
        href="#chat"
        aria-label="Go to chat"
        className="flex size-[38px] items-center justify-center rounded-[10px] border border-field transition-colors hover:bg-wash lg:hidden"
      >
        <MessageSquareIcon className="size-[18px]" aria-hidden />
      </a>
    </div>
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col lg:grid lg:grid-cols-[minmax(0,1fr)_400px]">
      <h1 className="sr-only">Your booking with {barber.name}</h1>

      <div className="flex min-h-0 min-w-0 flex-col">
        {/* Phone: dark header holding the five steps */}
        <div className="bg-foreground pb-4 text-white lg:hidden">
          <p className="px-[18px] pt-2.5 pb-4 text-[22px] font-extrabold tracking-[-0.02em]">Track</p>
          {stepsHorizontal}
        </div>

        {/* Map, with status + ETA overlaid on web */}
        <div className="relative isolate min-h-[240px] flex-1 overflow-hidden bg-[#ece8dd]">
          <div className="absolute inset-0 z-0">
            {spot && <TrackingMap customer={spot} barber={barberPos} route={route} />}
          </div>
          <div className="absolute top-[18px] left-[18px] z-[500] hidden items-center gap-3.5 rounded-[11px] bg-foreground px-4 py-[13px] text-white shadow-[0_8px_24px_rgba(22,19,15,0.18)] lg:flex">
            <span className="text-[15px] font-bold">{STEP_LABELS[step]}</span>
            {status === "on_the_way" && shownKm != null && shownEta != null && (
              <>
                <span className="h-[18px] w-px bg-[#3a342c]" />
                <span className="text-[15px] font-bold">ETA {shownEta} min</span>
                <span className="text-[13px] text-[#a49c90]">{shownKm.toFixed(1)} km</span>
              </>
            )}
          </div>
          {staleness && (
            <div className="absolute bottom-[18px] left-[18px] z-[500] hidden items-center gap-2 rounded-[9px] border border-warn-border bg-warn px-3 py-[9px] lg:flex">
              <TriangleAlertIcon className="size-4 text-warn-fg" aria-hidden />
              <span className="text-[12.5px] font-semibold text-warn-fg">{staleness}</span>
            </div>
          )}
        </div>

        {/* Phone: status, barber, chat */}
        <div className="flex flex-col gap-[11px] px-[18px] pt-3.5 lg:hidden">
          {status === "queued" ? (
            <QueueCard
              bookingId={booking.id}
              barberId={barber.id}
              barberName={barber.name}
              queueDepth={queueDepth}
            />
          ) : (
            <Card className="flex flex-col gap-[9px] p-3.5 shadow-[0_-6px_20px_rgba(22,19,15,0.04)]">
              <div className="flex items-center gap-[11px]">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] border border-wash-border bg-wash">
                  <headline.Icon className="size-[18px]" aria-hidden />
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="text-[15px] font-bold">{headline.title}</span>
                  <span className="text-[13px] text-[#6a635a]">{headline.sub}</span>
                </div>
              </div>
              {staleness && (
                <div className="flex items-center gap-2 rounded-lg border border-warn-border bg-warn px-2.5 py-2">
                  <TriangleAlertIcon className="size-4 shrink-0 text-warn-fg" aria-hidden />
                  <span className="text-[12.5px] font-semibold text-warn-fg">{staleness}</span>
                </div>
              )}
            </Card>
          )}
          <Card className="px-3.5 py-3">{barberRow}</Card>
          <BookingChat
            bookingId={booking.id}
            currentUserId={currentUserId}
            otherPartyLabel={barber.name}
            otherPartyAvatarUrl={barber.avatarUrl}
            variant="customer"
            className="max-h-[360px]"
          />
          {cancellable && status !== "queued" && (
            <CancelBookingButton
              bookingId={booking.id}
              status={status}
              className="h-11 w-full rounded-[10px] border border-line text-[15px] font-semibold text-[#6a635a]"
            />
          )}
        </div>
      </div>

      {/* Web: the rail — steps, barber, chat */}
      <aside className="hidden min-h-0 min-w-0 flex-col border-l border-line-soft lg:flex">
        <div className="flex flex-col gap-[13px] border-b border-line-soft px-5 py-[18px]">
          <p className="text-xl font-extrabold tracking-[-0.02em]">Track</p>
          {stepsVertical}
          {status === "queued" ? (
            <QueueCard
              bookingId={booking.id}
              barberId={barber.id}
              barberName={barber.name}
              queueDepth={queueDepth}
            />
          ) : (
            <p className="text-[13px] text-[#6a635a]">
              <span className="font-bold text-foreground">{headline.title}.</span> {headline.sub}
            </p>
          )}
        </div>
        <div className="border-b border-line-soft px-5 py-4">{barberRow}</div>
        <div className="flex min-h-0 flex-1 flex-col gap-[11px] px-5 py-4">
          <Caption>Chat</Caption>
          <BookingChat
            bookingId={booking.id}
            currentUserId={currentUserId}
            otherPartyLabel={barber.name}
            otherPartyAvatarUrl={barber.avatarUrl}
            variant="customer"
            className="flex-1"
          />
          {cancellable && status !== "queued" && (
            <CancelBookingButton
              bookingId={booking.id}
              status={status}
              className="h-10 w-full rounded-[10px] border border-line text-sm font-semibold text-[#6a635a]"
            />
          )}
        </div>
      </aside>
    </div>
  );
}

// "All set!" — the finished booking with an optional inline review. Also
// what a past booking shows when opened from History.
function CompletedView({
  booking,
  barber,
  methodLabel,
  review,
  tip,
  reportSlot,
}: {
  booking: TrackedBooking;
  barber: TrackedBarber;
  methodLabel: string;
  review: Review | null;
  tip: Tip | null;
  reportSlot: React.ReactNode;
}) {
  const paid = booking.paymentStatus === "paid";
  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col lg:py-6">
      <MobileHeader title="All set!" backHref="/customer/history" center />
      <div className="flex flex-1 flex-col gap-[13px] px-[18px] pt-2 pb-4 lg:px-0">
        <div className="flex flex-col items-center gap-2.5 pt-2.5 pb-1">
          <span className="flex size-14 items-center justify-center rounded-full border border-ok-border bg-ok">
            <CheckIcon className="size-7 text-ok-fg" aria-hidden />
          </span>
          <h1 className="text-[15px] font-normal text-[#4c463d] lg:text-xl lg:font-extrabold lg:text-foreground">
            <span className="hidden lg:inline">All set! </span>Your booking is complete.
          </h1>
        </div>

        <Card className="flex items-center gap-3 p-3.5">
          <Photo src={barber.avatarUrl} name={barber.name} className="size-12" />
          <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
            <span className="text-base font-bold">{barber.name}</span>
            <Rating avg={barber.ratingAvg} count={barber.ratingCount} />
            <span className="text-[13px] text-[#6a635a]">
              {booking.serviceName} · {formatShortDate(booking.requestedAt)}
            </span>
          </div>
          <span className="text-base font-extrabold">₱{booking.price}</span>
        </Card>

        <Card className="flex items-start gap-3 p-3.5">
          <MapPinIcon className="mt-0.5 size-6 shrink-0" aria-hidden />
          <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
            <Caption>Address</Caption>
            <span className="text-[15px] font-semibold">{booking.addressText}</span>
          </div>
        </Card>

        <Card className="flex items-center gap-3 p-3.5">
          <WalletIcon className="size-6 shrink-0" aria-hidden />
          <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
            <Caption>Payment</Caption>
            <span className="text-[15px] font-semibold">
              {methodLabel} · ₱{booking.price} total
              {paid ? "" : booking.paymentMethod === "cod" ? "" : ` · ${PAYMENT_STATUS_LABEL[booking.paymentStatus] ?? booking.paymentStatus}`}
            </span>
            {tip && (
              <span className="text-[13px] text-[#6a635a]">
                Tip ₱{tip.amount} · {tip.status === "paid" ? "Sent" : "Waiting for GCash"}
              </span>
            )}
          </div>
          <span className="text-base font-extrabold">₱{booking.price}</span>
        </Card>

        {review ? (
          <Card className="flex flex-col gap-2 p-[15px]">
            <span className="text-[15px] font-bold">Your review</span>
            <p className="text-[26px] leading-none tracking-[2px] text-primary" aria-label={`${review.rating} out of 5 stars`}>
              {"★".repeat(review.rating)}
              <span className="text-field">{"★".repeat(5 - review.rating)}</span>
            </p>
            {review.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {review.tags.map((t) => (
                  <span key={t} className="rounded-full border border-field px-2.5 py-1 text-xs">
                    {REVIEW_TAG_LABEL[t] ?? t}
                  </span>
                ))}
              </div>
            )}
            {review.comment && <p className="text-sm text-[#6a635a]">{review.comment}</p>}
          </Card>
        ) : (
          <InlineReview bookingId={booking.id} barberId={barber.id} barberName={barber.name} />
        )}

        <div className="mt-auto flex flex-col gap-2.5 pb-0.5">
          <Button
            nativeButton={false}
            render={<Link href={`/customer/history?b=${booking.id}`} />}
            className="h-[52px] w-full rounded-xl text-base font-bold"
          >
            View Receipt
          </Button>
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href="/customer" />}
            className="h-[50px] w-full rounded-xl border border-foreground text-[15px] font-bold"
          >
            Back to Home
          </Button>
          <div className="flex justify-center pt-1">{reportSlot}</div>
        </div>
      </div>
    </div>
  );
}

// A booking that ended without a cut: declined, expired or cancelled.
function EndedView({
  status,
  declineReason,
  booking,
  barber,
  methodLabel,
  reportSlot,
}: {
  status: string;
  declineReason: string | null;
  booking: TrackedBooking;
  barber: TrackedBarber;
  methodLabel: string;
  reportSlot: React.ReactNode;
}) {
  const declined = status === "declined";
  const timedOut = declined && declineReason === "timeout";
  const title = timedOut ? "Request expired" : declined ? "Request declined" : "Booking cancelled";
  const sub = timedOut
    ? `${barber.name} didn't respond in time. Quick Match finds the nearest free barber instead.`
    : declined
      ? `${barber.name} couldn't take this one. Quick Match finds the nearest free barber instead.`
      : "Nothing's on its way. Book again whenever you're ready.";
  const paymentState =
    booking.paymentStatus !== "paid" ? "Not charged" : (PAYMENT_STATUS_LABEL[booking.paymentStatus] ?? booking.paymentStatus);

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col lg:py-6">
      <MobileHeader title={title} backHref="/customer/history" center />
      <div className="flex flex-1 flex-col gap-[13px] px-[18px] pt-2 pb-4 lg:px-0">
        <div className="flex flex-col gap-1 pt-2">
          <h1 className="hidden text-xl font-extrabold lg:block">{title}</h1>
          <p className="text-[15px] text-[#4c463d]">{sub}</p>
        </div>

        <Card className="flex items-center gap-3 p-3.5">
          <Photo src={barber.avatarUrl} name={barber.name} className="size-12" />
          <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
            <span className="text-base font-bold">{barber.name}</span>
            <span className="text-[13px] text-[#6a635a]">
              {booking.serviceName} · {formatShortDate(booking.requestedAt)}
            </span>
          </div>
          <span className="text-base font-extrabold">₱{booking.price}</span>
        </Card>
        <Card className="flex items-start gap-3 p-3.5">
          <MapPinIcon className="mt-0.5 size-6 shrink-0" aria-hidden />
          <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
            <Caption>Address</Caption>
            <span className="text-[15px] font-semibold">{booking.addressText}</span>
          </div>
        </Card>
        <Card className="flex items-center gap-3 p-3.5">
          <WalletIcon className="size-6 shrink-0" aria-hidden />
          <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
            <Caption>Payment</Caption>
            <span className="text-[15px] font-semibold">
              {booking.paymentMethod ? `${methodLabel} · ${paymentState}` : paymentState}
            </span>
          </div>
        </Card>

        <div className="mt-auto flex flex-col gap-2.5 pb-0.5">
          {declined && (
            <Button
              nativeButton={false}
              render={<Link href={`/customer?match=1&exclude=${barber.id}`} />}
              className="h-[52px] w-full rounded-xl text-base font-bold"
            >
              Quick Match again
            </Button>
          )}
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href={`/customer/barbers/${barber.id}`} />}
            className="h-[50px] w-full rounded-xl border border-foreground text-[15px] font-bold"
          >
            Book again with {barber.name}
          </Button>
          <div className="flex justify-center pt-1">{reportSlot}</div>
        </div>
      </div>
    </div>
  );
}
