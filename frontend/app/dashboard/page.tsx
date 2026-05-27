"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";

interface Stock {
  ticker: string; company_name: string; market: string;
  price: number; market_cap: number; change_pct: number;
  check1_pass: boolean; check2_pass: boolean; check3_pass: boolean;
  fundamental_verdict: string; technical_stage: string;
  smart_money_trigger: string; conviction_score: number;
  data_quality: string; entry_zone: string;
  rsi14: number; ma50: number; ma200: number;
  golden_cross: boolean; week52_high: number; week52_low: number;
  range_pct: number; revenue_growth: number; net_margin: number;
  pe_ratio: number; sector: string;
}
interface ScanResult {
  scan_id: string; scan_date: string; market: string;
  stocks_scanned: number; qualifying_count: number;
  qualifying_stocks: Stock[]; scan_duration_ms: number;
}

const BACKEND = "https://alpha-research-center-backend.onrender.com";

function addToWatchlist(s: Stock) {
  try {
    const existing = JSON.parse(localStorage.getItem("alpha_watchlist_v3") || "[]");
    if (existing.find((i: any) => i.ticker === s.ticker)) { alert(s.ticker + " already in watchlist"); return; }
    const item = { id: Date.now().toString(), ticker: s.ticker, market: s.market || "US", sector: s.sector || "", theme: "", added: new Date().toISOString().split("T")[0], notes: `${s.technical_stage} | Conv:${s.conviction_score}/10 | Entry:${s.entry_zone}`, score: s.conviction_score, c1_pass: s.check1_pass, c2_pass: s.check2_pass, stage: s.technical_stage, rsi: s.rsi14 || 0, entry_zone: s.entry_zone || "", graduated: false };
    localStorage.setItem("alpha_watchlist_v3", JSON.stringify([...existing, item]));
    alert("✅ " + s.ticker + " added to watchlist!");
  } catch(e) { alert("Failed"); }
}

function Navbar({ active }: { active: string }) {
  const links = [["dashboard","Dashboard"],["analyzer","Analyzer"],["watchlist","Watchlist"],["portfolio","Portfolio"],["journal","Journal"]];
  return (
    <nav className="bg-[#18181b]/80 backdrop-blur-md border-b border-[#27272a] sticky top-0 z-50 px-6 h-14 flex items-center justify-between">
      <span className="text-[#fafafa] font-bold tracking-tight text-sm uppercase">AlphaResearch</span>
      <div className="flex items-center gap-6">
        {links.map(([href,label]) => (
          <a key={href} href={"/"+href} className={active===href ? "text-[#fafafa] font-medium text-sm border-b-2 border-[#fafafa] h-14 flex items-center px-1" : "text-[#a1a1aa] hover:text-[#fafafa] font-medium text-sm transition-colors h-14 flex items-center px-1"}>
            {label}
          </a>
        ))}
      </div>
      <div className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-0.5 rounded-full text-[11px] font-medium flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"/>LIVE
      </div>
    </nav>
  );
}

function KpiCard({ label, value, sub, color }: { label: string; value: string; sub: string; color?: string }) {
  return (
    <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-5 shadow-sm space-y-1.5">
      <p className="text-xs font-semibold text-[#a1a1aa] uppercase tracking-wider">{label}</p>
      <p className={`text-2xl font-bold tracking-tight font-mono ${color||"text-[#fafafa]"}`}>{value}</p>
      <p className="text-xs text-[#52525b]">{sub}</p>
    </div>
  );
}

function ConvBar({ score }: { score: number }) {
  return (
    <div className="flex space-x-0.5 h-1.5 w-16 bg-slate-800 rounded-sm overflow-hidden">
      {Array.from({length:10},(_,i) => {
        const lit = i < score;
        const col = score>=9?"bg-emerald-500":score>=7?"bg-amber-500":score>=5?"bg-blue-500":"bg-rose-500";
        return <div key={i} className={`flex-1 ${lit?col:"bg-slate-700"}`}/>;
      })}
    </div>
  );
}

function CopyBtn({ text }: { text: string }) {
  const [c,setC] = React.useState(false);
  const copy = () => { navigator.clipboard.writeText(text).then(()=>{setC(true);setTimeout(()=>setC(false),2500);}); };
  return (
    <button onClick={copy} className={`text-[11px] px-2.5 py-1 rounded border transition-colors ${c?"bg-emerald-500/10 text-emerald-400 border-emerald-500/20":"bg-[#27272a] text-[#a1a1aa] border-[#3f3f46] hover:text-[#fafafa]"}`}>
      {c?"✓ Copied":"⧉ Copy"}
    </button>
  );
}

export default function Dashboard() {
  const router = useRouter();
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<ScanResult|null>(null);
  const [error, setError] = useState<string|null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [sortBy, setSortBy] = useState("conviction");
  const [sortDir, setSortDir] = useState<"desc"|"asc">("desc");
  const [stageFilter, setStageFilter] = useState("ALL");
  const [convFilter, setConvFilter] = useState(0);

  const runScan = async () => {
    setScanning(true); setError(null);
    const start = Date.now();
    const timer = setInterval(()=>setElapsed(Math.floor((Date.now()-start)/1000)),1000);
    try {
      const res = await fetch(`${BACKEND}/scan/`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({market:"US",notify_telegram:false})});
      if (!res.ok) throw new Error("Backend error "+res.status);
      setResult(await res.json());
    } catch(e:any) { setError(e.message||"Scan failed — backend may be waking up (50s)"); }
    finally { clearInterval(timer); setElapsed(0); setScanning(false); }
  };

  const handleSort = (col: string) => { if(sortBy===col) setSortDir(d=>d==="desc"?"asc":"desc"); else{setSortBy(col);setSortDir("desc");} };

  const stocks = (result?.qualifying_stocks||[])
    .filter(s=>convFilter===0||s.conviction_score>=convFilter)
    .filter(s=>stageFilter==="ALL"||s.technical_stage.includes(stageFilter))
    .sort((a,b)=>{
      const v=(s:Stock)=>sortBy==="conviction"?s.conviction_score:sortBy==="price"?s.price:sortBy==="rsi"?s.rsi14:s.conviction_score;
      return sortDir==="desc"?v(b)-v(a):v(a)-v(b);
    });

  const fmtMkt = (v:number) => { if(!v)return"—"; if(v>=1e12)return`$${(v/1e12).toFixed(1)}T`; if(v>=1e9)return`$${(v/1e9).toFixed(0)}B`; return`$${(v/1e6).toFixed(0)}M`; };
  const stage2 = stocks.filter(s=>s.technical_stage.includes("Stage 2")).length;
  const highConv = stocks.filter(s=>s.conviction_score>=8).length;
  const avgConv = stocks.length?(stocks.reduce((s,x)=>s+x.conviction_score,0)/stocks.length).toFixed(1):"—";
  const copyText = stocks.map(s=>`${s.ticker} $${s.price.toFixed(2)} | ${s.technical_stage} | Conv:${s.conviction_score}/10 | Entry:${s.entry_zone} | RSI:${s.rsi14}`).join("\n");

  const SA = ({col}:{col:string}) => <span className={`ml-1 text-[10px] ${sortBy===col?"text-amber-400":"text-[#3f3f46]"}`}>{sortBy===col?(sortDir==="desc"?"▼":"▲"):"⇅"}</span>;

  return (
    <div className="min-h-screen bg-[#09090b] text-[#fafafa] font-sans antialiased">
      <Navbar active="dashboard"/>
      <main className="max-w-[1600px] mx-auto p-4 md:p-6 space-y-6">

        {/* KPI STRIP */}
        {result && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <KpiCard label="Universe" value={String(result.stocks_scanned)} sub="stocks scanned"/>
            <KpiCard label="Qualifying" value={String(result.qualifying_count)} sub="pass all checks" color="text-emerald-400"/>
            <KpiCard label="Stage 2" value={String(stage2)} sub="markup phase" color="text-amber-400"/>
            <KpiCard label="High Conv" value={String(highConv)} sub="score 8–10" color="text-blue-400"/>
            <KpiCard label="Avg Conv" value={avgConv+"/10"} sub="conviction" color="text-violet-400"/>
            <KpiCard label="Scan Time" value={`${(result.scan_duration_ms/1000).toFixed(1)}s`} sub="async parallel"/>
          </div>
        )}

        {/* CONTROL BAR */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex gap-1">
            {[["ALL","All"],["Stage 2","STG2"],["Stage 1","STG1"]].map(([v,l])=>(
              <button key={v} onClick={()=>setStageFilter(v)} className={`px-3 py-1.5 text-xs font-medium rounded border transition-colors ${stageFilter===v?"bg-emerald-500/10 text-emerald-400 border-emerald-500/30":"bg-[#18181b] text-[#a1a1aa] border-[#27272a] hover:text-[#fafafa]"}`}>{l}</button>
            ))}
          </div>
          <div className="w-px h-5 bg-[#27272a]"/>
          <div className="flex gap-1">
            {[[0,"All"],[9,"9-10"],[8,"8+"],[7,"7+"]].map(([v,l])=>(
              <button key={String(v)} onClick={()=>setConvFilter(Number(v))} className={`px-3 py-1.5 text-xs font-medium rounded border transition-colors ${convFilter===v?"bg-amber-500/10 text-amber-400 border-amber-500/30":"bg-[#18181b] text-[#a1a1aa] border-[#27272a] hover:text-[#fafafa]"}`}>{l}</button>
            ))}
          </div>
          {result&&<span className="text-xs text-[#52525b] ml-1">{stocks.length} results</span>}
          <div className="flex-1"/>
          {result&&<CopyBtn text={copyText}/>}
          {result&&<span className="text-xs text-[#52525b]">{new Date(result.scan_date).toLocaleTimeString()}</span>}
          <button onClick={runScan} disabled={scanning} className={`px-5 py-2 text-xs font-bold rounded transition-all ${scanning?"bg-amber-500/10 text-amber-400 border border-amber-500/20 cursor-not-allowed":"bg-amber-500 hover:bg-amber-400 text-black shadow-lg shadow-amber-500/20"}`}>
            {scanning?`⚡ Scanning ${elapsed}s...`:"⚡  Run Scan"}
          </button>
        </div>

        {error&&<div className="bg-rose-950/40 border border-rose-800/40 text-rose-400 text-xs px-4 py-3 rounded-lg">⚠ {error}</div>}

        {/* SCANNING STATE */}
        {scanning&&(
          <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-12 text-center space-y-3">
            <p className="text-amber-400 text-sm font-semibold tracking-wider">⚡ SCANNING US MARKET</p>
            <p className="text-4xl font-bold font-mono text-emerald-400">{elapsed}s</p>
            <p className="text-xs text-[#52525b] tracking-wider">~200 LIQUID US EQUITIES · ASYNC PARALLEL · 2-CHECK QUALIFICATION</p>
            <div className="flex justify-center gap-3 mt-4">
              {["C1: Fundamentals","C2: Technical Phase","C3: Smart Money"].map(c=>(
                <span key={c} className="bg-[#27272a] text-[#a1a1aa] text-[10px] px-3 py-1 rounded-full border border-[#3f3f46]">{c}</span>
              ))}
            </div>
          </div>
        )}

        {/* RESULTS TABLE */}
        {!scanning&&stocks.length>0&&(
          <div className="w-full overflow-hidden rounded-lg border border-[#1E2530] bg-[#0C0F16]">
            {/* Table header bar */}
            <div className="flex items-center gap-3 px-4 py-3 bg-[#0A0D14] border-b border-[#1E2530]">
              <span className="text-xs font-semibold text-[#fafafa] uppercase tracking-wider">Qualifying Gems</span>
              <span className="bg-emerald-950/80 text-emerald-400 border border-emerald-800/40 text-[10px] font-bold px-2 py-0.5 rounded tracking-wide">{stocks.length} PASS</span>
              {result&&<span className="text-[10px] text-[#3f3f46] ml-auto">Data: Yahoo Finance v8 · {new Date(result.scan_date).toLocaleString()} · Latency: {(result.scan_duration_ms/1000).toFixed(1)}s</span>}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-[#0A0D14] border-b border-[#1E2530]">
                    {[["#","",""],["Ticker","",""],["Company","",""],["Price","price","text-right"],["Chg%","","text-right"],["Mkt Cap","","text-right"],["C1","","text-center"],["C2","","text-center"],["Stage","","text-center"],["MA50","","text-right"],["MA200","","text-right"],["GC","","text-center"],["RSI","rsi","text-right"],["52W%","","text-center"],["Entry Zone","",""],["Conv","conviction","text-center"],["","",""]].map(([h,col,align])=>(
                      <th key={h} onClick={col?()=>handleSort(col):undefined} className={`text-[11px] font-bold uppercase tracking-wider text-[#64748B] px-4 py-3 border-b border-[#1E2530] ${align} ${col?"cursor-pointer hover:text-[#94a3b8]":""} whitespace-nowrap`}>
                        {h}{col&&<SA col={col}/>}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {stocks.map((s,i)=>{
                    const dimmed = !s.check1_pass||!s.check2_pass;
                    const ccolor = s.conviction_score>=9?"text-emerald-400":s.conviction_score>=7?"text-amber-400":s.conviction_score>=5?"text-blue-400":"text-rose-400";
                    const stcolor = s.technical_stage.includes("Stage 2")?"text-emerald-400":s.technical_stage.includes("Stage 1")?"text-blue-400":"text-rose-400";
                    const stshort = s.technical_stage.includes("Stage 2")?"STG2":s.technical_stage.includes("Stage 1")?"STG1":"STG4";
                    return (
                      <tr key={s.ticker} className={`border-b border-[#1E2530]/50 last:border-0 hover:bg-[#161C28]/60 transition-colors ${dimmed?"opacity-40":""}`}>
                        <td className="px-4 py-2.5 text-xs text-[#3f3f46]">{i+1}</td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2">
                            <div className={`w-0.5 h-7 rounded-full ${s.conviction_score>=9?"bg-emerald-500":s.conviction_score>=7?"bg-amber-500":s.conviction_score>=5?"bg-blue-500":"bg-rose-500"}`}/>
                            <div>
                              <div className="font-bold text-[#FFB000] text-sm tracking-tight">{s.ticker}</div>
                              <div className="text-[9px] text-[#3f3f46] uppercase tracking-wider">{s.sector?.substring(0,8)||"—"}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-xs text-[#64748B] max-w-[140px] truncate">{s.company_name}</td>
                        <td className="px-4 py-2.5 text-right font-mono text-sm text-[#fafafa] font-semibold">${s.price.toFixed(2)}</td>
                        <td className={`px-4 py-2.5 text-right font-mono text-xs font-semibold ${s.change_pct>0?"text-emerald-400":s.change_pct<0?"text-rose-400":"text-[#64748B]"}`}>
                          {s.change_pct!==0?`${s.change_pct>0?"+":""}${s.change_pct.toFixed(1)}%`:"—"}
                        </td>
                        <td className="px-4 py-2.5 text-right text-xs text-[#52525b] font-mono">{fmtMkt(s.market_cap)}</td>
                        <td className="px-4 py-2.5 text-center">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded tracking-wide font-sans ${s.check1_pass?"bg-emerald-950/80 text-emerald-400 border border-emerald-800/40":"bg-rose-950/80 text-rose-400 border border-rose-800/40"}`}>{s.check1_pass?"PASS":"FAIL"}</span>
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded tracking-wide font-sans ${s.check2_pass?"bg-emerald-950/80 text-emerald-400 border border-emerald-800/40":"bg-rose-950/80 text-rose-400 border border-rose-800/40"}`}>{s.check2_pass?"PASS":"FAIL"}</span>
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <span className={`bg-blue-950/60 border border-blue-900/40 text-[10px] font-medium px-1.5 py-0.5 rounded ${stcolor}`}>{stshort}</span>
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono text-xs text-[#52525b]">{s.ma50>0?`$${s.ma50.toFixed(0)}`:"—"}</td>
                        <td className="px-4 py-2.5 text-right font-mono text-xs text-[#52525b]">{s.ma200>0?`$${s.ma200.toFixed(0)}`:"—"}</td>
                        <td className="px-4 py-2.5 text-center">
                          {s.golden_cross?<span className="text-emerald-400 text-sm">✓</span>:<span className="text-[#27272a]">—</span>}
                        </td>
                        <td className={`px-4 py-2.5 text-right font-mono text-xs font-semibold ${s.rsi14>75?"text-rose-400":s.rsi14>60?"text-amber-400":s.rsi14>40?"text-emerald-400":"text-blue-400"}`}>
                          {s.rsi14>0?s.rsi14.toFixed(0):"—"}
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <div className="flex items-center gap-1 justify-center">
                            <div className="w-8 h-1 bg-[#27272a] rounded-full overflow-hidden">
                              <div className={`h-full ${s.range_pct>60?"bg-emerald-500":s.range_pct>40?"bg-amber-500":"bg-rose-500"}`} style={{width:`${s.range_pct}%`}}/>
                            </div>
                            <span className="text-[9px] text-[#52525b]">{s.range_pct.toFixed(0)}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-2.5 font-mono text-xs text-blue-400 whitespace-nowrap">{s.entry_zone||"—"}</td>
                        <td className="px-4 py-2.5 text-center">
                          <div className="flex flex-col items-center gap-1">
                            <ConvBar score={s.conviction_score}/>
                            <span className={`font-bold font-mono text-sm ${ccolor}`}>{s.conviction_score}</span>
                          </div>
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex gap-1.5">
                            <button onClick={()=>router.push("/analyzer?ticker="+s.ticker+"&market="+s.market)} className="text-[10px] px-2 py-1 rounded border bg-[#18181b] text-[#a1a1aa] border-[#27272a] hover:text-[#fafafa] transition-colors">View</button>
                            <button onClick={()=>addToWatchlist(s)} className="text-[10px] px-2 py-1 rounded border bg-emerald-950/40 text-emerald-400 border-emerald-800/30 hover:bg-emerald-950/70 transition-colors">+W</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* LEGEND FOOTER */}
            <div className="grid grid-cols-2 gap-6 border-t border-[#1E2530] bg-[#0A0D14] p-4 text-[11px] text-[#64748B]">
              <div className="space-y-2">
                <p className="font-semibold uppercase tracking-wider text-[#3f3f46] mb-2">Conviction Tier Legend</p>
                {[["9–10","bg-emerald-500","MAXIMUM — C1+C2 pass, Stage 2, golden cross"],["7–8","bg-amber-500","HIGH — qualifying, watch for entry"],["5–6","bg-blue-500","MODERATE — Stage 1, building base"],["1–4","bg-rose-500","AVOID — check failure or Stage 3/4"]].map(([tier,col,desc])=>(
                  <div key={tier} className="flex items-center gap-2">
                    <div className={`w-0.5 h-4 rounded-full ${col}`}/>
                    <span className="font-mono w-8 text-[#a1a1aa]">{tier}</span>
                    <span>{desc}</span>
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                <p className="font-semibold uppercase tracking-wider text-[#3f3f46] mb-2">Column Guide</p>
                <div className="grid grid-cols-2 gap-1">
                  {[["C1","Fundamental check"],["C2","Technical phase"],["STG2","Stage 2 Markup"],["STG1","Stage 1 Accum."],["GC","Golden Cross"],["RSI","Rel. Strength (14)"],["52W%","52-week range pos."],["CONV","Conviction 1–10"]].map(([k,v])=>(
                    <div key={k} className="flex gap-2"><span className="font-semibold text-[#a1a1aa] w-8">{k}</span><span>{v}</span></div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* EMPTY STATE */}
        {!scanning&&!result&&(
          <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-16 text-center space-y-4">
            <p className="text-[#a1a1aa] text-sm font-semibold tracking-wider uppercase">Command Center Ready</p>
            <p className="text-xs text-[#52525b] tracking-wider">~200 Liquid US Equities · 2-Check Qualification · Fundamental + Technical</p>
            <div className="flex justify-center gap-px mt-6 max-w-lg mx-auto">
              {[["01","FUNDAMENTALS","Revenue · Margins · Valuation · PEG"],["02","TECHNICALS","Weinstein Stage 1 or Stage 2"],["03","CONVICTION","1–10 institutional score"]].map((c,i)=>(
                <div key={c[0]} className="flex-1 p-4 bg-[#09090b] border border-[#27272a] text-left space-y-1">
                  <p className="text-[#FFB000] text-[10px] font-semibold tracking-widest">CHECK {c[0]}</p>
                  <p className="text-[#a1a1aa] text-xs font-semibold">{c[1]}</p>
                  <p className="text-[#52525b] text-[10px]">{c[2]}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {!scanning&&result&&stocks.length===0&&(
          <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-10 text-center">
            <p className="text-xs text-[#a1a1aa] uppercase tracking-wider">No results match current filters</p>
          </div>
        )}

      </main>
    </div>
  );
}