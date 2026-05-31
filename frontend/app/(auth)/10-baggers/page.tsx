// ─────────────────────────────────────────────────────────────────────────────
// AlphaResearch — 10-Baggers Scanner v7
// Technical setup scoring · MA50/MA200/RSI/52W momentum
// Shows REAL differentiated data from proven data pipeline
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

function convColor(s: number) {
  if (s >= 8) return "text-emerald-400";
  if (s >= 6) return "text-amber-400";
  if (s >= 4) return "text-blue-400";
  return "text-rose-400";
}

function chgColor(v: number) {
  return v > 0 ? "text-emerald-400" : v < 0 ? "text-rose-400" : "text-[#52525b]";
}

function rsiColor(v: number) {
  if (v >= 70) return "text-rose-400";
  if (v >= 50) return "text-amber-400";
  if (v > 0) return "text-emerald-400";
  return "text-[#52525b]";
}

function trendColor(t: string) {
  if (t.includes("Strong") || t.includes("Uptrend")) return "text-emerald-400";
  if (t.includes("Recovery") || t.includes("Bounce")) return "text-amber-400";
  if (t.includes("Downtrend")) return "text-rose-400";
  return "text-[#52525b]";
}

function trendIcon(t: string) {
  if (t.includes("Strong")) return "▲▲";
  if (t.includes("Uptrend")) return "▲";
  if (t.includes("Recovery") || t.includes("Bounce")) return "↗";
  if (t.includes("Downtrend")) return "▼";
  return "—";
}

// ─── Columns ─────────────────────────────────────────────────────────────────
const COLUMNS = [
  { key: "conviction", label: "Score", align: "text-center" },
  { key: "ticker", label: "Ticker", align: "text-left" },
  { key: "company", label: "Company", align: "text-left" },
  { key: "price", label: "Price", align: "text-right" },
  { key: "chg", label: "Chg%", align: "text-right" },
  { key: "trend", label: "Trend", align: "text-center" },
  { key: "ma50", label: "MA50", align: "text-right" },
  { key: "ma200", label: "MA200", align: "text-right" },
  { key: "rsi", label: "RSI", align: "text-right" },
  { key: "w52", label: "52W%", align: "text-right" },
  { key: "gc", label: "GC", align: "text-center" },
  { key: "action", label: "", align: "text-center" },
] as const;

// ─── Page ────────────────────────────────────────────────────────────────────
export default function TenBaggersPage() {
  const [scanning, setScanning] = useState(false);
  const [scanData, setScanData] = useState<ScanResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sortCol, setSortCol] = useState<string>("conviction");
  const [sortAsc, setSortAsc] = useState(false);

  React.useEffect(() => {
    try {
      const cached = localStorage.getItem("alpha_10baggers_v7");
      if (cached) setScanData(JSON.parse(cached));
    } catch {}
  }, []);

  const runScan = useCallback(async () => {
    setScanning(true);
    setError(null);
    try {
      const data = await scan10Baggers();
      setScanData(data);
      try { localStorage.setItem("alpha_10baggers_v7", JSON.stringify(data)); } catch {}
    } catch (e: any) {
      setError(e.message || "Scan failed — backend may be cold-starting (~30s)");
    }
    setScanning(false);
  }, []);

  const stocks = scanData?.qualifying_stocks || [];

  const sorted = [...stocks].sort((a, b) => {
    let cmp = 0;
    switch (sortCol) {
      case "conviction": cmp = a.conviction_score - b.conviction_score; break;
      case "ticker": cmp = a.ticker.localeCompare(b.ticker); break;
      case "price": cmp = a.price - b.price; break;
      case "chg": cmp = a.change_pct - b.change_pct; break;
      case "rsi": cmp = a.rsi14 - b.rsi14; break;
      case "ma50": cmp = a.ma50 - b.ma50; break;
      case "w52": cmp = a.range_pct - b.range_pct; break;
      default: cmp = a.conviction_score - b.conviction_score;
    }
    return sortAsc ? cmp : -cmp;
  });

  const handleSort = (col: string) => {
    if (sortCol === col) setSortAsc(!sortAsc);
    else { setSortCol(col); setSortAsc(false); }
  };

  const strongTrend = stocks.filter(s => s.conviction_score >= 7).length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-[18px] font-bold tracking-tight text-[#fafafa]">
            🎯 10-<span className="text-amber-400">Baggers</span>
          </h1>
          <p className="text-xs text-[#52525b] mt-0.5">
            Small/Mid-Cap Technical Setup Screen · MA50/MA200/RSI · Trend + Momentum Scoring
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="px-4 py-2.5 text-xs font-medium rounded-lg border border-[#27272a] text-[#a1a1aa] hover:text-[#fafafa] transition-colors no-underline">
            ← Dashboard
          </Link>
          <button onClick={runScan} disabled={scanning}
            className={`px-6 py-2.5 text-xs font-bold rounded-lg transition-all ${scanning ? "bg-amber-500/10 text-amber-400 border border-amber-500/20 cursor-wait" : "bg-amber-500 hover:bg-amber-400 text-black shadow-lg shadow-amber-500/20 active:translate-y-px"}`}>
            {scanning ? "⚡ Scanning…" : "⚡ Scan 10-Baggers"}
          </button>
        </div>
      </div>

      {/* KPIs */}
      {scanData && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiCard label="Scanned" value={String(scanData.stocks_scanned)} sub="Small/mid-cap universe" />
          <KpiCard label="Total Stocks" value={String(scanData.qualifying_count)} sub="With price data" color="text-emerald-400" />
          <KpiCard label="Strong Setup" value={String(strongTrend)} sub="Score ≥ 7" color="text-amber-400" />
          <KpiCard label="Scan Time" value={`${(scanData.scan_duration_ms / 1000).toFixed(1)}s`} sub={new Date(scanData.scan_date).toLocaleTimeString()} />
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-rose-950/40 border border-rose-800/40 text-rose-400 text-xs px-4 py-3 rounded-lg">⚠ {error}</div>
      )}

      {/* Loading */}
      {scanning && <ScanLoading label="⚡ Scanning 130+ small/mid-cap stocks…" />}

      {/* Empty state */}
      {!scanning && !scanData && !error && (
        <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-12 text-center space-y-4">
          <p className="text-[#fafafa] text-sm font-semibold">🎯 Multi-Bagger Technical Screen</p>
          <p className="text-xs text-[#52525b] max-w-md mx-auto">
            Scans 130+ curated small/mid-cap stocks. Scores each on technical setup:
            MA50, MA200, golden cross, RSI, and 52-week momentum. Click "Deep Analyze" on
            any stock for full institutional analysis.
          </p>
        </div>
      )}

      {/* Table */}
      {!scanning && scanData && sorted.length > 0 && (
        <div className="w-full overflow-hidden rounded-lg border border-[#1E2530] bg-[#0C0F16]">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-[#0A0D14]">
                  {COLUMNS.map((col) => (
                    <th key={col.key} onClick={() => handleSort(col.key)}
                      className={`text-[11px] font-bold uppercase tracking-wider text-[#64748B] px-4 py-3 border-b border-[#1E2530] whitespace-nowrap cursor-pointer hover:text-[#94a3b8] transition-colors select-none ${col.align}`}>
                      {col.label}
                      {sortCol === col.key && <span className="ml-1 text-amber-500">{sortAsc ? "↑" : "↓"}</span>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.map((s) => (
                  <tr key={s.ticker} className="border-b border-[#1E2530]/50 last:border-0 hover:bg-[#161C28]/60 transition-colors">
                    {/* Score */}
                    <td className="px-4 py-2.5 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <ConvictionBar score={s.conviction_score} />
                        <span className={`font-bold font-mono text-sm ${convColor(s.conviction_score)}`}>{s.conviction_score}</span>
                      </div>
                    </td>
                    {/* Ticker */}
                    <td className="px-4 py-2.5">
                      <span className="font-bold text-[#FFB000] text-sm tracking-wide">{s.ticker}</span>
                    </td>
                    {/* Company */}
                    <td className="px-4 py-2.5 text-xs text-[#a1a1aa] max-w-[130px] truncate">{s.company_name}</td>
                    {/* Price */}
                    <td className="px-4 py-2.5 text-right font-mono text-sm text-[#fafafa] font-semibold tabular-nums">{fmtPrice(s.price)}</td>
                    {/* Change */}
                    <td className={`px-4 py-2.5 text-right font-mono text-xs font-semibold tabular-nums ${chgColor(s.change_pct)}`}>
                      {s.change_pct > 0 ? "+" : ""}{s.change_pct.toFixed(1)}%
                    </td>
                    {/* Trend */}
                    <td className="px-4 py-2.5 text-center">
                      <span className={`text-[11px] font-bold ${trendColor(s.technical_stage)}`}>
                        {trendIcon(s.technical_stage)} {s.technical_stage.split(" —")[0]}
                      </span>
                    </td>
                    {/* MA50 */}
                    <td className={`px-4 py-2.5 text-right font-mono text-xs tabular-nums ${s.price > s.ma50 && s.ma50 > 0 ? "text-emerald-400" : "text-[#52525b]"}`}>
                      {s.ma50 > 0 ? `$${s.ma50.toFixed(0)}` : "—"}
                    </td>
                    {/* MA200 */}
                    <td className={`px-4 py-2.5 text-right font-mono text-xs tabular-nums ${s.price > s.ma200 && s.ma200 > 0 ? "text-emerald-400" : "text-[#52525b]"}`}>
                      {s.ma200 > 0 ? `$${s.ma200.toFixed(0)}` : "—"}
                    </td>
                    {/* RSI */}
                    <td className={`px-4 py-2.5 text-right font-mono text-xs font-semibold tabular-nums ${rsiColor(s.rsi14)}`}>
                      {s.rsi14 > 0 ? s.rsi14.toFixed(0) : "—"}
                    </td>
                    {/* 52W Range % */}
                    <td className={`px-4 py-2.5 text-right font-mono text-xs tabular-nums ${s.range_pct > 70 ? "text-emerald-400" : s.range_pct > 40 ? "text-amber-400" : "text-rose-400"}`}>
                      {s.range_pct > 0 ? `${s.range_pct.toFixed(0)}%` : "—"}
                    </td>
                    {/* Golden Cross */}
                    <td className="px-4 py-2.5 text-center">
                      <span className={`text-[10px] font-bold ${s.golden_cross ? "text-emerald-400" : "text-[#27272a]"}`}>
                        {s.golden_cross ? "✓ GC" : "—"}
                      </span>
                    </td>
                    {/* Action */}
                    <td className="px-4 py-2.5 text-center">
                      <Link href={`/analyzer?ticker=${s.ticker}&market=US`}
                        className="text-[10px] font-semibold px-3 py-1.5 rounded border bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20 transition-colors no-underline whitespace-nowrap">
                        Analyze →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="grid grid-cols-2 gap-6 border-t border-[#1E2530] bg-[#0A0D14] p-4 text-[11px] text-[#64748B]">
            <div className="space-y-1">
              <p className="font-semibold text-[#94a3b8] uppercase tracking-wider text-[10px]">Score Guide</p>
              <div className="flex items-center gap-2"><div className="w-0.5 h-3 rounded-full bg-emerald-400" /><span>8-10: Strong uptrend + momentum + golden cross</span></div>
              <div className="flex items-center gap-2"><div className="w-0.5 h-3 rounded-full bg-amber-400" /><span>6-7: Above key MAs, positive setup</span></div>
              <div className="flex items-center gap-2"><div className="w-0.5 h-3 rounded-full bg-blue-400" /><span>4-5: Mixed signals, partial confirmation</span></div>
              <div className="flex items-center gap-2"><div className="w-0.5 h-3 rounded-full bg-rose-400" /><span>1-3: Below MAs, weak setup</span></div>
            </div>
            <div className="space-y-1">
              <p className="font-semibold text-[#94a3b8] uppercase tracking-wider text-[10px]">Columns</p>
              <p className="text-[10px]"><span className="text-emerald-400">MA50/MA200</span> — Green = price above (bullish). <span className="text-emerald-400">GC</span> = Golden Cross (MA50 &gt; MA200).</p>
              <p className="text-[10px]"><span className="text-amber-400">RSI</span> — 40-65 sweet spot. <span className="text-emerald-400">52W%</span> — Position in 52-week range (higher = stronger momentum).</p>
              <p className="text-[10px] text-[#3f3f46] mt-1">Click "Analyze →" on any stock for full institutional deep analysis with AI narrative.</p>
            </div>
          </div>
        </div>
      )}

      {!scanning && scanData && sorted.length === 0 && (
        <EmptyState title="No data returned" subtitle="Backend may still be starting. Wait 30s and try again." />
      )}

      <p className="text-[10px] text-[#27272a] text-center">
        AlphaResearch 10-Bagger Screen · Technical Setup Scoring · Not financial advice
      </p>
    </div>
  );
}