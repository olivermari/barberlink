"use client";

import { useState } from "react";
import { BookingStatusTracker } from "@/components/booking-status-tracker";
import { ReviewForm } from "@/components/review-form";

export function BookingProgress({
  bookingId,
  barberId,
  initialStatus,
  existingReview,
}: {
  bookingId: string;
  barberId: string;
  initialStatus: string;
  existingReview: { rating: number; comment: string | null } | null;
}) {
  const [status, setStatus] = useState(initialStatus);

  return (
    <div className="flex flex-col gap-4">
      <BookingStatusTracker
        bookingId={bookingId}
        initialStatus={initialStatus}
        onStatusChange={setStatus}
      />

      {status === "completed" &&
        (existingReview ? (
          <div className="rounded-lg border p-4 text-sm">
            <p className="font-medium">You rated this ★ {existingReview.rating}</p>
            {existingReview.comment && (
              <p className="mt-1 text-muted-foreground">{existingReview.comment}</p>
            )}
          </div>
        ) : (
          <ReviewForm bookingId={bookingId} barberId={barberId} />
        ))}
    </div>
  );
}
