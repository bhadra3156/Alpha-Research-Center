// ─────────────────────────────────────────────────────────────────────────────
// AlphaResearch — Watchlist Manager
// Add/score/analyze stocks · Lynch+Wyckoff AI · Graduate to portfolio
// No duplicate Navbar — uses Layout.tsx shared shell
// ─────────────────────────────────────────────────────────────────────────────
"use client";

import React, { useState, useEffect } from "react";
import {
  KpiCard,
  ConvictionBar,
  CheckBadge,
  CopyButton,
} from "@/components/shared/ui-primitives";

// ─── Constants ───────────────────────────────────────────────────────────────
const BACKEND = "https://alpha-research-center-backend.onrender.com";

const SECTORS = [
  "Technology", "Healthcare", "Financials", "Energy", "Industrials",
  "Consumer", "Real Estate", "Materials", "Utilities", "Communication",
  "AI Infrastructure",
];

const THEMES = [
  "AI Infrastructure", "Defence", "Energy Transition", "Healthcare AI",
  "Crypto", "EV", "Semiconductors", "Cloud", "Biotech", "Value",
  "Growth", "Dividend",
];

// ─── Types ───────────────────────────────────────────────────────────────────
interface WatchItem {
  id: string;
  ticker: string;
  market: string;
  sector: string;
  theme: string;
  notes: string;
  added: string;
  score: number;
  c1_pass: boolean;
  c2_pass: boolean;
  stage: string;
  rsi: number;
  entry_zone: string;
  graduated: boolean;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function daysSince(d: string) {
  return Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
}

function convColor(s: number) {
  if (s >= 9) return "text-emerald-400";
  if (s >= 7) return "text-amber-400";
  if (s >= 5) return "text-blue-400";
  return "text-rose-400";
}

// ─── Page ────────────────────────────────────────────────────────────────────
export default function Watchlist() {
  const [items, setItems] = useState<WatchItem[]>([]);
  const [ticker, setTicker] = useState("");
  const [market, setMarket] = useState("US");
  const [sector, setSector] = useState("");
  const [theme, setTheme] = useState("");
  const [notes, setNotes] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState<"score" | "added" | "ticker">("score");
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [scoring, setScoring] = useState(false);
  const [autoFilling, setAutoFilling] = useState(false);

  // Load from localStorage
  useEffect(() => {
    try {
      const s = localStorage.getItem("alpha_watchlist_v3");
      if (s) setItems(JSON.parse(s));
    } catch (e) {}
  }, []);

  const persist = (list: WatchItem[]) => {
    setItems(list);
    try {
      localStorage.setItem("alpha_watchlist_v3", JSON.stringify(list));
    } catch (e) {}
  };

  // ── Auto-fill sector/theme/notes from AI ──────────────────────────────
  const autoFill = async (t: string) => {
    if (!t) return;
    setAutoFilling(true);
    try {
      const res = await fetch(`${BACKEND}/analyze/ticker-info`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticker: t.toUpperCase(), market }),
      });
      if (res.ok) {
        const d = await res.json();
        if (d.sector) setSector(d.sector);
        if (d.theme) setTheme(d.theme);
        if (d.notes) setNotes(d.notes);
      }
    } catch (e) {}
    setAutoFilling(false);
  };

  // ── Add Item ──────────────────────────────────────────────────────────
  const addItem = () => {
    if (!ticker.trim()) {
      setMsg({ text: "Enter ticker symbol", ok: false });
      return;
    }
    const t = ticker.trim().toUpperCase();
    if (items.find((i) => i.ticker === t && i.market === market)) {
      setMsg({ text: `${t} already in watchlist`, ok: false });
      return;
    }
    const item: WatchItem = {
      id: Date.now().toString(),
      ticker: t,
      market,
      sector,
      theme,
      notes,
      added: new Date().toISOString().split("T")[0],
      score: 0,
      c1_pass: false,
      c2_pass: false,
      stage: "",
      rsi: 0,
      entry_zone: "",
      graduated: false,
    };
    persist([...items, item]);
    setMsg({ text: `${t} added to watchlist`, ok: true });
    setTicker("");
    setSector("");
    setTheme("");
    setNotes("");
  };

  const remove = (id: string) => persist(items.filter((i) => i.id !== id));

  // ── Score All vs 3-Checks ─────────────────────────────────────────────
  const scoreAll = async () => {
    if (!items.length) return;
    setScoring(true);
    setMsg({ text: "Scoring against 3-Check criteria...", ok: true });
    try {
      const res = await fetch(`${BACKEND}/scan/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          market: "US",
          tickers: items.map((i) => i.ticker),
          notify_telegram: false,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const map: Record<string, any> = {};
        (data.qualifying_stocks || []).forEach((s: any) => {
          map[s.ticker] = s;
        });
        const updated = items.map((item) => {
          const q = map[item.ticker];
          return q
            ? {
                ...item,
                score: q.conviction_score,
                c1_pass: q.check1_pass,
                c2_pass: q.check2_pass,
                stage: q.technical_stage,
                rsi: q.rsi14 || 0,
                entry_zone: q.entry_zone || "",
              }
            : { ...item, score: item.score || 0 };
        });
        persist(updated);
        const qual = updated.filter((i) => i.c1_pass && i.c2_pass).length;
        setMsg({
          text: `Scoring complete — ${qual} qualifying / ${items.length} total`,
          ok: true,
        });
      }
    } catch (e) {
      setMsg({ text: "Scoring failed — backend may be waking up", ok: false });
    }
    setScoring(false);
  };

  // ── Lynch+Wyckoff AI Analysis ─────────────────────────────────────────
  const analyzeAll = async () => {
    if (!items.length) {
      setMsg({ text: "Add stocks first", ok: false });
      return;
    }
    setAnalyzing(true);
    setAnalysis(null);
    setMsg(null);
    try {
      const res = await fetch(`${BACKEND}/analyze/watchlist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stocks: items.map((i) => ({
            ticker: i.ticker,
            market: i.market,
            sector: i.sector || "",
            theme: i.theme || "",
            notes: i.notes || "",
            score: i.score,
            days_watching: daysSince(i.added),
          })),
        }),
      });
      if (!res.ok) throw new Error("Backend error");
      const d = await res.json();
      setAnalysis(d.analysis || "Analysis unavailable");
    } catch (e) {
      setAnalysis(
        "Analysis unavailable — backend may be waking up. Try again in 60 seconds."
      );
    }
    setAnalyzing(false);
  };

  // ── Graduate to Portfolio ─────────────────────────────────────────────
  const graduateToPortfolio = (item: WatchItem) => {
    try {
      const existing = JSON.parse(
        localStorage.getItem("alpha_positions") || "[]"
      );
      if (existing.find((p: any) => p.ticker === item.ticker)) {
        setMsg({ text: `${item.ticker} already in portfolio`, ok: false });
        return;
      }
      const pos = {
        id: Date.now().toString(),
        ticker: item.ticker,
        market: item.market,
        entry_date: new Date().toISOString().split("T")[0],
        entry_price: 0,
        shares: 0,
        stop_level: 0,
        target_price: 0,
        notes: `From watchlist. ${item.notes || ""} ${item.stage || ""}`,
      };
      localStorage.setItem(
        "alpha_positions",
        JSON.stringify([...existing, pos])
      );
      persist(items.map((i) => (i.id === item.id ? { ...i, graduated: true } : i)));
      setMsg({
        text: `${item.ticker} moved to portfolio — update entry price`,
        ok: true,
      });
    } catch (e) {
      setMsg({ text: "Failed to graduate", ok: false });
    }
  };

  // ── Computed ──────────────────────────────────────────────────────────
  const sorted = [...items]
    .filter(
      (i) =>
        (!search ||
          i.ticker.includes(search.toUpperCase()) ||
          (i.sector || "").toLowerCase().includes(search.toLowerCase())) &&
        (filter === "ALL" || i.market === filter)
    )
    .sort((a, b) =>
      sortBy === "score"
        ? b.score - a.score
        : sortBy === "added"
          ? new Date(b.added).getTime() - new Date(a.added).getTime()
          : a.ticker.localeCompare(b.ticker)
    );

  const qualified = items.filter((i) => i.c1_pass && i.c2_pass).length;
  const avgScore = items.length
    ? (items.reduce((s, i) => s + i.score, 0) / items.length).toFixed(1)
    : "—";

  return (
    <div className="space-y-6">
      {/* ── KPI Strip ────────────────────────────────────────────────────── */}
      {items.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <KpiCard label="Monitored" value={String(items.length)} sub="total stocks" />
          <KpiCard label="Qualifying" value={String(qualified)} sub="pass 3-checks" color="text-emerald-400" />
          <KpiCard label="Avg Score" value={avgScore + "/10"} sub="conviction" color="text-amber-400" />
          <KpiCard label="US Stocks" value={String(items.filter((i) => i.market === "US").length)} sub="NYSE/NASDAQ" color="text-blue-400" />
          <KpiCard label="UK Stocks" value={String(items.filter((i) => i.market === "UK").length)} sub="LSE/AIM" color="text-violet-400" />
        </div>
      )}

      {/* ── Add Form ─────────────────────────────────────────────────────── */}
      <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-5 space-y-4">
        <p className="text-xs font-semibold text-[#a1a1aa] uppercase tracking-wider">
          + Add to Watchlist{" "}
          {autoFilling && (
            <span className="text-amber-400 normal-case">· AI filling...</span>
          )}
        </p>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 items-end">
          <div>
            <label className="text-[10px] text-[#52525b] uppercase tracking-wider block mb-1">
              Ticker *
            </label>
            <input
              value={ticker}
              onChange={(e) => setTicker(e.target.value.toUpperCase())}
              onBlur={(e) => autoFill(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addItem()}
              placeholder="NVDA"
              className="w-full bg-[#09090b] border border-[#27272a] text-[#FFB000] font-bold px-3 py-2 text-sm rounded focus:outline-none focus:border-amber-500/50"
            />
          </div>
          <div>
            <label className="text-[10px] text-[#52525b] uppercase tracking-wider block mb-1">
              Market
            </label>
            <select
              value={market}
              onChange={(e) => setMarket(e.target.value)}
              className="w-full bg-[#09090b] border border-[#27272a] text-[#fafafa] px-3 py-2 text-xs rounded focus:outline-none"
            >
              <option value="US">🇺🇸 US</option>
              <option value="UK">🇬🇧 UK</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] text-[#52525b] uppercase tracking-wider block mb-1">
              Sector {autoFilling && "✨"}
            </label>
            <select
              value={sector}
              onChange={(e) => setSector(e.target.value)}
              className="w-full bg-[#09090b] border border-[#27272a] text-[#fafafa] px-3 py-2 text-xs rounded focus:outline-none"
            >
              <option value="">Select...</option>
              {SECTORS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10px] text-[#52525b] uppercase tracking-wider block mb-1">
              Theme {autoFilling && "✨"}
            </label>
            <select
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              className="w-full bg-[#09090b] border border-[#27272a] text-[#fafafa] px-3 py-2 text-xs rounded focus:outline-none"
            >
              <option value="">Select...</option>
              {THEMES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10px] text-[#52525b] uppercase tracking-wider block mb-1">
              Notes {autoFilling && "✨"}
            </label>
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Why watching..."
              className="w-full bg-[#09090b] border border-[#27272a] text-[#a1a1aa] px-3 py-2 text-xs rounded focus:outline-none"
            />
          </div>
          <button
            onClick={addItem}
            className="bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs px-4 py-2 rounded-lg transition-colors shadow-lg shadow-amber-500/20 active:translate-y-px"
          >
            + Add
          </button>
        </div>
        <p className="text-[10px] text-[#3f3f46]">
          💡 Type ticker and tab away — AI auto-fills sector, theme and notes
        </p>
      </div>

      {/* ── Controls ─────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 flex-wrap">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search ticker or sector..."
          className="bg-[#18181b] border border-[#27272a] text-[#a1a1aa] px-3 py-1.5 text-xs rounded focus:outline-none w-48"
        />
        <div className="flex gap-1">
          {[["ALL", "All"], ["US", "US"], ["UK", "UK"]].map(([v, l]) => (
            <button
              key={v}
              onClick={() => setFilter(v)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                filter === v
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                  : "bg-[#18181b] text-[#a1a1aa] border-[#27272a] hover:text-[#fafafa]"
              }`}
            >
              {l}
            </button>
          ))}
        </div>
        <div className="flex gap-1">
          {[["score", "Score"], ["added", "Recent"], ["ticker", "A-Z"]].map(
            ([v, l]) => (
              <button
                key={v}
                onClick={() => setSortBy(v as any)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                  sortBy === v
                    ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                    : "bg-[#18181b] text-[#a1a1aa] border-[#27272a] hover:text-[#fafafa]"
                }`}
              >
                {l}
              </button>
            )
          )}
        </div>
        <div className="flex-1" />
        {items.length > 0 && (
          <>
            <button
              onClick={scoreAll}
              disabled={scoring}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                scoring
                  ? "text-[#52525b] border-[#27272a]"
                  : "bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20"
              }`}
            >
              {scoring ? "Scoring..." : "⚡ Score vs 3-Checks"}
            </button>
            <button
              onClick={analyzeAll}
              disabled={analyzing}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                analyzing
                  ? "text-[#52525b] border-[#27272a]"
                  : "bg-blue-500/10 text-blue-400 border-blue-500/30 hover:bg-blue-500/20"
              }`}
            >
              {analyzing ? "Analyzing..." : "🧠 Lynch+Wyckoff"}
            </button>
          </>
        )}
      </div>

      {/* ── Messages ─────────────────────────────────────────────────────── */}
      {msg && (
        <div
          className={`text-xs px-4 py-2.5 rounded-lg border ${
            msg.ok
              ? "bg-emerald-950/40 border-emerald-800/40 text-emerald-400"
              : "bg-rose-950/40 border-rose-800/40 text-rose-400"
          }`}
        >
          {msg.ok ? "✓" : "⚠"} {msg.text}
        </div>
      )}

      {/* ── AI Analysis Loading ──────────────────────────────────────────── */}
      {analyzing && (
        <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-10 text-center space-y-2">
          <div className="flex justify-center">
            <div className="w-6 h-6 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
          </div>
          <p className="text-blue-400 text-sm font-semibold">
            🧠 Running Lynch + Wyckoff Analysis...
          </p>
          <p className="text-xs text-[#52525b]">
            Fundamental engine · Technical phase detection · BUY / WATCH / AVOID
            verdicts
          </p>
        </div>
      )}

      {/* ── AI Analysis Result ───────────────────────────────────────────── */}
      {analysis && !analyzing && (
        <div className="w-full overflow-hidden rounded-lg border border-[#1E2530] bg-[#0C0F16]">
          <div className="flex items-center gap-3 px-4 py-3 bg-[#0A0D14] border-b border-[#1E2530]">
            <span className="text-xs font-semibold text-[#fafafa] uppercase tracking-wider">
              Lynch + Wyckoff Analysis
            </span>
            <span className="bg-emerald-950/80 text-emerald-400 border border-emerald-800/40 text-[10px] font-bold px-2 py-0.5 rounded">
              INSTITUTIONAL
            </span>
            <div className="flex-1" />
            <CopyButton text={analysis} />
            <button
              onClick={() => setAnalysis(null)}
              className="text-[10px] px-2.5 py-1 rounded border bg-[#27272a] text-[#a1a1aa] border-[#3f3f46] hover:text-[#fafafa]"
            >
              ✕ Close
            </button>
          </div>
          <div className="p-4 max-h-[500px] overflow-y-auto">
            <pre className="text-xs text-[#94a3b8] leading-relaxed whitespace-pre-wrap font-mono">
              {analysis}
            </pre>
          </div>
          <div className="px-4 py-2 border-t border-[#1E2530] bg-[#0A0D14] text-[10px] text-[#3f3f46]">
            Lynch Fundamental Framework + Wyckoff Phase Analysis · Not financial
            advice
          </div>
        </div>
      )}

      {/* ── Stock Table ──────────────────────────────────────────────────── */}
      <div className="w-full overflow-hidden rounded-lg border border-[#1E2530] bg-[#0C0F16]">
        <div className="flex items-center gap-3 px-4 py-3 bg-[#0A0D14] border-b border-[#1E2530]">
          <span className="text-xs font-semibold text-[#fafafa] uppercase tracking-wider">
            Monitored Stocks
          </span>
          <span className="bg-[#18181b] text-[#52525b] border border-[#27272a] text-[10px] font-bold px-2 py-0.5 rounded">
            {sorted.length} of {items.length}
          </span>
          {qualified > 0 && (
            <span className="bg-emerald-950/80 text-emerald-400 border border-emerald-800/40 text-[10px] font-bold px-2 py-0.5 rounded">
              🎯 {qualified} qualifying
            </span>
          )}
        </div>

        {sorted.length === 0 ? (
          <div className="p-16 text-center space-y-2">
            <p className="text-[#a1a1aa] text-sm font-semibold">
              {items.length === 0 ? "No stocks yet" : "No stocks match filter"}
            </p>
            <p className="text-xs text-[#52525b]">
              {items.length === 0
                ? "Add tickers above to start monitoring"
                : "Try a different search or filter"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-[#0A0D14] border-b border-[#1E2530]">
                  {["Score", "Ticker", "Sector", "Theme", "Stage", "RSI", "Entry", "Days", "Notes", "Actions"].map(
                    (h) => (
                      <th
                        key={h}
                        className="text-[11px] font-bold uppercase tracking-wider text-[#64748B] px-4 py-3 border-b border-[#1E2530] text-left whitespace-nowrap"
                      >
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {sorted.map((item) => {
                  const isQ = item.c1_pass && item.c2_pass;
                  const days = daysSince(item.added);
                  return (
                    <tr
                      key={item.id}
                      className="border-b border-[#1E2530]/50 last:border-0 hover:bg-[#161C28]/60 transition-colors"
                    >
                      {/* Score */}
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <ConvictionBar score={item.score} />
                          <span className={`font-bold font-mono text-sm ${convColor(item.score)}`}>
                            {item.score > 0 ? item.score : "—"}
                          </span>
                        </div>
                        <div className="flex gap-1 mt-1">
                          {[["C1", item.c1_pass], ["C2", item.c2_pass]].map(
                            ([l, p]) => (
                              <span
                                key={String(l)}
                                className={`text-[8px] font-bold px-1 py-0.5 rounded ${
                                  p
                                    ? "bg-emerald-950/80 text-emerald-400 border border-emerald-800/40"
                                    : "bg-rose-950/80 text-rose-400 border border-rose-800/40"
                                }`}
                              >
                                {l}
                              </span>
                            )
                          )}
                        </div>
                      </td>

                      {/* Ticker */}
                      <td className="px-4 py-2.5">
                        <div className={`font-bold text-[#FFB000] text-sm ${isQ ? "text-emerald-400" : ""}`}>
                          {item.market === "UK" ? "🇬🇧 " : ""}
                          {item.ticker}
                        </div>
                        {item.graduated && (
                          <div className="text-[9px] text-blue-400 mt-0.5">
                            In Portfolio
                          </div>
                        )}
                      </td>

                      {/* Sector */}
                      <td className="px-4 py-2.5">
                        {item.sector ? (
                          <span className="bg-blue-950/60 text-blue-400 border border-blue-900/40 text-[10px] font-medium px-1.5 py-0.5 rounded">
                            {item.sector.substring(0, 10)}
                          </span>
                        ) : (
                          <span className="text-[#27272a]">—</span>
                        )}
                      </td>

                      {/* Theme */}
                      <td className="px-4 py-2.5">
                        {item.theme ? (
                          <span className="bg-violet-950/60 text-violet-400 border border-violet-900/40 text-[10px] font-medium px-1.5 py-0.5 rounded">
                            {item.theme.substring(0, 10)}
                          </span>
                        ) : (
                          <span className="text-[#27272a]">—</span>
                        )}
                      </td>

                      {/* Stage */}
                      <td className="px-4 py-2.5">
                        {item.stage ? (
                          <span
                            className={`bg-blue-950/60 border border-blue-900/40 text-[10px] font-medium px-1.5 py-0.5 rounded ${
                              item.stage.includes("Stage 2")
                                ? "text-emerald-400"
                                : "text-blue-400"
                            }`}
                          >
                            {item.stage.includes("Stage 2") ? "STG2" : "STG1"}
                          </span>
                        ) : (
                          <span className="text-[#27272a]">—</span>
                        )}
                      </td>

                      {/* RSI */}
                      <td
                        className={`px-4 py-2.5 font-mono text-xs font-semibold ${
                          item.rsi > 70
                            ? "text-rose-400"
                            : item.rsi > 50
                              ? "text-amber-400"
                              : item.rsi > 0
                                ? "text-emerald-400"
                                : "text-[#52525b]"
                        }`}
                      >
                        {item.rsi > 0 ? item.rsi.toFixed(0) : "—"}
                      </td>

                      {/* Entry */}
                      <td className="px-4 py-2.5 font-mono text-xs text-blue-400 whitespace-nowrap">
                        {item.entry_zone || "—"}
                      </td>

                      {/* Days */}
                      <td className="px-4 py-2.5">
                        <div className="font-mono text-xs text-[#a1a1aa]">
                          {days}d
                        </div>
                        <div className="text-[9px] text-[#3f3f46]">
                          {item.added}
                        </div>
                      </td>

                      {/* Notes */}
                      <td className="px-4 py-2.5 text-xs text-[#52525b] max-w-[120px] truncate">
                        {item.notes || "—"}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-2.5">
                        <div className="flex gap-1.5">
                          <a
                            href={`/analyzer?ticker=${item.ticker}&market=${item.market}`}
                            className="text-[10px] px-2 py-1 rounded border bg-[#18181b] text-[#a1a1aa] border-[#27272a] hover:text-[#fafafa] transition-colors no-underline"
                          >
                            View
                          </a>
                          {!item.graduated && (
                            <button
                              onClick={() => graduateToPortfolio(item)}
                              className="text-[10px] px-2 py-1 rounded border bg-blue-950/40 text-blue-400 border-blue-800/30 hover:bg-blue-950/70 transition-colors"
                            >
                              Buy→
                            </button>
                          )}
                          <button
                            onClick={() => remove(item.id)}
                            className="text-[10px] px-2 py-1 rounded border bg-rose-950/40 text-rose-400 border-rose-800/30 hover:bg-rose-950/70 transition-colors"
                          >
                            ✕
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <p className="text-[10px] text-[#27272a] text-center">
        Data persisted in local storage · Score vs 3-Checks requires backend ·
        Not financial advice
      </p>
    </div>
  );
}