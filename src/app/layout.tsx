import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ford Retain",
  description: "Vehicle health, maintenance alerts and dealership scheduling",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>
        <header className="topbar">
          <strong>Ford Retain</strong>
          <nav>
            <Link href="/">Dashboard</Link>
            <Link href="/schedule">Schedule</Link>
            <Link href="/dealerships">Dealerships</Link>
          </nav>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
