import type { createClient } from "@/lib/supabase/server";

type Client = Awaited<ReturnType<typeof createClient>>;

// Fallbacks match the values seeded by migrations 0007/0011/0017/0020.
export const SETTING_DEFAULTS = {
  fee_percentage: 25,
  max_match_radius_km: 1,
  min_wallet_to_go_online: 0,
  request_timeout_seconds: 40,
} as const;

export type NumericSetting = keyof typeof SETTING_DEFAULTS;

export type PlatformSettings = Record<NumericSetting, number> & { policy_text: string };

// Server-only: every row of platform_settings, with defaults for gaps.
export async function readSettings(supabase: Client): Promise<PlatformSettings> {
  const { data } = await supabase.from("platform_settings").select("key, value");
  const byKey = new Map((data ?? []).map((row) => [row.key as string, row.value as unknown]));

  const numeric = Object.fromEntries(
    (Object.keys(SETTING_DEFAULTS) as NumericSetting[]).map((key) => {
      const value = Number(byKey.get(key));
      return [key, byKey.has(key) && Number.isFinite(value) ? value : SETTING_DEFAULTS[key]];
    }),
  ) as Record<NumericSetting, number>;

  return { ...numeric, policy_text: String(byKey.get("policy_text") ?? "") };
}
