import Link from "next/link";
import { BanknoteIcon, SmartphoneIcon } from "lucide-react";
import { SettingsGroup, SettingsRow } from "@/components/customer/settings-ui";
import { SubPage } from "@/components/customer/sub-page";

// Nothing is stored here on purpose: cash is settled with the barber, and
// GCash is paid on PayMongo's own checkout, so no card or wallet details
// ever touch this app.
export default function PaymentMethodsPage() {
  return (
    <SubPage
      title="Payment Methods"
      intro="You choose how to pay on each booking. We never store your wallet or card details."
    >
      <SettingsGroup title="Accepted">
        <SettingsRow icon={BanknoteIcon} title="Cash on completion" sub="Pay your barber when the cut is done" />
        <SettingsRow icon={SmartphoneIcon} title="GCash" sub="Pay securely online when you book" />
      </SettingsGroup>
      <Link href="/customer/history" className="text-[13.5px] font-bold text-primary">
        See your receipts
      </Link>
    </SubPage>
  );
}
