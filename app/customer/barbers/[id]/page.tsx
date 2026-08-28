import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BookingDialog } from "@/components/booking-dialog";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default async function BarberProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: barber } = await supabase
    .from("barber_profiles")
    .select(
      "id, bio, years_experience, base_address, rating_avg, rating_count",
    )
    .eq("id", id)
    .single();

  if (!barber) notFound();

  const [{ data: profile }, { data: portfolio }, { data: services }, { data: reviews }] =
    await Promise.all([
      supabase.from("profiles").select("full_name").eq("id", id).single(),
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
        .select("id, rating, comment, customer_id, created_at")
        .eq("barber_id", id)
        .order("created_at", { ascending: false })
        .limit(20),
    ]);

  const reviewerIds = [...new Set((reviews ?? []).map((r) => r.customer_id))];
  const { data: reviewers } = reviewerIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", reviewerIds)
    : { data: [] as { id: string; full_name: string | null }[] };
  const reviewerName = new Map((reviewers ?? []).map((r) => [r.id, r.full_name]));

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-semibold">{profile?.full_name ?? "Barber"}</h1>
        <p className="text-sm text-muted-foreground">
          {barber.years_experience
            ? `${barber.years_experience} years experience`
            : null}
          {barber.base_address ? ` · ${barber.base_address}` : null}
        </p>
        <p className="mt-1 text-sm">
          {barber.rating_count > 0
            ? `★ ${barber.rating_avg.toFixed(1)} (${barber.rating_count} review${barber.rating_count === 1 ? "" : "s"})`
            : "No ratings yet"}
        </p>
      </div>

      {barber.bio && <p className="text-sm text-muted-foreground">{barber.bio}</p>}

      {portfolio && portfolio.length > 0 && (
        <div>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Portfolio
          </h2>
          <div className="grid grid-cols-3 gap-2">
            {portfolio.map((p) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={p.id}
                src={p.image_url}
                alt={p.caption ?? "Portfolio photo"}
                className="aspect-square w-full rounded-md object-cover"
              />
            ))}
          </div>
        </div>
      )}

      <Separator />

      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Services
        </h2>
        <div className="flex flex-col gap-3">
          {(services ?? []).map((service) => (
            <Card key={service.id}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between text-base">
                  {service.name}
                  <Badge variant="secondary">₱{service.price}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex items-center justify-between gap-4">
                <div>
                  {service.description && (
                    <p className="text-sm text-muted-foreground">
                      {service.description}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {service.duration_minutes} min
                  </p>
                </div>
                <BookingDialog barberId={id} service={service} />
              </CardContent>
            </Card>
          ))}
          {(!services || services.length === 0) && (
            <p className="text-sm text-muted-foreground">
              No services listed yet.
            </p>
          )}
        </div>
      </div>

      <Separator />

      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Reviews
        </h2>
        <div className="flex flex-col gap-3">
          {(reviews ?? []).map((r) => (
            <div key={r.id} className="text-sm">
              <div className="flex items-center gap-2">
                <span className="font-medium">
                  {reviewerName.get(r.customer_id) ?? "Customer"}
                </span>
                <span className="text-muted-foreground">★ {r.rating}</span>
              </div>
              {r.comment && (
                <p className="text-muted-foreground">{r.comment}</p>
              )}
            </div>
          ))}
          {(!reviews || reviews.length === 0) && (
            <p className="text-sm text-muted-foreground">No reviews yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
