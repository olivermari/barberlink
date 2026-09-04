import { requireProfile } from "@/lib/supabase/require-profile";
import { CustomerProfileForm } from "@/components/customer/customer-profile-form";
import { AvatarUpload } from "@/components/avatar-upload";
import { initials } from "@/lib/initials";

export default async function CustomerProfilePage() {
  const { user, profile } = await requireProfile();

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-4 sm:p-6">
      <h1 className="text-2xl font-semibold">Profile</h1>

      <AvatarUpload
        userId={user.id}
        avatarUrl={profile.avatar_url}
        fallback={initials(profile.full_name)}
      />

      <CustomerProfileForm
        customerId={user.id}
        fullName={profile.full_name}
        phone={profile.phone}
      />
    </div>
  );
}
