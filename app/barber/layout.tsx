import Link from "next/link";
import { requireProfile } from "@/lib/supabase/require-profile";
import { ensureBarberProfile } from "@/lib/supabase/ensure-barber-profile";
import { createClient } from "@/lib/supabase/server";
import { getPendingRequest } from "@/lib/barber-request";
import { formatPeso } from "@/lib/format";
import { cn } from "@/lib/utils";
import { AppShell } from "@/components/app-shell";
import { JobsBadgeProvider } from "@/components/barber/jobs-badge-provider";
import { BarberSubnav, BarberTabbar } from "@/components/barber/barber-nav";
import { AvailabilityToggle } from "@/components/barber/availability-toggle";
import { LocationBroadcaster } from "@/components/barber/location-broadcaster";
import { IncomingRequest } from "@/components/barber/incoming-request";
import { Badge } from "@/components/ui/badge";

const VERIFICATION_CHIP: Record<string, string> = {
  pending: "PENDING VERIFICATION",
  needs_info: "NEEDS INFO",
  rejected: "NOT VERIFIED",
};

export default async function BarberLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, profile } = await requireProfile();
  const supabase = await createClient();
  await ensureBarberProfile(supabase, user.id);

  const { data: barber } = await supabase
    .from("barber_profiles")
    .select("is_available, verification_status, token_balance, current_lat, current_lng")
    .eq("id", user.id)
    .single();

  const position =
    barber?.current_lat != null && barber?.current_lng != null
      ? { lat: barber.current_lat, lng: barber.current_lng }
      : null;
  // Refetched on every router.refresh() — JobsBadgeProvider refreshes on
  // each booking change, which is how a new request reaches the screen.
  const request = await getPendingRequest(supabase, user.id, position);
  const isAvailable = barber?.is_available ?? false;
  const verificationStatus = barber?.verification_status ?? "pending";
  const balance = Number(barber?.token_balance ?? 0);

  return (
    <JobsBadgeProvider barberId={user.id}>
      <AppShell
        role="barber"
        fullName={profile.full_name}
        avatarUrl={profile.avatar_url}
        subnav={<BarberSubnav />}
        tabbar={<BarberTabbar />}
        headerExtra={
          <>
            <Link href="/barber/earnings" className="text-sm text-muted-foreground hover:underline">
              Wallet{" "}
              <span className={cn("font-bold", balance < 0 ? "text-destructive" : "text-foreground")}>
                {formatPeso(balance)}
              </span>
            </Link>
            {verificationStatus === "verified" ? (
              <AvailabilityToggle barberId={user.id} isAvailable={isAvailable} />
            ) : (
              <Badge variant="outline" className="h-6 px-2">
                {VERIFICATION_CHIP[verificationStatus] ?? "NOT VERIFIED"}
              </Badge>
            )}
          </>
        }
      >
        {children}
      </AppShell>
      <LocationBroadcaster barberId={user.id} isAvailable={isAvailable} />
      {request && <IncomingRequest key={request.id} request={request} />}
    </JobsBadgeProvider>
  );
}
