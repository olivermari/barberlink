"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { friendlyError } from "@/lib/friendly-error";
import { REVIEW_TAGS } from "@/lib/review-tags";
import { Card } from "@/components/customer/ui";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const TIP_PRESETS = [20, 50, 100];
// PayMongo won't open a payment under ₱20; the ceiling matches the tips
// check constraint in 0016.
const MIN_TIP = 20;
const MAX_TIP = 5000;

// The completion screen's review card: five stars, inline and optional —
// completion never blocks on it. Picking a star opens the rest (tags, a
// note, a tip); nothing is sent until "Submit review".
export function InlineReview({
  bookingId,
  barberId,
  barberName,
}: {
  bookingId: string;
  barberId: string;
  barberName: string;
}) {
  const router = useRouter();
  const [rating, setRating] = useState(0);
  const [tags, setTags] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [tip, setTip] = useState<number | "other" | null>(null);
  const [otherTip, setOtherTip] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tipAmount = tip === "other" ? Math.round(Number(otherTip) || 0) : (tip ?? 0);

  async function submit() {
    if (rating === 0) return;
    if (tip === "other" && (tipAmount < MIN_TIP || tipAmount > MAX_TIP)) {
      setError(`Enter a tip between ₱${MIN_TIP} and ₱5,000, or clear it.`);
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
      comment: note.trim() || null,
      tags,
    });
    if (insertError) {
      setLoading(false);
      setError(friendlyError(insertError, "Couldn't submit your review. Try again."));
      return;
    }

    if (tipAmount > 0) {
      const res = await fetch("/api/payments/tip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId, amount: tipAmount }),
      });
      const body = await res.json();
      if (!res.ok) {
        setLoading(false);
        toast.error(`Review saved, but the tip didn't go through: ${body.error ?? "try again later."}`);
        router.refresh();
        return;
      }
      if (body.checkoutUrl) {
        window.location.href = body.checkoutUrl;
        return;
      }
      toast.success(`Thanks — your ₱${tipAmount} tip is on its way to ${barberName}.`);
    } else {
      toast.success("Thanks for your review!");
    }
    setLoading(false);
    router.refresh();
  }

  return (
    <Card className="flex flex-col gap-[11px] p-[15px]">
      <div className="flex flex-col gap-0.5">
        <span className="text-[15px] font-bold">Leave a review</span>
        <span className="text-[13px] text-[#6a635a]">How was your experience?</span>
      </div>
      <div className="flex justify-center gap-2.5" role="radiogroup" aria-label="Rating">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={rating === n}
            aria-label={`${n} star${n === 1 ? "" : "s"}`}
            onClick={() => setRating(n)}
            className={cn(
              "px-0.5 text-[30px] leading-none tracking-[2px] transition-colors",
              n <= rating ? "text-primary" : "text-field hover:text-[#cbc4b5]",
            )}
          >
            ★
          </button>
        ))}
      </div>

      {rating > 0 && (
        <>
          <div className="flex flex-wrap justify-center gap-2">
            {REVIEW_TAGS.map((t) => {
              const on = tags.includes(t.value);
              return (
                <button
                  key={t.value}
                  type="button"
                  aria-pressed={on}
                  onClick={() =>
                    setTags((prev) => (on ? prev.filter((x) => x !== t.value) : [...prev, t.value]))
                  }
                  className={cn(
                    "rounded-full border px-3.5 py-2 text-[13px] transition-colors",
                    on ? "border-foreground font-bold" : "border-field font-medium hover:bg-wash",
                  )}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add a note for other customers (optional)"
            aria-label="Note for other customers"
            rows={2}
            className="w-full rounded-[11px] border border-field bg-transparent px-3 py-2.5 text-sm outline-none placeholder:text-faint focus:border-foreground"
          />
          <div className="flex flex-col gap-2 border-t border-line-soft pt-3">
            <span className="text-xs font-bold tracking-[0.1em] text-muted-foreground uppercase">Add a tip</span>
            <div className="flex gap-2">
              {[...TIP_PRESETS, "other" as const].map((v) => {
                const on = tip === v;
                return (
                  <button
                    key={v}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setTip(on ? null : v)}
                    className={cn(
                      "h-11 flex-1 rounded-[10px] border text-sm transition-colors",
                      on ? "border-foreground font-bold" : "border-field font-semibold hover:bg-wash",
                    )}
                  >
                    {v === "other" ? "Other" : `₱${v}`}
                  </button>
                );
              })}
            </div>
            {tip === "other" && (
              <input
                type="number"
                inputMode="numeric"
                min={MIN_TIP}
                max={MAX_TIP}
                placeholder={`Tip amount in ₱ (${MIN_TIP} or more)`}
                aria-label="Tip amount"
                value={otherTip}
                onChange={(e) => setOtherTip(e.target.value)}
                className="h-11 w-full rounded-[10px] border border-field px-3 text-sm outline-none focus:border-foreground"
              />
            )}
            {tipAmount > 0 && (
              <p className="text-xs text-[#6a635a]">
                Tips go 100% to {barberName} and are paid by GCash.
              </p>
            )}
          </div>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <Button onClick={submit} disabled={loading} className="h-12 w-full rounded-xl text-[15px] font-bold">
            {loading ? "Submitting…" : tipAmount > 0 ? `Submit review + ₱${tipAmount} tip` : "Submit review"}
          </Button>
        </>
      )}
    </Card>
  );
}
