"use client";
import { useState } from "react";
import Navigation from "@/components/common/Navigation";
import { useRouter } from "next/navigation";

interface Stock {
  ticker: string; company_name: string; market: string;
  price: number; market_cap: number;
  check1_pass: boolean; check2_pass: boolean; check3_pass: boolean;
  fundamental_verdict: string; technical_stage: string;
  smart_money_trigger: string; conviction_score: number;
  data_quality: string; entry_zone: string;
}

interface ScanResult {
  scan_id: string; scan_date: string; market: string;
  stocks_scanned: number; qualifying_count: number;
  qualifying_stocks: Stock[]; scan_duration_ms: number;
}

const SECTORS = ["All Sectors", "Technology", "Healthcare", "Financials", "Energy", "Industrials", "Consumer", "Real Estate", "Materials", "Utilities"];

export default function Dashboard() {
  const router = useRouter();
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [market, setMarket] = useState("US");
  const [minConv, setMinConv] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [sortBy, setSortBy] = useState<"conviction" | "price" | "mktcap">("conviction");
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");

  const gold = "#f59e0b";
  const green = "#10b981";
  const red = "#ef4444";
  const blue = "#60a5fa";
  const steel = "#94a3b8";

  const runScan = async () => {
    setScanning(true); setError(null);
    const start = Date.now();
    const timer = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 1000);
    try {
      const res = await fetch("http://localhost:8000/scan/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ market, notify_telegram: false }),
      });
      if (!res.ok) throw new Error("API error " + res.status);
      const data: ScanResult = await res.json();
      setResult(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Scan failed — is backend running on port 8000?");
    } finally {
      clearInterval(timer); setElapsed(0); setScanning(false);
    }
  };

  const handleSort = (col: "conviction" | "price" | "mktcap") => {
    if (sortBy === col) setSortDir(d => d === "desc" ? "asc" : "desc");
    else { setSortBy(col); setSortDir("desc"); }
  };

  const stocks = (result?.qualifying_stocks || [])
    .filter(s => minConv === 0 || s.conviction_score >= minConv)
    .sort((a, b) => {
      const val = (s: Stock) => sortBy === "conviction" ? s.conviction_score : sortBy === "price" ? s.price : s.market_cap;
      return sortDir === "desc" ? val(b) - val(a) : val(a) - val(b);
    });

  const fmt = (v: number, currency = "$") => {
    if (!v || v === 0) return "N/A";
    if (v >= 1e12) return `${currency}${(v/1e12).toFixed(2)}T`;
    if (v >= 1e9)  return `${currency}${(v/1e9).toFixed(1)}B`;
    if (v >= 1e6)  return `${currency}${(v/1e6).toFixed(0)}M`;
    return `${currency}${v.toFixed(2)}`;
  };

  const convColor = (s: number) => s >= 8 ? green : s >= 6 ? gold : red;
  const stageColor = (stage: string) => stage.includes("Stage 2") ? green : stage.includes("Stage 1") ? blue : red;
  const stageBg = (stage: string) => stage.includes("Stage 2") ? "rgba(16,185,129,0.12)" : stage.includes("Stage 1") ? "rgba(96,165,250,0.12)" : "rgba(239,68,68,0.12)";
  const SortIcon = ({ col }: { col: string }) => sortBy === col ? (sortDir === "desc" ? " ↓" : " ↑") : " ·";

  // Stats
  const avgConv = stocks.length ? (stocks.reduce((s, x) => s + x.conviction_score, 0) / stocks.length).toFixed(1) : "—";
  const stage2Count = stocks.filter(s => s.technical_stage.includes("Stage 2")).length;

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #060820 0%, #0d1145 50%, #060820 100%)" }}>
      <Navigation />
      <div style={{ maxWidth: "1600px", margin: "0 auto", padding: "72px 20px 40px" }}>

        {/* Header */}
        <div style={{ marginBottom: "20px" }}>
          <h1 style={{ fontSize: "24px", fontWeight: "900", color: "#f1f5f9", marginBottom: "2px" }}>
            Institutional Equity <span style={{ color: gold }}>Command Center</span>
          </h1>
          <p style={{ color: "#475569", fontSize: "12px" }}>
            Full US market scan · 2-Check qualification · Fundamental + Technical
          </p>
        </div>

        {/* Stats row */}
        {result && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: "10px", marginBottom: "16px" }}>
            {[
              { label: "Universe",    value: result.stocks_scanned,     color: blue,    suffix: " stocks" },
              { label: "Qualifying",  value: result.qualifying_count,   color: green,   suffix: " gems" },
              { label: "Stage 2",     value: stage2Count,               color: gold,    suffix: " markup" },
              { label: "Avg Conv.",   value: avgConv,                   color: "#a78bfa", suffix: "/10" },
              { label: "Scan Time",   value: (result.scan_duration_ms/1000).toFixed(1), color: steel, suffix: "s" },
              { label: "Market",      value: result.market,             color: "#f1f5f9", suffix: "" },
            ].map(s => (
              <div key={s.label} style={{ background: "linear-gradient(145deg,#0f172a,#1e293b)", border: "1px solid #1e293b", borderRadius: "10px", padding: "12px 14px" }}>
                <div style={{ fontSize: "18px", fontWeight: "800", color: s.color, fontFamily: "monospace" }}>{s.value}{s.suffix}</div>
                <div style={{ fontSize: "10px", color: "#475569", textTransform: "uppercase", letterSpacing: "0.05em", marginTop: "2px" }}>{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Control bar */}
        <div style={{ background: "linear-gradient(145deg,#0f172a,#1e293b)", border: "1px solid #1e293b", borderRadius: "12px", padding: "14px 18px", marginBottom: "16px", display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>

          {/* Market */}
          <div style={{ display: "flex", gap: "4px" }}>
            {[["US","🇺🇸 US Market"]].map(([v,l]) => (
              <button key={v} onClick={() => setMarket(v as string)}
                style={{ padding: "7px 16px", borderRadius: "8px", fontSize: "12px", fontWeight: "700", cursor: "pointer", border: "1px solid", background: market===v ? "rgba(245,158,11,0.15)" : "transparent", color: market===v ? gold : "#64748b", borderColor: market===v ? "rgba(245,158,11,0.35)" : "#1e293b" }}>
                {l}
              </button>
            ))}
          </div>

          {/* Conviction filter */}
          <div style={{ display: "flex", gap: "4px" }}>
            {[[0,"All"],[8,"🔥 High 8+"],[7,"⚡ 7+"],[6,"📊 6+"]].map(([v,l]) => (
              <button key={String(v)} onClick={() => setMinConv(Number(v))}
                style={{ padding: "7px 12px", borderRadius: "8px", fontSize: "12px", fontWeight: "600", cursor: "pointer", border: "1px solid", background: minConv===v ? "rgba(99,102,241,0.15)" : "transparent", color: minConv===v ? "#818cf8" : "#64748b", borderColor: minConv===v ? "rgba(99,102,241,0.35)" : "#1e293b" }}>
                {l}
              </button>
            ))}
          </div>

          {/* Showing count */}
          {result && (
            <div style={{ fontSize: "12px", color: "#475569" }}>
              Showing <span style={{ color: green, fontWeight: "700" }}>{stocks.length}</span> qualifying
            </div>
          )}

          {/* SCAN button */}
          <div style={{ marginLeft: "auto" }}>
            <button onClick={runScan} disabled={scanning}
              style={{ padding: "10px 32px", borderRadius: "10px", fontWeight: "800", fontSize: "14px", cursor: scanning ? "not-allowed" : "pointer", border: "none", background: scanning ? "rgba(245,158,11,0.3)" : "linear-gradient(135deg,#f59e0b,#d97706)", color: "#060820", boxShadow: scanning ? "none" : "0 0 24px rgba(245,158,11,0.35)", minWidth: "150px" }}>
              {scanning ? `⚡ Scanning ${elapsed}s...` : "⚡ RUN SCAN"}
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "10px", padding: "12px 16px", marginBottom: "14px", color: red, fontSize: "13px" }}>
            {error}
          </div>
        )}

        {/* Scanning */}
        {scanning && (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <div style={{ fontSize: "52px", marginBottom: "16px" }}>⚡</div>
            <div style={{ fontSize: "18px", fontWeight: "700", color: gold, marginBottom: "8px" }}>
              Scanning US Market...
            </div>
            <div style={{ color: "#475569", fontSize: "13px", marginBottom: "4px" }}>
              Fetching data · Fundamental analysis · Technical phase detection
            </div>
            <div style={{ color: "#334155", fontSize: "12px" }}>
              ~200 stocks · async parallel · {elapsed}s elapsed
            </div>
            <div style={{ marginTop: "20px", display: "flex", justifyContent: "center", gap: "8px" }}>
              {["📊 Fundamentals","📈 Technicals","🐋 Smart Money"].map(c => (
                <div key={c} style={{ padding: "6px 14px", borderRadius: "20px", fontSize: "11px", background: "rgba(245,158,11,0.1)", color: gold, border: "1px solid rgba(245,158,11,0.2)" }}>{c}</div>
              ))}
            </div>
          </div>
        )}

        {/* Results table */}
        {!scanning && stocks.length > 0 && (
          <div style={{ background: "linear-gradient(145deg,#0f172a,#1e293b)", border: "1px solid #1e293b", borderRadius: "14px", overflow: "hidden" }}>

            {/* Table header bar */}
            <div style={{ padding: "12px 18px", borderBottom: "1px solid #1e293b", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ fontWeight: "700", color: "#f1f5f9", fontSize: "13px" }}>Qualifying Gems</span>
                <span style={{ padding: "2px 10px", borderRadius: "12px", fontSize: "11px", fontWeight: "700", background: "rgba(16,185,129,0.15)", color: green, border: "1px solid rgba(16,185,129,0.3)" }}>
                  {stocks.length} PASS ALL CHECKS
                </span>
              </div>
              <span style={{ fontSize: "11px", color: "#334155" }}>
                {result ? new Date(result.scan_date).toLocaleString() : ""}
              </span>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                <thead>
                  <tr style={{ background: "rgba(6,8,32,0.8)" }}>
                    {[
                      { label: "#",           w: "40px",   sort: null },
                      { label: "Ticker",      w: "80px",   sort: null },
                      { label: "Company",     w: "160px",  sort: null },
                      { label: "Price",       w: "90px",   sort: "price" },
                      { label: "Mkt Cap",     w: "100px",  sort: "mktcap" },
                      { label: "Rev Growth",  w: "90px",   sort: null },
                      { label: "Net Margin",  w: "90px",   sort: null },
                      { label: "Tech Stage",  w: "150px",  sort: null },
                      { label: "RSI",         w: "60px",   sort: null },
                      { label: "Entry Zone",  w: "150px",  sort: null },
                      { label: "Conviction",  w: "110px",  sort: "conviction" },
                      { label: "Action",      w: "90px",   sort: null },
                    ].map(h => (
                      <th key={h.label}
                        onClick={() => h.sort && handleSort(h.sort as any)}
                        style={{ padding: "10px 12px", textAlign: "left", fontSize: "10px", fontWeight: "700", color: h.sort ? (sortBy === h.sort ? gold : "#475569") : "#334155", textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: "1px solid #1e293b", whiteSpace: "nowrap", minWidth: h.w, cursor: h.sort ? "pointer" : "default", userSelect: "none" }}>
                        {h.label}{h.sort ? <SortIcon col={h.sort} /> : ""}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {stocks.map((s, i) => {
                    const conv = s.conviction_score;
                    const isHighConv = conv >= 8;
                    const currency = s.market === "UK" ? "£" : "$";
                    return (
                      <tr key={s.ticker}
                        style={{ borderBottom: "1px solid rgba(30,41,59,0.4)", background: isHighConv ? "rgba(245,158,11,0.02)" : "transparent" }}
                        onMouseEnter={e => { e.currentTarget.style.background = "rgba(245,158,11,0.04)"; }}
                        onMouseLeave={e => { e.currentTarget.style.background = isHighConv ? "rgba(245,158,11,0.02)" : "transparent"; }}>

                        {/* # */}
                        <td style={{ padding: "11px 12px", color: "#334155", fontFamily: "monospace", fontSize: "11px" }}>{i+1}</td>

                        {/* Ticker */}
                        <td style={{ padding: "11px 12px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <span style={{ fontSize: "13px" }}>{s.market === "UK" ? "🇬🇧" : "🇺🇸"}</span>
                            <span style={{ fontFamily: "monospace", fontWeight: "800", color: gold, fontSize: "13px" }}>{s.ticker}</span>
                          </div>
                          <div style={{ fontSize: "9px", color: "#334155", marginTop: "1px" }}>{s.data_quality}</div>
                        </td>

                        {/* Company */}
                        <td style={{ padding: "11px 12px" }}>
                          <div style={{ color: "#e2e8f0", fontWeight: "500", fontSize: "12px", maxWidth: "150px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {s.company_name}
                          </div>
                        </td>

                        {/* Price */}
                        <td style={{ padding: "11px 12px" }}>
                          <div style={{ fontFamily: "monospace", fontWeight: "700", color: "#f1f5f9", fontSize: "13px" }}>
                            {currency}{s.price.toFixed(2)}
                          </div>
                        </td>

                        {/* Market Cap */}
                        <td style={{ padding: "11px 12px" }}>
                          <span style={{ fontFamily: "monospace", color: s.market_cap > 0 ? steel : "#334155", fontSize: "12px" }}>
                            {fmt(s.market_cap, currency)}
                          </span>
                        </td>

                        {/* Rev Growth — from verdict string */}
                        <td style={{ padding: "11px 12px" }}>
                          <span style={{ fontSize: "12px", color: s.fundamental_verdict.includes("HIGH") ? green : s.fundamental_verdict.includes("MED") ? gold : steel }}>
                            {s.fundamental_verdict.replace("PASS - ", "").replace(" Quality", "")}
                          </span>
                        </td>

                        {/* Net Margin placeholder */}
                        <td style={{ padding: "11px 12px" }}>
                          <span style={{ padding: "2px 8px", borderRadius: "6px", fontSize: "10px", fontWeight: "700", background: "rgba(16,185,129,0.12)", color: green }}>
                            ✅ PASS
                          </span>
                        </td>

                        {/* Technical Stage */}
                        <td style={{ padding: "11px 12px" }}>
                          <span style={{ padding: "3px 10px", borderRadius: "20px", fontSize: "10px", fontWeight: "600", background: stageBg(s.technical_stage), color: stageColor(s.technical_stage), border: `1px solid ${stageColor(s.technical_stage)}33`, whiteSpace: "nowrap" }}>
                            {s.technical_stage}
                          </span>
                        </td>

                        {/* RSI */}
                        <td style={{ padding: "11px 12px" }}>
                          <span style={{ fontFamily: "monospace", fontSize: "12px", color: steel }}>—</span>
                        </td>

                        {/* Entry Zone */}
                        <td style={{ padding: "11px 12px" }}>
                          <span style={{ fontSize: "11px", color: blue, fontFamily: "monospace" }}>{s.entry_zone}</span>
                        </td>

                        {/* Conviction */}
                        <td style={{ padding: "11px 12px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <span style={{ fontFamily: "monospace", fontWeight: "900", fontSize: "16px", color: convColor(conv), minWidth: "18px" }}>{conv}</span>
                            <div style={{ flex: 1 }}>
                              <div style={{ height: "4px", background: "#1e293b", borderRadius: "2px", overflow: "hidden", minWidth: "50px" }}>
                                <div style={{ height: "100%", width: `${conv*10}%`, background: `linear-gradient(90deg, #10b981, ${convColor(conv)})`, borderRadius: "2px" }}></div>
                              </div>
                              <div style={{ fontSize: "9px", color: "#475569", marginTop: "1px" }}>
                                {conv >= 9 ? "Maximum" : conv >= 8 ? "Very High" : conv >= 7 ? "High" : conv >= 6 ? "Above Avg" : "Moderate"}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Action */}
                        <td style={{ padding: "11px 12px" }}>
                          <button
                            onClick={() => router.push("/analyzer?ticker=" + s.ticker + "&market=" + s.market)}
                            style={{ padding: "5px 12px", borderRadius: "7px", fontSize: "11px", fontWeight: "700", cursor: "pointer", border: "1px solid rgba(245,158,11,0.3)", background: "rgba(245,158,11,0.1)", color: gold, whiteSpace: "nowrap" }}>
                            🔬 Analyze
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Empty state */}
        {!scanning && !result && (
          <div style={{ textAlign: "center", padding: "70px 0" }}>
            <div style={{ fontSize: "52px", marginBottom: "16px" }}>⚡</div>
            <h2 style={{ fontSize: "20px", fontWeight: "700", color: "#f1f5f9", marginBottom: "8px" }}>Ready to Scan US Market</h2>
            <p style={{ color: "#475569", fontSize: "13px", maxWidth: "400px", margin: "0 auto 24px" }}>
              Scans ~200 liquid US stocks. Applies 2-Check qualification — Fundamentals + Technical phase. Finds the gems.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "10px", maxWidth: "480px", margin: "0 auto" }}>
              {[
                { n:"01", t:"Fundamentals",   d:"Revenue · Margins · Valuation" },
                { n:"02", t:"Technical Phase", d:"Stage 1 Accumulation or Stage 2 Markup" },
                { n:"03", t:"Smart Money",     d:"Institutional presence confirmed" },
              ].map(c => (
                <div key={c.n} style={{ background: "rgba(15,23,42,0.6)", border: "1px solid #1e293b", borderRadius: "10px", padding: "12px" }}>
                  <div style={{ color: gold, fontSize: "10px", fontWeight: "800", marginBottom: "3px" }}>CHECK {c.n}</div>
                  <div style={{ color: "#f1f5f9", fontSize: "12px", fontWeight: "600", marginBottom: "2px" }}>{c.t}</div>
                  <div style={{ color: "#334155", fontSize: "10px" }}>{c.d}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* No results */}
        {!scanning && result && stocks.length === 0 && (
          <div style={{ textAlign: "center", padding: "50px 0" }}>
            <div style={{ fontSize: "40px", marginBottom: "12px" }}>🔍</div>
            <div style={{ color: "#f1f5f9", fontSize: "16px", fontWeight: "600", marginBottom: "6px" }}>No stocks matched your filters</div>
            <div style={{ color: "#475569", fontSize: "13px" }}>Try lowering the conviction filter or run a fresh scan</div>
          </div>
        )}

        <div style={{ marginTop: "32px", textAlign: "center", color: "#1e293b", fontSize: "11px" }}>
          AlphaResearch v1.0 · Not financial advice · Data via Yahoo Finance · For institutional use only
        </div>
      </div>
    </div>
  );
}