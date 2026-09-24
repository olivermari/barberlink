"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

export type NavItem = { id: string; label: string };

const ITEMS: NavItem[] = [
  { id: "account", label: "Account" },
  { id: "preferences", label: "App Preferences" },
  { id: "payments", label: "Payments" },
  { id: "saved", label: "Saved Barbers" },
  { id: "help", label: "Help & Support" },
  { id: "about", label: "About" },
];

export function SignOutButton({ className, children }: { className?: string; children: React.ReactNode }) {
  const router = useRouter();
  return (
    <button
      type="button"
      className={className}
      onClick={async () => {
        await createClient().auth.signOut();
        router.push("/login");
        router.refresh();
      }}
    >
      {children}
    </button>
  );
}

// W6's left nav: the settings sections as anchors into the page, the
// current one in ink.
export function ProfileNav({ items = ITEMS }: { items?: NavItem[] }) {
  const [active, setActive] = useState(items[0]?.id ?? "");

  useEffect(() => {
    const sync = () => {
      const hash = window.location.hash.replace("#", "");
      if (items.some((i) => i.id === hash)) setActive(hash);
    };
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, [items]);

  return (
    <nav aria-label="Settings sections" className="flex flex-col gap-[5px]">
      {items.map((i) => (
        <a
          key={i.id}
          href={`#${i.id}`}
          aria-current={active === i.id ? "true" : undefined}
          className={cn(
            "rounded-[9px] px-[13px] py-[11px] text-sm transition-colors",
            active === i.id ? "bg-foreground font-semibold text-white" : "text-[#4c463d] hover:bg-wash",
          )}
        >
          {i.label}
        </a>
      ))}
    </nav>
  );
}
