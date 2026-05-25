"use client";
import { useState, useEffect } from "react";
import Navigation from "@/components/common/Navigation";

interface WatchlistItem {
  ticker: string;
  company_name: string;
  market: string;
  sector: string;
  theme: string;
}

export default function WatchlistPage() {
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newTicker, setNewTicker] = useState("");
  const [newMarket, setNewMarket] = useState("US");
  const [filter, setFilter] = useState("ALL");
  const [search, setSearch] = useState("");

  const gold = "#f59e0b";
  const green = "#10b981";
  const red = "#ef4444";
  const steel = "#94a3b8";

  useEffect(() => { fetchWatchlist(); }, []);

  const fetchWatchlist = async () => {
    try {
      const res = await fetch("http://localhost:8000/watchlist/");
      const data = await res.json();
      setItems(data);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const addTicker = async () => {
    if (!newTicker.trim()) return;
    setAdding(true);
    try {
      await fetch("http://localhost:8000/watchlist/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticker: newTicker.toUpperCase(), market: newMarket }),
      });
      setNewTicker("");
      fetchWatchlist();
    } finally {
      setAdding(false);
    }
  };

  const removeTicker = async (ticker: string) => {
    await fetch("http://localhost:8000/watchlist/" + ticker, { method: "DELETE" });
    fetchWatchlist();
  };

  const filtered = items.filter(i => {
    const matchMarket = filter === "ALL" || i.market === filter;
    const matchSearch = !search || i.ticker.includes(search.toUpperCase()) || (i.company_name || "").toLowerCase().includes(search.toLowerCase());
    return matchMarket && matchSearch;
  });

  const themes = [...new Set(items.map(i => i.theme).filter(Boolean))];

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #060820 0%, #0d1145 50%, #060820 100%)" }}>
      <Navigation />
      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "80px 24px 40px" }}>

        <div style={{ marginBottom: "28px", display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "16px" }}>
          <div>
            <h1 style={{ fontSize: "26px", fontWeight: "900", color: "#f1f5f9", marginBottom: "4px" }}>
              <span style={{ color: gold }}>Watchlist</span> Manager
            </h1>
            <p style={{ color: "#475569", fontSize: "13px" }}>
              {items.length} stocks monitored · US and UK markets
            </p>
          </div>
          {/* Stats */}
          <div style={{ display: "flex", gap: "12px" }}>
            {[
              { label: "Total", value: items.length, color: gold },
              { label: "US", value: items.filter(i => i.market === "US").length, color: "#60a5fa" },
              { label: "UK", value: items.filter(i => i.market === "UK").length, color: "#a78bfa" },
            ].map(s => (
              <div key={s.label} style={{ background: "linear-gradient(145deg,#0f172a,#1e293b)", border: "1px solid #1e293b", borderRadius: "10px", padding: "10px 16px", textAlign: "center" }}>
                <div style={{ fontSize: "18px", fontWeight: "800", color: s.color, fontFamily: "monospace" }}>{s.value}</div>
                <div style={{ fontSize: "10px", color: "#475569", textTransform: "uppercase" }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Add ticker bar */}
        <div style={{ background: "linear-gradient(145deg,#0f172a,#1e293b)", border: "1px solid #1e293b", borderRadius: "14px", padding: "18px 22px", marginBottom: "20px", display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
          <input value={newTicker} onChange={e => setNewTicker(e.target.value.toUpperCase())}
            onKeyDown={e => e.key === "Enter" && addTicker()}
            placeholder="Ticker e.g. NVDA or BA.L"
            style={{ padding: "9px 14px", borderRadius: "9px", border: "1px solid #1e293b", background: "#060820", color: "#f1f5f9", fontSize: "14px", fontFamily: "monospace", fontWeight: "700", width: "180px", outline: "none" }} />
          <select value={newMarket} onChange={e => setNewMarket(e.target.value)}
            style={{ padding: "9px 12px", borderRadius: "9px", border: "1px solid #1e293b", background: "#060820", color: steel, fontSize: "13px", outline: "none" }}>
            <option value="US">🇺🇸 US</option>
            <option value="UK">🇬🇧 UK</option>
          </select>
          <button onClick={addTicker} disabled={adding || !newTicker}
            style={{ padding: "9px 22px", borderRadius: "9px", fontWeight: "700", fontSize: "13px", cursor: "pointer", border: "none", background: "linear-gradient(135deg,#f59e0b,#d97706)", color: "#060820" }}>
            {adding ? "Adding..." : "+ Add to Watchlist"}
          </button>
          <div style={{ marginLeft: "auto", display: "flex", gap: "8px", alignItems: "center" }}>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search..."
              style={{ padding: "9px 14px", borderRadius: "9px", border: "1px solid #1e293b", background: "#060820", color: "#f1f5f9", fontSize: "13px", outline: "none", width: "140px" }} />
            {["ALL","US","UK"].map(m => (
              <button key={m} onClick={() => setFilter(m)}
                style={{ padding: "6px 14px", borderRadius: "8px", fontSize: "12px", fontWeight: "600", cursor: "pointer", border: "1px solid", background: filter === m ? "rgba(245,158,11,0.15)" : "transparent", color: filter === m ? gold : "#64748b", borderColor: filter === m ? "rgba(245,158,11,0.35)" : "#1e293b" }}>
                {m === "ALL" ? "🌍 All" : m === "US" ? "🇺🇸 US" : "🇬🇧 UK"}
              </button>
            ))}
          </div>
        </div>

        {/* Theme summary */}
        {themes.length > 0 && (
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "16px" }}>
            {themes.map(t => (
              <span key={t} style={{ padding: "4px 12px", borderRadius: "20px", fontSize: "11px", fontWeight: "600", background: "rgba(245,158,11,0.08)", color: gold, border: "1px solid rgba(245,158,11,0.2)" }}>
                {t} ({items.filter(i => i.theme === t).length})
              </span>
            ))}
          </div>
        )}

        {/* Table */}
        {loading ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: steel }}>Loading watchlist...</div>
        ) : (
          <div style={{ background: "linear-gradient(145deg,#0f172a,#1e293b)", border: "1px solid #1e293b", borderRadius: "14px", overflow: "hidden" }}>
            <div style={{ padding: "12px 20px", borderBottom: "1px solid #1e293b", display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ fontWeight: "700", color: "#f1f5f9", fontSize: "13px" }}>Monitored Stocks</span>
              <span style={{ padding: "2px 10px", borderRadius: "12px", fontSize: "11px", fontWeight: "700", background: "rgba(245,158,11,0.1)", color: gold, border: "1px solid rgba(245,158,11,0.2)" }}>{filtered.length} stocks</span>
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
              <thead>
                <tr style={{ background: "rgba(15,23,42,0.9)" }}>
                  {["Market","Ticker","Company","Sector","Theme","Action"].map(h => (
                    <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: "10px", fontWeight: "700", color: "#334155", textTransform: "uppercase", letterSpacing: "0.07em", borderBottom: "1px solid #1e293b" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(item => (
                  <tr key={item.ticker} style={{ borderBottom: "1px solid rgba(30,41,59,0.4)" }}
                    onMouseEnter={e => { e.currentTarget.style.background = "rgba(245,158,11,0.03)"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}>
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{ fontSize: "16px" }}>{item.market === "UK" ? "🇬🇧" : "🇺🇸"}</span>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{ fontFamily: "monospace", fontWeight: "800", color: gold, fontSize: "14px" }}>{item.ticker}</span>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{ color: "#e2e8f0", fontWeight: "500" }}>{item.company_name || "—"}</span>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{ color: steel, fontSize: "12px" }}>{item.sector || "—"}</span>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      {item.theme && (
                        <span style={{ padding: "2px 10px", borderRadius: "12px", fontSize: "11px", background: "rgba(99,102,241,0.1)", color: "#818cf8", border: "1px solid rgba(99,102,241,0.2)" }}>{item.theme}</span>
                      )}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ display: "flex", gap: "6px" }}>
                        <a href={"/analyzer?ticker=" + item.ticker + "&market=" + item.market}
                          style={{ padding: "4px 10px", borderRadius: "6px", fontSize: "11px", fontWeight: "700", cursor: "pointer", border: "1px solid rgba(245,158,11,0.3)", background: "rgba(245,158,11,0.1)", color: gold, textDecoration: "none" }}>
                          🔬 Analyze
                        </a>
                        <button onClick={() => removeTicker(item.ticker)}
                          style={{ padding: "4px 10px", borderRadius: "6px", fontSize: "11px", fontWeight: "700", cursor: "pointer", border: "1px solid rgba(239,68,68,0.25)", background: "rgba(239,68,68,0.08)", color: red }}>
                          Remove
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div style={{ textAlign: "center", padding: "40px", color: "#334155", fontSize: "13px" }}>
                No stocks match your filter. Add tickers above.
              </div>
            )}
          </div>
        )}

        <div style={{ marginTop: "32px", textAlign: "center", color: "#1e293b", fontSize: "11px" }}>
          AlphaResearch v1.0 · Not financial advice · For institutional use only
        </div>
      </div>
    </div>
  );
}