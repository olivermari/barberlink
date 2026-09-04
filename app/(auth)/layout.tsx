import Link from "next/link";
import { Logo } from "@/components/brand/logo";

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
      <Link href="/" className="text-foreground">
        <Logo size="lg" />
      </Link>
      {children}
    </div>
  );
}
