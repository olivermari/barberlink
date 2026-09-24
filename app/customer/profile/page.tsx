import Link from "next/link";
import {
  BadgeCheckIcon,
  CameraIcon,
  ChevronLeftIcon,
  InfoIcon,
  LifeBuoyIcon,
  LockIcon,
  ReceiptIcon,
  Trash2Icon,
  UserIcon,
  WalletIcon,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/supabase/require-profile";
import { Logo } from "@/components/brand/logo";
import { LocationRow, NotificationsRow } from "@/components/customer/preferences";
import { ProfileNav, SignOutButton } from "@/components/customer/profile-nav";
import { SavedBarbers, type SavedBarber } from "@/components/customer/saved-barbers";
import { SettingsGroup, SettingsRow } from "@/components/customer/settings-ui";
import { Caption, Photo } from "@/components/customer/ui";
import { Button } from "@/components/ui/button";

const DOTS =
  "bg-wash [background-image:radial-gradient(#e2dbcb_1px,transparent_1.2px)] [background-size:15px_15px]";

const MEMBER_SINCE = new Intl.DateTimeFormat("en-US", {
  month: "short",
  year: "numeric",
  timeZone: "Asia/Manila",
});

// Customer UI Settings (mobile) and W6 "Profile & settings" (web): on
// phones the sections stack on a tinted ground; on web they become a left
// nav, and the membership card and saved barbers move to the right rail.
export default async function CustomerProfilePage() {
  const { user, profile } = await requireProfile();
  const supabase = await createClient();

  const [{ data: me }, { count: bookingCount }, { data: savedRows }] = await Promise.all([
    supabase.from("profiles").select("created_at").eq("id", user.id).single(),
    supabase.from("bookings").select("id", { count: "exact", head: true }).eq("customer_id", user.id),
    supabase.from("saved_barbers").select("barber_id").eq("customer_id", user.id),
  ]);

  const savedIds = (savedRows ?? []).map((r) => r.barber_id);
  const [{ data: names }, { data: bps }, { data: dispatch }] = savedIds.length
    ? await Promise.all([
        supabase.from("profiles").select("id, full_name, avatar_url").in("id", savedIds),
        supabase
          .from("barber_profiles")
          .select("id, rating_avg, rating_count, current_lat, current_lng, is_available")
          .in("id", savedIds),
        supabase.rpc("barbers_dispatch_status", { target_barber_ids: savedIds }),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }];
  const nameById = new Map((names ?? []).map((n) => [n.id, n]));
  const dispatchById = new Map(
    ((dispatch ?? []) as { barber_id: string; is_busy: boolean; queued_count: number }[]).map((d) => [d.barber_id, d]),
  );
  const saved: SavedBarber[] = (bps ?? []).map((b) => ({
    id: b.id,
    name: nameById.get(b.id)?.full_name ?? "Barber",
    avatarUrl: nameById.get(b.id)?.avatar_url ?? null,
    ratingAvg: Number(b.rating_avg ?? 0),
    ratingCount: b.rating_count ?? 0,
    lat: b.current_lat,
    lng: b.current_lng,
    isAvailable: b.is_available,
    isBusy: dispatchById.get(b.id)?.is_busy ?? false,
    queuedCount: dispatchById.get(b.id)?.queued_count ?? 0,
  }));

  const name = profile.full_name ?? "Customer";
  const email = user.email ?? "";
  const verified = Boolean(user.email_confirmed_at);
  const memberSince = me?.created_at ? MEMBER_SINCE.format(new Date(me.created_at)) : "—";

  const account = (
    <SettingsGroup title="Account" id="account">
      <SettingsRow icon={UserIcon} title="Personal Information" sub="Name, email, phone number" href="/customer/profile/edit" />
      <SettingsRow icon={LockIcon} title="Change Password" sub="Update your password" href="/customer/profile/password" />
      <SettingsRow icon={Trash2Icon} title="Delete Account" sub="Permanently remove your account" href="/customer/profile/delete" danger />
    </SettingsGroup>
  );
  const preferences = (
    <SettingsGroup title="App Preferences" id="preferences">
      <NotificationsRow />
      <LocationRow />
    </SettingsGroup>
  );
  const payments = (
    <SettingsGroup title="Payments" id="payments">
      <SettingsRow icon={WalletIcon} title="Payment Methods" sub="Cash, GCash" href="/customer/profile/payments" />
      <SettingsRow icon={ReceiptIcon} title="Receipts" sub="Download past receipts" href="/customer/history" />
    </SettingsGroup>
  );
  const help = (
    <SettingsGroup title="Help & Support" id="help">
      <SettingsRow icon={LifeBuoyIcon} title="Booking updates" sub="What happened to your bookings" href="/customer/messages/support" />
    </SettingsGroup>
  );
  const about = (
    <SettingsGroup title="About" id="about">
      <SettingsRow icon={InfoIcon} title="About Barbero2Go" sub="Version 1.0.0" href="/customer/profile/about" />
    </SettingsGroup>
  );

  return (
    <div className={`flex min-h-0 flex-1 flex-col lg:grid lg:grid-cols-[272px_minmax(0,1fr)_340px] ${DOTS}`}>
      {/* Web: left nav */}
      <div className="hidden flex-col gap-[5px] border-r border-line-soft bg-white px-3.5 py-5 lg:flex">
        <div className="flex items-center gap-[11px] px-2 pb-3.5">
          <Photo src={profile.avatar_url} name={name} className="size-11" />
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="truncate text-[15px] font-bold">{name}</span>
            <span className="truncate text-[12.5px] text-faint">{email}</span>
          </div>
        </div>
        <ProfileNav />
        <SignOutButton className="mt-auto border-t border-line-soft px-[13px] pt-3.5 text-left text-sm font-semibold text-primary">
          Sign out
        </SignOutButton>
      </div>

      {/* Middle: phone header + the sections */}
      <div className="flex min-w-0 flex-col lg:overflow-y-auto">
        <div className="flex items-center gap-3 border-b border-line-soft bg-white px-4 pt-2.5 pb-3.5 lg:hidden">
          <Link href="/customer" aria-label="Back" className="-ml-1.5 flex size-8 items-center justify-center">
            <ChevronLeftIcon className="size-6" aria-hidden />
          </Link>
          <h1 className="flex-1 text-[17px] font-bold">Settings</h1>
        </div>
        <div className="flex flex-col gap-3 px-4 py-3.5 pb-6 lg:gap-3.5 lg:px-6 lg:py-[22px]">
          <h1 className="hidden text-2xl font-extrabold tracking-[-0.02em] lg:block">Profile &amp; settings</h1>

          {/* Phone: compact profile card */}
          <div className="flex items-center gap-3 rounded-[14px] border border-line bg-white p-[13px] lg:hidden">
            <Photo src={profile.avatar_url} name={name} className="size-[52px]" />
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="truncate text-base font-bold">{name}</span>
              <span className="truncate text-[13px] text-[#6a635a]">{email}</span>
            </div>
            <Link href="/customer/profile/edit" className="text-[13px] font-bold text-primary">
              Edit
            </Link>
          </div>

          {/* Web: the full profile card */}
          <div className="hidden items-center gap-3.5 rounded-[14px] border border-line bg-white p-4 lg:flex">
            <div className="relative shrink-0">
              <Photo src={profile.avatar_url} name={name} className="size-[66px]" />
              <Link
                href="/customer/profile/edit"
                aria-label="Change photo"
                className="absolute -right-0.5 -bottom-0.5 flex size-6 items-center justify-center rounded-full border-2 border-white bg-foreground text-white"
              >
                <CameraIcon className="size-3" aria-hidden />
              </Link>
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-[5px]">
              <span className="truncate text-lg font-extrabold tracking-[-0.01em]">{name}</span>
              <span className="truncate text-[13.5px] text-[#6a635a]">
                {email}
                {profile.phone ? ` · ${profile.phone}` : ""}
              </span>
              {verified && (
                <span className="inline-flex items-center gap-[5px] self-start rounded-full border border-ok-border bg-ok px-[9px] py-1 text-[11.5px] font-bold whitespace-nowrap text-ok-fg">
                  <BadgeCheckIcon className="size-3.5" aria-hidden />
                  Verified User
                </span>
              )}
            </div>
            <Button
              variant="outline"
              nativeButton={false}
              render={<Link href="/customer/profile/edit" />}
              className="h-auto rounded-[10px] border border-foreground px-[15px] py-[11px] text-sm font-bold"
            >
              Edit profile
            </Button>
          </div>

          {account}
          {preferences}
          {payments}
          <div className="lg:hidden">{about}</div>
          {/* Phone: saved barbers and sign out (web has them in the rail / nav) */}
          <section id="saved" className="scroll-mt-4 flex flex-col gap-2.5 lg:hidden">
            <h2 className="px-1 text-[13px] font-bold">Saved Barbers</h2>
            <SavedBarbers barbers={saved} />
          </section>
          <SignOutButton className="rounded-[14px] border border-line bg-white p-3.5 text-left text-[14.5px] font-semibold text-primary lg:hidden">
            Sign out
          </SignOutButton>
          <div className="hidden lg:block">{help}</div>
        </div>
      </div>

      {/* Web: rail — membership card, saved barbers, about */}
      <aside className="hidden flex-col gap-3.5 border-l border-line-soft bg-white px-5 py-[22px] lg:flex lg:overflow-y-auto">
        <div className="relative shrink-0 overflow-hidden rounded-[14px] bg-foreground text-white">
          <div className="absolute inset-y-0 right-0 w-[110px] bg-[#241f19]" aria-hidden />
          <div className="relative flex items-start justify-between px-4 pt-[15px]">
            <Logo className="text-base" />
            <div className="flex flex-col items-end gap-px">
              <span className="text-[11px] text-[#a49c90]">Member Since</span>
              <span className="text-sm font-bold">{memberSince}</span>
            </div>
          </div>
          <div className="relative mt-3 flex px-4 pt-3.5 pb-4">
            <div className="flex flex-1 flex-col gap-0.5 border-r border-[#3a342c]">
              <span className="text-[11.5px] text-[#a49c90]">Total Bookings</span>
              <span className="text-[22px] font-extrabold">{bookingCount ?? 0}</span>
            </div>
            <div className="flex flex-1 flex-col gap-0.5 pl-[18px]">
              <span className="text-[11.5px] text-[#a49c90]">Saved Barbers</span>
              <span className="text-[22px] font-extrabold">{saved.length}</span>
            </div>
          </div>
        </div>
        <section id="saved" className="scroll-mt-4 flex flex-col gap-3.5">
          <Caption>Saved barbers</Caption>
          <SavedBarbers barbers={saved} />
        </section>
        <section
          id="about"
          className="mt-auto scroll-mt-4 flex flex-col gap-1 rounded-xl border border-wash-border bg-wash p-[13px]"
        >
          <Link href="/customer/profile/about" className="text-[13px] font-bold">
            About Barbero2Go
          </Link>
          <span className="text-[12.5px] text-faint">Version 1.0.0</span>
        </section>
      </aside>
    </div>
  );
}
