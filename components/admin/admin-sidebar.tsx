"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShieldCheckIcon, MapPinnedIcon, BarChart3Icon, GavelIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// Only Verification is wired up today (Phase 8) — Coverage, Analytics,
// and Disputes are named here so the admin knows what's coming, but
// they're deliberately not clickable yet rather than routing to an
// empty page.
const SOON_ITEMS = [
  { label: "Coverage", icon: MapPinnedIcon },
  { label: "Analytics", icon: BarChart3Icon },
  { label: "Disputes", icon: GavelIcon },
];

export function AdminSidebar({ pendingCount }: { pendingCount: number }) {
  const pathname = usePathname();
  const verificationActive = pathname === "/admin";

  return (
    <aside className="flex w-full flex-row gap-1 overflow-x-auto border-b p-2 sm:w-56 sm:flex-none sm:flex-col sm:gap-0.5 sm:border-b-0 sm:border-r sm:p-3">
      <Link
        href="/admin"
        className={cn(
          "flex items-center justify-between gap-2 rounded-md px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors",
          verificationActive
            ? "bg-muted text-foreground"
            : "text-muted-foreground hover:bg-muted hover:text-foreground",
        )}
      >
        <span className="flex items-center gap-2">
          <ShieldCheckIcon className="size-4" />
          Verification
        </span>
        {pendingCount > 0 && (
          <span className="rounded-full bg-primary px-1.5 py-0.5 text-xs font-semibold text-primary-foreground">
            {pendingCount}
          </span>
        )}
      </Link>

      {SOON_ITEMS.map((item) => (
        <span
          key={item.label}
          className="flex items-center justify-between gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground/50 whitespace-nowrap"
        >
          <span className="flex items-center gap-2">
            <item.icon className="size-4" />
            {item.label}
          </span>
          <span className="text-xs">Soon</span>
        </span>
      ))}
    </aside>
  );
}
