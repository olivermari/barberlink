import type { SupabaseClient } from "@supabase/supabase-js";

export async function ensureBarberProfile(
  supabase: SupabaseClient,
  barberId: string,
) {
  await supabase
    .from("barber_profiles")
    .upsert({ id: barberId }, { onConflict: "id", ignoreDuplicates: true });
}
