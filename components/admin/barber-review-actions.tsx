"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type Decision = "verified" | "needs_info" | "rejected";

// A2/A5 review actions. After a decision the reviewer lands on the next
// barber in the list, so a backlog clears without going back to it.
export function BarberReviewActions({
  barberId,
  barberName,
  status,
  initialNote,
  initialRequest,
  nextHref,
}: {
  barberId: string;
  barberName: string;
  status: string;
  initialNote: string | null;
  initialRequest: string | null;
  nextHref: string | null;
}) {
  const router = useRouter();
  const [note, setNote] = useState(initialNote ?? "");
  const [savedNote, setSavedNote] = useState(initialNote ?? "");
  const [asking, setAsking] = useState(false);
  const [request, setRequest] = useState(initialRequest ?? "");
  const [loading, setLoading] = useState<Decision | null>(null);

  async function saveReview(fields: { info_request?: string | null }) {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return supabase.from("barber_reviews").upsert(
      {
        barber_id: barberId,
        admin_note: note.trim() || null,
        ...fields,
        updated_by: user?.id ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "barber_id" },
    );
  }

  async function saveNote() {
    if (note === savedNote) return;
    const { error } = await saveReview({});
    if (error) {
      toast.error(error.message);
      return;
    }
    setSavedNote(note);
    toast.success("Note saved.");
  }

  async function decide(next: Decision) {
    if (next === "needs_info" && !request.trim()) {
      setAsking(true);
      toast.error("Say what the barber needs to send — they'll see it.");
      return;
    }

    setLoading(next);
    const { error: reviewError } = await saveReview(
      next === "needs_info"
        ? { info_request: request.trim() }
        : next === "verified"
          ? { info_request: null }
          : {},
    );
    if (reviewError) {
      setLoading(null);
      toast.error(reviewError.message);
      return;
    }

    // Anyone losing verification is also taken offline.
    const { error } = await createClient()
      .from("barber_profiles")
      .update(
        next === "verified"
          ? { verification_status: next }
          : { verification_status: next, is_available: false },
      )
      .eq("id", barberId);
    setLoading(null);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success(
      next === "verified"
        ? `${barberName} is verified and can go online.`
        : next === "needs_info"
          ? `Asked ${barberName} for more info.`
          : `${barberName} is no longer verified.`,
    );
    setSavedNote(note);
    setAsking(false);
    if (nextHref) router.push(nextHref, { scroll: false });
    else router.refresh();
  }

  return (
    <div className="flex flex-col gap-2.5">
      <Textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        onBlur={saveNote}
        placeholder="Internal note…"
        aria-label="Internal note (admins only)"
        rows={2}
        className="border-[1.5px] border-outline bg-background"
      />

      {asking && (
        <Textarea
          value={request}
          onChange={(e) => setRequest(e.target.value)}
          placeholder="What should the barber send? They'll see this."
          aria-label="Request to the barber"
          rows={2}
          autoFocus
          className="border-2 border-primary bg-background"
        />
      )}

      {status === "verified" ? (
        <Button
          variant="outline"
          className="h-11 text-destructive"
          onClick={() => decide("rejected")}
          disabled={loading !== null}
        >
          {loading === "rejected" ? "Revoking…" : "Revoke verification"}
        </Button>
      ) : (
        <>
          <Button
            size="lg"
            className="h-12 text-base"
            onClick={() => decide("verified")}
            disabled={loading !== null}
          >
            {loading === "verified" ? "Approving…" : "Approve & onboard"}
          </Button>
          <Button
            variant="outline"
            className="h-11"
            onClick={() => (asking ? decide("needs_info") : setAsking(true))}
            disabled={loading !== null}
          >
            {loading === "needs_info" ? "Sending…" : asking ? "Send request" : "Request more info"}
          </Button>
          {status !== "rejected" && (
            <Button
              variant="ghost"
              className="h-10 text-destructive"
              onClick={() => decide("rejected")}
              disabled={loading !== null}
            >
              {loading === "rejected" ? "Rejecting…" : "Reject"}
            </Button>
          )}
        </>
      )}
    </div>
  );
}
