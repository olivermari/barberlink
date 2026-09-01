import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/supabase/require-profile";
import { AvailabilityToggle } from "@/components/barber/availability-toggle";
import { BookingActionButtons } from "@/components/barber/booking-action-buttons";
import { JobMap } from "@/components/barber/job-map-lazy";
import { BookingChat } from "@/components/chat/booking-chat";
import { MarkPaidButton } from "@/components/barber/mark-paid-button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const ACTIVE_STATUSES = ["pending", "accepted", "on_the_way", "in_service"];

const STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  accepted: "Accepted",
  on_the_way: "On the way",
  in_service: "In service",
};

type BookingRow = {
  id: string;
  requested_at: string;
  address_text: string;
  address_lat: number;
  address_lng: number;
  status: string;
  price: number;
  customer_id: string;
  service_id: string | null;
  payment_method: string | null;
  payment_status: string;
};

const PAYMENT_LABEL: Record<string, string> = {
  paid: "Paid",
  pending: "Pending",
  failed: "Payment failed",
  refunded: "Refunded",
};

export default async function BarberDashboardPage() {
  const { user } = await requireProfile();
  const supabase = await createClient();

  const [{ data: barberProfile }, { data: activeBookings }, { data: queuedBookings }] =
    await Promise.all([
      supabase
        .from("barber_profiles")
        .select("is_available, verification_status, current_lat, current_lng, token_balance")
        .eq("id", user.id)
        .single(),
      supabase
        .from("bookings")
        .select(
          "id, requested_at, address_text, address_lat, address_lng, status, price, customer_id, service_id, payment_method, payment_status",
        )
        .eq("barber_id", user.id)
        .in("status", ACTIVE_STATUSES)
        .order("requested_at", { ascending: true })
        .limit(1),
      supabase
        .from("bookings")
        .select(
          "id, requested_at, address_text, address_lat, address_lng, status, price, customer_id, service_id, payment_method, payment_status",
        )
        .eq("barber_id", user.id)
        .eq("status", "queued")
        .order("requested_at", { ascending: true }),
    ]);

  const activeBooking = (activeBookings as BookingRow[] | null)?.[0] ?? null;
  const queue = (queuedBookings as BookingRow[] | null) ?? [];
  const allBookings = activeBooking ? [activeBooking, ...queue] : queue;

  const customerIds = [...new Set(allBookings.map((b) => b.customer_id))];
  const serviceIds = [
    ...new Set(allBookings.map((b) => b.service_id).filter(Boolean)),
  ] as string[];

  const [{ data: customers }, { data: services }] = await Promise.all([
    customerIds.length
      ? supabase.from("profiles").select("id, full_name").in("id", customerIds)
      : Promise.resolve({ data: [] as { id: string; full_name: string | null }[] }),
    serviceIds.length
      ? supabase.from("services").select("id, name").in("id", serviceIds)
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
  ]);

  const customerName = new Map((customers ?? []).map((c) => [c.id, c.full_name]));
  const serviceName = new Map((services ?? []).map((s) => [s.id, s.name]));

  const verified = barberProfile?.verification_status === "verified";

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          {barberProfile && (
            <p
              className={
                barberProfile.token_balance < 0
                  ? "text-sm text-destructive"
                  : "text-sm text-muted-foreground"
              }
            >
              Balance: ₱{barberProfile.token_balance}
            </p>
          )}
        </div>
        {barberProfile && (
          <AvailabilityToggle
            barberId={user.id}
            initialIsAvailable={barberProfile.is_available}
            verified={verified}
          />
        )}
      </div>

      {!verified && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-sm">
          {barberProfile?.verification_status === "rejected"
            ? "Your verification was rejected. Contact support for details."
            : "Your account is pending verification. You'll be able to go online once an admin approves you."}
        </div>
      )}

      <div>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Current job
        </h2>
        {activeBooking ? (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between text-base">
                {serviceName.get(activeBooking.service_id ?? "") ?? "Service"}
                <div className="flex items-center gap-2">
                  <Badge variant={activeBooking.payment_status === "paid" ? "default" : "outline"}>
                    {PAYMENT_LABEL[activeBooking.payment_status] ?? activeBooking.payment_status}
                  </Badge>
                  <Badge variant="secondary">
                    {STATUS_LABEL[activeBooking.status] ?? activeBooking.status}
                  </Badge>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 text-sm text-muted-foreground">
              <p>with {customerName.get(activeBooking.customer_id) ?? "Customer"}</p>
              <p>{activeBooking.address_text}</p>
              <p>
                Requested {new Date(activeBooking.requested_at).toLocaleString()}
              </p>
              <p className="font-medium text-foreground">₱{activeBooking.price}</p>
              <JobMap
                customerLat={activeBooking.address_lat}
                customerLng={activeBooking.address_lng}
                customerLabel={customerName.get(activeBooking.customer_id) ?? "Customer"}
                barberLat={barberProfile?.current_lat}
                barberLng={barberProfile?.current_lng}
              />
              {/* Fixed above the bottom tab bar (h-16) on mobile, since
                  this is the one action a barber needs mid-job without
                  hunting for it — inline again on desktop where there's
                  no thumb-zone to design around. */}
              <div className="fixed inset-x-0 bottom-16 z-30 flex gap-2 border-t bg-background px-4 py-3 shadow-[0_-4px_12px_-6px_rgba(0,0,0,0.15)] sm:static sm:z-auto sm:mt-1 sm:flex-wrap sm:border-0 sm:bg-transparent sm:px-0 sm:py-0 sm:shadow-none">
                <BookingActionButtons
                  bookingId={activeBooking.id}
                  status={activeBooking.status}
                />
                {activeBooking.payment_method === "cod" &&
                  activeBooking.payment_status !== "paid" && (
                    <MarkPaidButton bookingId={activeBooking.id} />
                  )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <p className="text-sm text-muted-foreground">
            No active booking right now.
          </p>
        )}
      </div>

      {activeBooking && (
        <BookingChat
          bookingId={activeBooking.id}
          currentUserId={user.id}
          otherPartyLabel={customerName.get(activeBooking.customer_id) ?? "Customer"}
        />
      )}

      <div>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Queue ({queue.length})
        </h2>
        {queue.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing in queue.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {queue.map((b) => (
              <Card key={b.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">
                    {serviceName.get(b.service_id ?? "") ?? "Service"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-1 text-sm text-muted-foreground">
                  <p>with {customerName.get(b.customer_id) ?? "Customer"}</p>
                  <p>{b.address_text}</p>
                  <p className="font-medium text-foreground">₱{b.price}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
