import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { BarberTabbar, BarberTopNav } from "@/components/barber/barber-nav";
import { UserPill } from "@/components/customer/user-pill";
import { NotificationToggle } from "@/components/notifications/notification-toggle";
import { formatPeso } from "@/lib/format";
import { cn } from "@/lib/utils";

// The barber app frame (Barber UI, W1–W3). From `lg` a fixed-height window:
// header on top — the mark, the pill nav, then the wallet, the online
// switch and the account — and the page fills the rest, scrolling in
// panes. Below `lg` there is no global header (each screen draws its own,
// as in B1–B6) and the five-tab bar sits at the foot.
export function BarberShell({
  fullName,
  avatarUrl,
  balance,
  minWallet,
  status,
  children,
}: {
  fullName: string | null;
  avatarUrl?: string | null;
  balance: number;
  minWallet: number;
  // The online switch (verified) or a verification chip (not yet).
  status: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-svh flex-col lg:h-svh lg:overflow-hidden">
      <header className="hidden items-center justify-between gap-6 border-b border-line-soft bg-background px-6 py-4 lg:flex">
        <div className="flex min-w-0 items-center gap-[26px]">
          <Link href="/barber" className="text-foreground">
            <Logo className="text-[19px]" />
          </Link>
          <BarberTopNav />
        </div>
        <div className="flex shrink-0 items-center gap-3.5">
          <Link href="/barber/earnings" className="text-sm text-[#6a635a]">
            Wallet{" "}
            <span className={cn("font-extrabold", balance < minWallet ? "text-destructive" : "text-foreground")}>
              {formatPeso(balance)}
            </span>
          </Link>
          {status}
          <NotificationToggle />
          <UserPill fullName={fullName} avatarUrl={avatarUrl} role="barber" compact />
        </div>
      </header>

      <main className="flex min-h-0 flex-1 flex-col pb-[calc(4.5rem+env(safe-area-inset-bottom))] lg:overflow-y-auto lg:pb-0">
        {children}
      </main>
      <div className="lg:hidden">
        <BarberTabbar />
      </div>
    </div>
  );
}
