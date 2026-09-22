import L from "leaflet";

// Marker language from the wireframes: barbers are ink pins and the
// customer's own position is a red dot — the only red on the map, so
// "where am I" never gets confused with "who's near me". Only import
// this from map modules that are loaded client-side (ssr: false).
export const BARBER_ICON = L.divIcon({
  className: "",
  html: `<div style="width:26px;height:26px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:#16130f;box-shadow:0 2px 4px rgba(22,19,15,.35)"></div>`,
  iconSize: [26, 26],
  // Rotating the square puts its sharp corner 18.4px below centre —
  // anchor on that point, not on the box.
  iconAnchor: [13, 31],
  popupAnchor: [0, -28],
});

export const YOU_ICON = L.divIcon({
  className: "",
  html: `<div style="box-sizing:border-box;width:20px;height:20px;border-radius:50%;background:#cf2417;border:3px solid #fff;box-shadow:0 1px 4px rgba(22,19,15,.4)"></div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
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

// Desktop search page (C7): a floating price/status pill on the map,
// the way Airbnb's map shows a nightly rate at each pin — here it's
// "what would this cost / how long would I wait" instead. Mobile keeps
// the plain BARBER_ICON dot; a text pill per barber is too much on a
// 390px screen with several nearby. `iconSize`/`iconAnchor` are left at
// [0,0] and the content centres itself via `transform`, since a pill's
// width varies with its label and Leaflet can't measure text up front.
export function barberPillIcon(label: string, highlighted = false) {
  const bg = highlighted ? "#16130f" : "#ffffff";
  const fg = highlighted ? "#ffffff" : "#16130f";
  const border = highlighted ? "#16130f" : "#cbc4b5";
  const safeLabel = label.replace(/</g, "&lt;");
  return L.divIcon({
    className: "",
    html: `<div style="transform:translate(-50%,-50%);white-space:nowrap;padding:6px 11px;border-radius:999px;background:${bg};color:${fg};border:1.5px solid ${border};font:700 12px/1 Archivo,sans-serif;box-shadow:0 2px 6px rgba(22,19,15,.28)">${safeLabel}</div>`,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
    popupAnchor: [0, -14],
  });
}
