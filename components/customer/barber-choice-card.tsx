import Link from "next/link";
import { Photo, Rating, StatusPill, Tag } from "@/components/customer/ui";
import { Button } from "@/components/ui/button";
import { availabilityChip, availabilityLine, cheapestService, serviceTag, type NearBarber } from "@/lib/barber-match";
import { cn } from "@/lib/utils";

// One barber on Choose a Barber. On phones the whole card is the tap
// target into Booking Confirmation; on desktop it carries Book / Profile
// buttons and can be selected to fill the "Selected" rail.
export function BarberChoiceCard({
  barber,
  selected,
  onSelect,
}: {
  barber: NearBarber;
  selected?: boolean;
  onSelect?: () => void;
}) {
  const chip = availabilityChip(barber);
  const offline = !barber.isAvailable;
  const cheapest = cheapestService(barber);
  const bookHref = `/customer/book/${barber.id}?via=chosen`;

  return (
    <div
      onClick={onSelect}
      className={cn(
        "relative flex flex-col gap-[11px] rounded-[14px] border p-3.5 transition-colors lg:gap-3 lg:p-[15px]",
        offline ? "border-line-soft opacity-55" : "border-[#e5ded0]",
        selected && !offline && "lg:border-foreground",
      )}
    >
      {!offline && (
        <Link
          href={bookHref}
          aria-label={`Book ${barber.name}`}
          className="absolute inset-0 z-10 rounded-[14px] lg:hidden"
        />
      )}
      <div className="flex items-start gap-3">
        <Photo src={barber.avatarUrl} name={barber.name} square className="size-[54px]" />
        <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-base font-bold">{barber.name}</span>
            <StatusPill tone={chip.tone}>{chip.label}</StatusPill>
          </div>
          <Rating avg={barber.ratingAvg} count={barber.ratingCount} />
          <span className="text-[13px] text-[#6a635a]">{availabilityLine(barber)}</span>
        </div>
      </div>
      {!offline && cheapest && (
        <div className="flex items-center justify-between gap-2.5">
          <div className="flex flex-wrap gap-1.5">
            {barber.services.slice(0, 3).map((s) => (
              <Tag key={s.id}>{serviceTag(s.name)}</Tag>
            ))}
          </div>
          <span className="text-[17px] font-extrabold">₱{cheapest.price}</span>
        </div>
      )}
      {!offline && (
        <div className="relative z-20 hidden gap-[9px] lg:flex">
          <Button
            nativeButton={false}
            render={<Link href={bookHref} />}
            className="h-auto flex-1 rounded-[9px] p-[11px] text-sm font-bold"
          >
            Book
          </Button>
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href={`/customer/barbers/${barber.id}`} />}
            className="h-auto rounded-[9px] border border-foreground px-[15px] py-[11px] text-sm font-bold"
          >
            Profile
          </Button>
        </div>
      )}
    </div>
  );
}
