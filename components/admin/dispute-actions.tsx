"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type DisputeStatus = "open" | "investigating" | "resolved" | "dismissed";

// A3's two outcomes. "Refund customer" resolves in the customer's favour;
// "Side with barber" dismisses. The refund itself is manual until the
// PayMongo integration covers refunds (Phase 10).
export function DisputeActions({
  disputeId,
  status,
  initialNotes,
  paymentMethod,
}: {
  disputeId: string;
  status: string;
  initialNotes: string | null;
  paymentMethod: string | null;
}) {
  const router = useRouter();
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState<DisputeStatus | null>(null);
  const open = status === "open" || status === "investigating";

  async function update(next: DisputeStatus, outcome?: string) {
    setLoading(next);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const resolution = outcome
      ? [outcome, notes.trim()].filter(Boolean).join(" — ")
      : notes.trim() || initialNotes;

    const { error } = await supabase
      .from("disputes")
      .update({ status: next, resolution_notes: resolution, admin_id: user?.id })
      .eq("id", disputeId);
    setLoading(null);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success(
      next === "resolved"
        ? "Resolved in the customer's favour."
        : next === "dismissed"
          ? "Resolved in the barber's favour."
          : next === "open"
            ? "Dispute reopened."
            : "Marked as investigating.",
    );
    setNotes("");
    router.refresh();
  }

  if (!open) {
    return (
      <div className="flex items-start justify-between gap-3 text-sm">
        <span className="text-muted-foreground">
          {status === "resolved" ? "Refunded the customer" : "Sided with the barber"}
          {initialNotes ? ` · ${initialNotes}` : ""}
        </span>
        <Button variant="ghost" size="sm" onClick={() => update("open")} disabled={loading !== null}>
          Reopen
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <Textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Resolution notes (admins only)"
        aria-label="Resolution notes"
        rows={2}
        className="border-[1.5px] border-outline bg-background"
      />
      <div className="flex flex-wrap gap-2">
        <Button
          className="h-10 flex-1"
          onClick={() => update("resolved", "Refund customer")}
          disabled={loading !== null}
        >
          {loading === "resolved" ? "Saving…" : "Refund customer"}
        </Button>
        <Button
          variant="outline"
          className="h-10 flex-1"
          onClick={() => update("dismissed", "Sided with barber")}
          disabled={loading !== null}
        >
          {loading === "dismissed" ? "Saving…" : "Side with barber"}
        </Button>
      </div>
      {status === "open" && (
        <Button
          variant="ghost"
          size="sm"
          className="self-start"
          onClick={() => update("investigating")}
          disabled={loading !== null}
        >
          Mark as investigating
        </Button>
      )}
      <p className="text-xs text-muted-foreground">
        {paymentMethod === "cod"
          ? "Cash job — arrange any refund with the barber directly."
          : "Refunds aren't automated yet — send it from the PayMongo dashboard, then record it here."}
      </p>
    </div>
  );
}
