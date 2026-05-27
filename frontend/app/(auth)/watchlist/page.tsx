"use client";
import React, { useState, useEffect } from "react";

const BACKEND = "https://alpha-research-center-backend.onrender.com";
const SECTORS = ["Technology","Healthcare","Financials","Energy","Industrials","Consumer","Real Estate","Materials","Utilities","Communication","AI Infrastructure"];
const THEMES = ["AI Infrastructure","Defence","Energy Transition","Healthcare AI","Crypto","EV","Semiconductors","Cloud","Biotech","Value","Growth","Dividend"];

interface WatchItem {
  id: string; ticker: string; market: string; sector: string;
  theme: string; notes: string; added: string; score: number;
  c1_pass: boolean; c2_pass: boolean; stage: string;
  rsi: number; entry_zone: string; graduated: boolean;
}

function daysSince(d: string) {
  return Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
}

function convColor(s: number) {
  return s >= 9 ? "#22c55e" : s >= 7 ? "#f59e0b" : s >= 5 ? "#60a5fa" : s > 0 ? "#ef4444" : "#253345";
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = React.useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2500); });
  };
  return (
    <button onClick={copy} style={{background:copied?"rgba(34,197,94,0.15)":"transparent",border:`1px solid ${copied?"#22c55e44":"#253345"}`,color:copied?"#22c55e":"#4a5568",fontSize:"9px",padding:"3px 8px",cursor:"pointer",letterSpacing:"0.05em"}}>
      {copied ? "✓ COPIED" : "⧉ COPY"}
    </button>
  );
}

export default function Watchlist() {
  const [items, setItems] = useState<WatchItem[]>([]);
  const [ticker, setTicker] = useState("");
  const [market, setMarket] = useState("US");
  const [sector, setSector] = useState("");
  const [theme, setTheme] = useState("");
  const [notes, setNotes] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState<"score"|"added"|"ticker">("score");
  const [msg, setMsg] = useState<{text:string;ok:boolean}|null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<string|null>(null);
  const [scoring, setScoring] = useState(false);
  const [autoFilling, setAutoFilling] = useState(false);

  useEffect(() => {
    try { const s = localStorage.getItem("alpha_watchlist_v3"); if (s) setItems(JSON.parse(s)); } catch(e) {}
  }, []);

  const persist = (list: WatchItem[]) => {
    setItems(list);
    try { localStorage.setItem("alpha_watchlist_v3", JSON.stringify(list)); } catch(e) {}
  };

  const autoFill = async (t: string) => {
    if (!t) return;
    setAutoFilling(true);
    try {
      const res = await fetch(`${BACKEND}/analyze/ticker-info`, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ticker:t.toUpperCase(),market}) });
      if (res.ok) { const d = await res.json(); if(d.sector) setSector(d.sector); if(d.theme) setTheme(d.theme); if(d.notes) setNotes(d.notes); }
    } catch(e) {}
    setAutoFilling(false);
  };

  const addItem = () => {
    if (!ticker.trim()) { setMsg({text:"ENTER TICKER SYMBOL",ok:false}); return; }
    const t = ticker.trim().toUpperCase();
    if (items.find(i => i.ticker === t && i.market === market)) { setMsg({text:`${t} ALREADY IN WATCHLIST`,ok:false}); return; }
    const item: WatchItem = { id:Date.now().toString(), ticker:t, market, sector, theme, notes, added:new Date().toISOString().split("T")[0], score:0, c1_pass:false, c2_pass:false, stage:"", rsi:0, entry_zone:"", graduated:false };
    persist([...items, item]);
    setMsg({text:`${t} ADDED TO WATCHLIST`,ok:true});
    setTicker(""); setSector(""); setTheme(""); setNotes("");
  };

  const remove = (id: string) => persist(items.filter(i => i.id !== id));

  const scoreAll = async () => {
    if (!items.length) return;
    setScoring(true);
    setMsg({text:"SCORING AGAINST 3-CHECK CRITERIA...",ok:true});
    try {
      const res = await fetch(`${BACKEND}/scan/`, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({market:"US", tickers:items.map(i=>i.ticker), notify_telegram:false}) });
      if (res.ok) {
        const data = await res.json();
        const map: Record<string,any> = {};
        (data.qualifying_stocks||[]).forEach((s:any) => { map[s.ticker] = s; });
        const updated = items.map(item => {
          const q = map[item.ticker];
          return q ? {...item, score:q.conviction_score, c1_pass:q.check1_pass, c2_pass:q.check2_pass, stage:q.technical_stage, rsi:q.rsi14||0, entry_zone:q.entry_zone||""} : {...item, score:item.score||0};
        });
        persist(updated);
        const qual = updated.filter(i=>i.c1_pass&&i.c2_pass).length;
        setMsg({text:`SCORING COMPLETE — ${qual} QUALIFYING / ${items.length} TOTAL`,ok:true});
      }
    } catch(e) { setMsg({text:"SCORING FAILED — BACKEND MAY BE WAKING UP",ok:false}); }
    setScoring(false);
  };

  const analyzeAll = async () => {
    if (!items.length) { setMsg({text:"ADD STOCKS FIRST",ok:false}); return; }
    setAnalyzing(true); setAnalysis(null); setMsg(null);
    try {
      const res = await fetch(`${BACKEND}/analyze/watchlist`, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({stocks:items.map(i=>({ticker:i.ticker,market:i.market,sector:i.sector||"",theme:i.theme||"",notes:i.notes||"",score:i.score,days_watching:daysSince(i.added)}))}) });
      if (!res.ok) throw new Error("Backend error");
      const d = await res.json();
      setAnalysis(d.analysis || "Analysis unavailable");
    } catch(e) {
      setAnalysis("Analysis unavailable — backend may be waking up. Try again in 60 seconds.");
    }
    setAnalyzing(false);
  };

  const graduateToPortfolio = (item: WatchItem) => {
    try {
      const existing = JSON.parse(localStorage.getItem("alpha_positions")||"[]");
      if (existing.find((p:any) => p.ticker === item.ticker)) { setMsg({text:`${item.ticker} ALREADY IN PORTFOLIO`,ok:false}); return; }
      const pos = { id:Date.now().toString(), ticker:item.ticker, market:item.market, entry_date:new Date().toISOString().split("T")[0], entry_price:0, shares:0, stop_level:0, target_price:0, notes:`From watchlist. ${item.notes||""} ${item.stage||""}` };
      localStorage.setItem("alpha_positions", JSON.stringify([...existing, pos]));
      persist(items.map(i => i.id===item.id ? {...i, graduated:true} : i));
      setMsg({text:`${item.ticker} MOVED TO PORTFOLIO — UPDATE ENTRY PRICE`,ok:true});
    } catch(e) { setMsg({text:"FAILED TO GRADUATE",ok:false}); }
  };

  const sorted = [...items]
    .filter(i => (!search || i.ticker.includes(search.toUpperCase()) || (i.sector||"").toLowerCase().includes(search.toLowerCase())) && (filter==="ALL" || i.market===filter))
    .sort((a,b) => sortBy==="score" ? b.score-a.score : sortBy==="added" ? new Date(b.added).getTime()-new Date(a.added).getTime() : a.ticker.localeCompare(b.ticker));

  const now = new Date();
  const timeStr = now.toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit",timeZone:"America/New_York"}) + " EST";
  const dateStr = now.toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"}).toUpperCase();
  const qualified = items.filter(i=>i.c1_pass&&i.c2_pass).length;
  const avgScore = items.length ? (items.reduce((s,i)=>s+i.score,0)/items.length).toFixed(1) : "—";

  return (
    <div style={{minHeight:"100vh",background:"#060d18",fontFamily:"'SF Mono','Fira Code','Consolas',monospace",color:"#e2e8f0"}}>

      {/* TOP BAR */}
      <div style={{position:"fixed",top:0,left:0,right:0,zIndex:50,background:"#04080f",borderBottom:"1px solid #1a2535",display:"flex",alignItems:"center",justifyContent:"space-between",height:"44px"}}>
        <div style={{display:"flex",alignItems:"center",height:"100%"}}>
          <div style={{background:"#f59e0b",color:"#000",fontSize:"11px",fontWeight:"700",padding:"0 14px",height:"100%",display:"flex",alignItems:"center",letterSpacing:"0.08em"}}>ALPHA<span style={{opacity:0.6}}>RESEARCH</span></div>
          {[["dashboard","COMMAND CTR"],["analyzer","ANALYZER"],["watchlist","WATCHLIST"],["portfolio","PORTFOLIO"],["journal","JOURNAL"]].map(([href,label])=>(
            <a key={href} href={"/"+href} style={{display:"flex",alignItems:"center",height:"100%",padding:"0 14px",textDecoration:"none",fontSize:"10px",letterSpacing:"0.06em",borderBottom:href==="watchlist"?"2px solid #f59e0b":"2px solid transparent",color:href==="watchlist"?"#f59e0b":"#4a5568",fontWeight:href==="watchlist"?"700":"400"}}>{label}</a>
          ))}
        </div>
        <div style={{display:"flex",alignItems:"center",gap:"16px",paddingRight:"16px"}}>
          <div style={{display:"flex",alignItems:"center",gap:"4px"}}><div style={{width:"5px",height:"5px",borderRadius:"50%",background:"#22c55e"}}></div><span style={{color:"#22c55e",fontSize:"9px",letterSpacing:"0.08em"}}>LIVE</span></div>
          <span style={{color:"#253345",fontSize:"9px"}}>{dateStr} {timeStr}</span>
        </div>
      </div>

      <div style={{paddingTop:"44px"}}>

        {/* STAT STRIP */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",borderBottom:"1px solid #1a2535"}}>
          {[
            {label:"MONITORED",value:String(items.length),sub:"total stocks",color:"#e2e8f0"},
            {label:"QUALIFYING",value:String(qualified),sub:"pass 3-checks",color:"#22c55e"},
            {label:"AVG SCORE",value:avgScore+"/10",sub:"conviction",color:"#f59e0b"},
            {label:"US STOCKS",value:String(items.filter(i=>i.market==="US").length),sub:"NYSE/NASDAQ",color:"#60a5fa"},
            {label:"UK STOCKS",value:String(items.filter(i=>i.market==="UK").length),sub:"LSE/AIM",color:"#a78bfa"},
          ].map((s,i)=>(
            <div key={s.label} style={{padding:"10px 14px",borderRight:i<4?"1px solid #1a2535":"none"}}>
              <div style={{color:"#374151",fontSize:"9px",letterSpacing:"0.08em",marginBottom:"3px"}}>{s.label}</div>
              <div style={{color:s.color,fontSize:"20px",fontWeight:"700",lineHeight:"1"}}>{s.value}</div>
              <div style={{color:"#374151",fontSize:"9px",marginTop:"2px"}}>{s.sub}</div>
            </div>
          ))}
        </div>

        {/* ADD FORM */}
        <div style={{background:"#04080f",borderBottom:"1px solid #1a2535",padding:"10px 14px"}}>
          <div style={{color:"#374151",fontSize:"8px",letterSpacing:"0.1em",marginBottom:"8px"}}>+ ADD TO WATCHLIST {autoFilling&&<span style={{color:"#f59e0b"}}>· AI FILLING...</span>}</div>
          <div style={{display:"grid",gridTemplateColumns:"120px 90px 1fr 1fr 1fr auto",gap:"8px",alignItems:"end"}}>
            <div>
              <div style={{color:"#253345",fontSize:"8px",letterSpacing:"0.08em",marginBottom:"3px"}}>TICKER *</div>
              <input value={ticker} onChange={e=>setTicker(e.target.value.toUpperCase())} onBlur={e=>autoFill(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addItem()} placeholder="NVDA"
                style={{width:"100%",boxSizing:"border-box",background:"#060d18",border:`1px solid ${autoFilling?"#f59e0b44":"#1a2535"}`,color:"#f59e0b",padding:"6px 8px",fontSize:"12px",fontWeight:"700",fontFamily:"inherit",outline:"none"}}/>
            </div>
            <div>
              <div style={{color:"#253345",fontSize:"8px",letterSpacing:"0.08em",marginBottom:"3px"}}>MARKET</div>
              <select value={market} onChange={e=>setMarket(e.target.value)} style={{width:"100%",background:"#060d18",border:"1px solid #1a2535",color:"#e2e8f0",padding:"6px 8px",fontSize:"10px",fontFamily:"inherit",outline:"none"}}>
                <option value="US">US NYSE/NASDAQ</option>
                <option value="UK">UK LSE/AIM</option>
              </select>
            </div>
            <div>
              <div style={{color:"#253345",fontSize:"8px",letterSpacing:"0.08em",marginBottom:"3px"}}>SECTOR {autoFilling&&<span style={{color:"#f59e0b"}}>✨</span>}</div>
              <select value={sector} onChange={e=>setSector(e.target.value)} style={{width:"100%",background:"#060d18",border:`1px solid ${autoFilling?"#f59e0b44":"#1a2535"}`,color:"#e2e8f0",padding:"6px 8px",fontSize:"10px",fontFamily:"inherit",outline:"none"}}>
                <option value="">Select...</option>
                {SECTORS.map(s=><option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <div style={{color:"#253345",fontSize:"8px",letterSpacing:"0.08em",marginBottom:"3px"}}>THEME {autoFilling&&<span style={{color:"#f59e0b"}}>✨</span>}</div>
              <select value={theme} onChange={e=>setTheme(e.target.value)} style={{width:"100%",background:"#060d18",border:`1px solid ${autoFilling?"#f59e0b44":"#1a2535"}`,color:"#e2e8f0",padding:"6px 8px",fontSize:"10px",fontFamily:"inherit",outline:"none"}}>
                <option value="">Select...</option>
                {THEMES.map(t=><option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <div style={{color:"#253345",fontSize:"8px",letterSpacing:"0.08em",marginBottom:"3px"}}>NOTES {autoFilling&&<span style={{color:"#f59e0b"}}>✨</span>}</div>
              <input value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Why watching..."
                style={{width:"100%",boxSizing:"border-box",background:"#060d18",border:`1px solid ${autoFilling?"#f59e0b44":"#1a2535"}`,color:"#94a3b8",padding:"6px 8px",fontSize:"10px",fontFamily:"inherit",outline:"none"}}/>
            </div>
            <button onClick={addItem} style={{background:"#f59e0b",border:"none",color:"#000",fontSize:"10px",fontWeight:"700",padding:"7px 16px",cursor:"pointer",letterSpacing:"0.06em",whiteSpace:"nowrap"}}>+ ADD</button>
          </div>
          <div style={{color:"#253345",fontSize:"8px",marginTop:"5px"}}>TYPE TICKER AND TAB AWAY — AI AUTO-FILLS SECTOR, THEME AND NOTES</div>
        </div>

        {/* CONTROL BAR */}
        <div style={{background:"#060d18",borderBottom:"1px solid #1a2535",padding:"7px 14px",display:"flex",alignItems:"center",gap:"8px",flexWrap:"wrap"}}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="SEARCH TICKER OR SECTOR..."
            style={{background:"#04080f",border:"1px solid #1a2535",color:"#94a3b8",padding:"4px 10px",fontSize:"9px",fontFamily:"inherit",outline:"none",width:"180px",letterSpacing:"0.04em"}}/>
          <div style={{display:"flex",gap:"1px"}}>
            {[["ALL","ALL"],["US","US"],["UK","UK"]].map(([v,l])=>(
              <button key={v} onClick={()=>setFilter(v)} style={{padding:"4px 10px",border:`1px solid ${filter===v?"#22c55e44":"#1a2535"}`,background:filter===v?"#162030":"transparent",color:filter===v?"#22c55e":"#374151",fontSize:"9px",letterSpacing:"0.06em",cursor:"pointer"}}>{l}</button>
            ))}
          </div>
          <div style={{display:"flex",gap:"1px"}}>
            {[["score","SCORE"],["added","RECENT"],["ticker","A-Z"]].map(([v,l])=>(
              <button key={v} onClick={()=>setSortBy(v as any)} style={{padding:"4px 10px",border:`1px solid ${sortBy===v?"#f59e0b44":"#1a2535"}`,background:sortBy===v?"#1a0f00":"transparent",color:sortBy===v?"#f59e0b":"#374151",fontSize:"9px",letterSpacing:"0.06em",cursor:"pointer"}}>{l}</button>
            ))}
          </div>
          <div style={{flex:1}}></div>
          {items.length>0&&<><button onClick={scoreAll} disabled={scoring} style={{background:"transparent",border:"1px solid #f59e0b44",color:scoring?"#374151":"#f59e0b",fontSize:"9px",padding:"4px 12px",cursor:"pointer",letterSpacing:"0.06em"}}>{scoring?"SCORING...":"⚡ SCORE VS 3-CHECKS"}</button>
          <button onClick={analyzeAll} disabled={analyzing} style={{background:"transparent",border:"1px solid #60a5fa44",color:analyzing?"#374151":"#60a5fa",fontSize:"9px",padding:"4px 12px",cursor:"pointer",letterSpacing:"0.06em"}}>{analyzing?"ANALYZING...":"🧠 LYNCH+WYCKOFF"}</button></>}
        </div>

        {/* MSG */}
        {msg&&<div style={{padding:"6px 14px",background:msg.ok?"#052e16":"#1a0505",borderBottom:"1px solid #1a2535",color:msg.ok?"#22c55e":"#ef4444",fontSize:"9px",letterSpacing:"0.06em"}}>{msg.ok?"✓":"⚠"} {msg.text}</div>}

        {/* ANALYSIS */}
        {analyzing&&<div style={{padding:"40px 0",textAlign:"center"}}><div style={{color:"#60a5fa",fontSize:"10px",letterSpacing:"0.1em",marginBottom:"6px"}}>RUNNING LYNCH + WYCKOFF ANALYSIS</div><div style={{color:"#253345",fontSize:"9px",letterSpacing:"0.08em"}}>FUNDAMENTAL ENGINE · TECHNICAL PHASE DETECTION · BUY / WATCH / AVOID VERDICTS</div></div>}
        {analysis&&!analyzing&&(
          <div style={{borderBottom:"1px solid #1a2535"}}>
            <div style={{padding:"8px 14px",background:"#04080f",borderBottom:"1px solid #1a2535",display:"flex",alignItems:"center",gap:"8px"}}>
              <span style={{color:"#e2e8f0",fontSize:"10px",fontWeight:"700",letterSpacing:"0.06em"}}>LYNCH + WYCKOFF ANALYSIS</span>
              <span style={{background:"#052e16",color:"#22c55e",fontSize:"8px",padding:"2px 6px",letterSpacing:"0.05em"}}>INSTITUTIONAL</span>
              <div style={{flex:1}}></div>
              <CopyButton text={analysis}/>
              <button onClick={()=>setAnalysis(null)} style={{background:"transparent",border:"1px solid #1a2535",color:"#374151",fontSize:"9px",padding:"3px 8px",cursor:"pointer",letterSpacing:"0.05em"}}>✕ CLOSE</button>
            </div>
            <div style={{padding:"16px 14px",maxHeight:"500px",overflowY:"auto"}}>
              <pre style={{color:"#94a3b8",fontSize:"11px",lineHeight:"1.8",whiteSpace:"pre-wrap",fontFamily:"inherit",margin:0}}>{analysis}</pre>
            </div>
            <div style={{padding:"6px 14px",borderTop:"1px solid #1a2535",color:"#253345",fontSize:"8px",letterSpacing:"0.05em"}}>LYNCH FUNDAMENTAL FRAMEWORK + WYCKOFF PHASE ANALYSIS · NOT FINANCIAL ADVICE</div>
          </div>
        )}

        {/* TABLE */}
        <div>
          <div style={{padding:"6px 14px",background:"#04080f",borderBottom:"1px solid #1a2535",display:"flex",alignItems:"center",gap:"8px"}}>
            <span style={{color:"#e2e8f0",fontSize:"10px",fontWeight:"700",letterSpacing:"0.06em"}}>MONITORED STOCKS</span>
            <span style={{background:"#0a1a2a",color:"#374151",fontSize:"8px",padding:"2px 8px",letterSpacing:"0.05em"}}>{sorted.length} OF {items.length}</span>
            {qualified>0&&<span style={{background:"#052e16",color:"#22c55e",fontSize:"8px",padding:"2px 8px",letterSpacing:"0.05em"}}>🎯 {qualified} QUALIFYING</span>}
          </div>
          {sorted.length===0?(
            <div style={{padding:"60px 0",textAlign:"center"}}>
              <div style={{color:"#253345",fontSize:"10px",letterSpacing:"0.1em",marginBottom:"6px"}}>NO STOCKS MONITORED</div>
              <div style={{color:"#1a2535",fontSize:"9px",letterSpacing:"0.08em"}}>ADD TICKERS ABOVE TO START MONITORING</div>
            </div>
          ):(
            <div style={{overflowX:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:"11px"}}>
                <thead>
                  <tr style={{background:"#04080f",borderBottom:"1px solid #1a2535"}}>
                    {["SCORE","TICKER","SECTOR","THEME","STAGE","RSI","ENTRY","DAYS","NOTES","ACTIONS"].map(h=>(
                      <th key={h} style={{padding:"6px 10px",textAlign:"left",color:"#253345",fontSize:"8px",letterSpacing:"0.08em",fontWeight:"600",whiteSpace:"nowrap"}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((item,i)=>{
                    const isQual = item.c1_pass&&item.c2_pass;
                    const days = daysSince(item.added);
                    return (
                      <tr key={item.id} style={{borderBottom:"1px solid #0d1520",background:i%2===0?"#0a1420":"#080e18"}}
                        onMouseEnter={e=>{e.currentTarget.style.background="#0f1c2e";}} onMouseLeave={e=>{e.currentTarget.style.background=i%2===0?"#0a1420":"#080e18";}}>
                        <td style={{padding:"7px 10px"}}>
                          <div style={{display:"flex",alignItems:"center",gap:"5px"}}>
                            <div style={{width:"3px",height:"28px",background:convColor(item.score),borderRadius:"1px"}}></div>
                            <div>
                              <div style={{color:convColor(item.score),fontWeight:"700",fontSize:"13px"}}>{item.score>0?item.score:"—"}</div>
                              <div style={{display:"flex",gap:"2px",marginTop:"2px"}}>
                                <span style={{background:item.c1_pass?"#052e16":"#1a0505",color:item.c1_pass?"#22c55e":"#ef4444",fontSize:"7px",padding:"1px 3px"}}>C1</span>
                                <span style={{background:item.c2_pass?"#052e16":"#1a0505",color:item.c2_pass?"#22c55e":"#ef4444",fontSize:"7px",padding:"1px 3px"}}>C2</span>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td style={{padding:"7px 10px"}}>
                          <div style={{color:isQual?"#22c55e":"#f59e0b",fontWeight:"700",fontSize:"12px",letterSpacing:"0.03em"}}>{item.market==="US"?"":"🇬🇧 "}{item.ticker}</div>
                          {item.graduated&&<div style={{color:"#60a5fa",fontSize:"7px",marginTop:"1px",letterSpacing:"0.04em"}}>IN PORTFOLIO</div>}
                        </td>
                        <td style={{padding:"7px 8px"}}>{item.sector?<span style={{background:"#0a1a2e",color:"#60a5fa",fontSize:"8px",padding:"2px 6px",letterSpacing:"0.04em"}}>{item.sector.substring(0,10).toUpperCase()}</span>:<span style={{color:"#1a2535"}}>—</span>}</td>
                        <td style={{padding:"7px 8px"}}>{item.theme?<span style={{background:"#140a2e",color:"#a78bfa",fontSize:"8px",padding:"2px 6px",letterSpacing:"0.04em"}}>{item.theme.substring(0,10).toUpperCase()}</span>:<span style={{color:"#1a2535"}}>—</span>}</td>
                        <td style={{padding:"7px 8px"}}>
                          {item.stage?<span style={{color:item.stage.includes("Stage 2")?"#22c55e":"#60a5fa",fontSize:"9px",fontWeight:"600"}}>{item.stage.includes("Stage 2")?"STG2":"STG1"}</span>:<span style={{color:"#1a2535"}}>—</span>}
                        </td>
                        <td style={{padding:"7px 8px",color:item.rsi>70?"#ef4444":item.rsi>50?"#f59e0b":item.rsi>0?"#22c55e":"#253345",fontSize:"10px",fontWeight:"600",fontFamily:"monospace"}}>{item.rsi>0?item.rsi.toFixed(0):"—"}</td>
                        <td style={{padding:"7px 8px",color:"#60a5fa",fontSize:"9px",fontFamily:"monospace",whiteSpace:"nowrap"}}>{item.entry_zone||"—"}</td>
                        <td style={{padding:"7px 8px"}}>
                          <div style={{color:"#94a3b8",fontSize:"10px",fontFamily:"monospace"}}>{days}d</div>
                          <div style={{color:"#253345",fontSize:"8px"}}>{item.added}</div>
                        </td>
                        <td style={{padding:"7px 8px",color:"#374151",fontSize:"9px",maxWidth:"120px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{item.notes||"—"}</td>
                        <td style={{padding:"7px 8px"}}>
                          <div style={{display:"flex",gap:"3px",flexWrap:"wrap"}}>
                            <a href={`/analyzer?ticker=${item.ticker}&market=${item.market}`} style={{background:"transparent",border:"1px solid #253345",color:"#4a5568",fontSize:"8px",padding:"2px 6px",textDecoration:"none",letterSpacing:"0.04em"}}>VIEW</a>
                            {!item.graduated&&<button onClick={()=>graduateToPortfolio(item)} style={{background:"transparent",border:"1px solid #1a3a5a",color:"#60a5fa",fontSize:"8px",padding:"2px 6px",cursor:"pointer",letterSpacing:"0.04em"}}>BUY→</button>}
                            <button onClick={()=>remove(item.id)} style={{background:"transparent",border:"1px solid #3a1a1a",color:"#ef4444",fontSize:"8px",padding:"2px 6px",cursor:"pointer"}}>✕</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div style={{padding:"8px 14px",borderTop:"1px solid #1a2535",color:"#1a2535",fontSize:"8px",letterSpacing:"0.06em"}}>
          DATA PERSISTED IN LOCAL STORAGE · SCORE VS 3-CHECKS REQUIRES BACKEND · NOT FINANCIAL ADVICE
        </div>
      </div>
    </div>
  );
}