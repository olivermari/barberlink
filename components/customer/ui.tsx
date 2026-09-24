import Link from "next/link";
import { ChevronLeftIcon } from "lucide-react";
import { initials } from "@/lib/initials";
import { cn } from "@/lib/utils";

// Small pieces of the Customer UI design language, shared by every
// customer screen: 14px soft-bordered cards, wash-tinted segmented
// controls, status chips, photo slots and the mobile page headers.

export function Card({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("rounded-[14px] border border-line bg-background", className)} {...props} />;
}

// The small uppercase caption over a card's value ("SERVICE", "ADDRESS").
export function Caption({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      className={cn("text-xs font-bold tracking-[0.1em] text-muted-foreground uppercase", className)}
      {...props}
    />
  );
}

type Tone = "ok" | "bad" | "quiet";

const TONE: Record<Tone, string> = {
  ok: "border-ok-border bg-ok text-ok-fg",
  bad: "border-bad-border bg-bad text-bad-fg",
  quiet: "border-line-strong text-muted-foreground",
};

export function StatusPill({
  tone = "quiet",
  className,
  ...props
}: React.ComponentProps<"span"> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-1 text-[11px] font-bold whitespace-nowrap",
        TONE[tone],
        className,
      )}
      {...props}
    />
  );
}

// "Haircut" / "Fade" service tags on a barber card.
export function Tag({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      className={cn(
        "rounded-[7px] border border-wash-border bg-wash px-2.5 py-[5px] text-xs font-semibold",
        className,
      )}
      {...props}
    />
  );
}

// "★ 4.9 (142)" — or "New" for a barber nobody has rated yet.
export function Rating({
  avg,
  count,
  className,
}: {
  avg: number;
  count: number;
  className?: string;
}) {
  if (count <= 0) {
    return <span className={cn("text-[13px] font-semibold", className)}>New</span>;
  }
  return (
    <span className={cn("text-[13px] font-semibold", className)}>
      ★ {avg.toFixed(1)} <span className="font-medium text-muted-foreground">({count})</span>
    </span>
  );
}

// The design's grey "photo slot", filled with the real photo when there
// is one and the person's initials when there isn't.
export function Photo({
  src,
  name,
  className,
  square,
}: {
  src?: string | null;
  name?: string | null;
  className?: string;
  // Barber cards use a 12px-rounded square; people elsewhere are round.
  square?: boolean;
}) {
  return (
    <span
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden border border-photo-border bg-photo text-xs font-bold text-muted-foreground",
        square ? "rounded-xl" : "rounded-full",
        className,
      )}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={name ?? ""} className="size-full object-cover" />
      ) : (
        initials(name)
      )}
    </span>
  );
}

// The wash-tinted segmented control ("Nearby | Top Rated",
// "Completed | Upcoming | Cancelled"). Children are SegLink / SegButton.
export function Segmented({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      role="tablist"
      className={cn("flex gap-1 rounded-[11px] border border-wash-border bg-wash p-1", className)}
      {...props}
    />
  );
}

const SEG_BASE = "min-w-0 flex-1 rounded-lg px-3 py-2.5 text-center text-sm whitespace-nowrap transition-colors";
const SEG_ON = "bg-foreground font-bold text-background";
const SEG_OFF = "font-semibold text-ink-soft hover:text-foreground";

export function SegLink({
  active,
  className,
  ...props
}: React.ComponentProps<typeof Link> & { active?: boolean }) {
  return (
    <Link
      role="tab"
      aria-selected={active}
      className={cn(SEG_BASE, active ? SEG_ON : SEG_OFF, className)}
      {...props}
    />
  );
}

export function SegButton({
  active,
  className,
  ...props
}: React.ComponentProps<"button"> & { active?: boolean }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      className={cn(SEG_BASE, active ? SEG_ON : SEG_OFF, className)}
      {...props}
    />
  );
}

// Mobile sub-page header: "‹  Title" with an optional right-hand action.
export function MobileHeader({
  title,
  backHref,
  right,
  center,
  className,
}: {
  title: string;
  backHref?: string;
  right?: React.ReactNode;
  center?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-3 px-[18px] pt-2.5 pb-3.5 lg:hidden", className)}>
      {backHref && (
        <Link href={backHref} aria-label="Back" className="-ml-1.5 flex size-8 items-center justify-center">
          <ChevronLeftIcon className="size-6" aria-hidden />
        </Link>
      )}
      <h1 className={cn("flex-1 text-[17px] font-bold", center && "text-center", backHref && center && "pr-8")}>
        {title}
      </h1>
      {right}
    </div>
  );
}

// The 34px bordered icon button on mobile headers.
export const ICON_BUTTON =
  "flex size-[34px] shrink-0 items-center justify-center rounded-[9px] border border-field bg-background transition-colors hover:bg-wash";

// Primary / secondary action buttons at the design's sizes. Pair with
// <Button className={...}> so focus, disabled and press states stay.
export const PRIMARY_ACTION = "h-[52px] w-full rounded-xl text-base font-bold";
export const INK_OUTLINE_ACTION =
  "h-[50px] w-full rounded-xl border border-foreground bg-background text-[15px] font-bold hover:bg-wash";

// The design's dot-lattice grounds: cream for page bodies, a paler one
// for the side rails.
export const DOTTED_GROUND =
  "bg-wash [background-image:radial-gradient(#e2dbcb_1px,transparent_1.2px)] [background-size:15px_15px]";
export const DOTTED_RAIL =
  "bg-[#faf8f3] [background-image:radial-gradient(#ece5d5_1px,transparent_1.2px)] [background-size:15px_15px]";
