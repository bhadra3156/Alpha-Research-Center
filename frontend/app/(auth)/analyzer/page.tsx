"use client";
import React,{useState,useEffect}from"react";
import{useSearchParams}from"next/navigation";
const BACKEND="https://alpha-research-center-backend.onrender.com";
interface AnalysisResult{ticker:string;company_name:string;market:string;price:number;change_pct:number;market_cap:number;check1_pass:boolean;check2_pass:boolean;technical_stage:string;conviction_score:number;rsi14:number;ma50:number;ma200:number;golden_cross:boolean;entry_zone:string;support_level:number;resistance_level:number;week52_high:number;week52_low:number;revenue_growth:number;net_margin:number;pe_ratio:number;data_quality:string;narrative:string;sector:string;}
function Navbar({active}:{active:string}){return(<nav className="bg-[#18181b]/80 backdrop-blur-md border-b border-[#27272a] sticky top-0 z-50 px-6 h-14 flex items-center justify-between"><span className="text-[#fafafa] font-bold tracking-tight text-sm uppercase">AlphaResearch</span><div className="flex items-center gap-6">{[["dashboard","Dashboard"],["analyzer","Analyzer"],["watchlist","Watchlist"],["portfolio","Portfolio"],["journal","Journal"]].map(([href,label])=><a key={href} href={"/"+href} className={active===href?"text-[#fafafa] font-medium text-sm border-b-2 border-[#fafafa] h-14 flex items-center px-1":"text-[#a1a1aa] hover:text-[#fafafa] font-medium text-sm transition-colors h-14 flex items-center px-1"}>{label}</a>)}</div><div className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-0.5 rounded-full text-[11px] font-medium flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"/>LIVE</div></nav>);}
function KpiCard({label,value,sub,color}:{label:string;value:string;sub:string;color?:string}){return(<div className="bg-[#18181b] border border-[#27272a] rounded-xl p-5 shadow-sm space-y-1.5"><p className="text-xs font-semibold text-[#a1a1aa] uppercase tracking-wider">{label}</p><p className={`text-2xl font-bold tracking-tight font-mono ${color||"text-[#fafafa]"}`}>{value}</p><p className="text-xs text-[#52525b]">{sub}</p></div>);}
function CopyBtn({text}:{text:string}){const[c,setC]=React.useState(false);return(<button onClick={()=>{navigator.clipboard.writeText(text).then(()=>{setC(true);setTimeout(()=>setC(false),2500);});}} className={`text-[11px] px-2.5 py-1 rounded border transition-colors ${c?"bg-emerald-500/10 text-emerald-400 border-emerald-500/20":"bg-[#27272a] text-[#a1a1aa] border-[#3f3f46] hover:text-[#fafafa]"}`}>{c?"✓ Copied":"⧉ Copy"}</button>);}
function ConvBar({score}:{score:number}){return(<div className="flex space-x-0.5 h-1.5 w-16 bg-slate-800 rounded-sm overflow-hidden">{Array.from({length:10},(_,i)=>{const lit=i<score;const col=score>=9?"bg-emerald-500":score>=7?"bg-amber-500":score>=5?"bg-blue-500":"bg-rose-500";return<div key={i} className={`flex-1 ${lit?col:"bg-slate-700"}`}/>;})}</div>);}
function addToWatchlist(ticker:string,market:string,data:AnalysisResult|null){try{const existing=JSON.parse(localStorage.getItem("alpha_watchlist_v3")||"[]");if(existing.find((i:any)=>i.ticker===ticker)){alert(ticker+" already in watchlist");return;}const item={id:Date.now().toString(),ticker,market,sector:data?.sector||"",theme:"",added:new Date().toISOString().split("T")[0],notes:data?`${data.technical_stage} | Conv:${data.conviction_score}/10 | Entry:${data.entry_zone}`:"",score:data?.conviction_score||0,c1_pass:data?.check1_pass||false,c2_pass:data?.check2_pass||false,stage:data?.technical_stage||"",rsi:data?.rsi14||0,entry_zone:data?.entry_zone||"",graduated:false};localStorage.setItem("alpha_watchlist_v3",JSON.stringify([...existing,item]));alert("✅ "+ticker+" added to watchlist!");}catch(e){alert("Failed");}}
import{Suspense}from"react";
function AnalyzerInner(){
  const searchParams=useSearchParams();
  const[ticker,setTicker]=useState(searchParams?.get("ticker")||"");const[market,setMarket]=useState(searchParams?.get("market")||"US");const[loading,setLoading]=useState(false);const[data,setData]=useState<AnalysisResult|null>(null);const[error,setError]=useState<string|null>(null);
  useEffect(()=>{const t=searchParams?.get("ticker");if(t){setTicker(t);setMarket(searchParams?.get("market")||"US");}},[searchParams]);
  const analyze=async()=>{if(!ticker.trim()){setError("Enter a ticker symbol");return;}setLoading(true);setError(null);setData(null);try{const res=await fetch(`${BACKEND}/analyze/${ticker.trim().toUpperCase()}?market=${market}`);if(!res.ok)throw new Error("Analysis failed "+res.status);setData(await res.json());}catch(e:any){setError(e.message||"Analysis failed — backend may be waking up");}setLoading(false);};
  const ccolor=(s:number)=>s>=9?"text-emerald-400":s>=7?"text-amber-400":s>=5?"text-blue-400":"text-rose-400";
  const stcolor=(st:string)=>st?.includes("Stage 2")?"text-emerald-400":st?.includes("Stage 1")?"text-blue-400":"text-rose-400";
  const stshort=(st:string)=>st?.includes("Stage 2")?"STG2 Markup":st?.includes("Stage 1")?"STG1 Accumulation":"STG3/4 Avoid";
  return(
    <>
      <div className="space-y-6">
        {/* SEARCH */}
        <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-5 flex items-center gap-3 flex-wrap">
          <p className="text-xs font-semibold text-[#a1a1aa] uppercase tracking-wider mr-2">Deep Analyzer</p>
          <input value={ticker} onChange={e=>setTicker(e.target.value.toUpperCase())} onKeyDown={e=>e.key==="Enter"&&analyze()} placeholder="Enter ticker..." className="bg-[#09090b] border border-[#27272a] text-[#FFB000] font-bold px-3 py-2 text-base rounded focus:outline-none focus:border-amber-500/50 w-36 tracking-wider"/>
          <select value={market} onChange={e=>setMarket(e.target.value)} className="bg-[#09090b] border border-[#27272a] text-[#fafafa] px-3 py-2 text-xs rounded focus:outline-none"><option value="US">🇺🇸 US NYSE/NASDAQ</option><option value="UK">🇬🇧 UK LSE/AIM</option></select>
          <button onClick={analyze} disabled={loading} className={`px-5 py-2 text-xs font-bold rounded transition-all ${loading?"bg-amber-500/10 text-amber-400 border border-amber-500/20 cursor-not-allowed":"bg-amber-500 hover:bg-amber-400 text-black shadow-lg shadow-amber-500/20"}`}>{loading?"Analyzing...":"⚡ Analyze"}</button>
          {data&&<><button onClick={()=>addToWatchlist(data.ticker,data.market,data)} className="px-4 py-2 text-xs font-medium rounded border bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20 transition-colors">+ Watchlist</button><div className="flex-1"/><CopyBtn text={`${data.ticker} | $${data.price} | ${data.technical_stage} | Conv:${data.conviction_score}/10 | Entry:${data.entry_zone}\n\n${data.narrative||""}`}/></>}
        </div>
        {error&&<div className="bg-rose-950/40 border border-rose-800/40 text-rose-400 text-xs px-4 py-3 rounded-lg">⚠ {error}</div>}
        {loading&&<div className="bg-[#18181b] border border-[#27272a] rounded-xl p-16 text-center space-y-3"><p className="text-amber-400 text-sm font-semibold tracking-wider">⚡ Analyzing {ticker}</p><p className="text-xs text-[#52525b] tracking-wider">Fundamentals · Technicals · Smart Money · Narrative Generation</p></div>}
        {!loading&&!data&&!error&&(
          <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-16 text-center space-y-4">
            <p className="text-[#a1a1aa] text-sm font-semibold tracking-wider uppercase">Single Stock Deep Analyzer</p>
            <p className="text-xs text-[#52525b]">Enter any US or UK ticker for full institutional analysis</p>
            <div className="flex justify-center gap-px mt-4 max-w-lg mx-auto">
              {[["01","Fundamentals","Revenue · Margins · FCF · Balance Sheet · PEG"],["02","Technicals","Weinstein Stage · MA50/200 · RSI · MACD · Support"],["03","Narrative","AI-generated Goldman Sachs-grade research note"]].map((c,i)=>(
                <div key={c[0]} className="flex-1 p-4 bg-[#09090b] border border-[#27272a] text-left space-y-1">
                  <p className="text-[#FFB000] text-[10px] font-semibold tracking-widest">{c[0]}</p>
                  <p className="text-[#a1a1aa] text-xs font-semibold">{c[1]}</p>
                  <p className="text-[#52525b] text-[10px]">{c[2]}</p>
                </div>
              ))}
            </div>
          </div>
        )}
        {data&&!loading&&(
          <>
            {/* HEADER KPIS */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <KpiCard label="Price" value={`$${data.price?.toFixed(2)||"—"}`} sub={data.company_name} color="text-[#fafafa]"/>
              <KpiCard label="Change" value={data.change_pct?`${data.change_pct>0?"+":""}${data.change_pct.toFixed(1)}%`:"—"} sub="vs prev close" color={data.change_pct>0?"text-emerald-400":"text-rose-400"}/>
              <KpiCard label="Mkt Cap" value={data.market_cap?`$${(data.market_cap/1e9).toFixed(1)}B`:"—"} sub={data.sector||"—"}/>
              <KpiCard label="Stage" value={stshort(data.technical_stage)} sub={`RSI ${data.rsi14?.toFixed(0)||"—"}`} color={stcolor(data.technical_stage)}/>
              <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-5 shadow-sm space-y-2">
                <p className="text-xs font-semibold text-[#a1a1aa] uppercase tracking-wider">Conviction</p>
                <div className="flex items-center gap-3"><ConvBar score={data.conviction_score}/><span className={`text-2xl font-bold font-mono ${ccolor(data.conviction_score)}`}>{data.conviction_score}/10</span></div>
                <p className="text-xs text-[#52525b]">{data.conviction_score>=8?"High confidence":"Moderate"}</p>
              </div>
            </div>
            {/* 3-CHECK PANELS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {[{num:"01",name:"Fundamentals",pass:data.check1_pass,detail:"Revenue · Margins · FCF · Balance Sheet · Valuation"},{num:"02",name:"Technicals",pass:data.check2_pass,detail:"Weinstein Stage 1 or Stage 2 · MA50/200 · Volume"},{num:"03",name:"Conviction",pass:data.conviction_score>=7,detail:`Score ${data.conviction_score}/10 — ${data.conviction_score>=8?"HIGH":data.conviction_score>=6?"MEDIUM":"LOW"} conviction`}].map(c=>(
                <div key={c.num} className={`bg-[#18181b] border rounded-xl p-5 space-y-2 ${c.pass?"border-emerald-800/40":"border-rose-800/40"}`}>
                  <div className="flex items-center gap-2"><span className="text-xs text-[#52525b] uppercase tracking-widest">Check {c.num}</span><span className={`text-[10px] font-bold px-2 py-0.5 rounded tracking-wide font-sans ${c.pass?"bg-emerald-950/80 text-emerald-400 border border-emerald-800/40":"bg-rose-950/80 text-rose-400 border border-rose-800/40"}`}>{c.pass?"PASS":"FAIL"}</span></div>
                  <p className={`text-sm font-bold ${c.pass?"text-emerald-400":"text-rose-400"}`}>{c.name}</p>
                  <p className="text-xs text-[#52525b]">{c.detail}</p>
                </div>
              ))}
            </div>
            {/* DATA GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="w-full overflow-hidden rounded-lg border border-[#1E2530] bg-[#0C0F16]">
                <div className="px-4 py-3 bg-[#0A0D14] border-b border-[#1E2530]"><span className="text-xs font-semibold text-[#a1a1aa] uppercase tracking-wider">Technical Analysis</span></div>
                <div className="divide-y divide-[#1E2530]/50">
                  {[["Stage",stshort(data.technical_stage),stcolor(data.technical_stage)],["RSI (14)",data.rsi14?.toFixed(1)||"—",data.rsi14>70?"text-rose-400":data.rsi14>50?"text-amber-400":"text-emerald-400"],["MA 50-Day",data.ma50?`$${data.ma50.toFixed(2)}`:"—",data.price>data.ma50?"text-emerald-400":"text-rose-400"],["MA 200-Day",data.ma200?`$${data.ma200.toFixed(2)}`:"—",data.price>data.ma200?"text-emerald-400":"text-rose-400"],["Golden Cross",data.golden_cross?"YES ✓":"NO",data.golden_cross?"text-emerald-400":"text-rose-400"],["Entry Zone",data.entry_zone||"—","text-blue-400"],["Support",data.support_level?`$${data.support_level.toFixed(2)}`:"—","text-emerald-400"],["Resistance",data.resistance_level?`$${data.resistance_level.toFixed(2)}`:"—","text-rose-400"],["52W High",data.week52_high?`$${data.week52_high.toFixed(2)}`:"—","text-[#a1a1aa]"],["52W Low",data.week52_low?`$${data.week52_low.toFixed(2)}`:"—","text-[#a1a1aa]"]].map(([k,v,c])=>(
                    <div key={String(k)} className="flex justify-between items-center px-4 py-2.5 text-xs hover:bg-[#161C28]/60 transition-colors">
                      <span className="text-[#64748B]">{k}</span>
                      <span className={`font-mono font-semibold ${c}`}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="w-full overflow-hidden rounded-lg border border-[#1E2530] bg-[#0C0F16]">
                <div className="px-4 py-3 bg-[#0A0D14] border-b border-[#1E2530]"><span className="text-xs font-semibold text-[#a1a1aa] uppercase tracking-wider">Fundamental Analysis</span></div>
                <div className="divide-y divide-[#1E2530]/50">
                  {[["Revenue Growth",data.revenue_growth?`${data.revenue_growth.toFixed(1)}%`:"N/A",data.revenue_growth>20?"text-emerald-400":data.revenue_growth>0?"text-amber-400":"text-rose-400"],["Net Margin",data.net_margin?`${data.net_margin.toFixed(1)}%`:"N/A",data.net_margin>15?"text-emerald-400":data.net_margin>0?"text-amber-400":"text-rose-400"],["P/E Ratio",data.pe_ratio?data.pe_ratio.toFixed(1):"N/A",data.pe_ratio>0&&data.pe_ratio<25?"text-emerald-400":data.pe_ratio>40?"text-rose-400":"text-amber-400"],["Data Quality",data.data_quality||"MEDIUM",data.data_quality==="HIGH"?"text-emerald-400":data.data_quality==="LOW"?"text-rose-400":"text-amber-400"],["C1 Verdict",data.check1_pass?"PASS":"FAIL",data.check1_pass?"text-emerald-400":"text-rose-400"],["C2 Verdict",data.check2_pass?"PASS":"FAIL",data.check2_pass?"text-emerald-400":"text-rose-400"],["Conviction",`${data.conviction_score}/10`,ccolor(data.conviction_score)],["Market",data.market==="US"?"NYSE/NASDAQ":"LSE/AIM","text-[#a1a1aa]"]].map(([k,v,c])=>(
                    <div key={String(k)} className="flex justify-between items-center px-4 py-2.5 text-xs hover:bg-[#161C28]/60 transition-colors">
                      <span className="text-[#64748B]">{k}</span>
                      <span className={`font-mono font-semibold ${c}`}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            {data.narrative&&(
              <div className="w-full overflow-hidden rounded-lg border border-[#1E2530] bg-[#0C0F16]">
                <div className="flex items-center gap-3 px-4 py-3 bg-[#0A0D14] border-b border-[#1E2530]">
                  <span className="text-xs font-semibold text-[#a1a1aa] uppercase tracking-wider">Institutional Narrative</span>
                  <span className="bg-blue-950/80 text-blue-400 border border-blue-800/40 text-[10px] font-bold px-2 py-0.5 rounded">AI Generated</span>
                  <div className="flex-1"/><CopyBtn text={data.narrative}/>
                </div>
                <div className="p-4 max-h-[400px] overflow-y-auto"><pre className="text-xs text-[#94a3b8] leading-relaxed whitespace-pre-wrap font-mono">{data.narrative}</pre></div>
                <div className="px-4 py-2 border-t border-[#1E2530] bg-[#0A0D14] text-[10px] text-[#3f3f46]">Data: Yahoo Finance v8 · Not financial advice</div>
              </div>
            )}
          </>
        )}
    </div>
  );
}
export default function AnalyzerPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#09090b] text-[#fafafa] flex items-center justify-center"><p className="text-amber-400 text-sm">Loading Analyzer...</p></div>}>
      <AnalyzerInner />
    </Suspense>
  );
}