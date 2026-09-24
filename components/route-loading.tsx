import { Loader2Icon } from "lucide-react";

// Shown by app/customer/loading.tsx and app/barber/loading.tsx while a
// route segment's server data is still loading — without it, switching
// tabs just froze the current screen until the response came back.
export function RouteLoading() {
  return (
    <div className="flex flex-1 items-center justify-center p-10">
      <Loader2Icon className="size-6 animate-spin text-muted-foreground" aria-hidden />
      <span className="sr-only">Loading…</span>
    </div>
  );
}
