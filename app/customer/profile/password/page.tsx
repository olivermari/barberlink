import { ChangePasswordForm } from "@/components/customer/change-password-form";
import { SubPage } from "@/components/customer/sub-page";

export default function ChangePasswordPage() {
  return (
    <SubPage title="Change Password" intro="Choose a new password for your account.">
      <div className="rounded-[14px] border border-line bg-white p-4">
        <ChangePasswordForm />
      </div>
    </SubPage>
  );
}
