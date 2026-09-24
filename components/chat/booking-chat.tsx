"use client";

import { useEffect, useId, useRef, useState } from "react";
import { toast } from "sonner";
import { SendIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { friendlyError } from "@/lib/friendly-error";
import { cn } from "@/lib/utils";
import { Photo } from "@/components/customer/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SectionLabel } from "@/components/ui/section-label";

type Message = {
  id: string;
  sender_id: string;
  body: string;
  created_at: string;
};

const TIME = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
  timeZone: "Asia/Manila",
});
const DAY = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" });
const DAY_LABEL = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "Asia/Manila" });

// "Today" / "Yesterday" / "Sep 4" above a run of messages.
function dayLabel(iso: string, now: number) {
  const day = DAY.format(new Date(iso));
  if (day === DAY.format(new Date(now))) return "Today";
  if (day === DAY.format(new Date(now - 86_400_000))) return "Yesterday";
  return DAY_LABEL.format(new Date(iso));
}

export function BookingChat({
  bookingId,
  currentUserId,
  otherPartyLabel,
  otherPartyAvatarUrl,
  variant = "default",
  thread,
  quickReplies,
  quickRepliesMobileOnly,
  className,
}: {
  bookingId: string;
  currentUserId: string;
  otherPartyLabel: string;
  otherPartyAvatarUrl?: string | null;
  // "customer" is the Customer UI's chat: photo + name over the other
  // party's bubbles, ink bubbles for yours, a pill input with a red send
  // button. "barber" is the Barber UI's rail chat (W1) and "barber-job" its
  // phone job screen (B4); "default" is the plain boxed chat.
  variant?: "default" | "customer" | "barber" | "barber-job";
  // Customer variant only: the roomier conversation pane on Messages.
  thread?: boolean;
  // Tap-to-send lines for the things customers type every time.
  quickReplies?: string[];
  // Web shows them in the booking rail instead, so hide the chips there.
  quickRepliesMobileOnly?: boolean;
  className?: string;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  // Track renders one chat for phones and one for the web rail (CSS shows
  // whichever fits) — a channel name of their own keeps the two from
  // fighting over the same subscription.
  const instanceId = useId();
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const [now] = useState(() => Date.now());

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
        .channel(`booking-messages-${bookingId}-${instanceId}`)
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
  }, [bookingId, instanceId]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages]);

  // Opening a conversation marks it read (0028) — the Messages inbox's
  // unread counts come from this.
  useEffect(() => {
    if (variant === "default") return;
    void createClient().rpc("mark_messages_read", { target_booking_id: bookingId });
  }, [bookingId, variant, messages.length]);

  async function send(body: string) {
    const text = body.trim();
    if (!text) return;

    setSending(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("booking_messages")
      .insert({ booking_id: bookingId, sender_id: currentUserId, body: text });
    setSending(false);

    if (error) {
      toast.error(friendlyError(error, "Couldn't send that. Try again."));
      return;
    }

    setDraft("");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    void send(draft);
  }

  if (variant === "barber" || variant === "barber-job") {
    const rail = variant === "barber";
    return (
      <section
        id="chat"
        aria-label={`Chat with ${otherPartyLabel}`}
        className={cn(
          "flex min-h-0 scroll-mt-20 flex-col border border-line",
          rail
            ? "gap-2.5 rounded-[13px] bg-white p-3.5"
            : "gap-[9px] rounded-[14px] bg-[#faf8f3] p-[13px] [background-image:radial-gradient(#ece5d5_1px,transparent_1.2px)] [background-size:15px_15px]",
          className,
        )}
      >
        <span className="text-xs font-bold tracking-[0.1em] text-faint uppercase">
          {rail ? `Chat · ${otherPartyLabel}` : "Chat"}
        </span>
        <div ref={listRef} className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
          {messages.length === 0 && (
            <p className="text-sm text-[#6a635a]">
              No messages yet — sort out the exact spot or any details with {otherPartyLabel} here.
            </p>
          )}
          {messages.map((m) => {
            const mine = m.sender_id === currentUserId;
            return mine ? (
              <div
                key={m.id}
                className={cn(
                  "self-end bg-foreground px-3 text-sm leading-[1.45] text-white",
                  rail ? "max-w-[84%] rounded-[12px_12px_4px_12px] py-2.5" : "max-w-[80%] rounded-[12px_12px_4px_12px] py-[9px] leading-[1.4]",
                )}
              >
                {m.body}
              </div>
            ) : (
              <div
                key={m.id}
                className={cn(
                  "self-start border px-3 text-sm",
                  rail
                    ? "max-w-[84%] rounded-[12px_12px_12px_4px] border-wash-border bg-wash py-2.5 leading-[1.45]"
                    : "max-w-[80%] rounded-[12px_12px_12px_4px] border-wash-border bg-white py-[9px] leading-[1.4]",
                )}
              >
                {m.body}
              </div>
            );
          })}
        </div>
        <form onSubmit={handleSubmit} className="mt-auto flex items-center gap-[9px]">
          <input
            placeholder={rail ? "Type a message…" : "Message…"}
            aria-label={`Message ${otherPartyLabel}`}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className={cn(
              "min-w-0 flex-1 border bg-white text-sm outline-none placeholder:text-faint focus:border-foreground",
              rail ? "rounded-[22px] border-[#e0d9ca] px-3.5 py-[11px]" : "rounded-[10px] border-field px-3 py-[9px]",
            )}
          />
          <button
            type="submit"
            disabled={sending || !draft.trim()}
            aria-label="Send"
            className={cn(
              "flex shrink-0 items-center justify-center rounded-full bg-primary text-white transition-opacity disabled:opacity-60",
              rail ? "size-[42px]" : "size-[38px]",
            )}
          >
            <SendIcon className={rail ? "size-[18px]" : "size-4"} aria-hidden />
          </button>
        </form>
      </section>
    );
  }

  if (variant === "customer") {
    // Messages' conversation pane ("thread") is the roomier W5 version:
    // white bubbles on the dotted ground, day separators, a bigger input.
    const bubbleMax = thread ? "max-w-[60%]" : "max-w-[80%]";
    return (
      <section
        id="chat"
        aria-label={`Chat with ${otherPartyLabel}`}
        className={cn("flex min-h-0 scroll-mt-20 flex-col", thread ? "gap-3" : "gap-[11px]", className)}
      >
        <div
          ref={listRef}
          className={cn("flex min-h-0 flex-1 flex-col overflow-y-auto", thread ? "gap-3" : "gap-2.5")}
        >
          {messages.length === 0 && (
            <p className="text-sm text-[#6a635a]">
              No messages yet — sort out the exact spot or any details with {otherPartyLabel} here.
            </p>
          )}
          {messages.map((m, i) => {
            const mine = m.sender_id === currentUserId;
            const day = DAY.format(new Date(m.created_at));
            const prev = messages[i - 1];
            const showDay = thread && (!prev || DAY.format(new Date(prev.created_at)) !== day);
            const time = TIME.format(new Date(m.created_at));
            return (
              <div key={m.id} className="contents">
                {showDay && (
                  <span className="self-center rounded-full border border-line-soft bg-white px-3 py-[5px] text-xs text-faint">
                    {dayLabel(m.created_at, now)}
                  </span>
                )}
                {mine ? (
                  <div
                    className={cn(
                      "self-end rounded-[12px_12px_4px_12px] bg-foreground text-sm leading-[1.4] text-white",
                      bubbleMax,
                      thread ? "px-[13px] py-[11px] leading-[1.45]" : "px-3 py-2.5",
                    )}
                  >
                    {m.body}
                    <div className={cn("text-right text-[11px] text-[#a49c90]", thread ? "mt-1" : "mt-[3px]")}>
                      {time}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-end gap-[9px]">
                    <Photo src={otherPartyAvatarUrl} name={otherPartyLabel} className="size-[30px]" />
                    <div
                      className={cn(
                        "flex flex-col rounded-[12px_12px_12px_4px] border border-wash-border",
                        thread
                          ? "max-w-[60%] gap-0 bg-white px-[13px] py-[11px]"
                          : "flex-1 gap-[3px] bg-wash px-3 py-2.5",
                      )}
                    >
                      {!thread && <span className="text-xs font-bold text-[#6a635a]">{otherPartyLabel}</span>}
                      <span className={cn("text-sm", thread ? "leading-[1.45]" : "leading-[1.4]")}>{m.body}</span>
                      <span className={cn("self-end text-[11px] text-[#a49c90]", thread && "mt-1")}>{time}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {quickReplies && quickReplies.length > 0 && (
          <div className={cn("flex flex-wrap gap-1.5", quickRepliesMobileOnly && "lg:hidden")}>
            {quickReplies.map((q) => (
              <button
                key={q}
                type="button"
                disabled={sending}
                onClick={() => void send(q)}
                className="rounded-full border border-field bg-white px-3 py-[7px] text-[13px] font-semibold transition-colors hover:bg-wash disabled:opacity-60"
              >
                {q}
              </button>
            ))}
          </div>
        )}
        <form onSubmit={handleSubmit} className={cn("flex items-center", thread ? "gap-2.5" : "gap-[9px]")}>
          <input
            placeholder="Type a message…"
            aria-label={`Message ${otherPartyLabel}`}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className={cn(
              "min-w-0 flex-1 rounded-[22px] border border-field bg-white text-sm outline-none placeholder:text-faint focus:border-foreground",
              thread ? "px-4 py-[13px]" : "px-[15px] py-3",
            )}
          />
          <button
            type="submit"
            disabled={sending || !draft.trim()}
            aria-label="Send"
            className={cn(
              "flex shrink-0 items-center justify-center rounded-full bg-primary text-white transition-opacity disabled:opacity-60",
              thread ? "size-[46px]" : "size-11",
            )}
          >
            <SendIcon className="size-5" aria-hidden />
          </button>
        </form>
      </section>
    );
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
