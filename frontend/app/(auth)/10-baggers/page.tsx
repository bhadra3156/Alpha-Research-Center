// ─────────────────────────────────────────────────────────────────────────────
// AlphaResearch — 10-Baggers Scanner v2
// Small-cap sweet spot: $500M–$7B · 2-Check System
// Growth Fundamentals + 89-Day MA Trend Filter
// ─────────────────────────────────────────────────────────────────────────────
"use client";

import React, { useState, useCallback } from "react";
import Link from "next/link";
import type { QualifyingStock, ScanResponse } from "@/lib/types";
import {
  KpiCard,
  ConvictionBar,
  CheckBadge,
  DataQualityBadge,
  ScanLoading,
  EmptyState,
} from "@/components/shared/ui-primitives";

// ─── API ─────────────────────────────────────────────────────────────────────
const API =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://alpha-research-center-backend.onrender.com";

async function scan10Baggers(): Promise<ScanResponse> {
  const res = await fetch(`${API}/scan/10baggers/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ market: "US", notify_telegram: false }),
  });
  if (!res.ok) throw new Error(`Scan failed: ${res.status}`);
  return res.json();
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function fmtPrice(v: number) {
  return `$${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtMktCap(v: number) {
  if (v >= 1e9) return `$${(v / 1e9).toFixed(2)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(0)}M`;
  return `$${v.toLocaleString()}`;
}

function convColor(s: number) {
  if (s >= 9) return "text-emerald-400";
  if (s >= 7) return "text-amber-400";
  if (s >= 5) return "text-blue-400";
  return "text-rose-400";
}

function chgColor(v: number) {
  if (v > 0) return "text-emerald-400";
  if (v < 0) return "text-rose-400";
  return "text-[#52525b]";
}

function rsiColor(v: number) {
  if (v >= 70) return "text-rose-400";
  if (v >= 50) return "text-amber-400";
  if (v > 0) return "text-emerald-400";
  return "text-[#52525b]";
}

function mktCapColor(v: number) {
  if (v >= 3e9) return "text-emerald-400";
  if (v >= 1.5e9) return "text-amber-400";
  return "text-blue-400";
}

// ─── Columns ─────────────────────────────────────────────────────────────────
const COLUMNS = [
  { key: "conviction", label: "Conv.", align: "text-center" },
  { key: "ticker", label: "Ticker", align: "text-left" },
  { key: "company", label: "Company", align: "text-left" },
  { key: "price", label: "Price", align: "text-right" },
  { key: "chg", label: "Chg%", align: "text-right" },
  { key: "mktcap", label: "Mkt Cap", align: "text-right" },
  { key: "fund", label: "Growth", align: "text-center" },
  { key: "tech", label: "89D MA", align: "text-center" },
  { key: "rsi", label: "RSI", align: "text-right" },
  { key: "entry", label: "Entry Zone", align: "text-right" },
  { key: "dq", label: "DQ", align: "text-center" },
  { key: "action", label: "", align: "text-center" },
] as const;

const SECTORS = [
  "All", "Technology", "Healthcare", "Industrials", "Consumer",
  "Energy", "Financial", "Communication",
] as const;

// ─── Page ────────────────────────────────────────────────────────────────────
export default function TenBaggersPage() {
  const [scanning, setScanning] = useState(false);
  const [scanData, setScanData] = useState<ScanResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sectorFilter, setSectorFilter] = useState("All");
  const [sortCol, setSortCol] = useState<string>("conviction");
  const [sortAsc, setSortAsc] = useState(false);

  // Restore cached scan from localStorage
  React.useEffect(() => {
    try {
      const cached = localStorage.getItem("alpha_10baggers_v2");
      if (cached) setScanData(JSON.parse(cached));
    } catch {}
  }, []);

  const runScan = useCallback(async () => {
    setScanning(true);
    setError(null);
    try {
      const data = await scan10Baggers();
      setScanData(data);
      try {
        localStorage.setItem("alpha_10baggers_v2", JSON.stringify(data));
      } catch {}
    } catch (e: any) {
      setError(
        e.message ||
          "Scan failed — backend may be cold-starting on Render (~60s for small-cap scan)"
      );
    }
    setScanning(false);
  }, []);

  // ── Filter + Sort ──────────────────────────────────────────────────────
  const stocks = scanData?.qualifying_stocks || [];

  const filtered = stocks.filter((s) => {
    if (sectorFilter !== "All" && !s.sector?.toLowerCase().includes(sectorFilter.toLowerCase()))
      return false;
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    let cmp = 0;
    switch (sortCol) {
      case "conviction": cmp = a.conviction_score - b.conviction_score; break;
      case "ticker": cmp = a.ticker.localeCompare(b.ticker); break;
      case "price": cmp = a.price - b.price; break;
      case "chg": cmp = a.change_pct - b.change_pct; break;
      case "mktcap": cmp = a.market_cap - b.market_cap; break;
      case "rsi": cmp = a.rsi14 - b.rsi14; break;
      default: cmp = a.conviction_score - b.conviction_score;
    }
    return sortAsc ? cmp : -cmp;
  });

  const handleSort = (col: string) => {
    if (sortCol === col) setSortAsc(!sortAsc);
    else { setSortCol(col); setSortAsc(false); }
  };

  // ── KPIs ───────────────────────────────────────────────────────────────
  const highConv = stocks.filter((s) => s.conviction_score >= 8).length;
  const avgMktCap =
    stocks.length > 0
      ? stocks.reduce((a, b) => a + b.market_cap, 0) / stocks.length
      : 0;
  const avgConv =
    stocks.length > 0
      ? (stocks.reduce((a, b) => a + b.conviction_score, 0) / stocks.length).toFixed(1)
      : "—";

  return (
    <div className="space-y-5">
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-[18px] font-bold tracking-tight text-[#fafafa]">
            🎯 10-<span className="text-amber-400">Baggers</span>
          </h1>
          <p className="text-xs text-[#52525b] mt-0.5">
            $500M–$7B Sweet Spot · Growth Fundamentals + 89-Day MA Trend · Institutional Coverage Gap
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="px-4 py-2.5 text-xs font-medium rounded-lg border border-[#27272a] text-[#a1a1aa] hover:text-[#fafafa] hover:border-[#52525b] transition-colors no-underline"
          >
            ← Main Dashboard
          </Link>
          <button
            onClick={runScan}
            disabled={scanning}
            className={`px-6 py-2.5 text-xs font-bold rounded-lg transition-all ${
              scanning
                ? "bg-amber-500/10 text-amber-400 border border-amber-500/20 cursor-wait"
                : "bg-amber-500 hover:bg-amber-400 text-black shadow-lg shadow-amber-500/20 active:translate-y-px"
            }`}
          >
            {scanning ? "⚡ Scanning…" : "⚡ Scan 10-Baggers"}
          </button>
        </div>
      </div>

      {/* ── KPI Strip ────────────────────────────────────────────────────── */}
      {scanData && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <KpiCard
            label="Universe Scanned"
            value={String(scanData.stocks_scanned)}
            sub="$500M–$7B gate applied"
          />
          <KpiCard
            label="Qualifying"
            value={String(scanData.qualifying_count)}
            sub="Passed 2-Check system"
            color="text-emerald-400"
          />
          <KpiCard
            label="High Conviction"
            value={String(highConv)}
            sub="Score ≥ 8"
            color="text-amber-400"
          />
          <KpiCard
            label="Avg Mkt Cap"
            value={avgMktCap > 0 ? fmtMktCap(avgMktCap) : "—"}
            sub="Sweet spot range"
          />
          <KpiCard
            label="Scan Time"
            value={`${(scanData.scan_duration_ms / 1000).toFixed(1)}s`}
            sub={new Date(scanData.scan_date).toLocaleTimeString()}
          />
        </div>
      )}

      {/* ── Filter Bar ───────────────────────────────────────────────────── */}
      {scanData && (
        <div className="bg-[#18181b] border border-[#27272a] rounded-xl px-5 py-3 flex items-center gap-3 flex-wrap">
          <span className="text-[10px] font-semibold text-[#71717a] uppercase tracking-widest mr-1">
            Sector
          </span>
          <select
            value={sectorFilter}
            onChange={(e) => setSectorFilter(e.target.value)}
            className="bg-[#09090b] border border-[#27272a] text-[#fafafa] px-3 py-1.5 text-xs rounded focus:outline-none focus:border-amber-500/40"
          >
            {SECTORS.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>

          <div className="flex-1" />

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span className="text-[10px] text-[#52525b]">{sorted.length} qualifying</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              <span className="text-[10px] text-[#52525b]">{highConv} high conviction</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
              <span className="text-[10px] text-[#52525b]">$500M–$7B enforced</span>
            </div>
          </div>
        </div>
      )}

      {/* ── Error ────────────────────────────────────────────────────────── */}
      {error && (
        <div className="bg-rose-950/40 border border-rose-800/40 text-rose-400 text-xs px-4 py-3 rounded-lg">
          ⚠ {error}
        </div>
      )}

      {/* ── Loading ──────────────────────────────────────────────────────── */}
      {scanning && (
        <ScanLoading label="⚡ Scanning 130+ small-cap stocks · Fetching fundamentals + 89-day MA…" />
      )}

      {/* ── Pre-scan Empty State ─────────────────────────────────────────── */}
      {!scanning && !scanData && !error && (
        <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-12 space-y-6">
          <div className="text-center space-y-2">
            <p className="text-[#fafafa] text-sm font-semibold tracking-wider uppercase">
              🎯 Multi-Bagger Discovery Engine
            </p>
            <p className="text-xs text-[#52525b] max-w-lg mx-auto">
              Scans 130+ small-cap stocks in the $500M–$7B sweet spot. 2-Check system:
              Growth Fundamentals + 89-Day MA Trend Filter. No institutional/insider check —
              these are under-the-radar names that Wall Street hasn't discovered yet.
            </p>
          </div>

          {/* Why this range */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 max-w-3xl mx-auto">
            <div className="bg-[#09090b] border border-emerald-800/30 rounded-xl p-4 space-y-2">
              <p className="text-emerald-400 text-[10px] font-semibold tracking-widest">
                🎯 SWEET SPOT: $500M–$7B
              </p>
              <p className="text-[#a1a1aa] text-xs font-semibold">
                Maximum Growth Runway
              </p>
              <p className="text-[#52525b] text-[10px] leading-relaxed">
                A $1B company can realistically 10x to $10B. Enough institutional quality
                but small enough for explosive growth before Wall Street notices.
              </p>
            </div>
            <div className="bg-[#09090b] border border-rose-800/30 rounded-xl p-4 space-y-2">
              <p className="text-rose-400 text-[10px] font-semibold tracking-widest">
                ❌ BELOW $500M
              </p>
              <p className="text-[#a1a1aa] text-xs font-semibold">
                Micro-Cap Risk Zone
              </p>
              <p className="text-[#52525b] text-[10px] leading-relaxed">
                Governance gaps, pump-and-dump fragility, audit risk,
                limited regulatory oversight. Filtered out automatically.
              </p>
            </div>
            <div className="bg-[#09090b] border border-rose-800/30 rounded-xl p-4 space-y-2">
              <p className="text-rose-400 text-[10px] font-semibold tracking-widest">
                ❌ ABOVE $7B
              </p>
              <p className="text-[#a1a1aa] text-xs font-semibold">
                Law of Large Numbers
              </p>
              <p className="text-[#52525b] text-[10px] leading-relaxed">
                Hyper-efficient markets, 30+ analysts tracking every move.
                A $20B company needs $200B for 10x — mathematically rare.
              </p>
            </div>
          </div>

          {/* 2-Check system */}
          <div className="flex justify-center gap-3 max-w-lg mx-auto">
            <div className="flex-1 p-4 bg-[#09090b] border border-emerald-800/30 rounded-xl text-left space-y-1">
              <p className="text-emerald-400 text-[10px] font-semibold tracking-widest">
                CHECK 1 — GROWTH
              </p>
              <p className="text-[#a1a1aa] text-xs font-semibold">Fundamentals</p>
              <p className="text-[#52525b] text-[10px]">
                Revenue growth · Gross margins · FCF · Low debt · Profitability (bonus, not required)
              </p>
            </div>
            <div className="flex-1 p-4 bg-[#09090b] border border-blue-800/30 rounded-xl text-left space-y-1">
              <p className="text-blue-400 text-[10px] font-semibold tracking-widest">
                CHECK 2 — TREND
              </p>
              <p className="text-[#a1a1aa] text-xs font-semibold">89-Day MA Filter</p>
              <p className="text-[#52525b] text-[10px]">
                Weekly close above 89-day SMA. One clean trend condition — above = uptrend, below = avoid.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Results Table ────────────────────────────────────────────────── */}
      {!scanning && scanData && sorted.length > 0 && (
        <div className="w-full overflow-hidden rounded-lg border border-[#1E2530] bg-[#0C0F16]">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-[#0A0D14]">
                  {COLUMNS.map((col) => (
                    <th
                      key={col.key}
                      onClick={() => handleSort(col.key)}
                      className={`text-[11px] font-bold uppercase tracking-wider text-[#64748B] px-4 py-3 border-b border-[#1E2530] whitespace-nowrap cursor-pointer hover:text-[#94a3b8] transition-colors select-none ${col.align}`}
                    >
                      {col.label}
                      {sortCol === col.key && (
                        <span className="ml-1 text-amber-500">
                          {sortAsc ? "↑" : "↓"}
                        </span>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.map((s) => (
                  <tr
                    key={s.ticker}
                    className="border-b border-[#1E2530]/50 last:border-0 hover:bg-[#161C28]/60 transition-colors"
                  >
                    {/* Conviction */}
                    <td className="px-4 py-2.5 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <ConvictionBar score={s.conviction_score} />
                        <span className={`font-bold font-mono text-sm ${convColor(s.conviction_score)}`}>
                          {s.conviction_score}
                        </span>
                      </div>
                    </td>

                    {/* Ticker */}
                    <td className="px-4 py-2.5">
                      <span className="font-bold text-[#FFB000] text-sm tracking-wide">
                        {s.ticker}
                      </span>
                    </td>

                    {/* Company */}
                    <td className="px-4 py-2.5 text-xs text-[#a1a1aa] max-w-[140px] truncate">
                      {s.company_name}
                    </td>

                    {/* Price */}
                    <td className="px-4 py-2.5 text-right font-mono text-sm text-[#fafafa] font-semibold tabular-nums">
                      {fmtPrice(s.price)}
                    </td>

                    {/* Change % */}
                    <td className={`px-4 py-2.5 text-right font-mono text-xs font-semibold tabular-nums ${chgColor(s.change_pct)}`}>
                      {s.change_pct > 0 ? "+" : ""}
                      {s.change_pct.toFixed(1)}%
                    </td>

                    {/* Market Cap */}
                    <td className={`px-4 py-2.5 text-right font-mono text-xs font-semibold tabular-nums ${mktCapColor(s.market_cap)}`}>
                      {fmtMktCap(s.market_cap)}
                    </td>

                    {/* Growth (Fundamental) */}
                    <td className="px-4 py-2.5 text-center">
                      <CheckBadge pass={s.check1_pass} label={s.check1_pass ? "GROWTH" : "WEAK"} />
                    </td>

                    {/* 89D MA (Technical) */}
                    <td className="px-4 py-2.5 text-center">
                      <CheckBadge pass={s.check2_pass} label={s.check2_pass ? "ABOVE" : "BELOW"} />
                    </td>

                    {/* RSI */}
                    <td className={`px-4 py-2.5 text-right font-mono text-xs font-semibold tabular-nums ${rsiColor(s.rsi14)}`}>
                      {s.rsi14 > 0 ? s.rsi14.toFixed(0) : "—"}
                    </td>

                    {/* Entry Zone */}
                    <td className="px-4 py-2.5 text-right font-mono text-xs text-blue-400 whitespace-nowrap tabular-nums">
                      {s.entry_zone || "—"}
                    </td>

                    {/* Data Quality */}
                    <td className="px-4 py-2.5 text-center">
                      <DataQualityBadge quality={s.data_quality} />
                    </td>

                    {/* Action */}
                    <td className="px-4 py-2.5 text-center">
                      <Link
                        href={`/analyzer?ticker=${s.ticker}&market=${s.market}`}
                        className="text-[10px] font-semibold px-3 py-1.5 rounded border bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20 transition-colors no-underline whitespace-nowrap"
                      >
                        Deep Analyze →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Footer Legend */}
          <div className="grid grid-cols-2 gap-6 border-t border-[#1E2530] bg-[#0A0D14] p-4 text-[11px] text-[#64748B]">
            <div className="space-y-1.5">
              <p className="font-semibold text-[#94a3b8] uppercase tracking-wider text-[10px]">
                Conviction Tiers
              </p>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-0.5 h-3 rounded-full bg-emerald-400" />
                  <span>9–10 Maximum — Strong growth + confirmed uptrend</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-0.5 h-3 rounded-full bg-amber-400" />
                  <span>7–8 High — Good fundamentals, above 89D MA</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-0.5 h-3 rounded-full bg-blue-400" />
                  <span>5–6 Moderate — Qualifying but needs monitoring</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-0.5 h-3 rounded-full bg-rose-400" />
                  <span>1–4 Low — Early stage, high risk</span>
                </div>
              </div>
            </div>
            <div className="space-y-1.5">
              <p className="font-semibold text-[#94a3b8] uppercase tracking-wider text-[10px]">
                2-Check System
              </p>
              <div className="space-y-1">
                <p className="text-[10px]">
                  <span className="text-emerald-400 font-semibold">GROWTH</span> — Revenue growth, gross margins, FCF, low debt. Profitability is a bonus, not a requirement. Scores growth companies fairly.
                </p>
                <p className="text-[10px]">
                  <span className="text-blue-400 font-semibold">89D MA</span> — Weekly close above 89-day simple moving average. Clean trend filter — if the stock is in an uptrend, it passes.
                </p>
                <p className="text-[10px] text-[#3f3f46] mt-1">
                  Market cap hard gate: &lt;$500M rejected (micro-cap risk) · &gt;$7B rejected (efficient markets)
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── No Results ───────────────────────────────────────────────────── */}
      {!scanning && scanData && sorted.length === 0 && (
        <EmptyState
          title="No small-caps passed both checks"
          subtitle="Try a different sector filter or run a new scan. The 2-Check system filters for quality + trend."
        />
      )}

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <p className="text-[10px] text-[#27272a] text-center">
        AlphaResearch 10-Bagger Scanner · $500M–$7B · Growth + 89D MA Trend ·
        Not financial advice
      </p>
    </div>
  );
}