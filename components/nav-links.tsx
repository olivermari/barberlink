"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function NavLinks({
  links,
  badges,
}: {
  links: { href: string; label: string }[];
  badges?: Record<string, boolean>;
}) {
  const pathname = usePathname();

  return (
    <>
      {links.map((link) => {
        const active =
          pathname === link.href || pathname.startsWith(`${link.href}/`);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "inline-flex items-center gap-1.5 text-sm font-medium transition-colors",
              active
                ? "font-semibold text-primary"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {link.label}
            {badges?.[link.href] && (
              <span
                className="size-1.5 rounded-full bg-destructive"
                aria-label="New activity"
              />
            )}
          </Link>
        );
      })}
    </>
  );
}
