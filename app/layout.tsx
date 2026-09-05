import type { Metadata } from "next";
import { Oswald, IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const oswald = Oswald({
  variable: "--font-oswald",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const plexSans = IBM_Plex_Sans({
  variable: "--font-plex-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["500"],
});

export const metadata: Metadata = {
  title: "East End Gridiron Championship",
  description:
    "Live standings, power rankings, stat leaders, transactions, and league news for the East End Gridiron Championship.",
};

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/rankings", label: "Power Rankings" },
  { href: "/stats", label: "Stat Leaders" },
  { href: "/transactions", label: "Transactions" },
  { href: "/news", label: "News" },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${oswald.variable} ${plexSans.variable} ${plexMono.variable} h-full`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground antialiased">
        <header className="border-b border-border bg-surface/80 backdrop-blur sticky top-0 z-20">
          <div className="mx-auto max-w-5xl px-5 py-4 flex flex-wrap items-center justify-between gap-3">
            <Link href="/" className="flex items-baseline gap-2">
              <span className="font-heading font-bold text-lg tracking-tight text-foreground">
                East End Gridiron
              </span>
              <span className="font-heading text-xs uppercase tracking-[0.14em] text-accent">
                Championship
              </span>
            </Link>
            <nav className="flex flex-wrap gap-1 text-sm">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="px-3 py-1.5 rounded-md text-muted hover:text-foreground hover:bg-surface-raised transition-colors font-medium"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
        </header>

        <main className="flex-1 mx-auto w-full max-w-5xl px-5 py-8">{children}</main>

        <footer className="border-t border-border mt-12">
          <div className="mx-auto max-w-5xl px-5 py-6 text-xs text-muted flex flex-wrap justify-between gap-2">
            <span>East End Gridiron Championship</span>
            <span>Data via ESPN Fantasy Football</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
