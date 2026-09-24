import { createClient } from "@/lib/supabase/server";
import { readSettings } from "@/lib/platform-settings";
import { CHOSEN_BARBER_SURCHARGE } from "@/lib/pricing";
import { CatalogForm } from "@/components/admin/catalog-form";
import { SettingsForm } from "@/components/admin/settings-form";
import { SectionLabel } from "@/components/ui/section-label";

// Every number here maps to a row in platform_settings or
// service_catalog, or (the chosen-barber fee) a code constant.
export default async function AdminPricingPage() {
  const supabase = await createClient();
  const [settings, { data: catalog }] = await Promise.all([
    readSettings(supabase),
    supabase
      .from("service_catalog")
      .select("id, name, price, duration_minutes")
      .order("sort", { ascending: true }),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-4 sm:p-[22px]">
      <div>
        <h1 className="text-[25px] font-black">Services & pricing</h1>
        <p className="text-sm text-muted-foreground">
          Changes apply to the next booking. Existing bookings keep the price they were made at.
        </p>
      </div>

      <section className="flex flex-col gap-3 rounded-lg border-[1.5px] border-outline p-4">
        <SectionLabel>Service menu</SectionLabel>
        <p className="text-sm text-muted-foreground">
          The fixed menu every barber offers. A price change reaches all barbers at once.
        </p>
        <CatalogForm
          items={(catalog ?? []).map((c) => ({
            id: c.id,
            name: c.name,
            price: Number(c.price),
            durationMinutes: c.duration_minutes,
          }))}
        />
      </section>

      <section className="flex flex-col gap-3 rounded-lg border-[1.5px] border-outline p-4">
        <SectionLabel>Pricing & policy</SectionLabel>
        <SettingsForm initial={settings} surcharge={CHOSEN_BARBER_SURCHARGE} />
      </section>
    </div>
  );
}
