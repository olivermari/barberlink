import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Lets the dev server serve its JS bundles when opened from another
  // device on the LAN (e.g. testing on a phone) instead of localhost.
  allowedDevOrigins: ["192.168.1.102"],
};

export default nextConfig;
