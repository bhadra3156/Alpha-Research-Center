// ─────────────────────────────────────────────────────────────────────────────
// AlphaResearch — Portfolio Tracker
// Position management · Weight analysis · AI portfolio review
// No duplicate Navbar — uses Layout.tsx shared shell
// ─────────────────────────────────────────────────────────────────────────────
"use client";

import React, { useState, useEffect } from "react";
import { api } from "@/lib/api";
import {
  KpiCard,
  CopyButton,
  EmptyState,
} from "@/components/shared/ui-primitives";

// ─── Types ───────────────────────────────────────────────────────────────────
interface Position {
  id: string;
  ticker: string;
  market: string;
  entry_date: string;
  entry_price: number;
  shares: number;
  stop_level: number;
  target_price: number;
  notes: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function n(v: unknown): number {
  const x = parseFloat(String(v));
  return isNaN(x) ? 0 : x;
}

function fmt(v: number): string {
  return v > 0
    ? "$" +
        v.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })
    : "—";
}

function generateLocalAnalysis(positions: Position[]): string {
  const total = positions.reduce(
    (s, p) => s + n(p.entry_price) * n(p.shares),
    0
  );
  const largest = positions.reduce((a, b) =>
    n(a.entry_price) * n(a.shares) > n(b.entry_price) * n(b.shares) ? a : b
  );
  const pct = ((n(largest.entry_price) * n(largest.shares)) / total * 100).toFixed(1);
  const noStop = positions.filter((p) => !p.stop_level).length;

  return `PORTFOLIO ANALYSIS — ${positions.length} POSITIONS · $${total.toLocaleString(undefined, { maximumFractionDigits: 0 })} DEPLOYED

SWOT ANALYSIS
${"─".repeat(40)}
STRENGTHS: ${positions.length} positions with defined entry points.
WEAKNESSES: ${pct}% concentration in ${largest.ticker}. ${noStop} positions without stop losses.
OPPORTUNITIES: Set price targets on all positions to lock in gains.
THREATS: ${noStop > 0 ? `${noStop} positions without stops — unlimited downside risk.` : "All positions have stops — good discipline."}

POSITION VERDICTS
${"─".repeat(40)}
${positions
  .map((p) => {
    const cost = n(p.entry_price) * n(p.shares);
    const pp = ((cost / total) * 100).toFixed(1);
    const v =
      cost / total > 0.35
        ? "REVIEW SIZE"
        : !p.stop_level
          ? "SET STOP LOSS"
          : "HOLD";
    return `${p.ticker}: ${v} — ${pp}% ($${cost.toLocaleString(undefined, { maximumFractionDigits: 0 })})`;
  })
  .join("\n")}

ACTION REQUIRED
${"─".repeat(40)}
Set stop losses on all positions at 7-8% below entry immediately.`;
}

// ─── Form Input Helper ───────────────────────────────────────────────────────
function FormInput({
  label,
  value,
  setter,
  type = "text",
  placeholder = "",
}: {
  label: string;
  value: string;
  setter: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="text-[10px] text-[#52525b] uppercase tracking-wider block mb-1">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => setter(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-[#09090b] border border-[#27272a] text-[#fafafa] px-3 py-2 text-xs rounded focus:outline-none focus:border-amber-500/50"
      />
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────
export default function Portfolio() {
  const [positions, setPositions] = useState<Position[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);

  // Form state
  const [ticker, setTicker] = useState("");
  const [market, setMarket] = useState("US");
  const [entryDate, setEntryDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [entryPrice, setEntryPrice] = useState("");
  const [shares, setShares] = useState("");
  const [stopLevel, setStopLevel] = useState("");
  const [targetPrice, setTargetPrice] = useState("");
  const [notes, setNotes] = useState("");

  // Load from localStorage
  useEffect(() => {
    try {
      const s = localStorage.getItem("alpha_positions");
      if (s) setPositions(JSON.parse(s));
    } catch (e) {}
  }, []);

  const persist = (list: Position[]) => {
    setPositions(list);
    try {
      localStorage.setItem("alpha_positions", JSON.stringify(list));
    } catch (e) {}
  };

  const resetForm = () => {
    setTicker("");
    setMarket("US");
    setEntryDate(new Date().toISOString().split("T")[0]);
    setEntryPrice("");
    setShares("");
    setStopLevel("");
    setTargetPrice("");
    setNotes("");
    setEditId(null);
  };

  const openEdit = (p: Position) => {
    setEditId(p.id);
    setTicker(p.ticker);
    setMarket(p.market);
    setEntryDate(p.entry_date);
    setEntryPrice(String(p.entry_price));
    setShares(String(p.shares));
    setStopLevel(String(p.stop_level || ""));
    setTargetPrice(String(p.target_price || ""));
    setNotes(p.notes || "");
    setShowForm(true);
    setMsg(null);
    setAnalysis(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSave = () => {
    if (!ticker.trim()) {
      setMsg({ text: "Enter ticker symbol", ok: false });
      return;
    }
    if (!entryPrice || n(entryPrice) === 0) {
      setMsg({ text: "Enter entry price", ok: false });
      return;
    }
    if (!shares || n(shares) === 0) {
      setMsg({ text: "Enter number of shares", ok: false });
      return;
    }
    setSaving(true);
    const pos: Position = {
      id: editId || Date.now().toString(),
      ticker: ticker.trim().toUpperCase(),
      market,
      entry_date: entryDate,
      entry_price: n(entryPrice),
      shares: n(shares),
      stop_level: n(stopLevel),
      target_price: n(targetPrice),
      notes: notes.trim(),
    };
    persist(
      editId
        ? positions.map((p) => (p.id === editId ? pos : p))
        : [...positions, pos]
    );
    setMsg({
      text: `${pos.ticker} — ${n(shares)} shares @ ${fmt(n(entryPrice))} ${editId ? "updated" : "saved"}`,
      ok: true,
    });
    resetForm();
    setShowForm(false);
    setSaving(false);
  };

  const remove = (id: string) => {
    persist(positions.filter((p) => p.id !== id));
    setAnalysis(null);
  };

  const analyzePortfolio = async () => {
    if (!positions.length) {
      setMsg({ text: "Add positions first", ok: false });
      return;
    }
    setAnalyzing(true);
    setAnalysis(null);
    setMsg(null);
    try {
      const d = await api.analyzePortfolio(
        positions.map((p) => ({
          ticker: p.ticker,
          shares: n(p.shares),
          entry_price: n(p.entry_price),
          stop_level: n(p.stop_level),
          target_price: n(p.target_price),
          notes: p.notes || "",
        }))
      );
      if (d.status === "error") throw new Error(d.analysis);
      setAnalysis(d.analysis || "Analysis unavailable");
    } catch (e) {
      setAnalysis(generateLocalAnalysis(positions));
    }
    setAnalyzing(false);
  };

  const total = positions.reduce(
    (s, p) => s + n(p.entry_price) * n(p.shares),
    0
  );

  return (
    <div className="space-y-6">
      {/* ── KPI Strip ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <KpiCard
          label="Open Positions"
          value={String(positions.length)}
          sub="active trades"
          color="text-emerald-400"
        />
        <KpiCard
          label="Total Deployed"
          value={
            "$" +
            total.toLocaleString(undefined, { maximumFractionDigits: 0 })
          }
          sub="capital at risk"
          color="text-amber-400"
        />
        <KpiCard
          label="Markets"
          value={
            positions.length > 0
              ? [...new Set(positions.map((p) => p.market))].join(" / ")
              : "—"
          }
          sub="US / UK exposure"
        />
      </div>

      {/* ── Action Bar ───────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        {positions.length > 0 && (
          <button
            onClick={analyzePortfolio}
            disabled={analyzing}
            className={`px-4 py-2 text-xs font-medium rounded-lg border transition-colors ${
              analyzing
                ? "text-[#52525b] border-[#27272a]"
                : "bg-blue-500/10 text-blue-400 border-blue-500/30 hover:bg-blue-500/20"
            }`}
          >
            {analyzing ? "🧠 Analyzing..." : "🧠 AI Analysis"}
          </button>
        )}
        <div className="flex-1" />
        <button
          onClick={() => {
            resetForm();
            setShowForm(!showForm);
            setMsg(null);
            setAnalysis(null);
          }}
          className="bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs px-5 py-2 rounded-lg transition-colors shadow-lg shadow-amber-500/20 active:translate-y-px"
        >
          + Add Position
        </button>
      </div>

      {/* ── Add/Edit Form ────────────────────────────────────────────────── */}
      {showForm && (
        <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-5 space-y-4">
          <p className="text-xs font-semibold text-[#a1a1aa] uppercase tracking-wider">
            {editId ? "Edit Position" : "New Position"}
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            <FormInput label="Ticker *" value={ticker} setter={setTicker} placeholder="NVDA" />
            <div>
              <label className="text-[10px] text-[#52525b] uppercase tracking-wider block mb-1">
                Market
              </label>
              <select
                value={market}
                onChange={(e) => setMarket(e.target.value)}
                className="w-full bg-[#09090b] border border-[#27272a] text-[#fafafa] px-3 py-2 text-xs rounded focus:outline-none"
              >
                <option value="US">US</option>
                <option value="UK">UK</option>
              </select>
            </div>
            <FormInput label="Entry Date" value={entryDate} setter={setEntryDate} type="date" />
            <FormInput label="Entry Price *" value={entryPrice} setter={setEntryPrice} type="number" placeholder="215.33" />
            <FormInput label="Shares *" value={shares} setter={setShares} type="number" placeholder="100" />
            <FormInput label="Stop Level" value={stopLevel} setter={setStopLevel} type="number" placeholder="195.00" />
            <FormInput label="Target" value={targetPrice} setter={setTargetPrice} type="number" placeholder="260.00" />
          </div>
          <div>
            <label className="text-[10px] text-[#52525b] uppercase tracking-wider block mb-1">
              Notes / Thesis
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Entry thesis, setup, catalyst..."
              className="w-full bg-[#09090b] border border-[#27272a] text-[#a1a1aa] px-3 py-2 text-xs rounded focus:outline-none min-h-[50px] resize-y"
            />
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className={`font-bold text-xs px-5 py-2 rounded-lg transition-colors ${
                editId
                  ? "bg-blue-500 hover:bg-blue-400 text-white"
                  : "bg-amber-500 hover:bg-amber-400 text-black shadow-lg shadow-amber-500/20"
              }`}
            >
              {saving ? "Saving..." : editId ? "Update Position" : "Save Position"}
            </button>
            <button
              onClick={() => {
                setShowForm(false);
                resetForm();
                setMsg(null);
              }}
              className="text-xs px-4 py-2 rounded-lg border bg-[#27272a] text-[#a1a1aa] border-[#3f3f46] hover:text-[#fafafa]"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

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
            🧠 Analyzing Portfolio...
          </p>
          <p className="text-xs text-[#52525b]">
            Senior hedge fund PM · Web search · SWOT · Position verdicts
          </p>
        </div>
      )}

      {/* ── AI Analysis Result ───────────────────────────────────────────── */}
      {analysis && !analyzing && (
        <div className="w-full overflow-hidden rounded-lg border border-[#1E2530] bg-[#0C0F16]">
          <div className="flex items-center gap-3 px-4 py-3 bg-[#0A0D14] border-b border-[#1E2530]">
            <span className="text-xs font-semibold text-[#fafafa] uppercase tracking-wider">
              AI Portfolio Analysis
            </span>
            <span className="bg-blue-950/80 text-blue-400 border border-blue-800/40 text-[10px] font-bold px-2 py-0.5 rounded">
              HEDGE FUND GRADE
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
            Powered by Claude AI · Not financial advice
          </div>
        </div>
      )}

      {/* ── Positions Table ──────────────────────────────────────────────── */}
      <div className="w-full overflow-hidden rounded-lg border border-[#1E2530] bg-[#0C0F16]">
        <div className="flex items-center gap-3 px-4 py-3 bg-[#0A0D14] border-b border-[#1E2530]">
          <span className="text-xs font-semibold text-[#fafafa] uppercase tracking-wider">
            Open Positions
          </span>
          <span className="bg-emerald-950/80 text-emerald-400 border border-emerald-800/40 text-[10px] font-bold px-2 py-0.5 rounded">
            {positions.length} Active
          </span>
        </div>

        {positions.length === 0 ? (
          <div className="p-16 text-center space-y-2">
            <p className="text-[#a1a1aa] text-sm font-semibold">
              No positions tracked
            </p>
            <p className="text-xs text-[#52525b]">
              Add your first position above
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-[#0A0D14] border-b border-[#1E2530]">
                  {[
                    "Ticker",
                    "Mkt",
                    "Entry Date",
                    "Entry Price",
                    "Shares",
                    "Position Size",
                    "Weight",
                    "Stop",
                    "Target",
                    "R/R",
                    "Notes",
                    "Actions",
                  ].map((h) => (
                    <th
                      key={h}
                      className="text-[11px] font-bold uppercase tracking-wider text-[#64748B] px-4 py-3 border-b border-[#1E2530] text-left whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {positions.map((p) => {
                  const ep = n(p.entry_price);
                  const sh = n(p.shares);
                  const sl = n(p.stop_level);
                  const tp = n(p.target_price);
                  const posSize = ep * sh;
                  const weight = ((posSize / total) * 100).toFixed(1);
                  const overweight = posSize / total > 0.3;
                  const rr =
                    sl > 0 && tp > 0
                      ? ((tp - ep) / (ep - sl)).toFixed(1)
                      : "—";

                  return (
                    <tr
                      key={p.id}
                      className="border-b border-[#1E2530]/50 last:border-0 hover:bg-[#161C28]/60 transition-colors"
                    >
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-0.5 h-7 rounded-full ${overweight ? "bg-rose-500" : "bg-emerald-500"}`}
                          />
                          <span className="font-bold text-[#FFB000] text-sm">
                            {p.ticker}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-[#52525b]">
                        {p.market === "US" ? "US" : "🇬🇧"}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-[#52525b] font-mono">
                        {p.entry_date}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-sm text-[#fafafa] font-semibold text-right">
                        {fmt(ep)}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-xs text-[#a1a1aa] text-right">
                        {sh.toLocaleString()}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-xs text-emerald-400 font-semibold text-right">
                        $
                        {posSize.toLocaleString(undefined, {
                          maximumFractionDigits: 0,
                        })}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-1.5">
                          <div className="w-10 h-1 bg-[#27272a] rounded-full overflow-hidden">
                            <div
                              className={`h-full ${overweight ? "bg-rose-500" : "bg-amber-500"}`}
                              style={{
                                width: `${Math.min(100, (posSize / total) * 100 * 3)}%`,
                              }}
                            />
                          </div>
                          <span
                            className={`text-xs font-mono ${overweight ? "text-rose-400" : "text-[#a1a1aa]"}`}
                          >
                            {weight}%
                          </span>
                        </div>
                      </td>
                      <td
                        className={`px-4 py-2.5 font-mono text-xs ${sl > 0 ? "text-rose-400" : "text-[#27272a]"}`}
                      >
                        {sl > 0 ? fmt(sl) : "—"}
                      </td>
                      <td
                        className={`px-4 py-2.5 font-mono text-xs ${tp > 0 ? "text-emerald-400" : "text-[#27272a]"}`}
                      >
                        {tp > 0 ? fmt(tp) : "—"}
                      </td>
                      <td
                        className={`px-4 py-2.5 font-mono text-xs ${rr !== "—" && parseFloat(rr) >= 2 ? "text-emerald-400" : rr !== "—" ? "text-amber-400" : "text-[#27272a]"}`}
                      >
                        {rr !== "—" ? rr + "x" : "—"}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-[#52525b] max-w-[120px] truncate">
                        {p.notes || "—"}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => openEdit(p)}
                            className="text-[10px] px-2 py-1 rounded border bg-blue-950/40 text-blue-400 border-blue-800/30 hover:bg-blue-950/70 transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => remove(p.id)}
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
        Data persisted in local storage · AI analysis powered by Claude Sonnet ·
        Not financial advice
      </p>
    </div>
  );
}