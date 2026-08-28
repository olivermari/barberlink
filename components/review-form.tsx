"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { StarIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export function ReviewForm({
  bookingId,
  barberId,
}: {
  bookingId: string;
  barberId: string;
}) {
  const router = useRouter();
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (rating === 0) {
      setError("Pick a star rating.");
      return;
    }

    setLoading(true);
    setError(null);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      setError("You need to be logged in.");
      return;
    }

    const { error: insertError } = await supabase.from("reviews").insert({
      booking_id: bookingId,
      customer_id: user.id,
      barber_id: barberId,
      rating,
      comment: comment || null,
    });

    setLoading(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    toast.success("Thanks for your review!");
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 rounded-lg border p-4"
    >
      <Label>Rate your haircut</Label>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setRating(n)}
            onMouseEnter={() => setHoverRating(n)}
            onMouseLeave={() => setHoverRating(0)}
            className="p-0.5"
            aria-label={`${n} star${n === 1 ? "" : "s"}`}
          >
            <StarIcon
              className={cn(
                "size-6",
                (hoverRating || rating) >= n
                  ? "fill-primary text-primary"
                  : "text-muted-foreground/40",
              )}
            />
          </button>
        ))}
      </div>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="How was it? (optional)"
        rows={3}
        className="w-full rounded-md border bg-transparent px-3 py-2 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      />
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={loading} size="sm" className="self-start">
        {loading ? "Submitting..." : "Submit review"}
      </Button>
    </form>
  );
}
