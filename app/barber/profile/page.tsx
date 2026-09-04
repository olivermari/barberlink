import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/supabase/require-profile";
import { ProfileForm } from "@/components/barber/profile-form";
import { ServiceManager } from "@/components/barber/service-manager";
import { PortfolioManager } from "@/components/barber/portfolio-manager";
import { AvatarUpload } from "@/components/avatar-upload";
import { initials } from "@/lib/initials";
import { Separator } from "@/components/ui/separator";

export default async function BarberProfilePage() {
  const { user, profile } = await requireProfile();
  const supabase = await createClient();

  const [{ data: barberProfile }, { data: services }, { data: portfolio }] =
    await Promise.all([
      supabase
        .from("barber_profiles")
        .select("bio, years_experience, base_address, service_radius_km")
        .eq("id", user.id)
        .single(),
      supabase
        .from("services")
        .select("id, name, description, price, duration_minutes, is_active")
        .eq("barber_id", user.id)
        .order("created_at", { ascending: true }),
      supabase
        .from("barber_portfolio")
        .select("id, image_url, caption, storage_path")
        .eq("barber_id", user.id)
        .order("created_at", { ascending: false }),
    ]);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-4 sm:p-6">
      <h1 className="text-2xl font-semibold">Profile</h1>

      <AvatarUpload
        userId={user.id}
        avatarUrl={profile.avatar_url}
        fallback={initials(profile.full_name)}
      />

      <ProfileForm
        barberId={user.id}
        fullName={profile.full_name}
        phone={profile.phone}
        bio={barberProfile?.bio ?? null}
        yearsExperience={barberProfile?.years_experience ?? null}
        baseAddress={barberProfile?.base_address ?? null}
        serviceRadiusKm={barberProfile?.service_radius_km ?? null}
      />

      <Separator />

      <ServiceManager barberId={user.id} services={services ?? []} />

      <Separator />

      <PortfolioManager barberId={user.id} portfolio={portfolio ?? []} />
    </div>
  );
}
