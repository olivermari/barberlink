import { createClient } from "@/lib/supabase/server";
import { CoverageManager } from "@/components/admin/coverage-manager";

export default async function AdminCoveragePage() {
  const supabase = await createClient();

  const { data: areas } = await supabase
    .from("service_areas")
    .select("id, name, center_lat, center_lng, radius_km, is_active")
    .order("name", { ascending: true });

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-semibold">Coverage</h1>
        <p className="text-sm text-muted-foreground">
          Named regions the platform serves. Not yet enforced against
          bookings — this is the admin-managed list.
        </p>
      </div>

      <CoverageManager initialAreas={areas ?? []} />
    </div>
  );
}
