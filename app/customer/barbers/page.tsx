"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { SearchIcon } from "lucide-react";
import { BarberChoiceCard } from "@/components/customer/barber-choice-card";
import { FiltersButton, NO_FILTERS, applyFilters, type BarberFilters } from "@/components/customer/filters-sheet";
import { MobileHeader, Photo, Segmented, SegButton } from "@/components/customer/ui";
import { Button } from "@/components/ui/button";
import { canBook, cheapestService, nearbyBarbers } from "@/lib/barber-match";
import { useCuttingLocation } from "@/lib/location-store";
import { CHOSEN_BARBER_SURCHARGE } from "@/lib/pricing";
import { useBarbers } from "@/lib/use-barbers";
import { useGeolocation } from "@/lib/use-geolocation";
import { useMatchRadius } from "@/lib/use-match-radius";

const BarberMap = dynamic(
  () => import("@/components/map/barber-map").then((m) => m.BarberMap),
  { ssr: false },
);

type Sort = "nearby" | "top";

// Customer UI "Choose a Barber" (mobile) and W1 (web): the list, with
// busy barbers keeping their queue depth and offline ones dimmed and
// unbookable. On web the cards go two-up beside a live map, and the
// running total with the ₱50 fee sits under the map, so the cost is
// settled before the next screen.
export default function ChooseBarberPage() {
  const stored = useCuttingLocation();
  const { coords: gps } = useGeolocation();
  const coords = stored ?? gps;
  const matchRadiusKm = useMatchRadius();
  const { barbers } = useBarbers();

  const [sort, setSort] = useState<Sort>("nearby");
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<BarberFilters>(NO_FILTERS);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = nearbyBarbers(barbers ?? [], coords, matchRadiusKm).filter(
      (b) => !q || b.name.toLowerCase().includes(q),
    );
    const filtered = applyFilters(base, filters);
    // Offline barbers always sink to the bottom, whatever the sort.
    return [...filtered].sort((a, b) => {
      if (a.isAvailable !== b.isAvailable) return a.isAvailable ? -1 : 1;
      if (sort === "top") {
        return b.ratingAvg - a.ratingAvg || b.ratingCount - a.ratingCount || a.distanceKm - b.distanceKm;
      }
      return a.distanceKm - b.distanceKm;
    });
  }, [barbers, coords, matchRadiusKm, query, filters, sort]);

  const bookable = list.filter(canBook);
  const selected = list.find((b) => b.id === selectedId && canBook(b)) ?? bookable[0] ?? null;
  const selectedService = selected ? cheapestService(selected) : null;

  const sortTabs = (
    <Segmented>
      <SegButton active={sort === "nearby"} onClick={() => setSort("nearby")} className="lg:px-4 lg:py-[9px]">
        Nearby
      </SegButton>
      <SegButton active={sort === "top"} onClick={() => setSort("top")} className="lg:px-4 lg:py-[9px]">
        Top Rated
      </SegButton>
    </Segmented>
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col lg:grid lg:grid-cols-[minmax(0,1fr)_400px]">
      {/* Phone header */}
      <MobileHeader
        title="Choose a Barber"
        backHref="/customer"
        right={
          <FiltersButton filters={filters} onChange={setFilters} count={list.length} />
        }
      />

      {/* List pane */}
      <div className="flex min-h-0 min-w-0 flex-col gap-4 px-[18px] pb-4 lg:overflow-y-auto lg:border-r lg:border-line-soft lg:px-6 lg:py-5">
        <div className="hidden items-center justify-between gap-4 lg:flex">
          <h1 className="text-2xl font-extrabold tracking-[-0.02em]">Choose a Barber</h1>
          <div className="flex items-center gap-2.5">
            {sortTabs}
            <FiltersButton
              filters={filters}
              onChange={setFilters}
              count={list.length}
              label="Filters"
              className="flex items-center gap-2 rounded-[10px] border border-field px-[13px] py-2.5 text-sm font-semibold"
            />
          </div>
        </div>
        <div className="lg:hidden">{sortTabs}</div>
        <label className="hidden items-center gap-[9px] rounded-[11px] border border-field px-3.5 py-3 lg:flex">
          <SearchIcon className="size-[18px] shrink-0" aria-hidden />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search barbers or area…"
            aria-label="Search barbers"
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-faint"
          />
        </label>

        {barbers === null ? (
          <p className="text-sm text-muted-foreground">Finding barbers near you…</p>
        ) : list.length === 0 ? (
          <div className="flex flex-col items-start gap-3 rounded-[14px] border border-line p-4">
            <p className="text-base font-bold">
              {barbers.length === 0 ? "No barbers yet" : `No barbers within ${matchRadiusKm} km`}
            </p>
            <p className="text-sm text-[#6a635a]">
              Move your pin or clear the filters, or try Quick Match.
            </p>
            <Button variant="outline" nativeButton={false} render={<Link href="/customer" />} className="rounded-[10px] border border-foreground font-bold">
              Back to the map
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 content-start gap-3 lg:grid-cols-2 lg:gap-3.5">
            {list.map((b) => (
              <BarberChoiceCard
                key={b.id}
                barber={b}
                selected={b.id === selected?.id}
                onSelect={() => canBook(b) && setSelectedId(b.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Web: map + selected barber */}
      <div className="hidden min-w-0 flex-col lg:flex">
        <div className="relative isolate min-h-0 flex-1 bg-[#ece8dd]">
          <div className="absolute inset-0 z-0">
            <BarberMap
              center={[coords.lat, coords.lng]}
              barbers={bookable.map((b) => ({
                id: b.id,
                fullName: b.name,
                distanceKm: b.distanceKm,
                lat: b.lat,
                lng: b.lng,
                avatarUrl: b.avatarUrl,
              }))}
              onSelectBarber={setSelectedId}
            />
          </div>
          <div className="absolute top-4 left-4 z-10 rounded-[9px] border border-field bg-white px-[13px] py-[9px] text-[13px] font-bold shadow-[0_4px_14px_rgba(22,19,15,0.07)]">
            {bookable.length} barber{bookable.length === 1 ? "" : "s"} within {matchRadiusKm} km
          </div>
        </div>
        <div className="flex flex-col gap-[11px] border-t border-line-soft px-5 py-4">
          <span className="text-xs font-bold tracking-[0.1em] text-faint uppercase">Selected</span>
          {selected && selectedService ? (
            <>
              <div className="flex items-center gap-3">
                <Photo src={selected.avatarUrl} name={selected.name} className="size-[46px]" />
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="truncate text-[15px] font-bold">{selected.name}</span>
                  <span className="text-[13px] text-[#6a635a]">
                    {selectedService.name} · {selectedService.duration_minutes} min · {selected.distanceKm.toFixed(1)} km
                  </span>
                </div>
                <span className="text-[17px] font-extrabold">₱{selectedService.price}</span>
              </div>
              <div className="flex justify-between text-[13px] text-[#6a635a]">
                <span>Chosen barber fee</span>
                <span>₱{CHOSEN_BARBER_SURCHARGE}</span>
              </div>
              <Button
                nativeButton={false}
                render={<Link href={`/customer/book/${selected.id}?via=chosen`} />}
                className="h-auto rounded-[11px] p-3.5 text-[15px] font-bold"
              >
                Continue · ₱{selectedService.price + CHOSEN_BARBER_SURCHARGE}
              </Button>
            </>
          ) : (
            <p className="text-sm text-[#6a635a]">Pick an available barber to see the total.</p>
          )}
        </div>
      </div>
    </div>
  );
}
