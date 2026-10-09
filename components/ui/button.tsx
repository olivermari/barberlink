import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

// Wireframe button language: the primary action is a red fill, every
// other action is a white button with a 1.5px ink outline. Sizes are a
// step taller than shadcn's defaults for thumb-sized touch targets.
//
// Motion: solid and outlined buttons lift 2px with a soft shadow on hover
// and press back down (slightly smaller) when clicked; an arrow icon inside
// slides right. Ghost and link buttons (nav items, inline actions) only
// change colour. Tailwind's `hover:` only fires on devices that can hover,
// so phones get the press but never a stuck hover, and reduced-motion users
// get colour changes only.
const LIFT =
  "hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] motion-reduce:hover:translate-y-0 motion-reduce:active:scale-100"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-md border border-transparent bg-clip-padding text-sm font-semibold whitespace-nowrap transition-[translate,scale,box-shadow,background-color,color,border-color,opacity] duration-200 ease-out outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 motion-reduce:transition-colors [&_.lucide-arrow-right]:transition-transform [&_.lucide-arrow-right]:duration-200 hover:[&_.lucide-arrow-right]:translate-x-1 motion-reduce:hover:[&_.lucide-arrow-right]:translate-x-0 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: `bg-primary font-bold text-primary-foreground hover:bg-primary/90 hover:shadow-[0_10px_22px_-10px_rgba(207,36,23,0.65)] ${LIFT}`,
        outline: `border-[1.5px] border-outline bg-background hover:bg-muted hover:text-foreground hover:shadow-[0_10px_20px_-12px_rgba(22,19,15,0.45)] aria-expanded:bg-muted aria-expanded:text-foreground ${LIFT}`,
        ink: `bg-foreground text-background hover:bg-foreground/85 hover:shadow-[0_10px_22px_-10px_rgba(22,19,15,0.6)] ${LIFT}`,
        secondary: `bg-secondary text-secondary-foreground hover:bg-accent hover:shadow-[0_10px_20px_-12px_rgba(22,19,15,0.35)] aria-expanded:bg-accent aria-expanded:text-secondary-foreground ${LIFT}`,
        ghost:
          "hover:bg-muted hover:text-foreground active:scale-[0.98] aria-expanded:bg-muted aria-expanded:text-foreground motion-reduce:active:scale-100 dark:hover:bg-muted/50",
        destructive:
          `${LIFT} hover:shadow-[0_10px_20px_-12px_rgba(207,36,23,0.45)] bg-destructive/10 text-destructive hover:bg-destructive/20 focus-visible:border-destructive/40 focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:hover:bg-destructive/30 dark:focus-visible:ring-destructive/40`,
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default:
          "h-10 gap-1.5 px-4 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
        xs: "h-7 gap-1 rounded-[min(var(--radius-md),8px)] px-2.5 text-xs has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 gap-1 px-3 text-[0.8rem] has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-12 gap-2 px-5 text-base has-data-[icon=inline-end]:pr-4 has-data-[icon=inline-start]:pl-4",
        icon: "size-10",
        "icon-xs":
          "size-7 rounded-[min(var(--radius-md),8px)] [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-8",
        "icon-lg": "size-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
