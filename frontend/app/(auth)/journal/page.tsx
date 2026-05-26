// FILE: frontend/app/(auth)/journal/page.tsx
// ─────────────────────────────────────────────────────────────────────────────
// WORLD-CLASS TRADE JOURNAL — Direct Supabase (bypasses backend entirely)
// Fixes: in-memory data loss, localhost calls failing in production
// ─────────────────────────────────────────────────────────────────────────────
"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";
function Navigation() {
  return (
    <nav style={{position:"fixed",top:0,left:0,right:0,zIndex:50,background:"rgba(6,8,32,0.95)",backdropFilter:"blur(12px)",borderBottom:"1px solid rgba(245,158,11,0.2)",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 24px",height:"56px"}}>
      <a href="/dashboard" style={{display:"flex",alignItems:"center",gap:"10px",textDecoration:"none"}}>
        <div style={{width:"32px",height:"32px",borderRadius:"8px",background:"linear-gradient(135deg,#f59e0b,#d97706)",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:"900",fontSize:"16px",color:"#060820"}}>a</div>
        <span style={{fontWeight:"800",fontSize:"16px",color:"#f1f5f9"}}>Alpha<span style={{color:"#f59e0b"}}>Research</span></span>
      </a>
      <div style={{display:"flex",gap:"4px"}}>
        {[["dashboard","Dashboard"],["analyzer","Analyzer"],["watchlist","Watchlist"],["portfolio","Portfolio"],["journal","Journal"]].map(([href,label])=>(
          <a key={href} href={"/"+href} style={{display:"flex",alignItems:"center",padding:"6px 14px",borderRadius:"8px",textDecoration:"none",fontSize:"13px",color:href==="journal"?"#f59e0b":"#94a3b8",fontWeight:href==="journal"?"700":"400"}}>{label}</a>
        ))}
      </div>
      <div style={{display:"flex",alignItems:"center",gap:"6px",fontSize:"12px",color:"#10b981"}}>
        <div style={{width:"6px",height:"6px",borderRadius:"50%",background:"#10b981"}}></div>
        <span>LIVE</span>
      </div>
    </nav>
  );
}


// ── Supabase client ────────────────────────────────────────────────────────────
// These env vars are already in your Next.js .env.local
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ── Types ──────────────────────────────────────────────────────────────────────
type EntryType     = "ANALYSIS" | "ENTRY" | "ADJUSTMENT" | "EXIT" | "OBSERVATION";
type EmotionState  = "CONFIDENT" | "NEUTRAL" | "ANXIOUS" | "FOMO" | "FEARFUL";
type MistakeTag    = "NONE" | "RULE_BREAK" | "BAD_TIMING" | "WRONG_THESIS" | "OVERSIZED";

interface JournalEntry {
  id: string;
  ticker: string;
  market: string;
  journal_date: string;
  entry_type: EntryType;
  title: string;
  content: string;
  conviction_at_time: number;
  price_at_time: number | null;
  tags: string[];
  // Extended institutional fields (stored in tags array as key:value pairs,
  // so they fit your existing schema without a migration)
  emotional_state?: EmotionState;
  setup_quality?: number;
  risk_reward?: number;
  outcome_pct?: number | null;
  mistake_tag?: MistakeTag;
  checklist_passed?: boolean;
  created_at: string;
}

// ── Config maps ────────────────────────────────────────────────────────────────
const TYPE_CFG: Record<EntryType, { color: string; glow: string; icon: string }> = {
  ANALYSIS:    { color: "#38bdf8", glow: "rgba(56,189,248,0.18)",   icon: "🔬" },
  ENTRY:       { color: "#4ade80", glow: "rgba(74,222,128,0.18)",   icon: "🎯" },
  ADJUSTMENT:  { color: "#fb923c", glow: "rgba(251,146,60,0.18)",   icon: "⚖️"  },
  EXIT:        { color: "#f87171", glow: "rgba(248,113,113,0.18)",  icon: "🚪" },
  OBSERVATION: { color: "#c084fc", glow: "rgba(192,132,252,0.18)",  icon: "👁️"  },
};

const EMOTION_CFG: Record<EmotionState, { icon: string; color: string }> = {
  CONFIDENT: { icon: "💪", color: "#4ade80" },
  NEUTRAL:   { icon: "😐", color: "#94a3b8" },
  ANXIOUS:   { icon: "😰", color: "#fb923c" },
  FOMO:      { icon: "🔥", color: "#f97316" },
  FEARFUL:   { icon: "😨", color: "#f87171" },
};

// ── Blank form ─────────────────────────────────────────────────────────────────
const BLANK_FORM = {
  ticker:            "",
  market:            "US",
  entry_type:        "ANALYSIS" as EntryType,
  title:             "",
  content:           "",
  conviction:        7,
  price:             "",
  tags:              "",
  emotional_state:   "NEUTRAL" as EmotionState,
  setup_quality:     7,
  risk_reward:       "",
  outcome_pct:       "",
  mistake_tag:       "NONE" as MistakeTag,
  checklist_passed:  true,
};

// ─────────────────────────────────────────────────────────────────────────────
// SHARED STYLES
// ─────────────────────────────────────────────────────────────────────────────
const S = {
  input: {
    width: "100%",
    padding: "10px 14px",
    background: "rgba(255,255,255,0.035)",
    border: "1px solid rgba(255,255,255,0.09)",
    borderRadius: "8px",
    color: "#f1f5f9",
    fontSize: "13px",
    outline: "none",
    boxSizing: "border-box" as const,
    fontFamily: "inherit",
    transition: "border-color 0.2s, background 0.2s",
  } as React.CSSProperties,
  label: {
    display: "block" as const,
    fontSize: "10px",
    fontWeight: 700,
    letterSpacing: "0.1em",
    color: "#475569",
    marginBottom: "6px",
    textTransform: "uppercase" as const,
  } as React.CSSProperties,
};

// ─────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

/** 10-pip conviction bar */
function ConvictionBar({
  value, onChange,
}: { value: number; onChange?: (v: number) => void }) {
  return (
    <div style={{ display: "flex", gap: 3 }}>
      {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => {
        const active = n <= value;
        const barColor = n >= 8 ? "#f59e0b" : n >= 5 ? "#38bdf8" : "#334155";
        return (
          <button
            key={n}
            type="button"
            onClick={() => onChange?.(n)}
            title={`${n}/10`}
            style={{
              width: 20, height: 28,
              borderRadius: 3,
              border: "none",
              background: active ? barColor : "rgba(255,255,255,0.04)",
              cursor: onChange ? "pointer" : "default",
              transition: "all 0.12s",
              position: "relative",
              flexShrink: 0,
            }}
          />
        );
      })}
      <span style={{
        marginLeft: 8,
        color: value >= 8 ? "#f59e0b" : value >= 5 ? "#38bdf8" : "#64748b",
        fontWeight: 800,
        fontSize: 16,
        fontFamily: "'IBM Plex Mono', monospace",
        lineHeight: "28px",
      }}>
        {value}
      </span>
    </div>
  );
}

/** Stat tile */
function StatTile({
  icon, label, value, sub, accent,
}: { icon: string; label: string; value: string | number; sub?: string; accent: string }) {
  return (
    <div style={{
      background: "rgba(10,18,35,0.9)",
      border: "1px solid rgba(255,255,255,0.06)",
      borderTop: `2px solid ${accent}`,
      borderRadius: 10,
      padding: "18px 20px",
    }}>
      <div style={{ fontSize: 11, color: "#475569", letterSpacing: "0.1em", marginBottom: 8 }}>
        {icon} {label}
      </div>
      <div style={{
        fontSize: 28,
        fontWeight: 800,
        color: accent,
        fontFamily: "'IBM Plex Mono', monospace",
        lineHeight: 1,
      }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 10, color: "#334155", marginTop: 5 }}>{sub}</div>}
    </div>
  );
}

/** Single journal entry card */
function EntryCard({
  entry,
  onDelete,
}: { entry: JournalEntry; onDelete: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const cfg = TYPE_CFG[entry.entry_type];
  const emo = entry.emotional_state ? EMOTION_CFG[entry.emotional_state] : null;

  const dateStr = new Date(entry.journal_date).toLocaleDateString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
  });

  return (
    <div
      onClick={() => setOpen((x) => !x)}
      style={{
        background: open
          ? `linear-gradient(135deg, rgba(10,18,35,0.98), rgba(15,25,45,0.98))`
          : "rgba(10,18,35,0.85)",
        border: `1px solid ${open ? cfg.color + "50" : "rgba(255,255,255,0.06)"}`,
        borderLeft: `3px solid ${cfg.color}`,
        borderRadius: 10,
        padding: "16px 20px",
        cursor: "pointer",
        transition: "all 0.2s",
        boxShadow: open ? `0 0 20px ${cfg.glow}` : "none",
      }}
    >
      {/* ── Top row ── */}
      <div style={{
        display: "flex", alignItems: "center",
        gap: 10, flexWrap: "wrap",
      }}>
        {/* Type badge */}
        <span style={{
          background: cfg.glow,
          color: cfg.color,
          border: `1px solid ${cfg.color}30`,
          fontSize: 10, fontWeight: 700, letterSpacing: "0.08em",
          padding: "3px 10px", borderRadius: 5,
          flexShrink: 0,
        }}>
          {cfg.icon} {entry.entry_type}
        </span>

        {/* Ticker + market */}
        <span style={{
          background: "rgba(255,255,255,0.06)",
          color: "#f8fafc",
          fontFamily: "'IBM Plex Mono', monospace",
          fontWeight: 700, fontSize: 14,
          padding: "2px 10px", borderRadius: 5,
          flexShrink: 0,
        }}>
          {entry.market === "UK" ? "🇬🇧" : "🇺🇸"} {entry.ticker}
        </span>

        {/* Title */}
        <span style={{ color: "#cbd5e1", fontSize: 13, flex: 1, minWidth: 0 }}>
          {entry.title}
        </span>

        {/* Right-side meta */}
        <div style={{ display: "flex", gap: 12, alignItems: "center", marginLeft: "auto", flexShrink: 0 }}>
          {emo && (
            <span title={entry.emotional_state} style={{ fontSize: 18 }}>
              {emo.icon}
            </span>
          )}
          {entry.price_at_time != null && (
            <span style={{
              color: "#475569", fontSize: 12,
              fontFamily: "'IBM Plex Mono', monospace",
            }}>
              ${entry.price_at_time.toFixed(2)}
            </span>
          )}
          <ConvictionBar value={entry.conviction_at_time} />
          <span style={{ color: "#334155", fontSize: 11 }}>{dateStr}</span>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(entry.id); }}
            style={{
              background: "rgba(248,113,113,0.08)",
              border: "1px solid rgba(248,113,113,0.2)",
              color: "#f87171",
              borderRadius: 5, padding: "3px 9px",
              cursor: "pointer", fontSize: 11, fontWeight: 700,
            }}
          >
            ✕
          </button>
        </div>
      </div>

      {/* ── Tags row ── */}
      {entry.tags?.length > 0 && (
        <div style={{ display: "flex", gap: 5, marginTop: 9, flexWrap: "wrap" }}>
          {entry.tags.map((tag) => (
            <span key={tag} style={{
              background: "rgba(245,158,11,0.07)",
              color: "#f59e0b",
              border: "1px solid rgba(245,158,11,0.18)",
              fontSize: 10, fontWeight: 600,
              padding: "2px 8px", borderRadius: 4,
            }}>
              #{tag.trim()}
            </span>
          ))}
        </div>
      )}

      {/* ── Expanded body ── */}
      {open && (
        <div style={{
          marginTop: 16,
          paddingTop: 16,
          borderTop: "1px solid rgba(255,255,255,0.05)",
        }}>
          {/* Content */}
          <p style={{
            color: "#94a3b8", fontSize: 13, lineHeight: 1.75,
            whiteSpace: "pre-wrap", margin: "0 0 16px 0",
          }}>
            {entry.content}
          </p>

          {/* Metrics row */}
          <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
            {entry.setup_quality != null && (
              <div>
                <div style={{ color: "#334155", fontSize: 10, marginBottom: 3 }}>SETUP QUALITY</div>
                <div style={{ color: "#f59e0b", fontWeight: 800, fontSize: 20, fontFamily: "'IBM Plex Mono', monospace" }}>
                  {entry.setup_quality}/10
                </div>
              </div>
            )}
            {entry.risk_reward != null && entry.risk_reward > 0 && (
              <div>
                <div style={{ color: "#334155", fontSize: 10, marginBottom: 3 }}>PLANNED R:R</div>
                <div style={{ color: "#4ade80", fontWeight: 800, fontSize: 20, fontFamily: "'IBM Plex Mono', monospace" }}>
                  {entry.risk_reward}:1
                </div>
              </div>
            )}
            {entry.outcome_pct != null && (
              <div>
                <div style={{ color: "#334155", fontSize: 10, marginBottom: 3 }}>OUTCOME</div>
                <div style={{
                  fontWeight: 800, fontSize: 20,
                  fontFamily: "'IBM Plex Mono', monospace",
                  color: entry.outcome_pct >= 0 ? "#4ade80" : "#f87171",
                }}>
                  {entry.outcome_pct > 0 ? "+" : ""}{entry.outcome_pct}%
                </div>
              </div>
            )}
            {entry.mistake_tag && entry.mistake_tag !== "NONE" && (
              <div>
                <div style={{ color: "#334155", fontSize: 10, marginBottom: 3 }}>MISTAKE</div>
                <div style={{ color: "#f87171", fontSize: 12, fontWeight: 700 }}>
                  ⚠️ {entry.mistake_tag.replace(/_/g, " ")}
                </div>
              </div>
            )}
            {entry.checklist_passed != null && (
              <div>
                <div style={{ color: "#334155", fontSize: 10, marginBottom: 3 }}>3-CHECK RULE</div>
                <div style={{ fontSize: 14, fontWeight: 700 }}>
                  {entry.checklist_passed ? "✅ ALL PASSED" : "❌ CHECKS FAILED"}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────
export default function JournalPage() {
  const [entries, setEntries]     = useState<JournalEntry[]>([]);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [showForm, setShowForm]   = useState(false);
  const [filterType, setFilter]   = useState<EntryType | "ALL">("ALL");
  const [search, setSearch]       = useState("");
  const [toast, setToast]         = useState<{ msg: string; kind: "ok" | "err" } | null>(null);
  const [form, setForm]           = useState(BLANK_FORM);

  // ── helpers ──────────────────────────────────────────────────────────────────
  const showToast = (msg: string, kind: "ok" | "err") => {
    setToast({ msg, kind });
    setTimeout(() => setToast(null), 4000);
  };

  const patchForm = (patch: Partial<typeof BLANK_FORM>) =>
    setForm((p) => ({ ...p, ...patch }));

  // ── fetch ─────────────────────────────────────────────────────────────────────
  const fetchEntries = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("trade_journal")
      .select("*")
      .order("journal_date", { ascending: false });

    if (error) {
      showToast(`Load error: ${error.message}`, "err");
    } else {
      // Hydrate extended fields from tags (key:value encoding)
      const hydrated = (data || []).map((e: JournalEntry) => {
        const meta: Partial<JournalEntry> = {};
        const cleanTags: string[] = [];
        for (const t of e.tags ?? []) {
          if (t.startsWith("__emo:")) meta.emotional_state  = t.slice(6) as EmotionState;
          else if (t.startsWith("__sq:"))  meta.setup_quality   = Number(t.slice(5));
          else if (t.startsWith("__rr:"))  meta.risk_reward     = Number(t.slice(5));
          else if (t.startsWith("__op:"))  meta.outcome_pct     = Number(t.slice(5));
          else if (t.startsWith("__mk:"))  meta.mistake_tag     = t.slice(5) as MistakeTag;
          else if (t.startsWith("__cl:"))  meta.checklist_passed = t.slice(5) === "1";
          else if (t.startsWith("__mkt:")) meta.market          = t.slice(6);
          else cleanTags.push(t);
        }
        return { ...e, ...meta, tags: cleanTags };
      });
      setEntries(hydrated);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);

  // ── save ──────────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!form.ticker.trim()) { showToast("Ticker is required.", "err"); return; }
    if (!form.content.trim()) { showToast("Content is required.", "err"); return; }

    setSaving(true);

    // Encode extended fields as prefixed tags so they fit the TEXT[] column
    const metaTags: string[] = [
      `__emo:${form.emotional_state}`,
      `__sq:${form.setup_quality}`,
      `__cl:${form.checklist_passed ? "1" : "0"}`,
      `__mkt:${form.market}`,
      ...(form.risk_reward  ? [`__rr:${form.risk_reward}`]  : []),
      ...(form.outcome_pct  ? [`__op:${form.outcome_pct}`]  : []),
      ...(form.mistake_tag !== "NONE" ? [`__mk:${form.mistake_tag}`] : []),
    ];

    const userTags = form.tags
      ? form.tags.split(",").map((t) => t.trim()).filter(Boolean)
      : [];

    const payload = {
      ticker:             form.ticker.toUpperCase().trim(),
      entry_type:         form.entry_type,
      title:              form.title.trim() || `${form.ticker.toUpperCase()} — ${form.entry_type}`,
      content:            form.content.trim(),
      conviction_at_time: form.conviction,
      price_at_time:      form.price ? parseFloat(form.price) : null,
      tags:               [...userTags, ...metaTags],
      journal_date:       new Date().toISOString(),
    };

    const { error } = await supabase.from("trade_journal").insert([payload]);

    if (error) {
      showToast(`Save failed: ${error.message}`, "err");
    } else {
      showToast("Entry saved to Supabase ✓", "ok");
      setForm(BLANK_FORM);
      setShowForm(false);
      await fetchEntries();
    }
    setSaving(false);
  };

  // ── delete ────────────────────────────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    if (!confirm("Permanently delete this entry?")) return;
    const { error } = await supabase.from("trade_journal").delete().eq("id", id);
    if (error) { showToast(`Delete failed: ${error.message}`, "err"); return; }
    setEntries((p) => p.filter((e) => e.id !== id));
  };

  // ── derived stats ─────────────────────────────────────────────────────────────
  const exits      = entries.filter((e) => e.entry_type === "EXIT");
  const winners    = exits.filter((e) => (e.outcome_pct ?? 0) > 0);
  const winRate    = exits.length ? Math.round((winners.length / exits.length) * 100) : null;
  const avgConv    = entries.length
    ? (entries.reduce((s, e) => s + (e.conviction_at_time || 0), 0) / entries.length).toFixed(1)
    : null;
  const ruleBreaks = entries.filter((e) => e.mistake_tag === "RULE_BREAK").length;
  const avgRR      = exits.filter((e) => e.risk_reward).length
    ? (exits.filter((e) => e.risk_reward).reduce((s, e) => s + (e.risk_reward ?? 0), 0) /
       exits.filter((e) => e.risk_reward).length).toFixed(1)
    : null;

  // ── filtered list ─────────────────────────────────────────────────────────────
  const filtered = entries.filter((e) => {
    const typeOk   = filterType === "ALL" || e.entry_type === filterType;
    const q        = search.toLowerCase();
    const searchOk = !q
      || e.ticker.toLowerCase().includes(q)
      || e.title?.toLowerCase().includes(q)
      || e.content.toLowerCase().includes(q)
      || e.tags?.some((t) => t.toLowerCase().includes(q));
    return typeOk && searchOk;
  });

  // ── render ────────────────────────────────────────────────────────────────────
  return (
    <div style={{
      minHeight: "100vh",
      background: "radial-gradient(ellipse at 20% 20%, #0d1f3c 0%, #06111e 50%, #000d1a 100%)",
      padding: "88px 24px 60px",
      fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
    }}>
      {/* Font imports */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;700&family=DM+Sans:wght@300;400;500;600;700;800&display=swap');

        *  { box-sizing: border-box; }
        input::placeholder, textarea::placeholder { color: #1e293b; }

        input:focus, textarea:focus, select:focus {
          border-color: rgba(245,158,11,0.45) !important;
          background: rgba(255,255,255,0.06) !important;
          outline: none;
        }
        select option { background: #0a1220; color: #f1f5f9; }

        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: rgba(245,158,11,0.25); border-radius: 2px; }

        @keyframes slideIn {
          from { opacity:0; transform: translateY(-8px); }
          to   { opacity:1; transform: translateY(0);    }
        }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.5} }
        .entry-row { animation: slideIn 0.2s ease forwards; }
      `}</style>

      <div style={{ maxWidth: 1100, margin: "0 auto" }}>

        {/* ── PAGE HEADER ──────────────────────────────────────────────────────── */}
        <div style={{
          display: "flex", justifyContent: "space-between",
          alignItems: "flex-start", marginBottom: 28, flexWrap: "wrap", gap: 16,
        }}>
          <div>
            <h1 style={{
              margin: 0, fontSize: 30, fontWeight: 800, color: "#f8fafc",
              fontFamily: "'DM Sans', sans-serif",
              letterSpacing: "-0.02em",
            }}>
              Trade <span style={{ color: "#f59e0b" }}>Journal</span>
            </h1>
            <p style={{ margin: "5px 0 0", color: "#334155", fontSize: 13 }}>
              {entries.length} entries persisted · Direct Supabase · Institutional-grade
            </p>
          </div>

          <button
            onClick={() => { setShowForm((x) => !x); }}
            style={{
              padding: "10px 22px",
              background: showForm
                ? "rgba(248,113,113,0.12)"
                : "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
              border: showForm ? "1px solid rgba(248,113,113,0.3)" : "none",
              borderRadius: 9,
              color: showForm ? "#f87171" : "#000",
              fontWeight: 800, fontSize: 13,
              cursor: "pointer",
              transition: "all 0.2s",
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            {showForm ? "✕ Discard" : "+ New Entry"}
          </button>
        </div>

        {/* ── TOAST ────────────────────────────────────────────────────────────── */}
        {toast && (
          <div style={{
            background: toast.kind === "ok"
              ? "rgba(74,222,128,0.1)" : "rgba(248,113,113,0.1)",
            border: `1px solid ${toast.kind === "ok" ? "rgba(74,222,128,0.3)" : "rgba(248,113,113,0.3)"}`,
            borderRadius: 8, padding: "11px 16px",
            color: toast.kind === "ok" ? "#4ade80" : "#f87171",
            fontSize: 13, marginBottom: 16,
            display: "flex", justifyContent: "space-between", alignItems: "center",
            animation: "slideIn 0.2s ease",
          }}>
            <span>{toast.kind === "ok" ? "✅" : "⚠️"} {toast.msg}</span>
            <button onClick={() => setToast(null)} style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", fontSize: 14 }}>✕</button>
          </div>
        )}

        {/* ── STATS GRID ───────────────────────────────────────────────────────── */}
        {entries.length > 0 && (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 12, marginBottom: 24,
          }}>
            <StatTile icon="📋" label="Total Entries"  value={entries.length}        accent="#38bdf8" />
            <StatTile icon="🎯" label="Win Rate"       value={winRate != null ? `${winRate}%` : "—"}   accent="#4ade80" sub={`${exits.length} exits logged`} />
            <StatTile icon="⚡" label="Avg Conviction" value={avgConv ? `${avgConv}/10` : "—"}         accent="#f59e0b" />
            <StatTile icon="📐" label="Avg R:R"        value={avgRR ? `${avgRR}:1` : "—"}              accent="#c084fc" sub="planned risk-reward" />
            <StatTile icon="📏" label="Rule Breaks"    value={ruleBreaks}            accent={ruleBreaks ? "#f87171" : "#4ade80"} sub="discipline tracker" />
          </div>
        )}

        {/* ── NEW ENTRY FORM ───────────────────────────────────────────────────── */}
        {showForm && (
          <div style={{
            background: "rgba(8,18,35,0.97)",
            border: "1px solid rgba(245,158,11,0.22)",
            borderRadius: 12, padding: "24px 26px",
            marginBottom: 24,
            boxShadow: "0 0 40px rgba(245,158,11,0.06)",
            animation: "slideIn 0.2s ease",
          }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 10,
              marginBottom: 22, paddingBottom: 14,
              borderBottom: "1px solid rgba(255,255,255,0.05)",
            }}>
              <span style={{ fontSize: 20 }}>📓</span>
              <span style={{ color: "#f59e0b", fontSize: 13, fontWeight: 700, letterSpacing: "0.08em" }}>
                NEW JOURNAL ENTRY
              </span>
            </div>

            {/* ROW 1 — Ticker / Market / Type */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 0.6fr 1.2fr", gap: 12, marginBottom: 14 }}>
              <div>
                <label style={S.label}>Ticker *</label>
                <input
                  style={S.input}
                  placeholder="NVDA"
                  value={form.ticker}
                  onChange={(e) => patchForm({ ticker: e.target.value.toUpperCase() })}
                />
              </div>
              <div>
                <label style={S.label}>Market</label>
                <select style={S.input} value={form.market} onChange={(e) => patchForm({ market: e.target.value })}>
                  <option value="US">🇺🇸 US</option>
                  <option value="UK">🇬🇧 UK</option>
                </select>
              </div>
              <div>
                <label style={S.label}>Entry Type *</label>
                <select
                  style={S.input}
                  value={form.entry_type}
                  onChange={(e) => patchForm({ entry_type: e.target.value as EntryType })}
                >
                  {(Object.keys(TYPE_CFG) as EntryType[]).map((t) => (
                    <option key={t} value={t}>{TYPE_CFG[t].icon} {t}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* ROW 2 — Title */}
            <div style={{ marginBottom: 14 }}>
              <label style={S.label}>Title</label>
              <input
                style={S.input}
                placeholder="e.g. NVDA — Stage 2 breakout with 13F accumulation"
                value={form.title}
                onChange={(e) => patchForm({ title: e.target.value })}
              />
            </div>

            {/* ROW 3 — Content */}
            <div style={{ marginBottom: 14 }}>
              <label style={S.label}>Content * — Thesis · Observations · Execution</label>
              <textarea
                style={{ ...S.input, minHeight: 130, resize: "vertical" }}
                placeholder={`Document your full thesis:\n• What technical stage is this?\n• What smart money signals did you observe?\n• What is your entry rationale and risk management plan?`}
                value={form.content}
                onChange={(e) => patchForm({ content: e.target.value })}
              />
            </div>

            {/* ROW 4 — Conviction */}
            <div style={{ marginBottom: 18 }}>
              <label style={S.label}>Conviction Score</label>
              <ConvictionBar
                value={form.conviction}
                onChange={(v) => patchForm({ conviction: v })}
              />
            </div>

            {/* ROW 5 — Price / Emotion / Setup Quality / R:R / Outcome */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12, marginBottom: 14 }}>
              <div>
                <label style={S.label}>Price at Time</label>
                <input
                  style={S.input} type="number" placeholder="467.50"
                  value={form.price}
                  onChange={(e) => patchForm({ price: e.target.value })}
                />
              </div>
              <div>
                <label style={S.label}>Emotional State</label>
                <select
                  style={S.input}
                  value={form.emotional_state}
                  onChange={(e) => patchForm({ emotional_state: e.target.value as EmotionState })}
                >
                  {(Object.keys(EMOTION_CFG) as EmotionState[]).map((s) => (
                    <option key={s} value={s}>{EMOTION_CFG[s].icon} {s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={S.label}>Setup Quality /10</label>
                <input
                  style={S.input} type="number" min={1} max={10}
                  value={form.setup_quality}
                  onChange={(e) => patchForm({ setup_quality: Number(e.target.value) })}
                />
              </div>
              <div>
                <label style={S.label}>Planned R:R</label>
                <input
                  style={S.input} type="number" step="0.1" placeholder="3.5"
                  value={form.risk_reward}
                  onChange={(e) => patchForm({ risk_reward: e.target.value })}
                />
              </div>
              <div>
                <label style={S.label}>Outcome %</label>
                <input
                  style={S.input} type="number" step="0.01" placeholder="+12.4"
                  value={form.outcome_pct}
                  onChange={(e) => patchForm({ outcome_pct: e.target.value })}
                />
              </div>
            </div>

            {/* ROW 6 — Tags / Mistake / 3-Check */}
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 12, marginBottom: 22 }}>
              <div>
                <label style={S.label}>Tags (comma separated)</label>
                <input
                  style={S.input}
                  placeholder="AI Infrastructure, breakout, earnings play, momentum"
                  value={form.tags}
                  onChange={(e) => patchForm({ tags: e.target.value })}
                />
              </div>
              <div>
                <label style={S.label}>Mistake Classification</label>
                <select
                  style={S.input}
                  value={form.mistake_tag}
                  onChange={(e) => patchForm({ mistake_tag: e.target.value as MistakeTag })}
                >
                  <option value="NONE">✅ None</option>
                  <option value="RULE_BREAK">⚠️ Rule Break</option>
                  <option value="BAD_TIMING">⚠️ Bad Timing</option>
                  <option value="WRONG_THESIS">⚠️ Wrong Thesis</option>
                  <option value="OVERSIZED">⚠️ Oversized</option>
                </select>
              </div>
              <div>
                <label style={S.label}>3-Check Rule</label>
                <div style={{ display: "flex", gap: 6 }}>
                  {([true, false] as const).map((v) => (
                    <button
                      key={String(v)}
                      type="button"
                      onClick={() => patchForm({ checklist_passed: v })}
                      style={{
                        flex: 1, padding: "9px 0",
                        borderRadius: 7,
                        border: `1px solid ${form.checklist_passed === v
                          ? v ? "rgba(74,222,128,0.4)" : "rgba(248,113,113,0.4)"
                          : "rgba(255,255,255,0.07)"}`,
                        background: form.checklist_passed === v
                          ? v ? "rgba(74,222,128,0.12)" : "rgba(248,113,113,0.12)"
                          : "rgba(255,255,255,0.02)",
                        color: form.checklist_passed === v
                          ? v ? "#4ade80" : "#f87171"
                          : "#334155",
                        fontSize: 11, fontWeight: 700, cursor: "pointer",
                        transition: "all 0.15s",
                      }}
                    >
                      {v ? "✅ PASSED" : "❌ FAILED"}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Save / Cancel */}
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{
                  padding: "12px 30px",
                  background: saving
                    ? "rgba(245,158,11,0.25)"
                    : "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                  border: "none", borderRadius: 9,
                  color: saving ? "#f59e0b" : "#000",
                  fontWeight: 800, fontSize: 14,
                  cursor: saving ? "not-allowed" : "pointer",
                  transition: "all 0.2s",
                  animation: saving ? "pulse 1s infinite" : "none",
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                {saving ? "⏳ Saving to Supabase..." : "💾 Save Entry"}
              </button>
              <button
                onClick={() => { setShowForm(false); setForm(BLANK_FORM); }}
                style={{
                  padding: "12px 22px",
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.07)",
                  borderRadius: 9,
                  color: "#475569",
                  fontWeight: 600, fontSize: 13,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* ── FILTER BAR ───────────────────────────────────────────────────────── */}
        <div style={{
          display: "flex", gap: 6,
          alignItems: "center", marginBottom: 16,
          flexWrap: "wrap",
        }}>
          {(["ALL", ...Object.keys(TYPE_CFG)] as const).map((t) => {
            const active = filterType === t;
            const count  = t === "ALL"
              ? entries.length
              : entries.filter((e) => e.entry_type === t).length;
            const color  = t !== "ALL" ? TYPE_CFG[t as EntryType].color : "#f59e0b";
            return (
              <button
                key={t}
                onClick={() => setFilter(t as typeof filterType)}
                style={{
                  padding: "5px 13px",
                  borderRadius: 6,
                  fontSize: 11, fontWeight: 700, letterSpacing: "0.05em",
                  cursor: "pointer",
                  border: `1px solid ${active ? color + "40" : "rgba(255,255,255,0.06)"}`,
                  background: active ? color + "14" : "rgba(255,255,255,0.02)",
                  color: active ? color : "#334155",
                  transition: "all 0.15s",
                }}
              >
                {t !== "ALL" && TYPE_CFG[t as EntryType].icon + " "}
                {t} ({count})
              </button>
            );
          })}

          {/* Search */}
          <div style={{ marginLeft: "auto", position: "relative" }}>
            <span style={{
              position: "absolute", left: 11, top: "50%",
              transform: "translateY(-50%)",
              color: "#334155", fontSize: 13, pointerEvents: "none",
            }}>🔍</span>
            <input
              style={{
                ...S.input, width: 230, paddingLeft: 32,
                background: "rgba(255,255,255,0.02)",
              }}
              placeholder="Search ticker, tag, content…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* ── ENTRIES ──────────────────────────────────────────────────────────── */}
        {loading ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: "#1e293b" }}>
            <div style={{ fontSize: 36, animation: "pulse 1s infinite", marginBottom: 12 }}>⚙️</div>
            <p style={{ margin: 0 }}>Loading from Supabase…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{
            textAlign: "center", padding: "64px 0",
            border: "1px dashed rgba(255,255,255,0.05)",
            borderRadius: 12,
          }}>
            <div style={{ fontSize: 48, marginBottom: 14 }}>📓</div>
            <div style={{ color: "#334155", fontSize: 14 }}>
              {entries.length === 0
                ? "No journal entries yet. Document your first trade above."
                : "No entries match your current filter or search."}
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {filtered.map((entry) => (
              <div key={entry.id} className="entry-row">
                <EntryCard entry={entry} onDelete={handleDelete} />
              </div>
            ))}
          </div>
        )}

        {/* ── FOOTER ───────────────────────────────────────────────────────────── */}
        <div style={{
          marginTop: 40, textAlign: "center",
          color: "#1e293b", fontSize: 11,
          borderTop: "1px solid rgba(255,255,255,0.03)",
          paddingTop: 20,
        }}>
          AlphaResearch v1.0 · Trade Journal · Persisted to Supabase · Not financial advice
        </div>
      </div>
    </div>
  );
}