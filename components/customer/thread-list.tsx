"use client";

import { useState } from "react";
import Link from "next/link";
import { SearchIcon, SlidersHorizontalIcon } from "lucide-react";
import { LogoMarkSmall } from "@/components/brand/logo";
import { Photo } from "@/components/customer/ui";
import type { Conversation } from "@/lib/messages";
import { cn } from "@/lib/utils";

// The inbox: search, an unread-only toggle, and one row per conversation
// — online dot on the avatar, the last line ("You: …" when it's yours),
// the time, and an unread badge. The support row is the one thread
// wearing the mark.
export function ThreadList({
  conversations,
  activeId,
  times,
  hideTitle,
  role = "customer",
}: {
  conversations: Conversation[];
  activeId?: string;
  // Pre-formatted on the server (same clock for every row).
  times: Record<string, string>;
  hideTitle?: boolean;
  role?: "customer" | "barber";
}) {
  const [query, setQuery] = useState("");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const q = query.trim().toLowerCase();
  const list = conversations.filter(
    (c) =>
      (!unreadOnly || c.unread > 0) &&
      (!q || c.name.toLowerCase().includes(q) || c.preview.toLowerCase().includes(q)),
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-col gap-3 px-[18px] pb-3 lg:px-4 lg:pt-[18px]">
        {!hideTitle && (
          <h1 className="pt-2.5 text-[22px] font-extrabold tracking-[-0.02em] lg:pt-0 lg:text-xl">Messages</h1>
        )}
        <div className="flex gap-2.5">
          <label className="flex min-w-0 flex-1 items-center gap-[9px] rounded-[11px] border border-field px-3.5 py-[11px] lg:px-[13px]">
            <SearchIcon className="size-[18px] shrink-0" aria-hidden />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search conversations…"
              aria-label="Search conversations"
              className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-faint"
            />
          </label>
          <button
            type="button"
            aria-pressed={unreadOnly}
            aria-label="Show unread only"
            onClick={() => setUnreadOnly((v) => !v)}
            className={cn(
              "flex w-[42px] items-center justify-center rounded-[11px] border transition-colors lg:hidden",
              unreadOnly ? "border-foreground bg-foreground text-background" : "border-field hover:bg-wash",
            )}
          >
            <SlidersHorizontalIcon className="size-[18px]" aria-hidden />
          </button>
        </div>
      </div>

      <ul className="min-h-0 flex-1 overflow-y-auto px-[18px] lg:px-0">
        {list.length === 0 && (
          <li className="py-6 text-sm text-[#6a635a] lg:px-4">
            {conversations.length === 0
              ? `Messages with your ${role === "barber" ? "customers" : "barber"} show up here once a booking starts a conversation.`
              : "No conversations match."}
          </li>
        )}
        {list.map((c) => (
          <li key={c.id}>
            <Link
              href={`/${role}/messages/${c.id}`}
              className={cn(
                "flex items-center gap-3 border-b border-[#f1ebdf] py-[13px] transition-colors hover:bg-wash lg:px-4",
                c.id === activeId && "lg:bg-wash",
              )}
            >
              <span className="relative shrink-0">
                {c.support ? (
                  <span className="flex size-12 items-center justify-center rounded-full bg-foreground lg:size-11">
                    <LogoMarkSmall size={22} />
                  </span>
                ) : (
                  <Photo src={c.avatarUrl} name={c.name} className="size-12 lg:size-11" />
                )}
                {c.online && (
                  <span className="absolute right-px bottom-px size-3 rounded-full border-2 border-white bg-[#3e9c4a]" />
                )}
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
                <span className="truncate text-[15px] font-bold lg:text-[14.5px]">{c.name}</span>
                <span className="truncate text-[13px] text-[#6a635a]">
                  {c.mine ? "You: " : ""}
                  {c.preview}
                </span>
              </span>
              <span className="flex shrink-0 flex-col items-end gap-1.5">
                <span className="text-xs text-faint">{times[c.id]}</span>
                {c.unread > 0 && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-[10px] bg-primary px-1.5 text-[11px] font-bold text-white">
                    {c.unread}
                  </span>
                )}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
