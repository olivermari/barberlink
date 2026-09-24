import { Logo } from "@/components/brand/logo";
import { SubPage } from "@/components/customer/sub-page";

export default function AboutPage() {
  return (
    <SubPage title="About Barbero2Go">
      <div className="flex flex-col items-start gap-3 rounded-[14px] border border-line bg-white p-5">
        <Logo className="text-[26px]" />
        <p className="text-[14px] leading-[1.55] text-[#4c463d]">
          Barbero2Go brings a verified barber to your door, the same day. Book the nearest free
          barber, or choose one whose work you like.
        </p>
        <span className="text-[12.5px] text-faint">Version 1.0.0</span>
      </div>
    </SubPage>
  );
}
