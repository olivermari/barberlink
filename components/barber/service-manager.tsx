import { SectionLabel } from "@/components/ui/section-label";

type Service = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  duration_minutes: number;
  is_active: boolean;
};

// Services are a fixed platform-wide menu (Kids Haircut / Regular
// Haircut / Haircut + Beard Shave), not something a barber sets — so
// this is read-only, unlike ProfileForm/PortfolioManager next to it.
export function ServiceManager({ services }: { services: Service[] }) {
  return (
    <section className="flex flex-col gap-2.5">
      <SectionLabel>Services</SectionLabel>
      <p className="text-sm text-muted-foreground">
        Every barber offers the same fixed menu — pricing is set platform-wide.
      </p>

      {services.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Your services are being set up — check back shortly.
        </p>
      ) : (
        <ul className="divide-y divide-border rounded-lg border-[1.5px] border-outline">
          {services.map((service) => (
            <li key={service.id} className="flex items-center gap-3 p-3.5">
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="text-base font-semibold">{service.name}</span>
                <span className="text-sm text-muted-foreground">
                  {service.duration_minutes} min
                </span>
              </div>
              <span className="shrink-0 text-base font-bold">₱{service.price}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
