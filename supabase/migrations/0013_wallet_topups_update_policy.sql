-- Missing from 0012: the barber needs to update their own top-up's
-- status for the simulated (no-PayMongo-keys) payment path in
-- app/api/payments/topup/route.ts. In production this row would
-- instead be settled by the webhook via the service-role client,
-- which bypasses RLS entirely — this policy only matters for dev.
create policy "wallet_topups_owner_update" on wallet_topups for update
  using (auth.uid() = barber_id)
  with check (auth.uid() = barber_id);
