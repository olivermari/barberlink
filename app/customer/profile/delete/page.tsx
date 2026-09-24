import { DeleteAccountForm } from "@/components/customer/delete-account-form";
import { SubPage } from "@/components/customer/sub-page";

export default function DeleteAccountPage() {
  return (
    <SubPage
      title="Delete Account"
      intro="This signs you out everywhere and removes your name, phone number and photo. Past bookings stay on your barbers' records without your details. It can't be undone."
    >
      <div className="rounded-[14px] border border-line bg-white p-4">
        <DeleteAccountForm />
      </div>
    </SubPage>
  );
}
