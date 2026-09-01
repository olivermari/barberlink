import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/supabase/require-profile";
import { BookingProgress } from "@/components/booking-progress";
import { BookingChat } from "@/components/chat/booking-chat";

const PAYMENT_METHOD_LABEL: Record<string, string> = {
  cod: "Cash",
  gcash: "GCash",
  maya: "Maya",
  card: "Card",
  instapay: "InstaPay",
};

const PAYMENT_STATUS_LABEL: Record<string, string> = {
  paid: "Paid",
  pending: "Pending",
  failed: "Failed",
  refunded: "Refunded",
};

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
      "id, requested_at, address_text, status, price, barber_id, service_id, payment_method, payment_status",
    )
    .eq("id", id)
    .single();

  if (!booking) notFound();

  let queueDepth: number | null = null;
  if (booking.status === "queued") {
    const { data } = await supabase.rpc("queue_depth", {
      target_booking_id: booking.id,
    });
    queueDepth = data ?? null;
  }

  const [{ data: barber }, { data: service }, { data: review }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("full_name")
        .eq("id", booking.barber_id)
        .single(),
      booking.service_id
        ? supabase
            .from("services")
            .select("name")
            .eq("id", booking.service_id)
            .single()
        : Promise.resolve({ data: null as { name: string } | null }),
      supabase
        .from("reviews")
        .select("rating, comment")
        .eq("booking_id", booking.id)
        .maybeSingle(),
    ]);

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-6 p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-semibold">
          {service?.name ?? "Booking"}
        </h1>
        <p className="text-sm text-muted-foreground">
          with {barber?.full_name ?? "Barber"}
        </p>
        <p className="text-sm text-muted-foreground">
          Requested {new Date(booking.requested_at).toLocaleString()}
        </p>
        <p className="text-sm text-muted-foreground">{booking.address_text}</p>
        <p className="mt-1 font-medium">₱{booking.price}</p>
        <p className="text-sm text-muted-foreground">
          {PAYMENT_METHOD_LABEL[booking.payment_method ?? ""] ?? "Payment method not set"}
          {" · "}
          {PAYMENT_STATUS_LABEL[booking.payment_status] ?? booking.payment_status}
        </p>
      </div>

      <BookingProgress
        bookingId={booking.id}
        barberId={booking.barber_id}
        initialStatus={booking.status}
        initialQueueDepth={queueDepth}
        existingReview={review}
      />

      <BookingChat
        bookingId={booking.id}
        currentUserId={user.id}
        otherPartyLabel={barber?.full_name ?? "Barber"}
      />
    </div>
  );
}
