import { requireProfile } from "@/lib/supabase/require-profile";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/app-shell";
import { CustomerSubnav, CustomerTabbar } from "@/components/customer/customer-nav";
import { ActiveBookingBar } from "@/components/customer/active-booking-bar";

const ACTIVE_STATUSES = ["queued", "pending", "accepted", "on_the_way", "in_service"];

export default async function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, profile } = await requireProfile();
  const supabase = await createClient();

  const { data: activeRow } = await supabase
    .from("bookings")
    .select("id, status, barber_id")
    .eq("customer_id", user.id)
    .in("status", ACTIVE_STATUSES)
    .order("requested_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let initialBooking = null;
  if (activeRow) {
    const { data: barber } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", activeRow.barber_id)
      .single();

    initialBooking = {
      id: activeRow.id,
      status: activeRow.status,
      barberId: activeRow.barber_id,
      barberName: barber?.full_name ?? "Your barber",
    };
  }

  return (
    <AppShell
      role="customer"
      fullName={profile.full_name}
      avatarUrl={profile.avatar_url}
      subnav={<CustomerSubnav />}
      tabbar={<CustomerTabbar />}
    >
      <ActiveBookingBar customerId={user.id} initialBooking={initialBooking} />
      {children}
    </AppShell>
  );
}
