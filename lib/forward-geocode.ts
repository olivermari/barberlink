// Nominatim forward search for the "Search barbers or area…" field —
// same free service, same client-initiated-only rule as reverse-geocode.
// Biased to the Philippines so "Tambo" finds Tambo, Lipa rather than a
// street abroad.
export async function forwardGeocode(
  query: string,
): Promise<{ lat: number; lng: number; label: string } | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=ph&q=${encodeURIComponent(query)}`,
    );
    if (!res.ok) return null;
    const [hit] = await res.json();
    if (!hit) return null;
    const lat = Number(hit.lat);
    const lng = Number(hit.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng, label: String(hit.display_name ?? query) };
  } catch {
    return null;
  }
}
