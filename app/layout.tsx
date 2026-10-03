import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "ShelfReady · phone photo to product listing",
  description:
    "Upload a rough phone photo and get a safe, studio-quality, ready-to-sell listing for every marketplace, powered by Cloudinary AI.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen antialiased">
        <header className="sticky top-0 z-20 border-b border-line bg-white/85 backdrop-blur">
          <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
            <Link href="/" className="flex items-center gap-2 text-lg font-extrabold tracking-tight">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand text-white">S</span>
              <span className="hidden min-[400px]:inline">ShelfReady</span>
            </Link>
            <div className="flex items-center gap-0.5 whitespace-nowrap text-xs font-medium sm:gap-1 sm:text-sm">
              <Link href="/catalog?drafts=1" className="rounded-lg px-2 py-2 hover:bg-stone-100 sm:px-3">
                My listings
              </Link>
              <Link href="/catalog" className="rounded-lg px-2 py-2 hover:bg-stone-100 sm:px-3">
                Storefront
              </Link>
              <Link href="/" className="rounded-lg bg-ink px-2 py-2 text-white hover:bg-stone-700 sm:px-3">
                New listing
              </Link>
            </div>
          </nav>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
        <footer className="mx-auto max-w-6xl px-4 pb-10 pt-6 text-xs text-muted">
          Built for Pixels to Products, the Cloudinary AI Hackathon 2026. Every image is stored,
          checked, transformed and delivered by Cloudinary.
        </footer>
      </body>
    </html>
  );
}
