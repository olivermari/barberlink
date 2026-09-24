"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDownIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Photo } from "@/components/customer/ui";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// The desktop header's account pill: avatar, first name, chevron. Opens
// the same account menu for customers and barbers.
export function UserPill({
  fullName,
  avatarUrl,
  role = "customer",
  compact,
}: {
  fullName: string | null;
  avatarUrl?: string | null;
  role?: "customer" | "barber";
  // Just the avatar (the barber header).
  compact?: boolean;
}) {
  const router = useRouter();
  const firstName = fullName?.trim().split(/\s+/)[0] || "Account";

  async function signOut() {
    await createClient().auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Account menu"
        className={
          compact
            ? "rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            : "flex items-center gap-2.5 rounded-3xl border border-wash-border py-[5px] pr-3.5 pl-[5px] outline-none transition-colors hover:bg-wash focus-visible:ring-3 focus-visible:ring-ring/50"
        }
      >
        <Photo src={avatarUrl} name={fullName} className="size-8" />
        {!compact && (
          <>
            <span className="text-sm font-semibold">{firstName}</span>
            <ChevronDownIcon className="size-3.5 text-muted-foreground" aria-hidden />
          </>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex flex-col gap-0.5 py-1.5">
            <span className="text-sm font-semibold text-foreground">{fullName ?? "Your account"}</span>
            <span>{role === "barber" ? "Barber" : "Customer"}</span>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem render={<Link href={`/${role}/profile`} />}>Profile</DropdownMenuItem>
        <DropdownMenuItem onClick={signOut}>Sign out</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
