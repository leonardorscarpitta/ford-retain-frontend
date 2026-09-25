import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Link from "next/link";
import { Nav } from "@/components/nav";
import { VehicleSwitcher } from "@/components/vehicle-switcher";
import { getGarage } from "@/lib/garage";
import "./globals.css";

const sans = Inter({ variable: "--font-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Ford Retain",
  description: "Vehicle health, maintenance alerts and dealership scheduling",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // If the API is down, render without the switcher; the page's error boundary explains.
  const garage = await getGarage().catch(() => null);
  return (
    <html lang="en" className={sans.variable}>
      <body>
        <header className="topbar">
          <Link href="/" className="brand">
            <span className="brand-mark" aria-hidden />
            <span>Ford Retain</span>
          </Link>
          <Nav />
          {garage && <VehicleSwitcher vehicles={garage.vehicles} current={garage.current} />}
        </header>
        <main className="main">{children}</main>
      </body>
    </html>
  );
}
