import Link from "next/link";
import { formatAgo } from "@/lib/format";
import { cn } from "@/lib/utils";
import { DisputeActions } from "@/components/admin/dispute-actions";

const CATEGORY_LABEL: Record<string, string> = {
  service_quality: "Service quality",
  no_show: "No-show",
  payment_issue: "Payment issue",
  other: "Other",
};

const STATUS_LABEL: Record<string, string> = {
  open: "OPEN",
  investigating: "INVESTIGATING",
  resolved: "REFUNDED",
  dismissed: "SIDED WITH BARBER",
};

export function DisputeRow({
  disputeId,
  bookingId,
  category,
  description,
  status,
  resolutionNotes,
  createdAt,
  now,
  reporterName,
  barberName,
  serviceName,
  bookingPrice,
  paymentMethod,
  bookingAddress,
}: {
  disputeId: string;
  bookingId: string;
  category: string | null;
  description: string | null;
  status: string;
  resolutionNotes: string | null;
  createdAt: string;
  now: number;
  reporterName: string;
  barberName: string | null;
  serviceName: string | null;
  bookingPrice: number | null;
  paymentMethod: string | null;
  bookingAddress: string | null;
}) {
  const open = status === "open" || status === "investigating";

  return (
    <article
      className={cn(
        "flex flex-col gap-2.5 rounded-lg p-4",
        open ? "border-2 border-primary" : "border-[1.5px] border-border",
      )}
    >
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-base font-bold">
          {CATEGORY_LABEL[category ?? ""] ?? category ?? "Report"}
        </h2>
        <span
          className={cn(
            "shrink-0 rounded-[3px] px-2 py-1 text-[11px] font-bold",
            open ? "border border-primary text-primary" : "border border-input text-muted-foreground",
          )}
        >
          {STATUS_LABEL[status] ?? status.toUpperCase()}
        </span>
      </div>
      <p className="text-[13px] text-muted-foreground">
        Reported by {reporterName} · {formatAgo(createdAt, now)}
      </p>
      <p className="text-sm text-muted-foreground">
        {serviceName ?? "Booking"}
        {barberName && ` with ${barberName}`}
        {bookingPrice != null && ` · ₱${bookingPrice}`}
        {bookingAddress && ` · ${bookingAddress}`}
        {" · "}
        <Link
          href={`/admin/bookings?tab=disputed&b=${bookingId}`}
          className="font-semibold text-primary hover:underline"
        >
          Open booking
        </Link>
      </p>
      <p className="text-sm">{description || "No description provided."}</p>
      <DisputeActions
        key={`${disputeId}-${status}`}
        disputeId={disputeId}
        status={status}
        initialNotes={resolutionNotes}
        paymentMethod={paymentMethod}
      />
    </article>
  );
}
