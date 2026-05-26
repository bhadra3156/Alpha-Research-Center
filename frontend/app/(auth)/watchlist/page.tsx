"use client";
import React from "react";
import { useState, useEffect, useCallback } from "react";

function Navigation() {
  return (
    <nav style={{position:"fixed",top:0,left:0,right:0,zIndex:50,background:"rgba(6,8,32,0.95)",backdropFilter:"blur(12px)",borderBottom:"1px solid rgba(245,158,11,0.2)",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 24px",height:"56px"}}>
      <a href="/dashboard" style={{display:"flex",alignItems:"center",gap:"10px",textDecoration:"none"}}>
        <div style={{width:"32px",height:"32px",borderRadius:"8px",background:"linear-gradient(135deg,#f59e0b,#d97706)",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:"900",fontSize:"16px",color:"#060820"}}>a</div>
        <span style={{fontWeight:"800",fontSize:"16px",color:"#f1f5f9"}}>Alpha<span style={{color:"#f59e0b"}}>Research</span></span>
      </a>
      <div style={{display:"flex",gap:"4px"}}>
        {[["dashboard","Dashboard"],["analyzer","Analyzer"],["watchlist","Watchlist"],["portfolio","Portfolio"],["journal","Journal"]].map(([href,label])=>(
          <a key={href} href={"/"+href} style={{display:"flex",alignItems:"center",padding:"6px 14px",borderRadius:"8px",textDecoration:"none",fontSize:"13px",color:"#94a3b8"}}>{label}</a>
        ))}
      </div>
      <div style={{display:"flex",alignItems:"center",gap:"6px",fontSize:"12px",color:"#10b981"}}>
        <div style={{width:"6px",height:"6px",borderRadius:"50%",background:"#10b981"}}></div>
        <span>LIVE</span>
      </div>
    </nav>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = React.useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }).catch(() => {
      const el = document.createElement("textarea");
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };
  return (
    <button onClick={handleCopy}
      title="Copy to clipboard"
      style={{
        padding:"5px 12px", borderRadius:"7px", fontSize:"11px", fontWeight:"600",
        cursor:"pointer", display:"flex", alignItems:"center", gap:"5px",
        border:"1px solid rgba(148,163,184,0.25)",
        background: copied ? "rgba(16,185,129,0.15)" : "rgba(148,163,184,0.08)",
        color: copied ? "#10b981" : "#94a3b8",
        transition:"all 0.2s"
      }}>
      {copied ? (
        <><span>✓</span><span>Copied!</span></>
      ) : (
        <><span style={{fontSize:"13px"}}>⧉</span><span>Copy</span></>
      )}
    </button>
  );
}

interface WatchItem {
  id: string;
  ticker: string;
  market: string;
  sector: string;
  theme: string;
  notes: string;
  added: string;
  score: number;
  c1_pass: boolean;
  c2_pass: boolean;
  stage: string;
  rsi: number;
  entry_zone: string;
  graduated: boolean;
}

const gold="#f59e0b", green="#10b981", red="#ef4444", steel="#94a3b8", blue="#60a5fa", purple="#a78bfa";
const BACKEND = "https://alpha-research-center-backend.onrender.com";
const SECTORS = ["Technology","Healthcare","Financials","Energy","Industrials","Consumer","Real Estate","Materials","Utilities","Communication","AI Infrastructure"];
const THEMES = ["AI Infrastructure","Defence","Energy Transition","Healthcare AI","Crypto","EV","Semiconductors","Cloud","Biotech","Value","Growth","Dividend"];

function daysSince(dateStr: string): number {
  const d = new Date(dateStr);
  const now = new Date();
  return Math.floor((now.getTime() - d.getTime()) / (1000*60*60*24));
}

function scoreColor(s: number) {
  if (s >= 8) return green;
  if (s >= 6) return gold;
  if (s >= 4) return "#fb923c";
  return red;
}

function scoreLabel(s: number) {
  if (s >= 8) return "Near Qualifying";
  if (s >= 6) return "Watch Closely";
  if (s >= 4) return "Early Stage";
  return "Not Ready";
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
  const [message, setMessage] = useState<{text:string,ok:boolean}|null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<string|null>(null);
  const [autoFilling, setAutoFilling] = useState(false);
  const [scoring, setScoring] = useState(false);
  const [sortBy, setSortBy] = useState<"score"|"added"|"ticker">("score");

  useEffect(() => {
    try { const s=localStorage.getItem("alpha_watchlist_v3"); if(s) setItems(JSON.parse(s)); } catch(e){}
  },[]);

  const persist = (list: WatchItem[]) => {
    setItems(list);
    try { localStorage.setItem("alpha_watchlist_v3", JSON.stringify(list)); } catch(e){}
  };

  // AI Auto-fill sector/theme/notes when ticker is entered
  const autoFill = async (t: string) => {
    if (!t || t.length < 1) return;
    setAutoFilling(true);
    try {
      const res = await fetch(`${BACKEND}/analyze/ticker-info`, {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({ticker: t.toUpperCase(), market})
      });
      if (res.ok) {
        const data = await res.json();
        if (data.sector) setSector(data.sector);
        if (data.theme) setTheme(data.theme);
        if (data.notes) setNotes(data.notes);
      }
    } catch(e) {}
    setAutoFilling(false);
  };

  const addItem = () => {
    if (!ticker.trim()) { setMessage({text:"Please enter a ticker symbol",ok:false}); return; }
    const t = ticker.trim().toUpperCase();
    if (items.find(i => i.ticker===t && i.market===market)) {
      setMessage({text:`${t} already in watchlist`,ok:false}); return;
    }
    const newItem: WatchItem = {
      id: Date.now().toString(), ticker:t, market, sector, theme, notes,
      added: new Date().toISOString().split("T")[0],
      score:0, c1_pass:false, c2_pass:false, stage:"", rsi:0, entry_zone:"", graduated:false
    };
    persist([...items, newItem]);
    setMessage({text:`✅ ${t} added to watchlist!`,ok:true});
    setTicker(""); setSector(""); setTheme(""); setNotes("");
  };

  // Score all watchlist stocks against 3-Check criteria
  const scoreWatchlist = async () => {
    if (items.length===0) return;
    setScoring(true);
    setMessage({text:"⚡ Scoring stocks against 3-Check criteria...",ok:true});
    try {
      const res = await fetch(`${BACKEND}/scan/`, {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({market:"US", tickers: items.map(i=>i.ticker), notify_telegram:false})
      });
      if (res.ok) {
        const data = await res.json();
        const qualMap: Record<string,any> = {};
        (data.qualifying_stocks||[]).forEach((s:any) => { qualMap[s.ticker] = s; });

        const updated = items.map(item => {
          const q = qualMap[item.ticker];
          if (q) {
            return {...item, score:q.conviction_score, c1_pass:q.check1_pass, c2_pass:q.check2_pass, stage:q.technical_stage, rsi:q.rsi14||0, entry_zone:q.entry_zone||""};
          }
          // Not qualifying - give partial score
          return {...item, score: item.score||1, c1_pass:false, c2_pass:false};
        });
        persist(updated);
        const qualified = updated.filter(i=>i.c1_pass&&i.c2_pass).length;
        setMessage({text:`✅ Scoring complete! ${qualified} stocks qualifying · ${items.length-qualified} not yet ready`,ok:true});
      }
    } catch(e) {
      setMessage({text:"Scoring failed — backend may be waking up, try again",ok:false});
    }
    setScoring(false);
  };

  // Graduate stock to portfolio
  const graduateToPortfolio = (item: WatchItem) => {
    try {
      const existing = JSON.parse(localStorage.getItem("alpha_positions")||"[]");
      if (existing.find((p:any) => p.ticker===item.ticker)) {
        setMessage({text:`${item.ticker} already in portfolio`,ok:false}); return;
      }
      const pos = {
        id: Date.now().toString(),
        ticker: item.ticker, market: item.market,
        entry_date: new Date().toISOString().split("T")[0],
        entry_price: 0, shares: 0,
        stop_level: 0, target_price: 0,
        notes: `Graduated from watchlist. ${item.notes||""} ${item.stage||""}`
      };
      localStorage.setItem("alpha_positions", JSON.stringify([...existing, pos]));
      const updated = items.map(i => i.id===item.id ? {...i, graduated:true} : i);
      persist(updated);
      setMessage({text:`✅ ${item.ticker} moved to Portfolio! Update entry price there.`,ok:true});
    } catch(e) {
      setMessage({text:"Failed to graduate to portfolio",ok:false});
    }
  };

  const remove = (id:string) => { persist(items.filter(i=>i.id!==id)); };

  const analyzeWatchlist = async () => {
    if (items.length===0) { setMessage({text:"Add stocks first",ok:false}); return; }
    setAnalyzing(true); setAnalysis(null); setMessage(null);
    try {
      const res = await fetch(`${BACKEND}/analyze/watchlist`, {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({stocks: items.map(i=>({ticker:i.ticker, market:i.market, sector:i.sector||"", theme:i.theme||"", notes:i.notes||"", score:i.score, days_watching:daysSince(i.added)}))})
      });
      if (!res.ok) throw new Error("Backend error");
      const data = await res.json();
      setAnalysis(data.analysis||"Analysis unavailable");
    } catch(e) {
      setAnalysis(`Analysis unavailable — backend may be waking up. Try again in 60 seconds.\n\nWatchlist: ${items.map(i=>i.ticker).join(", ")}`);
    }
    setAnalyzing(false);
  };

  const sorted = [...items]
    .filter(i => {
      const ms = !search || i.ticker.includes(search.toUpperCase()) || (i.sector||"").toLowerCase().includes(search.toLowerCase());
      const mf = filter==="ALL" || i.market===filter;
      return ms && mf;
    })
    .sort((a,b) => sortBy==="score" ? b.score-a.score : sortBy==="added" ? new Date(b.added).getTime()-new Date(a.added).getTime() : a.ticker.localeCompare(b.ticker));

  const qualified = items.filter(i=>i.c1_pass&&i.c2_pass).length;
  const avgScore = items.length ? (items.reduce((s,i)=>s+i.score,0)/items.length).toFixed(1) : "—";

  return (
    <div style={{minHeight:"100vh",background:"linear-gradient(135deg,#060820 0%,#0d1145 50%,#060820 100%)"}}>
      <Navigation/>
      <div style={{maxWidth:"1400px",margin:"0 auto",padding:"72px 20px 40px"}}>

        {/* Header */}
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"20px",flexWrap:"wrap",gap:"10px"}}>
          <div>
            <h1 style={{fontSize:"22px",fontWeight:"900",color:"#f1f5f9",marginBottom:"2px"}}>
              <span style={{color:gold}}>Watchlist</span> Manager
            </h1>
            <p style={{color:"#475569",fontSize:"12px"}}>{items.length} stocks monitored · US and UK markets · Rank by 3-Check score</p>
          </div>
          <div style={{display:"flex",gap:"8px",flexWrap:"wrap"}}>
            {items.length>0&&(
              <>
                <button onClick={scoreWatchlist} disabled={scoring}
                  style={{padding:"9px 16px",borderRadius:"10px",fontWeight:"700",fontSize:"12px",cursor:scoring?"wait":"pointer",border:"1px solid rgba(245,158,11,0.4)",background:"rgba(245,158,11,0.1)",color:scoring?"#64748b":gold}}>
                  {scoring?"⚡ Scoring...":"⚡ Score vs 3-Checks"}
                </button>
                <button onClick={analyzeWatchlist} disabled={analyzing}
                  style={{padding:"9px 16px",borderRadius:"10px",fontWeight:"700",fontSize:"12px",cursor:analyzing?"wait":"pointer",border:"1px solid rgba(96,165,250,0.4)",background:"rgba(96,165,250,0.15)",color:analyzing?"#64748b":blue}}>
                  {analyzing?"🧠 Analyzing...":"🧠 Lynch+Wyckoff Analysis"}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Stats */}
        {items.length>0&&(
          <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:"8px",marginBottom:"14px"}}>
            {[
              {label:"Total Stocks", value:String(items.length), color:green},
              {label:"Qualifying Now", value:String(qualified), color:qualified>0?green:steel},
              {label:"Avg Score", value:avgScore+"/10", color:gold},
              {label:"US Stocks", value:String(items.filter(i=>i.market==="US").length), color:blue},
              {label:"UK Stocks", value:String(items.filter(i=>i.market==="UK").length), color:purple},
            ].map(s=>(
              <div key={s.label} style={{background:"linear-gradient(145deg,#0f172a,#1e293b)",border:"1px solid #1e293b",borderRadius:"10px",padding:"10px 14px"}}>
                <div style={{fontSize:"16px",fontWeight:"900",color:s.color,fontFamily:"monospace"}}>{s.value}</div>
                <div style={{fontSize:"9px",color:"#475569",textTransform:"uppercase",letterSpacing:"0.05em",marginTop:"1px"}}>{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Add form */}
        <div style={{background:"linear-gradient(145deg,#0f172a,#1e293b)",border:"1px solid rgba(245,158,11,0.3)",borderRadius:"14px",padding:"16px 20px",marginBottom:"14px"}}>
          <div style={{fontSize:"11px",fontWeight:"700",color:gold,marginBottom:"12px"}}>+ ADD TO WATCHLIST {autoFilling&&<span style={{color:steel,fontWeight:"400"}}>· AI filling details...</span>}</div>
          <div style={{display:"grid",gridTemplateColumns:"130px 90px 1fr 1fr 1fr auto",gap:"10px",alignItems:"end"}}>
            <div>
              <label style={{fontSize:"9px",fontWeight:"700",color:"#64748b",textTransform:"uppercase",letterSpacing:"0.05em",display:"block",marginBottom:"4px"}}>Ticker * {autoFilling&&"⚡"}</label>
              <input value={ticker}
                onChange={e=>{setTicker(e.target.value.toUpperCase());}}
                onBlur={e=>autoFill(e.target.value)}
                onKeyDown={e=>e.key==="Enter"&&addItem()}
                placeholder="NVDA"
                style={{padding:"9px 12px",borderRadius:"8px",border:`1px solid ${autoFilling?"rgba(245,158,11,0.5)":"#1e293b"}`,background:"#060820",color:"#f1f5f9",fontSize:"13px",fontWeight:"700",outline:"none",width:"100%",boxSizing:"border-box"}}/>
            </div>
            <div>
              <label style={{fontSize:"9px",fontWeight:"700",color:"#64748b",textTransform:"uppercase",letterSpacing:"0.05em",display:"block",marginBottom:"4px"}}>Market</label>
              <select value={market} onChange={e=>setMarket(e.target.value)}
                style={{padding:"9px 8px",borderRadius:"8px",border:"1px solid #1e293b",background:"#060820",color:"#f1f5f9",fontSize:"12px",width:"100%"}}>
                <option value="US">🇺🇸 US</option>
                <option value="UK">🇬🇧 UK</option>
              </select>
            </div>
            <div>
              <label style={{fontSize:"9px",fontWeight:"700",color:"#64748b",textTransform:"uppercase",letterSpacing:"0.05em",display:"block",marginBottom:"4px"}}>Sector {autoFilling&&<span style={{color:gold}}>✨ AI</span>}</label>
              <select value={sector} onChange={e=>setSector(e.target.value)}
                style={{padding:"9px 8px",borderRadius:"8px",border:`1px solid ${autoFilling?"rgba(245,158,11,0.4)":"#1e293b"}`,background:"#060820",color:"#f1f5f9",fontSize:"12px",width:"100%"}}>
                <option value="">Select sector...</option>
                {SECTORS.map(s=><option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label style={{fontSize:"9px",fontWeight:"700",color:"#64748b",textTransform:"uppercase",letterSpacing:"0.05em",display:"block",marginBottom:"4px"}}>Theme {autoFilling&&<span style={{color:gold}}>✨ AI</span>}</label>
              <select value={theme} onChange={e=>setTheme(e.target.value)}
                style={{padding:"9px 8px",borderRadius:"8px",border:`1px solid ${autoFilling?"rgba(245,158,11,0.4)":"#1e293b"}`,background:"#060820",color:"#f1f5f9",fontSize:"12px",width:"100%"}}>
                <option value="">Select theme...</option>
                {THEMES.map(t=><option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={{fontSize:"9px",fontWeight:"700",color:"#64748b",textTransform:"uppercase",letterSpacing:"0.05em",display:"block",marginBottom:"4px"}}>Notes {autoFilling&&<span style={{color:gold}}>✨ AI</span>}</label>
              <input value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Why watching..."
                style={{padding:"9px 12px",borderRadius:"8px",border:`1px solid ${autoFilling?"rgba(245,158,11,0.4)":"#1e293b"}`,background:"#060820",color:"#f1f5f9",fontSize:"12px",outline:"none",width:"100%",boxSizing:"border-box"}}/>
            </div>
            <button onClick={addItem}
              style={{padding:"9px 20px",borderRadius:"8px",fontWeight:"700",fontSize:"13px",cursor:"pointer",border:"none",background:`linear-gradient(135deg,${gold},#d97706)`,color:"#060820",whiteSpace:"nowrap"}}>
              + Add
            </button>
          </div>
          <div style={{marginTop:"8px",fontSize:"10px",color:"#334155"}}>
            💡 Type ticker and click away — AI will auto-fill sector, theme and notes
          </div>
        </div>

        {message&&(
          <div style={{padding:"10px 14px",borderRadius:"8px",marginBottom:"12px",fontSize:"12px",background:message.ok?"rgba(16,185,129,0.1)":"rgba(239,68,68,0.1)",color:message.ok?green:red,border:`1px solid ${message.ok?"rgba(16,185,129,0.3)":"rgba(239,68,68,0.3)"}`}}>
            {message.text}
          </div>
        )}

        {/* Analysis */}
        {analyzing&&(
          <div style={{background:"linear-gradient(145deg,#0f172a,#1e293b)",border:"1px solid rgba(96,165,250,0.3)",borderRadius:"14px",padding:"30px",marginBottom:"14px",textAlign:"center"}}>
            <div style={{fontSize:"40px",marginBottom:"12px"}}>🧠</div>
            <div style={{color:blue,fontSize:"16px",fontWeight:"700",marginBottom:"6px"}}>Running Lynch + Wyckoff Analysis...</div>
            <div style={{color:"#475569",fontSize:"12px"}}>Fundamental engine · Technical phase detection · BUY / WATCH / AVOID verdicts</div>
          </div>
        )}

        {analysis&&!analyzing&&(
          <div style={{background:"linear-gradient(145deg,#0f172a,#1e293b)",border:"1px solid rgba(96,165,250,0.3)",borderRadius:"14px",padding:"20px",marginBottom:"14px"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"14px"}}>
              <div style={{display:"flex",alignItems:"center",gap:"8px",flexWrap:"wrap"}}>
                <span style={{fontSize:"16px"}}>🧠</span>
                <span style={{color:"#f1f5f9",fontWeight:"700",fontSize:"13px"}}>Watchlist Analysis</span>
                <span style={{padding:"2px 8px",borderRadius:"10px",fontSize:"9px",fontWeight:"700",background:"rgba(16,185,129,0.15)",color:green,border:"1px solid rgba(16,185,129,0.3)"}}>LYNCH + WYCKOFF</span>
                <span style={{padding:"2px 8px",borderRadius:"10px",fontSize:"9px",fontWeight:"700",background:"rgba(96,165,250,0.15)",color:blue,border:"1px solid rgba(96,165,250,0.3)"}}>INSTITUTIONAL</span>
              </div>
              <button onClick={()=>setAnalysis(null)}
                style={{padding:"4px 10px",borderRadius:"6px",fontSize:"11px",cursor:"pointer",border:"1px solid #1e293b",background:"transparent",color:"#475569"}}>✕</button>
            </div>
            <pre style={{color:"#e2e8f0",fontSize:"12px",lineHeight:"1.8",whiteSpace:"pre-wrap",fontFamily:"'Courier New',monospace",margin:0}}>{analysis}</pre>
            <div style={{marginTop:"10px",fontSize:"10px",color:"#334155"}}>Lynch Fundamental Framework + Wyckoff Phase Analysis · Not financial advice</div>
          </div>
        )}

        {/* Filter bar */}
        <div style={{background:"linear-gradient(145deg,#0f172a,#1e293b)",border:"1px solid #1e293b",borderRadius:"12px",padding:"10px 14px",marginBottom:"12px",display:"flex",alignItems:"center",gap:"10px",flexWrap:"wrap"}}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search ticker or sector..."
            style={{padding:"6px 12px",borderRadius:"7px",border:"1px solid #1e293b",background:"#060820",color:"#f1f5f9",fontSize:"11px",outline:"none",minWidth:"180px"}}/>
          <div style={{display:"flex",gap:"4px"}}>
            {[["ALL","All"],["US","🇺🇸 US"],["UK","🇬🇧 UK"]].map(([v,l])=>(
              <button key={v} onClick={()=>setFilter(v)}
                style={{padding:"4px 10px",borderRadius:"6px",fontSize:"10px",fontWeight:"600",cursor:"pointer",border:"1px solid",
                  background:filter===v?"rgba(245,158,11,0.15)":"transparent",
                  color:filter===v?gold:"#64748b",
                  borderColor:filter===v?"rgba(245,158,11,0.35)":"#1e293b"}}>{l}</button>
            ))}
          </div>
          <div style={{display:"flex",gap:"4px"}}>
            <span style={{fontSize:"10px",color:"#475569",alignSelf:"center"}}>Sort:</span>
            {[["score","Score"],["added","Recent"],["ticker","A-Z"]].map(([v,l])=>(
              <button key={v} onClick={()=>setSortBy(v as any)}
                style={{padding:"4px 10px",borderRadius:"6px",fontSize:"10px",fontWeight:"600",cursor:"pointer",border:"1px solid",
                  background:sortBy===v?"rgba(96,165,250,0.15)":"transparent",
                  color:sortBy===v?blue:"#64748b",
                  borderColor:sortBy===v?"rgba(96,165,250,0.35)":"#1e293b"}}>{l}</button>
            ))}
          </div>
          <span style={{fontSize:"10px",color:"#475569",marginLeft:"auto"}}>
            {sorted.length} of {items.length} stocks
          </span>
        </div>

        {/* Table */}
        <div style={{background:"linear-gradient(145deg,#0f172a,#1e293b)",border:"1px solid #1e293b",borderRadius:"14px",overflow:"hidden"}}>
          <div style={{padding:"10px 16px",borderBottom:"1px solid #1e293b",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <span style={{fontWeight:"700",color:"#f1f5f9",fontSize:"12px"}}>Monitored Stocks</span>
            {qualified>0&&(
              <span style={{padding:"2px 10px",borderRadius:"10px",fontSize:"10px",fontWeight:"700",background:"rgba(16,185,129,0.15)",color:green,border:"1px solid rgba(16,185,129,0.3)"}}>
                🎯 {qualified} qualifying now!
              </span>
            )}
          </div>

          {sorted.length===0?(
            <div style={{textAlign:"center",padding:"50px 0"}}>
              <div style={{fontSize:"40px",marginBottom:"12px"}}>👁️</div>
              <div style={{color:"#f1f5f9",fontSize:"14px",fontWeight:"600",marginBottom:"6px"}}>
                {items.length===0?"No stocks yet":"No stocks match filter"}
              </div>
              <div style={{color:"#475569",fontSize:"11px"}}>Add tickers above to start monitoring</div>
            </div>
          ):(
            <div style={{overflowX:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:"11px"}}>
                <thead>
                  <tr style={{background:"rgba(6,8,32,0.8)"}}>
                    {["Score","Ticker","Sector","Theme","Stage","RSI","Entry Zone","Days Watching","Notes","Actions"].map(h=>(
                      <th key={h} style={{padding:"8px 12px",textAlign:"left",fontSize:"9px",fontWeight:"700",color:"#475569",textTransform:"uppercase",letterSpacing:"0.06em",borderBottom:"1px solid #1e293b",whiteSpace:"nowrap"}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sorted.map(item=>{
                    const days = daysSince(item.added);
                    const isQual = item.c1_pass && item.c2_pass;
                    return (
                      <tr key={item.id}
                        style={{borderBottom:"1px solid rgba(30,41,59,0.3)",background:isQual?"rgba(16,185,129,0.03)":item.graduated?"rgba(96,165,250,0.03)":"transparent"}}
                        onMouseEnter={e=>{e.currentTarget.style.background="rgba(245,158,11,0.04)";}}
                        onMouseLeave={e=>{e.currentTarget.style.background=isQual?"rgba(16,185,129,0.03)":item.graduated?"rgba(96,165,250,0.03)":"transparent";}}>

                        {/* Score */}
                        <td style={{padding:"9px 12px"}}>
                          <div style={{display:"flex",alignItems:"center",gap:"6px"}}>
                            <span style={{fontFamily:"monospace",fontWeight:"900",fontSize:"14px",color:item.score>0?scoreColor(item.score):"#334155"}}>
                              {item.score>0?item.score:"—"}
                            </span>
                            {item.score>0&&(
                              <div>
                                <div style={{width:"40px",height:"3px",background:"#1e293b",borderRadius:"2px",overflow:"hidden"}}>
                                  <div style={{height:"100%",width:`${item.score*10}%`,background:scoreColor(item.score),borderRadius:"2px"}}></div>
                                </div>
                                <div style={{fontSize:"8px",color:"#475569",marginTop:"1px",whiteSpace:"nowrap"}}>{scoreLabel(item.score)}</div>
                              </div>
                            )}
                          </div>
                          <div style={{display:"flex",gap:"3px",marginTop:"3px"}}>
                            <span style={{fontSize:"8px",padding:"1px 4px",borderRadius:"3px",background:item.c1_pass?"rgba(16,185,129,0.15)":"rgba(239,68,68,0.1)",color:item.c1_pass?green:red}}>C1</span>
                            <span style={{fontSize:"8px",padding:"1px 4px",borderRadius:"3px",background:item.c2_pass?"rgba(16,185,129,0.15)":"rgba(239,68,68,0.1)",color:item.c2_pass?green:red}}>C2</span>
                          </div>
                        </td>

                        {/* Ticker */}
                        <td style={{padding:"9px 12px"}}>
                          <div style={{display:"flex",alignItems:"center",gap:"5px"}}>
                            <span>{item.market==="US"?"🇺🇸":"🇬🇧"}</span>
                            <span style={{fontFamily:"monospace",fontWeight:"800",color:isQual?green:gold,fontSize:"13px"}}>{item.ticker}</span>
                            {item.graduated&&<span style={{fontSize:"9px",padding:"1px 5px",borderRadius:"4px",background:"rgba(96,165,250,0.15)",color:blue}}>In Portfolio</span>}
                          </div>
                        </td>

                        {/* Sector */}
                        <td style={{padding:"9px 12px"}}>
                          {item.sector?<span style={{padding:"2px 7px",borderRadius:"8px",fontSize:"9px",fontWeight:"600",background:"rgba(96,165,250,0.1)",color:blue,border:"1px solid rgba(96,165,250,0.2)",whiteSpace:"nowrap"}}>{item.sector}</span>:<span style={{color:"#334155"}}>—</span>}
                        </td>

                        {/* Theme */}
                        <td style={{padding:"9px 12px"}}>
                          {item.theme?<span style={{padding:"2px 7px",borderRadius:"8px",fontSize:"9px",fontWeight:"600",background:"rgba(167,139,250,0.1)",color:purple,border:"1px solid rgba(167,139,250,0.2)",whiteSpace:"nowrap"}}>{item.theme}</span>:<span style={{color:"#334155"}}>—</span>}
                        </td>

                        {/* Stage */}
                        <td style={{padding:"9px 12px"}}>
                          {item.stage?<span style={{padding:"2px 7px",borderRadius:"8px",fontSize:"9px",fontWeight:"600",background:item.stage.includes("Stage 2")?"rgba(16,185,129,0.12)":"rgba(96,165,250,0.1)",color:item.stage.includes("Stage 2")?green:blue,whiteSpace:"nowrap"}}>{item.stage}</span>:<span style={{color:"#334155"}}>—</span>}
                        </td>

                        {/* RSI */}
                        <td style={{padding:"9px 12px"}}>
                          <span style={{fontFamily:"monospace",fontSize:"11px",fontWeight:"700",color:item.rsi>0?(item.rsi>70?red:item.rsi>50?gold:green):"#334155"}}>
                            {item.rsi>0?item.rsi.toFixed(0):"—"}
                          </span>
                        </td>

                        {/* Entry Zone */}
                        <td style={{padding:"9px 12px"}}>
                          <span style={{fontSize:"10px",color:blue,fontFamily:"monospace",whiteSpace:"nowrap"}}>{item.entry_zone||"—"}</span>
                        </td>

                        {/* Days watching */}
                        <td style={{padding:"9px 12px"}}>
                          <div style={{fontSize:"11px",fontFamily:"monospace",color:steel}}>{days}d</div>
                          <div style={{fontSize:"9px",color:"#334155"}}>{item.added}</div>
                        </td>

                        {/* Notes */}
                        <td style={{padding:"9px 12px",color:steel,fontSize:"10px",maxWidth:"140px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{item.notes||"—"}</td>

                        {/* Actions */}
                        <td style={{padding:"9px 12px"}}>
                          <div style={{display:"flex",gap:"4px",flexWrap:"wrap"}}>
                            <a href={`/analyzer?ticker=${item.ticker}&market=${item.market}`}
                              style={{padding:"3px 8px",borderRadius:"5px",fontSize:"9px",fontWeight:"600",cursor:"pointer",border:"1px solid rgba(245,158,11,0.3)",background:"rgba(245,158,11,0.1)",color:gold,textDecoration:"none",whiteSpace:"nowrap"}}>
                              🔬
                            </a>
                            {!item.graduated&&(
                              <button onClick={()=>graduateToPortfolio(item)}
                                style={{padding:"3px 8px",borderRadius:"5px",fontSize:"9px",fontWeight:"600",cursor:"pointer",border:"1px solid rgba(96,165,250,0.3)",background:"rgba(96,165,250,0.1)",color:blue,whiteSpace:"nowrap"}}>
                                📈 Buy
                              </button>
                            )}
                            <button onClick={()=>remove(item.id)}
                              style={{padding:"3px 8px",borderRadius:"5px",fontSize:"9px",fontWeight:"600",cursor:"pointer",border:"1px solid rgba(239,68,68,0.3)",background:"rgba(239,68,68,0.1)",color:red,whiteSpace:"nowrap"}}>
                              ✕
                            </button>
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

        <div style={{marginTop:"20px",textAlign:"center",color:"#1e293b",fontSize:"10px"}}>
          AlphaResearch v1.0 · Not financial advice · For institutional use only
        </div>
      </div>
    </div>
  );
}