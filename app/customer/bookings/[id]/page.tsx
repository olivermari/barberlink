import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/supabase/require-profile";
import { BookingView } from "@/components/customer/booking-view";
import { ReportProblemDialog } from "@/components/report-problem-dialog";

export default async function BookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { user } = await requireProfile();
  const supabase = await createClient();

  const { data: booking } = await supabase
    .from("bookings")
    .select(
      "id, requested_at, address_text, address_lat, address_lng, status, decline_reason, price, barber_id, service_id, payment_method, payment_status",
    )
    .eq("id", id)
    .single();

  if (!booking) notFound();

  const [
    { data: profile },
    { data: barberProfile },
    { data: service },
    { data: review },
    { data: tip },
    { data: queueDepth },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name, avatar_url, phone")
      .eq("id", booking.barber_id)
      .single(),
    supabase
      .from("barber_profiles")
      .select("rating_avg, rating_count, current_lat, current_lng")
      .eq("id", booking.barber_id)
      .single(),
    booking.service_id
      ? supabase.from("services").select("name").eq("id", booking.service_id).single()
      : Promise.resolve({ data: null as { name: string } | null }),
    supabase
      .from("reviews")
      .select("rating, comment, tags")
      .eq("booking_id", booking.id)
      .maybeSingle(),
    supabase
      .from("tips")
      .select("amount, status")
      .eq("booking_id", booking.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    booking.status === "queued"
      ? supabase.rpc("queue_depth", { target_booking_id: booking.id })
      : Promise.resolve({ data: null as number | null }),
  ]);

  return (
    <BookingView
      booking={{
        id: booking.id,
        status: booking.status,
        declineReason: booking.decline_reason ?? null,
        price: Number(booking.price),
        paymentMethod: booking.payment_method,
        paymentStatus: booking.payment_status,
        addressText: booking.address_text,
        addressLat: booking.address_lat,
        addressLng: booking.address_lng,
        requestedAt: booking.requested_at,
        serviceName: service?.name ?? "Booking",
      }}
      barber={{
        id: booking.barber_id,
        name: profile?.full_name ?? "Your barber",
        avatarUrl: profile?.avatar_url ?? null,
        phone: profile?.phone ?? null,
        ratingAvg: Number(barberProfile?.rating_avg ?? 0),
        ratingCount: barberProfile?.rating_count ?? 0,
        lat: barberProfile?.current_lat ?? null,
        lng: barberProfile?.current_lng ?? null,
      }}
      currentUserId={user.id}
      initialQueueDepth={queueDepth ?? null}
      review={review ? { ...review, tags: review.tags ?? [] } : null}
      tip={tip ? { amount: Number(tip.amount), status: tip.status } : null}
      reportSlot={<ReportProblemDialog bookingId={booking.id} raisedBy={user.id} />}
    />
  );
}
