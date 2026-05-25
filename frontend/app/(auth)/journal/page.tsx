"use client";
import { useState, useEffect } from "react";
import Navigation from "../../components/common/Navigation";

interface JournalEntry {
  ticker: string;
  entry_type: string;
  title: string;
  content: string;
  conviction_at_time?: number;
  price_at_time?: number;
  tags?: string[];
}

export default function JournalPage() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState("ALL");
  const [form, setForm] = useState({ ticker: "", entry_type: "ANALYSIS", title: "", content: "", conviction_at_time: "", price_at_time: "", tags: "" });

  const gold = "#f59e0b";
  const steel = "#94a3b8";

  const entryTypes = ["ANALYSIS", "ENTRY", "ADJUSTMENT", "EXIT", "OBSERVATION"];
  const typeColors: Record<string, string> = {
    ANALYSIS: "#60a5fa", ENTRY: "#10b981", ADJUSTMENT: "#f59e0b", EXIT: "#ef4444", OBSERVATION: "#94a3b8"
  };

  useEffect(() => { fetchJournal(); }, []);

  const fetchJournal = async () => {
    try {
      const res = await fetch("http://localhost:8000/journal/");
      const data = await res.json();
      setEntries(data);
    } catch { setEntries([]); }
  };

  const addEntry = async () => {
    if (!form.ticker || !form.title || !form.content) return;
    await fetch("http://localhost:8000/journal/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, conviction_at_time: form.conviction_at_time ? Number(form.conviction_at_time) : null, price_at_time: form.price_at_time ? Number(form.price_at_time) : null, tags: form.tags ? form.tags.split(",").map(t => t.trim()) : [] }),
    });
    setShowForm(false);
    setForm({ ticker: "", entry_type: "ANALYSIS", title: "", content: "", conviction_at_time: "", price_at_time: "", tags: "" });
    fetchJournal();
  };

  const filtered = filter === "ALL" ? entries : entries.filter(e => e.entry_type === filter);

  const inputStyle = { padding: "9px 12px", borderRadius: "8px", border: "1px solid #1e293b", background: "#060820", color: "#f1f5f9", fontSize: "13px", outline: "none", width: "100%" };

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #060820 0%, #0d1145 50%, #060820 100%)" }}>
      <Navigation />
      <div style={{ maxWidth: "1000px", margin: "0 auto", padding: "80px 24px 40px" }}>

        <div style={{ marginBottom: "28px", display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "16px" }}>
          <div>
            <h1 style={{ fontSize: "26px", fontWeight: "900", color: "#f1f5f9", marginBottom: "4px" }}>
              Trade <span style={{ color: gold }}>Journal</span>
            </h1>
            <p style={{ color: "#475569", fontSize: "13px" }}>{entries.length} entries · Analysis · Entries · Exits · Observations</p>
          </div>
          <button onClick={() => setShowForm(!showForm)}
            style={{ padding: "10px 22px", borderRadius: "10px", fontWeight: "700", fontSize: "13px", cursor: "pointer", border: "none", background: "linear-gradient(135deg,#f59e0b,#d97706)", color: "#060820" }}>
            + New Entry
          </button>
        </div>

        {/* Filter tabs */}
        <div style={{ display: "flex", gap: "6px", marginBottom: "20px", flexWrap: "wrap" }}>
          {["ALL", ...entryTypes].map(t => (
            <button key={t} onClick={() => setFilter(t)}
              style={{ padding: "6px 14px", borderRadius: "8px", fontSize: "12px", fontWeight: "600", cursor: "pointer", border: "1px solid", background: filter === t ? "rgba(245,158,11,0.15)" : "transparent", color: filter === t ? gold : "#64748b", borderColor: filter === t ? "rgba(245,158,11,0.35)" : "#1e293b" }}>
              {t} {t !== "ALL" && "(" + entries.filter(e => e.entry_type === t).length + ")"}
            </button>
          ))}
        </div>

        {/* Add entry form */}
        {showForm && (
          <div style={{ background: "linear-gradient(145deg,#0f172a,#1e293b)", border: "1px solid rgba(245,158,11,0.25)", borderRadius: "14px", padding: "22px 24px", marginBottom: "20px" }}>
            <h3 style={{ fontSize: "14px", fontWeight: "700", color: "#f1f5f9", marginBottom: "16px" }}>📓 New Journal Entry</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", marginBottom: "12px" }}>
              <div>
                <label style={{ fontSize: "11px", color: steel, display: "block", marginBottom: "4px" }}>TICKER *</label>
                <input style={inputStyle} value={form.ticker} onChange={e => setForm({ ...form, ticker: e.target.value.toUpperCase() })} placeholder="NVDA" />
              </div>
              <div>
                <label style={{ fontSize: "11px", color: steel, display: "block", marginBottom: "4px" }}>TYPE *</label>
                <select style={inputStyle} value={form.entry_type} onChange={e => setForm({ ...form, entry_type: e.target.value })}>
                  {entryTypes.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: "11px", color: steel, display: "block", marginBottom: "4px" }}>CONVICTION (1-10)</label>
                <input style={inputStyle} type="number" min="1" max="10" value={form.conviction_at_time} onChange={e => setForm({ ...form, conviction_at_time: e.target.value })} placeholder="7" />
              </div>
            </div>
            <div style={{ marginBottom: "12px" }}>
              <label style={{ fontSize: "11px", color: steel, display: "block", marginBottom: "4px" }}>TITLE *</label>
              <input style={inputStyle} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. NVDA — Stage 2 breakout entry thesis" />
            </div>
            <div style={{ marginBottom: "12px" }}>
              <label style={{ fontSize: "11px", color: steel, display: "block", marginBottom: "4px" }}>CONTENT *</label>
              <textarea style={{ ...inputStyle, minHeight: "120px", resize: "vertical" }} value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} placeholder="Full analysis, reasoning, observations..." />
            </div>
            <div style={{ marginBottom: "16px" }}>
              <label style={{ fontSize: "11px", color: steel, display: "block", marginBottom: "4px" }}>TAGS (comma separated)</label>
              <input style={inputStyle} value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })} placeholder="AI Infrastructure, breakout, momentum" />
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <button onClick={addEntry} style={{ padding: "9px 22px", borderRadius: "9px", fontWeight: "700", fontSize: "13px", cursor: "pointer", border: "none", background: "linear-gradient(135deg,#f59e0b,#d97706)", color: "#060820" }}>Save Entry</button>
              <button onClick={() => setShowForm(false)} style={{ padding: "9px 18px", borderRadius: "9px", fontSize: "13px", cursor: "pointer", border: "1px solid #1e293b", background: "transparent", color: steel }}>Cancel</button>
            </div>
          </div>
        )}

        {/* Entries */}
        {filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "70px 0" }}>
            <div style={{ fontSize: "48px", marginBottom: "16px" }}>📓</div>
            <div style={{ color: "#f1f5f9", fontSize: "16px", fontWeight: "600", marginBottom: "6px" }}>No journal entries yet</div>
            <div style={{ color: "#334155", fontSize: "13px" }}>Document your analysis, entries and exits to build your trading edge</div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {filtered.map((entry, i) => (
              <div key={i} style={{ background: "linear-gradient(145deg,#0f172a,#1e293b)", border: "1px solid #1e293b", borderRadius: "12px", padding: "18px 22px" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(245,158,11,0.2)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "#1e293b"; }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "10px", gap: "12px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                    <span style={{ fontFamily: "monospace", fontWeight: "800", color: gold, fontSize: "15px" }}>{entry.ticker}</span>
                    <span style={{ padding: "2px 10px", borderRadius: "12px", fontSize: "11px", fontWeight: "700", background: (typeColors[entry.entry_type] || steel) + "22", color: typeColors[entry.entry_type] || steel, border: "1px solid " + (typeColors[entry.entry_type] || steel) + "44" }}>
                      {entry.entry_type}
                    </span>
                    {entry.conviction_at_time && (
                      <span style={{ fontSize: "12px", color: gold, fontWeight: "700" }}>⚡ {entry.conviction_at_time}/10</span>
                    )}
                  </div>
                </div>
                <div style={{ fontSize: "14px", fontWeight: "700", color: "#f1f5f9", marginBottom: "8px" }}>{entry.title}</div>
                <div style={{ fontSize: "13px", color: "#94a3b8", lineHeight: "1.6", whiteSpace: "pre-wrap" }}>{entry.content}</div>
                {entry.tags && entry.tags.length > 0 && (
                  <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "12px" }}>
                    {entry.tags.map((tag, j) => (
                      <span key={j} style={{ padding: "2px 10px", borderRadius: "12px", fontSize: "11px", background: "rgba(99,102,241,0.1)", color: "#818cf8", border: "1px solid rgba(99,102,241,0.2)" }}>{tag}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div style={{ marginTop: "32px", textAlign: "center", color: "#1e293b", fontSize: "11px" }}>AlphaResearch v1.0 · Not financial advice</div>
      </div>
    </div>
  );
}