type Service = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  duration_minutes: number;
  is_active: boolean;
};

// Services are a fixed platform-wide menu (Kids Haircut / Regular
// Haircut / Haircut + Beard Shave), not something a barber sets — so this
// is read-only: the design's Add / Edit actions have nothing to act on.
// A wash-tinted header over rows: name and time, price on the right (web
// gives the time its own column).
export function ServiceManager({ services }: { services: Service[] }) {
  return (
    <section id="services" className="scroll-mt-4 overflow-hidden rounded-[14px] border border-line bg-white">
      <div className="flex items-center justify-between border-b border-[#eee8db] bg-wash px-3.5 py-2.5 lg:px-4">
        <h2 className="text-[13px] font-bold">
          Services<span className="hidden lg:inline"> &amp; pricing</span>
        </h2>
        <span className="text-xs text-faint">Set platform-wide</span>
      </div>
      {services.length === 0 ? (
        <p className="px-3.5 py-3 text-[13.5px] text-[#6a635a] lg:px-4">
          Your services are being set up — check back shortly.
        </p>
      ) : (
        <ul className="divide-y divide-[#f1ebdf]">
          {services.map((service) => (
            <li
              key={service.id}
              className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-3.5 py-[11px] lg:grid-cols-[minmax(0,1fr)_120px_90px] lg:px-4"
            >
              <div className="flex min-w-0 flex-col gap-0.5">
                <span className="text-[14.5px] font-semibold">{service.name}</span>
                <span className="text-[12.5px] text-faint lg:hidden">{service.duration_minutes} min</span>
              </div>
              <span className="hidden text-sm text-[#6a635a] lg:block">{service.duration_minutes} min</span>
              <span className="text-base font-extrabold lg:text-right">₱{service.price}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
