import { createClient } from "@/lib/supabase/server";
import { VerificationRow } from "@/components/admin/verification-row";

export default async function AdminVerificationQueue() {
  const supabase = await createClient();

  const { data: pending } = await supabase
    .from("barber_profiles")
    .select("id, bio, years_experience, base_address, id_document_url, created_at")
    .eq("verification_status", "pending")
    .order("created_at", { ascending: true });

  const barberIds = (pending ?? []).map((b) => b.id);
  const { data: names } = barberIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", barberIds)
    : { data: [] as { id: string; full_name: string | null }[] };
  const nameById = new Map((names ?? []).map((n) => [n.id, n.full_name]));

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-semibold">Verification queue</h1>
        <p className="text-sm text-muted-foreground">
          Barbers can&apos;t go online until approved here.
        </p>
      </div>

      {(!pending || pending.length === 0) && (
        <p className="text-sm text-muted-foreground">
          No applications waiting — you&apos;re caught up.
        </p>
      )}

      <div className="flex flex-col gap-3">
        {(pending ?? []).map((b) => (
          <VerificationRow
            key={b.id}
            barberId={b.id}
            fullName={nameById.get(b.id) ?? "Barber"}
            bio={b.bio}
            yearsExperience={b.years_experience}
            baseAddress={b.base_address}
            idDocumentUrl={b.id_document_url}
            submittedAt={b.created_at}
          />
        ))}
      </div>
    </div>
  );
}
