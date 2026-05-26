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
    if (existing.find((i: any) => i.ticker === s.ticker)) {
      alert(s.ticker + " already in watchlist"); return;
    }
    const item = {
      id: Date.now().toString(), ticker: s.ticker, market: s.market || "US",
      sector: s.sector || "", theme: "", added: new Date().toISOString().split("T")[0],
      notes: `${s.technical_stage} | Conv:${s.conviction_score}/10 | Entry:${s.entry_zone}`,
      score: s.conviction_score, c1_pass: s.check1_pass, c2_pass: s.check2_pass,
      stage: s.technical_stage, rsi: s.rsi14 || 0, entry_zone: s.entry_zone || "", graduated: false
    };
    localStorage.setItem("alpha_watchlist_v3", JSON.stringify([...existing, item]));
    alert("✅ " + s.ticker + " added to watchlist!");
  } catch(e) { alert("Failed to add to watchlist"); }
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = React.useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 2500);
    }).catch(() => {
      const el = document.createElement("textarea");
      el.value = text; document.body.appendChild(el); el.select();
      document.execCommand("copy"); document.body.removeChild(el);
      setCopied(true); setTimeout(() => setCopied(false), 2500);
    });
  };
  return (
    <button onClick={handleCopy}
      style={{background: copied ? "rgba(34,197,94,0.15)" : "transparent",
        border: `1px solid ${copied ? "#22c55e44" : "#253345"}`,
        color: copied ? "#22c55e" : "#4a5568", fontSize: "9px", padding: "3px 8px",
        cursor: "pointer", letterSpacing: "0.05em", display:"flex", alignItems:"center", gap:"4px"}}>
      {copied ? "✓ COPIED" : "⧉ COPY"}
    </button>
  );
}

export default function Dashboard() {
  const router = useRouter();
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [sortBy, setSortBy] = useState<string>("conviction");
  const [sortDir, setSortDir] = useState<"desc"|"asc">("desc");
  const [stageFilter, setStageFilter] = useState("ALL");
  const [convFilter, setConvFilter] = useState(0);

  const runScan = async () => {
    setScanning(true); setError(null);
    const start = Date.now();
    const timer = setInterval(() => setElapsed(Math.floor((Date.now()-start)/1000)), 1000);
    try {
      const res = await fetch(`${BACKEND}/scan/`, {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({market:"US", notify_telegram:false}),
      });
      if (!res.ok) throw new Error("Backend error " + res.status);
      setResult(await res.json());
    } catch(e: unknown) {
      setError(e instanceof Error ? e.message : "Scan failed — backend may be waking up (50s)");
    } finally { clearInterval(timer); setElapsed(0); setScanning(false); }
  };

  const handleSort = (col: string) => {
    if (sortBy === col) setSortDir(d => d==="desc"?"asc":"desc");
    else { setSortBy(col); setSortDir("desc"); }
  };

  const stocks = (result?.qualifying_stocks||[])
    .filter(s => convFilter===0 || s.conviction_score>=convFilter)
    .filter(s => stageFilter==="ALL" || s.technical_stage.includes(stageFilter))
    .sort((a,b) => {
      const v=(s:Stock)=>sortBy==="conviction"?s.conviction_score:sortBy==="price"?s.price:sortBy==="rsi"?s.rsi14:s.conviction_score;
      return sortDir==="desc"?v(b)-v(a):v(a)-v(b);
    });

  const fmtMkt = (v:number) => {
    if (!v) return "—";
    if (v>=1e12) return `$${(v/1e12).toFixed(1)}T`;
    if (v>=1e9) return `$${(v/1e9).toFixed(0)}B`;
    return `$${(v/1e6).toFixed(0)}M`;
  };

  const convColor = (s:number) => s>=9?"#22c55e":s>=7?"#f59e0b":s>=5?"#60a5fa":"#ef4444";
  const convBar = (s:number) => s>=9?"#22c55e":s>=7?"#f59e0b":s>=5?"#60a5fa":"#ef4444";
  const stageColor = (st:string) => st.includes("Stage 2")?"#22c55e":st.includes("Stage 1")?"#60a5fa":"#ef4444";
  const stageShort = (st:string) => st.includes("Stage 2")?"STG2":st.includes("Stage 1")?"STG1":"STG4";
  const rowBg = (s:Stock, i:number) => !s.check1_pass||!s.check2_pass?"#0a0c14":i%2===0?"#0a1420":"#080e18";
  const rowLeftBar = (s:Stock) => convColor(s.conviction_score);

  const stage2 = stocks.filter(s=>s.technical_stage.includes("Stage 2")).length;
  const highConv = stocks.filter(s=>s.conviction_score>=8).length;
  const avgConv = stocks.length ? (stocks.reduce((s,x)=>s+x.conviction_score,0)/stocks.length).toFixed(1) : "—";

  const copyText = stocks.map(s=>`${s.ticker} $${s.price.toFixed(2)} | ${s.technical_stage} | Conv:${s.conviction_score}/10 | Entry:${s.entry_zone} | RSI:${s.rsi14}`).join("\n");

  const now = new Date();
  const timeStr = now.toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit",timeZone:"America/New_York"}) + " EST";
  const dateStr = now.toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"}).toUpperCase();

  const SortArrow = ({col}:{col:string}) => (
    <span style={{color:sortBy===col?"#f59e0b":"#253345",marginLeft:"3px"}}>
      {sortBy===col?(sortDir==="desc"?"▼":"▲"):"⇅"}
    </span>
  );

  return (
    <div style={{minHeight:"100vh",background:"#060d18",fontFamily:"'SF Mono','Fira Code','Consolas',monospace"}}>

      {/* TOP BAR */}
      <div style={{position:"fixed",top:0,left:0,right:0,zIndex:50,background:"#04080f",borderBottom:"1px solid #1a2535",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0",height:"44px"}}>
        <div style={{display:"flex",alignItems:"center",height:"100%"}}>
          <div style={{background:"#f59e0b",color:"#000",fontSize:"11px",fontWeight:"700",padding:"0 14px",height:"100%",display:"flex",alignItems:"center",letterSpacing:"0.08em"}}>
            ALPHA<span style={{opacity:0.6}}>RESEARCH</span>
          </div>
          {[["dashboard","COMMAND CTR"],["analyzer","ANALYZER"],["watchlist","WATCHLIST"],["portfolio","PORTFOLIO"],["journal","JOURNAL"]].map(([href,label])=>(
            <a key={href} href={"/"+href}
              style={{display:"flex",alignItems:"center",height:"100%",padding:"0 16px",textDecoration:"none",fontSize:"10px",letterSpacing:"0.06em",
                borderBottom:href==="dashboard"?"2px solid #f59e0b":"2px solid transparent",
                color:href==="dashboard"?"#f59e0b":"#4a5568",
                fontWeight:href==="dashboard"?"700":"400"}}>
              {label}
            </a>
          ))}
        </div>
        <div style={{display:"flex",alignItems:"center",gap:"20px",paddingRight:"16px"}}>
          <div style={{display:"flex",alignItems:"center",gap:"5px"}}>
            <div style={{width:"5px",height:"5px",borderRadius:"50%",background:"#22c55e"}}></div>
            <span style={{color:"#22c55e",fontSize:"9px",letterSpacing:"0.08em"}}>LIVE</span>
          </div>
          <span style={{color:"#253345",fontSize:"9px"}}>NYSE • NASDAQ</span>
          <span style={{color:"#253345",fontSize:"9px"}}>{dateStr} {timeStr}</span>
        </div>
      </div>

      <div style={{paddingTop:"44px"}}>

        {/* STAT STRIP */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(6,1fr)",borderBottom:"1px solid #1a2535"}}>
          {[
            {label:"UNIVERSE",value:result?String(result.stocks_scanned):"—",sub:"stocks scanned",color:"#e2e8f0"},
            {label:"QUALIFYING",value:result?String(result.qualifying_count):"—",sub:"pass all checks",color:"#22c55e"},
            {label:"STAGE 2",value:result?String(stage2):"—",sub:"markup phase",color:"#f59e0b"},
            {label:"HIGH CONV",value:result?String(highConv):"—",sub:"score 8–10",color:"#60a5fa"},
            {label:"AVG CONV",value:result?avgConv:"—",sub:"out of 10",color:"#a78bfa"},
            {label:"SCAN TIME",value:result?`${(result.scan_duration_ms/1000).toFixed(1)}s`:"—",sub:"async parallel",color:"#94a3b8"},
          ].map((s,i)=>(
            <div key={s.label} style={{padding:"10px 14px",borderRight:i<5?"1px solid #1a2535":"none",background:"#060d18"}}>
              <div style={{color:"#374151",fontSize:"9px",letterSpacing:"0.08em",marginBottom:"3px"}}>{s.label}</div>
              <div style={{color:s.color,fontSize:"20px",fontWeight:"700",lineHeight:"1"}}>{s.value}</div>
              <div style={{color:"#374151",fontSize:"9px",marginTop:"2px"}}>{s.sub}</div>
            </div>
          ))}
        </div>

        {/* CONTROL BAR */}
        <div style={{background:"#060d18",borderBottom:"1px solid #1a2535",padding:"8px 14px",display:"flex",alignItems:"center",gap:"8px",flexWrap:"wrap"}}>
          <div style={{display:"flex",gap:"1px"}}>
            {[["ALL","ALL"],["Stage 2","STG2"],["Stage 1","STG1"]].map(([v,l])=>(
              <button key={v} onClick={()=>setStageFilter(v)}
                style={{padding:"4px 12px",border:`1px solid ${stageFilter===v?"#22c55e44":"#1a2535"}`,
                  background:stageFilter===v?"#162030":"transparent",
                  color:stageFilter===v?"#22c55e":"#374151",
                  fontSize:"9px",letterSpacing:"0.06em",cursor:"pointer"}}>
                {l}
              </button>
            ))}
          </div>
          <div style={{width:"1px",height:"20px",background:"#1a2535"}}></div>
          <div style={{display:"flex",gap:"1px"}}>
            {[[0,"ALL"],[9,"9-10"],[8,"8+"],[7,"7+"]].map(([v,l])=>(
              <button key={String(v)} onClick={()=>setConvFilter(Number(v))}
                style={{padding:"4px 10px",border:`1px solid ${convFilter===v?"#f59e0b44":"#1a2535"}`,
                  background:convFilter===v?"#1a0f00":"transparent",
                  color:convFilter===v?"#f59e0b":"#374151",
                  fontSize:"9px",letterSpacing:"0.06em",cursor:"pointer"}}>
                {l}
              </button>
            ))}
          </div>
          {result && (
            <>
              <div style={{width:"1px",height:"20px",background:"#1a2535"}}></div>
              <span style={{color:"#374151",fontSize:"9px"}}>{stocks.length} RESULTS</span>
            </>
          )}
          <div style={{flex:1}}></div>
          {result && <CopyButton text={copyText}/>}
          {result && <span style={{color:"#253345",fontSize:"9px"}}>{new Date(result.scan_date).toLocaleTimeString()}</span>}
          <button onClick={runScan} disabled={scanning}
            style={{background:scanning?"#1a1200":"#f59e0b",border:"none",
              color:scanning?"#f59e0b":"#000",fontSize:"10px",fontWeight:"700",
              padding:"6px 20px",cursor:scanning?"not-allowed":"pointer",letterSpacing:"0.08em",
              boxShadow:scanning?"none":"0 0 12px rgba(245,158,11,0.3)"}}>
            {scanning ? `⚡ SCANNING ${elapsed}s...` : "⚡  RUN SCAN"}
          </button>
        </div>

        {/* ERROR */}
        {error && (
          <div style={{margin:"12px 14px",padding:"8px 12px",background:"#1a0505",border:"1px solid #ef444433",color:"#ef4444",fontSize:"10px",letterSpacing:"0.03em"}}>
            ⚠ {error}
          </div>
        )}

        {/* SCANNING STATE */}
        {scanning && (
          <div style={{padding:"60px 0",textAlign:"center"}}>
            <div style={{color:"#f59e0b",fontSize:"11px",letterSpacing:"0.1em",marginBottom:"8px"}}>⚡ SCANNING US MARKET</div>
            <div style={{color:"#22c55e",fontSize:"28px",fontWeight:"700",marginBottom:"8px"}}>{elapsed}s</div>
            <div style={{color:"#253345",fontSize:"9px",letterSpacing:"0.08em"}}>~200 LIQUID US EQUITIES • ASYNC PARALLEL • 2-CHECK QUALIFICATION</div>
            <div style={{display:"flex",justifyContent:"center",gap:"16px",marginTop:"16px"}}>
              {["C1: FUNDAMENTALS","C2: TECHNICAL PHASE","C3: SMART MONEY"].map(c=>(
                <div key={c} style={{padding:"4px 12px",border:"1px solid #1a2535",color:"#374151",fontSize:"9px",letterSpacing:"0.06em"}}>{c}</div>
              ))}
            </div>
          </div>
        )}

        {/* RESULTS TABLE */}
        {!scanning && stocks.length > 0 && (
          <div>
            <div style={{padding:"6px 14px",borderBottom:"1px solid #1a2535",display:"flex",alignItems:"center",gap:"8px",background:"#060d18"}}>
              <span style={{color:"#e2e8f0",fontSize:"10px",fontWeight:"700",letterSpacing:"0.06em"}}>QUALIFYING GEMS</span>
              <span style={{background:"#052e16",color:"#22c55e",fontSize:"9px",padding:"2px 8px",letterSpacing:"0.05em"}}>{stocks.length} PASS</span>
              {result && <span style={{color:"#253345",fontSize:"9px",marginLeft:"auto"}}>DATA: YAHOO FINANCE v8 • {dateStr} • LATENCY: {(result.scan_duration_ms/1000).toFixed(1)}s • NOT FINANCIAL ADVICE</span>}
            </div>
            <div style={{overflowX:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:"11px"}}>
                <thead>
                  <tr style={{background:"#04080f",borderBottom:"1px solid #1a2535"}}>
                    <th style={{padding:"6px 10px",textAlign:"left",color:"#253345",fontSize:"9px",letterSpacing:"0.08em",fontWeight:"600",width:"28px"}}>#</th>
                    <th style={{padding:"6px 10px",textAlign:"left",color:"#253345",fontSize:"9px",letterSpacing:"0.08em",fontWeight:"600",width:"100px"}}>TICKER</th>
                    <th style={{padding:"6px 8px",textAlign:"left",color:"#253345",fontSize:"9px",letterSpacing:"0.08em",fontWeight:"600"}}>COMPANY</th>
                    <th onClick={()=>handleSort("price")} style={{padding:"6px 8px",textAlign:"right",color:sortBy==="price"?"#f59e0b":"#253345",fontSize:"9px",letterSpacing:"0.08em",fontWeight:"600",cursor:"pointer",whiteSpace:"nowrap"}}>PRICE<SortArrow col="price"/></th>
                    <th style={{padding:"6px 8px",textAlign:"right",color:"#253345",fontSize:"9px",letterSpacing:"0.08em",fontWeight:"600"}}>CHG%</th>
                    <th style={{padding:"6px 8px",textAlign:"right",color:"#253345",fontSize:"9px",letterSpacing:"0.08em",fontWeight:"600"}}>MKT CAP</th>
                    <th style={{padding:"6px 8px",textAlign:"center",color:"#253345",fontSize:"9px",letterSpacing:"0.08em",fontWeight:"600"}}>C1</th>
                    <th style={{padding:"6px 8px",textAlign:"center",color:"#253345",fontSize:"9px",letterSpacing:"0.08em",fontWeight:"600"}}>C2</th>
                    <th style={{padding:"6px 8px",textAlign:"center",color:"#253345",fontSize:"9px",letterSpacing:"0.08em",fontWeight:"600"}}>STAGE</th>
                    <th style={{padding:"6px 8px",textAlign:"center",color:"#253345",fontSize:"9px",letterSpacing:"0.08em",fontWeight:"600"}}>MA50</th>
                    <th style={{padding:"6px 8px",textAlign:"center",color:"#253345",fontSize:"9px",letterSpacing:"0.08em",fontWeight:"600"}}>MA200</th>
                    <th style={{padding:"6px 8px",textAlign:"center",color:"#253345",fontSize:"9px",letterSpacing:"0.08em",fontWeight:"600"}}>GC</th>
                    <th onClick={()=>handleSort("rsi")} style={{padding:"6px 8px",textAlign:"center",color:sortBy==="rsi"?"#f59e0b":"#253345",fontSize:"9px",letterSpacing:"0.08em",fontWeight:"600",cursor:"pointer",whiteSpace:"nowrap"}}>RSI<SortArrow col="rsi"/></th>
                    <th style={{padding:"6px 8px",textAlign:"center",color:"#253345",fontSize:"9px",letterSpacing:"0.08em",fontWeight:"600"}}>52W%</th>
                    <th style={{padding:"6px 8px",textAlign:"left",color:"#253345",fontSize:"9px",letterSpacing:"0.08em",fontWeight:"600"}}>ENTRY ZONE</th>
                    <th onClick={()=>handleSort("conviction")} style={{padding:"6px 8px",textAlign:"center",color:sortBy==="conviction"?"#f59e0b":"#253345",fontSize:"9px",letterSpacing:"0.08em",fontWeight:"600",cursor:"pointer",whiteSpace:"nowrap"}}>CONV<SortArrow col="conviction"/></th>
                    <th style={{padding:"6px 8px",textAlign:"center",color:"#253345",fontSize:"9px",letterSpacing:"0.08em",fontWeight:"600"}}></th>
                  </tr>
                </thead>
                <tbody>
                  {stocks.map((s,i)=>{
                    const dimmed = !s.check1_pass || !s.check2_pass;
                    return (
                      <tr key={s.ticker}
                        style={{borderBottom:"1px solid #0d1520",background:rowBg(s,i),opacity:dimmed?0.5:1}}
                        onMouseEnter={e=>{e.currentTarget.style.background="#0f1c2e";}}
                        onMouseLeave={e=>{e.currentTarget.style.background=rowBg(s,i);}}>

                        <td style={{padding:"6px 10px",color:"#253345",fontSize:"9px"}}>{i+1}</td>

                        <td style={{padding:"6px 10px"}}>
                          <div style={{display:"flex",alignItems:"center",gap:"6px"}}>
                            <div style={{width:"3px",height:"32px",background:rowLeftBar(s),borderRadius:"1px",flexShrink:0}}></div>
                            <div>
                              <div style={{color:dimmed?"#4a5568":"#f59e0b",fontWeight:"700",fontSize:"12px",letterSpacing:"0.03em"}}>{s.ticker}</div>
                              <div style={{color:"#253345",fontSize:"8px",letterSpacing:"0.05em"}}>{s.sector?s.sector.substring(0,8).toUpperCase():"—"}</div>
                            </div>
                          </div>
                        </td>

                        <td style={{padding:"6px 8px",color:dimmed?"#374151":"#94a3b8",fontSize:"10px",maxWidth:"160px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{s.company_name}</td>

                        <td style={{padding:"6px 8px",textAlign:"right",color:dimmed?"#374151":"#e2e8f0",fontWeight:"600",fontSize:"11px"}}>${s.price.toFixed(2)}</td>

                        <td style={{padding:"6px 8px",textAlign:"right",fontSize:"10px",color:s.change_pct>0?"#22c55e":s.change_pct<0?"#ef4444":"#4a5568"}}>
                          {s.change_pct!==0?`${s.change_pct>0?"+":""}${s.change_pct.toFixed(1)}%`:"—"}
                        </td>

                        <td style={{padding:"6px 8px",textAlign:"right",color:"#374151",fontSize:"10px"}}>{fmtMkt(s.market_cap)}</td>

                        <td style={{padding:"6px 8px",textAlign:"center"}}>
                          <span style={{background:s.check1_pass?"#052e16":"#1a0505",color:s.check1_pass?"#22c55e":"#ef4444",fontSize:"8px",padding:"2px 5px",letterSpacing:"0.04em"}}>
                            {s.check1_pass?"PASS":"FAIL"}
                          </span>
                        </td>

                        <td style={{padding:"6px 8px",textAlign:"center"}}>
                          <span style={{background:s.check2_pass?"#052e16":"#1a0505",color:s.check2_pass?"#22c55e":"#ef4444",fontSize:"8px",padding:"2px 5px",letterSpacing:"0.04em"}}>
                            {s.check2_pass?"PASS":"FAIL"}
                          </span>
                        </td>

                        <td style={{padding:"6px 8px",textAlign:"center"}}>
                          <span style={{color:stageColor(s.technical_stage),fontSize:"9px",letterSpacing:"0.04em",fontWeight:"600"}}>
                            {stageShort(s.technical_stage)}
                          </span>
                        </td>

                        <td style={{padding:"6px 8px",textAlign:"center",color:"#374151",fontSize:"9px",fontFamily:"monospace"}}>
                          {s.ma50>0?`$${s.ma50.toFixed(0)}`:"—"}
                        </td>

                        <td style={{padding:"6px 8px",textAlign:"center",color:"#374151",fontSize:"9px",fontFamily:"monospace"}}>
                          {s.ma200>0?`$${s.ma200.toFixed(0)}`:"—"}
                        </td>

                        <td style={{padding:"6px 8px",textAlign:"center"}}>
                          {s.golden_cross?<span style={{color:"#22c55e",fontSize:"11px"}}>✓</span>:<span style={{color:"#1a2535"}}>—</span>}
                        </td>

                        <td style={{padding:"6px 8px",textAlign:"center"}}>
                          <span style={{fontSize:"10px",fontWeight:"600",color:s.rsi14>75?"#ef4444":s.rsi14>60?"#f59e0b":s.rsi14>40?"#22c55e":"#60a5fa"}}>
                            {s.rsi14>0?s.rsi14.toFixed(0):"—"}
                          </span>
                        </td>

                        <td style={{padding:"6px 8px",textAlign:"center"}}>
                          <div style={{display:"flex",alignItems:"center",gap:"3px",justifyContent:"center"}}>
                            <div style={{width:"28px",height:"3px",background:"#1a2535",borderRadius:"1px",overflow:"hidden"}}>
                              <div style={{height:"100%",width:`${s.range_pct}%`,background:s.range_pct>60?"#22c55e":s.range_pct>40?"#f59e0b":"#ef4444"}}></div>
                            </div>
                            <span style={{fontSize:"8px",color:"#374151"}}>{s.range_pct.toFixed(0)}%</span>
                          </div>
                        </td>

                        <td style={{padding:"6px 8px",color:"#60a5fa",fontSize:"9px",fontFamily:"monospace",whiteSpace:"nowrap"}}>{s.entry_zone||"—"}</td>

                        <td style={{padding:"6px 8px",textAlign:"center"}}>
                          <div style={{display:"flex",alignItems:"center",gap:"5px",justifyContent:"center"}}>
                            <div style={{width:"28px",height:"3px",background:"#1a2535",borderRadius:"1px",overflow:"hidden"}}>
                              <div style={{height:"100%",width:`${s.conviction_score*10}%`,background:convBar(s.conviction_score)}}></div>
                            </div>
                            <span style={{color:convColor(s.conviction_score),fontWeight:"700",fontSize:"12px",minWidth:"16px"}}>{s.conviction_score}</span>
                          </div>
                        </td>

                        <td style={{padding:"6px 8px"}}>
                          <div style={{display:"flex",gap:"3px"}}>
                            <button onClick={()=>router.push("/analyzer?ticker="+s.ticker+"&market="+s.market)}
                              style={{background:"transparent",border:"1px solid #253345",color:"#4a5568",fontSize:"8px",padding:"2px 6px",cursor:"pointer",letterSpacing:"0.04em"}}>
                              VIEW
                            </button>
                            <button onClick={()=>addToWatchlist(s)}
                              style={{background:"transparent",border:"1px solid #1a3a1a",color:"#22c55e",fontSize:"8px",padding:"2px 6px",cursor:"pointer",letterSpacing:"0.04em"}}>
                              +W
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* LEGEND + DATA FOOTER */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",borderTop:"1px solid #1a2535"}}>
              <div style={{padding:"10px 14px",borderRight:"1px solid #1a2535"}}>
                <div style={{color:"#253345",fontSize:"8px",letterSpacing:"0.08em",marginBottom:"6px"}}>CONVICTION TIER LEGEND</div>
                <div style={{display:"flex",flexDirection:"column",gap:"3px"}}>
                  {[["9–10","#22c55e","MAXIMUM — C1+C2 pass, Stage 2, golden cross"],["7–8","#f59e0b","HIGH — qualifying, watch for entry"],["5–6","#60a5fa","MODERATE — Stage 1, building base"],["1–4","#ef4444","AVOID — check failure or Stage 3/4"]].map(([tier,color,desc])=>(
                    <div key={tier} style={{display:"flex",alignItems:"center",gap:"8px"}}>
                      <div style={{width:"3px",height:"14px",background:color,borderRadius:"1px"}}></div>
                      <span style={{color:color,fontSize:"9px",fontFamily:"monospace",width:"28px"}}>{tier}</span>
                      <span style={{color:"#374151",fontSize:"9px"}}>{desc}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{padding:"10px 14px"}}>
                <div style={{color:"#253345",fontSize:"8px",letterSpacing:"0.08em",marginBottom:"6px"}}>COLUMN GUIDE</div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"3px"}}>
                  {[["C1","Fundamental check (revenue, margins, valuation)"],["C2","Technical phase check (Stage 1 or 2)"],["STG2","Weinstein Stage 2 Markup confirmed"],["STG1","Stage 1 Accumulation (pre-breakout)"],["GC","Golden Cross: 50-day MA > 200-day MA"],["RSI","Relative Strength Index (14-day)"],["52W%","Position within 52-week range"],["CONV","Conviction score 1–10"]].map(([k,v])=>(
                    <div key={k} style={{display:"flex",gap:"6px"}}>
                      <span style={{color:"#4a5568",fontSize:"8px",fontWeight:"700",minWidth:"32px"}}>{k}</span>
                      <span style={{color:"#253345",fontSize:"8px"}}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* EMPTY STATE */}
        {!scanning && !result && (
          <div style={{padding:"80px 0",textAlign:"center"}}>
            <div style={{color:"#1a2535",fontSize:"48px",marginBottom:"16px",fontFamily:"sans-serif"}}>⚡</div>
            <div style={{color:"#253345",fontSize:"11px",letterSpacing:"0.1em",marginBottom:"6px"}}>COMMAND CENTER READY</div>
            <div style={{color:"#1a2535",fontSize:"9px",letterSpacing:"0.08em",marginBottom:"24px"}}>~200 LIQUID US EQUITIES • 2-CHECK QUALIFICATION • FUNDAMENTAL + TECHNICAL</div>
            <div style={{display:"flex",justifyContent:"center",gap:"0",maxWidth:"480px",margin:"0 auto"}}>
              {[["CHECK 01","FUNDAMENTALS","Revenue · Margins · Valuation · PEG"],["CHECK 02","TECHNICALS","Weinstein Stage 1 or Stage 2"],["CHECK 03","CONVICTION","1–10 institutional score"]].map((c,i)=>(
                <div key={c[0]} style={{flex:1,padding:"14px 12px",border:"1px solid #1a2535",borderRight:i<2?"none":"1px solid #1a2535",textAlign:"left"}}>
                  <div style={{color:"#f59e0b",fontSize:"8px",letterSpacing:"0.08em",marginBottom:"4px"}}>{c[0]}</div>
                  <div style={{color:"#374151",fontSize:"10px",fontWeight:"600",marginBottom:"3px"}}>{c[1]}</div>
                  <div style={{color:"#253345",fontSize:"8px"}}>{c[2]}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* NO RESULTS */}
        {!scanning && result && stocks.length===0 && (
          <div style={{padding:"50px 0",textAlign:"center"}}>
            <div style={{color:"#374151",fontSize:"10px",letterSpacing:"0.08em",marginBottom:"6px"}}>NO RESULTS MATCH FILTERS</div>
            <div style={{color:"#253345",fontSize:"9px"}}>Adjust conviction or stage filters above</div>
          </div>
        )}

      </div>
    </div>
  );
}