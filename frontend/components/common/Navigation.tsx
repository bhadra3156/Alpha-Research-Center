"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: "⚡" },
  { href: "/analyzer",  label: "Analyzer",  icon: "🔬" },
  { href: "/watchlist", label: "Watchlist", icon: "👁" },
  { href: "/portfolio", label: "Portfolio", icon: "💼" },
  { href: "/journal",   label: "Journal",   icon: "📓" },
];

export default function Navigation() {
  const pathname = usePathname();
  return (
    <nav style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 50,
      background: "rgba(6,8,32,0.95)", backdropFilter: "blur(12px)",
      borderBottom: "1px solid rgba(245,158,11,0.2)",
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "0 24px", height: "56px"
    }}>
      <Link href="/dashboard" style={{ display: "flex", alignItems: "center", gap: "10px", textDecoration: "none" }}>
        <div style={{
          width: "32px", height: "32px", borderRadius: "8px",
          background: "linear-gradient(135deg, #f59e0b, #d97706)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontWeight: "900", fontSize: "16px", color: "#060820"
        }}>a</div>
        <span style={{ fontWeight: "800", fontSize: "16px", color: "#f1f5f9" }}>
          Alpha<span style={{ color: "#f59e0b" }}>Research</span>
        </span>
      </Link>

      <div style={{ display: "flex", gap: "4px" }}>
        {navItems.map((item) => {
          const active = pathname === item.href;
          return (
            <Link key={item.href} href={item.href} style={{
              display: "flex", alignItems: "center", gap: "6px",
              padding: "6px 14px", borderRadius: "8px", textDecoration: "none",
              fontSize: "13px", fontWeight: active ? "600" : "400",
              background: active ? "rgba(245,158,11,0.15)" : "transparent",
              color: active ? "#f59e0b" : "#94a3b8",
              border: active ? "1px solid rgba(245,158,11,0.3)" : "1px solid transparent",
              transition: "all 0.2s"
            }}>
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "#10b981" }}>
        <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#10b981" }}></div>
        <span>LIVE</span>
      </div>
    </nav>
  );
}