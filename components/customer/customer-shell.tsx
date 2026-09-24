import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { CustomerTabbar, CustomerTopNav } from "@/components/customer/customer-nav";
import { UserPill } from "@/components/customer/user-pill";

// The customer app frame (Customer UI "Desktop app shell"). From `lg` it
// is a fixed-height window: header on top, and the page below fills the
// rest and scrolls (or splits into panes) on its own. Below `lg` there is
// no global header — each screen draws its own, as the mobile designs do
// — and the five-tab bar sits at the foot.
export function CustomerShell({
  fullName,
  avatarUrl,
  banner,
  children,
}: {
  fullName: string | null;
  avatarUrl?: string | null;
  // The "your barber is on the way" strip (ActiveBookingBar).
  banner?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-svh flex-col lg:h-svh lg:overflow-hidden">
      <header className="hidden items-center justify-between gap-6 border-b border-line-soft bg-background px-6 py-4 lg:flex">
        <Link href="/customer" className="text-foreground">
          <Logo className="text-[19px]" />
        </Link>
        <CustomerTopNav />
        <UserPill fullName={fullName} avatarUrl={avatarUrl} />
      </header>
      {banner}
      <main className="flex min-h-0 flex-1 flex-col pb-[calc(4.5rem+env(safe-area-inset-bottom))] lg:overflow-y-auto lg:pb-0">
        {children}
      </main>
      <div className="lg:hidden">
        <CustomerTabbar />
      </div>
    </div>
  );
}
