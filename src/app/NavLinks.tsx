"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, CalendarDays, Carrot, ShoppingBasket } from "lucide-react";

const links = [
  { href: "/recipes", label: "Recipes", short: "Recipes", icon: BookOpen },
  { href: "/planner", label: "Planner", short: "Planner", icon: CalendarDays },
  { href: "/grocery-list", label: "Grocery list", short: "Groceries", icon: ShoppingBasket },
  { href: "/ingredients", label: "Ingredients", short: "Ingredients", icon: Carrot },
];

/** Desktop/tablet: pill links in the sticky top bar (hidden below md). */
export function TopNavLinks() {
  const pathname = usePathname();

  return (
    <div className="hidden items-center gap-1 md:flex">
      {links.map(({ href, label, icon: Icon }) => {
        const active = pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`flex items-center gap-2 rounded-full px-3.5 py-2 text-sm transition-colors ${
              active
                ? "bg-accent-200 font-semibold text-accent-800"
                : "opacity-70 hover:bg-surface hover:opacity-100"
            }`}
          >
            <Icon strokeWidth={2.5} size={16} />
            {label}
          </Link>
        );
      })}
    </div>
  );
}

/** Phone: fixed bottom tab bar (hidden at md and up). */
export function BottomTabBar() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary"
      className="o-glass pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-divider md:hidden"
    >
      <div className="mx-auto grid max-w-md grid-cols-4 px-2 pt-1.5">
        {links.map(({ href, short, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className="flex flex-col items-center gap-0.5 py-1 text-[11px]"
            >
              <span
                className={`flex h-8 w-14 items-center justify-center rounded-full transition-colors ${
                  active ? "bg-accent-200 text-accent-800" : "opacity-65"
                }`}
              >
                <Icon strokeWidth={active ? 2.75 : 2.25} size={20} />
              </span>
              <span className={active ? "font-semibold text-accent-800" : "opacity-65"}>
                {short}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
