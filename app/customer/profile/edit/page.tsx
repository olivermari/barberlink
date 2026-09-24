import { requireProfile } from "@/lib/supabase/require-profile";
import { initials } from "@/lib/initials";
import { AvatarUpload } from "@/components/avatar-upload";
import { CustomerProfileForm } from "@/components/customer/customer-profile-form";
import { SubPage } from "@/components/customer/sub-page";

export default async function EditProfilePage() {
  const { user, profile } = await requireProfile();

  return (
    <SubPage title="Personal Information">
      <div className="rounded-[14px] border border-line bg-white p-4">
        <AvatarUpload userId={user.id} avatarUrl={profile.avatar_url} fallback={initials(profile.full_name)} />
      </div>
      <div className="rounded-[14px] border border-line bg-white p-4">
        <CustomerProfileForm
          customerId={user.id}
          fullName={profile.full_name}
          phone={profile.phone}
          email={user.email ?? ""}
        />
      </div>
    </SubPage>
  );
}
