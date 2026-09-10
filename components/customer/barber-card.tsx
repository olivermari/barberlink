"use client";

import Link from "next/link";
import { initials } from "@/lib/initials";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CHOSEN_BARBER_SURCHARGE } from "@/lib/pricing";
import type { BookableService } from "@/components/booking-dialog";

export type NearbyBarber = {
  id: string;
  name: string;
  avatarUrl: string | null;
  bio: string | null;
  lat: number;
  lng: number;
  serviceRadiusKm: number;
  ratingAvg: number;
  ratingCount: number;
  // Active services, cheapest first.
  services: BookableService[];
  photos: string[];
  photoCount: number;
  isBusy: boolean;
  queuedCount: number;
  distanceKm: number;
};

function metaLine(b: NearbyBarber) {
  const rating = b.ratingCount > 0 ? `★ ${b.ratingAvg.toFixed(1)} (${b.ratingCount})` : "New";
  return [rating, `${b.distanceKm.toFixed(1)} km`, !b.isBusy && "Free now"]
    .filter(Boolean)
    .join(" · ");
}

// Busy barbers stay visible with their queue depth (wireframe C2) —
// that's what makes queueing a choice rather than a surprise.
function StatusChip({ barber }: { barber: NearbyBarber }) {
  if (!barber.isBusy) return <Badge className="h-6 px-2">FREE</Badge>;
  return (
    <Badge variant="outline" className="h-6 px-2">
      {barber.queuedCount > 0 ? `${barber.queuedCount} IN QUEUE` : "BUSY"}
    </Badge>
  );
}

function BarberAvatar({ barber, className }: { barber: NearbyBarber; className: string }) {
  return (
    <Avatar className={className}>
      {barber.avatarUrl && <AvatarImage src={barber.avatarUrl} alt={barber.name} />}
      <AvatarFallback>{initials(barber.name)}</AvatarFallback>
    </Avatar>
  );
}

// Mobile barber sheet card (C2). Tapping a card expands it; the expanded
// card carries the bio, portfolio and the booking actions.
export function BarberCard({
  barber,
  expanded,
  onSelect,
  onBook,
}: {
  barber: NearbyBarber;
  expanded: boolean;
  onSelect: () => void;
  onBook: () => void;
}) {
  const cheapest = barber.services[0];

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-lg border-[1.5px] p-3.5",
        expanded ? "border-outline" : "border-border",
      )}
    >
      <button
        type="button"
        onClick={onSelect}
        aria-expanded={expanded}
        className="flex items-center gap-3 text-left"
      >
        <BarberAvatar barber={barber} className="size-[52px]" />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate text-[17px] font-bold">{barber.name}</span>
          <span className="text-sm text-muted-foreground">{metaLine(barber)}</span>
        </span>
        <StatusChip barber={barber} />
      </button>

      {expanded && (
        <>
          {barber.bio && (
            <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
              {barber.bio}
            </p>
          )}
          {barber.photos.length > 0 && (
            <div className="flex gap-1.5">
              {barber.photos.slice(0, 3).map((src) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={src}
                  src={src}
                  alt=""
                  className="size-16 rounded-[4px] border border-input object-cover"
                />
              ))}
              {barber.photoCount > 3 && (
                <div className="flex h-16 flex-1 items-center justify-center rounded-[4px] border border-input bg-placeholder text-[13px] text-faint">
                  +{barber.photoCount - 3}
                </div>
              )}
            </div>
          )}
          <div className="flex gap-2">
            <Button
              className="h-12 flex-1 text-[15px]"
              onClick={onBook}
              disabled={!cheapest}
            >
              {cheapest
                ? `Book · ₱${cheapest.price} + ₱${CHOSEN_BARBER_SURCHARGE}`
                : "No services yet"}
            </Button>
            <Button
              variant="outline"
              className="h-12 text-[15px]"
              nativeButton={false}
              render={<Link href={`/customer/barbers/${barber.id}`} />}
            >
              Profile
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

// Web left-rail row (C7): compact, with a direct Book for free barbers.
export function BarberRailItem({
  barber,
  onBook,
}: {
  barber: NearbyBarber;
  onBook: () => void;
}) {
  const cheapest = barber.services[0];
  const canBookNow = !barber.isBusy && cheapest;

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg border-[1.5px] p-3",
        canBookNow ? "border-outline" : "border-border",
      )}
    >
      <BarberAvatar barber={barber} className="size-12" />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <Link
          href={`/customer/barbers/${barber.id}`}
          className="truncate text-base font-bold hover:underline"
        >
          {barber.name}
        </Link>
        <span className="truncate text-[13px] text-muted-foreground">
          {metaLine(barber)}
        </span>
      </div>
      {canBookNow ? (
        <Button size="sm" className="h-9 px-3.5" onClick={onBook}>
          Book
        </Button>
      ) : (
        <StatusChip barber={barber} />
      )}
    </div>
  );
}
