"use client";

import { useState } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { friendlyError } from "@/lib/friendly-error";

export const QUICK_REPLIES = [
  "I'm outside the gate",
  "Please call when you arrive",
  "Running 5 minutes late",
];

// "Quick replies for the things customers type every time" — one tap
// sends the line; the conversation picks it up through realtime.
export function QuickReplies({ bookingId, userId }: { bookingId: string; userId: string }) {
  const [sending, setSending] = useState<string | null>(null);

  async function send(body: string) {
    setSending(body);
    const { error } = await createClient()
      .from("booking_messages")
      .insert({ booking_id: bookingId, sender_id: userId, body });
    setSending(null);
    if (error) toast.error(friendlyError(error, "Couldn't send that. Try again."));
  }

  return (
    <div className="flex flex-col gap-2 rounded-[13px] border border-line bg-white p-3.5">
      <span className="text-[13px] font-bold">Quick replies</span>
      {QUICK_REPLIES.map((q) => (
        <button
          key={q}
          type="button"
          disabled={sending !== null}
          onClick={() => void send(q)}
          className="rounded-lg border border-field px-[11px] py-[9px] text-left text-[13px] transition-colors hover:bg-wash disabled:opacity-60"
        >
          {q}
        </button>
      ))}
    </div>
  );
}
