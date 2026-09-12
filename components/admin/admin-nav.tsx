"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ActivityIcon,
  CalendarCheckIcon,
  GavelIcon,
  MapPinnedIcon,
  MoreHorizontalIcon,
  ScissorsIcon,
  TagIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { BottomTabBar, type TabLink } from "@/components/bottom-tab-bar";

type Badge = "pending" | "disputes";

const NAV_ITEMS: { href: string; label: string; icon: typeof ActivityIcon; badge?: Badge }[] = [
  { href: "/admin", label: "Live ops", icon: ActivityIcon },
  { href: "/admin/bookings", label: "Bookings", icon: CalendarCheckIcon },
  { href: "/admin/barbers", label: "Barbers", icon: ScissorsIcon, badge: "pending" },
  { href: "/admin/pricing", label: "Services & pricing", icon: TagIcon },
  { href: "/admin/disputes", label: "Disputes", icon: GavelIcon, badge: "disputes" },
  { href: "/admin/coverage", label: "Coverage areas", icon: MapPinnedIcon },
];

// A4: phones get triage — the counts, the queue, and a way into the rest.
const TAB_LINKS: TabLink[] = [
  { href: "/admin", label: "Ops", icon: ActivityIcon },
  { href: "/admin/bookings", label: "Bookings", icon: CalendarCheckIcon },
  { href: "/admin/barbers", label: "Barbers", icon: ScissorsIcon },
  { href: "/admin/more", label: "More", icon: MoreHorizontalIcon },
];

function isActive(pathname: string, href: string) {
  return href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
}

// A1–A3 sidebar. Payouts from the wireframe is left out — there's no
// payout feature to link to.
export function AdminSidebar({
  pendingCount,
  openDisputesCount,
  email,
}: {
  pendingCount: number;
  openDisputesCount: number;
  email: string | null;
}) {
  const pathname = usePathname();
  const counts: Record<Badge, number> = { pending: pendingCount, disputes: openDisputesCount };

  return (
    <aside className="hidden w-[230px] flex-none flex-col gap-1.5 border-r-[1.5px] border-outline bg-muted px-3.5 py-[18px] sm:flex">
      <nav aria-label="Admin" className="flex flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const active = isActive(pathname, item.href);
          const count = item.badge ? counts[item.badge] : 0;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center justify-between gap-2 rounded-[5px] px-3 py-2.5 text-sm transition-colors",
                active
                  ? "bg-foreground font-semibold text-background"
                  : "text-ink-soft hover:bg-accent hover:text-foreground",
              )}
            >
              <span className="flex items-center gap-2.5">
                <item.icon className="size-4" aria-hidden />
                {item.label}
              </span>
              {count > 0 && (
                <span className="rounded-full bg-primary px-[7px] py-px text-xs font-bold text-primary-foreground">
                  {count}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
      {email && (
        <p className="mt-auto truncate border-t border-border px-3 pt-4 text-[13px] text-muted-foreground">
          {email}
        </p>
      )}
    </aside>
  );
}

export function AdminTabbar({ pendingCount }: { pendingCount: number }) {
  return <BottomTabBar links={TAB_LINKS} badges={{ "/admin/barbers": pendingCount > 0 }} />;
}
