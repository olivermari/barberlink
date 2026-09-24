"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { SearchIcon, ShieldIcon, ZapIcon } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { LocationBar } from "@/components/customer/location-bar";
import { FiltersButton, NO_FILTERS, applyFilters, type BarberFilters } from "@/components/customer/filters-sheet";
import { PinnedTrackCard } from "@/components/customer/pinned-track-card";
import { Segmented, SegLink } from "@/components/customer/ui";
import { Button } from "@/components/ui/button";
import { nearbyBarbers, pickQuickMatch } from "@/lib/barber-match";
import { forwardGeocode } from "@/lib/forward-geocode";
import { setCuttingLocation, useCuttingLocation } from "@/lib/location-store";
import { CHOSEN_BARBER_SURCHARGE } from "@/lib/pricing";
import { useBarbers } from "@/lib/use-barbers";
import { useGeolocation } from "@/lib/use-geolocation";
import { useMatchRadius } from "@/lib/use-match-radius";

const BarberMap = dynamic(
  () => import("@/components/map/barber-map").then((m) => m.BarberMap),
  { ssr: false },
);

export default function CustomerHomePage() {
  return (
    <Suspense>
      <CustomerHome />
    </Suspense>
  );
}

// Customer UI "Book · map discovery" (mobile) and the desktop shell's
// map + Quick Match panel: the two dispatch paths one tap apart, with the
// +₱50 on the card, not behind it.
function CustomerHome() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const stored = useCuttingLocation();
  const { coords: gps, status } = useGeolocation();
  const coords = stored ?? gps;
  const matchRadiusKm = useMatchRadius();
  const { barbers } = useBarbers();

  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<BarberFilters>(NO_FILTERS);
  const [matching, setMatching] = useState(false);

  const near = useMemo(
    () => nearbyBarbers(barbers ?? [], coords, matchRadiusKm),
    [barbers, coords, matchRadiusKm],
  );
  // Offline barbers stay off the map (they can't be booked) but show up,
  // dimmed, on Choose a Barber.
  const pins = useMemo(() => {
    const q = query.trim().toLowerCase();
    return applyFilters(
      near.filter((b) => b.isAvailable && (!q || b.name.toLowerCase().includes(q))),
      filters,
    );
  }, [near, query, filters]);

  // `?match=1` (from "Quick Match instead" / "Quick Match again") runs a
  // Quick Match as soon as barbers load; `?exclude=` skips barbers who
  // just declined or didn't answer.
  const autoMatchRef = useRef(searchParams.get("match") === "1");
  const excludeRef = useRef(
    new Set((searchParams.get("exclude") ?? "").split(",").filter(Boolean)),
  );

  function quickMatch() {
    if (barbers === null) return;
    setMatching(true);
    const pick = pickQuickMatch(near, excludeRef.current);
    if (!pick) {
      setMatching(false);
      toast.error(
        near.length === 0
          ? `No barbers are online within ${matchRadiusKm} km of you right now.`
          : "No barbers are taking bookings right now. Try again in a bit.",
      );
      return;
    }
    router.push(`/customer/book/${pick.id}?via=quick`);
  }

  useEffect(() => {
    if (barbers !== null && autoMatchRef.current) {
      autoMatchRef.current = false;
      router.replace("/customer");
      quickMatch();
    }
    // Runs once, when the first batch of barbers lands.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [barbers]);

  // Enter in the search box: if it names no barber, treat it as an area
  // and move the pin there ("Search barbers or area…").
  async function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q || pins.length > 0) return;
    const hit = await forwardGeocode(q);
    if (!hit) {
      toast.error(`Couldn't find “${q}”. Try a barangay or street name.`);
      return;
    }
    setCuttingLocation({ lat: hit.lat, lng: hit.lng, label: hit.label });
    setQuery("");
  }

  const fallbackLabel =
    status === "granted"
      ? "your current location"
      : status === "locating"
        ? "finding your location…"
        : "Lipa City (location is off)";

  const searchField = (
    <form onSubmit={submitSearch} className="min-w-0 flex-1">
      <div className="flex items-center gap-[9px] rounded-[11px] border border-field bg-white px-3.5 py-3 lg:rounded-[10px] lg:py-[11px] lg:shadow-[0_4px_14px_rgba(22,19,15,0.07)]">
        <SearchIcon className="size-[18px] shrink-0 text-foreground" aria-hidden />
        <input
          aria-label="Search barbers or area"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search barbers or area…"
          className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-faint"
        />
      </div>
    </form>
  );

  const filterBtn = (
    <FiltersButton
      filters={filters}
      onChange={setFilters}
      count={pins.length}
      className="lg:h-auto lg:w-11 lg:rounded-[10px] lg:shadow-[0_4px_14px_rgba(22,19,15,0.07)]"
    />
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col lg:grid lg:grid-cols-[minmax(0,1fr)_386px] lg:gap-5 lg:px-6 lg:py-5">
      {/* Phone header + search */}
      <div className="flex items-center justify-between px-[18px] pt-2.5 pb-3.5 lg:hidden">
        <Link href="/customer" className="text-foreground">
          <Logo className="text-[18px]" />
        </Link>
        {filterBtn}
      </div>
      <div className="flex px-[18px] pb-3 lg:hidden">{searchField}</div>

      {/* Map */}
      <div className="relative isolate min-h-[260px] flex-1 overflow-hidden bg-[#ece8dd] lg:min-h-0 lg:rounded-[14px] lg:border lg:border-[#e5ded0]">
        <div className="absolute inset-0 z-0">
          <BarberMap
            center={[coords.lat, coords.lng]}
            barbers={pins.map((b) => ({
              id: b.id,
              fullName: b.name,
              distanceKm: b.distanceKm,
              lat: b.lat,
              lng: b.lng,
              avatarUrl: b.avatarUrl,
            }))}
          />
        </div>
        <div className="absolute inset-x-4 top-4 z-10 hidden gap-2.5 lg:flex">
          {searchField}
          {filterBtn}
        </div>
        <div className="absolute top-3 left-3 z-10 max-w-[calc(100%-1.5rem)] lg:top-[68px] lg:left-4 lg:max-w-[320px]">
          <LocationBar fallback={gps} fallbackLabel={fallbackLabel} />
        </div>
      </div>

      {/* Phone: the two ways to book */}
      <div className="flex flex-col gap-[11px] bg-white px-[18px] pt-3.5 lg:hidden">
        <div className="flex flex-col gap-[11px] rounded-[14px] border border-line p-[15px] shadow-[0_-6px_20px_rgba(22,19,15,0.04)]">
          <div className="flex items-center gap-2.5">
            <ZapIcon className="size-5 shrink-0 text-primary" aria-hidden />
            <div className="flex flex-1 flex-col gap-0.5">
              <span className="text-[15px] font-bold">Quick Match</span>
              <span className="text-[13px] leading-[1.45] text-[#6a635a]">
                Nearest available barber. If everyone&apos;s busy, we&apos;ll put you in a queue.
              </span>
            </div>
            <span className="text-[17px] text-[#a49c90]" aria-hidden>
              ›
            </span>
          </div>
          <Button className="h-[50px] w-full rounded-[10px] text-[15px] font-bold" onClick={quickMatch} disabled={matching || barbers === null}>
            {matching ? "Finding your barber…" : "Find Nearest Available"}
          </Button>
        </div>
        <Link
          href="/customer/barbers"
          className="flex items-center gap-2.5 rounded-[14px] border border-line p-3.5 transition-colors hover:bg-wash"
        >
          <ShieldIcon className="size-5 shrink-0" aria-hidden />
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="text-[15px] font-bold">Or choose a barber · +₱{CHOSEN_BARBER_SURCHARGE}</span>
            <span className="text-[13px] leading-[1.45] text-[#6a635a]">
              Browse barbers, check ratings, and pick your preferred one.
            </span>
          </span>
          <span className="text-[17px] text-[#a49c90]" aria-hidden>
            ›
          </span>
        </Link>
      </div>

      {/* Desktop: right panel */}
      <div className="hidden min-h-0 min-w-0 flex-col gap-3.5 lg:flex">
        <Segmented>
          <SegLink href="/customer" active className="rounded-lg p-[11px] font-bold">
            Quick Match
          </SegLink>
          <SegLink href="/customer/barbers" className="rounded-lg p-[11px]">
            Choose a Barber
          </SegLink>
        </Segmented>
        <div className="flex flex-col gap-[11px] rounded-[14px] border border-[#e5ded0] p-[18px]">
          <div className="flex items-center gap-2.5">
            <ZapIcon className="size-5 text-primary" aria-hidden />
            <span className="text-base font-bold">Quick Match</span>
          </div>
          <p className="text-sm leading-[1.55] text-[#4c463d]">
            Find the nearest available barber. If everyone&apos;s busy, we&apos;ll put you in a queue.
          </p>
          <Button className="h-[47px] w-full rounded-[10px] text-[15px] font-bold" onClick={quickMatch} disabled={matching || barbers === null}>
            {matching ? "Finding your barber…" : "Find Nearest Available"}
          </Button>
        </div>
        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-[#eae3d5]" />
          <span className="text-xs font-semibold tracking-[0.1em] text-faint">OR</span>
          <div className="h-px flex-1 bg-[#eae3d5]" />
        </div>
        <div className="flex flex-col gap-[11px] rounded-[14px] border border-[#e5ded0] p-[18px]">
          <div className="flex items-center gap-2.5">
            <ShieldIcon className="size-5" aria-hidden />
            <span className="text-base font-bold">Choose a Barber</span>
          </div>
          <p className="text-sm leading-[1.55] text-[#4c463d]">
            Browse barbers, check ratings, and pick your preferred one. Adds ₱{CHOSEN_BARBER_SURCHARGE}.
          </p>
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href="/customer/barbers" />}
            className="h-[46px] w-full rounded-[10px] border border-foreground text-[15px] font-bold"
          >
            View Barbers
          </Button>
        </div>
        <PinnedTrackCard />
      </div>
    </div>
  );
}
