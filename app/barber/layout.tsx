import { requireProfile } from "@/lib/supabase/require-profile";
import { ensureBarberProfile } from "@/lib/supabase/ensure-barber-profile";
import { createClient } from "@/lib/supabase/server";
import { getPendingRequest } from "@/lib/barber-request";
import { readSettings } from "@/lib/platform-settings";
import { BarberShell } from "@/components/barber/barber-shell";
import { JobsBadgeProvider } from "@/components/barber/jobs-badge-provider";
import { AvailabilityToggle } from "@/components/barber/availability-toggle";
import { LocationBroadcaster } from "@/components/barber/location-broadcaster";
import { IncomingRequest } from "@/components/barber/incoming-request";
import { StatusPill } from "@/components/customer/ui";

const VERIFICATION_CHIP: Record<string, string> = {
  pending: "Verification pending",
  needs_info: "Needs info",
  rejected: "Not verified",
};

export default async function BarberLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, profile } = await requireProfile();
  const supabase = await createClient();
  await ensureBarberProfile(supabase, user.id);

  const [{ data: barber }, settings] = await Promise.all([
    supabase
      .from("barber_profiles")
      .select("is_available, verification_status, token_balance, current_lat, current_lng")
      .eq("id", user.id)
      .single(),
    readSettings(supabase),
  ]);

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
      <BarberShell
        fullName={profile.full_name}
        avatarUrl={profile.avatar_url}
        balance={balance}
        minWallet={settings.min_wallet_to_go_online}
        status={
          verificationStatus === "verified" ? (
            <AvailabilityToggle barberId={user.id} isAvailable={isAvailable} />
          ) : (
            <StatusPill tone="quiet" className="max-lg:hidden">
              {VERIFICATION_CHIP[verificationStatus] ?? "Not verified"}
            </StatusPill>
          )
        }
      >
        {children}
      </BarberShell>
      <LocationBroadcaster barberId={user.id} isAvailable={isAvailable} />
      {request && <IncomingRequest key={request.id} request={request} />}
    </JobsBadgeProvider>
  );
}
