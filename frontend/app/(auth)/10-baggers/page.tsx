// ─────────────────────────────────────────────────────────────────────────────
// AlphaResearch — 10-Baggers Scanner v3
// Multi-bagger discovery: $1B–$25B · Growth Fundamentals Only
// No technical filter — trend shown for info only
// ─────────────────────────────────────────────────────────────────────────────
"use client";

import React, { useState, useCallback } from "react";
import Link from "next/link";
import type { QualifyingStock, ScanResponse } from "@/lib/types";
import {
  KpiCard,
  ConvictionBar,
  DataQualityBadge,
  ScanLoading,
  EmptyState,
} from "@/components/shared/ui-primitives";

// ─── API ─────────────────────────────────────────────────────────────────────
const API =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://alpha-research-center-backend.onrender.com";

async function scan10Baggers(): Promise<ScanResponse> {
  const res = await fetch(`${API}/10baggers/`, {
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
  if (v >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
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
  if (v >= 10e9) return "text-emerald-400";
  if (v >= 3e9) return "text-amber-400";
  return "text-blue-400";
}

function trendColor(stage: string) {
  if (stage.includes("Uptrend")) return "text-emerald-400";
  if (stage.includes("Recovery") || stage.includes("Bouncing")) return "text-amber-400";
  if (stage.includes("Downtrend")) return "text-rose-400";
  return "text-[#52525b]";
}

function trendShort(stage: string) {
  if (stage.includes("Uptrend")) return "▲ UP";
  if (stage.includes("Recovery")) return "↗ REC";
  if (stage.includes("Bouncing")) return "↗ BNC";
  if (stage.includes("Downtrend")) return "▼ DOWN";
  return "— N/A";
}

function revGrowthColor(v: number) {
  // Normalize if decimal
  const pct = Math.abs(v) < 5 ? v * 100 : v;
  if (pct > 30) return "text-emerald-400";
  if (pct > 15) return "text-amber-400";
  if (pct > 0) return "text-blue-400";
  return "text-rose-400";
}

function fmtRevGrowth(v: number) {
  const pct = Math.abs(v) < 5 ? v * 100 : v;
  return pct > 0 ? `+${pct.toFixed(0)}%` : `${pct.toFixed(0)}%`;
}

// ─── Columns ─────────────────────────────────────────────────────────────────
const COLUMNS = [
  { key: "conviction", label: "Conv.", align: "text-center" },
  { key: "ticker", label: "Ticker", align: "text-left" },
  { key: "company", label: "Company", align: "text-left" },
  { key: "price", label: "Price", align: "text-right" },
  { key: "chg", label: "Chg%", align: "text-right" },
  { key: "mktcap", label: "Mkt Cap", align: "text-right" },
  { key: "revgrowth", label: "Rev Growth", align: "text-right" },
  { key: "margin", label: "Margin", align: "text-right" },
  { key: "trend", label: "Trend", align: "text-center" },
  { key: "rsi", label: "RSI", align: "text-right" },
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
      const cached = localStorage.getItem("alpha_10baggers_v3");
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
        localStorage.setItem("alpha_10baggers_v3", JSON.stringify(data));
      } catch {}
    } catch (e: any) {
      setError(
        e.message || "Scan failed — backend may be cold-starting on Render (~30s)"
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
      case "revgrowth": cmp = a.revenue_growth - b.revenue_growth; break;
      case "margin": cmp = a.net_margin - b.net_margin; break;
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

  return (
    <div className="space-y-5">
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-[18px] font-bold tracking-tight text-[#fafafa]">
            🎯 10-<span className="text-amber-400">Baggers</span>
          </h1>
          <p className="text-xs text-[#52525b] mt-0.5">
            $1B–$25B Growth Screen · Revenue Growth + Margin Quality · Multi-Bagger Candidates
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
            sub="$1B–$25B gate applied"
          />
          <KpiCard
            label="Qualifying"
            value={String(scanData.qualifying_count)}
            sub="Growth fundamentals pass"
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
            sub="Multi-bagger range"
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
        <ScanLoading label="⚡ Scanning 150+ growth stocks · $1B–$25B market cap…" />
      )}

      {/* ── Pre-scan Empty State ─────────────────────────────────────────── */}
      {!scanning && !scanData && !error && (
        <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-12 space-y-6">
          <div className="text-center space-y-2">
            <p className="text-[#fafafa] text-sm font-semibold tracking-wider uppercase">
              🎯 Multi-Bagger Discovery Engine
            </p>
            <p className="text-xs text-[#52525b] max-w-lg mx-auto">
              Scans 150+ growth stocks in the $1B–$25B range. Scores on revenue growth,
              margins, valuation, and quality. Finds the next generation of compounders
              before they become mega-caps.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 max-w-3xl mx-auto">
            <div className="bg-[#09090b] border border-emerald-800/30 rounded-xl p-4 space-y-2">
              <p className="text-emerald-400 text-[10px] font-semibold tracking-widest">
                🎯 SWEET SPOT: $1B–$25B
              </p>
              <p className="text-[#a1a1aa] text-xs font-semibold">Growth Runway</p>
              <p className="text-[#52525b] text-[10px] leading-relaxed">
                Large enough for institutional quality, small enough for 5x–20x potential.
                Under-covered by Wall Street analysts.
              </p>
            </div>
            <div className="bg-[#09090b] border border-amber-800/30 rounded-xl p-4 space-y-2">
              <p className="text-amber-400 text-[10px] font-semibold tracking-widest">
                📊 GROWTH SCORING
              </p>
              <p className="text-[#a1a1aa] text-xs font-semibold">Fundamentals First</p>
              <p className="text-[#52525b] text-[10px] leading-relaxed">
                Revenue growth weighted highest. Gross margins prove unit economics.
                Profitability is a bonus, not a requirement for high-growth names.
              </p>
            </div>
            <div className="bg-[#09090b] border border-blue-800/30 rounded-xl p-4 space-y-2">
              <p className="text-blue-400 text-[10px] font-semibold tracking-widest">
                🔍 COVERAGE GAP
              </p>
              <p className="text-[#a1a1aa] text-xs font-semibold">Structural Edge</p>
              <p className="text-[#52525b] text-[10px] leading-relaxed">
                Most institutions can't meaningfully invest below $10B. Fewer analysts means
                more mispricings. Your edge is doing the work they won't.
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

                    {/* Revenue Growth */}
                    <td className={`px-4 py-2.5 text-right font-mono text-xs font-semibold tabular-nums ${revGrowthColor(s.revenue_growth)}`}>
                      {fmtRevGrowth(s.revenue_growth)}
                    </td>

                    {/* Net Margin */}
                    <td className={`px-4 py-2.5 text-right font-mono text-xs tabular-nums ${s.net_margin > 10 ? "text-emerald-400" : s.net_margin > 0 ? "text-amber-400" : "text-rose-400"}`}>
                      {(Math.abs(s.net_margin) < 5 ? s.net_margin * 100 : s.net_margin).toFixed(0)}%
                    </td>

                    {/* Trend (info only) */}
                    <td className="px-4 py-2.5 text-center">
                      <span className={`text-[10px] font-bold ${trendColor(s.technical_stage)}`}>
                        {trendShort(s.technical_stage)}
                      </span>
                    </td>

                    {/* RSI */}
                    <td className={`px-4 py-2.5 text-right font-mono text-xs font-semibold tabular-nums ${rsiColor(s.rsi14)}`}>
                      {s.rsi14 > 0 ? s.rsi14.toFixed(0) : "—"}
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

          {/* Footer */}
          <div className="grid grid-cols-2 gap-6 border-t border-[#1E2530] bg-[#0A0D14] p-4 text-[11px] text-[#64748B]">
            <div className="space-y-1.5">
              <p className="font-semibold text-[#94a3b8] uppercase tracking-wider text-[10px]">
                Conviction Tiers
              </p>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-0.5 h-3 rounded-full bg-emerald-400" />
                  <span>9–10 Maximum — Explosive growth + small cap + profitable</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-0.5 h-3 rounded-full bg-amber-400" />
                  <span>7–8 High — Strong growth fundamentals</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-0.5 h-3 rounded-full bg-blue-400" />
                  <span>5–6 Moderate — Qualifying, needs deeper research</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-0.5 h-3 rounded-full bg-rose-400" />
                  <span>1–4 Early — High risk, monitor closely</span>
                </div>
              </div>
            </div>
            <div className="space-y-1.5">
              <p className="font-semibold text-[#94a3b8] uppercase tracking-wider text-[10px]">
                Scoring Method
              </p>
              <p className="text-[10px] leading-relaxed">
                Growth fundamentals only — no technical filters. Revenue growth weighted highest (max 2pts).
                Net margin, valuation, and price quality scored as bonuses. Pre-profitable companies allowed
                if revenue growth is strong. Trend column is informational only (not a pass/fail gate).
              </p>
              <p className="text-[10px] text-[#3f3f46] mt-1">
                Market cap: $1B–$25B enforced · Below $1B rejected (micro-cap) · Above $25B rejected (efficient markets)
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── No Results ───────────────────────────────────────────────────── */}
      {!scanning && scanData && sorted.length === 0 && (
        <EmptyState
          title="No stocks passed the growth screen"
          subtitle="Try a different sector filter or run a new scan."
        />
      )}

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <p className="text-[10px] text-[#27272a] text-center">
        AlphaResearch 10-Bagger Scanner · $1B–$25B Growth Screen ·
        Not financial advice
      </p>
    </div>
  );
}