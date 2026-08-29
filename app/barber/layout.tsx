import { requireProfile } from "@/lib/supabase/require-profile";
import { ensureBarberProfile } from "@/lib/supabase/ensure-barber-profile";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/app-shell";
import { NavLinks } from "@/components/nav-links";

const BARBER_NAV = [
  { href: "/barber", label: "Dashboard" },
  { href: "/barber/history", label: "History" },
  { href: "/barber/profile", label: "Profile" },
  { href: "/barber/earnings", label: "Earnings" },
];

export default async function BarberLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, profile } = await requireProfile();
  const supabase = await createClient();
  await ensureBarberProfile(supabase, user.id);

  return (
    <AppShell
      role="barber"
      fullName={profile.full_name}
      subnav={<NavLinks links={BARBER_NAV} />}
    >
      {children}
    </AppShell>
  );
}
