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

  const { count: pendingCount } = await supabase
    .from("barber_profiles")
    .select("id", { count: "exact", head: true })
    .eq("verification_status", "pending");

  return (
    <AppShell role="admin" fullName={profile.full_name}>
      <div className="flex flex-1 flex-col sm:flex-row">
        <AdminSidebar pendingCount={pendingCount ?? 0} />
        <div className="flex flex-1 flex-col">{children}</div>
      </div>
    </AppShell>
  );
}
