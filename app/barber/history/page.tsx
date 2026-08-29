import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/supabase/require-profile";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function BarberHistoryPage() {
  const { user } = await requireProfile();
  const supabase = await createClient();

  const { data: bookings } = await supabase
    .from("bookings")
    .select(
      "id, updated_at, address_text, price, customer_id, service_id",
    )
    .eq("barber_id", user.id)
    .eq("status", "completed")
    .order("updated_at", { ascending: false });

  const rows = bookings ?? [];
  const customerIds = [...new Set(rows.map((b) => b.customer_id))];
  const serviceIds = [
    ...new Set(rows.map((b) => b.service_id).filter(Boolean)),
  ] as string[];
  const bookingIds = rows.map((b) => b.id);

  const [{ data: customers }, { data: services }, { data: reviews }] =
    await Promise.all([
      customerIds.length
        ? supabase.from("profiles").select("id, full_name").in("id", customerIds)
        : Promise.resolve({ data: [] as { id: string; full_name: string | null }[] }),
      serviceIds.length
        ? supabase.from("services").select("id, name").in("id", serviceIds)
        : Promise.resolve({ data: [] as { id: string; name: string }[] }),
      bookingIds.length
        ? supabase
            .from("reviews")
            .select("booking_id, rating, comment")
            .in("booking_id", bookingIds)
        : Promise.resolve(
            { data: [] as { booking_id: string; rating: number; comment: string | null }[] },
          ),
    ]);

  const customerName = new Map((customers ?? []).map((c) => [c.id, c.full_name]));
  const serviceName = new Map((services ?? []).map((s) => [s.id, s.name]));
  const reviewByBooking = new Map((reviews ?? []).map((r) => [r.booking_id, r]));

  const totalEarned = rows.reduce((sum, b) => sum + b.price, 0);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Service history</h1>
        <p className="text-sm text-muted-foreground">
          {rows.length} completed · ₱{totalEarned}
        </p>
      </div>

      {rows.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Completed services will show up here.
        </p>
      )}

      <div className="flex flex-col gap-3">
        {rows.map((b) => {
          const review = reviewByBooking.get(b.id);
          return (
            <Card key={b.id}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between text-base">
                  {serviceName.get(b.service_id ?? "") ?? "Service"}
                  <Badge variant="secondary">₱{b.price}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-1 text-sm text-muted-foreground">
                <p>with {customerName.get(b.customer_id) ?? "Customer"}</p>
                <p>{b.address_text}</p>
                <p>Completed {new Date(b.updated_at).toLocaleString()}</p>
                {review && (
                  <p className="mt-1 text-foreground">
                    ★ {review.rating}
                    {review.comment && ` — "${review.comment}"`}
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
