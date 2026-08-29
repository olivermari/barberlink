import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/supabase/require-profile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const TYPE_LABEL: Record<string, string> = {
  earned: "Earned",
  adjustment: "Adjustment",
  withdrawal: "Withdrawal",
};

export default async function BarberEarningsPage() {
  const { user } = await requireProfile();
  const supabase = await createClient();

  const [{ data: barberProfile }, { data: ledger }] = await Promise.all([
    supabase
      .from("barber_profiles")
      .select("token_balance")
      .eq("id", user.id)
      .single(),
    supabase
      .from("token_ledger")
      .select("id, type, token_amount, created_at")
      .eq("barber_id", user.id)
      .order("created_at", { ascending: false }),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-4 sm:p-6">
      <h1 className="text-2xl font-semibold">Earnings</h1>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Token balance</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-semibold">
            {barberProfile?.token_balance ?? 0}
          </p>
        </CardContent>
      </Card>

      <div>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          History
        </h2>
        {!ledger || ledger.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Earnings will appear here once payments go live.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Tokens</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ledger.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell>{new Date(entry.created_at).toLocaleString()}</TableCell>
                  <TableCell>{TYPE_LABEL[entry.type] ?? entry.type}</TableCell>
                  <TableCell className="text-right">{entry.token_amount}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
