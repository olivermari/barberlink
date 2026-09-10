"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { SendIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SectionLabel } from "@/components/ui/section-label";

type Message = {
  id: string;
  sender_id: string;
  body: string;
  created_at: string;
};

export function BookingChat({
  bookingId,
  currentUserId,
  otherPartyLabel,
  className,
}: {
  bookingId: string;
  currentUserId: string;
  otherPartyLabel: string;
  className?: string;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    async function start() {
      const { data } = await supabase
        .from("booking_messages")
        .select("id, sender_id, body, created_at")
        .eq("booking_id", bookingId)
        .order("created_at", { ascending: true });

      if (!cancelled && data) setMessages(data);

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (cancelled) return;
      // Without this, the channel joins successfully but RLS silently
      // drops every event — see components/customer/booking-view.tsx.
      if (session) supabase.realtime.setAuth(session.access_token);

      channel = supabase
        .channel(`booking-messages-${bookingId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "booking_messages",
            filter: `booking_id=eq.${bookingId}`,
          },
          (payload) => {
            const message = payload.new as Message;
            setMessages((prev) =>
              prev.some((m) => m.id === message.id) ? prev : [...prev, message],
            );
          },
        )
        .subscribe();
    }

    start();

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [bookingId]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const body = draft.trim();
    if (!body) return;

    setSending(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("booking_messages")
      .insert({ booking_id: bookingId, sender_id: currentUserId, body });
    setSending(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    setDraft("");
  }

  return (
    <section
      id="chat"
      aria-label={`Chat with ${otherPartyLabel}`}
      className={cn(
        "flex scroll-mt-20 flex-col gap-2.5 rounded-lg border-[1.5px] border-outline p-3.5",
        className,
      )}
    >
      <SectionLabel>Chat</SectionLabel>
      <div ref={listRef} className="flex max-h-80 min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
        {messages.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No messages yet — sort out the exact spot or any details with {otherPartyLabel} here.
          </p>
        )}
        {messages.map((m) => {
          const mine = m.sender_id === currentUserId;
          return (
            <div
              key={m.id}
              className={cn(
                "max-w-[78%] rounded-lg px-3 py-2 text-sm",
                mine ? "self-end bg-foreground text-background" : "self-start bg-accent text-foreground",
              )}
            >
              {m.body}
            </div>
          );
        })}
      </div>
      <form onSubmit={handleSubmit} className="mt-auto flex gap-2">
        <Input
          placeholder="Message…"
          aria-label={`Message ${otherPartyLabel}`}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        />
        <Button type="submit" variant="ink" size="icon" disabled={sending || !draft.trim()}>
          <SendIcon />
          <span className="sr-only">Send</span>
        </Button>
      </form>
    </section>
  );
}
