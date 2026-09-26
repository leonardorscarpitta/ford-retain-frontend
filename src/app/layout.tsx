import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Link from "next/link";
import { Nav } from "@/components/nav";
import { VehicleSwitcher } from "@/components/vehicle-switcher";
import { logout } from "@/app/actions";
import { getGarage } from "@/lib/garage";
import { getUser } from "@/lib/session";
import "./globals.css";

const sans = Inter({ variable: "--font-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Ford Retain",
  description: "Vehicle health, maintenance alerts and dealership scheduling",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Signed out (or API down): just the brand. Pages handle their own errors.
  const user = await getUser();
  const garage = user ? await getGarage().catch(() => null) : null;
  return (
    <html lang="en" className={sans.variable}>
      <body>
        <header className="topbar">
          <Link href="/" className="brand">
            <span className="brand-mark" aria-hidden />
            <span>Ford Retain</span>
          </Link>
          {user && (
            <>
              <Nav />
              <div className="account">
                {garage && <VehicleSwitcher vehicles={garage.vehicles} current={garage.current} />}
                <span className="user" title={user.email}>
                  {user.name}
                </span>
                <form action={logout}>
                  <button type="submit" className="link">
                    Sign out
                  </button>
                </form>
              </div>
            </>
          )}
        </header>
        <main className="main">{children}</main>
      </body>
    </html>
  );
}
