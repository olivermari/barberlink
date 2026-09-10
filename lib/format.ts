// Pinned to Manila so the server render and the browser agree — the
// server's own timezone isn't the customer's.
const SHORT_DATE = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  timeZone: "Asia/Manila",
});

export function formatShortDate(iso: string) {
  return SHORT_DATE.format(new Date(iso));
}

export const PAYMENT_METHOD_LABEL: Record<string, string> = {
  cod: "Cash",
  gcash: "GCash",
  maya: "Maya",
  card: "Card",
  instapay: "InstaPay",
};
