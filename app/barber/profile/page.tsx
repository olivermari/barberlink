import { BadgeCheckIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/supabase/require-profile";
import { readSettings } from "@/lib/platform-settings";
import { initials } from "@/lib/initials";
import { DOCUMENTS_BUCKET } from "@/lib/barber-documents";
import { cn } from "@/lib/utils";
import { EditProfileDialog } from "@/components/barber/edit-profile-dialog";
import { AvailabilitySection } from "@/components/barber/availability-section";
import { PortfolioManager } from "@/components/barber/portfolio-manager";
import { ServiceManager } from "@/components/barber/service-manager";
import { VerificationDocuments } from "@/components/barber/verification-documents";
import { AvatarUpload } from "@/components/avatar-upload";
import { Caption, DOTTED_GROUND, Photo, StatusPill } from "@/components/customer/ui";
import { NotificationToggle } from "@/components/notifications/notification-toggle";
import { ProfileSectionNav } from "@/components/barber/profile-section-nav";
import { SignOutButton } from "@/components/customer/profile-nav";

const VERIFIED_ON = new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric", timeZone: "Asia/Manila" });

const NAV = [
  { id: "profile", label: "Profile & bio", opens: "edit" as const },
  { id: "services", label: "Services & pricing" },
  { id: "portfolio", label: "Portfolio" },
  { id: "availability", label: "Availability & radius" },
  { id: "verification", label: "Verification" },
];

// Barber UI B6 (phone) and W3 (web): profile, services, portfolio and
// radius on one scroll — they're edited in the same sitting. On web the
// rail shows the barber's own card as customers see it, so photo and
// price changes are judged against the real thing.
export default async function BarberProfilePage() {
  const { user, profile } = await requireProfile();
  const supabase = await createClient();

  const [
    { data: barberProfile },
    { data: services },
    { data: portfolio },
    { data: docRows },
    { count: jobCount },
    settings,
  ] = await Promise.all([
    supabase
      .from("barber_profiles")
      .select(
        "bio, years_experience, base_address, service_radius_km, rating_avg, rating_count, verification_status, verified_at, is_available, current_lat, current_lng, token_balance",
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
    supabase
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("barber_id", user.id)
      .eq("status", "completed"),
    readSettings(supabase),
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

  const name = profile.full_name ?? "Your name";
  const ratingCount = barberProfile?.rating_count ?? 0;
  const rating =
    ratingCount > 0 ? `★ ${Number(barberProfile?.rating_avg ?? 0).toFixed(1)} (${ratingCount})` : "No ratings yet";
  const jobs = `${jobCount ?? 0} job${jobCount === 1 ? "" : "s"}`;
  const verifiedLabel = verified
    ? barberProfile?.verified_at
      ? `Verified ${VERIFIED_ON.format(new Date(barberProfile.verified_at))}`
      : "Verified"
    : status === "needs_info"
      ? "More info needed"
      : status === "rejected"
        ? "Not verified"
        : "Verification pending";
  const cheapest = (services ?? [])[0]?.price;
  const isAvailable = barberProfile?.is_available ?? false;

  const editProps = {
    barberId: user.id,
    fullName: profile.full_name,
    phone: profile.phone,
    bio: barberProfile?.bio ?? null,
    yearsExperience: barberProfile?.years_experience ?? null,
    baseAddress: barberProfile?.base_address ?? null,
    serviceRadiusKm: barberProfile?.service_radius_km ?? null,
    maxMatchRadiusKm: settings.max_match_radius_km,
  };

  const position =
    barberProfile?.current_lat != null && barberProfile?.current_lng != null
      ? { lat: barberProfile.current_lat, lng: barberProfile.current_lng }
      : null;
  const availability = (id?: string) => (
    <AvailabilitySection
      id={id}
      barberId={user.id}
      isAvailable={isAvailable}
      verified={verified}
      balance={Number(barberProfile?.token_balance ?? 0)}
      minWallet={settings.min_wallet_to_go_online}
      radiusKm={barberProfile?.service_radius_km != null ? Number(barberProfile.service_radius_km) : null}
      maxMatchKm={settings.max_match_radius_km}
      baseAddress={barberProfile?.base_address ?? null}
      position={position}
    />
  );

  const verifiedPill = (
    <span
      className={cn(
        "inline-flex items-center gap-[5px] self-start rounded-full border px-[9px] py-1 text-[11.5px] font-bold whitespace-nowrap",
        verified ? "border-ok-border bg-ok text-ok-fg" : "border-line-strong text-muted-foreground",
      )}
    >
      {verified && <BadgeCheckIcon className="size-[11px]" strokeWidth={3} aria-hidden />}
      {verifiedLabel}
    </span>
  );

  const documents = !verified && (
    <div id="verification" className="scroll-mt-4 rounded-[14px]">
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
    </div>
  );

  return (
    <div className={cn("flex min-h-0 flex-1 flex-col lg:grid lg:grid-cols-[272px_minmax(0,1fr)_340px]", DOTTED_GROUND)}>
      {/* ——— Web: the section nav ——— */}
      <div className="hidden min-h-0 flex-col gap-[5px] overflow-y-auto border-r border-line-soft bg-white px-3.5 py-5 lg:flex">
        <div className="flex items-center gap-[11px] px-2 pb-3.5">
          <Photo src={profile.avatar_url} name={name} className="size-11" />
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="truncate text-[15px] font-bold">{name}</span>
            <span className="truncate text-[12.5px] text-faint">
              {rating.replace(/ \(\d+\)/, "")} · {jobs}
            </span>
          </div>
        </div>
        <ProfileSectionNav items={NAV} {...editProps} />
        <SignOutButton className="mt-auto border-t border-line-soft px-[13px] pt-3.5 text-left text-sm font-semibold text-primary">
          Sign out
        </SignOutButton>
      </div>

      {/* ——— The page ——— */}
      <div className="flex min-h-0 min-w-0 flex-col lg:overflow-y-auto">
        <div className="flex items-center justify-between border-b border-[#eee8db] bg-white px-[18px] pt-4 pb-3.5 lg:hidden">
          <h1 className="text-[22px] font-extrabold tracking-[-0.02em]">Profile</h1>
          <NotificationToggle boxed />
        </div>

        <div className="flex flex-col gap-3 px-4 py-3.5 pb-6 lg:gap-3 lg:px-6 lg:py-5">
          <h1 className="hidden text-2xl font-extrabold tracking-[-0.02em] lg:block">Profile &amp; portfolio</h1>

          <div
            id="profile"
            className="flex scroll-mt-4 items-center gap-[13px] rounded-[14px] border border-line bg-white p-[15px] lg:gap-3.5 lg:p-3.5"
          >
            <AvatarUpload
              badge
              userId={user.id}
              avatarUrl={profile.avatar_url}
              fallback={initials(profile.full_name)}
              photoClassName="size-[62px] lg:size-[58px]"
            />
            <div className="flex min-w-0 flex-1 flex-col gap-[5px]">
              <span className="truncate text-[17px] font-extrabold tracking-[-0.01em] lg:text-lg">{name}</span>
              <span className="text-[13px] text-[#6a635a] lg:text-[13.5px]">
                {rating} · {jobs}
                {barberProfile?.base_address && <span className="hidden lg:inline"> · {barberProfile.base_address}</span>}
              </span>
              {verifiedPill}
            </div>
            <EditProfileDialog
              {...editProps}
              trigger="Edit profile"
              triggerClassName="hidden rounded-[10px] border border-foreground px-[15px] py-[11px] text-sm font-bold transition-colors hover:bg-wash lg:block"
            />
          </div>

          {/* Phone: the bio card doubles as the way into editing */}
          <EditProfileDialog
            {...editProps}
            trigger={
              <span className="flex flex-col gap-1.5 text-left">
                <Caption>Bio</Caption>
                <span className="text-[13.5px] leading-[1.5] text-[#4c463d]">
                  {barberProfile?.bio || "Two or three lines, shown on your public profile."}
                </span>
                <span className="text-[13px] font-bold text-primary">Edit profile</span>
              </span>
            }
            triggerClassName="rounded-[14px] border border-line bg-white p-3.5 lg:hidden"
          />

          {documents}
          <ServiceManager services={services ?? []} />
          <PortfolioManager barberId={user.id} portfolio={portfolio ?? []} />
          <div className="lg:hidden">{availability()}</div>

          {verified && (
            <div
              id="verification"
              className="flex scroll-mt-4 flex-col gap-1.5 rounded-[14px] border border-line bg-white p-3.5"
            >
              <Caption>Verification</Caption>
              <p className="text-[13.5px] leading-[1.5] text-[#4c463d]">
                Your ID, selfie and permit were checked by an admin. That&apos;s what the Verified badge on your
                card means.
              </p>
            </div>
          )}

          <SignOutButton className="mt-1 rounded-[14px] border border-line bg-white p-3.5 text-left text-[14.5px] font-semibold text-primary lg:hidden">
            Sign out
          </SignOutButton>
        </div>
      </div>

      {/* ——— Web: your card as customers see it, and availability ——— */}
      <div className="hidden min-h-0 flex-col gap-[13px] overflow-y-auto border-l border-line-soft bg-white p-5 lg:flex">
        <div className="flex flex-col gap-3 rounded-[14px] bg-[#16130f] p-4 text-white">
          <span className="text-[11.5px] font-bold tracking-[0.1em] text-[#a49c90] uppercase">
            Your card, as customers see it
          </span>
          <div className="flex flex-col gap-[11px] rounded-[11px] bg-white p-[13px] text-foreground">
            <div className="flex items-start gap-[11px]">
              <Photo src={profile.avatar_url} name={name} square className="size-12 rounded-[11px]" />
              <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-[15px] font-bold">{name}</span>
                  <StatusPill tone={isAvailable ? "ok" : "quiet"} className="px-[7px] py-[3px] text-[10.5px]">
                    {isAvailable ? "Available" : "Offline"}
                  </StatusPill>
                </div>
                <span className="text-[12.5px] font-semibold">
                  {ratingCount > 0 ? (
                    <>
                      ★ {Number(barberProfile?.rating_avg ?? 0).toFixed(1)}{" "}
                      <span className="font-medium text-faint">({ratingCount})</span>
                    </>
                  ) : (
                    "New"
                  )}
                </span>
                <span className="text-[12.5px] text-[#6a635a]">
                  {isAvailable ? "Available now" : "Not taking jobs right now"}
                </span>
              </div>
            </div>
            <div className="flex gap-1.5">
              {[0, 1, 2].map((i) => {
                const item = (portfolio ?? [])[i];
                return item ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={item.id}
                    src={item.image_url}
                    alt=""
                    className="aspect-square min-w-0 flex-1 rounded-md border border-photo-border object-cover"
                  />
                ) : (
                  <span
                    key={i}
                    className="aspect-square flex-1 rounded-md border border-photo-border bg-photo"
                    aria-hidden
                  />
                );
              })}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#6a635a]">from</span>
              <span className="text-base font-extrabold">{cheapest != null ? `₱${cheapest}` : "—"}</span>
            </div>
          </div>
        </div>

        {availability("availability")}
      </div>
    </div>
  );
}
