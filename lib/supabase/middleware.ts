import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { roleHomePath, type UserRole } from "@/lib/role-path";

const ROLE_FOR_PREFIX: Record<string, UserRole> = {
  "/customer": "customer",
  "/barber": "barber",
  "/admin": "admin",
};

function matchProtectedPrefix(pathname: string) {
  return Object.keys(ROLE_FOR_PREFIX).find(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Refreshes the auth token cookie if expired.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const protectedPrefix = matchProtectedPrefix(pathname);
  const isAuthPage = pathname === "/login" || pathname === "/signup";
  const isTwoFactorPage = pathname === "/two-factor";

  let role: UserRole | undefined;
  if (user && (protectedPrefix || isAuthPage || isTwoFactorPage)) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    role = profile?.role;
  }

  // Admins sign in with a password AND an authenticator-app code. A session
  // that has only done the password step is aal1; it can't open /admin (and
  // the database won't treat it as admin either — see 0033).
  let adminHasSecondFactor = false;
  if (role === "admin") {
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    adminHasSecondFactor = aal?.currentLevel === "aal2";
  }
  const homeFor = (r: UserRole) =>
    r === "admin" && !adminHasSecondFactor ? "/two-factor" : roleHomePath(r);

  function redirectTo(pathname: string) {
    const redirectResponse = NextResponse.redirect(new URL(pathname, request.url));
    // carry over any refreshed auth cookies onto the redirect
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie);
    });
    return redirectResponse;
  }

  if (protectedPrefix) {
    if (!user) return redirectTo("/login");
    if (role && role !== ROLE_FOR_PREFIX[protectedPrefix]) {
      return redirectTo(homeFor(role));
    }
    if (role === "admin" && !adminHasSecondFactor) return redirectTo("/two-factor");
  }

  // The code step is only for admins who haven't passed it yet.
  if (isTwoFactorPage) {
    if (!user) return redirectTo("/login");
    if (role && (role !== "admin" || adminHasSecondFactor)) return redirectTo(roleHomePath(role));
  }

  // already signed in — no reason to see the login/signup forms again
  if (isAuthPage && user && role) {
    return redirectTo(homeFor(role));
  }

  return supabaseResponse;
}
