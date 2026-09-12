"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type TabLink = { href: string; label: string; icon: LucideIcon };

// Mobile-only bottom tab bar — thumb-reachable navigation for the two
// roles that use this app on the move. Sits above the safe-area inset
// so it clears the home-indicator bar on notched phones.
export function BottomTabBar({
  links,
  badges,
}: {
  links: TabLink[];
  badges?: Record<string, boolean>;
}) {
  const pathname = usePathname();
  // The longest matching link wins, so a section's root tab (e.g.
  // "/customer") doesn't also light up on "/customer/bookings".
  const activeHref = links
    .map((link) => link.href)
    .filter((href) => pathname === href || pathname.startsWith(`${href}/`))
    .sort((a, b) => b.length - a.length)[0];

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 flex border-t bg-background"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {links.map((link) => {
        const active = link.href === activeHref;
        const Icon = link.icon;
        const hasBadge = badges?.[link.href];

        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "flex flex-1 flex-col items-center gap-1 py-2.5 text-xs font-medium transition-colors",
              active
                ? "font-semibold text-primary"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <span className="relative">
              <Icon className="size-5" aria-hidden="true" />
              {hasBadge && (
                <span
                  className="absolute -right-1 -top-1 size-2 rounded-full bg-destructive"
                  aria-label="New activity"
                />
              )}
            </span>
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
