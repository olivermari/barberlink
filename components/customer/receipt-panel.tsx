import Link from "next/link";
import { Caption, Photo } from "@/components/customer/ui";
import { DownloadReceiptButton, type ReceiptData } from "@/components/customer/download-receipt";
import { Button } from "@/components/ui/button";

export type ReceiptView = ReceiptData & {
  barberId: string;
  barberAvatarUrl: string | null;
  refunded: boolean;
  review: { rating: number; comment: string | null } | null;
};

// History's receipt (W4): what was booked, what it cost, the review that
// was left, and the two things to do next. On web it's the right rail; on
// phones it opens full-screen.
export function ReceiptPanel({
  receipt,
  reportSlot,
}: {
  receipt: ReceiptView;
  reportSlot: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-[13px]">
      <div className="flex items-center justify-between">
        <Caption>Receipt</Caption>
        <DownloadReceiptButton receipt={receipt} />
      </div>
      <div className="flex items-center gap-3">
        <Photo src={receipt.barberAvatarUrl} name={receipt.barberName} className="size-12" />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-base font-bold">{receipt.barberName}</span>
          <span className="text-[13px] text-[#6a635a]">{receipt.when}</span>
        </div>
      </div>
      <div className="h-px bg-line-soft" />
      <Row label={receipt.serviceName} value={`₱${receipt.servicePrice}`} />
      {receipt.chosenFee > 0 && <Row label="Chosen barber" value={`₱${receipt.chosenFee}`} />}
      <Row label="Paid with" value={receipt.method} />
      <div className="h-px bg-line-soft" />
      <div className="flex items-baseline justify-between">
        <span className="text-[15px] font-bold">Total</span>
        <span className="text-[26px] font-extrabold">₱{receipt.total}</span>
      </div>
      {receipt.review && (
        <div className="flex flex-col gap-2 rounded-xl border border-wash-border bg-wash p-[13px]">
          <span className="text-[13px] font-bold">Your review</span>
          <div className="text-[22px] tracking-[2px] text-primary" aria-label={`${receipt.review.rating} out of 5 stars`}>
            {"★".repeat(receipt.review.rating)}
            <span className="text-field">{"★".repeat(5 - receipt.review.rating)}</span>
          </div>
          {receipt.review.comment && (
            <span className="text-[13px] leading-[1.45] text-[#6a635a]">{receipt.review.comment}</span>
          )}
        </div>
      )}
      <div className="mt-auto flex flex-col gap-[9px] pt-1">
        <Button
          nativeButton={false}
          render={<Link href={`/customer/barbers/${receipt.barberId}`} />}
          className="h-auto rounded-[11px] p-3.5 text-[15px] font-bold"
        >
          Book again
        </Button>
        {reportSlot}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm text-[#4c463d]">
      <span>{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}
