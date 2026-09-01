import Link from "next/link";

// Scoped dark treatment for the auth screens only — applying the
// app's existing `.dark` tokens (already defined in globals.css,
// unused elsewhere) to this wrapper, not inventing a new palette.
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="dark flex min-h-screen flex-col items-center justify-center gap-8 bg-background px-4 py-12">
      <Link
        href="/"
        className="text-2xl font-black tracking-tight text-foreground"
      >
        Barbero2Go
      </Link>
      {children}
    </div>
  );
}
