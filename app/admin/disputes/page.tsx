import { createClient } from "@/lib/supabase/server";
import { DisputeRow } from "@/components/admin/dispute-row";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

const OPEN_STATUSES = new Set(["open", "investigating"]);

export default async function AdminDisputesPage() {
  const supabase = await createClient();

  const { data: disputes } = await supabase
    .from("disputes")
    .select(
      "id, booking_id, raised_by, category, description, status, resolution_notes, created_at",
    )
    .order("created_at", { ascending: false });

  const rows = disputes ?? [];
  const bookingIds = [...new Set(rows.map((d) => d.booking_id))];
  const raiserIds = [...new Set(rows.map((d) => d.raised_by))];

  const { data: bookings } = bookingIds.length
    ? await supabase
        .from("bookings")
        .select("id, barber_id, service_id, price, address_text, requested_at")
        .in("id", bookingIds)
    : { data: [] as { id: string; barber_id: string; service_id: string | null; price: number; address_text: string; requested_at: string }[] };

  const barberIds = [...new Set((bookings ?? []).map((b) => b.barber_id))];
  const serviceIds = [
    ...new Set((bookings ?? []).map((b) => b.service_id).filter(Boolean)),
  ] as string[];
  const profileIds = [...new Set([...raiserIds, ...barberIds])];

  const [{ data: profiles }, { data: services }] = await Promise.all([
    profileIds.length
      ? supabase.from("profiles").select("id, full_name").in("id", profileIds)
      : Promise.resolve({ data: [] as { id: string; full_name: string | null }[] }),
    serviceIds.length
      ? supabase.from("services").select("id, name").in("id", serviceIds)
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
  ]);

  const bookingById = new Map((bookings ?? []).map((b) => [b.id, b]));
  const nameById = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));
  const serviceNameById = new Map((services ?? []).map((s) => [s.id, s.name]));

  const openDisputes = rows.filter((d) => OPEN_STATUSES.has(d.status));
  const resolvedDisputes = rows.filter((d) => !OPEN_STATUSES.has(d.status));

  function renderRows(list: typeof rows) {
    if (list.length === 0) {
      return (
        <p className="text-sm text-muted-foreground">Nothing here.</p>
      );
    }
    return (
      <div className="flex flex-col gap-3">
        {list.map((d) => {
          const booking = bookingById.get(d.booking_id);
          return (
            <DisputeRow
              key={d.id}
              disputeId={d.id}
              category={d.category}
              description={d.description}
              status={d.status}
              resolutionNotes={d.resolution_notes}
              createdAt={d.created_at}
              reporterName={nameById.get(d.raised_by) ?? "Someone"}
              barberName={booking ? nameById.get(booking.barber_id) ?? "Barber" : null}
              serviceName={
                booking?.service_id ? serviceNameById.get(booking.service_id) ?? null : null
              }
              bookingPrice={booking?.price ?? null}
              bookingAddress={booking?.address_text ?? null}
            />
          );
        })}
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-semibold">Disputes</h1>
        <p className="text-sm text-muted-foreground">
          Reports raised by customers and barbers on a booking.
        </p>
      </div>

      <Tabs defaultValue="open">
        <TabsList>
          <TabsTrigger value="open">Open ({openDisputes.length})</TabsTrigger>
          <TabsTrigger value="resolved">Resolved ({resolvedDisputes.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="open" className="mt-4">
          {renderRows(openDisputes)}
        </TabsContent>
        <TabsContent value="resolved" className="mt-4">
          {renderRows(resolvedDisputes)}
        </TabsContent>
      </Tabs>
    </div>
  );
}
