// Nominatim (OpenStreetMap's free geocoder) — no API key, but keep calls
// occasional and client-initiated only; their usage policy caps this at
// ~1 request/sec and asks that you not hammer it from a server backend.
export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`,
    );
    if (!res.ok) return null;
    const data = await res.json();
    return typeof data.display_name === "string" ? data.display_name : null;
  } catch {
    return null;
  }
}
