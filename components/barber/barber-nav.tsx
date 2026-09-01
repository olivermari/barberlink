"use client";

import { BriefcaseIcon, HistoryIcon, WalletIcon, UserIcon } from "lucide-react";
import { NavLinks } from "@/components/nav-links";
import { BottomTabBar } from "@/components/bottom-tab-bar";
import { useJobsBadge } from "@/components/barber/jobs-badge-provider";

export const BARBER_NAV = [
  { href: "/barber", label: "Jobs", icon: BriefcaseIcon },
  { href: "/barber/history", label: "History", icon: HistoryIcon },
  { href: "/barber/earnings", label: "Earnings", icon: WalletIcon },
  { href: "/barber/profile", label: "Profile", icon: UserIcon },
];

export function BarberSubnav() {
  const hasNewJob = useJobsBadge();
  return <NavLinks links={BARBER_NAV} badges={{ "/barber": hasNewJob }} />;
}

export function BarberTabbar() {
  const hasNewJob = useJobsBadge();
  return <BottomTabBar links={BARBER_NAV} badges={{ "/barber": hasNewJob }} />;
}
