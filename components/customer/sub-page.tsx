import Link from "next/link";
import { ChevronLeftIcon } from "lucide-react";
import { MobileHeader } from "@/components/customer/ui";

// Shared frame for the profile sub-pages: the phone header with a back
// chevron, and on web a plain breadcrumb over a centred column.
export function SubPage({
  title,
  intro,
  children,
}: {
  title: string;
  intro?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col bg-wash lg:overflow-y-auto">
      <MobileHeader title={title} backHref="/customer/profile" className="border-b border-line-soft bg-white" />
      <div className="mx-auto flex w-full max-w-[560px] flex-col gap-4 px-4 py-4 pb-8 lg:py-8">
        <Link
          href="/customer/profile"
          className="hidden items-center gap-1 text-[13px] font-semibold text-[#6a635a] lg:inline-flex"
        >
          <ChevronLeftIcon className="size-4" aria-hidden />
          Profile &amp; settings
        </Link>
        <h1 className="hidden text-2xl font-extrabold tracking-[-0.02em] lg:block">{title}</h1>
        {intro && <p className="text-[13.5px] leading-[1.5] text-[#6a635a]">{intro}</p>}
        {children}
      </div>
    </div>
  );
}
