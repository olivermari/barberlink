import type { Metadata, Viewport } from "next";
import { Geist_Mono, Archivo } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "leaflet/dist/leaflet.css";
import "./globals.css";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// The brand face and the UI face in one: Archivo 400–700 for running
// text, 900 for the wordmark, display type and big numbers — the same
// pairing the Claude Design wireframes are drawn in.
const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
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
      className={`${geistMono.variable} ${archivo.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
