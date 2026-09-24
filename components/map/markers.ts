import L from "leaflet";

// Marker language from the Customer UI design: barbers are ink teardrop
// pins with a photo circle in the eye, and the customer's own position is
// a red dot in soft concentric rings — the only red on the map, so "where
// am I" never gets confused with "who's near me". Only import this from
// map modules that are loaded client-side (ssr: false).

const PIN_STYLE =
  "width:32px;height:32px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:#16130f;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 4px rgba(22,19,15,.3)";
const EYE_STYLE =
  "width:20px;height:20px;border-radius:50%;background:#e4dfd3;border:1px solid #cbc4b5;transform:rotate(45deg);overflow:hidden";

// A barber pin; when the barber has a photo it fills the eye. `url` is
// attribute-escaped — it comes from the database.
export function barberPinIcon(avatarUrl?: string | null) {
  const safe = avatarUrl ? avatarUrl.replace(/["<>]/g, "") : "";
  const eye = safe
    ? `<div style="${EYE_STYLE};background:url('${safe}') center/cover"></div>`
    : `<div style="${EYE_STYLE}"></div>`;
  return L.divIcon({
    className: "",
    html: `<div style="${PIN_STYLE}">${eye}</div>`,
    iconSize: [32, 32],
    // Rotating the square puts its sharp corner ~18px below centre —
    // anchor on that point, not on the box.
    iconAnchor: [16, 34],
    popupAnchor: [0, -30],
  });
}

export const BARBER_ICON = barberPinIcon();

// The customer's chosen spot on the booking screens: a plain red teardrop.
export const SPOT_ICON = L.divIcon({
  className: "",
  html: `<div style="width:26px;height:26px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:#cf2417;box-shadow:0 2px 4px rgba(22,19,15,.3)"></div>`,
  iconSize: [26, 26],
  iconAnchor: [13, 30],
  popupAnchor: [0, -28],
});

export const YOU_ICON = L.divIcon({
  className: "",
  html: `<div style="box-sizing:border-box;width:18px;height:18px;border-radius:50%;background:#cf2417;border:4px solid #fff;box-shadow:0 0 0 7px rgba(207,36,23,.16),0 0 0 46px rgba(207,36,23,.07),0 0 0 82px rgba(207,36,23,.045)"></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
  popupAnchor: [0, -10],
});

// The tracking map's moving barber, distinct from the stationary
// teardrop BARBER_ICON used in browse contexts — a heading-aware shape
// reads as "a vehicle in motion", which is the point of animating it at
// all. Callers should round headingDeg (e.g. to the nearest 5°) before
// calling this: react-leaflet rebuilds a marker's icon whenever the
// `icon` prop's identity changes, and a fresh divIcon every animation
// frame would mean rebuilding it dozens of times a second.
export function barberVehicleIcon(headingDeg: number) {
  return L.divIcon({
    className: "",
    html: `<div style="width:26px;height:26px;transform:rotate(${headingDeg}deg)">
      <svg width="26" height="26" viewBox="0 0 26 26" style="filter:drop-shadow(0 2px 3px rgba(22,19,15,.35))">
        <path d="M13 2 L22 22 L13 17.5 L4 22 Z" fill="#16130f" />
      </svg>
    </div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
    popupAnchor: [0, -14],
  });
}
