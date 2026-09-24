import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/supabase/require-profile";
import { fetchBookingDetail } from "@/lib/booking-detail";
import { BookingView } from "@/components/customer/booking-view";
import { ReportProblemDialog } from "@/components/report-problem-dialog";
import { LogoMark } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";

const ACTIVE_STATUSES = ["queued", "pending", "accepted", "on_the_way", "in_service"];

// The Track tab: whichever booking is currently in flight, at a stable
// URL (so the tab bar stays highlighted) instead of the id-specific
// /customer/bookings/[id] route. A customer only ever has one active
// booking at a time (enforced at the database — 0027), so there's
// nothing to pick between.
export default async function TrackPage() {
  const { user } = await requireProfile();
  const supabase = await createClient();

  const { data: activeRow } = await supabase
    .from("bookings")
    .select("id")
    .eq("customer_id", user.id)
    .in("status", ACTIVE_STATUSES)
    .order("requested_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!activeRow) {
    return (
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
        <LogoMark size={48} className="opacity-40" />
        <div className="flex flex-col gap-1.5">
          <h1 className="text-xl font-black">No active booking</h1>
          <p className="text-sm text-muted-foreground">
            Once you request a barber, you can follow them here in real time.
          </p>
        </div>
        <Button size="lg" className="h-12 text-base" nativeButton={false} render={<Link href="/customer" />}>
          Find a barber
        </Button>
      </div>
    );
  }

  const detail = await fetchBookingDetail(supabase, activeRow.id);
  // Vanishingly unlikely (the row existed a moment ago) — falls back to
  // the same empty state rather than a broken page.
  if (!detail) {
    return (
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
        <LogoMark size={48} className="opacity-40" />
        <h1 className="text-xl font-black">No active booking</h1>
        <Button size="lg" className="h-12 text-base" nativeButton={false} render={<Link href="/customer" />}>
          Find a barber
        </Button>
      </div>
    );
  }

  return (
    <BookingView
      booking={detail.booking}
      barber={detail.barber}
      currentUserId={user.id}
      requestTimeoutSeconds={detail.requestTimeoutSeconds}
      initialQueueDepth={detail.initialQueueDepth}
      review={detail.review}
      tip={detail.tip}
      reportSlot={<ReportProblemDialog bookingId={detail.booking.id} raisedBy={user.id} />}
    />
  );
}
