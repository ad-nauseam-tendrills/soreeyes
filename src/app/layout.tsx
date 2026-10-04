import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";
import { APP_VERSION } from "@/lib/version";

export const metadata: Metadata = {
  title: { default: "Sore Eyes", template: "%s · Sore Eyes" },
  description: "Private practice companion.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f5f1e8",
};

const NAV = [
  { href: "/", label: "Today" },
  { href: "/course/aae", label: "Courses" },
  { href: "/queue", label: "Queue" },
  { href: "/journal", label: "Error Journal" },
  { href: "/history", label: "History" },
  { href: "/print", label: "Print Center" },
  { href: "/materials", label: "Materials" },
  { href: "/data", label: "Data" },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:bg-card focus:px-3 focus:py-2">
          Skip to content
        </a>
        <header className="no-print border-b border-rule">
            <div className="mx-auto flex max-w-5xl flex-wrap items-baseline justify-between gap-x-6 gap-y-2 px-4 py-3 sm:px-6">
              <Link href="/" className="font-serif text-lg tracking-[0.2em] no-underline">
                SORE EYES
              </Link>
              <nav aria-label="Main" className="-mx-1 flex flex-wrap gap-x-1 text-sm">
                {NAV.map((n) => (
                  <Link key={n.href} href={n.href} className="rounded-sm px-2 py-2 text-graphite no-underline hover:bg-paper-deep hover:text-ink">
                    {n.label}
                  </Link>
                ))}
              </nav>
            </div>
          </header>
        <main id="main" className="mx-auto max-w-5xl px-4 pb-24 pt-8 sm:px-6">
          {children}
        </main>
        <footer className="no-print mx-auto max-w-5xl px-4 pb-8 text-xs text-pencil sm:px-6">
          Private study companion · {APP_VERSION}
        </footer>
      </body>
    </html>
  );
}
