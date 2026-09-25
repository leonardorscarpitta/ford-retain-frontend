import type { Metadata } from "next";
import { JetBrains_Mono, Space_Grotesk } from "next/font/google";
import Link from "next/link";
import { Nav } from "@/components/nav";
import { Spotlight } from "@/components/spotlight";
import "./globals.css";

const sans = Space_Grotesk({ variable: "--font-sans", subsets: ["latin"] });
const mono = JetBrains_Mono({ variable: "--font-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Ford Retain",
  description: "Vehicle health, maintenance alerts and dealership scheduling",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable}`}>
      <body>
        <div className="backdrop" aria-hidden>
          <div className="aurora a1" />
          <div className="aurora a2" />
          <div className="aurora a3" />
          <div className="grid-lines" />
          <div className="grain" />
        </div>
        <Spotlight />
        <header className="topbar">
          <Link href="/" className="brand">
            <span className="brand-mark" aria-hidden>
              <span />
            </span>
            <span>
              Ford <b>Retain</b>
            </span>
          </Link>
          <Nav />
          <span className="live-pill">
            <i className="live-dot" />
            Live telemetry
          </span>
        </header>
        <main className="main">{children}</main>
      </body>
    </html>
  );
}
