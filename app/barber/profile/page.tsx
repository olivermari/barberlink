import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/supabase/require-profile";
import { initials } from "@/lib/initials";
import { DOCUMENTS_BUCKET } from "@/lib/barber-documents";
import { ProfileForm } from "@/components/barber/profile-form";
import { ServiceManager } from "@/components/barber/service-manager";
import { PortfolioManager } from "@/components/barber/portfolio-manager";
import { VerificationDocuments } from "@/components/barber/verification-documents";
import { AvatarUpload } from "@/components/avatar-upload";

const VERIFICATION_LABEL: Record<string, string> = {
  verified: "Verified",
  pending: "Verification pending",
  needs_info: "More info needed",
  rejected: "Not verified",
};

// Wireframe B5: profile, services, portfolio and radius on one scroll —
// they're all edited in the same sitting. Until verified, the documents
// the admin reviews (A2) sit at the top.
export default async function BarberProfilePage() {
  const { user, profile } = await requireProfile();
  const supabase = await createClient();

  const [{ data: barberProfile }, { data: services }, { data: portfolio }, { data: docRows }] =
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
      supabase.from("barber_documents").select("kind, storage_path").eq("barber_id", user.id),
    ]);

  const status = barberProfile?.verification_status ?? "pending";
  const verified = status === "verified";
  const docs = docRows ?? [];

  const [signed, infoRequest] = verified
    ? [null, null]
    : await Promise.all([
        docs.length
          ? supabase.storage
              .from(DOCUMENTS_BUCKET)
              .createSignedUrls(
                docs.map((d) => d.storage_path),
                600,
              )
          : Promise.resolve({ data: [] as { path: string | null; signedUrl: string }[] }),
        status === "needs_info"
          ? supabase.rpc("my_info_request").then(({ data }) => (data as string | null) ?? null)
          : Promise.resolve(null),
      ]);
  const urlByPath = new Map((signed?.data ?? []).map((s) => [s.path ?? "", s.signedUrl]));

  const meta = [
    barberProfile && barberProfile.rating_count > 0
      ? `★ ${Number(barberProfile.rating_avg).toFixed(1)} (${barberProfile.rating_count})`
      : "No ratings yet",
    VERIFICATION_LABEL[status] ?? "Not verified",
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

      {!verified && (
        <VerificationDocuments
          barberId={user.id}
          status={status}
          documents={docs.map((d) => ({
            kind: d.kind,
            storagePath: d.storage_path,
            url: urlByPath.get(d.storage_path) ?? null,
          }))}
          infoRequest={infoRequest}
        />
      )}

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
