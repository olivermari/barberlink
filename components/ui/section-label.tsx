import { cn } from "@/lib/utils";

// The wireframes' small uppercase section label ("WHERE", "PAY WITH",
// "CHAT", "PAST BOOKINGS").
export function SectionLabel({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      className={cn(
        "text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase",
        className,
      )}
      {...props}
    />
  );
}
