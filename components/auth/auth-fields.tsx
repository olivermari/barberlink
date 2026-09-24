"use client";

import { useId, useState } from "react";
import { toast } from "sonner";
import { EyeIcon, EyeOffIcon, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// The design's log-in field: the icon lives inside the bordered box, the
// label is the placeholder — kept as a real (visually hidden) <label> so
// screen readers still get a name.
export function AuthField({
  icon: Icon,
  label,
  className,
  trailing,
  ...props
}: Omit<React.ComponentProps<"input">, "className"> & {
  icon: LucideIcon;
  label: string;
  className?: string;
  trailing?: React.ReactNode;
}) {
  const id = useId();
  return (
    <div
      className={cn(
        "flex items-center gap-[11px] rounded-[11px] border border-field bg-white px-3.5 py-[13px] transition-colors focus-within:border-foreground focus-within:ring-3 focus-within:ring-ring/15 lg:px-[15px] lg:py-[15px]",
        className,
      )}
    >
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <Icon className="size-6 shrink-0 text-foreground" aria-hidden />
      <input
        id={id}
        placeholder={label}
        className="min-w-0 flex-1 bg-transparent text-[14.5px] leading-[1.25] outline-none placeholder:text-faint lg:text-[15px]"
        {...props}
      />
      {trailing}
    </div>
  );
}

export function AuthPasswordField({
  icon,
  ...props
}: Omit<React.ComponentProps<typeof AuthField>, "type" | "trailing">) {
  const [visible, setVisible] = useState(false);
  return (
    <AuthField
      icon={icon}
      type={visible ? "text" : "password"}
      trailing={
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Hide password" : "Show password"}
          className="-my-1 -mr-1 flex size-8 items-center justify-center rounded-md text-foreground"
        >
          {visible ? <EyeOffIcon className="size-6" aria-hidden /> : <EyeIcon className="size-6" aria-hidden />}
        </button>
      }
      {...props}
    />
  );
}

function AppleGlyph() {
  return (
    <svg viewBox="0 0 24 28" className="h-[22px] w-[19px]" aria-hidden>
      <path
        fill="currentColor"
        d="M19.6 14.9c0-3 2.5-4.5 2.6-4.6-1.4-2.1-3.6-2.4-4.4-2.4-1.9-.2-3.6 1.1-4.6 1.1-.9 0-2.4-1.1-3.9-1-2 0-3.9 1.2-4.9 3-2.1 3.7-.5 9.1 1.5 12.1 1 1.5 2.2 3.1 3.7 3 1.5-.1 2.1-1 3.9-1 1.8 0 2.3 1 3.9 1 1.6 0 2.6-1.5 3.6-2.9 1.1-1.7 1.6-3.3 1.6-3.4-.1 0-3-1.1-3-4.9zM16.7 6c.8-1 1.4-2.4 1.2-3.8-1.2.1-2.6.8-3.5 1.8-.8.9-1.4 2.3-1.2 3.7 1.3.1 2.7-.7 3.5-1.7z"
      />
    </svg>
  );
}

// "OR" + Google / Apple, exactly as drawn. OAuth isn't configured for
// this project yet, so the buttons answer with a toast rather than
// pretending to sign anyone in.
export function SocialSignIn() {
  const soon = (provider: string) => () => toast.info(`${provider} sign-in is coming soon.`);
  const btn =
    "flex items-center justify-center gap-2.5 rounded-[11px] border border-field bg-white p-[13px] text-[14.5px] font-semibold transition-colors hover:bg-wash lg:p-3.5 lg:text-[15px]";
  return (
    <>
      <div className="flex items-center gap-3 lg:my-1">
        <div className="h-px flex-1 bg-line-soft lg:bg-[#eae3d5]" />
        <span className="text-xs font-semibold tracking-[0.1em] text-faint">OR</span>
        <div className="h-px flex-1 bg-line-soft lg:bg-[#eae3d5]" />
      </div>
      <button type="button" onClick={soon("Google")} className={btn}>
        <span className="text-base font-extrabold text-[#4285f4] lg:text-[17px]">G</span>
        Continue with Google
      </button>
      <button type="button" onClick={soon("Apple")} className={btn}>
        <AppleGlyph />
        Continue with Apple
      </button>
    </>
  );
}
