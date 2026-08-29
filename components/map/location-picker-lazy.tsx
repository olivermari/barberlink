"use client";

import dynamic from "next/dynamic";

export const LocationPicker = dynamic(
  () => import("./location-picker").then((m) => m.LocationPicker),
  { ssr: false },
);
