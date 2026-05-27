"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navLinks = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/analyzer",  label: "Analyzer"  },
  { href: "/watchlist", label: "Watchlist" },
  { href: "/portfolio", label: "Portfolio" },
  { href: "/journal",   label: "Journal"   },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 bg-[#18181b]/80 backdrop-blur-md border-b border-[#27272a]">
      <div className="max-w-[1600px] mx-auto px-4 md:px-6 h-[52px] flex items-center justify-between">

        <Link href="/dashboard" className="flex items-center gap-2 no-underline">
          <div className="w-[22px] h-[22px] bg-[#fafafa] rounded-[4px] flex items-center justify-center">
            <span className="text-[10px] font-black text-[#09090b] tracking-tighter">α</span>
          </div>
          <span className="text-[#fafafa] font-bold tracking-[0.1em] text-[11px] uppercase">
            AlphaResearch
          </span>
        </Link>

        <nav className="flex items-center gap-0">
          {navLinks.map(({ href, label }) => {
            const isActive = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={[
                  "text-[12px] font-medium px-3 py-[14px] transition-colors duration-150 no-underline",
                  isActive
                    ? "text-[#fafafa] border-b-2 border-[#fafafa]"
                    : "text-[#a1a1aa] hover:text-[#fafafa] border-b-2 border-transparent",
                ].join(" ")}
              >
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 px-3 py-1 rounded-full text-[10px] font-semibold flex items-center gap-1.5 tracking-wide">
          <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
          LIVE
        </div>

      </div>
    </header>
  );
}
