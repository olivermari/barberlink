import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { initials } from "@/lib/initials";
import { formatShortDate } from "@/lib/format";
import { CHOSEN_BARBER_SURCHARGE } from "@/lib/pricing";
import { REVIEW_TAG_LABEL } from "@/lib/review-tags";
import { BookingDialog } from "@/components/booking-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SectionLabel } from "@/components/ui/section-label";

export default async function BarberProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ quick?: string }>;
}) {
  const { id } = await params;
  const { quick } = await searchParams;
  const isQuickMatch = quick === "1";
  const supabase = await createClient();

  const { data: barber } = await supabase
    .from("barber_profiles")
    .select("id, bio, years_experience, base_address, rating_avg, rating_count")
    .eq("id", id)
    .single();

  if (!barber) notFound();

  const [{ data: profile }, { data: portfolio }, { data: services }, { data: reviews }] =
    await Promise.all([
      supabase.from("profiles").select("full_name, avatar_url").eq("id", id).single(),
      supabase
        .from("barber_portfolio")
        .select("id, image_url, caption")
        .eq("barber_id", id)
        .order("created_at", { ascending: false }),
      supabase
        .from("services")
        .select("id, name, description, price, duration_minutes")
        .eq("barber_id", id)
        .eq("is_active", true)
        .order("price", { ascending: true }),
      supabase
        .from("reviews")
        .select("id, rating, comment, tags, customer_id, created_at")
        .eq("barber_id", id)
        .order("created_at", { ascending: false })
        .limit(20),
    ]);

  const reviewerIds = [...new Set((reviews ?? []).map((r) => r.customer_id))];
  const { data: reviewers } = reviewerIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", reviewerIds)
    : { data: [] as { id: string; full_name: string | null }[] };
  const reviewerName = new Map((reviewers ?? []).map((r) => [r.id, r.full_name]));

  const name = profile?.full_name ?? "Barber";
  const bookable = (services ?? []).map((s) => ({
    id: s.id,
    name: s.name,
    price: s.price,
    duration_minutes: s.duration_minutes,
  }));
  const meta = [
    barber.rating_count > 0
      ? `★ ${barber.rating_avg.toFixed(1)} (${barber.rating_count} review${barber.rating_count === 1 ? "" : "s"})`
      : "New — no ratings yet",
    barber.years_experience ? `${barber.years_experience} yrs experience` : null,
    barber.base_address,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-4 sm:p-6">
      <header className="flex items-center gap-4">
        <Avatar className="size-[76px]">
          {profile?.avatar_url && <AvatarImage src={profile.avatar_url} alt={name} />}
          <AvatarFallback className="text-lg">{initials(profile?.full_name)}</AvatarFallback>
        </Avatar>
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="text-2xl font-black">{name}</h1>
          <p className="text-sm text-muted-foreground">{meta}</p>
        </div>
      </header>

      {barber.bio && <p className="text-[15px] leading-relaxed text-ink-soft">{barber.bio}</p>}

      <section className="flex flex-col gap-2.5">
        <SectionLabel>Services</SectionLabel>
        {bookable.length > 0 ? (
          <ul className="divide-y divide-border rounded-lg border-[1.5px] border-outline">
            {(services ?? []).map((service) => (
              <li key={service.id} className="flex items-center justify-between gap-4 p-3.5">
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="text-base font-semibold">{service.name}</span>
                  <span className="text-sm text-muted-foreground">
                    {service.duration_minutes} min · ₱{service.price}
                  </span>
                  {service.description && (
                    <span className="text-sm text-muted-foreground">{service.description}</span>
                  )}
                </div>
                <BookingDialog
                  barber={{ id, name }}
                  services={bookable}
                  initialServiceId={service.id}
                  directPick={!isQuickMatch}
                  triggerLabel="Book"
                />
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No services listed yet.</p>
        )}
        {bookable.length > 0 && (
          <p className="text-xs text-muted-foreground">
            {isQuickMatch
              ? "Matched by Quick Match — no chosen-barber fee."
              : `Choosing ${name} adds ₱${CHOSEN_BARBER_SURCHARGE} to the service price.`}
          </p>
        )}
      </section>

      {portfolio && portfolio.length > 0 && (
        <section className="flex flex-col gap-2.5">
          <SectionLabel>Portfolio</SectionLabel>
          <div className="grid grid-cols-3 gap-1.5">
            {portfolio.map((p) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={p.id}
                src={p.image_url}
                alt={p.caption ?? "Portfolio photo"}
                className="aspect-square w-full rounded-[4px] border border-input object-cover"
              />
            ))}
          </div>
        </section>
      )}

      <section className="flex flex-col gap-1">
        <SectionLabel>Reviews</SectionLabel>
        {reviews && reviews.length > 0 ? (
          <ul className="flex flex-col divide-y divide-border">
            {reviews.map((r) => (
              <li key={r.id} className="flex flex-col gap-1.5 py-3">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-sm font-semibold">
                    {reviewerName.get(r.customer_id) ?? "Customer"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatShortDate(r.created_at)}
                  </span>
                </div>
                <span className="text-sm text-primary" aria-label={`${r.rating} out of 5 stars`}>
                  {"★".repeat(r.rating)}
                  <span className="text-border">{"★".repeat(5 - r.rating)}</span>
                </span>
                {r.tags && r.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {r.tags.map((t: string) => (
                      <span key={t} className="rounded-full border border-input px-2.5 py-0.5 text-xs">
                        {REVIEW_TAG_LABEL[t] ?? t}
                      </span>
                    ))}
                  </div>
                )}
                {r.comment && <p className="text-sm text-muted-foreground">{r.comment}</p>}
              </li>
            ))}
          </ul>
        ) : (
          <p className="pt-1.5 text-sm text-muted-foreground">No reviews yet.</p>
        )}
      </section>
    </div>
  );
}
