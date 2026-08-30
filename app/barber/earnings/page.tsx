import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/supabase/require-profile";
import { WalletTopupForm } from "@/components/barber/wallet-topup-form";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function describeEntry(type: string, amount: number) {
  if (type === "earned") return "Earned (online payment)";
  if (type === "adjustment") return amount < 0 ? "Cash commission owed" : "Wallet top-up";
  if (type === "withdrawal") return "Withdrawal";
  return type;
}

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

  const balance = barberProfile?.token_balance ?? 0;
  const owesCommission = balance < 0;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-4 sm:p-6">
      <h1 className="text-2xl font-semibold">Earnings</h1>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Token balance</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p
            className={cn(
              "text-2xl font-semibold",
              owesCommission && "text-destructive",
            )}
          >
            ₱{balance}
          </p>
          {owesCommission && (
            <p className="text-sm text-destructive">
              Cash jobs collect the platform&apos;s commission directly, so it comes
              out of your balance here instead. Top up to settle it — you can&apos;t
              go online again until your balance is ₱0 or higher.
            </p>
          )}
          <WalletTopupForm />
        </CardContent>
      </Card>

      <div>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          History
        </h2>
        {!ledger || ledger.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Earnings and commission activity will appear here once you complete
            jobs.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">₱</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ledger.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell>{new Date(entry.created_at).toLocaleString()}</TableCell>
                  <TableCell>{describeEntry(entry.type, entry.token_amount)}</TableCell>
                  <TableCell
                    className={cn(
                      "text-right",
                      entry.token_amount < 0 && "text-destructive",
                    )}
                  >
                    {entry.token_amount}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
