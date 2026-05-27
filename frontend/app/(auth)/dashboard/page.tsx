New-Item -Path "frontend/app/dashboard/page.tsx" -ItemType File -Force
Set-Content -Path "frontend/app/dashboard/page.tsx" -Value @'
"use client";

import { useState } from "react";
import Link from "next/link";

// ─── Types ───────────────────────────────────────────────────────────────────
interface QualifyingStock {
  ticker: string;
  market: "US" | "UK";
  company: string;
  price: string;
  fundVerdict: "PASS" | "FAIL";
  techPhase: "Stage 1" | "Stage 2";
  smartMoney: string;
  conviction: number;
  theme?: string;
}

// ─── Mock seed data (replace with live API) ──────────────────────────────────
const MOCK_STOCKS: QualifyingStock[] = [
  { ticker:"AMD",  market:"US", company:"Advanced Micro Devices",   price:"$467.51",  fundVerdict:"PASS", techPhase:"Stage 2", smartMoney:"13F",          conviction:8, theme:"AI Infra"   },
  { ticker:"NVDA", market:"US", company:"NVIDIA Corporation",        price:"$1,089.20",fundVerdict:"PASS", techPhase:"Stage 2", smartMoney:"13F + Insider", conviction:9, theme:"AI Infra"   },
  { ticker:"CRDO", market:"US", company:"Credo Technology Group",    price:"$58.44",   fundVerdict:"PASS", techPhase:"Stage 1", smartMoney:"13F",          conviction:7, theme:"AI Infra"   },
  { ticker:"CEG",  market:"US", company:"Constellation Energy",      price:"$248.77",  fundVerdict:"PASS", techPhase:"Stage 2", smartMoney:"13F + Politician", conviction:8, theme:"Energy"  },
  { ticker:"BA.",  market:"UK", company:"BAE Systems plc",           price:"1,342p",   fundVerdict:"PASS", techPhase:"Stage 2", smartMoney:"Director Buy",  conviction:8, theme:"Defence"   },
  { ticker:"RR.",  market:"UK", company:"Rolls-Royce Holdings plc",  price:"612p",     fundVerdict:"PASS", techPhase:"Stage 2", smartMoney:"Director Buy",  conviction:7, theme:"Defence"   },
  { ticker:"MRVL", market:"US", company:"Marvell Technology",        price:"$89.14",   fundVerdict:"PASS", techPhase:"Stage 2", smartMoney:"13F",           conviction:7, theme:"AI Infra"  },
];

const THEMES = ["All", "AI Infra", "Defence", "Energy", "Healthcare", "Financials"];
const MARKETS = ["Both", "US", "UK"];
const CONVICTION_FILTERS = ["All", "High (8–10)", "Medium (5–7)"];

// ─── Sub-components ───────────────────────────────────────────────────────────

function MetricCard({ label, value, sub, accent }: {
  label: string; value: string | number; sub: string; accent?: string;
}) {
  return (
    <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-5">
      <p className="metric-label mb-2">{label}</p>
      <p className={`metric-number ${accent ?? ""}`}>{value}</p>
      <p className="text-[11px] text-[#52525b] mt-1">{sub}</p>
    </div>
  );
}

function FilterGroup({ options, active, onChange }: {
  options: string[]; active: string; onChange: (v: string) => void;
}) {
  return (
    <div className="flex gap-0.5 bg-[#27272a]/50 p-1 rounded-lg border border-[#27272a]">
      {options.map((opt) => (
        <button
          key={opt}
          onClick={() => onChange(opt)}
          className={[
            "text-[11px] px-3 py-1.5 rounded-md font-medium transition-all duration-100",
            opt === active
              ? "bg-[#27272a] text-[#fafafa] shadow-sm"
              : "text-[#a1a1aa] hover:text-[#fafafa]",
          ].join(" ")}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

function ChecksPanel() {
  const checks = [
    {
      num: "1", label: "Fundamentals", status: "pass",
      desc: "FCF margin >10% · Revenue CAGR · ROIC vs WACC · PEG <1.5",
    },
    {
      num: "2", label: "Technical Phase", status: "pass",
      desc: "Weinstein Stage 1 or 2 · Golden Cross · Volume on up-days",
    },
    {
      num: "3", label: "Smart Money", status: "warn",
      desc: "13F institutional buy · STOCK Act politician · Form 4 P-buy",
    },
  ];

  return (
    <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-6 flex flex-col gap-0">
      <p className="text-[10px] font-semibold text-[#52525b] uppercase tracking-widest mb-4">
        3-Check System
      </p>

      {checks.map((c) => (
        <div key={c.num} className="flex items-start gap-3 py-3 border-b border-[#27272a] last:border-none">
          <div className={[
            "w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-bold flex-shrink-0 mt-0.5",
            c.status === "pass"
              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
              : "bg-amber-500/10 text-amber-400 border border-amber-500/20",
          ].join(" ")}>
            {c.status === "pass" ? "✓" : "!"}
          </div>
          <div>
            <p className="text-[12px] font-semibold text-[#fafafa]">Check {c.num} — {c.label}</p>
            <p className="text-[11px] text-[#71717a] mt-0.5 leading-relaxed">{c.desc}</p>
          </div>
        </div>
      ))}

      <div className="mt-4 p-3 bg-[#09090b] rounded-lg border border-[#27272a]">
        <p className="text-[10px] font-semibold text-[#52525b] uppercase tracking-widest mb-1">
          Qualification Rule
        </p>
        <p className="text-[11px] text-[#a1a1aa] leading-relaxed">
          All 3 checks must pass. A 2-of-3 is{" "}
          <span className="text-red-400 font-semibold">rejected</span>. No exceptions.
        </p>
      </div>
    </div>
  );
}

function ResultsTable({
  stocks, isScanning, hasScanned,
}: {
  stocks: QualifyingStock[]; isScanning: boolean; hasScanned: boolean;
}) {
  const colHeaders = ["Ticker", "Company", "Price", "Fundamental", "Tech Phase", "Smart Money", "Score", ""];

  if (!hasScanned && !isScanning) {
    return (
      <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-6 flex flex-col items-center justify-center min-h-[280px] gap-4 text-center">
        <div className="w-12 h-12 bg-[#27272a] rounded-xl flex items-center justify-center text-xl">⚡</div>
        <div>
          <p className="text-[14px] font-semibold text-[#fafafa]">Ready to scan</p>
          <p className="text-[12px] text-[#52525b] mt-1 max-w-[240px] leading-relaxed">
            Press RUN SCAN to execute the 3-Check pipeline across your full watchlist
          </p>
        </div>
        <div className="flex gap-4 text-[11px] text-[#52525b]">
          <span>50 US stocks</span>
          <span>·</span>
          <span>20 UK stocks</span>
        </div>
      </div>
    );
  }

  if (isScanning) {
    return (
      <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-6 flex flex-col items-center justify-center min-h-[280px] gap-3">
        <div className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="w-2 h-2 bg-[#fafafa] rounded-full animate-bounce"
              style={{ animationDelay: `${i * 0.12}s` }}
            />
          ))}
        </div>
        <p className="text-[13px] font-medium text-[#fafafa]">Running 3-Check pipeline…</p>
        <p className="text-[11px] text-[#52525b]">Fetching fundamentals · Checking technicals · Verifying smart money</p>
      </div>
    );
  }

  return (
    <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-5">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              {colHeaders.map((h) => (
                <th key={h} className="text-left text-[10px] font-semibold text-[#52525b] uppercase tracking-widest pb-3 pr-4">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#27272a]">
            {stocks.map((s) => (
              <tr key={s.ticker} className="group hover:bg-[#1c1c1f] transition-colors">
                <td className="py-3 pr-4">
                  <div className="flex items-center gap-2">
                    <span>{s.market === "US" ? "🇺🇸" : "🇬🇧"}</span>
                    <span className="text-[13px] font-bold text-[#fafafa] tracking-wide">{s.ticker}</span>
                  </div>
                </td>
                <td className="py-3 pr-4 text-[12px] text-[#a1a1aa] whitespace-nowrap">{s.company}</td>
                <td className="py-3 pr-4 text-[13px] font-semibold text-[#fafafa] tabular-nums">{s.price}</td>
                <td className="py-3 pr-4">
                  <span className="badge-pass">{s.fundVerdict} ✅</span>
                </td>
                <td className="py-3 pr-4">
                  <span className="badge-stage">{s.techPhase}</span>
                </td>
                <td className="py-3 pr-4">
                  <span className="badge-smart">{s.smartMoney}</span>
                </td>
                <td className="py-3 pr-4">
                  <span className="text-[13px] font-bold text-[#fafafa] tabular-nums">
                    {s.conviction}<span className="text-[11px] font-normal text-[#52525b]">/10</span>
                  </span>
                </td>
                <td className="py-3">
                  <Link
                    href={`/analyzer/${s.ticker}`}
                    className="text-[10px] font-semibold px-3 py-1.5 rounded-lg bg-transparent border border-[#27272a] text-[#a1a1aa] hover:border-[#fafafa] hover:text-[#fafafa] transition-all no-underline whitespace-nowrap"
                  >
                    Deep Analyze →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-5 mt-4 pt-4 border-t border-[#27272a]">
        {[
          { dot: "bg-[#52525b]", text: `Showing ${stocks.length} qualifying stocks` },
          { dot: "bg-[#52525b]", text: "Last scan: 06:02 UTC" },
          { dot: "bg-emerald-400", text: "Data quality: HIGH" },
        ].map((s, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <div className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
            <span className="text-[10px] text-[#52525b]">{s.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [market, setMarket] = useState("Both");
  const [theme, setTheme] = useState("All");
  const [conviction, setConviction] = useState("All");
  const [isScanning, setIsScanning] = useState(false);
  const [hasScanned, setHasScanned] = useState(false);

  const handleScan = () => {
    setIsScanning(true);
    setHasScanned(false);
    setTimeout(() => {
      setIsScanning(false);
      setHasScanned(true);
    }, 2200);
  };

  const filteredStocks = MOCK_STOCKS.filter((s) => {
    if (market === "US" && s.market !== "US") return false;
    if (market === "UK" && s.market !== "UK") return false;
    if (theme !== "All" && s.theme !== theme) return false;
    if (conviction === "High (8–10)" && s.conviction < 8) return false;
    if (conviction === "Medium (5–7)" && (s.conviction < 5 || s.conviction > 7)) return false;
    return true;
  });

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[18px] font-bold tracking-tight text-[#fafafa]">Equity Intelligence</h1>
          <p className="text-[11px] text-[#52525b] mt-0.5 uppercase tracking-widest">
            3-Check Institutional Scan · US + UK Markets
          </p>
        </div>
        <button
          onClick={handleScan}
          disabled={isScanning}
          className="bg-[#fafafa] hover:bg-[#e4e4e7] disabled:opacity-50 text-[#18181b] font-semibold text-[12px] px-4 py-2 rounded-lg transition-colors flex items-center gap-2 tracking-wide"
        >
          <span>⚡</span> RUN SCAN
        </button>
      </div>

      {/* Metrics row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard label="Scanned"        value="70"  sub="50 US · 20 UK" />
        <MetricCard label="Qualifying"     value="17"  sub="Pass all 3 checks"   accent="text-emerald-400" />
        <MetricCard label="High Conviction" value="6"  sub="Score 8–10 / 10"     accent="text-amber-400"  />
        <MetricCard label="Last Scan"       value="06:02" sub="UTC · Auto scan active" />
      </div>

      {/* Main content: checks panel + results */}
      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-4">
        <ChecksPanel />

        <div className="space-y-3">
          {/* Filter bar */}
          <div className="flex flex-wrap items-center gap-2">
            <FilterGroup options={MARKETS}            active={market}     onChange={setMarket}     />
            <FilterGroup options={THEMES}             active={theme}      onChange={setTheme}      />
            <FilterGroup options={CONVICTION_FILTERS} active={conviction} onChange={setConviction} />
          </div>
          <ResultsTable stocks={filteredStocks} isScanning={isScanning} hasScanned={hasScanned} />
        </div>
      </div>
    </div>
  );
}
'@