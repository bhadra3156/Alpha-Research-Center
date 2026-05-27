"use client";
import React, { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";

const BACKEND = "https://alpha-research-center-backend.onrender.com";

interface AnalysisResult {
  ticker: string; company_name: string; market: string;
  price: number; change_pct: number; market_cap: number;
  check1_pass: boolean; check2_pass: boolean;
  technical_stage: string; conviction_score: number;
  rsi14: number; ma50: number; ma200: number;
  golden_cross: boolean; entry_zone: string;
  support_level: number; resistance_level: number;
  week52_high: number; week52_low: number;
  revenue_growth: number; net_margin: number; pe_ratio: number;
  data_quality: string; narrative: string; sector: string;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = React.useState(false);
  const copy = () => { navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2500); }); };
  return (
    <button onClick={copy} style={{background:copied?"rgba(34,197,94,0.15)":"transparent",border:`1px solid ${copied?"#22c55e44":"#253345"}`,color:copied?"#22c55e":"#4a5568",fontSize:"9px",padding:"3px 8px",cursor:"pointer",letterSpacing:"0.05em"}}>
      {copied?"✓ COPIED":"⧉ COPY"}
    </button>
  );
}

function addToWatchlist(ticker: string, market: string, data: AnalysisResult | null) {
  try {
    const existing = JSON.parse(localStorage.getItem("alpha_watchlist_v3")||"[]");
    if (existing.find((i: any) => i.ticker===ticker)) { alert(ticker+" already in watchlist"); return; }
    const item = {
      id: Date.now().toString(), ticker, market, sector: data?.sector||"",
      theme: "", added: new Date().toISOString().split("T")[0],
      notes: data ? `${data.technical_stage} | Conv:${data.conviction_score}/10 | Entry:${data.entry_zone}` : "",
      score: data?.conviction_score||0, c1_pass: data?.check1_pass||false,
      c2_pass: data?.check2_pass||false, stage: data?.technical_stage||"",
      rsi: data?.rsi14||0, entry_zone: data?.entry_zone||"", graduated: false
    };
    localStorage.setItem("alpha_watchlist_v3", JSON.stringify([...existing, item]));
    alert("✅ "+ticker+" added to watchlist!");
  } catch(e) { alert("Failed"); }
}

export default function Analyzer() {
  const searchParams = useSearchParams();
  const [ticker, setTicker] = useState(searchParams?.get("ticker")||"");
  const [market, setMarket] = useState(searchParams?.get("market")||"US");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<AnalysisResult|null>(null);
  const [error, setError] = useState<string|null>(null);

  useEffect(() => {
    const t = searchParams?.get("ticker");
    if (t) { setTicker(t); setMarket(searchParams?.get("market")||"US"); }
  }, [searchParams]);

  const analyze = async () => {
    if (!ticker.trim()) { setError("ENTER A TICKER SYMBOL"); return; }
    setLoading(true); setError(null); setData(null);
    try {
      const res = await fetch(`${BACKEND}/analyze/${ticker.trim().toUpperCase()}?market=${market}`);
      if (!res.ok) throw new Error("Analysis failed "+res.status);
      setData(await res.json());
    } catch(e: any) { setError(e.message||"Analysis failed — backend may be waking up"); }
    setLoading(false);
  };

  const now = new Date();
  const timeStr = now.toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit",timeZone:"America/New_York"})+" EST";
  const dateStr = now.toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"}).toUpperCase();

  const convColor = (s: number) => s>=9?"#22c55e":s>=7?"#f59e0b":s>=5?"#60a5fa":"#ef4444";
  const stageColor = (st: string) => st?.includes("Stage 2")?"#22c55e":st?.includes("Stage 1")?"#60a5fa":"#ef4444";
  const stageShort = (st: string) => st?.includes("Stage 2")?"STG2 MARKUP":st?.includes("Stage 1")?"STG1 ACCUMULATION":"STG3/4 AVOID";

  return (
    <div style={{minHeight:"100vh",background:"#060d18",fontFamily:"'SF Mono','Fira Code','Consolas',monospace",color:"#e2e8f0"}}>

      {/* TOP BAR */}
      <div style={{position:"fixed",top:0,left:0,right:0,zIndex:50,background:"#04080f",borderBottom:"1px solid #1a2535",display:"flex",alignItems:"center",justifyContent:"space-between",height:"44px"}}>
        <div style={{display:"flex",alignItems:"center",height:"100%"}}>
          <div style={{background:"#f59e0b",color:"#000",fontSize:"11px",fontWeight:"700",padding:"0 14px",height:"100%",display:"flex",alignItems:"center",letterSpacing:"0.08em"}}>ALPHA<span style={{opacity:0.6}}>RESEARCH</span></div>
          {[["dashboard","COMMAND CTR"],["analyzer","ANALYZER"],["watchlist","WATCHLIST"],["portfolio","PORTFOLIO"],["journal","JOURNAL"]].map(([href,label])=>(
            <a key={href} href={"/"+href} style={{display:"flex",alignItems:"center",height:"100%",padding:"0 14px",textDecoration:"none",fontSize:"10px",letterSpacing:"0.06em",borderBottom:href==="analyzer"?"2px solid #f59e0b":"2px solid transparent",color:href==="analyzer"?"#f59e0b":"#4a5568",fontWeight:href==="analyzer"?"700":"400"}}>{label}</a>
          ))}
        </div>
        <div style={{display:"flex",alignItems:"center",gap:"16px",paddingRight:"16px"}}>
          <div style={{display:"flex",alignItems:"center",gap:"4px"}}><div style={{width:"5px",height:"5px",borderRadius:"50%",background:"#22c55e"}}></div><span style={{color:"#22c55e",fontSize:"9px",letterSpacing:"0.08em"}}>LIVE</span></div>
          <span style={{color:"#253345",fontSize:"9px"}}>{dateStr} {timeStr}</span>
        </div>
      </div>

      <div style={{paddingTop:"44px"}}>

        {/* SEARCH BAR */}
        <div style={{background:"#04080f",borderBottom:"1px solid #1a2535",padding:"12px 14px",display:"flex",alignItems:"center",gap:"8px"}}>
          <div style={{color:"#374151",fontSize:"8px",letterSpacing:"0.1em",marginRight:"8px"}}>DEEP ANALYZER</div>
          <input value={ticker} onChange={e=>setTicker(e.target.value.toUpperCase())} onKeyDown={e=>e.key==="Enter"&&analyze()} placeholder="ENTER TICKER..."
            style={{background:"#060d18",border:"1px solid #1a2535",color:"#f59e0b",padding:"7px 12px",fontSize:"14px",fontWeight:"700",fontFamily:"inherit",outline:"none",width:"160px",letterSpacing:"0.06em"}}/>
          <select value={market} onChange={e=>setMarket(e.target.value)} style={{background:"#060d18",border:"1px solid #1a2535",color:"#e2e8f0",padding:"7px 10px",fontSize:"10px",fontFamily:"inherit",outline:"none"}}>
            <option value="US">🇺🇸 US NYSE/NASDAQ</option>
            <option value="UK">🇬🇧 UK LSE/AIM</option>
          </select>
          <button onClick={analyze} disabled={loading} style={{background:loading?"#1a1200":"#f59e0b",border:"none",color:loading?"#f59e0b":"#000",fontSize:"10px",fontWeight:"700",padding:"7px 20px",cursor:loading?"not-allowed":"pointer",letterSpacing:"0.08em"}}>
            {loading?"ANALYZING...":"⚡ ANALYZE"}
          </button>
          {data&&<>
            <button onClick={()=>addToWatchlist(data.ticker,data.market,data)} style={{background:"transparent",border:"1px solid #22c55e44",color:"#22c55e",fontSize:"9px",padding:"6px 12px",cursor:"pointer",letterSpacing:"0.06em"}}>+ WATCHLIST</button>
            <div style={{flex:1}}></div>
            <CopyButton text={`${data.ticker} | $${data.price} | ${data.technical_stage} | Conv:${data.conviction_score}/10 | Entry:${data.entry_zone}\n\n${data.narrative||""}`}/>
          </>}
        </div>

        {error&&<div style={{padding:"8px 14px",background:"#1a0505",borderBottom:"1px solid #ef444433",color:"#ef4444",fontSize:"9px",letterSpacing:"0.06em"}}>⚠ {error}</div>}

        {loading&&(
          <div style={{padding:"80px 0",textAlign:"center"}}>
            <div style={{color:"#f59e0b",fontSize:"11px",letterSpacing:"0.1em",marginBottom:"8px"}}>⚡ ANALYZING {ticker}</div>
            <div style={{color:"#253345",fontSize:"9px",letterSpacing:"0.08em"}}>FUNDAMENTALS · TECHNICALS · SMART MONEY · NARRATIVE GENERATION</div>
          </div>
        )}

        {/* EMPTY STATE */}
        {!loading&&!data&&!error&&(
          <div style={{padding:"80px 0",textAlign:"center"}}>
            <div style={{color:"#253345",fontSize:"11px",letterSpacing:"0.1em",marginBottom:"8px"}}>SINGLE STOCK DEEP ANALYZER</div>
            <div style={{color:"#1a2535",fontSize:"9px",letterSpacing:"0.08em",marginBottom:"24px"}}>ENTER ANY US OR UK TICKER FOR FULL INSTITUTIONAL ANALYSIS</div>
            <div style={{display:"flex",justifyContent:"center",gap:"0",maxWidth:"540px",margin:"0 auto"}}>
              {[["FUNDAMENTALS","Revenue · Margins · FCF · Balance Sheet · PEG"],["TECHNICALS","Weinstein Stage · MA50/200 · RSI · MACD · Support"],["NARRATIVE","AI-generated Goldman Sachs-grade research note"]].map((c,i)=>(
                <div key={c[0]} style={{flex:1,padding:"14px 12px",border:"1px solid #1a2535",borderRight:i<2?"none":"1px solid #1a2535",textAlign:"left"}}>
                  <div style={{color:"#f59e0b",fontSize:"8px",letterSpacing:"0.08em",marginBottom:"4px"}}>0{i+1}</div>
                  <div style={{color:"#374151",fontSize:"10px",fontWeight:"600",marginBottom:"3px"}}>{c[0]}</div>
                  <div style={{color:"#253345",fontSize:"8px"}}>{c[1]}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* RESULTS */}
        {data&&!loading&&(
          <div>
            {/* HEADER STRIP */}
            <div style={{display:"grid",gridTemplateColumns:"auto 1fr repeat(5,auto)",alignItems:"center",gap:"0",borderBottom:"1px solid #1a2535",padding:"12px 14px",background:"#04080f"}}>
              <div style={{marginRight:"20px"}}>
                <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
                  <div style={{width:"4px",height:"40px",background:convColor(data.conviction_score),borderRadius:"1px"}}></div>
                  <div>
                    <div style={{color:"#f59e0b",fontSize:"22px",fontWeight:"700",letterSpacing:"0.04em"}}>{data.ticker}</div>
                    <div style={{color:"#374151",fontSize:"9px",letterSpacing:"0.06em"}}>{data.market==="US"?"NYSE/NASDAQ":"LSE/AIM"}</div>
                  </div>
                </div>
              </div>
              <div>
                <div style={{color:"#e2e8f0",fontSize:"13px",fontWeight:"600"}}>{data.company_name}</div>
                <div style={{color:"#374151",fontSize:"9px",marginTop:"2px"}}>{data.sector||"—"}</div>
              </div>
              {[
                {label:"PRICE",value:`$${data.price?.toFixed(2)||"—"}`,color:"#e2e8f0"},
                {label:"CHG%",value:data.change_pct?`${data.change_pct>0?"+":""}${data.change_pct.toFixed(1)}%`:"—",color:data.change_pct>0?"#22c55e":data.change_pct<0?"#ef4444":"#94a3b8"},
                {label:"MKT CAP",value:data.market_cap?`$${(data.market_cap/1e9).toFixed(1)}B`:"—",color:"#94a3b8"},
                {label:"STAGE",value:stageShort(data.technical_stage),color:stageColor(data.technical_stage)},
                {label:"CONVICTION",value:`${data.conviction_score}/10`,color:convColor(data.conviction_score)},
              ].map(s=>(
                <div key={s.label} style={{padding:"0 16px",borderLeft:"1px solid #1a2535"}}>
                  <div style={{color:"#374151",fontSize:"8px",letterSpacing:"0.08em",marginBottom:"3px"}}>{s.label}</div>
                  <div style={{color:s.color,fontSize:"14px",fontWeight:"700",fontFamily:"monospace"}}>{s.value}</div>
                </div>
              ))}
            </div>

            {/* 3-CHECK VERDICTS */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",borderBottom:"1px solid #1a2535"}}>
              {[
                {num:"01",name:"FUNDAMENTALS",pass:data.check1_pass,detail:"Revenue · Margins · FCF · Balance Sheet · Valuation"},
                {num:"02",name:"TECHNICALS",pass:data.check2_pass,detail:"Weinstein Stage 1 or Stage 2 · MA50/200 · Volume"},
                {num:"03",name:"CONVICTION",pass:data.conviction_score>=7,detail:`Score ${data.conviction_score}/10 — ${data.conviction_score>=8?"HIGH":data.conviction_score>=6?"MEDIUM":"LOW"} conviction`},
              ].map((c,i)=>(
                <div key={c.num} style={{padding:"12px 14px",borderRight:i<2?"1px solid #1a2535":"none",background:c.pass?"rgba(5,46,22,0.3)":"rgba(26,5,5,0.3)"}}>
                  <div style={{display:"flex",alignItems:"center",gap:"8px",marginBottom:"4px"}}>
                    <span style={{color:"#374151",fontSize:"8px",letterSpacing:"0.08em"}}>CHECK {c.num}</span>
                    <span style={{background:c.pass?"#052e16":"#1a0505",color:c.pass?"#22c55e":"#ef4444",fontSize:"8px",padding:"2px 8px",letterSpacing:"0.06em"}}>{c.pass?"PASS":"FAIL"}</span>
                  </div>
                  <div style={{color:c.pass?"#22c55e":"#ef4444",fontSize:"13px",fontWeight:"700",letterSpacing:"0.04em",marginBottom:"3px"}}>{c.name}</div>
                  <div style={{color:"#374151",fontSize:"9px"}}>{c.detail}</div>
                </div>
              ))}
            </div>

            {/* DATA GRID */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",borderBottom:"1px solid #1a2535"}}>
              {/* TECHNICALS */}
              <div style={{borderRight:"1px solid #1a2535"}}>
                <div style={{padding:"8px 14px",background:"#04080f",borderBottom:"1px solid #1a2535"}}>
                  <span style={{color:"#374151",fontSize:"8px",letterSpacing:"0.1em"}}>TECHNICAL ANALYSIS</span>
                </div>
                <div style={{padding:"10px 14px"}}>
                  {[
                    ["STAGE",stageShort(data.technical_stage),stageColor(data.technical_stage)],
                    ["RSI (14)",data.rsi14?.toFixed(1)||"—",data.rsi14>70?"#ef4444":data.rsi14>50?"#f59e0b":"#22c55e"],
                    ["MA 50-DAY",data.ma50?`$${data.ma50.toFixed(2)}`:"—",data.price>data.ma50?"#22c55e":"#ef4444"],
                    ["MA 200-DAY",data.ma200?`$${data.ma200.toFixed(2)}`:"—",data.price>data.ma200?"#22c55e":"#ef4444"],
                    ["GOLDEN CROSS",data.golden_cross?"YES ✓":"NO",data.golden_cross?"#22c55e":"#ef4444"],
                    ["ENTRY ZONE",data.entry_zone||"—","#60a5fa"],
                    ["SUPPORT",data.support_level?`$${data.support_level.toFixed(2)}`:"—","#22c55e"],
                    ["RESISTANCE",data.resistance_level?`$${data.resistance_level.toFixed(2)}`:"—","#ef4444"],
                    ["52W HIGH",data.week52_high?`$${data.week52_high.toFixed(2)}`:"—","#94a3b8"],
                    ["52W LOW",data.week52_low?`$${data.week52_low.toFixed(2)}`:"—","#94a3b8"],
                  ].map(([k,v,c])=>(
                    <div key={String(k)} style={{display:"flex",justifyContent:"space-between",padding:"4px 0",borderBottom:"1px solid #0d1520"}}>
                      <span style={{color:"#374151",fontSize:"9px",letterSpacing:"0.04em"}}>{k}</span>
                      <span style={{color:String(c),fontSize:"10px",fontFamily:"monospace",fontWeight:"600"}}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* FUNDAMENTALS */}
              <div>
                <div style={{padding:"8px 14px",background:"#04080f",borderBottom:"1px solid #1a2535"}}>
                  <span style={{color:"#374151",fontSize:"8px",letterSpacing:"0.1em"}}>FUNDAMENTAL ANALYSIS</span>
                </div>
                <div style={{padding:"10px 14px"}}>
                  {[
                    ["REVENUE GROWTH",data.revenue_growth?`${data.revenue_growth.toFixed(1)}%`:"N/A",data.revenue_growth>20?"#22c55e":data.revenue_growth>0?"#f59e0b":"#ef4444"],
                    ["NET MARGIN",data.net_margin?`${data.net_margin.toFixed(1)}%`:"N/A",data.net_margin>15?"#22c55e":data.net_margin>0?"#f59e0b":"#ef4444"],
                    ["P/E RATIO",data.pe_ratio?data.pe_ratio.toFixed(1):"N/A",data.pe_ratio>0&&data.pe_ratio<25?"#22c55e":data.pe_ratio>40?"#ef4444":"#f59e0b"],
                    ["DATA QUALITY",data.data_quality||"MEDIUM",data.data_quality==="HIGH"?"#22c55e":data.data_quality==="LOW"?"#ef4444":"#f59e0b"],
                    ["C1 VERDICT",data.check1_pass?"PASS":"FAIL",data.check1_pass?"#22c55e":"#ef4444"],
                    ["C2 VERDICT",data.check2_pass?"PASS":"FAIL",data.check2_pass?"#22c55e":"#ef4444"],
                    ["CONVICTION",`${data.conviction_score}/10`,convColor(data.conviction_score)],
                    ["MARKET",data.market==="US"?"NYSE/NASDAQ":"LSE/AIM","#94a3b8"],
                  ].map(([k,v,c])=>(
                    <div key={String(k)} style={{display:"flex",justifyContent:"space-between",padding:"4px 0",borderBottom:"1px solid #0d1520"}}>
                      <span style={{color:"#374151",fontSize:"9px",letterSpacing:"0.04em"}}>{k}</span>
                      <span style={{color:String(c),fontSize:"10px",fontFamily:"monospace",fontWeight:"600"}}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* NARRATIVE */}
            {data.narrative&&(
              <div style={{borderBottom:"1px solid #1a2535"}}>
                <div style={{padding:"8px 14px",background:"#04080f",borderBottom:"1px solid #1a2535",display:"flex",alignItems:"center",gap:"8px"}}>
                  <span style={{color:"#374151",fontSize:"8px",letterSpacing:"0.1em"}}>INSTITUTIONAL NARRATIVE</span>
                  <span style={{background:"#0a1a2e",color:"#60a5fa",fontSize:"8px",padding:"2px 6px",letterSpacing:"0.05em"}}>AI GENERATED</span>
                  <div style={{flex:1}}></div>
                  <CopyButton text={data.narrative}/>
                </div>
                <div style={{padding:"14px",maxHeight:"400px",overflowY:"auto"}}>
                  <pre style={{color:"#94a3b8",fontSize:"11px",lineHeight:"1.8",whiteSpace:"pre-wrap",fontFamily:"inherit",margin:0}}>{data.narrative}</pre>
                </div>
              </div>
            )}

            <div style={{padding:"8px 14px",borderTop:"1px solid #1a2535",color:"#1a2535",fontSize:"8px",letterSpacing:"0.06em"}}>
              DATA: YAHOO FINANCE v8 · {dateStr} · NOT FINANCIAL ADVICE · FOR INSTITUTIONAL USE ONLY
            </div>
          </div>
        )}
      </div>
    </div>
  );
}