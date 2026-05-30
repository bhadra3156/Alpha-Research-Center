"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navLinks = [
  { href: "/dashboard",  label: "Dashboard"  },
  { href: "/10-baggers", label: "10-Baggers" },
  { href: "/analyzer",   label: "Analyser"   },
  { href: "/watchlist",  label: "Watchlist"   },
  { href: "/portfolio",  label: "Portfolio"   },
  { href: "/journal",    label: "Journal"     },
];

export default function Navbar() {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-50 bg-[#0a0a0b]/85 backdrop-blur-md border-b border-[#1f1f23]">
      <div className="max-w-[1600px] mx-auto px-4 md:px-6 h-[64px] flex items-center justify-between">

        {/* Brand */}
        <Link href="/dashboard" className="flex items-center gap-3 no-underline">
          <div className="w-[34px] h-[34px] bg-[#f59e0b] rounded-[7px] flex items-center justify-center">
            <span className="text-[18px] font-bold text-[#0a0a0b] leading-none">α</span>
          </div>
          <span
            className="text-[#fafafa] font-semibold text-[20px] tracking-[0.18em] uppercase"
            style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
          >
            AlphaResearch
          </span>
        </Link>

        {/* Nav links */}
        <nav className="flex items-center gap-7">
          {navLinks.map(({ href, label }) => {
            const isActive = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={[
                  "text-[15px] font-medium tracking-[0.04em] uppercase pb-1 transition-colors duration-150 no-underline",
                  isActive
                    ? "text-[#fafafa] border-b-2 border-[#fafafa]"
                    : "text-[#71717a] hover:text-[#d4d4d8] border-b-2 border-transparent",
                ].join(" ")}
              >
                {label}
              </Link>
            );
          })}
        </nav>

        {/* LIVE indicator */}
        <div className="flex items-center gap-2 text-[#10b981] text-[14px] font-medium tracking-[0.1em]">
          <span className="w-[7px] h-[7px] bg-[#10b981] rounded-full animate-pulse" />
          LIVE
        </div>

      </div>
    </header>
  );
}