"use client";

import { useSyncExternalStore } from "react";

const noop = () => () => {};

// SSR-safe: the server (and the client's very first paint) always sees
// `false`, the same trick LocationBar uses for its own client-only
// state — the real value arrives on the client-only re-render right
// after mount, so hydration never mismatches.
export function useMediaQuery(query: string) {
  return useSyncExternalStore(
    (onChange) => {
      if (typeof window === "undefined") return noop();
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    () => (typeof window === "undefined" ? false : window.matchMedia(query).matches),
    () => false,
  );
}
