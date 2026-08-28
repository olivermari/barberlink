import { requireProfile } from "@/lib/supabase/require-profile";
import { SignOutButton } from "@/components/sign-out-button";

export default async function AdminHome() {
  const { profile } = await requireProfile();

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-2xl font-semibold">Admin dashboard</h1>
      <p className="text-muted-foreground">
        Signed in as {profile.full_name ?? "Admin"} ({profile.role})
      </p>
      <SignOutButton />
    </div>
  );
}
