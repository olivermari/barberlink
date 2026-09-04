import { cn } from "@/lib/utils";

// The Barbero2Go mark: scissors set inside a location pin — barber and
// "comes to you" in one shape. The scissors are tilted on purpose;
// drawn upright, the two loops over crossed blades read as a face.
//
// The pin paints in `currentColor`, so the mark inherits whatever text
// color it sits in. The knockout (the scissors themselves) paints in
// `--logo-ground`, which defaults to the app's `--background` token —
// that makes it reverse correctly on the dark auth screens for free.
// On a photo or a custom ground, set `--logo-ground` on any ancestor.
const GROUND = "var(--logo-ground, var(--background))";

// Below ~28px the loops close up and the scissors turn to a smudge, so
// small sizes get their own drawing — see `LogoMarkSmall`.
export function LogoMark({
  size = 24,
  className,
  title,
}: {
  size?: number;
  className?: string;
  title?: string;
}) {
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={cn("shrink-0", className)}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      <path
        style={{ fill: "currentColor" }}
        d="M50 4C72.1 4 90 21.9 90 44c0 24.3-29.4 47.9-40 52C39.4 91.9 10 68.3 10 44 10 21.9 27.9 4 50 4Z"
      />
      <g
        transform="rotate(-42 50 45)"
        style={{
          fill: "none",
          stroke: GROUND,
          strokeWidth: 8,
          strokeLinecap: "round",
        }}
      >
        <circle cx="39" cy="21" r="6" />
        <circle cx="61" cy="21" r="6" />
        <path d="M43.2 26 L60 70" />
        <path d="M56.8 26 L40 70" />
      </g>
    </svg>
  );
}

// The simplified cut for favicons, map markers and anything under
// ~28px: the same pin with the scissors reduced to the cut itself.
export function LogoMarkSmall({
  size = 16,
  className,
  title,
}: {
  size?: number;
  className?: string;
  title?: string;
}) {
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={cn("shrink-0", className)}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      <path
        style={{ fill: "currentColor" }}
        d="M50 4C72.1 4 90 21.9 90 44c0 24.3-29.4 47.9-40 52C39.4 91.9 10 68.3 10 44 10 21.9 27.9 4 50 4Z"
      />
      <g
        style={{
          fill: "none",
          stroke: GROUND,
          strokeWidth: 11,
          strokeLinecap: "round",
        }}
      >
        <path d="M38 31 L62 61" />
        <path d="M62 31 L38 61" />
      </g>
    </svg>
  );
}

const SIZES = {
  sm: { mark: 20, text: "text-base", gap: "gap-2" },
  md: { mark: 22, text: "text-lg", gap: "gap-2" },
  lg: { mark: 26, text: "text-2xl", gap: "gap-2.5" },
  xl: { mark: 52, text: "text-3xl", gap: "gap-3" },
} as const;

const WORDMARK =
  "font-[family-name:var(--font-archivo)] font-black leading-none tracking-[-0.035em]";

// Horizontal lockup — the primary. The wordmark is live text in
// Archivo Black rather than outlined paths so it stays selectable and
// scales with the type ramp; the standalone asset in public/images is
// the one to hand to anyone outside the app.
export function Logo({
  size = "sm",
  className,
  style,
}: {
  size?: keyof typeof SIZES;
  className?: string;
  style?: React.CSSProperties;
}) {
  const s = SIZES[size];
  return (
    <span
      className={cn("inline-flex items-center", s.gap, className)}
      style={style}
    >
      <LogoMark size={s.mark} />
      <span className={cn(WORDMARK, s.text)}>Barbero2Go</span>
    </span>
  );
}

export function LogoStacked({
  size = "xl",
  className,
  style,
}: {
  size?: keyof typeof SIZES;
  className?: string;
  style?: React.CSSProperties;
}) {
  const s = SIZES[size];
  return (
    <span
      className={cn("inline-flex flex-col items-center gap-3", className)}
      style={style}
    >
      <LogoMark size={s.mark} />
      <span className={cn(WORDMARK, s.text)}>Barbero2Go</span>
    </span>
  );
}
