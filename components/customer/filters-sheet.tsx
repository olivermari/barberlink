"use client";

import { SlidersHorizontalIcon } from "lucide-react";
import { ICON_BUTTON } from "@/components/customer/ui";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export type BarberFilters = { freeOnly: boolean; topRated: boolean };
export const NO_FILTERS: BarberFilters = { freeOnly: false, topRated: false };

export function applyFilters<T extends { isAvailable: boolean; isBusy: boolean; ratingAvg: number }>(
  list: T[],
  f: BarberFilters,
) {
  return list.filter(
    (b) => (!f.freeOnly || (b.isAvailable && !b.isBusy)) && (!f.topRated || b.ratingAvg >= 4.5),
  );
}

// The design's filter button (sliders icon) and what it opens: two real
// filters over the barbers the customer is looking at.
export function FiltersButton({
  filters,
  onChange,
  count,
  className,
  label,
}: {
  filters: BarberFilters;
  onChange: (next: BarberFilters) => void;
  // How many barbers the current filters leave.
  count: number;
  className?: string;
  // Desktop's "Filters" pill shows a text label beside the icon.
  label?: string;
}) {
  const active = Number(filters.freeOnly) + Number(filters.topRated);
  return (
    <Dialog>
      <DialogTrigger
        aria-label="Filters"
        className={cn(label ? "relative" : ICON_BUTTON, "relative", className)}
      >
        <SlidersHorizontalIcon className="size-[18px]" aria-hidden />
        {label}
        {active > 0 && (
          <span className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
            {active}
          </span>
        )}
      </DialogTrigger>
      <DialogContent className="flex flex-col gap-4 rounded-[14px] border border-line p-5 ring-0 sm:max-w-sm">
        <div className="flex flex-col gap-1">
          <DialogTitle className="text-xl font-extrabold tracking-[-0.02em]">Filters</DialogTitle>
          <DialogDescription>Narrow the barbers on the map and in the list.</DialogDescription>
        </div>
        <div className="flex flex-col gap-2.5">
          <Toggle
            on={filters.freeOnly}
            onClick={() => onChange({ ...filters, freeOnly: !filters.freeOnly })}
            title="Free now"
            hint="Only barbers who can start right away"
          />
          <Toggle
            on={filters.topRated}
            onClick={() => onChange({ ...filters, topRated: !filters.topRated })}
            title="Top rated"
            hint="★ 4.5 and up"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="h-12 flex-1 rounded-xl border-foreground text-[15px] font-bold"
            onClick={() => onChange(NO_FILTERS)}
            disabled={active === 0}
          >
            Clear
          </Button>
          <DialogClose render={<Button className="h-12 flex-[2] rounded-xl text-[15px] font-bold" />}>
            Show {count} barber{count === 1 ? "" : "s"}
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Toggle({
  on,
  onClick,
  title,
  hint,
}: {
  on: boolean;
  onClick: () => void;
  title: string;
  hint: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={onClick}
      className="flex items-center gap-3 rounded-[14px] border border-line p-3.5 text-left transition-colors hover:bg-wash"
    >
      <span className="flex flex-1 flex-col gap-0.5">
        <span className="text-[15px] font-bold">{title}</span>
        <span className="text-[13px] text-muted-foreground">{hint}</span>
      </span>
      <span
        className={cn(
          "flex h-6 w-[42px] shrink-0 items-center rounded-xl p-0.5 transition-colors",
          on ? "justify-end bg-primary" : "justify-start bg-line",
        )}
        aria-hidden
      >
        <span className="size-5 rounded-full bg-white" />
      </span>
    </button>
  );
}
