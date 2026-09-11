import Link from "next/link";
import { roleHomePath, type UserRole } from "@/lib/role-path";
import { Logo } from "@/components/brand/logo";
import { UserMenu } from "@/components/user-menu";
import { cn } from "@/lib/utils";

export function AppShell({
  role,
  fullName,
  avatarUrl,
  subnav,
  tabbar,
  headerExtra,
  children,
}: {
  role: UserRole;
  fullName: string | null;
  avatarUrl?: string | null;
  // Web nav links, shown in the header beside the avatar (hidden below
  // `sm` when a mobile tab bar takes over).
  subnav?: React.ReactNode;
  // Mobile bottom tab bar (hidden at `sm` and up) — the primary nav on
  // the phone-in-hand roles (customer, barber).
  tabbar?: React.ReactNode;
  // Status beside the avatar from `sm` up (the barber's wallet and
  // online toggle, B6). Phones show it in the page instead.
  headerExtra?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between gap-4 border-b bg-background px-4 py-3 sm:px-6">
        <Link href={roleHomePath(role)}>
          <Logo size="sm" />
        </Link>
        <div className="flex items-center gap-6">
          {subnav && (
            <nav
              className={cn(
                "items-center gap-5",
                tabbar ? "hidden sm:flex" : "flex",
              )}
            >
              {subnav}
            </nav>
          )}
          {headerExtra && <div className="hidden items-center gap-4 sm:flex">{headerExtra}</div>}
          <UserMenu role={role} fullName={fullName} avatarUrl={avatarUrl} />
        </div>
      </header>
      <main className={cn("flex flex-1 flex-col", tabbar && "pb-16 sm:pb-0")}>
        {children}
      </main>
      {tabbar && <div className="sm:hidden">{tabbar}</div>}
    </div>
  );
}
