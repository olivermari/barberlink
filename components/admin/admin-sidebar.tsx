"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShieldCheckIcon, MapPinnedIcon, BarChart3Icon, GavelIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/admin", label: "Verification", icon: ShieldCheckIcon },
  { href: "/admin/coverage", label: "Coverage", icon: MapPinnedIcon },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3Icon },
  { href: "/admin/disputes", label: "Disputes", icon: GavelIcon },
];

export function AdminSidebar({
  pendingCount,
  openDisputesCount,
}: {
  pendingCount: number;
  openDisputesCount: number;
}) {
  const pathname = usePathname();
  const badgeByHref: Record<string, number> = {
    "/admin": pendingCount,
    "/admin/disputes": openDisputesCount,
  };

  return (
    <aside className="flex w-full flex-row gap-1 overflow-x-auto border-b p-2 sm:w-56 sm:flex-none sm:flex-col sm:gap-0.5 sm:border-b-0 sm:border-r sm:p-3">
      {NAV_ITEMS.map((item) => {
        const active = pathname === item.href;
        const badge = badgeByHref[item.href] ?? 0;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center justify-between gap-2 rounded-md px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors",
              active
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <span className="flex items-center gap-2">
              <item.icon className="size-4" />
              {item.label}
            </span>
            {badge > 0 && (
              <span className="rounded-full bg-primary px-1.5 py-0.5 text-xs font-semibold text-primary-foreground">
                {badge}
              </span>
            )}
          </Link>
        );
      })}
    </aside>
  );
}
