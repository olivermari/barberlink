import Link from "next/link";
import { DownloadIcon, FileTextIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  APPLICATIONS_BUCKET,
  isImagePath,
  stageChip,
} from "@/lib/barber-applications";
import { formatAgo, formatShortDate, nowMs } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ApplicationStageForm } from "@/components/admin/application-stage-form";
import { Badge } from "@/components/ui/badge";
import { SectionLabel } from "@/components/ui/section-label";

const TABS = [
  { value: "new", label: "New", stages: ["submitted"] },
  { value: "progress", label: "In progress", stages: ["verifying", "interview_scheduled", "training"] },
  { value: "active", label: "Active", stages: ["active"] },
  { value: "not_yet", label: "Not yet", stages: ["not_yet"] },
] as const;

type Tab = (typeof TABS)[number]["value"];

type Application = {
  id: string;
  application_code: string;
  full_name: string;
  mobile: string;
  email: string;
  home_address: string;
  experience: string;
  portfolio_paths: string[];
  government_id_paths: string[];
  certificate_path: string;
  demo_video_path: string | null;
  status: string;
  created_at: string;
};

// Applications from the marketing site's barber-partner form. Everything
// here is read through is_admin() RLS (0034), so only a two-step admin
// session ever gets rows or signed URLs back.
export default async function AdminApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; id?: string }>;
}) {
  const params = await searchParams;
  const tab: Tab = TABS.find((t) => t.value === params.tab)?.value ?? "new";
  const supabase = await createClient();
  const now = nowMs();

  const { data } = await supabase
    .from("barber_applications")
    .select(
      "id, application_code, full_name, mobile, email, home_address, experience, portfolio_paths, government_id_paths, certificate_path, demo_video_path, status, created_at",
    )
    .order("created_at", { ascending: true });
  const all = (data as Application[] | null) ?? [];

  const counts = Object.fromEntries(
    TABS.map((t) => [t.value, all.filter((a) => (t.stages as readonly string[]).includes(a.status)).length]),
  ) as Record<Tab, number>;

  const activeTab = TABS.find((t) => t.value === tab)!;
  const list = all
    .filter((a) => (activeTab.stages as readonly string[]).includes(a.status))
    // Oldest first on the queue so nobody waits longest; newest first elsewhere.
    .sort((a, b) =>
      tab === "new" ? a.created_at.localeCompare(b.created_at) : b.created_at.localeCompare(a.created_at),
    );

  const selected = list.find((a) => a.id === params.id) ?? list[0] ?? null;

  const paths = selected
    ? [
        ...selected.portfolio_paths,
        ...selected.government_id_paths,
        selected.certificate_path,
        ...(selected.demo_video_path ? [selected.demo_video_path] : []),
      ]
    : [];
  // An hour, so the video can be watched without the link expiring mid-play.
  const { data: signed } = paths.length
    ? await supabase.storage.from(APPLICATIONS_BUCKET).createSignedUrls(paths, 3600)
    : { data: [] as { path: string | null; signedUrl: string }[] };
  const urlByPath = new Map((signed ?? []).map((s) => [s.path ?? "", s.signedUrl]));
  const videoUrl = selected?.demo_video_path ? urlByPath.get(selected.demo_video_path) : undefined;

  const hrefFor = (overrides: { tab?: Tab; id?: string }) => {
    const sp = new URLSearchParams();
    sp.set("tab", overrides.tab ?? tab);
    if (overrides.id) sp.set("id", overrides.id);
    return `/admin/applications?${sp.toString()}`;
  };

  return (
    <div className="flex flex-1 flex-col lg:grid lg:grid-cols-[minmax(0,1fr)_420px]">
      <div className="flex min-w-0 flex-col gap-4 p-4 sm:p-[22px] lg:border-r lg:border-border">
        <div>
          <h1 className="text-[25px] font-black">Barber applications</h1>
          <p className="text-sm text-muted-foreground">
            From the Barbero2Go.com barber-partner form. Moving someone to Active doesn&apos;t create
            their app account — that&apos;s still done by promoting them, as before.
          </p>
        </div>

        <nav aria-label="Application stages" className="flex flex-wrap gap-2">
          {TABS.map((t) => (
            <Link
              key={t.value}
              href={hrefFor({ tab: t.value })}
              aria-current={t.value === tab ? "page" : undefined}
              className={cn(
                "rounded-full border-[1.5px] px-3.5 py-1.5 text-sm font-semibold",
                t.value === tab
                  ? "border-foreground bg-foreground text-background"
                  : "border-outline text-muted-foreground hover:text-foreground",
              )}
            >
              {t.label} · {counts[t.value]}
            </Link>
          ))}
        </nav>

        {list.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {tab === "new" ? "No new applications — you're caught up." : "Nobody here yet."}
          </p>
        ) : (
          <ul className="divide-y divide-border rounded-lg border-[1.5px] border-outline">
            {list.map((a) => (
              <li key={a.id}>
                <Link
                  href={hrefFor({ id: a.id })}
                  aria-current={a.id === selected?.id ? "true" : undefined}
                  className={cn(
                    "flex items-center justify-between gap-3 p-3.5",
                    a.id === selected?.id && "bg-muted",
                  )}
                >
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="truncate text-base font-semibold">{a.full_name}</span>
                    <span className="truncate text-sm text-muted-foreground">
                      {a.application_code} · {a.experience} · {formatAgo(a.created_at, now)}
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    {!a.demo_video_path && (
                      <Badge variant="outline" className="h-6 px-2">
                        NO VIDEO
                      </Badge>
                    )}
                    <Badge variant={a.status === "submitted" ? "default" : "outline"} className="h-6 px-2">
                      {stageChip(a.status)}
                    </Badge>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <aside className="flex min-w-0 flex-col gap-5 p-4 sm:p-[22px]">
        {!selected ? (
          <p className="text-sm text-muted-foreground">Select an application to review it.</p>
        ) : (
          <>
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between gap-3">
                <h2 className="truncate text-xl font-black">{selected.full_name}</h2>
                <Badge className="h-6 shrink-0 px-2">{stageChip(selected.status)}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {selected.application_code} · applied {formatShortDate(selected.created_at)}
              </p>
            </div>

            <dl className="flex flex-col gap-2.5 rounded-lg border-[1.5px] border-outline p-3.5 text-sm">
              {[
                ["Mobile", selected.mobile],
                ["Email", selected.email],
                ["Address", selected.home_address],
                ["Experience", selected.experience],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd className="min-w-0 break-words text-right font-medium">{value}</dd>
                </div>
              ))}
            </dl>

            <section className="flex flex-col gap-2">
              <SectionLabel>Haircut demonstration</SectionLabel>
              {videoUrl ? (
                <>
                  <video
                    controls
                    preload="metadata"
                    playsInline
                    src={videoUrl}
                    className="aspect-video w-full rounded-lg border-[1.5px] border-outline bg-black"
                  />
                  <a
                    href={videoUrl}
                    download
                    className="inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-primary"
                  >
                    <DownloadIcon className="size-4" aria-hidden />
                    Download
                  </a>
                  <p className="text-xs text-muted-foreground">
                    Won&apos;t play? Some phones record in a format Chrome can&apos;t show — download it
                    and open it in another player.
                  </p>
                </>
              ) : (
                <p className="rounded-lg border-[1.5px] border-outline bg-muted p-3.5 text-sm text-muted-foreground">
                  No video — this application was sent before videos were required.
                </p>
              )}
            </section>

            <section className="flex flex-col gap-2">
              <SectionLabel>Stage</SectionLabel>
              <ApplicationStageForm applicationId={selected.id} stage={selected.status} />
            </section>

            <section className="flex flex-col gap-2">
              <SectionLabel>Portfolio · {selected.portfolio_paths.length}</SectionLabel>
              <div className="grid grid-cols-3 gap-1.5">
                {selected.portfolio_paths.map((p) => {
                  const url = urlByPath.get(p);
                  return url ? (
                    <a key={p} href={url} target="_blank" rel="noreferrer">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={url}
                        alt="Portfolio haircut"
                        className="aspect-square w-full rounded-[4px] border border-input object-cover"
                      />
                    </a>
                  ) : null;
                })}
              </div>
            </section>

            <section className="flex flex-col gap-2">
              <SectionLabel>Government ID and certificate</SectionLabel>
              <div className="grid grid-cols-3 gap-1.5">
                {[...selected.government_id_paths, selected.certificate_path].map((p) => {
                  const url = urlByPath.get(p);
                  if (!url) return null;
                  return (
                    <a
                      key={p}
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex aspect-square items-center justify-center overflow-hidden rounded-[4px] border border-input bg-muted"
                    >
                      {isImagePath(p) ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={url} alt="Document" className="size-full object-cover" />
                      ) : (
                        <span className="flex flex-col items-center gap-1 text-xs text-muted-foreground">
                          <FileTextIcon className="size-6" aria-hidden />
                          PDF
                        </span>
                      )}
                    </a>
                  );
                })}
              </div>
            </section>
          </>
        )}
      </aside>
    </div>
  );
}
