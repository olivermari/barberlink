import { requireProfile } from "@/lib/supabase/require-profile";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/app-shell";
import { AdminSidebar, AdminTabbar } from "@/components/admin/admin-nav";
import { AdminNotificationProvider } from "@/components/admin/admin-notification-provider";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, profile } = await requireProfile();
  const supabase = await createClient();

  // "needs_info" barbers are waiting on themselves, not on an admin, so
  // only "pending" counts toward the badge.
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
    <AppShell
      role="admin"
      fullName={profile.full_name}
      avatarUrl={profile.avatar_url}
      tabbar={<AdminTabbar pendingCount={pendingCount ?? 0} />}
    >
      <AdminNotificationProvider />
      <div className="flex flex-1">
        <AdminSidebar
          pendingCount={pendingCount ?? 0}
          openDisputesCount={openDisputesCount ?? 0}
          email={user.email ?? null}
        />
        <div className="flex min-w-0 flex-1 flex-col">{children}</div>
      </div>
    </AppShell>
  );
}
