"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "Home" },
  { href: "/tenants", label: "Tenants" },
  { href: "/reports", label: "Reports" },
  { href: "/more", label: "More" },
];

export function BottomNav() {
  const pathname = usePathname();

  if (pathname.startsWith("/login")) return null;

  return (
    <nav className="sticky bottom-0 z-10 border-t border-[#E4E0D6] bg-[#FCFBF8]/95 backdrop-blur">
      <div className="mx-auto flex max-w-[1100px] items-stretch justify-around">
        {TABS.map((tab) => {
          const active = tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex-1 py-3 text-center text-sm font-medium ${
                active ? "text-[#2A2724]" : "text-[#A39D8E]"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
