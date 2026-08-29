export class LocationRequiredError extends Error {}

// One-shot, mandatory GPS fix — unlike useGeolocation() (which silently
// falls back to a Manila default), this rejects if location isn't
// available so callers can block an action rather than use a stale/wrong fix.
export function getCurrentPosition(): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      reject(new LocationRequiredError("Location isn't available on this device."));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () =>
        reject(
          new LocationRequiredError(
            "Location access is required to go online. Enable GPS/location permissions and try again.",
          ),
        ),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  });
}
