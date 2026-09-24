// Pinned to Manila so the server render and the browser agree — the
// server's own timezone isn't the customer's.
const TIME_ZONE = "Asia/Manila";

const SHORT_DATE = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  timeZone: TIME_ZONE,
});

const DATE_TIME = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone: TIME_ZONE,
});

const YMD = new Intl.DateTimeFormat("en-CA", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  timeZone: TIME_ZONE,
});

const TIME = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
  timeZone: TIME_ZONE,
});

const YEAR = new Intl.DateTimeFormat("en-US", { year: "numeric", timeZone: TIME_ZONE });

const MONTH_YEAR = new Intl.DateTimeFormat("en-US", {
  month: "long",
  year: "numeric",
  timeZone: TIME_ZONE,
});

export function formatShortDate(iso: string) {
  return SHORT_DATE.format(new Date(iso));
}

// "10:24 AM"
export function formatTime(iso: string) {
  return TIME.format(new Date(iso));
}

// A conversation row's time: "2:10 PM" today, "Yesterday", else "Sep 4".
// `now` is passed in so server renders stay pure.
export function formatThreadTime(iso: string, now: number) {
  const day = (ms: number) => YMD.format(new Date(ms));
  const at = new Date(iso).getTime();
  if (day(at) === day(now)) return TIME.format(new Date(at));
  if (day(at) === day(now - 86_400_000)) return "Yesterday";
  return SHORT_DATE.format(new Date(at));
}

// "Sep 4 · 10:24 AM" — a History row's date line.
export function formatDayTime(iso: string) {
  return `${SHORT_DATE.format(new Date(iso))} · ${TIME.format(new Date(iso))}`;
}

// The calendar year in Manila, e.g. 2026 — for "This year" totals.
export function manilaYear(iso: string) {
  return Number(YEAR.format(new Date(iso)));
}

// "September 2026" — groups History rows the way Airbnb groups Trips
// and Wishlists by when they happened.
export function formatMonthYear(iso: string) {
  return MONTH_YEAR.format(new Date(iso));
}

// "Sep 4, 14:20"
export function formatDateTime(iso: string) {
  return DATE_TIME.format(new Date(iso));
}

// "₱1,150"
export function formatPeso(amount: number) {
  return `₱${amount.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
}

// Kept out of component bodies so render stays pure.
export function nowMs() {
  return Date.now();
}

// Midnight in Manila, `daysBack` days ago, as an ISO timestamp.
export function manilaDayStart(daysBack = 0) {
  const ymd = YMD.format(new Date(nowMs() - daysBack * 86_400_000));
  return new Date(`${ymd}T00:00:00+08:00`).toISOString();
}

// "12m ago", "3h ago", "Yesterday", "4 days ago" — `now` is passed in
// so server renders stay pure.
export function formatAgo(iso: string, now: number) {
  const minutes = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 60_000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return days === 1 ? "Yesterday" : `${days} days ago`;
}

// "₱7.4k" for dashboard tiles.
export function formatPesoCompact(amount: number) {
  if (Math.abs(amount) < 1000) return formatPeso(Math.round(amount));
  return `₱${(amount / 1000).toFixed(Math.abs(amount) < 10_000 ? 1 : 0)}k`;
}

// "Tambo, Lipa" from a full address — the last two parts.
export function formatArea(address: string | null) {
  if (!address) return "—";
  return address
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(-2)
    .join(", ");
}

export const PAYMENT_METHOD_LABEL: Record<string, string> = {
  cod: "Cash",
  gcash: "GCash",
  maya: "Maya",
  card: "Card",
  instapay: "InstaPay",
};
