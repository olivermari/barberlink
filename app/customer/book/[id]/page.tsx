"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { ChevronLeftIcon, MapPinIcon, ScissorsIcon, WalletIcon } from "lucide-react";
import { PinDialog } from "@/components/customer/pin-dialog";
import { Caption, Card, MobileHeader, Photo, Rating, StatusPill } from "@/components/customer/ui";
import { LocationPicker } from "@/components/map/location-picker-lazy";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { availabilityChip, availabilityLine, canBook } from "@/lib/barber-match";
import {
  bookingTotal,
  createBooking,
  PAYMENT_OPTIONS,
  paymentLabel,
  type PaymentMethod,
} from "@/lib/create-booking";
import { distanceKm } from "@/lib/distance";
import { getCurrentPosition, LocationRequiredError } from "@/lib/get-current-position";
import { reverseGeocode } from "@/lib/reverse-geocode";
import { setCuttingLocation, useCuttingLocation } from "@/lib/location-store";
import { CHOSEN_BARBER_SURCHARGE } from "@/lib/pricing";
import { useBarbers } from "@/lib/use-barbers";
import { useGeolocation } from "@/lib/use-geolocation";
import { cn } from "@/lib/utils";

export default function BookingConfirmationPage() {
  return (
    <Suspense>
      <BookingConfirmation />
    </Suspense>
  );
}

// Customer UI "Booking Confirmation" (mobile) and W2 (web): service,
// address, payment, then one commit button. On web the address and its
// map sit side by side and the summary rail holds the total and the
// commit button.
function BookingConfirmation() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const chosen = searchParams.get("via") !== "quick";
  const stored = useCuttingLocation();
  const { coords: gps } = useGeolocation();
  const { barbers } = useBarbers();

  const [serviceId, setServiceId] = useState<string | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [pin, setPin] = useState<{ lat: number; lng: number } | null>(null);
  const [payment, setPayment] = useState<PaymentMethod>("cod");
  const [pinOpen, setPinOpen] = useState(false);
  const [serviceOpen, setServiceOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [locating, setLocating] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const barber = useMemo(() => barbers?.find((b) => b.id === id) ?? null, [barbers, id]);
  const spot = pin ?? stored ?? gps;
  const addressValue = address ?? stored?.label ?? "";
  const service = barber?.services.find((s) => s.id === serviceId) ?? barber?.services[0] ?? null;
  const total = service ? bookingTotal(service.price, chosen) : 0;
  const km = barber ? distanceKm(spot, barber) : 0;

  // Prefill the search-page pin's label once when it's known.
  useEffect(() => {
    if (address === null && stored?.label) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAddress(stored.label);
    }
  }, [address, stored?.label]);

  async function applyPin(next: { lat: number; lng: number }) {
    setPin(next);
    const label = await reverseGeocode(next.lat, next.lng);
    if (label) setAddress(label);
  }

  async function useMyLocation() {
    setLocating(true);
    try {
      await applyPin(await getCurrentPosition());
    } catch (err) {
      toast.error(
        err instanceof LocationRequiredError
          ? "Turn on location access to use your current spot, or type your address."
          : "Couldn't get your location. Try again.",
      );
    } finally {
      setLocating(false);
    }
  }

  async function confirm() {
    if (!barber || !service) return;
    if (!addressValue.trim()) {
      toast.error("Add the address where the barber should come.");
      return;
    }
    setSubmitting(true);
    const result = await createBooking({
      barberId: barber.id,
      serviceId: service.id,
      servicePrice: service.price,
      chosen,
      address: addressValue,
      lat: spot.lat,
      lng: spot.lng,
      paymentMethod: payment,
    });
    if ("error" in result) {
      setSubmitting(false);
      toast.error(result.error);
      return;
    }
    // Remember this spot so the next booking starts from it.
    setCuttingLocation({ lat: spot.lat, lng: spot.lng, label: addressValue.trim() });
    if (result.external) {
      window.location.href = result.redirect;
      return;
    }
    toast.success(result.queued ? `You're in ${barber.name}'s queue.` : "Request sent!");
    router.push(result.redirect);
    router.refresh();
  }

  if (barbers !== null && (!barber || !service)) {
    return (
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
        <h1 className="text-xl font-extrabold">This barber isn&apos;t available</h1>
        <p className="text-sm text-[#6a635a]">They may have gone offline or stopped taking bookings.</p>
        <Button nativeButton={false} render={<Link href="/customer/barbers" />} className="h-12 rounded-xl px-6 font-bold">
          Choose another barber
        </Button>
      </div>
    );
  }

  const bookable = barber ? canBook(barber) : false;
  const near = barber ? { ...barber, distanceKm: km } : null;
  const chip = barber ? availabilityChip(barber) : null;

  const commit = (
    <Button
      onClick={confirm}
      disabled={submitting || !bookable || !service}
      className="h-[52px] w-full rounded-xl text-base font-bold"
    >
      {submitting ? "Confirming…" : "Confirm Booking"}
    </Button>
  );

  const lines = service && (
    <>
      <div className="flex justify-between text-sm text-[#6a635a] lg:text-[#4c463d]">
        <span>{service.name}</span>
        <span className="lg:font-semibold">₱{service.price}</span>
      </div>
      {chosen && (
        <div className="flex justify-between text-sm text-[#6a635a] lg:text-[#4c463d]">
          <span>Chosen barber</span>
          <span className="lg:font-semibold">₱{CHOSEN_BARBER_SURCHARGE}</span>
        </div>
      )}
    </>
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col lg:grid lg:grid-cols-[minmax(0,1fr)_372px] lg:[background-image:radial-gradient(#e2dbcb_1px,transparent_1.2px)] lg:[background-size:15px_15px] lg:bg-wash">
      <div className="flex min-w-0 flex-1 flex-col gap-[13px] px-[18px] pb-4 lg:gap-3.5 lg:px-6 lg:py-[22px]">
        <MobileHeader title="Booking Confirmation" backHref="/customer/barbers" className="-mx-[18px]" />
        <div className="hidden items-center gap-3 lg:flex">
          <Link href="/customer/barbers" aria-label="Back" className="flex size-8 items-center justify-center">
            <ChevronLeftIcon className="size-6" aria-hidden />
          </Link>
          <h1 className="text-2xl font-extrabold tracking-[-0.02em]">Booking Confirmation</h1>
        </div>

        {barbers === null || !barber || !service ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <>
            <Card className="flex items-center gap-3 p-3.5 lg:gap-[13px] lg:p-[15px]">
              <Photo src={barber.avatarUrl} name={barber.name} className="size-[52px] lg:size-14" />
              <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
                <span className="text-base font-bold lg:text-[17px]">{barber.name}</span>
                <Rating avg={barber.ratingAvg} count={barber.ratingCount} />
                <span className="text-[13px] text-[#6a635a]">{near && availabilityLine(near)}</span>
              </div>
              {chip && (
                <StatusPill tone={chip.tone} className="hidden lg:inline-flex">
                  {chip.label}
                </StatusPill>
              )}
            </Card>

            <Card className="flex items-center gap-3 p-3.5 lg:p-[15px]">
              <ScissorsIcon className="size-6 shrink-0" aria-hidden />
              <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
                <Caption>Service</Caption>
                <span className="text-[15px] font-semibold">
                  {service.name}
                  <span className="hidden lg:inline"> · {service.duration_minutes} min</span>
                </span>
              </div>
              {barber.services.length > 1 && (
                <button
                  type="button"
                  onClick={() => setServiceOpen(true)}
                  className="-my-2 px-1 py-2 text-[13px] font-bold text-primary"
                >
                  Change
                </button>
              )}
              <span className="text-base font-extrabold">₱{service.price}</span>
            </Card>

            <Card className="flex flex-col gap-[11px] p-3.5 lg:flex-row lg:gap-3.5 lg:p-[15px]">
              <div className="flex min-w-0 flex-1 items-start gap-3 lg:flex-col lg:gap-[9px]">
                <MapPinIcon className="mt-0.5 size-6 shrink-0 lg:hidden" aria-hidden />
                <div className="flex min-w-0 flex-1 flex-col gap-[3px] lg:w-full lg:flex-none lg:gap-[9px]">
                  <Caption>Address</Caption>
                  <input
                    value={addressValue}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Street, barangay, city"
                    aria-label="Address"
                    className="w-full min-w-0 bg-transparent text-[15px] font-semibold outline-none placeholder:font-normal placeholder:text-faint"
                  />
                </div>
                <div className="mt-0.5 hidden gap-2 lg:flex">
                  <Button
                    variant="outline"
                    onClick={useMyLocation}
                    disabled={locating}
                    className="h-auto rounded-[9px] border border-foreground px-[13px] py-2.5 text-[13px] font-bold"
                  >
                    {locating ? "Locating…" : "Use my location"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setPinOpen(true)}
                    className="h-auto rounded-[9px] border border-foreground px-[13px] py-2.5 text-[13px] font-bold"
                  >
                    Pin on map
                  </Button>
                </div>
              </div>
              <div className="relative isolate h-[118px] shrink-0 overflow-hidden rounded-[10px] border border-line bg-[#ece8dd] lg:h-[132px] lg:w-[260px] lg:rounded-[11px]">
                <LocationPicker position={spot} interactive={false} key={`${spot.lat},${spot.lng}`} />
                <button
                  type="button"
                  onClick={() => setPinOpen(true)}
                  className="absolute right-[9px] bottom-[9px] z-[500] rounded-[7px] border border-field bg-white px-[11px] py-[7px] text-xs font-bold lg:hidden"
                >
                  View on map
                </button>
              </div>
            </Card>

            <Card className="flex items-center gap-3 p-3.5 lg:p-[15px]">
              <WalletIcon className="size-6 shrink-0" aria-hidden />
              <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
                <Caption>Payment Method</Caption>
                <span className="text-[15px] font-semibold">{paymentLabel(payment)}</span>
              </div>
              <button
                type="button"
                onClick={() => setPaymentOpen(true)}
                className="-my-2 px-1 py-2 text-[13px] font-bold text-primary"
              >
                Change
              </button>
            </Card>

            {!bookable && (
              <p role="alert" className="text-sm text-destructive">
                {barber.name} isn&apos;t taking bookings right now.
              </p>
            )}

            {/* Phone: summary + commit at the foot */}
            <div className="mt-auto flex flex-col gap-[9px] border-t border-line-soft pt-3.5 lg:hidden">
              {lines}
              <div className="flex items-baseline justify-between">
                <span className="text-[15px] font-bold">Total</span>
                <span className="text-2xl font-extrabold">₱{total}</span>
              </div>
              <div className="mt-[3px]">{commit}</div>
            </div>
          </>
        )}
      </div>

      {/* Web: summary rail */}
      <aside className="hidden flex-col gap-[13px] border-l border-line-soft bg-white px-5 py-[22px] lg:flex">
        <Caption>Summary</Caption>
        {lines}
        <div className="h-px bg-line-soft" />
        <div className="flex items-baseline justify-between">
          <span className="text-[15px] font-bold">Total</span>
          <span className="text-[28px] font-extrabold">₱{total}</span>
        </div>
        <div className="mt-1">{commit}</div>
        <p className="text-[13px] leading-normal text-[#6a635a]">
          Your barber is dispatched as soon as you confirm.{" "}
          {payment === "cod"
            ? "Cash is paid directly on completion."
            : "You'll pay with GCash on the next screen."}
        </p>
        <div className="mt-auto flex flex-col gap-[5px] rounded-xl border border-wash-border bg-wash p-[13px]">
          <span className="text-[13px] font-bold">Everyone busy?</span>
          <span className="text-[13px] leading-[1.45] text-[#6a635a]">
            We&apos;ll place you in this barber&apos;s queue and show who&apos;s waiting.
          </span>
        </div>
      </aside>

      <PinDialog open={pinOpen} onOpenChange={setPinOpen} position={spot} onPick={applyPin} />

      <Dialog open={serviceOpen} onOpenChange={setServiceOpen}>
        <DialogContent className="flex flex-col gap-4 rounded-[14px] border border-line p-5 ring-0 sm:max-w-sm">
          <div className="flex flex-col gap-1">
            <DialogTitle className="text-xl font-extrabold tracking-[-0.02em]">Service</DialogTitle>
            <DialogDescription>Pick what you&apos;d like done.</DialogDescription>
          </div>
          <div className="flex flex-col gap-2.5">
            {barber?.services.map((s) => (
              <DialogClose
                key={s.id}
                onClick={() => setServiceId(s.id)}
                className={cn(
                  "flex items-center justify-between gap-3 rounded-[14px] border p-3.5 text-left transition-colors hover:bg-wash",
                  s.id === service?.id ? "border-foreground" : "border-line",
                )}
              >
                <span className="flex flex-col gap-0.5">
                  <span className="text-[15px] font-bold">{s.name}</span>
                  <span className="text-[13px] text-[#6a635a]">{s.duration_minutes} min</span>
                </span>
                <span className="text-base font-extrabold">₱{s.price}</span>
              </DialogClose>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
        <DialogContent className="flex flex-col gap-4 rounded-[14px] border border-line p-5 ring-0 sm:max-w-sm">
          <div className="flex flex-col gap-1">
            <DialogTitle className="text-xl font-extrabold tracking-[-0.02em]">Payment Method</DialogTitle>
            <DialogDescription>How you&apos;ll pay for this booking.</DialogDescription>
          </div>
          <div className="flex flex-col gap-2.5" role="radiogroup" aria-label="Payment method">
            {PAYMENT_OPTIONS.map((o) => (
              <DialogClose
                key={o.value}
                role="radio"
                aria-checked={payment === o.value}
                onClick={() => setPayment(o.value)}
                className={cn(
                  "flex flex-col gap-0.5 rounded-[14px] border p-3.5 text-left transition-colors hover:bg-wash",
                  payment === o.value ? "border-foreground" : "border-line",
                )}
              >
                <span className="text-[15px] font-bold">{o.label}</span>
                <span className="text-[13px] text-[#6a635a]">{o.hint}</span>
              </DialogClose>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
