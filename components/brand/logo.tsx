import { cn } from "@/lib/utils";

// The Barbero2Go mark, from the Claude Design wireframes: a ring-shaped
// location pin with scissors set in its eye — barber and "comes to you"
// in one shape. It paints in `--logo-color` (default: the brand red via
// `--primary`, which the dark theme brightens), and every opening is a
// real hole rather than a background-coloured fill, so the mark sits
// cleanly on white, cream, dark and photo grounds with no per-context
// setup.
const COLOR = "var(--logo-color, var(--primary))";

const PIN =
  "M50 0a50 50 0 0 0-28.6 91C29 101.6 36.4 108.6 45.6 118.6a6 6 0 0 0 8.8 0C63.6 108.6 71 101.6 78.6 91A50 50 0 0 0 50 0zm0 15.5a34.5 34.5 0 1 1 0 69 34.5 34.5 0 0 1 0-69z";

// The finger loops are rings (even-odd) so their centres stay
// transparent, and each blade starts at its loop's edge so no stroke
// shows through the hole.
const LOOP_LEFT =
  "M-24.5-24a10.5 10.5 0 1 0 21 0 10.5 10.5 0 1 0-21 0ZM-17.6-24a3.6 3.6 0 1 0 7.2 0 3.6 3.6 0 1 0-7.2 0Z";
const LOOP_RIGHT =
  "M3.5-24a10.5 10.5 0 1 0 21 0 10.5 10.5 0 1 0-21 0ZM10.4-24a3.6 3.6 0 1 0 7.2 0 3.6 3.6 0 1 0-7.2 0Z";

type MarkProps = {
  // Rendered height in px; the pin is 100 × 128, so width follows.
  size?: number;
  className?: string;
  title?: string;
};

function MarkSvg({
  size,
  className,
  title,
  children,
}: MarkProps & { size: number; children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 100 128"
      height={size}
      width={Math.round((size * 100) / 128)}
      className={cn("shrink-0", className)}
      style={{ fill: COLOR }}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      {children}
    </svg>
  );
}

// The full mark. Below ~28px the scissors close up into a smudge — use
// `LogoMarkSmall` there instead.
export function LogoMark({ size = 32, className, title }: MarkProps) {
  return (
    <MarkSvg size={size} className={className} title={title}>
      <path fillRule="evenodd" d={PIN} />
      <g transform="translate(50 50) rotate(-40) scale(0.52)">
        <g
          style={{
            fill: "none",
            stroke: COLOR,
            strokeWidth: 10,
            strokeLinecap: "round",
          }}
        >
          <path d="M-9.2-14.7 16 34" />
          <path d="M9.2-14.7-16 34" />
        </g>
        <path fillRule="evenodd" d={LOOP_LEFT} />
        <path fillRule="evenodd" d={LOOP_RIGHT} />
      </g>
    </MarkSvg>
  );
}

// The ring pin alone — what the wireframes use in headers, the
// favicon, and anywhere under ~28px.
export function LogoMarkSmall({ size = 22, className, title }: MarkProps) {
  return (
    <MarkSvg size={size} className={className} title={title}>
      <path fillRule="evenodd" d={PIN} />
    </MarkSvg>
  );
}

const SIZES = {
  sm: { mark: 22, text: "text-[15px]", gap: "gap-2" },
  md: { mark: 24, text: "text-lg", gap: "gap-2" },
  lg: { mark: 34, text: "text-2xl", gap: "gap-2.5" },
  xl: { mark: 56, text: "text-3xl", gap: "gap-3" },
} as const;

const WORDMARK =
  "font-[family-name:var(--font-archivo)] font-black leading-none tracking-[-0.02em]";

function MarkForSize({ size }: { size: number }) {
  return size < 28 ? <LogoMarkSmall size={size} /> : <LogoMark size={size} />;
}

// Horizontal lockup — the primary. The wordmark is live text in
// Archivo Black and inherits the surrounding text colour; the mark stays
// brand red. Standalone assets for use outside the app live in
// public/images.
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
      <MarkForSize size={s.mark} />
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
      <MarkForSize size={s.mark} />
      <span className={cn(WORDMARK, s.text)}>Barbero2Go</span>
    </span>
  );
}
