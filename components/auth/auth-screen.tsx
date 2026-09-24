import Link from "next/link";
import { ClockIcon, MapPinIcon, ShieldCheckIcon } from "lucide-react";
import { Logo, LogoMark } from "@/components/brand/logo";
import { cn } from "@/lib/utils";

// The Customer UI's log-in frame, one tree that reflows by breakpoint.
// Phones: a dark hero with the headline and a white sheet rising over it,
// so the form is reachable one-handed. Desktop: an ink panel (photo slot,
// headline, three proof points) beside a 480px form column, so fields
// never stretch past a comfortable measure. Sign-up uses the same frame.
//
// The hatched block is the design's photo slot — swap the background for
// a real photo when there is one.
const HATCH = "repeating-linear-gradient(45deg,#2b251e 0 2px,transparent 2px 11px)";

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
      <section className="relative flex min-h-[380px] flex-1 flex-col overflow-hidden bg-[#241f19] px-5 pt-[calc(18px+env(safe-area-inset-top))] pb-16 text-white lg:min-h-svh lg:flex-none lg:p-10">
        <div className="absolute inset-0" style={{ backgroundImage: HATCH }} aria-hidden />
        <LogoMark
          size={420}
          className="absolute -top-[30px] -right-[90px] h-[420px] w-auto opacity-50 lg:top-10 lg:-right-[120px] lg:h-[560px]"
        />
        <div
          className="absolute inset-x-0 bottom-0 h-[170px] bg-gradient-to-b from-[#16130f]/0 to-[#16130f]/[0.88] lg:h-[280px] lg:from-[#241f19]/0 lg:to-[#16130f]/90"
          aria-hidden
        />
        <span className="absolute bottom-3.5 left-[18px] text-[11px] tracking-[0.16em] text-[#6f675c] uppercase lg:top-[18px] lg:right-5 lg:bottom-auto lg:left-auto">
          <span className="lg:hidden">photo slot · barber at work</span>
          <span className="hidden lg:inline">photo slot</span>
        </span>
        <Link href="/" className="relative w-fit text-white">
          <Logo className="text-[23px] lg:text-[26px]" />
        </Link>
        <div className="relative mt-3.5 flex flex-col gap-3.5 lg:mt-auto lg:gap-4">
          <p className="flex flex-col gap-0.5 text-[30px] leading-[1.1] font-extrabold tracking-[-0.03em] lg:text-[46px] lg:leading-[1.05]">
            <span>Great hair.</span>
            <span className="text-[#e8402f]">Right at your door.</span>
          </p>
          <p className="max-w-[32ch] text-[14.5px] leading-normal text-[#cfc8bd] lg:max-w-[44ch] lg:text-[17px] lg:leading-[1.55]">
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
      <section className="relative -mt-[26px] flex flex-none flex-col gap-[13px] rounded-t-[26px] bg-white px-5 pt-[22px] pb-5 text-foreground shadow-[0_-14px_40px_rgba(22,19,15,0.22)] lg:mt-0 lg:min-h-svh lg:gap-[15px] lg:rounded-none lg:bg-[#faf8f3] lg:px-11 lg:py-12 lg:shadow-none lg:[background-image:radial-gradient(#ece5d5_1px,transparent_1.2px)] lg:[background-size:15px_15px]">
        <div className="flex flex-col gap-[3px] lg:gap-[5px]">
          <h1 className="text-[22px] font-extrabold tracking-[-0.02em] lg:text-[30px]">{title}</h1>
          <p className="text-sm text-[#6a635a] lg:text-[15px]">{subtitle}</p>
        </div>
        {children}
        <p className="text-center text-[13.5px] text-[#6a635a] lg:mt-auto lg:text-sm">{footer}</p>
      </section>
    </div>
  );
}
