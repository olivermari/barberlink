"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { StarIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { initials } from "@/lib/initials";
import { REVIEW_TAGS } from "@/lib/review-tags";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SectionLabel } from "@/components/ui/section-label";

const TIP_PRESETS = [20, 50, 100];
// PayMongo won't open a payment under ₱20; the ceiling matches the tips
// check constraint in 0016.
const MIN_TIP = 20;
const MAX_TIP = 5000;

// Wireframe C6: shown full screen once a booking completes.
export function ReviewForm({
  bookingId,
  barberId,
  barberName,
  barberAvatarUrl,
  price,
  paymentLabel,
  onSkip,
}: {
  bookingId: string;
  barberId: string;
  barberName: string;
  barberAvatarUrl: string | null;
  price: number;
  // e.g. "paid in cash" / "paid by GCash"
  paymentLabel: string;
  onSkip: () => void;
}) {
  const router = useRouter();
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [tags, setTags] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [tip, setTip] = useState<number | "other" | null>(null);
  const [otherTip, setOtherTip] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tipAmount = tip === "other" ? Math.round(Number(otherTip) || 0) : (tip ?? 0);

  function toggleTag(value: string) {
    setTags((prev) =>
      prev.includes(value) ? prev.filter((t) => t !== value) : [...prev, value],
    );
  }

  async function submit() {
    if (rating === 0) {
      setError("Tap a star rating first.");
      return;
    }
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
      setError(insertError.message);
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
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 p-4">
      <div className="flex flex-col items-center gap-3 pt-5 pb-1.5">
        <Avatar className="size-[76px]">
          {barberAvatarUrl && <AvatarImage src={barberAvatarUrl} alt={barberName} />}
          <AvatarFallback className="text-lg">{initials(barberName)}</AvatarFallback>
        </Avatar>
        <h1 className="text-center text-[23px] font-black">How was your cut?</h1>
        <p className="text-[15px] text-muted-foreground">
          {barberName} · ₱{price} {paymentLabel}
        </p>
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
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
          >
            <StarIcon
              className={cn(
                "size-9",
                (hover || rating) >= n ? "fill-primary text-primary" : "fill-border text-border",
              )}
            />
          </button>
        ))}
      </div>

      <div className="flex flex-wrap justify-center gap-2">
        {REVIEW_TAGS.map((t) => {
          const on = tags.includes(t.value);
          return (
            <button
              key={t.value}
              type="button"
              aria-pressed={on}
              onClick={() => toggleTag(t.value)}
              className={cn(
                "rounded-full px-4 py-2 text-sm",
                on ? "border-2 border-primary font-semibold" : "border-[1.5px] border-outline",
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
        rows={3}
        className="w-full rounded-lg border-[1.5px] border-outline bg-transparent px-3 py-2.5 text-sm outline-none placeholder:text-faint focus-visible:ring-3 focus-visible:ring-ring/50"
      />

      <div className="flex flex-col gap-2.5 border-t pt-3.5">
        <SectionLabel>Add a tip</SectionLabel>
        <div className="flex gap-2">
          {TIP_PRESETS.map((v) => (
            <TipChip
              key={v}
              label={`₱${v}`}
              selected={tip === v}
              onClick={() => setTip(tip === v ? null : v)}
            />
          ))}
          <TipChip
            label="Other"
            selected={tip === "other"}
            onClick={() => setTip(tip === "other" ? null : "other")}
          />
        </div>
        {tip === "other" && (
          <Input
            type="number"
            inputMode="numeric"
            min={MIN_TIP}
            max={MAX_TIP}
            placeholder={`Tip amount in ₱ (${MIN_TIP} or more)`}
            aria-label="Tip amount"
            value={otherTip}
            onChange={(e) => setOtherTip(e.target.value)}
            className="h-12 border-[1.5px] border-outline"
          />
        )}
        {tipAmount > 0 && (
          <p className="text-xs text-muted-foreground">
            Tips go 100% to {barberName} and are paid by GCash.
          </p>
        )}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="mt-auto flex flex-col gap-1.5 pt-2">
        <Button size="lg" className="h-14 text-lg" onClick={submit} disabled={loading}>
          {loading
            ? "Submitting…"
            : tipAmount > 0
              ? `Submit review + ₱${tipAmount} tip`
              : "Submit review"}
        </Button>
        <Button variant="ghost" onClick={onSkip} className="text-muted-foreground">
          Skip
        </Button>
      </div>
    </div>
  );
}

function TipChip({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        "h-12 flex-1 rounded-[5px] text-[15px]",
        selected ? "border-2 border-primary font-bold" : "border-[1.5px] border-outline font-semibold",
      )}
    >
      {label}
    </button>
  );
}
