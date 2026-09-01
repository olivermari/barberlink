import { requireProfile } from "@/lib/supabase/require-profile";
import { ensureBarberProfile } from "@/lib/supabase/ensure-barber-profile";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/app-shell";
import { JobsBadgeProvider } from "@/components/barber/jobs-badge-provider";
import { BarberSubnav, BarberTabbar } from "@/components/barber/barber-nav";

export default async function BarberLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, profile } = await requireProfile();
  const supabase = await createClient();
  await ensureBarberProfile(supabase, user.id);

  return (
    <JobsBadgeProvider barberId={user.id}>
      <AppShell
        role="barber"
        fullName={profile.full_name}
        subnav={<BarberSubnav />}
        tabbar={<BarberTabbar />}
      >
        {children}
      </AppShell>
    </JobsBadgeProvider>
  );
}
