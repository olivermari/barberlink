import { requireProfile } from "@/lib/supabase/require-profile";
import { AppShell } from "@/components/app-shell";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile } = await requireProfile();

  return (
    <AppShell role="admin" fullName={profile.full_name}>
      {children}
    </AppShell>
  );
}
