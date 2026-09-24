import Link from "next/link";
import { roleHomePath, type UserRole } from "@/lib/role-path";
import { Logo } from "@/components/brand/logo";
import { UserMenu } from "@/components/user-menu";
import { NotificationToggle } from "@/components/notifications/notification-toggle";
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
        <div className="flex min-w-0 flex-1 items-center justify-end gap-6">
          {subnav && (
            <nav
              aria-label="Primary"
              className={cn(
                // min-w-0 lets this flex item actually shrink below its
                // content size — without it, a wide subnav (the
                // customer pill switcher) would push the header wider
                // than the viewport instead of letting its own
                // overflow-x-auto take over.
                "min-w-0 items-center gap-5",
                tabbar ? "hidden sm:flex" : "flex",
              )}
            >
              {subnav}
            </nav>
          )}
          {headerExtra && <div className="hidden items-center gap-4 sm:flex">{headerExtra}</div>}
          <NotificationToggle />
          <UserMenu role={role} fullName={fullName} avatarUrl={avatarUrl} />
        </div>
      </header>
      <main
        className={cn(
          "flex flex-1 flex-col",
          // The tab bar's own height (~64px) plus whatever the device adds
          // for the home-indicator inset — pb-16 alone left content (and
          // sticky bars, see NextStepButton) partly hidden behind the tab
          // bar on notched phones.
          tabbar && "pb-[calc(4rem+env(safe-area-inset-bottom))] sm:pb-0",
        )}
      >
        {children}
      </main>
      {tabbar && <div className="sm:hidden">{tabbar}</div>}
    </div>
  );
}
