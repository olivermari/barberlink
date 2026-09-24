"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClockIcon, MessageSquareIcon, UserIcon, WalletIcon } from "lucide-react";
import { useJobsBadge } from "@/components/barber/jobs-badge-provider";
import { cn } from "@/lib/utils";

// The design's Jobs mark: crossed scissors.
function JobsIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.1"
      strokeLinecap="round"
      className={className}
      aria-hidden
    >
      <path d="M6 4l12 12M18 4 6 16" />
      <circle cx="5" cy="19" r="2.4" />
      <circle cx="19" cy="19" r="2.4" />
    </svg>
  );
}

// The barber's five destinations, shared by the desktop pill nav and the
// mobile tab bar.
export const BARBER_NAV = [
  { href: "/barber", label: "Jobs", Icon: JobsIcon },
  { href: "/barber/earnings", label: "Earnings", Icon: WalletIcon },
  { href: "/barber/history", label: "History", Icon: ClockIcon },
  { href: "/barber/messages", label: "Messages", Icon: MessageSquareIcon },
  { href: "/barber/profile", label: "Profile", Icon: UserIcon },
] as const;

function useActiveHref() {
  const pathname = usePathname();
  // Longest match wins, so "/barber" isn't also active on "/barber/history".
  return BARBER_NAV.map((l) => l.href)
    .filter((href) => pathname === href || pathname.startsWith(`${href}/`))
    .sort((a, b) => b.length - a.length)[0];
}

// A dot on Jobs while there's something new to look at.
function NewDot({ className }: { className?: string }) {
  return (
    <span
      className={cn("absolute size-2 rounded-full bg-primary", className)}
      aria-label="New activity"
    />
  );
}

// Desktop header: a wash-tinted segmented pill, active segment in ink.
export function BarberTopNav() {
  const activeHref = useActiveHref();
  const hasNewJob = useJobsBadge();
  return (
    <nav
      aria-label="Primary"
      className="flex items-center gap-1 rounded-[11px] border border-wash-border bg-wash p-1"
    >
      {BARBER_NAV.map(({ href, label, Icon }) => {
        const active = href === activeHref;
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative flex items-center gap-[7px] rounded-lg px-[15px] py-[9px] text-sm whitespace-nowrap transition-colors",
              active
                ? "bg-foreground font-semibold text-background"
                : "font-medium text-ink-soft hover:text-foreground",
            )}
          >
            <Icon className="size-4" aria-hidden />
            {label}
            {href === "/barber" && hasNewJob && <NewDot className="top-1.5 right-1.5" />}
          </Link>
        );
      })}
    </nav>
  );
}

// Mobile bottom tab bar: five equal columns, label under the icon, the
// active one in red.
export function BarberTabbar() {
  const activeHref = useActiveHref();
  const hasNewJob = useJobsBadge();
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-line-soft bg-background pt-2.5"
      style={{ paddingBottom: "max(0.875rem, env(safe-area-inset-bottom))" }}
    >
      {BARBER_NAV.map(({ href, label, Icon }) => {
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
            <span className="relative">
              <Icon className="size-5" aria-hidden />
              {href === "/barber" && hasNewJob && <NewDot className="-top-0.5 -right-1" />}
            </span>
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
