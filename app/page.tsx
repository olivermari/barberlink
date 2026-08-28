import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center gap-6 px-4 text-center">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold">Barbero2Go</h1>
        <p className="text-muted-foreground">
          Door-to-door haircuts, on demand.
        </p>
      </div>
      <div className="flex gap-3">
        <Button nativeButton={false} render={<Link href="/signup" />}>
          Sign up
        </Button>
        <Button
          nativeButton={false}
          variant="outline"
          render={<Link href="/login" />}
        >
          Log in
        </Button>
      </div>
    </div>
  );
}
