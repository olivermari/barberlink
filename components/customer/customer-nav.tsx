"use client";

import { CompassIcon, CalendarCheckIcon, UserIcon } from "lucide-react";
import { NavLinks } from "@/components/nav-links";
import { BottomTabBar } from "@/components/bottom-tab-bar";

// Icon components aren't serializable across the server/client
// boundary, so this list — and the icons in it — has to be built
// client-side, not passed down as a prop from the (server) layout.
export const CUSTOMER_NAV = [
  { href: "/customer", label: "Book", icon: CompassIcon },
  { href: "/customer/bookings", label: "Bookings", icon: CalendarCheckIcon },
  { href: "/customer/profile", label: "Account", icon: UserIcon },
];

export function CustomerSubnav() {
  return <NavLinks links={CUSTOMER_NAV} />;
}

export function CustomerTabbar() {
  return <BottomTabBar links={CUSTOMER_NAV} />;
}
