import { requireProfile } from "@/lib/supabase/require-profile";
import { AppShell } from "@/components/app-shell";

export default async function BarberLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile } = await requireProfile();

  return (
    <AppShell role="barber" fullName={profile.full_name}>
      {children}
    </AppShell>
  );
}
