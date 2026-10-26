// Added on top of the service price when a customer picks a specific
// barber instead of Quick Match. Lives outside "use client" modules so
// server components can read it too.
export const CHOSEN_BARBER_SURCHARGE = 50;

// Defaults for platform_settings distance_free_km / distance_fee_per_km
// (0028) until the live values load.
export const DEFAULT_DISTANCE_FREE_KM = 0;
export const DEFAULT_DISTANCE_FEE_PER_KM = 10;

// Only the distance past `freeKm` is charged, prorated to the peso. With no
// free zone (the default) a barber 4.2 km away at ₱10/km costs ₱42.
export function distanceFee(km: number, { freeKm, perKm }: { freeKm: number; perKm: number }) {
  return Math.round(Math.max(0, km - freeKm) * perKm);
}
