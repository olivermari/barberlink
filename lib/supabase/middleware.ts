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

  let role: UserRole | undefined;
  if (user && (protectedPrefix || isAuthPage)) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    role = profile?.role;
  }

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
      return redirectTo(roleHomePath(role));
    }
  }

  // already signed in — no reason to see the login/signup forms again
  if (isAuthPage && user && role) {
    return redirectTo(roleHomePath(role));
  }

  return supabaseResponse;
}
