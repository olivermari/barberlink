import Link from "next/link";
import { roleHomePath, type UserRole } from "@/lib/role-path";
import { SignOutButton } from "@/components/sign-out-button";

const ROLE_LABEL: Record<UserRole, string> = {
  customer: "Customer",
  barber: "Barber",
  admin: "Admin",
};

export function AppShell({
  role,
  fullName,
  children,
}: {
  role: UserRole;
  fullName: string | null;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between border-b px-4 py-3 sm:px-6">
        <Link
          href={roleHomePath(role)}
          className="font-bold tracking-tight"
        >
          Barbero2Go
        </Link>
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
            {ROLE_LABEL[role]}
          </span>
          <span className="hidden text-sm text-muted-foreground sm:inline">
            {fullName ?? ""}
          </span>
          <SignOutButton />
        </div>
      </header>
      <main className="flex flex-1 flex-col">{children}</main>
    </div>
  );
}
