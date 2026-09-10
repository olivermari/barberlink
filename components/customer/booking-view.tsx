"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { MessageCircleIcon, PhoneIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { distanceKm } from "@/lib/distance";
import { formatShortDate, PAYMENT_METHOD_LABEL } from "@/lib/format";
import { initials } from "@/lib/initials";
import { REVIEW_TAG_LABEL } from "@/lib/review-tags";
import { cn } from "@/lib/utils";
import { TrackingMap } from "@/components/map/tracking-map-lazy";
import { BookingChat } from "@/components/chat/booking-chat";
import { CancelBookingButton } from "@/components/cancel-booking-button";
import { QueueCard } from "@/components/customer/queue-card";
import { ReviewForm } from "@/components/review-form";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { SectionLabel } from "@/components/ui/section-label";

export type TrackedBooking = {
  id: string;
  status: string;
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

// The tracker's five statuses as one horizontal bar (C4), so the map
// keeps the height it needs.
const STEPS = [
  { status: "pending", label: "Requested" },
  { status: "accepted", label: "Accepted" },
  { status: "on_the_way", label: "On the way" },
  { status: "in_service", label: "In service" },
  { status: "completed", label: "Done" },
];

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

// Wireframes C4 (mobile) and C8 (web), plus the queued (C5), review (C6)
// and finished states of the same booking.
export function BookingView({
  booking,
  barber,
  currentUserId,
  initialQueueDepth,
  review,
  tip,
  reportSlot,
}: {
  booking: TrackedBooking;
  barber: TrackedBarber;
  currentUserId: string;
  initialQueueDepth: number | null;
  review: Review | null;
  tip: Tip | null;
  reportSlot: React.ReactNode;
}) {
  const [status, setStatus] = useState(booking.status);
  const [serverStatus, setServerStatus] = useState(booking.status);
  const statusRef = useRef(booking.status);
  const [barberPos, setBarberPos] = useState(
    barber.lat != null && barber.lng != null ? { lat: barber.lat, lng: barber.lng } : null,
  );
  const [queueDepth, setQueueDepth] = useState(initialQueueDepth);
  const [skippedReview, setSkippedReview] = useState(false);

  // A server refresh (e.g. after cancelling) can land before the
  // realtime event does.
  if (booking.status !== serverStatus) {
    setServerStatus(booking.status);
    setStatus(booking.status);
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
            const next = (payload.new as { status: string }).status;
            if (statusRef.current === next) return;
            statusRef.current = next;
            const message = STATUS_TOAST[next];
            if (message) toast.info(message);
            setStatus(next);
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

  const methodLabel = PAYMENT_METHOD_LABEL[booking.paymentMethod ?? ""] ?? "Payment";
  const paid = booking.paymentStatus === "paid";

  if (status === "completed" && !review && !skippedReview) {
    const paymentLabel =
      booking.paymentMethod === "cod"
        ? paid
          ? "paid in cash"
          : "in cash"
        : `${paid ? "paid " : ""}by ${methodLabel}`;
    return (
      <ReviewForm
        bookingId={booking.id}
        barberId={barber.id}
        barberName={barber.name}
        barberAvatarUrl={barber.avatarUrl}
        price={booking.price}
        paymentLabel={paymentLabel}
        onSkip={() => setSkippedReview(true)}
      />
    );
  }

  if (status === "completed" || status === "declined" || status === "cancelled") {
    return (
      <Finished
        status={status}
        booking={booking}
        barber={barber}
        methodLabel={methodLabel}
        review={review}
        tip={tip}
        onRate={() => setSkippedReview(false)}
        reportSlot={reportSlot}
      />
    );
  }

  const spot =
    booking.addressLat != null && booking.addressLng != null
      ? { lat: booking.addressLat, lng: booking.addressLng }
      : null;
  const stepIndex = STEPS.findIndex((s) => s.status === status);
  const km = barberPos && spot ? distanceKm(barberPos, spot) : null;
  const eta =
    status === "on_the_way" && km != null
      ? `~${etaMinutes(km)} min`
      : status === "pending"
        ? "Waiting to accept"
        : null;
  const meta = [
    barber.ratingCount > 0 ? `★ ${barber.ratingAvg.toFixed(1)}` : null,
    `${methodLabel} ₱${booking.price}`,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="grid flex-1 grid-cols-1 content-start lg:mx-auto lg:w-full lg:max-w-6xl lg:grid-cols-[minmax(0,1fr)_380px] lg:grid-rows-[auto_1fr] lg:gap-5 lg:p-6">
      <h1 className="sr-only">Your booking with {barber.name}</h1>

      {/* Mobile order: map, status, details. Web (C8): status strip on
          top, map and chat side by side. */}
      <div className="isolate h-60 overflow-hidden bg-placeholder lg:col-start-1 lg:row-start-2 lg:h-auto lg:min-h-[460px] lg:rounded-lg lg:border-[1.5px] lg:border-outline">
        {spot && <TrackingMap customer={spot} barber={barberPos} />}
      </div>

      <div className="px-4 pt-4 lg:col-span-2 lg:row-start-1 lg:p-0">
        {status === "queued" ? (
          <QueueCard
            bookingId={booking.id}
            barberId={barber.id}
            barberName={barber.name}
            queueDepth={queueDepth}
          />
        ) : (
          <StatusStrip stepIndex={stepIndex} eta={eta} />
        )}
        <p className="mt-2.5 truncate text-sm text-muted-foreground">
          {booking.serviceName} · {booking.addressText}
        </p>
      </div>

      <div className="flex flex-col gap-4 p-4 lg:col-start-2 lg:row-start-2 lg:p-0">
        <div className="flex items-center gap-3 rounded-lg border-[1.5px] border-outline p-3.5">
          <Avatar className="size-12">
            {barber.avatarUrl && <AvatarImage src={barber.avatarUrl} alt={barber.name} />}
            <AvatarFallback>{initials(barber.name)}</AvatarFallback>
          </Avatar>
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="truncate text-base font-bold">{barber.name}</span>
            <span className="text-sm text-muted-foreground">{meta}</span>
          </div>
          <div className="flex gap-1.5">
            {barber.phone && (
              <Button
                variant="outline"
                size="icon"
                nativeButton={false}
                render={<a href={`tel:${barber.phone}`} />}
                aria-label={`Call ${barber.name}`}
              >
                <PhoneIcon />
              </Button>
            )}
            <Button
              variant="outline"
              size="icon"
              nativeButton={false}
              render={<a href="#chat" />}
              aria-label="Go to chat"
            >
              <MessageCircleIcon />
            </Button>
          </div>
        </div>

        <BookingChat
          bookingId={booking.id}
          currentUserId={currentUserId}
          otherPartyLabel={barber.name}
          className="min-h-64 flex-1"
        />

        {status !== "queued" && (
          <CancelBookingButton
            bookingId={booking.id}
            status={status}
            className="h-12 w-full text-[15px] text-muted-foreground"
          />
        )}
      </div>
    </div>
  );
}

function StatusStrip({ stepIndex, eta }: { stepIndex: number; eta: string | null }) {
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-[23px] font-black">{STEPS[stepIndex]?.label ?? "Booking"}</h2>
        {eta && <span className="shrink-0 text-[15px] text-muted-foreground">{eta}</span>}
      </div>
      <div className="flex gap-1.5" aria-hidden>
        {STEPS.map((s, i) => (
          <div
            key={s.status}
            className={cn("h-1.5 flex-1 rounded-[3px]", i <= stepIndex ? "bg-primary" : "bg-border")}
          />
        ))}
      </div>
      <ol className="flex justify-between text-[11px] text-muted-foreground">
        {STEPS.map((s, i) => (
          <li
            key={s.status}
            aria-current={i === stepIndex ? "step" : undefined}
            className={cn(i === stepIndex && "font-bold text-primary")}
          >
            {s.label}
          </li>
        ))}
      </ol>
    </div>
  );
}

function Finished({
  status,
  booking,
  barber,
  methodLabel,
  review,
  tip,
  onRate,
  reportSlot,
}: {
  status: string;
  booking: TrackedBooking;
  barber: TrackedBarber;
  methodLabel: string;
  review: Review | null;
  tip: Tip | null;
  onRate: () => void;
  reportSlot: React.ReactNode;
}) {
  const completed = status === "completed";
  const declined = status === "declined";
  const title = completed ? "All done" : declined ? "Request declined" : "Booking cancelled";
  const sub = completed
    ? `${booking.serviceName} with ${barber.name} · ${formatShortDate(booking.requestedAt)}`
    : declined
      ? `${barber.name} couldn't take this one. Quick Match finds the nearest free barber instead.`
      : "Nothing's on its way. Book again whenever you're ready.";
  const paymentState =
    !completed && booking.paymentStatus !== "paid"
      ? "Not charged"
      : (PAYMENT_STATUS_LABEL[booking.paymentStatus] ?? booking.paymentStatus);

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 p-4 sm:py-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-[23px] font-black">{title}</h1>
        <p className="text-[15px] text-muted-foreground">{sub}</p>
      </div>

      <dl className="flex flex-col gap-2.5 rounded-lg border-[1.5px] border-outline p-3.5 text-sm">
        <ReceiptRow label={booking.serviceName} value={`₱${booking.price}`} />
        <ReceiptRow
          label="Payment"
          value={booking.paymentMethod ? `${methodLabel} · ${paymentState}` : paymentState}
        />
        {tip && (
          <ReceiptRow
            label="Tip"
            value={`₱${tip.amount} · ${tip.status === "paid" ? "Sent" : "Waiting for GCash"}`}
          />
        )}
        <ReceiptRow label="Where" value={booking.addressText} />
      </dl>

      {completed &&
        (review ? (
          <div className="flex flex-col gap-2 rounded-lg border-[1.5px] border-border p-3.5">
            <SectionLabel>Your review</SectionLabel>
            <p className="text-lg leading-none text-primary" aria-label={`${review.rating} out of 5 stars`}>
              {"★".repeat(review.rating)}
              <span className="text-border">{"★".repeat(5 - review.rating)}</span>
            </p>
            {review.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {review.tags.map((t) => (
                  <span key={t} className="rounded-full border border-input px-2.5 py-1 text-xs">
                    {REVIEW_TAG_LABEL[t] ?? t}
                  </span>
                ))}
              </div>
            )}
            {review.comment && <p className="text-sm text-muted-foreground">{review.comment}</p>}
          </div>
        ) : (
          <Button variant="outline" className="h-12 text-[15px]" onClick={onRate}>
            Rate this cut
          </Button>
        ))}

      <div className="mt-auto flex flex-col gap-2 pt-2">
        {declined && (
          <Button
            size="lg"
            className="h-14 text-lg"
            nativeButton={false}
            render={<Link href={`/customer?match=1&exclude=${barber.id}`} />}
          >
            Quick Match again
          </Button>
        )}
        <Button
          variant="outline"
          size="lg"
          className="h-12 text-[15px]"
          nativeButton={false}
          render={<Link href={`/customer/barbers/${barber.id}`} />}
        >
          Book again with {barber.name}
        </Button>
        <div className="flex justify-center pt-1">{reportSlot}</div>
      </div>
    </div>
  );
}

function ReceiptRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 truncate text-right font-medium">{value}</dd>
    </div>
  );
}
