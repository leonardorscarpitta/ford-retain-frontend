"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ViewTransition } from "react";
import { CalendarIcon, GaugeIcon, PinIcon } from "./icons";

const links = [
  { href: "/", label: "Dashboard", Icon: GaugeIcon },
  { href: "/schedule", label: "Schedule", Icon: CalendarIcon },
  { href: "/dealerships", label: "Dealerships", Icon: PinIcon },
] as const;

export function Nav() {
  const pathname = usePathname();
  return (
    <nav className="nav" aria-label="Main">
      {links.map(({ href, label, Icon }) => {
        const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link key={href} href={href} className="nav-link" aria-current={active ? "page" : undefined}>
            {active && (
              // Same name on every link: the pill morphs to the new tab on navigation.
              <ViewTransition name="nav-pill" share="nav-pill">
                <span className="nav-pill" />
              </ViewTransition>
            )}
            <Icon size={16} />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
