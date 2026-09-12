import Form from "next/form";
import Link from "next/link";
import { PhoneIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  DOCUMENT_KINDS,
  DOCUMENTS_BUCKET,
  REQUIRED_DOCUMENT_COUNT,
  REQUIRED_DOCUMENT_KINDS,
} from "@/lib/barber-documents";
import { formatAgo, formatArea, formatPeso, formatShortDate, nowMs } from "@/lib/format";
import { initials } from "@/lib/initials";
import { readSettings } from "@/lib/platform-settings";
import { cn } from "@/lib/utils";
import { BarberReviewActions } from "@/components/admin/barber-review-actions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { SectionLabel } from "@/components/ui/section-label";

const TABS = [
  { value: "pending", label: "Pending" },
  { value: "verified", label: "Verified" },
  { value: "rejected", label: "Rejected" },
  { value: "wallet", label: "Negative wallet" },
] as const;

type Tab = (typeof TABS)[number]["value"];

const STATUS_CHIP: Record<string, string> = {
  pending: "PENDING REVIEW",
  needs_info: "WAITING ON BARBER",
  verified: "VERIFIED",
  rejected: "REJECTED",
};

type BarberRow = {
  id: string;
  verification_status: string;
  base_address: string | null;
  created_at: string;
  verified_at: string | null;
  token_balance: number;
  service_radius_km: number | null;
  rating_avg: number;
  rating_count: number;
  is_available: boolean;
};

type DocRow = { barber_id: string; kind: string; storage_path: string; uploaded_at: string };

function inTab(b: BarberRow, tab: Tab, minWallet: number) {
  if (tab === "pending") return b.verification_status === "pending" || b.verification_status === "needs_info";
  if (tab === "wallet") return Number(b.token_balance) < minWallet;
  return b.verification_status === tab;
}

// Wireframes A2 (web: list and reviewer side by side, so approving seven
// barbers isn't seven page loads) and A5 (phone: one at a time, with a
// skip, so a backlog can be cleared from a phone).
export default async function AdminBarbersPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; q?: string; id?: string }>;
}) {
  const params = await searchParams;
  const tab: Tab = TABS.find((t) => t.value === params.tab)?.value ?? "pending";
  const query = (params.q ?? "").trim();
  const now = nowMs();
  const supabase = await createClient();
  const settings = await readSettings(supabase);
  const minWallet = settings.min_wallet_to_go_online;

  const { data: barberRows } = await supabase
    .from("barber_profiles")
    .select(
      "id, verification_status, base_address, created_at, verified_at, token_balance, service_radius_km, rating_avg, rating_count, is_available",
    );
  const barbers = (barberRows as BarberRow[] | null) ?? [];
  const ids = barbers.map((b) => b.id);

  const [{ data: profiles }, { data: docRows }] = await Promise.all([
    ids.length
      ? supabase.from("profiles").select("id, full_name, phone, avatar_url").in("id", ids)
      : Promise.resolve({
          data: [] as {
            id: string;
            full_name: string | null;
            phone: string | null;
            avatar_url: string | null;
          }[],
        }),
    ids.length
      ? supabase
          .from("barber_documents")
          .select("barber_id, kind, storage_path, uploaded_at")
          .in("barber_id", ids)
      : Promise.resolve({ data: [] as DocRow[] }),
  ]);

  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));
  const docsByBarber = new Map<string, DocRow[]>();
  for (const d of (docRows as DocRow[] | null) ?? []) {
    docsByBarber.set(d.barber_id, [...(docsByBarber.get(d.barber_id) ?? []), d]);
  }

  const counts = Object.fromEntries(
    TABS.map((t) => [t.value, barbers.filter((b) => inTab(b, t.value, minWallet)).length]),
  ) as Record<Tab, number>;

  const needle = query.toLowerCase();
  const digits = query.replace(/\D/g, "");
  const list = barbers
    .filter((b) => inTab(b, tab, minWallet))
    .map((b) => {
      const profile = profileById.get(b.id);
      const docs = docsByBarber.get(b.id) ?? [];
      const lastUpload = docs.reduce<string | null>(
        (latest, d) => (!latest || d.uploaded_at > latest ? d.uploaded_at : latest),
        null,
      );
      return {
        ...b,
        name: profile?.full_name ?? "Unnamed barber",
        phone: profile?.phone ?? null,
        avatarUrl: profile?.avatar_url ?? null,
        docs,
        requiredDocs: docs.filter((d) => REQUIRED_DOCUMENT_KINDS.has(d.kind)).length,
        submittedAt: lastUpload ?? b.created_at,
      };
    })
    .filter(
      (b) =>
        !query ||
        b.name.toLowerCase().includes(needle) ||
        (digits.length > 0 && (b.phone ?? "").replace(/\D/g, "").includes(digits)),
    )
    .sort((a, b) => {
      if (tab === "pending") return a.submittedAt.localeCompare(b.submittedAt);
      if (tab === "verified") return (b.verified_at ?? "").localeCompare(a.verified_at ?? "");
      if (tab === "wallet") return Number(a.token_balance) - Number(b.token_balance);
      return b.created_at.localeCompare(a.created_at);
    });

  const found = params.id ? list.findIndex((b) => b.id === params.id) : -1;
  const index = found >= 0 ? found : 0;
  const selected = list[index] ?? null;
  const next = list[index + 1] ?? null;

  function hrefFor(overrides: { tab?: Tab; id?: string | null }) {
    const sp = new URLSearchParams();
    sp.set("tab", overrides.tab ?? tab);
    if (query && !overrides.tab) sp.set("q", query);
    if (overrides.id) sp.set("id", overrides.id);
    return `/admin/barbers?${sp.toString()}`;
  }

  const detail = selected
    ? await Promise.all([
        supabase
          .from("services")
          .select("id", { count: "exact", head: true })
          .eq("barber_id", selected.id)
          .eq("is_active", true),
        supabase
          .from("barber_portfolio")
          .select("id", { count: "exact", head: true })
          .eq("barber_id", selected.id),
        supabase
          .from("bookings")
          .select("id", { count: "exact", head: true })
          .eq("barber_id", selected.id)
          .eq("status", "completed"),
        supabase
          .from("barber_reviews")
          .select("admin_note, info_request")
          .eq("barber_id", selected.id)
          .maybeSingle(),
        selected.docs.length
          ? supabase.storage
              .from(DOCUMENTS_BUCKET)
              .createSignedUrls(
                selected.docs.map((d) => d.storage_path),
                600,
              )
          : Promise.resolve({ data: [] as { path: string | null; signedUrl: string }[] }),
      ])
    : null;

  const [servicesResult, portfolioResult, jobsResult, reviewResult, signedResult] = detail ?? [];
  const signedUrlByPath = new Map(
    (signedResult?.data ?? []).map((s) => [s.path ?? "", s.signedUrl]),
  );
  const tabLabel = TABS.find((t) => t.value === tab)?.label ?? "Barbers";
  const secondColumn = tab === "verified" ? "Verified" : "Submitted";
  const fourthColumn = tab === "verified" || tab === "wallet" ? "Wallet" : "Docs";

  return (
    <div className="flex flex-1 flex-col lg:grid lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="flex min-w-0 flex-col gap-4 p-4 sm:p-[22px] lg:border-r lg:border-border">
        <div className="flex flex-wrap items-baseline justify-between gap-3.5">
          <h1 className="text-[25px] font-black">Barbers</h1>
          <Form action="/admin/barbers" className="w-full sm:w-auto">
            <input type="hidden" name="tab" value={tab} />
            <Input
              name="q"
              defaultValue={query}
              placeholder="Search name or phone…"
              aria-label="Search barbers by name or phone"
              className="h-10 border-[1.5px] border-outline sm:w-64"
            />
          </Form>
        </div>

        <nav aria-label="Barber status" className="-mx-4 flex gap-2 overflow-x-auto px-4 text-[13px] sm:mx-0 sm:px-0">
          {TABS.map((t) => (
            <Link
              key={t.value}
              href={hrefFor({ tab: t.value })}
              aria-current={t.value === tab ? "page" : undefined}
              className={cn(
                "shrink-0 rounded-[5px] px-3 py-2",
                t.value === tab
                  ? "border-2 border-primary font-bold"
                  : "border-[1.5px] border-border text-muted-foreground hover:text-foreground",
              )}
            >
              {t.label} {counts[t.value]}
            </Link>
          ))}
        </nav>

        <div className="hidden overflow-hidden rounded-lg border-[1.5px] border-outline lg:block">
          <div className="grid grid-cols-[minmax(0,2fr)_1fr_1fr_1fr] gap-3 border-b-[1.5px] border-outline bg-muted px-3.5 py-2.5 text-xs font-bold tracking-[0.1em] text-muted-foreground uppercase">
            <span>Barber</span>
            <span>{secondColumn}</span>
            <span>Area</span>
            <span>{fourthColumn}</span>
          </div>
          {list.length === 0 ? (
            <p className="px-3.5 py-6 text-sm text-muted-foreground">
              {query ? `No barbers match "${query}".` : "Nobody here."}
            </p>
          ) : (
            <ul>
              {list.map((b) => (
                <li key={b.id} className="border-b border-border last:border-b-0">
                  <Link
                    href={hrefFor({ id: b.id })}
                    scroll={false}
                    aria-current={b.id === selected?.id ? "true" : undefined}
                    className={cn(
                      "grid grid-cols-[minmax(0,2fr)_1fr_1fr_1fr] items-center gap-3 px-3.5 py-3 text-sm transition-colors",
                      b.id === selected?.id ? "bg-primary/5" : "hover:bg-muted",
                    )}
                  >
                    <span className="flex min-w-0 items-center gap-2.5">
                      <Avatar className="size-8">
                        {b.avatarUrl && <AvatarImage src={b.avatarUrl} alt="" />}
                        <AvatarFallback className="text-xs">{initials(b.name)}</AvatarFallback>
                      </Avatar>
                      <span className="truncate font-semibold">{b.name}</span>
                    </span>
                    <span className="text-muted-foreground">
                      {tab === "verified"
                        ? b.verified_at
                          ? formatShortDate(b.verified_at)
                          : "—"
                        : formatAgo(b.submittedAt, now)}
                    </span>
                    <span className="truncate text-muted-foreground">{formatArea(b.base_address)}</span>
                    {fourthColumn === "Wallet" ? (
                      <span
                        className={cn(
                          "font-semibold",
                          Number(b.token_balance) < minWallet && "text-primary",
                        )}
                      >
                        {formatPeso(Number(b.token_balance))}
                      </span>
                    ) : (
                      <span
                        className={cn(
                          "font-semibold",
                          b.requiredDocs < REQUIRED_DOCUMENT_COUNT && "text-primary",
                        )}
                      >
                        {b.requiredDocs} of {REQUIRED_DOCUMENT_COUNT}
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <aside className="flex flex-col gap-3.5 border-t border-border bg-muted p-4 sm:p-[22px] lg:border-t-0">
        {selected ? (
          <>
            <div className="hidden lg:block">
              <SectionLabel>Review</SectionLabel>
            </div>
            <div className="lg:hidden">
              <SectionLabel>
                {tab === "pending" ? "Verification" : tabLabel} · {index + 1} of {list.length}
              </SectionLabel>
            </div>

            <div className="flex items-center gap-3">
              <Avatar className="size-14">
                {selected.avatarUrl && <AvatarImage src={selected.avatarUrl} alt="" />}
                <AvatarFallback>{initials(selected.name)}</AvatarFallback>
              </Avatar>
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="truncate text-[17px] font-bold">{selected.name}</span>
                {selected.phone ? (
                  <a href={`tel:${selected.phone}`} className="flex items-center gap-1 text-sm text-muted-foreground hover:underline">
                    <PhoneIcon className="size-3.5" aria-hidden />
                    {selected.phone}
                  </a>
                ) : (
                  <span className="text-sm text-muted-foreground">No phone on file</span>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant={selected.verification_status === "verified" ? "default" : "outline"}
                className="h-6 px-2"
              >
                {STATUS_CHIP[selected.verification_status] ?? selected.verification_status}
              </Badge>
              {selected.is_available && (
                <Badge variant="primary" className="h-6 px-2">
                  ONLINE
                </Badge>
              )}
            </div>

            {selected.verification_status === "needs_info" && reviewResult?.data?.info_request && (
              <p className="rounded-md border-[1.5px] border-outline bg-background px-3 py-2 text-sm">
                <span className="font-semibold">Asked: </span>
                {reviewResult.data.info_request}
              </p>
            )}

            <div className="flex flex-col gap-2">
              <span className="text-[13px] font-semibold text-muted-foreground">
                Documents · {selected.requiredDocs} of {REQUIRED_DOCUMENT_COUNT}
              </span>
              <div className="grid grid-cols-2 gap-2">
                {DOCUMENT_KINDS.map((d) => {
                  const doc = selected.docs.find((x) => x.kind === d.kind);
                  const url = doc ? signedUrlByPath.get(doc.storage_path) : undefined;
                  return url ? (
                    <a
                      key={d.kind}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="relative block aspect-[4/3] overflow-hidden rounded-[5px] border border-input bg-placeholder"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt={`${d.label} — ${selected.name}`} className="size-full object-cover" />
                      <span className="absolute inset-x-0 bottom-0 bg-foreground/75 px-2 py-1 text-[11px] font-semibold text-background">
                        {d.label}
                      </span>
                    </a>
                  ) : (
                    <div
                      key={d.kind}
                      className="flex aspect-[4/3] flex-col items-center justify-center gap-0.5 rounded-[5px] border border-dashed border-input bg-placeholder text-center text-[11px]"
                    >
                      <span className="text-faint">{d.label}</span>
                      <span className={d.required ? "font-semibold text-primary" : "text-faint"}>
                        {d.required ? "Missing" : "Optional"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <dl className="flex flex-col gap-1.5 text-sm">
              {[
                ["Services listed", String(servicesResult?.count ?? 0)],
                ["Portfolio photos", String(portfolioResult?.count ?? 0)],
                ["Radius", selected.service_radius_km != null ? `${selected.service_radius_km} km` : "—"],
                ["Area", formatArea(selected.base_address)],
                ["Jobs done", String(jobsResult?.count ?? 0)],
                [
                  "Rating",
                  selected.rating_count > 0
                    ? `★ ${Number(selected.rating_avg).toFixed(1)} (${selected.rating_count})`
                    : "—",
                ],
                ["Wallet", formatPeso(Number(selected.token_balance))],
                ["Submitted", formatAgo(selected.submittedAt, now)],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd className="text-right font-semibold">{value}</dd>
                </div>
              ))}
            </dl>

            <BarberReviewActions
              key={selected.id}
              barberId={selected.id}
              barberName={selected.name}
              status={selected.verification_status}
              initialNote={reviewResult?.data?.admin_note ?? null}
              initialRequest={reviewResult?.data?.info_request ?? null}
              nextHref={next ? hrefFor({ id: next.id }) : null}
            />

            {next && (
              <Link
                href={hrefFor({ id: next.id })}
                scroll={false}
                className="self-center text-sm font-semibold text-muted-foreground lg:hidden"
              >
                Skip to next ›
              </Link>
            )}
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            {tab === "pending" ? "No applications waiting — you're caught up." : "Nobody to review here."}
          </p>
        )}
      </aside>
    </div>
  );
}
