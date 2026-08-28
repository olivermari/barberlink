import { requireProfile } from "@/lib/supabase/require-profile";
import { AppShell } from "@/components/app-shell";
import { NavLinks } from "@/components/nav-links";

const CUSTOMER_NAV = [
  { href: "/customer", label: "Browse" },
  { href: "/customer/bookings", label: "My Bookings" },
];

export default async function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile } = await requireProfile();

  return (
    <AppShell
      role="customer"
      fullName={profile.full_name}
      subnav={<NavLinks links={CUSTOMER_NAV} />}
    >
      {children}
    </AppShell>
  );
}
