"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/recipes", label: "Recipes" },
  { href: "/planner", label: "Planner" },
  { href: "/grocery-list", label: "Grocery list" },
  { href: "/ingredients", label: "Ingredients" },
];

export default function NavLinks() {
  const pathname = usePathname();

  return (
    <div className="flex items-center gap-1.5">
      {links.map((link) => {
        const active = pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`rounded-full px-3.5 py-1.5 text-sm ${
              active ? "bg-accent-200 text-accent-800" : "opacity-70"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </div>
  );
}
