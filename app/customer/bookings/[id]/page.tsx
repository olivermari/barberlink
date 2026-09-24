import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/supabase/require-profile";
import { fetchBookingDetail } from "@/lib/booking-detail";
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

  const detail = await fetchBookingDetail(supabase, id);
  if (!detail) notFound();

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
