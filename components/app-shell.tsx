import Link from "next/link";
import { roleHomePath, type UserRole } from "@/lib/role-path";
import { SignOutButton } from "@/components/sign-out-button";
import { Logo } from "@/components/brand/logo";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { initials } from "@/lib/initials";
import { cn } from "@/lib/utils";

const ROLE_LABEL: Record<UserRole, string> = {
  customer: "Customer",
  barber: "Barber",
  admin: "Admin",
};

export function AppShell({
  role,
  fullName,
  avatarUrl,
  subnav,
  tabbar,
  children,
}: {
  role: UserRole;
  fullName: string | null;
  avatarUrl?: string | null;
  // Desktop top bar (text links, hidden below `sm`).
  subnav?: React.ReactNode;
  // Mobile bottom tab bar (hidden at `sm` and up) — this is the
  // primary nav on the phone-in-hand roles (customer, barber).
  tabbar?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between border-b px-4 py-3 sm:px-6">
        <Link href={roleHomePath(role)}>
          <Logo size="sm" />
        </Link>
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
            {ROLE_LABEL[role]}
          </span>
          <span className="hidden text-sm text-muted-foreground sm:inline">
            {fullName ?? ""}
          </span>
          <Avatar size="sm">
            {avatarUrl && <AvatarImage src={avatarUrl} alt={fullName ?? "Profile photo"} />}
            <AvatarFallback>{initials(fullName)}</AvatarFallback>
          </Avatar>
          <SignOutButton />
        </div>
      </header>
      {subnav && (
        <nav
          className={cn(
            "items-center gap-4 border-b px-4 py-2 sm:px-6",
            tabbar ? "hidden sm:flex" : "flex",
          )}
        >
          {subnav}
        </nav>
      )}
      <main className={cn("flex flex-1 flex-col", tabbar && "pb-16 sm:pb-0")}>
        {children}
      </main>
      {tabbar && <div className="sm:hidden">{tabbar}</div>}
    </div>
  );
}
