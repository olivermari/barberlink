"use client";

import { useState } from "react";
import { EditProfileDialog } from "@/components/barber/edit-profile-dialog";
import { cn } from "@/lib/utils";

type Item = { id: string; label: string; opens?: "edit" };
type FormProps = Omit<React.ComponentProps<typeof EditProfileDialog>, "trigger" | "triggerClassName" | "open" | "onOpenChange">;

// W3's left nav. Bio and radius are edited in the profile form, so those two
// open it; the others scroll their section into view and flash it — a bare
// anchor did nothing when the page already fit on screen.
export function ProfileSectionNav({ items, ...form }: FormProps & { items: Item[] }) {
  const [active, setActive] = useState(items[0]?.id ?? "");
  const [editOpen, setEditOpen] = useState(false);

  function go(item: Item) {
    setActive(item.id);
    if (item.opens === "edit") {
      setEditOpen(true);
      return;
    }
    const el = document.getElementById(item.id);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    el.animate(
      [{ boxShadow: "0 0 0 3px rgba(207,36,23,0.35)" }, { boxShadow: "0 0 0 0 rgba(207,36,23,0)" }],
      { duration: 1100, easing: "ease-out" },
    );
  }

  return (
    <>
      <nav aria-label="Profile sections" className="flex flex-col gap-[5px]">
        {items.map((i) => (
          <button
            key={i.id}
            type="button"
            onClick={() => go(i)}
            aria-current={active === i.id ? "true" : undefined}
            className={cn(
              "rounded-[9px] px-[13px] py-[11px] text-left text-sm transition-colors",
              active === i.id ? "bg-foreground font-semibold text-white" : "text-[#4c463d] hover:bg-wash",
            )}
          >
            {i.label}
          </button>
        ))}
      </nav>
      <EditProfileDialog {...form} open={editOpen} onOpenChange={setEditOpen} />
    </>
  );
}
