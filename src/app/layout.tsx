import type { Metadata } from "next";
import { Caprasimo, Figtree } from "next/font/google";
import Link from "next/link";
import NavLinks from "./NavLinks";
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
        <header className="border-b border-divider bg-neutral-100">
          <nav
            className="mx-auto flex max-w-[1200px] items-center justify-between"
            style={{ padding: "13.2px 26.4px" }}
          >
            <Link href="/recipes" className="font-heading text-[19px]">
              Dinner Planner
            </Link>
            <NavLinks />
          </nav>
        </header>
        <main className="mx-auto w-full max-w-[1200px] flex-1 p-6">
          {children}
        </main>
      </body>
    </html>
  );
}
