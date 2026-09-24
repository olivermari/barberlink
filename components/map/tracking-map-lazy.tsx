"use client";

import dynamic from "next/dynamic";

export const TrackingMap = dynamic(
  () => import("./tracking-map").then((m) => m.TrackingMap),
  { ssr: false },
);
