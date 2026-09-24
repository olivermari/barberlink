import type { Metadata, Viewport } from "next";
import { Geist_Mono, Archivo_Black, Plus_Jakarta_Sans } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "leaflet/dist/leaflet.css";
import "./globals.css";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// The UI face from the Customer UI design: geometric enough to feel like
// a consumer app, with a tall x-height that holds up at 11–12px in tab
// bars and table rows.
const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

// Archivo Black — the wordmark face (components/brand/logo.tsx).
const archivo = Archivo_Black({
  variable: "--font-archivo",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  title: "Barbero2Go",
  description: "Door-to-door haircuts, on demand.",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Barbero2Go" },
};

export const viewport: Viewport = {
  themeColor: "#cf2417",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${geistMono.variable} ${archivo.variable} ${jakarta.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        {/* Top, not bottom: the bottom of the screen is where the primary
            action lives on every phone screen (Quick Match, Complete job,
            the tab bar) — a bottom toast covers exactly what a user needs
            to tap next. */}
        <Toaster position="top-center" />
      </body>
    </html>
  );
}
