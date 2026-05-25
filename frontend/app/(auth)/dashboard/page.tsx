"use client";
import { useState } from "react";
import Navigation from "../../components/common/Navigation";
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

export default function Dashboard() {
  const router = useRouter();
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [market] = useState("US");
  const [minConv, setMinConv] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [sortBy, setSortBy] = useState<string>("conviction");
  const [sortDir, setSortDir] = useState<"desc"|"asc">("desc");
  const [stageFilter, setStageFilter] = useState("ALL");

  const gold = "#f59e0b"; const green = "#10b981"; const red = "#ef4444";
  const blue = "#60a5fa"; const steel = "#94a3b8"; const purple = "#a78bfa";

  const runScan = async () => {
    setScanning(true); setError(null);
    const start = Date.now();
    const timer = setInterval(() => setElapsed(Math.floor((Date.now()-start)/1000)), 1000);
    try {
      const res = await fetch("http://localhost:8000/scan/", {
        method: "POST", headers: {"Content-Type":"application/json"},
        body: JSON.stringify({market, notify_telegram: false}),
      });
      if (!res.ok) throw new Error("API error " + res.status);
      setResult(await res.json());
    } catch(e: unknown) {
      setError(e instanceof Error ? e.message : "Scan failed");
    } finally { clearInterval(timer); setElapsed(0); setScanning(false); }
  };

  const handleSort = (col: string) => {
    if (sortBy === col) setSortDir(d => d==="desc"?"asc":"desc");
    else { setSortBy(col); setSortDir("desc"); }
  };

  const stocks = (result?.qualifying_stocks||[])
    .filter(s => minConv===0 || s.conviction_score>=minConv)
    .filter(s => stageFilter==="ALL" || s.technical_stage.includes(stageFilter))
    .sort((a,b) => {
      const v = (s:Stock) => sortBy==="conviction" ? s.conviction_score : sortBy==="price" ? s.price : sortBy==="mktcap" ? s.market_cap : sortBy==="rsi" ? s.rsi14 : s.conviction_score;
      return sortDir==="desc" ? v(b)-v(a) : v(a)-v(b);
    });

  const fmt = (v:number, sym="$") => {
    if (!v) return "N/A";
    if (v>=1e12) return `${sym}${(v/1e12).toFixed(2)}T`;
    if (v>=1e9)  return `${sym}${(v/1e9).toFixed(1)}B`;
    if (v>=1e6)  return `${sym}${(v/1e6).toFixed(0)}M`;
    return `${sym}${v.toFixed(2)}`;
  };

  const pct = (v:number) => v!==0 ? `${v>0?"+":""}${(v*100).toFixed(1)}%` : "N/A";
  const convColor = (s:number) => s>=9?green:s>=7?gold:s>=5?"#fb923c":red;
  const stageColor = (st:string) => st.includes("Stage 2")?green:st.includes("Stage 1")?blue:red;
  const stageBg = (st:string) => st.includes("Stage 2")?"rgba(16,185,129,0.12)":st.includes("Stage 1")?"rgba(96,165,250,0.12)":"rgba(239,68,68,0.12)";
  const rsiColor = (r:number) => r<30?red:r>75?red:r>60?gold:green;
  const SortArrow = ({col}:{col:string}) => <span style={{color:sortBy===col?gold:"#334155"}}>{sortBy===col?(sortDir==="desc"?" ↓":" ↑"):" ·"}</span>;

  const avgConv = stocks.length?(stocks.reduce((s,x)=>s+x.conviction_score,0)/stocks.length).toFixed(1):"—";
  const stage2 = stocks.filter(s=>s.technical_stage.includes("Stage 2")).length;
  const gcCount = stocks.filter(s=>s.golden_cross).length;
  const highConv = stocks.filter(s=>s.conviction_score>=8).length;

  return (
    <div style={{minHeight:"100vh",background:"linear-gradient(135deg,#060820 0%,#0d1145 50%,#060820 100%)"}}>
      <Navigation/>
      <div style={{maxWidth:"1700px",margin:"0 auto",padding:"68px 16px 40px"}}>

        <div style={{marginBottom:"16px"}}>
          <h1 style={{fontSize:"22px",fontWeight:"900",color:"#f1f5f9",marginBottom:"2px"}}>
            Institutional Equity <span style={{color:gold}}>Command Center</span>
          </h1>
          <p style={{color:"#334155",fontSize:"11px"}}>Full US market scan · 2-Check qualification · Fundamental + Technical phase analysis</p>
        </div>

        {result && (
          <div style={{display:"grid",gridTemplateColumns:"repeat(6,1fr)",gap:"8px",marginBottom:"12px"}}>
            {[
              {label:"Universe",   value:String(result.stocks_scanned)+" stocks", color:blue},
              {label:"Qualifying", value:String(result.qualifying_count)+" gems",  color:green},
              {label:"Stage 2",    value:String(stage2)+" markup",                 color:gold},
              {label:"Golden X",   value:String(gcCount)+" crosses",               color:purple},
              {label:"High Conv",  value:String(highConv)+" (8+)",                 color:"#fb923c"},
              {label:"Avg Conv",   value:avgConv+"/10",                            color:"#f1f5f9"},
            ].map(s=>(
              <div key={s.label} style={{background:"linear-gradient(145deg,#0f172a,#1e293b)",border:"1px solid #1e293b",borderRadius:"10px",padding:"10px 14px"}}>
                <div style={{fontSize:"15px",fontWeight:"800",color:s.color,fontFamily:"monospace"}}>{s.value}</div>
                <div style={{fontSize:"10px",color:"#475569",textTransform:"uppercase",letterSpacing:"0.05em",marginTop:"1px"}}>{s.label}</div>
              </div>
            ))}
          </div>
        )}

        <div style={{background:"linear-gradient(145deg,#0f172a,#1e293b)",border:"1px solid #1e293b",borderRadius:"12px",padding:"12px 16px",marginBottom:"12px",display:"flex",alignItems:"center",gap:"8px",flexWrap:"wrap"}}>
          <div style={{display:"flex",gap:"4px"}}>
            {[["ALL","All"],["Stage 2","Stage 2"],["Stage 1","Stage 1"]].map(([v,l])=>(
              <button key={v} onClick={()=>setStageFilter(v)}
                style={{padding:"5px 12px",borderRadius:"7px",fontSize:"11px",fontWeight:"600",cursor:"pointer",border:"1px solid",
                  background:stageFilter===v?"rgba(16,185,129,0.15)":"transparent",
                  color:stageFilter===v?green:"#64748b",
                  borderColor:stageFilter===v?"rgba(16,185,129,0.35)":"#1e293b"}}>
                {l}
              </button>
            ))}
          </div>
          <div style={{display:"flex",gap:"4px"}}>
            {[[0,"All"],[9,"🔥 9+"],[8,"⚡ 8+"],[7,"📊 7+"]].map(([v,l])=>(
              <button key={String(v)} onClick={()=>setMinConv(Number(v))}
                style={{padding:"5px 12px",borderRadius:"7px",fontSize:"11px",fontWeight:"600",cursor:"pointer",border:"1px solid",
                  background:minConv===v?"rgba(245,158,11,0.15)":"transparent",
                  color:minConv===v?gold:"#64748b",
                  borderColor:minConv===v?"rgba(245,158,11,0.35)":"#1e293b"}}>
                {l}
              </button>
            ))}
          </div>
          {result&&<div style={{fontSize:"11px",color:"#475569"}}>Showing <span style={{color:green,fontWeight:"700"}}>{stocks.length}</span> of {result.qualifying_count}</div>}
          <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:"8px"}}>
            {result&&<span style={{fontSize:"11px",color:"#334155"}}>{(result.scan_duration_ms/1000).toFixed(1)}s · {new Date(result.scan_date).toLocaleTimeString()}</span>}
            <button onClick={runScan} disabled={scanning}
              style={{padding:"9px 28px",borderRadius:"9px",fontWeight:"800",fontSize:"13px",cursor:scanning?"not-allowed":"pointer",border:"none",
                background:scanning?"rgba(245,158,11,0.3)":"linear-gradient(135deg,#f59e0b,#d97706)",
                color:"#060820",boxShadow:scanning?"none":"0 0 20px rgba(245,158,11,0.3)",minWidth:"140px"}}>
              {scanning?`⚡ ${elapsed}s...`:"⚡ RUN SCAN"}
            </button>
          </div>
        </div>

        {error&&<div style={{background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.3)",borderRadius:"10px",padding:"10px 14px",marginBottom:"12px",color:red,fontSize:"12px"}}>{error}</div>}

        {scanning&&(
          <div style={{textAlign:"center",padding:"60px 0"}}>
            <div style={{fontSize:"48px",marginBottom:"14px"}}>⚡</div>
            <div style={{fontSize:"17px",fontWeight:"700",color:gold,marginBottom:"6px"}}>Scanning US Market...</div>
            <div style={{color:"#475569",fontSize:"12px"}}>~200 liquid stocks · async parallel · {elapsed}s elapsed</div>
          </div>
        )}

        {!scanning&&stocks.length>0&&(
          <div style={{background:"linear-gradient(145deg,#0f172a,#1e293b)",border:"1px solid #1e293b",borderRadius:"12px",overflow:"hidden"}}>
            <div style={{padding:"10px 16px",borderBottom:"1px solid #1e293b",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
                <span style={{fontWeight:"700",color:"#f1f5f9",fontSize:"12px"}}>Qualifying Gems</span>
                <span style={{padding:"2px 8px",borderRadius:"10px",fontSize:"10px",fontWeight:"700",background:"rgba(16,185,129,0.15)",color:green,border:"1px solid rgba(16,185,129,0.3)"}}>
                  {stocks.length} PASS
                </span>
              </div>
            </div>
            <div style={{overflowX:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:"11px"}}>
                <thead>
                  <tr style={{background:"rgba(6,8,32,0.9)"}}>
                    {[
                      {l:"#",        w:"32px",  s:null},
                      {l:"Ticker",   w:"80px",  s:null},
                      {l:"Company",  w:"150px", s:null},
                      {l:"Price",    w:"80px",  s:"price"},
                      {l:"Chg%",     w:"60px",  s:null},
                      {l:"Mkt Cap",  w:"90px",  s:"mktcap"},
                      {l:"Rev Gr",   w:"70px",  s:null},
                      {l:"Margin",   w:"65px",  s:null},
                      {l:"PE",       w:"55px",  s:null},
                      {l:"Stage",    w:"130px", s:null},
                      {l:"MA50",     w:"70px",  s:null},
                      {l:"MA200",    w:"70px",  s:null},
                      {l:"GC",       w:"40px",  s:null},
                      {l:"RSI",      w:"55px",  s:"rsi"},
                      {l:"52W%",     w:"55px",  s:null},
                      {l:"Entry Zone",w:"140px",s:null},
                      {l:"Conv",     w:"100px", s:"conviction"},
                      {l:"Action",   w:"80px",  s:null},
                    ].map(h=>(
                      <th key={h.l} onClick={()=>h.s&&handleSort(h.s)}
                        style={{padding:"8px 10px",textAlign:"left",fontSize:"9px",fontWeight:"700",
                          color:h.s?(sortBy===h.s?gold:"#475569"):"#334155",
                          textTransform:"uppercase",letterSpacing:"0.06em",
                          borderBottom:"1px solid #1e293b",whiteSpace:"nowrap",
                          minWidth:h.w,cursor:h.s?"pointer":"default",userSelect:"none"}}>
                        {h.l}{h.s&&<SortArrow col={h.s}/>}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {stocks.map((s,i)=>{
                    const isGC = s.golden_cross;
                    const isHighConv = s.conviction_score>=8;
                    return (
                      <tr key={s.ticker}
                        style={{borderBottom:"1px solid rgba(30,41,59,0.3)",background:isHighConv?"rgba(245,158,11,0.015)":"transparent"}}
                        onMouseEnter={e=>{e.currentTarget.style.background="rgba(245,158,11,0.04)";}}
                        onMouseLeave={e=>{e.currentTarget.style.background=isHighConv?"rgba(245,158,11,0.015)":"transparent";}}>

                        <td style={{padding:"9px 10px",color:"#334155",fontFamily:"monospace",fontSize:"10px"}}>{i+1}</td>

                        <td style={{padding:"9px 10px"}}>
                          <div style={{display:"flex",alignItems:"center",gap:"5px"}}>
                            <span style={{fontSize:"11px"}}>🇺🇸</span>
                            <span style={{fontFamily:"monospace",fontWeight:"800",color:gold,fontSize:"12px"}}>{s.ticker}</span>
                          </div>
                          <div style={{fontSize:"8px",color:"#334155",marginTop:"1px"}}>{s.data_quality}</div>
                        </td>

                        <td style={{padding:"9px 10px"}}>
                          <div style={{color:"#e2e8f0",fontWeight:"500",fontSize:"11px",maxWidth:"140px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{s.company_name}</div>
                          {s.sector&&<div style={{fontSize:"8px",color:"#475569",marginTop:"1px"}}>{s.sector}</div>}
                        </td>

                        <td style={{padding:"9px 10px"}}>
                          <span style={{fontFamily:"monospace",fontWeight:"700",color:"#f1f5f9",fontSize:"12px"}}>${s.price.toFixed(2)}</span>
                        </td>

                        <td style={{padding:"9px 10px"}}>
                          <span style={{fontSize:"11px",fontFamily:"monospace",color:s.change_pct>0?green:s.change_pct<0?red:steel}}>
                            {s.change_pct!==0?`${s.change_pct>0?"+":""}${s.change_pct.toFixed(2)}%`:"—"}
                          </span>
                        </td>

                        <td style={{padding:"9px 10px"}}>
                          <span style={{fontFamily:"monospace",color:s.market_cap>0?steel:"#334155",fontSize:"11px"}}>{fmt(s.market_cap)}</span>
                        </td>

                        <td style={{padding:"9px 10px"}}>
                          <span style={{fontSize:"11px",fontFamily:"monospace",color:s.revenue_growth>0.15?green:s.revenue_growth>0?gold:steel}}>
                            {s.revenue_growth!==0?pct(s.revenue_growth):"N/A"}
                          </span>
                        </td>

                        <td style={{padding:"9px 10px"}}>
                          <span style={{fontSize:"11px",fontFamily:"monospace",color:s.net_margin>0.15?green:s.net_margin>0?gold:steel}}>
                            {s.net_margin!==0?`${(s.net_margin*100).toFixed(1)}%`:"N/A"}
                          </span>
                        </td>

                        <td style={{padding:"9px 10px"}}>
                          <span style={{fontSize:"11px",fontFamily:"monospace",color:s.pe_ratio>0&&s.pe_ratio<30?green:s.pe_ratio>0?gold:steel}}>
                            {s.pe_ratio>0?s.pe_ratio.toFixed(1):"N/A"}
                          </span>
                        </td>

                        <td style={{padding:"9px 10px"}}>
                          <span style={{padding:"2px 8px",borderRadius:"10px",fontSize:"9px",fontWeight:"600",
                            background:stageBg(s.technical_stage),color:stageColor(s.technical_stage),
                            border:`1px solid ${stageColor(s.technical_stage)}33`,whiteSpace:"nowrap"}}>
                            {s.technical_stage}
                          </span>
                        </td>

                        <td style={{padding:"9px 10px"}}>
                          <span style={{fontFamily:"monospace",fontSize:"10px",color:s.ma50>0?steel:"#334155"}}>
                            {s.ma50>0?`$${s.ma50.toFixed(0)}`:"N/A"}
                          </span>
                        </td>

                        <td style={{padding:"9px 10px"}}>
                          <span style={{fontFamily:"monospace",fontSize:"10px",color:s.ma200>0?steel:"#334155"}}>
                            {s.ma200>0?`$${s.ma200.toFixed(0)}`:"N/A"}
                          </span>
                        </td>

                        <td style={{padding:"9px 10px",textAlign:"center"}}>
                          {isGC?<span style={{color:green,fontSize:"14px"}}>✓</span>:<span style={{color:"#334155",fontSize:"11px"}}>—</span>}
                        </td>

                        <td style={{padding:"9px 10px"}}>
                          <span style={{fontFamily:"monospace",fontSize:"11px",fontWeight:"700",color:rsiColor(s.rsi14)}}>
                            {s.rsi14>0?s.rsi14.toFixed(0):"—"}
                          </span>
                        </td>

                        <td style={{padding:"9px 10px"}}>
                          <div style={{display:"flex",alignItems:"center",gap:"4px"}}>
                            <div style={{width:"36px",height:"3px",background:"#1e293b",borderRadius:"2px",overflow:"hidden"}}>
                              <div style={{height:"100%",width:`${s.range_pct}%`,background:s.range_pct>60?green:s.range_pct>40?gold:red,borderRadius:"2px"}}></div>
                            </div>
                            <span style={{fontSize:"10px",color:steel,fontFamily:"monospace"}}>{s.range_pct.toFixed(0)}%</span>
                          </div>
                        </td>

                        <td style={{padding:"9px 10px"}}>
                          <span style={{fontSize:"10px",color:blue,fontFamily:"monospace",whiteSpace:"nowrap"}}>{s.entry_zone}</span>
                        </td>

                        <td style={{padding:"9px 10px"}}>
                          <div style={{display:"flex",alignItems:"center",gap:"6px"}}>
                            <span style={{fontFamily:"monospace",fontWeight:"900",fontSize:"15px",color:convColor(s.conviction_score),minWidth:"16px"}}>{s.conviction_score}</span>
                            <div style={{flex:1,minWidth:"45px"}}>
                              <div style={{height:"3px",background:"#1e293b",borderRadius:"2px",overflow:"hidden"}}>
                                <div style={{height:"100%",width:`${s.conviction_score*10}%`,background:`linear-gradient(90deg,#10b981,${convColor(s.conviction_score)})`,borderRadius:"2px"}}></div>
                              </div>
                              <div style={{fontSize:"8px",color:"#475569",marginTop:"1px"}}>
                                {s.conviction_score>=9?"Maximum":s.conviction_score>=8?"Very High":s.conviction_score>=7?"High":s.conviction_score>=6?"Above Avg":"Moderate"}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td style={{padding:"9px 10px"}}>
                          <button onClick={()=>router.push("/analyzer?ticker="+s.ticker+"&market="+s.market)}
                            style={{padding:"5px 10px",borderRadius:"6px",fontSize:"10px",fontWeight:"700",cursor:"pointer",
                              border:"1px solid rgba(245,158,11,0.3)",background:"rgba(245,158,11,0.1)",color:gold,whiteSpace:"nowrap"}}>
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

        {!scanning&&!result&&(
          <div style={{textAlign:"center",padding:"60px 0"}}>
            <div style={{fontSize:"48px",marginBottom:"14px"}}>⚡</div>
            <h2 style={{fontSize:"18px",fontWeight:"700",color:"#f1f5f9",marginBottom:"6px"}}>Ready to Scan US Market</h2>
            <p style={{color:"#475569",fontSize:"12px",maxWidth:"380px",margin:"0 auto 20px"}}>
              Scans ~200 liquid US stocks. Applies 2-Check qualification. Finds the gems.
            </p>
          </div>
        )}

        <div style={{marginTop:"24px",textAlign:"center",color:"#1e293b",fontSize:"10px"}}>
          AlphaResearch v1.0 · Not financial advice · Data via Yahoo Finance · For institutional use only
        </div>
      </div>
    </div>
  );
}