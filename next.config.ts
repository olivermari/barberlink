import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Lets the dev server serve its JS bundles when opened from another
  // device (LAN IP, or a Cloudflare/localtunnel quick-tunnel domain)
  // instead of localhost. Wildcards cover tunnel URLs that change on
  // every restart.
  allowedDevOrigins: [
    "192.168.1.102",
    "192.168.1.58",
    "*.trycloudflare.com",
    "*.loca.lt",
  ],
};

export default nextConfig;
