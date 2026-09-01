import Link from "next/link";
import { Archivo, Instrument_Serif } from "next/font/google";
import { ArrowRightIcon, MapPinIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PhotoPlaceholder } from "@/components/landing/photo-placeholder";

// Scoped to this page only — the rest of the app stays on Geist Sans
// and the shared grayscale tokens (app/globals.css) until Phase 9
// (visual design system) formally picks a palette.
const archivo = Archivo({
  subsets: ["latin"],
  weight: ["800", "900"],
  variable: "--font-archivo",
});

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
      className={`${archivo.variable} ${instrumentSerif.variable} min-h-screen bg-[var(--lp-bg)] text-[var(--lp-ink)]`}
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
      <header className="flex items-center justify-between gap-4 border-b border-[var(--lp-line)] px-4 py-4 sm:px-8">
        <span
          className={`${headline} text-lg leading-none normal-case tracking-tight`}
        >
          Barbero2Go
        </span>
        <div className="hidden items-center gap-1.5 text-xs text-[var(--lp-ink-soft)] sm:flex">
          <MapPinIcon className="size-3.5" aria-hidden="true" />
          Lipa City
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            className="h-10 px-3 text-[var(--lp-ink)] hover:bg-[var(--lp-bg-2)]"
            nativeButton={false}
            render={<Link href="/login" />}
          >
            Log in
          </Button>
          <Button
            className="h-10 rounded-full bg-[var(--lp-ink)] px-4 text-[var(--lp-bg)] hover:bg-[var(--lp-ink)]/85"
            nativeButton={false}
            render={<Link href="/signup" />}
          >
            Sign up
          </Button>
        </div>
      </header>

      {/* Hero — the intent-picker is the primary interaction, borrowed
          from getsquire.com/find-a-barber's "why are you looking for a
          barber" flow. Kept photo-free on purpose: both references keep
          their CTA area typographically clean rather than fighting a
          background image. */}
      <section className="mx-auto flex max-w-4xl flex-col items-center gap-8 px-4 py-20 text-center sm:px-8 sm:py-28">
        <p className={`${eyebrow} text-lg sm:text-xl`}>
          Same-day · Lipa City
        </p>
        <h1 className={`${headline} text-4xl sm:text-6xl md:text-7xl`}>
          What do you need today?
        </h1>
        <p className="max-w-lg text-balance text-base text-[var(--lp-ink-soft)] sm:text-lg">
          Tell us what you&apos;re after — we&apos;ll get you to the right
          barber, no appointment required.
        </p>

        <div className="flex w-full max-w-md flex-col gap-3">
          {BOOK_PILLS.map((pill, i) => (
            <Button
              key={pill.label}
              size="lg"
              variant={i === 0 ? undefined : "outline"}
              className={
                i === 0
                  ? "h-14 w-full justify-between rounded-full bg-[var(--lp-ink)] px-6 text-base font-semibold text-[var(--lp-bg)] hover:bg-[var(--lp-ink)]/85"
                  : "h-14 w-full justify-between rounded-full border-[var(--lp-ink)]/25 bg-transparent px-6 text-base font-semibold text-[var(--lp-ink)] hover:bg-[var(--lp-bg-2)]"
              }
              nativeButton={false}
              render={<Link href={pill.href} />}
            >
              {pill.label}
              <ArrowRightIcon className="size-4 shrink-0" aria-hidden="true" />
            </Button>
          ))}
        </div>

        <p className="text-sm text-[var(--lp-ink-soft)]">
          Already booked before?{" "}
          <Link
            href="/login"
            className="font-medium text-[var(--lp-ink)] underline underline-offset-4"
          >
            Log in
          </Link>
        </p>
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
            className="h-14 rounded-full bg-[var(--lp-bg)] px-8 text-base font-semibold text-[var(--lp-ink)] hover:bg-[var(--lp-bg)]/90"
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
            <p className={`${headline} text-base normal-case leading-none`}>
              Barbero2Go
            </p>
            <p className="mt-1 text-sm text-[var(--lp-ink-soft)]">
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
