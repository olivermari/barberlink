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

export function formatShortDate(iso: string) {
  return SHORT_DATE.format(new Date(iso));
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

export const PAYMENT_METHOD_LABEL: Record<string, string> = {
  cod: "Cash",
  gcash: "GCash",
  maya: "Maya",
  card: "Card",
  instapay: "InstaPay",
};
