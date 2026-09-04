import { createClient } from "@/lib/supabase/server";
import { PlatformFeeForm } from "@/components/admin/platform-fee-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const CANCELLED_STATUSES = new Set(["cancelled", "declined"]);

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-1 p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p className="text-2xl font-semibold">{value}</p>
      </CardContent>
    </Card>
  );
}

export default async function AdminAnalyticsPage() {
  const supabase = await createClient();

  const [
    { data: bookings },
    { data: barbers },
    { count: customerCount },
    { data: reviews },
    { data: feeSetting },
    { data: policySetting },
  ] = await Promise.all([
    supabase
      .from("bookings")
      .select("id, status, price, platform_fee, payment_status, barber_id"),
    supabase.from("barber_profiles").select("id, verification_status, is_available"),
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "customer"),
    supabase.from("reviews").select("rating"),
    supabase.from("platform_settings").select("value").eq("key", "fee_percentage").single(),
    supabase.from("platform_settings").select("value").eq("key", "policy_text").single(),
  ]);

  const rows = bookings ?? [];
  const paidRows = rows.filter((b) => b.payment_status === "paid");
  const completedCount = rows.filter((b) => b.status === "completed").length;
  const cancelledCount = rows.filter((b) => CANCELLED_STATUSES.has(b.status)).length;
  const grossRevenue = paidRows.reduce((sum, b) => sum + b.price, 0);
  const platformRevenue = paidRows.reduce((sum, b) => sum + b.platform_fee, 0);

  const allBarbers = barbers ?? [];
  const verifiedCount = allBarbers.filter((b) => b.verification_status === "verified").length;
  const onlineCount = allBarbers.filter((b) => b.is_available).length;

  const allReviews = reviews ?? [];
  const avgRating = allReviews.length
    ? allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length
    : null;

  const revenueByBarber = new Map<string, { revenue: number; count: number }>();
  for (const b of paidRows) {
    if (b.status !== "completed") continue;
    const entry = revenueByBarber.get(b.barber_id) ?? { revenue: 0, count: 0 };
    entry.revenue += b.price;
    entry.count += 1;
    revenueByBarber.set(b.barber_id, entry);
  }
  const topBarberIds = [...revenueByBarber.entries()]
    .sort((a, b) => b[1].revenue - a[1].revenue)
    .slice(0, 5);
  const { data: topBarberProfiles } = topBarberIds.length
    ? await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", topBarberIds.map(([id]) => id))
    : { data: [] as { id: string; full_name: string | null }[] };
  const barberName = new Map((topBarberProfiles ?? []).map((p) => [p.id, p.full_name]));

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-semibold">Analytics</h1>
        <p className="text-sm text-muted-foreground">
          Platform-wide activity and revenue.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard label="Bookings" value={String(rows.length)} />
        <StatCard label="Completed" value={String(completedCount)} />
        <StatCard label="Cancelled" value={String(cancelledCount)} />
        <StatCard label="Gross revenue" value={`₱${grossRevenue.toLocaleString()}`} />
        <StatCard label="Platform revenue" value={`₱${platformRevenue.toLocaleString()}`} />
        <StatCard
          label="Avg rating"
          value={avgRating != null ? `★ ${avgRating.toFixed(1)}` : "—"}
        />
        <StatCard label="Customers" value={String(customerCount ?? 0)} />
        <StatCard
          label="Barbers"
          value={`${allBarbers.length} (${verifiedCount} verified)`}
        />
        <StatCard label="Online now" value={String(onlineCount)} />
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Top barbers
        </h2>
        {topBarberIds.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No completed, paid bookings yet.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Barber</TableHead>
                <TableHead className="text-right">Jobs</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topBarberIds.map(([id, stats]) => (
                <TableRow key={id}>
                  <TableCell>{barberName.get(id) ?? "Barber"}</TableCell>
                  <TableCell className="text-right">{stats.count}</TableCell>
                  <TableCell className="text-right">
                    ₱{stats.revenue.toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Platform settings</CardTitle>
        </CardHeader>
        <CardContent>
          <PlatformFeeForm
            initialFeePercent={Number(feeSetting?.value ?? 25)}
            initialPolicyText={String(policySetting?.value ?? "")}
          />
        </CardContent>
      </Card>
    </div>
  );
}
