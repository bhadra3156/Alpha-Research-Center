// ─────────────────────────────────────────────────────────────────────────────
// AlphaResearch — Deep Analyzer (Phase 2)
// Single-stock institutional analysis · 3-Check panels · AI narrative
// No duplicate Navbar — uses Layout.tsx shared shell
// ─────────────────────────────────────────────────────────────────────────────
"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import {
  KpiCard,
  ConvictionBar,
  CheckBadge,
  StageTag,
  DataQualityBadge,
  CopyButton,
  ScanLoading,
  EmptyState,
} from "@/components/shared/ui-primitives";

// ─── Helpers ─────────────────────────────────────────────────────────────────
function convColor(s: number) {
  if (s >= 9) return "text-emerald-400";
  if (s >= 7) return "text-amber-400";
  if (s >= 5) return "text-blue-400";
  return "text-rose-400";
}

function stageShort(st: string) {
  if (st?.includes("Stage 2")) return "STG2 Markup";
  if (st?.includes("Stage 1")) return "STG1 Accumulation";
  return "STG3/4 Avoid";
}

function stageColor(st: string) {
  if (st?.includes("Stage 2")) return "text-emerald-400";
  if (st?.includes("Stage 1")) return "text-blue-400";
  return "text-rose-400";
}

function fmtPrice(v: number) {
  return v > 0 ? `$${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—";
}

function addToWatchlist(ticker: string, market: string, data: any) {
  try {
    const existing = JSON.parse(localStorage.getItem("alpha_watchlist_v3") || "[]");
    if (existing.find((i: any) => i.ticker === ticker)) {
      alert(ticker + " already in watchlist");
      return;
    }
    const item = {
      id: Date.now().toString(),
      ticker,
      market,
      sector: data?.sector || "",
      theme: "",
      added: new Date().toISOString().split("T")[0],
      notes: data
        ? `${data.technical_stage} | Conv:${data.conviction_score}/10 | Entry:${data.entry_zone}`
        : "",
      score: data?.conviction_score || 0,
      c1_pass: data?.check1?.pass || false,
      c2_pass: data?.check2?.pass || false,
      stage: data?.technical_stage || "",
      rsi: data?.rsi14 || 0,
      entry_zone: data?.entry_zone || "",
      graduated: false,
    };
    localStorage.setItem("alpha_watchlist_v3", JSON.stringify([...existing, item]));
    alert("✅ " + ticker + " added to watchlist!");
  } catch (e) {
    alert("Failed to add to watchlist");
  }
}

// ─── Quick Ticker Buttons ────────────────────────────────────────────────────
const QUICK_TICKERS = [
  { ticker: "NVDA", market: "US" },
  { ticker: "AMD", market: "US" },
  { ticker: "MSFT", market: "US" },
  { ticker: "GOOGL", market: "US" },
  { ticker: "AVGO", market: "US" },
  { ticker: "BA.L", market: "UK" },
  { ticker: "RR.L", market: "UK" },
];

// ─── Bloomberg Data Row ──────────────────────────────────────────────────────
function DataRow({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="flex justify-between items-center px-4 py-2.5 text-xs hover:bg-[#161C28]/60 transition-colors">
      <span className="text-[#64748B]">{label}</span>
      <span className={`font-mono font-semibold ${color || "text-[#a1a1aa]"}`}>
        {value}
      </span>
    </div>
  );
}

// ─── Inner Component (needs Suspense for useSearchParams) ────────────────────
function AnalyzerInner() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [ticker, setTicker] = useState(searchParams?.get("ticker") || "");
  const [market, setMarket] = useState(searchParams?.get("market") || "US");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Auto-load if ticker comes from URL (e.g., from Dashboard "Deep Analyze →")
  useEffect(() => {
    const t = searchParams?.get("ticker");
    if (t && t !== ticker) {
      setTicker(t);
      setMarket(searchParams?.get("market") || "US");
    }
  }, [searchParams]);

  const analyze = async () => {
    if (!ticker.trim()) {
      setError("Enter a ticker symbol");
      return;
    }
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const result = await api.analyze(ticker.trim(), market);
      setData(result);
      // Update URL without reload
      router.replace(`/analyzer?ticker=${ticker.trim().toUpperCase()}&market=${market}`, {
        scroll: false,
      });
    } catch (e: any) {
      setError(
        e.message || "Analysis failed — backend may be cold-starting (~30s)"
      );
    }
    setLoading(false);
  };

  // Extract data fields safely
  const price = data?.price || 0;
  const changePct = data?.change_pct || 0;
  const mktCap = data?.market_cap || 0;
  const techStage = data?.check2?.stage || data?.technical_stage || "";
  const rsi = data?.check2?.rsi14 || data?.rsi14 || 0;
  const ma50 = data?.check2?.ma50 || data?.ma50 || 0;
  const ma200 = data?.check2?.ma200 || data?.ma200 || 0;
  const goldenCross = data?.check2?.golden_cross || data?.golden_cross || false;
  const entryZone = data?.check2?.entry_zone || data?.entry_zone || "";
  const w52h = data?.check2?.week52_high || data?.week52_high || 0;
  const w52l = data?.check2?.week52_low || data?.week52_low || 0;
  const revGrowth = data?.check1?.details?.revenue_growth?.value || "";
  const profitability = data?.check1?.details?.profitability?.value || "";
  const valuation = data?.check1?.details?.valuation?.value || "";
  const fundQuality = data?.check1?.quality || "";
  const fundScore = data?.check1?.score || 0;
  const conviction = data?.conviction_score || 0;
  const verdict = data?.verdict || "";
  const narrative = data?.narrative || "";
  const sector = data?.sector || data?.check1?.details?.listing?.note || "";
  const dataQuality = data?.data_quality || "MEDIUM";
  const c1Pass = data?.check1?.pass || false;
  const c2Pass = data?.check2?.pass || false;
  const c3Pass = data?.check3?.pass || false;

  return (
    <div className="space-y-6">
      {/* ── Header + Search Bar ──────────────────────────────────────────── */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-[18px] font-bold tracking-tight text-[#fafafa]">
            Deep <span className="text-amber-400">Analyzer</span>
          </h1>
          <p className="text-xs text-[#52525b] mt-0.5">
            Full institutional 3-Check analysis · AI-powered narrative
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <input
            value={ticker}
            onChange={(e) => setTicker(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === "Enter" && analyze()}
            placeholder="Enter ticker e.g. NVDA"
            className="bg-[#09090b] border border-[#27272a] text-[#FFB000] font-bold px-4 py-2.5 text-sm rounded-lg focus:outline-none focus:border-amber-500/50 w-52 tracking-wider font-mono"
          />
          <select
            value={market}
            onChange={(e) => setMarket(e.target.value)}
            className="bg-[#09090b] border border-[#27272a] text-[#fafafa] px-3 py-2.5 text-xs rounded-lg focus:outline-none"
          >
            <option value="US">🇺🇸 US</option>
            <option value="UK">🇬🇧 UK</option>
          </select>
          <button
            onClick={analyze}
            disabled={loading}
            className={`px-6 py-2.5 text-xs font-bold rounded-lg transition-all ${
              loading
                ? "bg-amber-500/10 text-amber-400 border border-amber-500/20 cursor-wait"
                : "bg-amber-500 hover:bg-amber-400 text-black shadow-lg shadow-amber-500/20 active:translate-y-px"
            }`}
          >
            {loading ? "Analyzing…" : "⚡ Analyze"}
          </button>
          <Link
            href="/dashboard"
            className="px-4 py-2.5 text-xs font-medium rounded-lg border border-[#27272a] text-[#a1a1aa] hover:text-[#fafafa] hover:border-[#52525b] transition-colors no-underline"
          >
            ← Back
          </Link>
        </div>
      </div>

      {/* ── Error ────────────────────────────────────────────────────────── */}
      {error && (
        <div className="bg-rose-950/40 border border-rose-800/40 text-rose-400 text-xs px-4 py-3 rounded-lg">
          ⚠ {error}
        </div>
      )}

      {/* ── Loading ──────────────────────────────────────────────────────── */}
      {loading && (
        <ScanLoading label={`⚡ Analyzing ${ticker.toUpperCase()}`} />
      )}

      {/* ── Empty State ──────────────────────────────────────────────────── */}
      {!loading && !data && !error && (
        <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-16 text-center space-y-6">
          <div className="text-4xl">🔬</div>
          <p className="text-[#fafafa] text-sm font-semibold">
            Enter a Ticker to Analyze
          </p>
          <p className="text-xs text-[#52525b] max-w-md mx-auto">
            Type any US or UK stock ticker above and hit Analyze to generate a
            full institutional report.
          </p>
          <div className="flex justify-center gap-2 flex-wrap">
            {QUICK_TICKERS.map((qt) => (
              <button
                key={qt.ticker}
                onClick={() => {
                  setTicker(qt.ticker);
                  setMarket(qt.market);
                }}
                className="px-4 py-2 text-xs font-mono font-bold rounded-lg border border-amber-500/30 text-amber-400 bg-amber-500/5 hover:bg-amber-500/15 transition-colors"
              >
                {qt.ticker}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Results ──────────────────────────────────────────────────────── */}
      {data && !loading && (
        <>
          {/* Action Bar */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => addToWatchlist(data.ticker, data.market, data)}
              className="px-4 py-2 text-xs font-medium rounded-lg border bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20 transition-colors"
            >
              + Watchlist
            </button>
            <div className="flex-1" />
            <DataQualityBadge quality={dataQuality} />
            <CopyButton
              text={`${data.ticker} | ${fmtPrice(price)} | ${techStage} | Conv:${conviction}/10 | Entry:${entryZone}\n\n${narrative}`}
            />
          </div>

          {/* KPI Strip */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <KpiCard
              label="Price"
              value={fmtPrice(price)}
              sub={data.company_name || ticker}
              color="text-[#fafafa]"
            />
            <KpiCard
              label="Change"
              value={
                changePct
                  ? `${changePct > 0 ? "+" : ""}${changePct.toFixed(1)}%`
                  : "—"
              }
              sub="vs prev close"
              color={changePct > 0 ? "text-emerald-400" : "text-rose-400"}
            />
            <KpiCard
              label="Mkt Cap"
              value={
                mktCap >= 1e9
                  ? `$${(mktCap / 1e9).toFixed(1)}B`
                  : mktCap > 0
                    ? `$${(mktCap / 1e6).toFixed(0)}M`
                    : "—"
              }
              sub={sector || "—"}
            />
            <KpiCard
              label="Stage"
              value={stageShort(techStage)}
              sub={`RSI ${rsi > 0 ? rsi.toFixed(0) : "—"}`}
              color={stageColor(techStage)}
            />
            <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-5 shadow-sm space-y-2">
              <p className="text-[10px] font-semibold text-[#71717a] uppercase tracking-widest">
                Conviction
              </p>
              <div className="flex items-center gap-3">
                <ConvictionBar score={conviction} />
                <span
                  className={`text-2xl font-bold font-mono ${convColor(conviction)}`}
                >
                  {conviction}/10
                </span>
              </div>
              <p className="text-xs text-[#52525b]">
                {verdict === "ACCUMULATE"
                  ? "ACCUMULATE — High conviction"
                  : verdict === "HOLD"
                    ? "HOLD — Monitor for entry"
                    : "AVOID — Does not qualify"}
              </p>
            </div>
          </div>

          {/* 3-Check Panels */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              {
                num: "01",
                name: "Fundamentals",
                pass: c1Pass,
                detail: `Score ${fundScore}/4.5 · ${fundQuality || "—"} Quality`,
              },
              {
                num: "02",
                name: "Technicals",
                pass: c2Pass,
                detail: `${stageShort(techStage)} · RSI ${rsi > 0 ? rsi.toFixed(0) : "—"} · ${goldenCross ? "Golden Cross ✓" : "No GC"}`,
              },
              {
                num: "03",
                name: "Smart Money",
                pass: c3Pass,
                detail: `${data?.check3?.signal_count || 0} signal(s) · ${data?.check3?.primary_signal?.type || "Institutional"}`,
              },
            ].map((c) => (
              <div
                key={c.num}
                className={`bg-[#18181b] border rounded-xl p-5 space-y-2 ${
                  c.pass
                    ? "border-emerald-800/40"
                    : "border-rose-800/40"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-[#52525b] uppercase tracking-widest">
                    Check {c.num}
                  </span>
                  <CheckBadge pass={c.pass} />
                </div>
                <p
                  className={`text-sm font-bold ${c.pass ? "text-emerald-400" : "text-rose-400"}`}
                >
                  {c.name}
                </p>
                <p className="text-xs text-[#52525b]">{c.detail}</p>
              </div>
            ))}
          </div>

          {/* Data Grids */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Technical Analysis */}
            <div className="w-full overflow-hidden rounded-lg border border-[#1E2530] bg-[#0C0F16]">
              <div className="px-4 py-3 bg-[#0A0D14] border-b border-[#1E2530]">
                <span className="text-xs font-semibold text-[#a1a1aa] uppercase tracking-wider">
                  Technical Analysis
                </span>
              </div>
              <div className="divide-y divide-[#1E2530]/50">
                <DataRow label="Stage" value={stageShort(techStage)} color={stageColor(techStage)} />
                <DataRow label="RSI (14)" value={rsi > 0 ? rsi.toFixed(1) : "—"} color={rsi > 70 ? "text-rose-400" : rsi > 50 ? "text-amber-400" : "text-emerald-400"} />
                <DataRow label="MA 50-Day" value={ma50 > 0 ? fmtPrice(ma50) : "—"} color={price > ma50 ? "text-emerald-400" : "text-rose-400"} />
                <DataRow label="MA 200-Day" value={ma200 > 0 ? fmtPrice(ma200) : "—"} color={price > ma200 ? "text-emerald-400" : "text-rose-400"} />
                <DataRow label="Golden Cross" value={goldenCross ? "YES ✓" : "NO"} color={goldenCross ? "text-emerald-400" : "text-rose-400"} />
                <DataRow label="Entry Zone" value={entryZone || "—"} color="text-blue-400" />
                <DataRow label="52W High" value={w52h > 0 ? fmtPrice(w52h) : "—"} />
                <DataRow label="52W Low" value={w52l > 0 ? fmtPrice(w52l) : "—"} />
              </div>
            </div>

            {/* Fundamental Analysis */}
            <div className="w-full overflow-hidden rounded-lg border border-[#1E2530] bg-[#0C0F16]">
              <div className="px-4 py-3 bg-[#0A0D14] border-b border-[#1E2530]">
                <span className="text-xs font-semibold text-[#a1a1aa] uppercase tracking-wider">
                  Fundamental Analysis
                </span>
              </div>
              <div className="divide-y divide-[#1E2530]/50">
                <DataRow label="Revenue Growth" value={revGrowth || "N/A"} color={revGrowth?.includes("+") ? "text-emerald-400" : "text-amber-400"} />
                <DataRow label="Profitability" value={profitability || "N/A"} color={profitability?.includes("High") ? "text-emerald-400" : "text-amber-400"} />
                <DataRow label="Valuation" value={valuation || "N/A"} color="text-amber-400" />
                <DataRow label="Fund. Quality" value={fundQuality || "—"} color={fundQuality === "HIGH" ? "text-emerald-400" : fundQuality === "LOW" ? "text-rose-400" : "text-amber-400"} />
                <DataRow label="Fund. Score" value={`${fundScore}/4.5`} color={fundScore >= 3 ? "text-emerald-400" : "text-amber-400"} />
                <DataRow label="C1 Verdict" value={c1Pass ? "PASS" : "FAIL"} color={c1Pass ? "text-emerald-400" : "text-rose-400"} />
                <DataRow label="C2 Verdict" value={c2Pass ? "PASS" : "FAIL"} color={c2Pass ? "text-emerald-400" : "text-rose-400"} />
                <DataRow label="Data Quality" value={dataQuality} color={dataQuality === "HIGH" ? "text-emerald-400" : "text-amber-400"} />
              </div>
            </div>
          </div>

          {/* AI Narrative */}
          {narrative && (
            <div className="w-full overflow-hidden rounded-lg border border-[#1E2530] bg-[#0C0F16]">
              <div className="flex items-center gap-3 px-4 py-3 bg-[#0A0D14] border-b border-[#1E2530]">
                <span className="text-xs font-semibold text-[#a1a1aa] uppercase tracking-wider">
                  Institutional Narrative
                </span>
                <span className="bg-blue-950/80 text-blue-400 border border-blue-800/40 text-[10px] font-bold px-2 py-0.5 rounded">
                  AI Generated
                </span>
                <div className="flex-1" />
                <CopyButton text={narrative} />
              </div>
              <div className="p-5 max-h-[500px] overflow-y-auto">
                <pre className="text-xs text-[#94a3b8] leading-relaxed whitespace-pre-wrap font-mono">
                  {narrative}
                </pre>
              </div>
              <div className="px-4 py-2 border-t border-[#1E2530] bg-[#0A0D14] text-[10px] text-[#3f3f46]">
                Data: Yahoo Finance v8 · AI: Claude Sonnet / Groq LLaMA · Not
                financial advice
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <p className="text-[10px] text-[#27272a] text-center">
        AlphaResearch Deep Analyzer · 3-Check Institutional Analysis · Not
        financial advice
      </p>
    </div>
  );
}

// ─── Page Export (Suspense boundary for useSearchParams) ─────────────────────
export default function AnalyzerPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-32">
          <p className="text-amber-400 text-sm">Loading Analyzer…</p>
        </div>
      }
    >
      <AnalyzerInner />
    </Suspense>
  );
}