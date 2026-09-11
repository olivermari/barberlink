import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/supabase/require-profile";
import { initials } from "@/lib/initials";
import { ProfileForm } from "@/components/barber/profile-form";
import { ServiceManager } from "@/components/barber/service-manager";
import { PortfolioManager } from "@/components/barber/portfolio-manager";
import { AvatarUpload } from "@/components/avatar-upload";

const VERIFICATION_LABEL: Record<string, string> = {
  verified: "Verified",
  pending: "Verification pending",
  rejected: "Not verified",
};

// Wireframe B5: profile, services, portfolio and radius on one scroll —
// they're all edited in the same sitting.
export default async function BarberProfilePage() {
  const { user, profile } = await requireProfile();
  const supabase = await createClient();

  const [{ data: barberProfile }, { data: services }, { data: portfolio }] =
    await Promise.all([
      supabase
        .from("barber_profiles")
        .select(
          "bio, years_experience, base_address, service_radius_km, rating_avg, rating_count, verification_status",
        )
        .eq("id", user.id)
        .single(),
      supabase
        .from("services")
        .select("id, name, description, price, duration_minutes, is_active")
        .eq("barber_id", user.id)
        .eq("is_active", true)
        .order("price", { ascending: true }),
      supabase
        .from("barber_portfolio")
        .select("id, image_url, caption, storage_path")
        .eq("barber_id", user.id)
        .order("created_at", { ascending: false }),
    ]);

  const meta = [
    barberProfile && barberProfile.rating_count > 0
      ? `★ ${Number(barberProfile.rating_avg).toFixed(1)} (${barberProfile.rating_count})`
      : "No ratings yet",
    VERIFICATION_LABEL[barberProfile?.verification_status ?? "pending"],
  ].join(" · ");

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-4 sm:p-6">
      <h1 className="text-[23px] font-black">Profile</h1>

      <AvatarUpload
        userId={user.id}
        avatarUrl={profile.avatar_url}
        fallback={initials(profile.full_name)}
      >
        <p className="truncate text-lg font-bold">{profile.full_name ?? "Your name"}</p>
        <p className="text-sm text-muted-foreground">{meta}</p>
      </AvatarUpload>

      <ProfileForm
        barberId={user.id}
        fullName={profile.full_name}
        phone={profile.phone}
        bio={barberProfile?.bio ?? null}
        yearsExperience={barberProfile?.years_experience ?? null}
        baseAddress={barberProfile?.base_address ?? null}
        serviceRadiusKm={barberProfile?.service_radius_km ?? null}
      />

      <ServiceManager services={services ?? []} />

      <PortfolioManager barberId={user.id} portfolio={portfolio ?? []} />
    </div>
  );
}
