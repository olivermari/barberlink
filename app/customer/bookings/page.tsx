import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/supabase/require-profile";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "outline",
  accepted: "secondary",
  declined: "destructive",
  on_the_way: "secondary",
  in_service: "secondary",
  completed: "default",
  cancelled: "destructive",
};

const STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  accepted: "Accepted",
  declined: "Declined",
  on_the_way: "On the way",
  in_service: "In service",
  completed: "Completed",
  cancelled: "Cancelled",
};

export default async function CustomerBookingsPage() {
  const { user } = await requireProfile();
  const supabase = await createClient();

  const { data: bookings } = await supabase
    .from("bookings")
    .select(
      "id, scheduled_at, address_text, status, price, barber_id, service_id",
    )
    .eq("customer_id", user.id)
    .order("scheduled_at", { ascending: false });

  const barberIds = [...new Set((bookings ?? []).map((b) => b.barber_id))];
  const serviceIds = [...new Set((bookings ?? []).map((b) => b.service_id).filter(Boolean))] as string[];

  const [{ data: barberNames }, { data: serviceNames }] = await Promise.all([
    barberIds.length
      ? supabase.from("profiles").select("id, full_name").in("id", barberIds)
      : Promise.resolve({ data: [] as { id: string; full_name: string | null }[] }),
    serviceIds.length
      ? supabase.from("services").select("id, name").in("id", serviceIds)
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
  ]);

  const barberName = new Map((barberNames ?? []).map((b) => [b.id, b.full_name]));
  const serviceName = new Map((serviceNames ?? []).map((s) => [s.id, s.name]));

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 p-4 sm:p-6">
      <h1 className="text-2xl font-semibold">My bookings</h1>

      {(!bookings || bookings.length === 0) && (
        <p className="text-sm text-muted-foreground">
          No bookings yet — browse barbers to book your first appointment.
        </p>
      )}

      <div className="flex flex-col gap-3">
        {(bookings ?? []).map((b) => (
          <Link key={b.id} href={`/customer/bookings/${b.id}`}>
            <Card className="transition-colors hover:bg-muted/50">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between text-base">
                  {serviceName.get(b.service_id ?? "") ?? "Service"}
                  <Badge variant={STATUS_VARIANT[b.status] ?? "outline"}>
                    {STATUS_LABEL[b.status] ?? b.status}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-1 text-sm text-muted-foreground">
                <p>with {barberName.get(b.barber_id) ?? "Barber"}</p>
                <p>{new Date(b.scheduled_at).toLocaleString()}</p>
                <p>{b.address_text}</p>
                <p className="font-medium text-foreground">₱{b.price}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
