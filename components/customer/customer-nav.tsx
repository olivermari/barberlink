"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarIcon,
  ClockIcon,
  LocateFixedIcon,
  MessageSquareIcon,
  UserIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

// The five destinations, shared by the desktop pill nav and the mobile
// tab bar (Customer UI: "the same five destinations").
export const CUSTOMER_NAV = [
  { href: "/customer", label: "Book", Icon: CalendarIcon },
  { href: "/customer/history", label: "History", Icon: ClockIcon },
  { href: "/customer/track", label: "Track", Icon: LocateFixedIcon },
  { href: "/customer/messages", label: "Messages", Icon: MessageSquareIcon },
  { href: "/customer/profile", label: "Profile", Icon: UserIcon },
] as const;

function useActiveHref() {
  const pathname = usePathname();
  // Longest match wins, so "/customer" isn't also active on
  // "/customer/history". A booking's own detail route belongs to Track
  // (active) or History (past) — Track only claims it while it's live,
  // which the page can't tell from the URL, so bookings/[id] counts as
  // History, where finished receipts live.
  const aliases: Record<string, string> = {
    "/customer/bookings": "/customer/history",
    "/customer/barbers": "/customer",
  };
  const effective =
    Object.entries(aliases).find(([from]) => pathname === from || pathname.startsWith(`${from}/`))?.[1] ??
    pathname;
  return CUSTOMER_NAV.map((l) => l.href)
    .filter((href) => effective === href || effective.startsWith(`${href}/`))
    .sort((a, b) => b.length - a.length)[0];
}

// Desktop header: a wash-tinted segmented pill, active segment in ink.
export function CustomerTopNav() {
  const activeHref = useActiveHref();
  return (
    <nav
      aria-label="Primary"
      className="flex items-center gap-1 rounded-[11px] border border-wash-border bg-wash p-1"
    >
      {CUSTOMER_NAV.map(({ href, label, Icon }) => {
        const active = href === activeHref;
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-[7px] rounded-lg px-[15px] py-[9px] text-sm whitespace-nowrap transition-colors",
              active
                ? "bg-foreground font-semibold text-background"
                : "font-medium text-ink-soft hover:text-foreground",
            )}
          >
            <Icon className="size-4" aria-hidden />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

// Mobile bottom tab bar: five equal columns, label under the icon, the
// active one in red.
export function CustomerTabbar() {
  const activeHref = useActiveHref();
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-line-soft bg-background pt-2.5"
      style={{ paddingBottom: "max(0.875rem, env(safe-area-inset-bottom))" }}
    >
      {CUSTOMER_NAV.map(({ href, label, Icon }) => {
        const active = href === activeHref;
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex flex-col items-center gap-1 text-[11px] transition-colors",
              active ? "font-bold text-primary" : "font-medium text-faint hover:text-foreground",
            )}
          >
            <Icon className="size-[22px]" aria-hidden />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
