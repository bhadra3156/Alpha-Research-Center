"use client";
import { useState, useEffect } from "react";
import Navigation from "@/components/common/Navigation";

interface Position {
  ticker: string;
  company_name?: string;
  market: string;
  entry_date: string;
  entry_price: number;
  shares: number;
  stop_level?: number;
  target_price?: number;
  notes?: string;
}

export default function PortfolioPage() {
  const [positions, setPositions] = useState<Position[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ticker: "", market: "US", entry_date: new Date().toISOString().split("T")[0], entry_price: "", shares: "", stop_level: "", target_price: "", notes: "" });

  const gold = "#f59e0b";
  const green = "#10b981";
  const red = "#ef4444";
  const steel = "#94a3b8";

  useEffect(() => { fetchPortfolio(); }, []);

  const fetchPortfolio = async () => {
    try {
      const res = await fetch("http://localhost:8000/portfolio/");
      const data = await res.json();
      setPositions(data);
    } catch { setPositions([]); }
  };

  const addPosition = async () => {
    if (!form.ticker || !form.entry_price || !form.shares) return;
    await fetch("http://localhost:8000/portfolio/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, entry_price: Number(form.entry_price), shares: Number(form.shares), stop_level: form.stop_level ? Number(form.stop_level) : null, target_price: form.target_price ? Number(form.target_price) : null }),
    });
    setShowForm(false);
    setForm({ ticker: "", market: "US", entry_date: new Date().toISOString().split("T")[0], entry_price: "", shares: "", stop_level: "", target_price: "", notes: "" });
    fetchPortfolio();
  };

  const totalValue = positions.reduce((sum, p) => sum + p.entry_price * p.shares, 0);

  const inputStyle = { padding: "9px 12px", borderRadius: "8px", border: "1px solid #1e293b", background: "#060820", color: "#f1f5f9", fontSize: "13px", outline: "none", width: "100%" };

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #060820 0%, #0d1145 50%, #060820 100%)" }}>
      <Navigation />
      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "80px 24px 40px" }}>

        <div style={{ marginBottom: "28px", display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "16px" }}>
          <div>
            <h1 style={{ fontSize: "26px", fontWeight: "900", color: "#f1f5f9", marginBottom: "4px" }}>
              <span style={{ color: gold }}>Portfolio</span> Tracker
            </h1>
            <p style={{ color: "#475569", fontSize: "13px" }}>{positions.length} open positions · Track entries, stops and targets</p>
          </div>
          <button onClick={() => setShowForm(!showForm)}
            style={{ padding: "10px 22px", borderRadius: "10px", fontWeight: "700", fontSize: "13px", cursor: "pointer", border: "none", background: "linear-gradient(135deg,#f59e0b,#d97706)", color: "#060820" }}>
            + Add Position
          </button>
        </div>

        {/* Summary stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "14px", marginBottom: "20px" }}>
          {[
            { label: "Open Positions", value: String(positions.length), color: gold },
            { label: "Total Deployed", value: "$" + totalValue.toLocaleString("en-US", { maximumFractionDigits: 0 }), color: green },
            { label: "Markets", value: [...new Set(positions.map(p => p.market))].join(" · ") || "—", color: "#a78bfa" },
          ].map(s => (
            <div key={s.label} style={{ background: "linear-gradient(145deg,#0f172a,#1e293b)", border: "1px solid #1e293b", borderRadius: "12px", padding: "16px 20px" }}>
              <div style={{ fontSize: "20px", fontWeight: "800", color: s.color, fontFamily: "monospace" }}>{s.value}</div>
              <div style={{ fontSize: "10px", color: "#475569", textTransform: "uppercase", marginTop: "2px" }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Add position form */}
        {showForm && (
          <div style={{ background: "linear-gradient(145deg,#0f172a,#1e293b)", border: "1px solid rgba(245,158,11,0.25)", borderRadius: "14px", padding: "22px 24px", marginBottom: "20px" }}>
            <h3 style={{ fontSize: "14px", fontWeight: "700", color: "#f1f5f9", marginBottom: "16px" }}>📋 New Position</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "12px", marginBottom: "12px" }}>
              <div>
                <label style={{ fontSize: "11px", color: steel, display: "block", marginBottom: "4px" }}>TICKER *</label>
                <input style={inputStyle} value={form.ticker} onChange={e => setForm({ ...form, ticker: e.target.value.toUpperCase() })} placeholder="NVDA" />
              </div>
              <div>
                <label style={{ fontSize: "11px", color: steel, display: "block", marginBottom: "4px" }}>MARKET *</label>
                <select style={{ ...inputStyle }} value={form.market} onChange={e => setForm({ ...form, market: e.target.value })}>
                  <option value="US">🇺🇸 US</option>
                  <option value="UK">🇬🇧 UK</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: "11px", color: steel, display: "block", marginBottom: "4px" }}>ENTRY DATE *</label>
                <input style={inputStyle} type="date" value={form.entry_date} onChange={e => setForm({ ...form, entry_date: e.target.value })} />
              </div>
              <div>
                <label style={{ fontSize: "11px", color: steel, display: "block", marginBottom: "4px" }}>ENTRY PRICE *</label>
                <input style={inputStyle} type="number" value={form.entry_price} onChange={e => setForm({ ...form, entry_price: e.target.value })} placeholder="0.00" />
              </div>
              <div>
                <label style={{ fontSize: "11px", color: steel, display: "block", marginBottom: "4px" }}>SHARES *</label>
                <input style={inputStyle} type="number" value={form.shares} onChange={e => setForm({ ...form, shares: e.target.value })} placeholder="0" />
              </div>
              <div>
                <label style={{ fontSize: "11px", color: steel, display: "block", marginBottom: "4px" }}>STOP LEVEL</label>
                <input style={inputStyle} type="number" value={form.stop_level} onChange={e => setForm({ ...form, stop_level: e.target.value })} placeholder="0.00" />
              </div>
              <div>
                <label style={{ fontSize: "11px", color: steel, display: "block", marginBottom: "4px" }}>TARGET PRICE</label>
                <input style={inputStyle} type="number" value={form.target_price} onChange={e => setForm({ ...form, target_price: e.target.value })} placeholder="0.00" />
              </div>
              <div style={{ gridColumn: "span 2" }}>
                <label style={{ fontSize: "11px", color: steel, display: "block", marginBottom: "4px" }}>NOTES</label>
                <input style={inputStyle} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Thesis, setup notes..." />
              </div>
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <button onClick={addPosition} style={{ padding: "9px 22px", borderRadius: "9px", fontWeight: "700", fontSize: "13px", cursor: "pointer", border: "none", background: "linear-gradient(135deg,#f59e0b,#d97706)", color: "#060820" }}>Save Position</button>
              <button onClick={() => setShowForm(false)} style={{ padding: "9px 18px", borderRadius: "9px", fontSize: "13px", cursor: "pointer", border: "1px solid #1e293b", background: "transparent", color: steel }}>Cancel</button>
            </div>
          </div>
        )}

        {/* Positions table */}
        <div style={{ background: "linear-gradient(145deg,#0f172a,#1e293b)", border: "1px solid #1e293b", borderRadius: "14px", overflow: "hidden" }}>
          <div style={{ padding: "12px 20px", borderBottom: "1px solid #1e293b" }}>
            <span style={{ fontWeight: "700", color: "#f1f5f9", fontSize: "13px" }}>Open Positions</span>
          </div>
          {positions.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 0" }}>
              <div style={{ fontSize: "40px", marginBottom: "14px" }}>💼</div>
              <div style={{ color: "#f1f5f9", fontSize: "15px", fontWeight: "600", marginBottom: "6px" }}>No positions yet</div>
              <div style={{ color: "#334155", fontSize: "13px" }}>Click Add Position to track your first trade</div>
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
              <thead>
                <tr style={{ background: "rgba(15,23,42,0.9)" }}>
                  {["Ticker","Entry Date","Entry Price","Shares","Value","Stop","Target","R/R","Notes"].map(h => (
                    <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: "10px", fontWeight: "700", color: "#334155", textTransform: "uppercase", letterSpacing: "0.07em", borderBottom: "1px solid #1e293b", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {positions.map((p, i) => {
                  const value = p.entry_price * p.shares;
                  const rr = p.stop_level && p.target_price ? ((p.target_price - p.entry_price) / (p.entry_price - p.stop_level)).toFixed(1) + "x" : "—";
                  return (
                    <tr key={i} style={{ borderBottom: "1px solid rgba(30,41,59,0.4)" }}
                      onMouseEnter={e => { e.currentTarget.style.background = "rgba(245,158,11,0.03)"; }}
                      onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}>
                      <td style={{ padding: "12px 14px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                          <span>{p.market === "UK" ? "🇬🇧" : "🇺🇸"}</span>
                          <span style={{ fontFamily: "monospace", fontWeight: "800", color: gold }}>{p.ticker}</span>
                        </div>
                      </td>
                      <td style={{ padding: "12px 14px", color: steel, fontSize: "12px" }}>{p.entry_date}</td>
                      <td style={{ padding: "12px 14px", fontFamily: "monospace", fontWeight: "700", color: "#f1f5f9" }}>{p.market === "UK" ? "£" : "$"}{p.entry_price.toFixed(2)}</td>
                      <td style={{ padding: "12px 14px", fontFamily: "monospace", color: "#f1f5f9" }}>{p.shares.toLocaleString()}</td>
                      <td style={{ padding: "12px 14px", fontFamily: "monospace", fontWeight: "700", color: green }}>${value.toLocaleString("en-US", { maximumFractionDigits: 0 })}</td>
                      <td style={{ padding: "12px 14px", fontFamily: "monospace", color: red, fontSize: "12px" }}>{p.stop_level ? (p.market === "UK" ? "£" : "$") + p.stop_level.toFixed(2) : "—"}</td>
                      <td style={{ padding: "12px 14px", fontFamily: "monospace", color: gold, fontSize: "12px" }}>{p.target_price ? (p.market === "UK" ? "£" : "$") + p.target_price.toFixed(2) : "—"}</td>
                      <td style={{ padding: "12px 14px", fontFamily: "monospace", fontWeight: "700", color: "#a78bfa", fontSize: "12px" }}>{rr}</td>
                      <td style={{ padding: "12px 14px", color: "#475569", fontSize: "12px", maxWidth: "160px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.notes || "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
        <div style={{ marginTop: "32px", textAlign: "center", color: "#1e293b", fontSize: "11px" }}>AlphaResearch v1.0 · Not financial advice</div>
      </div>
    </div>
  );
}