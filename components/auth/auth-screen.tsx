import Image from "next/image";
import Link from "next/link";
import { ClockIcon, MapPinIcon, ShieldCheckIcon } from "lucide-react";
import { Logo, LogoMark } from "@/components/brand/logo";
import { cn } from "@/lib/utils";

// The Customer UI's log-in frame, one tree that reflows by breakpoint.
// Phones: the form is a white sheet anchored to the bottom, sized to its
// content, and the photo banner (logo top, headline bottom) grows to fill
// whatever height is left, so tall phones get a big photo instead of empty
// white space, and a 320x568 phone still fits the whole form. Tablets keep
// that layout with the form capped at 440px instead of stretching.
// Desktop: a photo panel (headline, three proof points) beside
// a 480px form column. Sign-up and the other auth pages use the same frame.
//
// Hero layers, back to front: the barber photo, a light ink tint so the
// headline stays readable, the red pin watermark, then the bottom fade.

const POINTS = [
  { Icon: ShieldCheckIcon, label: ["Trusted", "Barbers"] },
  { Icon: ClockIcon, label: ["Real-time", "Booking"] },
  { Icon: MapPinIcon, label: ["Door-to-Door", "Service"] },
];

export function AuthScreen({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <div className="flex min-h-svh flex-col bg-[#16130f] lg:grid lg:grid-cols-[minmax(0,1fr)_480px] lg:bg-white">
      {/* Hero (phones) / ink panel (desktop) */}
      <section className="relative flex min-h-[168px] flex-1 flex-col overflow-hidden bg-[#241f19] px-5 pt-[calc(16px+env(safe-area-inset-top))] pb-[46px] text-white sm:px-8 sm:pb-[54px] lg:min-h-svh lg:flex-none lg:p-10">
        <Image
          src="/images/auth-barber.jpg"
          alt=""
          fill
          priority
          sizes="(min-width: 1024px) calc(100vw - 480px), 100vw"
          className="object-cover object-[68%_40%] lg:object-[38%_center]"
        />
        <div className="absolute inset-0 bg-[#16130f]/55 lg:bg-[#16130f]/25" aria-hidden />
        <LogoMark
          size={420}
          className="absolute -top-[40px] -right-[70px] h-[300px] w-auto opacity-45 sm:h-[360px] lg:opacity-35 lg:top-10 lg:-right-[120px] lg:h-[560px]"
        />
        <div
          className="absolute inset-x-0 bottom-0 h-[170px] bg-gradient-to-b from-[#16130f]/0 to-[#16130f]/[0.88] lg:h-[280px] lg:from-[#241f19]/0 lg:to-[#16130f]/90"
          aria-hidden
        />
        <Link href="/" className="relative w-fit text-white">
          <Logo className="text-[23px] lg:text-[26px]" />
        </Link>
        <div className="relative mt-auto flex flex-col gap-2 pt-3 sm:gap-3 lg:gap-4">
          <p className="flex flex-col gap-0.5 text-[26px] leading-[1.1] font-extrabold tracking-[-0.03em] min-[380px]:text-[30px] sm:text-[36px] lg:text-[46px] lg:leading-[1.05]">
            <span>Great hair.</span>
            <span className="text-[#e8402f]">Right at your door.</span>
          </p>
          <p className="max-w-[44ch] text-[15px] leading-normal text-[#cfc8bd] max-sm:hidden lg:text-[17px] lg:leading-[1.55]">
            Book trusted barbers, anytime, anywhere. Fast, easy, and hassle free.
          </p>
          <div className="mt-2 hidden border-t border-[#3a342c] pt-5 lg:flex">
            {POINTS.map(({ Icon, label }, i) => (
              <div
                key={label[0]}
                className={cn(
                  "flex items-center gap-[11px]",
                  i === 0 ? "pr-[26px]" : "border-l border-[#3a342c] px-[26px]",
                )}
              >
                <Icon className="size-6 text-[#e8402f]" aria-hidden />
                <span className="text-sm leading-[1.3] font-semibold">
                  {label[0]}
                  <br />
                  {label[1]}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Form sheet (phones) / form column (desktop) */}
      <section className="relative -mt-[26px] flex flex-none flex-col rounded-t-[26px] bg-white px-5 pt-[22px] pb-[calc(20px+env(safe-area-inset-bottom))] text-foreground shadow-[0_-14px_40px_rgba(22,19,15,0.22)] sm:px-8 sm:pt-8 lg:mt-0 lg:min-h-svh lg:flex-none lg:rounded-none lg:bg-[#faf8f3] lg:px-11 lg:py-12 lg:shadow-none lg:[background-image:radial-gradient(#ece5d5_1px,transparent_1.2px)] lg:[background-size:15px_15px]">
        <div className="mx-auto flex w-full max-w-[440px] flex-col gap-[13px] lg:max-w-none lg:flex-1 lg:gap-[15px]">
          <div className="flex flex-col gap-[3px] lg:gap-[5px]">
            <h1 className="text-[22px] font-extrabold tracking-[-0.02em] lg:text-[30px]">{title}</h1>
            <p className="text-sm text-[#6a635a] lg:text-[15px]">{subtitle}</p>
          </div>
          {children}
          {/* Footer links get a 44px tap target (-my-3 + py-3) without moving the text. */}
          <p className="pt-2 text-center text-[13.5px] text-[#6a635a] lg:mt-auto lg:text-sm [&_a]:-my-3 [&_a]:inline-block [&_a]:py-3 [&_button]:-my-3 [&_button]:py-3">
            {footer}
          </p>
        </div>
      </section>
    </div>
  );
}
