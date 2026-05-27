// ─────────────────────────────────────────────────────────────────────────────
// AlphaResearch — Dashboard (Equity Intelligence Command Center)
// Live 3-Check scan · Bloomberg-spec master table · Conviction color-coding
// ─────────────────────────────────────────────────────────────────────────────
"use client";

import React, { useState, useCallback } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import type { QualifyingStock, ScanResponse } from "@/lib/types";
import {
  KpiCard,
  ConvictionBar,
  CheckBadge,
  StageTag,
  DataQualityBadge,
  ScanLoading,
  EmptyState,
} from "@/components/shared/ui-primitives";

// ─── Helpers ─────────────────────────────────────────────────────────────────
function fmtPrice(v: number, market: string) {
  if (market === "UK") {
    return v < 1 ? `${(v * 100).toFixed(1)}p` : `£${v.toFixed(2)}`;
  }
  return `$${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtMktCap(v: number) {
  if (v >= 1e12) return `$${(v / 1e12).toFixed(2)}T`;
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

// ─── Filter Constants ────────────────────────────────────────────────────────
const MARKETS = ["Both", "US", "UK"] as const;
const CONVICTION_FILTERS = ["All", "High (8–10)", "Medium (5–7)", "Low (1–4)"] as const;
const THEMES = [
  "All",
  "AI Infrastructure",
  "Semiconductors",
  "Cloud",
  "Defence",
  "Energy",
  "Healthcare",
  "Financials",
  "Consumer",
] as const;

// ─── Table Header Columns ────────────────────────────────────────────────────
const COLUMNS = [
  { key: "conviction", label: "Conv.", align: "text-center" },
  { key: "ticker", label: "Ticker", align: "text-left" },
  { key: "company", label: "Company", align: "text-left" },
  { key: "price", label: "Price", align: "text-right" },
  { key: "chg", label: "Chg%", align: "text-right" },
  { key: "mktcap", label: "Mkt Cap", align: "text-right" },
  { key: "fund", label: "Fundamental", align: "text-center" },
  { key: "tech", label: "Stage", align: "text-center" },
  { key: "smart", label: "Smart $", align: "text-left" },
  { key: "rsi", label: "RSI", align: "text-right" },
  { key: "entry", label: "Entry Zone", align: "text-right" },
  { key: "dq", label: "DQ", align: "text-center" },
  { key: "action", label: "", align: "text-center" },
] as const;

// ─── Dashboard Page ──────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [marketFilter, setMarketFilter] = useState<string>("Both");
  const [themeFilter, setThemeFilter] = useState<string>("All");
  const [convFilter, setConvFilter] = useState<string>("All");
  const [sortCol, setSortCol] = useState<string>("conviction");
  const [sortAsc, setSortAsc] = useState(false);

  const [scanning, setScanning] = useState(false);
  const [scanData, setScanData] = useState<ScanResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ── Run Scan ─────────────────────────────────────────────────────────────
  const runScan = useCallback(async () => {
    setScanning(true);
    setError(null);
    try {
      const marketParam =
        marketFilter === "US" ? "US" : marketFilter === "UK" ? "UK" : "BOTH";
      const data = await api.scan(marketParam);
      setScanData(data);
    } catch (e: any) {
      setError(e.message || "Scan failed — backend may be cold-starting on Render (takes ~30s)");
    }
    setScanning(false);
  }, [marketFilter]);

  // ── Filter + Sort ────────────────────────────────────────────────────────
  const stocks = scanData?.qualifying_stocks || [];

  const filtered = stocks.filter((s) => {
    if (marketFilter !== "Both" && s.market !== marketFilter) return false;
    if (themeFilter !== "All" && !s.sector?.toLowerCase().includes(themeFilter.toLowerCase()))
      return false;
    if (convFilter === "High (8–10)" && s.conviction_score < 8) return false;
    if (convFilter === "Medium (5–7)" && (s.conviction_score < 5 || s.conviction_score > 7))
      return false;
    if (convFilter === "Low (1–4)" && s.conviction_score > 4) return false;
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

  // ── KPI Summary ──────────────────────────────────────────────────────────
  const highConv = stocks.filter((s) => s.conviction_score >= 8).length;
  const avgConv =
    stocks.length > 0
      ? (stocks.reduce((a, b) => a + b.conviction_score, 0) / stocks.length).toFixed(1)
      : "—";
  const passAll = stocks.filter((s) => s.check1_pass && s.check2_pass && s.check3_pass).length;

  return (
    <div className="space-y-5">
      {/* ── Page Header ──────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-[18px] font-bold tracking-tight text-[#fafafa]">
            Equity Intelligence
          </h1>
          <p className="text-xs text-[#52525b] mt-0.5">
            3-Check Institutional Scanner · US &amp; UK Markets
          </p>
        </div>

        <button
          onClick={runScan}
          disabled={scanning}
          className={`px-6 py-2.5 text-xs font-bold rounded-lg transition-all ${
            scanning
              ? "bg-amber-500/10 text-amber-400 border border-amber-500/20 cursor-wait"
              : "bg-amber-500 hover:bg-amber-400 text-black shadow-lg shadow-amber-500/20 active:translate-y-px"
          }`}
        >
          {scanning ? "⚡ Scanning…" : "⚡ Run 3-Check Scan"}
        </button>
      </div>

      {/* ── KPI Strip ────────────────────────────────────────────────────── */}
      {scanData && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <KpiCard
            label="Scanned"
            value={String(scanData.stocks_scanned)}
            sub="Total universe"
          />
          <KpiCard
            label="Qualifying"
            value={String(scanData.qualifying_count)}
            sub="Passed 3-Check"
            color="text-emerald-400"
          />
          <KpiCard
            label="High Conviction"
            value={String(highConv)}
            sub="Score ≥ 8"
            color="text-amber-400"
          />
          <KpiCard
            label="Avg Conviction"
            value={avgConv}
            sub="Across qualifiers"
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
            Filters
          </span>

          {/* Market */}
          <select
            value={marketFilter}
            onChange={(e) => setMarketFilter(e.target.value)}
            className="bg-[#09090b] border border-[#27272a] text-[#fafafa] px-3 py-1.5 text-xs rounded focus:outline-none focus:border-amber-500/40"
          >
            {MARKETS.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>

          {/* Theme */}
          <select
            value={themeFilter}
            onChange={(e) => setThemeFilter(e.target.value)}
            className="bg-[#09090b] border border-[#27272a] text-[#fafafa] px-3 py-1.5 text-xs rounded focus:outline-none focus:border-amber-500/40"
          >
            {THEMES.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>

          {/* Conviction */}
          <select
            value={convFilter}
            onChange={(e) => setConvFilter(e.target.value)}
            className="bg-[#09090b] border border-[#27272a] text-[#fafafa] px-3 py-1.5 text-xs rounded focus:outline-none focus:border-amber-500/40"
          >
            {CONVICTION_FILTERS.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>

          <div className="flex-1" />

          <div className="flex items-center gap-3">
            {[
              { dot: "bg-emerald-400", text: `${sorted.length} qualifying` },
              { dot: "bg-amber-400", text: `${highConv} high conviction` },
              { dot: "bg-blue-400", text: `${passAll} full 3-check pass` },
            ].map((s, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <div className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                <span className="text-[10px] text-[#52525b]">{s.text}</span>
              </div>
            ))}
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
      {scanning && <ScanLoading label="⚡ Running 3-Check Scan across US + UK universe…" />}

      {/* ── Pre-scan state ───────────────────────────────────────────────── */}
      {!scanning && !scanData && !error && (
        <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-16 text-center space-y-5">
          <p className="text-[#a1a1aa] text-sm font-semibold tracking-wider uppercase">
            Equity Intelligence Command Center
          </p>
          <p className="text-xs text-[#52525b] max-w-md mx-auto">
            Run a full 3-Check institutional scan across 170+ US and UK equities.
            Only stocks passing Fundamentals, Technicals, AND Smart Money appear.
          </p>
          <div className="flex justify-center gap-px mt-4 max-w-lg mx-auto">
            {[
              ["01", "Fundamentals", "Revenue · Margins · FCF · Balance Sheet · PEG"],
              ["02", "Technicals", "Weinstein Stage · MA50/200 · RSI · Volume · Breakout"],
              ["03", "Smart Money", "13F Institutional · Form 4 Insider · STOCK Act"],
            ].map(([num, title, desc]) => (
              <div
                key={num}
                className="flex-1 p-4 bg-[#09090b] border border-[#27272a] text-left space-y-1"
              >
                <p className="text-[#FFB000] text-[10px] font-semibold tracking-widest">
                  CHECK {num}
                </p>
                <p className="text-[#a1a1aa] text-xs font-semibold">{title}</p>
                <p className="text-[#52525b] text-[10px]">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Bloomberg-Spec Master Table ──────────────────────────────────── */}
      {!scanning && scanData && sorted.length > 0 && (
        <div className="w-full overflow-hidden rounded-lg border border-[#1E2530] bg-[#0C0F16]">
          <div className="overflow-x-auto">
            <table className="w-full">
              {/* Header */}
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

              {/* Body */}
              <tbody>
                {sorted.map((s) => {
                  const allPass = s.check1_pass && s.check2_pass && s.check3_pass;
                  return (
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
                        <div className="flex items-center gap-2">
                          <span className="text-[10px]">
                            {s.market === "UK" ? "🇬🇧" : "🇺🇸"}
                          </span>
                          <span className="font-bold text-[#FFB000] text-sm tracking-wide">
                            {s.ticker}
                          </span>
                        </div>
                      </td>

                      {/* Company */}
                      <td className="px-4 py-2.5 text-xs text-[#a1a1aa] max-w-[160px] truncate">
                        {s.company_name}
                      </td>

                      {/* Price */}
                      <td className="px-4 py-2.5 text-right font-mono text-sm text-[#fafafa] font-semibold tabular-nums">
                        {fmtPrice(s.price, s.market)}
                      </td>

                      {/* Change % */}
                      <td className={`px-4 py-2.5 text-right font-mono text-xs font-semibold tabular-nums ${chgColor(s.change_pct)}`}>
                        {s.change_pct > 0 ? "+" : ""}
                        {s.change_pct.toFixed(1)}%
                      </td>

                      {/* Market Cap */}
                      <td className="px-4 py-2.5 text-right font-mono text-xs text-[#a1a1aa] tabular-nums">
                        {fmtMktCap(s.market_cap)}
                      </td>

                      {/* Fundamental */}
                      <td className="px-4 py-2.5 text-center">
                        <CheckBadge pass={s.check1_pass} />
                      </td>

                      {/* Technical Stage */}
                      <td className="px-4 py-2.5 text-center">
                        <StageTag stage={s.technical_stage} />
                      </td>

                      {/* Smart Money */}
                      <td className="px-4 py-2.5 text-xs text-[#a1a1aa]">
                        {s.smart_money_trigger || "—"}
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
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* ── Table Footer / Legend ───────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-6 border-t border-[#1E2530] bg-[#0A0D14] p-4 text-[11px] text-[#64748B]">
            {/* Conviction Legend */}
            <div className="space-y-1.5">
              <p className="font-semibold text-[#94a3b8] uppercase tracking-wider text-[10px]">
                Conviction Tiers
              </p>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-0.5 h-3 rounded-full bg-emerald-400" />
                  <span>9–10 Maximum Conviction</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-0.5 h-3 rounded-full bg-amber-400" />
                  <span>7–8 High Conviction</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-0.5 h-3 rounded-full bg-blue-400" />
                  <span>5–6 Moderate</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-0.5 h-3 rounded-full bg-rose-400" />
                  <span>1–4 Low — Monitor Only</span>
                </div>
              </div>
            </div>

            {/* Data Quality Legend */}
            <div className="space-y-1.5">
              <p className="font-semibold text-[#94a3b8] uppercase tracking-wider text-[10px]">
                Data Quality
              </p>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <DataQualityBadge quality="HIGH" />
                  <span>Mkt cap &gt;$10B · Primary sources verified</span>
                </div>
                <div className="flex items-center gap-2">
                  <DataQualityBadge quality="MEDIUM" />
                  <span>Mkt cap $1B–$10B · Some data gaps</span>
                </div>
                <div className="flex items-center gap-2">
                  <DataQualityBadge quality="LOW" />
                  <span>Mkt cap &lt;$1B · Limited coverage</span>
                </div>
              </div>
              <p className="text-[10px] text-[#3f3f46] mt-2">
                3-Check Rule: Only stocks passing ALL three checks (Fundamental +
                Technical + Smart Money) qualify. 2/3 = rejected.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── No Results ───────────────────────────────────────────────────── */}
      {!scanning && scanData && sorted.length === 0 && (
        <EmptyState
          title="No stocks match current filters"
          subtitle="Adjust market, theme, or conviction filters, or run a new scan."
        />
      )}

      {/* ── Footer Disclaimer ────────────────────────────────────────────── */}
      <p className="text-[10px] text-[#27272a] text-center">
        AlphaResearch Institutional Equity Intelligence · Data from Yahoo
        Finance + SEC EDGAR · Not financial advice
      </p>
    </div>
  );
}