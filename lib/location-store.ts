"use client";

import { useSyncExternalStore } from "react";

// Where the customer wants the cut — the "Cutting at" bar on /customer
// (wireframe C1) and the booking sheet's address (C3) share this, so a
// pin set once carries through the whole booking. Kept in localStorage
// and synced across components and tabs.
export type CuttingLocation = {
  lat: number;
  lng: number;
  label: string | null;
};

const KEY = "b2g.cutting-at";
const listeners = new Set<() => void>();
let cache: CuttingLocation | null | undefined;

function read(): CuttingLocation | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return typeof parsed?.lat === "number" && typeof parsed?.lng === "number"
      ? { lat: parsed.lat, lng: parsed.lng, label: parsed.label ?? null }
      : null;
  } catch {
    return null;
  }
}

function getSnapshot() {
  if (cache === undefined) cache = read();
  return cache;
}

function getServerSnapshot() {
  return null;
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      cache = read();
      onChange();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onStorage);
  };
}

export function setCuttingLocation(location: CuttingLocation) {
  cache = location;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(location));
  } catch {
    // Private mode or storage full — the in-memory value still works
    // for this session.
  }
  listeners.forEach((l) => l());
}

export function useCuttingLocation() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
