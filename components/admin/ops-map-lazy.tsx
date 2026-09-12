"use client";

import dynamic from "next/dynamic";

export const OpsMap = dynamic(() => import("./ops-map").then((m) => m.OpsMap), {
  ssr: false,
});
