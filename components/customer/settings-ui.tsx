import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// Settings groups from the Customer UI: a wash-tinted header over a
// white card of rows — icon, title, a grey line beneath, and either a
// chevron or a switch on the right.
export function SettingsGroup({
  title,
  id,
  children,
  className,
}: {
  title: string;
  id?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      id={id}
      className={cn("scroll-mt-4 overflow-hidden rounded-[14px] border border-line bg-white", className)}
    >
      <h2 className="border-b border-line-soft bg-wash px-3.5 py-2.5 text-[13px] font-bold lg:px-4 lg:py-[11px]">
        {title}
      </h2>
      <div className="flex flex-col divide-y divide-[#f1ebdf]">{children}</div>
    </section>
  );
}

export function SettingsRow({
  icon: Icon,
  title,
  sub,
  href,
  right,
  danger,
}: {
  icon: LucideIcon;
  title: string;
  sub: string;
  href?: string;
  right?: React.ReactNode;
  danger?: boolean;
}) {
  const body = (
    <>
      <Icon className="size-6 shrink-0" aria-hidden />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className={cn("text-[14.5px] font-semibold", danger && "text-primary")}>{title}</span>
        <span className="text-[12.5px] text-faint">{sub}</span>
      </span>
      {right ?? (href && <span className="text-[17px] text-[#a49c90]" aria-hidden>›</span>)}
    </>
  );
  const cls = "flex items-center gap-3 px-3.5 py-2.5 lg:px-4 lg:py-[13px]";
  return href ? (
    <Link href={href} className={cn(cls, "transition-colors hover:bg-wash")}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}
