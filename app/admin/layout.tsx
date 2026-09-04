import { requireProfile } from "@/lib/supabase/require-profile";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/app-shell";
import { AdminSidebar } from "@/components/admin/admin-sidebar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile } = await requireProfile();
  const supabase = await createClient();

  const [{ count: pendingCount }, { count: openDisputesCount }] = await Promise.all([
    supabase
      .from("barber_profiles")
      .select("id", { count: "exact", head: true })
      .eq("verification_status", "pending"),
    supabase
      .from("disputes")
      .select("id", { count: "exact", head: true })
      .in("status", ["open", "investigating"]),
  ]);

  return (
    <AppShell role="admin" fullName={profile.full_name} avatarUrl={profile.avatar_url}>
      <div className="flex flex-1 flex-col sm:flex-row">
        <AdminSidebar
          pendingCount={pendingCount ?? 0}
          openDisputesCount={openDisputesCount ?? 0}
        />
        <div className="flex flex-1 flex-col">{children}</div>
      </div>
    </AppShell>
  );
}
