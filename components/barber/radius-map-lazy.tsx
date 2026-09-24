"use client";

import dynamic from "next/dynamic";

export const RadiusMap = dynamic(() => import("./radius-map").then((m) => m.RadiusMap), {
  ssr: false,
});
