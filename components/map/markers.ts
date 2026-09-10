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
