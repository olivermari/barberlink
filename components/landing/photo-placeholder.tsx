import { ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// A clearly-marked stand-in for real photography — this page's photo
// slots are sized/styled for the final shots but nothing's been
// commissioned yet. Swap for a real <img>/next-image once it exists.
export function PhotoPlaceholder({
  label = "Photo placeholder",
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2 border border-dashed border-[var(--lp-ink)]/25 bg-[var(--lp-bg-2)]",
        className,
      )}
    >
      <ImageIcon
        className="size-7 text-[var(--lp-ink)]/30"
        aria-hidden="true"
        strokeWidth={1.5}
      />
      <span className="text-xs font-medium tracking-wide text-[var(--lp-ink)]/40">
        {label}
      </span>
    </div>
  );
}
