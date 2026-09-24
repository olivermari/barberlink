import { MessageSquareIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/supabase/require-profile";
import { formatThreadTime, nowMs } from "@/lib/format";
import { loadConversations } from "@/lib/messages";
import { MessagesShell } from "@/components/customer/messages-shell";
import { DOTTED_RAIL } from "@/components/customer/ui";
import { cn } from "@/lib/utils";

// The barber's Messages tab: one row per booking with a conversation,
// unread counts leading the row — the customer inbox, turned around.
export default async function BarberMessagesPage() {
  const { user } = await requireProfile();
  const supabase = await createClient();
  const conversations = await loadConversations(supabase, user.id, "barber");
  const now = nowMs();
  const times = Object.fromEntries(conversations.map((c) => [c.id, formatThreadTime(c.at, now)]));

  return (
    <MessagesShell
      role="barber"
      conversations={conversations}
      times={times}
      pane={
        <div className={cn("flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center", DOTTED_RAIL)}>
          <span className="flex size-12 items-center justify-center rounded-full border border-wash-border bg-white">
            <MessageSquareIcon className="size-6" aria-hidden />
          </span>
          <p className="text-[15px] font-bold">Select a conversation</p>
          <p className="max-w-[32ch] text-sm text-[#6a635a]">
            Sort out the exact spot or any details with your customer — pick a thread on the left.
          </p>
        </div>
      }
    />
  );
}
