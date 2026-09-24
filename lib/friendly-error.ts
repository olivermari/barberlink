// Most error toasts in this app show a Postgrest/Postgres error's
// `.message` straight through. That's fine for our own `raise
// exception '...'` text — it's already written for a customer or
// barber to read (see the guard triggers in supabase/migrations) — but
// a genuine constraint violation, RLS denial, or network failure reads
// as database jargon nobody asked for. This catches jargon and swaps
// in a plain fallback; anything that doesn't match passes through
// untouched, so a hand-written exception message still reaches the
// user exactly as written.
const JARGON_PATTERNS: RegExp[] = [
  /duplicate key/i,
  /violates?\b.*constraint/i,
  /null value in column/i,
  /permission denied/i,
  /\bjwt\b/i,
  /PGRST\d/,
  /invalid input syntax/i,
  /relation "/i,
  /column "/i,
  /row-level security/i,
  /failed to fetch/i,
  /network\s?error/i,
  /fetch failed/i,
  /^\s*\{/, // a stray JSON blob leaking through
];

export function friendlyError(
  error: { message?: string | null } | string | null | undefined,
  fallback = "Something went wrong. Try again.",
): string {
  const raw = typeof error === "string" ? error : error?.message;
  const message = raw?.trim();
  if (!message) return fallback;
  return JARGON_PATTERNS.some((p) => p.test(message)) ? fallback : message;
}
