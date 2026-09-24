"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { initials } from "@/lib/initials";
import type { UserRole } from "@/lib/role-path";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const ROLE_LABEL: Record<UserRole, string> = {
  customer: "Customer",
  barber: "Barber",
  admin: "Admin",
};

const ACCOUNT_HREF: Partial<Record<UserRole, string>> = {
  customer: "/customer/profile",
  barber: "/barber/profile",
};

// The wireframe header carries only the mark and an avatar; who you are,
// your account and sign-out all live behind that avatar.
export function UserMenu({
  role,
  fullName,
  avatarUrl,
}: {
  role: UserRole;
  fullName: string | null;
  avatarUrl?: string | null;
}) {
  const router = useRouter();
  const accountHref = ACCOUNT_HREF[role];

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Account menu"
        className="rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <Avatar size="sm">
          {avatarUrl && <AvatarImage src={avatarUrl} alt={fullName ?? "Profile photo"} />}
          <AvatarFallback>{initials(fullName)}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex flex-col gap-0.5 py-1.5">
            <span className="text-sm font-semibold text-foreground">
              {fullName ?? "Your account"}
            </span>
            <span>{ROLE_LABEL[role]}</span>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        {accountHref && (
          <DropdownMenuItem render={<Link href={accountHref} />}>
            Account
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={signOut}>Sign out</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
