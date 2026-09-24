import { ThreadList } from "@/components/customer/thread-list";
import type { Conversation } from "@/lib/messages";
import { cn } from "@/lib/utils";

// Customer UI W5 in one frame: threads | conversation | the booking the
// conversation is about. On phones only one pane shows at a time — the
// inbox at /customer/messages, the conversation once one is open.
export function MessagesShell({
  conversations,
  times,
  activeId,
  pane,
  rail,
  role = "customer",
}: {
  conversations: Conversation[];
  times: Record<string, string>;
  activeId?: string;
  pane: React.ReactNode;
  rail?: React.ReactNode;
  role?: "customer" | "barber";
}) {
  const open = activeId != null;
  return (
    <div className="flex min-h-0 flex-1 flex-col lg:grid lg:grid-cols-[352px_minmax(0,1fr)_300px]">
      <div
        className={cn(
          "min-h-0 flex-col lg:flex lg:border-r lg:border-line-soft",
          open ? "hidden" : "flex flex-1",
        )}
      >
        <ThreadList conversations={conversations} activeId={activeId} times={times} role={role} />
      </div>
      <div className={cn("min-h-0 min-w-0 flex-col", open ? "flex flex-1" : "hidden lg:flex")}>{pane}</div>
      <aside className="hidden min-h-0 flex-col gap-[13px] overflow-y-auto border-l border-line-soft bg-[#faf8f3] p-[18px] [background-image:radial-gradient(#ece5d5_1px,transparent_1.2px)] [background-size:15px_15px] lg:flex">
        {rail}
      </aside>
    </div>
  );
}
