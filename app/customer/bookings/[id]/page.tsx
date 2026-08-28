import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/supabase/require-profile";
import { BookingProgress } from "@/components/booking-progress";

export default async function BookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireProfile();
  const supabase = await createClient();

  const { data: booking } = await supabase
    .from("bookings")
    .select(
      "id, requested_at, address_text, status, price, barber_id, service_id",
    )
    .eq("id", id)
    .single();

  if (!booking) notFound();

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
      </div>

      <BookingProgress
        bookingId={booking.id}
        barberId={booking.barber_id}
        initialStatus={booking.status}
        existingReview={review}
      />
    </div>
  );
}
