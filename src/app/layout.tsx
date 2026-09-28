import type { Metadata, Viewport } from "next";
import { Caprasimo, Figtree } from "next/font/google";
import Link from "next/link";
import { Utensils } from "lucide-react";
import { BottomTabBar, TopNavLinks } from "./NavLinks";
import "./globals.css";

const heading = Caprasimo({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-heading",
});

const body = Figtree({
  weight: ["400", "600", "700"],
  subsets: ["latin"],
  variable: "--font-body",
});

export const metadata: Metadata = {
  title: "Family Dinner Planner",
  description: "Plan dinners, save recipes, and generate grocery lists.",
  appleWebApp: { capable: true, title: "Dinner", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f9f4ed" },
    { media: "(prefers-color-scheme: dark)", color: "#211d19" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${heading.variable} ${body.variable} h-full antialiased`}
      style={
        {
          "--font-heading-next": "var(--font-heading)",
          "--font-body-next": "var(--font-body)",
        } as React.CSSProperties
      }
    >
      <body className="min-h-full flex flex-col bg-bg text-text">
        <header className="o-glass sticky top-0 z-40 border-b border-divider">
          <nav
            aria-label="Main"
            className="mx-auto flex h-14 max-w-[1200px] items-center justify-between px-4 md:h-16 md:px-6"
          >
            <Link href="/recipes" className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-on-accent">
                <Utensils strokeWidth={2.75} size={16} />
              </span>
              <span className="font-heading text-[19px]">Dinner Planner</span>
            </Link>
            <TopNavLinks />
          </nav>
        </header>
        <main className="app-main mx-auto w-full max-w-[1200px] flex-1 px-4 pt-5 md:px-6 md:pt-8">
          {children}
        </main>
        <BottomTabBar />
      </body>
    </html>
  );
}
