import { MessageSquareIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/supabase/require-profile";
import { formatThreadTime, nowMs } from "@/lib/format";
import { loadConversations } from "@/lib/messages";
import { MessagesShell } from "@/components/customer/messages-shell";

// Customer UI Messages (mobile) and W5 (web): one row per conversation,
// unread counts leading the row. There's no conversation open here, so
// the middle pane invites you to pick one.
export default async function CustomerMessagesPage() {
  const { user } = await requireProfile();
  const supabase = await createClient();
  const conversations = await loadConversations(supabase, user.id);
  const now = nowMs();
  const times = Object.fromEntries(conversations.map((c) => [c.id, formatThreadTime(c.at, now)]));

  return (
    <MessagesShell
      conversations={conversations}
      times={times}
      pane={
        <div className="flex flex-1 flex-col items-center justify-center gap-3 bg-[#faf8f3] p-8 text-center [background-image:radial-gradient(#ece5d5_1px,transparent_1.2px)] [background-size:15px_15px]">
          <span className="flex size-12 items-center justify-center rounded-full border border-wash-border bg-white">
            <MessageSquareIcon className="size-6" aria-hidden />
          </span>
          <p className="text-[15px] font-bold">Select a conversation</p>
          <p className="max-w-[32ch] text-sm text-[#6a635a]">
            Chat with your barber about the exact spot or any details — pick a thread on the left.
          </p>
        </div>
      }
    />
  );
}
