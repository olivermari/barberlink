import Link from "next/link";
import Image from "next/image";
import { Instrument_Serif } from "next/font/google";
import { ArrowRightIcon, MapPinIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/brand/logo";
import { PhotoPlaceholder } from "@/components/landing/photo-placeholder";

// Archivo (the brand face) now loads in the root layout so the
// wordmark is identical app-wide. This serif is the landing page's own
// accent — nothing else in the app uses it.
const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: "italic",
  variable: "--font-instrument-serif",
});

const headline =
  "text-balance font-[family-name:var(--font-archivo)] font-black uppercase leading-[0.95] tracking-tight";
const eyebrow =
  "font-[family-name:var(--font-instrument-serif)] italic text-[var(--lp-ink-soft)]";

const BOOK_PILLS = [
  { label: "I need a haircut today", href: "/signup" },
  { label: "I want to pick my barber", href: "/signup" },
  { label: "I'm a barber — sign me up", href: "/signup?role=barber" },
];

const HOW_TO_BOOK = [
  {
    name: "Quick Match",
    body: "We assign the nearest available barber automatically — no fee, the fastest way to get a cut.",
  },
  {
    name: "Choose Your Barber",
    body: "Pick a specific barber from their portfolio and reviews — adds ₱50, and you'll queue if they're mid-job.",
  },
];

const PAYMENT_TABLE = [
  { label: "Quick Match", value: "No fee" },
  { label: "Choose Your Barber", value: "+₱50" },
  { label: "Cash", value: "On arrival" },
  { label: "GCash", value: "In-app" },
];

export default function Home() {
  return (
    <div
      className={`${instrumentSerif.variable} min-h-screen bg-[var(--lp-bg)] text-[var(--lp-ink)]`}
      style={
        {
          "--lp-bg": "#f2eee4",
          "--lp-bg-2": "#eae4d6",
          "--lp-ink": "#16130f",
          "--lp-ink-soft": "#5b564c",
          "--lp-line": "#ddd5c2",
        } as React.CSSProperties
      }
    >
      {/* Hero — full-bleed photo behind a dark tint, nav floating
          transparently on top, matching crispmtl.com's hero treatment.
          The intent-picker itself is borrowed from
          getsquire.com/find-a-barber's "why are you looking for a
          barber" flow — restyled as solid/glass blocks so the pills
          stay legible over the photo instead of fighting it. */}
      <section className="relative flex min-h-[85vh] flex-col overflow-hidden sm:min-h-[92vh]">
        <Image
          src="/images/hero-barber.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-[40%_25%]"
        />
        <div className="absolute inset-0 bg-[var(--lp-ink)]/60" />

        <header className="relative z-10 flex items-center justify-between gap-4 px-4 py-4 sm:px-8">
          <Logo size="md" className="text-[var(--lp-bg)]" />
          <div className="hidden items-center gap-1.5 text-xs text-[var(--lp-bg)]/80 sm:flex">
            <MapPinIcon className="size-3.5" aria-hidden="true" />
            Lipa City
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              className="h-10 px-3 text-[var(--lp-bg)] hover:bg-[var(--lp-bg)]/15 hover:text-[var(--lp-bg)]"
              nativeButton={false}
              render={<Link href="/login" />}
            >
              Log in
            </Button>
            <Button
              className="h-10 rounded-full bg-primary px-4 text-primary-foreground hover:bg-primary/90"
              nativeButton={false}
              render={<Link href="/signup" />}
            >
              Sign up
            </Button>
          </div>
        </header>

        <div className="relative z-10 mx-auto flex w-full max-w-4xl flex-1 flex-col items-center justify-center gap-8 px-4 py-12 text-center sm:px-8">
          <p className={`${eyebrow} text-lg text-[var(--lp-bg)]/85 sm:text-xl`}>
            Same-day · Lipa City
          </p>
          <h1 className={`${headline} text-4xl text-[var(--lp-bg)] sm:w-full sm:text-justify sm:text-6xl md:text-7xl`}>
            Tired of going to barbershops?
          </h1>
          <p className="max-w-lg text-balance text-base text-[var(--lp-bg)]/80 sm:text-lg">
            Tell us what you&apos;re after — we&apos;ll get you to the right
            barber, no appointment required.
          </p>

          <div className="flex w-full max-w-md flex-col gap-3">
            {BOOK_PILLS.map((pill, i) => (
              <Button
                key={pill.label}
                size="lg"
                className={
                  i === 0
                    ? "h-14 w-full justify-between rounded-full bg-primary px-6 text-base font-bold text-primary-foreground hover:bg-primary/90"
                    : "h-14 w-full justify-between rounded-full border border-[var(--lp-bg)]/30 bg-black/25 px-6 text-base font-semibold text-[var(--lp-bg)] backdrop-blur-sm hover:bg-black/35"
                }
                nativeButton={false}
                render={<Link href={pill.href} />}
              >
                {pill.label}
                <ArrowRightIcon className="size-4 shrink-0" aria-hidden="true" />
              </Button>
            ))}
          </div>

          <p className="text-sm text-[var(--lp-bg)]/75">
            Already booked before?{" "}
            <Link
              href="/login"
              className="font-medium text-[var(--lp-bg)] underline underline-offset-4"
            >
              Log in
            </Link>
          </p>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-[var(--lp-line)] px-4 py-16 sm:px-8 sm:py-24">
        <div className="mx-auto grid max-w-5xl gap-10 sm:grid-cols-2 sm:items-center sm:gap-16">
          <PhotoPlaceholder
            label="Barber at work — photo placeholder"
            className="aspect-4/5 w-full"
          />
          <div className="flex flex-col gap-4">
            <p className={eyebrow}>How it works</p>
            <h2 className={`${headline} text-4xl sm:text-5xl`}>
              0 appointments needed.
            </h2>
            <p className="text-base text-[var(--lp-ink-soft)] sm:text-lg">
              Barbero2Go is same-day, on demand — like calling a ride, but
              for a haircut. Open the app, tell us where you are, and a
              verified barber comes to your door.
            </p>
          </div>
        </div>
      </section>

      {/* Two ways to book */}
      <section className="border-t border-[var(--lp-line)] px-4 py-16 sm:px-8 sm:py-24">
        <div className="mx-auto max-w-3xl">
          <p className={eyebrow}>Two ways to book</p>
          <h2 className={`${headline} mt-2 text-4xl sm:text-5xl`}>
            One great cut, either way.
          </h2>

          <div className="mt-10 border-t border-[var(--lp-line)]">
            {HOW_TO_BOOK.map((item) => (
              <div
                key={item.name}
                className="flex flex-col gap-1 border-b border-[var(--lp-line)] py-6 sm:flex-row sm:items-baseline sm:justify-between sm:gap-8"
              >
                <h3
                  className={`${headline} text-2xl shrink-0 sm:text-3xl`}
                >
                  {item.name}
                </h3>
                <p className="text-[var(--lp-ink-soft)] sm:max-w-sm sm:text-right">
                  {item.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How you pay */}
      <section className="border-t border-[var(--lp-line)] px-4 py-16 sm:px-8 sm:py-24">
        <div className="mx-auto max-w-3xl">
          <p className={eyebrow}>How you pay</p>
          <h2 className={`${headline} mt-2 text-4xl sm:text-5xl`}>
            Cash or GCash. Your call.
          </h2>

          <div className="mt-10 grid grid-cols-2 gap-x-6 gap-y-8 border-t border-[var(--lp-line)] pt-8 sm:grid-cols-4">
            {PAYMENT_TABLE.map((row) => (
              <div key={row.label}>
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--lp-ink-soft)]">
                  {row.label}
                </p>
                <p
                  className={`${headline} mt-2 text-2xl tabular-nums normal-case`}
                >
                  {row.value}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Closing value banner — inverted, echoes Squire's dark
          value-prop band within an otherwise light page */}
      <section className="bg-[var(--lp-ink)] px-4 py-20 text-[var(--lp-bg)] sm:px-8 sm:py-28">
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-6 text-center">
          <h2 className={`${headline} text-4xl sm:text-5xl`}>
            Ready when you are.
          </h2>
          <p className="max-w-md text-[var(--lp-bg)]/70">
            Every barber on Barbero2Go is verified before they can accept a
            booking.
          </p>
          <Button
            size="lg"
            className="h-14 rounded-full bg-primary px-8 text-base font-bold text-primary-foreground hover:bg-primary/90"
            nativeButton={false}
            render={<Link href="/signup" />}
          >
            Book your first cut
          </Button>
        </div>
      </section>

      <footer className="border-t border-[var(--lp-line)] px-4 py-8 sm:px-8">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-3 text-center sm:flex-row sm:items-center sm:justify-between sm:text-left">
          <div>
            <Logo size="sm" />
            <p className="mt-2 text-sm text-[var(--lp-ink-soft)]">
              Door-to-door haircuts, on demand · Lipa City
            </p>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <Link
              href="/login"
              className="text-[var(--lp-ink-soft)] hover:text-[var(--lp-ink)]"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="text-[var(--lp-ink-soft)] hover:text-[var(--lp-ink)]"
            >
              Sign up
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
