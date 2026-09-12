import Link from "next/link";
import { ChevronRightIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

// The phone tab bar's "More" (A4): everything past triage.
export default async function AdminMorePage() {
  const supabase = await createClient();
  const { count: openDisputes } = await supabase
    .from("disputes")
    .select("id", { count: "exact", head: true })
    .in("status", ["open", "investigating"]);

  const links = [
    { href: "/admin/pricing", label: "Services & pricing", detail: "Menu prices, commission, radius, wallet minimum" },
    {
      href: "/admin/disputes",
      label: "Disputes",
      detail: openDisputes ? `${openDisputes} open` : "None open",
    },
    { href: "/admin/coverage", label: "Coverage areas", detail: "Regions the platform serves" },
  ];

  return (
    <div className="flex flex-col gap-4 p-4">
      <h1 className="text-[25px] font-black">More</h1>
      <ul className="divide-y divide-border rounded-lg border-[1.5px] border-outline">
        {links.map((link) => (
          <li key={link.href}>
            <Link href={link.href} className="flex items-center justify-between gap-3 p-4">
              <span className="flex flex-col gap-0.5">
                <span className="text-base font-semibold">{link.label}</span>
                <span className="text-sm text-muted-foreground">{link.detail}</span>
              </span>
              <ChevronRightIcon className="size-4 text-muted-foreground" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
