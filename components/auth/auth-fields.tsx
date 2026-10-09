"use client";

import { useId, useState } from "react";
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
          className="-my-2.5 -mr-2.5 flex size-11 items-center justify-center rounded-md text-foreground"
        >
          {visible ? <EyeOffIcon className="size-6" aria-hidden /> : <EyeIcon className="size-6" aria-hidden />}
        </button>
      }
      {...props}
    />
  );
}
