"use client";

import dynamic from "next/dynamic";

export const JobMap = dynamic(
  () => import("./job-map").then((m) => m.JobMap),
  { ssr: false },
);
