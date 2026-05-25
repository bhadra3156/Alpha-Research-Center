"use client";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Navigation from "../../components/common/Navigation";
import { VerdictBadge, StageBadge, ConvictionMeter, DataQualityFlag } from "../../components/common/VerdictBadge";

interface AnalysisData {
  ticker: string;
  company_name: string;
  market: string;
  price: number;
  market_cap: number;
  conviction_score: number;
  verdict: string;
  narrative: string;
  check1: Record<string, unknown>;
  check2: Record<string, unknown>;
  check3: Record<string, unknown>;
  data_quality: string;
  generated_at: string;
}

function AnalyzerContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const ticker = searchParams.get("ticker") || "";
  const market = searchParams.get("market") || "US";

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<AnalysisData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [input, setInput] = useState(ticker);
  const [activeSection, setActiveSection] = useState(0);

  const gold = "#f59e0b";
  const green = "#10b981";
  const red = "#ef4444";
  const blue = "#60a5fa";
  const steel = "#94a3b8";

  const analyze = async (t: string, m: string) => {
    if (!t) return;
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const res = await fetch("http://localhost:8000/analyze/" + t.toUpperCase() + "?market=" + m);
      if (!res.ok) throw new Error("API error " + res.status);
      const json: AnalysisData = await res.json();
      setData(json);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Analysis failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (ticker) analyze(ticker, market);
  }, []);

  const fmt = (v: number) => {
    if (!v) return "N/A";
    if (v >= 1e12) return "$" + (v / 1e12).toFixed(2) + "T";
    if (v >= 1e9) return "$" + (v / 1e9).toFixed(2) + "B";
    if (v >= 1e6) return "$" + (v / 1e6).toFixed(1) + "M";
    return "$" + v.toFixed(2);
  };

  const verdictColor = data?.verdict === "ACCUMULATE" ? green : data?.verdict === "HOLD" ? gold : red;
  const verdictBg = data?.verdict === "ACCUMULATE" ? "rgba(16,185,129,0.15)" : data?.verdict === "HOLD" ? "rgba(245,158,11,0.15)" : "rgba(239,68,68,0.15)";
  const verdictBorder = data?.verdict === "ACCUMULATE" ? "rgba(16,185,129,0.3)" : data?.verdict === "HOLD" ? "rgba(245,158,11,0.3)" : "rgba(239,68,68,0.3)";

  const c1 = data?.check1 as Record<string, unknown> || {};
  const c2 = data?.check2 as Record<string, unknown> || {};
  const c3 = data?.check3 as Record<string, unknown> || {};
  const c1details = (c1.details as Record<string, unknown>) || {};
  const c3signals = (c3.signals as unknown[]) || [];

  const sections = [
    "Overview", "Fundamentals", "Technical", "Smart Money", "Narrative", "Trade Setup"
  ];

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #060820 0%, #0d1145 50%, #060820 100%)" }}>
      <Navigation />
      <div style={{ maxWidth: "1400px", margin: "0 auto", padding: "80px 24px 40px" }}>

        {/* Header + Search */}
        <div style={{ marginBottom: "28px", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "20px", flexWrap: "wrap" }}>
          <div>
            <h1 style={{ fontSize: "26px", fontWeight: "900", color: "#f1f5f9", marginBottom: "4px" }}>
              Deep <span style={{ color: gold }}>Analyzer</span>
            </h1>
            <p style={{ color: "#475569", fontSize: "13px" }}>Full institutional 3-Check analysis · AI-powered narrative</p>
          </div>
          {/* Search bar */}
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && analyze(input, market)}
              placeholder="Enter ticker e.g. NVDA"
              style={{ padding: "10px 16px", borderRadius: "10px", border: "1px solid #1e293b", background: "#0f172a", color: "#f1f5f9", fontSize: "14px", fontFamily: "monospace", fontWeight: "700", width: "180px", outline: "none" }}
            />
            <select
              value={market}
              onChange={(e) => router.push("/analyzer?ticker=" + input + "&market=" + e.target.value)}
              style={{ padding: "10px 12px", borderRadius: "10px", border: "1px solid #1e293b", background: "#0f172a", color: "#94a3b8", fontSize: "13px", outline: "none" }}>
              <option value="US">🇺🇸 US</option>
              <option value="UK">🇬🇧 UK</option>
            </select>
            <button
              onClick={() => analyze(input, market)}
              disabled={loading || !input}
              style={{ padding: "10px 24px", borderRadius: "10px", fontWeight: "800", fontSize: "14px", cursor: loading ? "not-allowed" : "pointer", border: "none", background: loading ? "rgba(245,158,11,0.3)" : "linear-gradient(135deg,#f59e0b,#d97706)", color: "#060820", boxShadow: loading ? "none" : "0 0 20px rgba(245,158,11,0.3)" }}>
              {loading ? "Analyzing..." : "🔬 Analyze"}
            </button>
            <button
              onClick={() => router.push("/dashboard")}
              style={{ padding: "10px 18px", borderRadius: "10px", fontSize: "13px", cursor: "pointer", border: "1px solid #1e293b", background: "transparent", color: steel }}>
              ← Back
            </button>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: "center", padding: "80px 0" }}>
            <div style={{ fontSize: "56px", marginBottom: "20px" }}>🔬</div>
            <div style={{ fontSize: "20px", fontWeight: "700", color: gold, marginBottom: "10px" }}>
              Analyzing {input}...
            </div>
            <div style={{ color: "#475569", fontSize: "13px", marginBottom: "24px" }}>
              Running 3-Check system · Fetching market data · Generating AI narrative
            </div>
            <div style={{ display: "flex", justifyContent: "center", gap: "8px", flexWrap: "wrap" }}>
              {["Fundamental Quality", "Technical Phase", "Smart Money", "AI Narrative"].map((s, i) => (
                <div key={s} style={{ padding: "7px 14px", borderRadius: "20px", fontSize: "12px", background: "rgba(245,158,11,0.1)", color: gold, border: "1px solid rgba(245,158,11,0.2)" }}>
                  {i === 0 ? "📊" : i === 1 ? "📈" : i === 2 ? "🐋" : "🤖"} {s}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "12px", padding: "16px 20px", color: red, fontSize: "13px", marginBottom: "20px" }}>
            Error: {error}
          </div>
        )}

        {/* Empty state */}
        {!loading && !data && !error && (
          <div style={{ textAlign: "center", padding: "80px 0" }}>
            <div style={{ fontSize: "56px", marginBottom: "18px" }}>🔬</div>
            <h2 style={{ fontSize: "20px", fontWeight: "700", color: "#f1f5f9", marginBottom: "8px" }}>Enter a Ticker to Analyze</h2>
            <p style={{ color: "#475569", fontSize: "13px", maxWidth: "360px", margin: "0 auto 28px" }}>
              Type any US or UK stock ticker above and hit Analyze to generate a full institutional report.
            </p>
            <div style={{ display: "flex", justifyContent: "center", gap: "8px", flexWrap: "wrap" }}>
              {["NVDA", "AMD", "MSFT", "GOOGL", "BA.L", "RR.L"].map((t) => (
                <button key={t} onClick={() => { setInput(t); analyze(t, t.endsWith(".L") ? "UK" : "US"); }}
                  style={{ padding: "8px 18px", borderRadius: "20px", fontSize: "13px", fontWeight: "700", cursor: "pointer", border: "1px solid rgba(245,158,11,0.25)", background: "rgba(245,158,11,0.08)", color: gold, fontFamily: "monospace" }}>
                  {t}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Full Report */}
        {data && !loading && (
          <div>
            {/* ── HERO SCORECARD ── */}
            <div style={{ background: "linear-gradient(145deg,#0f172a,#1e293b)", border: "1px solid #1e293b", borderRadius: "16px", padding: "24px 28px", marginBottom: "20px" }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "20px" }}>
                {/* Left: ticker info */}
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "6px" }}>
                    <span style={{ fontSize: "20px" }}>{data.market === "UK" ? "🇬🇧" : "🇺🇸"}</span>
                    <span style={{ fontFamily: "monospace", fontWeight: "900", color: gold, fontSize: "28px" }}>{data.ticker}</span>
                    <span style={{ padding: "4px 14px", borderRadius: "20px", fontSize: "13px", fontWeight: "700", background: verdictBg, color: verdictColor, border: "1px solid " + verdictBorder }}>
                      {data.verdict}
                    </span>
                  </div>
                  <div style={{ color: steel, fontSize: "14px", marginBottom: "8px" }}>{data.company_name}</div>
                  <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
                    <div>
                      <span style={{ fontFamily: "monospace", fontWeight: "800", color: "#f1f5f9", fontSize: "22px" }}>
                        {data.market === "UK" ? "£" : "$"}{data.price.toFixed(2)}
                      </span>
                    </div>
                    <div style={{ color: steel, fontSize: "13px", display: "flex", alignItems: "center" }}>
                      Mkt Cap: <span style={{ color: "#f1f5f9", fontWeight: "600", marginLeft: "6px" }}>{fmt(data.market_cap)}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <DataQualityFlag quality={data.data_quality} />
                    </div>
                  </div>
                </div>

                {/* Right: conviction + checks */}
                <div style={{ display: "flex", gap: "32px", alignItems: "center", flexWrap: "wrap" }}>
                  {/* 3 checks */}
                  <div style={{ display: "flex", gap: "12px" }}>
                    {[
                      { n: "1", label: "Fundamentals", pass: Boolean(c1.pass) },
                      { n: "2", label: "Technical", pass: Boolean(c2.pass) },
                      { n: "3", label: "Smart Money", pass: Boolean(c3.pass) },
                    ].map((c) => (
                      <div key={c.n} style={{ textAlign: "center" }}>
                        <div style={{ width: "44px", height: "44px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px", background: c.pass ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)", border: "2px solid " + (c.pass ? green : red), marginBottom: "4px" }}>
                          {c.pass ? "✅" : "❌"}
                        </div>
                        <div style={{ fontSize: "10px", color: steel, textAlign: "center" }}>CHECK {c.n}</div>
                        <div style={{ fontSize: "9px", color: "#334155" }}>{c.label}</div>
                      </div>
                    ))}
                  </div>
                  {/* Conviction */}
                  <div style={{ textAlign: "center", minWidth: "100px" }}>
                    <div style={{ fontSize: "42px", fontWeight: "900", fontFamily: "monospace", color: data.conviction_score >= 8 ? green : data.conviction_score >= 6 ? gold : red, lineHeight: 1 }}>
                      {data.conviction_score}
                    </div>
                    <div style={{ fontSize: "10px", color: steel, marginTop: "2px" }}>/ 10 CONVICTION</div>
                    <div style={{ marginTop: "6px", height: "4px", background: "#1e293b", borderRadius: "2px", overflow: "hidden" }}>
                      <div style={{ height: "100%", width: (data.conviction_score * 10) + "%", background: "linear-gradient(90deg,#10b981,#f59e0b)", transition: "width 1s" }}></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── SECTION TABS ── */}
            <div style={{ display: "flex", gap: "6px", marginBottom: "20px", flexWrap: "wrap" }}>
              {sections.map((s, i) => (
                <button key={s} onClick={() => setActiveSection(i)} style={{ padding: "8px 18px", borderRadius: "10px", fontSize: "13px", fontWeight: "600", cursor: "pointer", border: "1px solid", background: activeSection === i ? "rgba(245,158,11,0.15)" : "rgba(15,23,42,0.6)", color: activeSection === i ? gold : steel, borderColor: activeSection === i ? "rgba(245,158,11,0.35)" : "#1e293b", transition: "all 0.2s" }}>
                  {s}
                </button>
              ))}
            </div>

            {/* ── SECTION 0: OVERVIEW ── */}
            {activeSection === 0 && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                {/* Check summary cards */}
                {[
                  { title: "CHECK 1 — Fundamentals", pass: Boolean(c1.pass), icon: "📊", items: [
                    { label: "Quality Rating", value: String(c1.quality || "N/A") },
                    { label: "Score", value: String(c1.score || 0) + " / " + String(c1.max_score || 5) },
                    { label: "Verdict", value: c1.pass ? "PASS" : "FAIL" },
                  ]},
                  { title: "CHECK 2 — Technical Phase", pass: Boolean(c2.pass), icon: "📈", items: [
                    { label: "Stage", value: String(c2.stage || "N/A") },
                    { label: "RSI(14)", value: String(c2.rsi14 || "N/A") + " — " + String(c2.rsi_note || "") },
                    { label: "Golden Cross", value: c2.golden_cross ? "YES ✅" : "NO" },
                  ]},
                  { title: "CHECK 3 — Smart Money", pass: Boolean(c3.pass), icon: "🐋", items: [
                    { label: "Signals Found", value: String(c3.signal_count || 0) },
                    { label: "Primary Signal", value: String((c3.primary_signal as Record<string, unknown>)?.type || "None") },
                    { label: "Conviction", value: String(c3.conviction_score || "N/A") + " / 10" },
                  ]},
                  { title: "Overall Verdict", pass: data.conviction_score >= 6, icon: "🏆", items: [
                    { label: "Verdict", value: data.verdict },
                    { label: "Conviction Score", value: String(data.conviction_score) + " / 10" },
                    { label: "Data Quality", value: data.data_quality },
                  ]},
                ].map((card) => (
                  <div key={card.title} style={{ background: "linear-gradient(145deg,#0f172a,#1e293b)", border: "1px solid", borderColor: card.pass ? "rgba(16,185,129,0.2)" : "rgba(239,68,68,0.15)", borderRadius: "14px", padding: "20px 22px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px" }}>
                      <span style={{ fontSize: "20px" }}>{card.icon}</span>
                      <span style={{ fontWeight: "700", color: "#f1f5f9", fontSize: "13px" }}>{card.title}</span>
                      <span style={{ marginLeft: "auto", padding: "2px 10px", borderRadius: "12px", fontSize: "11px", fontWeight: "700", background: card.pass ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)", color: card.pass ? green : red, border: "1px solid " + (card.pass ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.3)") }}>
                        {card.pass ? "✅ PASS" : "❌ FAIL"}
                      </span>
                    </div>
                    {card.items.map((item) => (
                      <div key={item.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid rgba(30,41,59,0.5)" }}>
                        <span style={{ fontSize: "12px", color: steel }}>{item.label}</span>
                        <span style={{ fontSize: "12px", fontWeight: "600", color: "#f1f5f9", fontFamily: "monospace" }}>{item.value}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}

            {/* ── SECTION 1: FUNDAMENTALS ── */}
            {activeSection === 1 && (
              <div style={{ background: "linear-gradient(145deg,#0f172a,#1e293b)", border: "1px solid #1e293b", borderRadius: "14px", padding: "24px 26px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
                  <span style={{ fontSize: "22px" }}>📊</span>
                  <h2 style={{ fontSize: "17px", fontWeight: "800", color: "#f1f5f9" }}>Fundamental Analysis — Check 1</h2>
                  <span style={{ marginLeft: "auto" }}><VerdictBadge pass={Boolean(c1.pass)} label={c1.pass ? "PASS" : "FAIL"} /></span>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "20px" }}>
                  {[
                    { label: "Fundamental Quality", value: String(c1.quality || "N/A"), color: c1.quality === "HIGH" ? green : c1.quality === "MEDIUM" ? gold : red },
                    { label: "Score", value: String(c1.score || 0) + " / " + String(c1.max_score || 5), color: "#f1f5f9" },
                  ].map((m) => (
                    <div key={m.label} style={{ background: "rgba(15,23,42,0.6)", borderRadius: "10px", padding: "14px 16px", border: "1px solid #0f172a" }}>
                      <div style={{ fontSize: "10px", color: steel, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "4px" }}>{m.label}</div>
                      <div style={{ fontSize: "18px", fontWeight: "800", color: m.color, fontFamily: "monospace" }}>{m.value}</div>
                    </div>
                  ))}
                </div>

                <h3 style={{ fontSize: "13px", fontWeight: "700", color: steel, marginBottom: "12px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Sub-Check Results</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {Object.entries(c1details).map(([key, val]) => {
                    const v = val as Record<string, unknown>;
                    const passed = Boolean(v.pass);
                    return (
                      <div key={key} style={{ display: "flex", alignItems: "center", gap: "14px", padding: "12px 16px", background: "rgba(15,23,42,0.5)", borderRadius: "10px", border: "1px solid rgba(30,41,59,0.5)" }}>
                        <span style={{ fontSize: "16px" }}>{passed ? "✅" : "❌"}</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: "12px", fontWeight: "700", color: "#f1f5f9", textTransform: "capitalize" }}>{key.replace(/_/g, " ")}</div>
                          <div style={{ fontSize: "11px", color: steel, marginTop: "2px" }}>{String(v.note || "")}</div>
                        </div>
                        <span style={{ fontFamily: "monospace", fontSize: "12px", fontWeight: "700", color: passed ? green : red }}>{String(v.value || "N/A")}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── SECTION 2: TECHNICAL ── */}
            {activeSection === 2 && (
              <div style={{ background: "linear-gradient(145deg,#0f172a,#1e293b)", border: "1px solid #1e293b", borderRadius: "14px", padding: "24px 26px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
                  <span style={{ fontSize: "22px" }}>📈</span>
                  <h2 style={{ fontSize: "17px", fontWeight: "800", color: "#f1f5f9" }}>Technical Analysis — Check 2</h2>
                  <span style={{ marginLeft: "auto" }}><StageBadge stage={String(c2.stage || "Unknown")} /></span>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "12px", marginBottom: "24px" }}>
                  {[
                    { label: "Weinstein Stage", value: String(c2.stage || "N/A"), color: c2.pass ? green : red },
                    { label: "RSI (14)", value: String(c2.rsi14 || "N/A") + " — " + String(c2.rsi_note || ""), color: "#f1f5f9" },
                    { label: "Golden Cross", value: c2.golden_cross ? "YES ✅" : "NO ❌", color: c2.golden_cross ? green : red },
                    { label: "50-Day MA", value: "$" + Number(c2.ma50 || 0).toFixed(2), color: "#f1f5f9" },
                    { label: "200-Day MA", value: "$" + Number(c2.ma200 || 0).toFixed(2), color: "#f1f5f9" },
                    { label: "52W Range Position", value: String(c2.range_pct || 0) + "%", color: gold },
                    { label: "Above 50-Day MA", value: c2.above_50 ? "YES ✅" : "NO", color: c2.above_50 ? green : red },
                    { label: "Above 200-Day MA", value: c2.above_200 ? "YES ✅" : "NO", color: c2.above_200 ? green : red },
                    { label: "Entry Zone", value: String(c2.entry_zone || "N/A"), color: blue },
                  ].map((m) => (
                    <div key={m.label} style={{ background: "rgba(15,23,42,0.6)", borderRadius: "10px", padding: "14px 16px", border: "1px solid #0f172a" }}>
                      <div style={{ fontSize: "10px", color: steel, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "4px" }}>{m.label}</div>
                      <div style={{ fontSize: "14px", fontWeight: "700", color: m.color, fontFamily: "monospace" }}>{m.value}</div>
                    </div>
                  ))}
                </div>

                <div style={{ background: "rgba(15,23,42,0.5)", borderRadius: "10px", padding: "16px 18px", border: "1px solid rgba(30,41,59,0.5)" }}>
                  <h3 style={{ fontSize: "12px", fontWeight: "700", color: steel, marginBottom: "10px", textTransform: "uppercase" }}>Stan Weinstein Stage Analysis</h3>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "8px" }}>
                    {["Stage 1 Accumulation", "Stage 2 Markup", "Stage 3 Distribution", "Stage 4 Decline"].map((stage) => {
                      const active = String(c2.stage || "").includes(stage.split(" ")[1]);
                      return (
                        <div key={stage} style={{ padding: "10px 12px", borderRadius: "8px", textAlign: "center", background: active ? "rgba(245,158,11,0.15)" : "rgba(15,23,42,0.4)", border: "1px solid " + (active ? "rgba(245,158,11,0.4)" : "rgba(30,41,59,0.5)") }}>
                          <div style={{ fontSize: "11px", fontWeight: "700", color: active ? gold : "#334155" }}>{stage}</div>
                          {active && <div style={{ fontSize: "18px", marginTop: "4px" }}>👈 CURRENT</div>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* ── SECTION 3: SMART MONEY ── */}
            {activeSection === 3 && (
              <div style={{ background: "linear-gradient(145deg,#0f172a,#1e293b)", border: "1px solid #1e293b", borderRadius: "14px", padding: "24px 26px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
                  <span style={{ fontSize: "22px" }}>🐋</span>
                  <h2 style={{ fontSize: "17px", fontWeight: "800", color: "#f1f5f9" }}>Smart Money Confirmation — Check 3</h2>
                  <span style={{ marginLeft: "auto" }}><VerdictBadge pass={Boolean(c3.pass)} /></span>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "12px", marginBottom: "24px" }}>
                  {[
                    { label: "Signals Found", value: String(c3.signal_count || 0), color: Number(c3.signal_count) > 0 ? green : red },
                    { label: "Conviction Score", value: String(c3.conviction_score || "N/A") + " / 10", color: gold },
                    { label: "Primary Type", value: String((c3.primary_signal as Record<string,unknown>)?.type || "None"), color: "#f1f5f9" },
                  ].map((m) => (
                    <div key={m.label} style={{ background: "rgba(15,23,42,0.6)", borderRadius: "10px", padding: "14px 16px", border: "1px solid #0f172a" }}>
                      <div style={{ fontSize: "10px", color: steel, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "4px" }}>{m.label}</div>
                      <div style={{ fontSize: "16px", fontWeight: "800", color: m.color, fontFamily: "monospace" }}>{m.value}</div>
                    </div>
                  ))}
                </div>

                {c3signals.length > 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    <h3 style={{ fontSize: "12px", fontWeight: "700", color: steel, textTransform: "uppercase", letterSpacing: "0.06em" }}>Detected Signals</h3>
                    {c3signals.map((sig, i) => {
                      const s = sig as Record<string, unknown>;
                      return (
                        <div key={i} style={{ padding: "14px 16px", background: "rgba(245,158,11,0.05)", border: "1px solid rgba(245,158,11,0.15)", borderRadius: "10px", display: "flex", gap: "14px", alignItems: "flex-start" }}>
                          <span style={{ fontSize: "20px" }}>🐋</span>
                          <div>
                            <div style={{ fontSize: "13px", fontWeight: "700", color: gold, marginBottom: "3px" }}>{String(s.type || "")}</div>
                            <div style={{ fontSize: "12px", color: steel }}>{String(s.detail || "")}</div>
                            <div style={{ fontSize: "11px", color: "#334155", marginTop: "3px" }}>Source: {String(s.source || "")}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ padding: "20px", background: "rgba(15,23,42,0.5)", borderRadius: "10px", border: "1px solid #0f172a", textAlign: "center" }}>
                    <div style={{ fontSize: "32px", marginBottom: "10px" }}>📋</div>
                    <div style={{ fontSize: "13px", color: steel, marginBottom: "6px" }}>No specific signals detected in this scan</div>
                    <div style={{ fontSize: "12px", color: "#334155" }}>Connect SEC EDGAR API and Quiverquant for full 13F, Form 4, and STOCK Act data</div>
                  </div>
                )}

                <div style={{ marginTop: "20px", padding: "16px 18px", background: "rgba(15,23,42,0.5)", borderRadius: "10px", border: "1px solid rgba(30,41,59,0.5)" }}>
                  <h3 style={{ fontSize: "12px", fontWeight: "700", color: steel, marginBottom: "12px", textTransform: "uppercase" }}>Smart Money Signal Types</h3>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "8px" }}>
                    {[
                      { type: "13F Institutional", desc: "Hedge fund quarterly filings", icon: "🏦" },
                      { type: "Form 4 Insider", desc: "Executive open-market buys", icon: "👔" },
                      { type: "STOCK Act", desc: "Politician trade disclosures", icon: "🏛️" },
                    ].map((t) => (
                      <div key={t.type} style={{ padding: "12px", background: "rgba(15,23,42,0.4)", borderRadius: "8px", border: "1px solid rgba(30,41,59,0.5)" }}>
                        <div style={{ fontSize: "18px", marginBottom: "6px" }}>{t.icon}</div>
                        <div style={{ fontSize: "12px", fontWeight: "700", color: "#f1f5f9", marginBottom: "3px" }}>{t.type}</div>
                        <div style={{ fontSize: "11px", color: "#334155" }}>{t.desc}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── SECTION 4: NARRATIVE ── */}
            {activeSection === 4 && (
              <div style={{ background: "linear-gradient(145deg,#0f172a,#1e293b)", border: "1px solid #1e293b", borderRadius: "14px", padding: "24px 26px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
                  <span style={{ fontSize: "22px" }}>🤖</span>
                  <h2 style={{ fontSize: "17px", fontWeight: "800", color: "#f1f5f9" }}>AI Institutional Narrative</h2>
                  <span style={{ marginLeft: "auto", padding: "3px 10px", borderRadius: "10px", fontSize: "11px", color: gold, background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)" }}>
                    Claude Sonnet
                  </span>
                </div>
                <div style={{ background: "rgba(15,23,42,0.6)", borderRadius: "12px", padding: "20px 22px", border: "1px solid rgba(30,41,59,0.5)", lineHeight: "1.7", color: "#cbd5e1", fontSize: "14px", whiteSpace: "pre-wrap" }}>
                  {data.narrative}
                </div>
                <div style={{ marginTop: "12px", fontSize: "11px", color: "#334155" }}>
                  Generated: {new Date(data.generated_at).toLocaleString()} · Model: Claude Sonnet · Not financial advice
                </div>
              </div>
            )}

            {/* ── SECTION 5: TRADE SETUP ── */}
            {activeSection === 5 && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                {/* Entry / Exit levels */}
                <div style={{ background: "linear-gradient(145deg,#0f172a,#1e293b)", border: "1px solid #1e293b", borderRadius: "14px", padding: "22px 24px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "18px" }}>
                    <span style={{ fontSize: "20px" }}>🎯</span>
                    <h2 style={{ fontSize: "15px", fontWeight: "800", color: "#f1f5f9" }}>Trade Setup</h2>
                  </div>
                  {[
                    { label: "Current Price", value: (data.market === "UK" ? "£" : "$") + data.price.toFixed(2), color: "#f1f5f9", icon: "💰" },
                    { label: "Entry Zone", value: String(c2.entry_zone || "N/A"), color: green, icon: "✅" },
                    { label: "Stop Level", value: (data.market === "UK" ? "£" : "$") + (data.price * 0.92).toFixed(2) + " (−8%)", color: red, icon: "🛑" },
                    { label: "Target (Stage 2)", value: (data.market === "UK" ? "£" : "$") + (data.price * 1.25).toFixed(2) + " (+25%)", color: gold, icon: "🎯" },
                    { label: "52W High", value: "$" + Number(c2.week52_high || 0).toFixed(2), color: steel, icon: "📈" },
                    { label: "52W Low", value: "$" + Number(c2.week52_low || 0).toFixed(2), color: steel, icon: "📉" },
                  ].map((r) => (
                    <div key={r.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid rgba(30,41,59,0.4)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ fontSize: "14px" }}>{r.icon}</span>
                        <span style={{ fontSize: "12px", color: steel }}>{r.label}</span>
                      </div>
                      <span style={{ fontFamily: "monospace", fontWeight: "700", color: r.color, fontSize: "13px" }}>{r.value}</span>
                    </div>
                  ))}
                </div>

                {/* Risk framework */}
                <div style={{ background: "linear-gradient(145deg,#0f172a,#1e293b)", border: "1px solid #1e293b", borderRadius: "14px", padding: "22px 24px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "18px" }}>
                    <span style={{ fontSize: "20px" }}>⚠️</span>
                    <h2 style={{ fontSize: "15px", fontWeight: "800", color: "#f1f5f9" }}>Risk Framework</h2>
                  </div>
                  {[
                    { risk: "Technical invalidation", detail: "Close below 200-day MA", severity: "HIGH" },
                    { risk: "Earnings miss", detail: "Revenue deceleration vs guidance", severity: "HIGH" },
                    { risk: "Smart money exit", detail: "13F showing institutional reduction", severity: "MEDIUM" },
                    { risk: "Macro sensitivity", detail: "Rate environment and sector rotation", severity: "MEDIUM" },
                    { risk: "Liquidity risk", detail: "Average daily volume constraints", severity: "LOW" },
                  ].map((r) => (
                    <div key={r.risk} style={{ display: "flex", gap: "12px", alignItems: "flex-start", padding: "10px 0", borderBottom: "1px solid rgba(30,41,59,0.4)" }}>
                      <span style={{ padding: "2px 8px", borderRadius: "6px", fontSize: "10px", fontWeight: "700", flexShrink: 0, marginTop: "1px", background: r.severity === "HIGH" ? "rgba(239,68,68,0.15)" : r.severity === "MEDIUM" ? "rgba(245,158,11,0.15)" : "rgba(100,116,139,0.15)", color: r.severity === "HIGH" ? red : r.severity === "MEDIUM" ? gold : steel }}>
                        {r.severity}
                      </span>
                      <div>
                        <div style={{ fontSize: "12px", fontWeight: "600", color: "#f1f5f9" }}>{r.risk}</div>
                        <div style={{ fontSize: "11px", color: "#475569", marginTop: "2px" }}>{r.detail}</div>
                      </div>
                    </div>
                  ))}

                  <div style={{ marginTop: "16px", padding: "14px", background: "rgba(15,23,42,0.6)", borderRadius: "10px", border: "1px solid rgba(30,41,59,0.5)" }}>
                    <div style={{ fontSize: "11px", fontWeight: "700", color: steel, marginBottom: "6px", textTransform: "uppercase" }}>Position Sizing Guidance</div>
                    <div style={{ fontSize: "12px", color: "#475569", lineHeight: "1.6" }}>
                      Conviction {data.conviction_score}/10 → suggested position size:{" "}
                      <span style={{ color: gold, fontWeight: "700" }}>
                        {data.conviction_score >= 9 ? "4-5%" : data.conviction_score >= 7 ? "2-3%" : "1-2%"} of portfolio
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Generated timestamp */}
            <div style={{ marginTop: "24px", textAlign: "center", color: "#1e293b", fontSize: "11px" }}>
              AlphaResearch v1.0 · Analysis generated {new Date(data.generated_at).toLocaleString()} · Not financial advice
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AnalyzerPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: "100vh", background: "#060820", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: "#f59e0b", fontSize: "18px" }}>Loading Analyzer...</div>
      </div>
    }>
      <AnalyzerContent />
    </Suspense>
  );
}