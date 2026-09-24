import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatShortDate } from "@/lib/format";
import { CHOSEN_BARBER_SURCHARGE } from "@/lib/pricing";
import { REVIEW_TAG_LABEL } from "@/lib/review-tags";
import { SaveBarberButton } from "@/components/customer/saved-barbers";
import { Caption, Card, MobileHeader, Photo, PRIMARY_ACTION, Rating, StatusPill } from "@/components/customer/ui";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: barber } = await supabase
    .from("barber_profiles")
    .select(
      "id, bio, years_experience, base_address, rating_avg, rating_count, is_available, verification_status",
    )
    .eq("id", id)
    .single();

  if (!barber) notFound();

  const [{ data: profile }, { data: portfolio }, { data: services }, { data: reviews }, { data: dispatch }, { data: savedRow }] =
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
      barber.verification_status === "verified" && barber.is_available
        ? supabase.rpc("barbers_dispatch_status", { target_barber_ids: [id] })
        : Promise.resolve({ data: null as { barber_id: string; is_busy: boolean; queued_count: number }[] | null }),
      user
        ? supabase.from("saved_barbers").select("barber_id").eq("customer_id", user.id).eq("barber_id", id).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

  const reviewerIds = [...new Set((reviews ?? []).map((r) => r.customer_id))];
  const { data: reviewers } = reviewerIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", reviewerIds)
    : { data: [] as { id: string; full_name: string | null }[] };
  const reviewerName = new Map((reviewers ?? []).map((r) => [r.id, r.full_name]));

  const name = profile?.full_name ?? "Barber";
  const list = services ?? [];

  // A customer landing here straight from a bookmark still gets the same
  // free/busy signal as the list, and can't start a booking that would
  // fail at the end because the barber went offline.
  const bookableNow = barber.verification_status === "verified" && barber.is_available;
  const dispatchRow = (dispatch ?? [])[0];
  const isBusy = dispatchRow?.is_busy ?? false;
  const status = !bookableNow
    ? { label: "Offline", tone: "quiet" as const }
    : isBusy
      ? {
          label: dispatchRow && dispatchRow.queued_count > 0 ? `Busy · ${dispatchRow.queued_count} in queue` : "Busy",
          tone: "bad" as const,
        }
      : { label: "Available", tone: "ok" as const };

  const bookHref = `/customer/book/${id}?via=${isQuickMatch ? "quick" : "chosen"}`;
  const cheapest = list[0]?.price;
  const canBook = bookableNow && list.length > 0;

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-wash lg:overflow-y-auto">
      <MobileHeader title="Barber" backHref="/customer/barbers" className="border-b border-line-soft bg-white" />
      <div className="mx-auto flex w-full max-w-[720px] flex-col gap-4 px-4 py-4 pb-8 lg:py-8">
        <Card className="flex items-center gap-3.5 p-4">
          <Photo src={profile?.avatar_url} name={name} square className="size-[76px]" />
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <h1 className="truncate text-[22px] font-extrabold tracking-[-0.02em]">{name}</h1>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <Rating avg={barber.rating_avg} count={barber.rating_count} />
              {barber.years_experience ? (
                <span className="text-[13px] text-[#6a635a]">{barber.years_experience} yrs experience</span>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <StatusPill tone={status.tone}>{status.label}</StatusPill>
              {barber.base_address && <span className="truncate text-[12.5px] text-faint">{barber.base_address}</span>}
            </div>
          </div>
          <SaveBarberButton barberId={id} initialSaved={Boolean(savedRow)} />
        </Card>

        {!bookableNow && (
          <p className="rounded-xl border border-wash-border bg-white p-3.5 text-[13.5px] text-[#4c463d]">
            {barber.verification_status !== "verified"
              ? `${name} isn't accepting bookings yet.`
              : `${name} is offline right now — you can browse, but can't book until they're back online.`}
          </p>
        )}

        {barber.bio && <p className="text-[14.5px] leading-[1.55] text-[#4c463d]">{barber.bio}</p>}

        <section className="flex flex-col gap-2.5">
          <Caption>Services</Caption>
          {list.length > 0 && (
            <p className="text-[13px] text-[#6a635a]">
              {isQuickMatch
                ? "Matched by Quick Match — no chosen-barber fee."
                : `Choosing ${name} adds ₱${CHOSEN_BARBER_SURCHARGE} to the service price.`}
            </p>
          )}
          {list.length > 0 ? (
            <Card className="divide-y divide-line-soft overflow-hidden">
              {list.map((s) => (
                <div key={s.id} className="flex items-center justify-between gap-4 px-4 py-3.5">
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <span className="text-[14.5px] font-semibold">{s.name}</span>
                    <span className="text-[12.5px] text-faint">{s.duration_minutes} min</span>
                    {s.description && <span className="text-[12.5px] text-faint">{s.description}</span>}
                  </div>
                  <span className="text-[15px] font-extrabold">₱{s.price}</span>
                </div>
              ))}
            </Card>
          ) : (
            <p className="text-sm text-[#6a635a]">No services listed yet.</p>
          )}
        </section>

        {canBook && (
          <Button
            nativeButton={false}
            render={<Link href={bookHref} />}
            className={cn(PRIMARY_ACTION, "flex items-center justify-center")}
          >
            Book {name.split(" ")[0]}
            {cheapest != null && ` · from ₱${cheapest + (isQuickMatch ? 0 : CHOSEN_BARBER_SURCHARGE)}`}
          </Button>
        )}

        {portfolio && portfolio.length > 0 && (
          <section className="flex flex-col gap-2.5">
            <Caption>Portfolio</Caption>
            <div className="grid grid-cols-3 gap-1.5">
              {portfolio.map((p) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={p.id}
                  src={p.image_url}
                  alt={p.caption ?? "Portfolio photo"}
                  className="aspect-square w-full rounded-[10px] border border-photo-border object-cover"
                />
              ))}
            </div>
          </section>
        )}

        <section className="flex flex-col gap-2.5">
          <Caption>Reviews</Caption>
          {reviews && reviews.length > 0 ? (
            <Card className="divide-y divide-line-soft overflow-hidden">
              {reviews.map((r) => (
                <div key={r.id} className="flex flex-col gap-1.5 px-4 py-3.5">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-sm font-bold">{reviewerName.get(r.customer_id) ?? "Customer"}</span>
                    <span className="text-xs text-faint">{formatShortDate(r.created_at)}</span>
                  </div>
                  <span className="text-sm text-primary" aria-label={`${r.rating} out of 5 stars`}>
                    {"★".repeat(r.rating)}
                    <span className="text-line">{"★".repeat(5 - r.rating)}</span>
                  </span>
                  {r.tags && r.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {r.tags.map((t: string) => (
                        <span key={t} className="rounded-full border border-line px-2.5 py-0.5 text-xs">
                          {REVIEW_TAG_LABEL[t] ?? t}
                        </span>
                      ))}
                    </div>
                  )}
                  {r.comment && <p className="text-[13.5px] text-[#4c463d]">{r.comment}</p>}
                </div>
              ))}
            </Card>
          ) : (
            <p className="text-sm text-[#6a635a]">No reviews yet.</p>
          )}
        </section>
      </div>
    </div>
  );
}
