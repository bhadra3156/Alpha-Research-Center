"use client";
import { useState, useEffect } from "react";

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

interface WatchItem {
  id: string; ticker: string; market: string; sector: string; theme: string; notes: string; added: string;
}

const gold="#f59e0b", green="#10b981", red="#ef4444", steel="#94a3b8", blue="#60a5fa", purple="#a78bfa";
const BACKEND = "https://alpha-research-center-backend.onrender.com";

const SECTORS = ["Technology","Healthcare","Financials","Energy","Industrials","Consumer","Real Estate","Materials","Utilities","Communication","AI Infrastructure"];
const THEMES = ["AI Infrastructure","Defence","Energy Transition","Healthcare AI","Crypto","EV","Semiconductors","Cloud","Biotech","Value","Growth","Dividend"];

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
  const [analyzeProgress, setAnalyzeProgress] = useState("");

  useEffect(() => {
    try { const s=localStorage.getItem("alpha_watchlist"); if(s) setItems(JSON.parse(s)); } catch(e){}
  },[]);

  const persist = (list: WatchItem[]) => {
    setItems(list);
    try { localStorage.setItem("alpha_watchlist", JSON.stringify(list)); } catch(e){}
  };

  const addItem = () => {
    if (!ticker.trim()) { setMessage({text:"Please enter a ticker symbol",ok:false}); return; }
    const t = ticker.trim().toUpperCase();
    if (items.find(i => i.ticker===t && i.market===market)) {
      setMessage({text:`${t} already in watchlist`,ok:false}); return;
    }
    const newItem: WatchItem = {
      id: Date.now().toString(), ticker:t, market, sector, theme, notes, added: new Date().toISOString().split("T")[0]
    };
    persist([...items, newItem]);
    setMessage({text:`✅ ${t} added to watchlist!`,ok:true});
    setTicker(""); setSector(""); setTheme(""); setNotes("");
  };

  const remove = (id:string) => persist(items.filter(i=>i.id!==id));

  const analyzeWatchlist = async () => {
    if (items.length===0) { setMessage({text:"Add stocks to watchlist first",ok:false}); return; }
    setAnalyzing(true); setAnalysis(null); setMessage(null);
    setAnalyzeProgress("Initiating Lynch-Wyckoff analysis engine...");

    const tickerList = items.map(i=>`${i.ticker} (${i.market}${i.sector?", "+i.sector:""}${i.theme?", "+i.theme:""})`).join(", ");

    const prompt = `You are an elite institutional research analyst combining Peter Lynch's fundamental framework with Stan Weinstein's Wyckoff phase analysis. Today is 26 May 2026.

WATCHLIST TO ANALYSE (${items.length} stocks):
${items.map(i=>`- ${i.ticker} | Market: ${i.market} | Sector: ${i.sector||"N/A"} | Theme: ${i.theme||"N/A"} | Notes: ${i.notes||"N/A"}`).join("\n")}

For EACH stock provide a FULL institutional research note:

1. LYNCH CLASSIFICATION: Which category? (Fast Grower/Stalwart/Slow Grower/Cyclical/Turnaround/Asset Play)
2. BUSINESS STORY: What does it do? What is the investment narrative? Is the story intact?
3. FUNDAMENTALS:
   - Revenue growth (3yr CAGR + recent trend)
   - Earnings growth + EPS quality
   - Gross/Operating/Net margins (vs 5yr average)
   - Free Cash Flow generation
   - Balance sheet (debt/equity, current ratio, net cash/debt)
   - ROIC vs WACC spread
   - PEG Ratio (P/E / Growth rate) — flag if <1.0 (attractive) or >2.0 (expensive)
   - Moat assessment (switching costs, network effects, cost advantages)
4. WYCKOFF PHASE:
   - Current phase: Accumulation / Markup / Distribution / Markdown
   - Price vs 50-day and 200-day MA
   - Volume trend (accumulation or distribution?)
   - RSI and MACD status
   - Key support and resistance levels
5. SYNTHESIS VERDICT:
   - PASS (Buy/Accumulate) — great fundamentals + accumulation/early markup
   - WATCH (Hold/Monitor) — divergence between fundamentals and technicals
   - AVOID (Sell/Stay Away) — weak fundamentals + distribution/markdown
6. ENTRY ZONE and STOP LOSS level
7. 12-MONTH PRICE TARGET with reasoning

END WITH:
WATCHLIST SUMMARY TABLE (ticker, Lynch category, Wyckoff phase, verdict, target)
TOP 3 HIGHEST CONVICTION picks from the list
SECTOR/THEME concentration risks
OVERALL MARKET ENVIRONMENT assessment

Write with Goldman Sachs precision. Specific numbers. No generic commentary.`;

    try {
      setAnalyzeProgress("Connecting to AI analysis engine...");
      const res = await fetch(`${BACKEND}/analyze/portfolio-deep`, {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({holdings: items.map(i=>({ticker:i.ticker, shares:1, entry_price:1, stop_level:0, target_price:0, notes:`${i.sector||""} ${i.theme||""} ${i.notes||""}`.trim()})), watchlist_mode:true, custom_prompt:prompt})
      });
      if (!res.ok) throw new Error("Backend error");
      const data = await res.json();
      setAnalysis(data.analysis || "Analysis unavailable");
    } catch(e) {
      // Fallback: direct Groq
      try {
        setAnalyzeProgress("Using Groq LLaMA fallback...");
        const res2 = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method:"POST",
          headers:{"Content-Type":"application/json","Authorization":"Bearer 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"},
          body:JSON.stringify({
            model:"llama-3.3-70b-versatile", max_tokens:4000, temperature:0.3,
            messages:[
              {role:"system",content:"You are a senior portfolio manager combining Peter Lynch fundamental analysis with Wyckoff technical phase analysis. Provide institutional-grade research."},
              {role:"user",content:prompt}
            ]
          })
        });
        const d = await res2.json();
        const text = d.choices?.[0]?.message?.content;
        if (text) setAnalysis(text);
        else throw new Error("No response");
      } catch(e2) {
        setAnalysis(`WATCHLIST ANALYSIS — ${items.length} STOCKS\n\nAnalysis engine unavailable. Please ensure backend is running.\n\nStocks monitored:\n${items.map(i=>`- ${i.ticker} (${i.market}) ${i.sector?`| ${i.sector}`:""}`).join("\n")}`);
      }
    }
    setAnalyzeProgress("");
    setAnalyzing(false);
  };

  const filtered = items.filter(i => {
    const matchSearch = !search || i.ticker.includes(search.toUpperCase()) || i.sector?.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter==="ALL" || i.market===filter;
    return matchSearch && matchFilter;
  });

  const usCount = items.filter(i=>i.market==="US").length;
  const ukCount = items.filter(i=>i.market==="UK").length;

  return (
    <div style={{minHeight:"100vh",background:"linear-gradient(135deg,#060820 0%,#0d1145 50%,#060820 100%)"}}>
      <Navigation/>
      <div style={{maxWidth:"1300px",margin:"0 auto",padding:"72px 20px 40px"}}>

        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"20px",flexWrap:"wrap",gap:"10px"}}>
          <div>
            <h1 style={{fontSize:"22px",fontWeight:"900",color:"#f1f5f9",marginBottom:"2px"}}>
              <span style={{color:gold}}>Watchlist</span> Manager
            </h1>
            <p style={{color:"#475569",fontSize:"12px"}}>{items.length} stocks monitored · US and UK markets</p>
          </div>
          {items.length>0&&(
            <button onClick={analyzeWatchlist} disabled={analyzing}
              style={{padding:"10px 24px",borderRadius:"10px",fontWeight:"700",fontSize:"13px",cursor:analyzing?"wait":"pointer",border:"1px solid rgba(96,165,250,0.4)",background:analyzing?"rgba(96,165,250,0.1)":"linear-gradient(135deg,rgba(96,165,250,0.2),rgba(167,139,250,0.2))",color:analyzing?"#64748b":blue}}>
              {analyzing?`🧠 ${analyzeProgress||"Analyzing..."}` :"🧠 Analyse Watchlist (Lynch + Wyckoff)"}
            </button>
          )}
        </div>

        {/* Stats */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"10px",marginBottom:"16px"}}>
          {[
            {label:"Total Stocks", value:String(items.length), color:green},
            {label:"US Market", value:String(usCount), color:blue},
            {label:"UK Market", value:String(ukCount), color:purple},
          ].map(s=>(
            <div key={s.label} style={{background:"linear-gradient(145deg,#0f172a,#1e293b)",border:"1px solid #1e293b",borderRadius:"12px",padding:"14px 18px"}}>
              <div style={{fontSize:"22px",fontWeight:"900",color:s.color,fontFamily:"monospace"}}>{s.value}</div>
              <div style={{fontSize:"10px",color:"#475569",textTransform:"uppercase",letterSpacing:"0.05em",marginTop:"2px"}}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Add form */}
        <div style={{background:"linear-gradient(145deg,#0f172a,#1e293b)",border:"1px solid rgba(245,158,11,0.3)",borderRadius:"14px",padding:"16px 20px",marginBottom:"16px"}}>
          <div style={{fontSize:"12px",fontWeight:"700",color:gold,marginBottom:"12px"}}>+ ADD TO WATCHLIST</div>
          <div style={{display:"grid",gridTemplateColumns:"140px 100px 1fr 1fr 1fr auto",gap:"10px",alignItems:"end",flexWrap:"wrap"}}>
            <div>
              <label style={{fontSize:"9px",fontWeight:"700",color:"#64748b",textTransform:"uppercase",letterSpacing:"0.05em",display:"block",marginBottom:"4px"}}>Ticker *</label>
              <input value={ticker} onChange={e=>setTicker(e.target.value.toUpperCase())} placeholder="NVDA"
                onKeyDown={e=>e.key==="Enter"&&addItem()}
                style={{padding:"9px 12px",borderRadius:"8px",border:"1px solid #1e293b",background:"#060820",color:"#f1f5f9",fontSize:"13px",fontWeight:"700",outline:"none",width:"100%",boxSizing:"border-box"}}/>
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
              <label style={{fontSize:"9px",fontWeight:"700",color:"#64748b",textTransform:"uppercase",letterSpacing:"0.05em",display:"block",marginBottom:"4px"}}>Sector</label>
              <select value={sector} onChange={e=>setSector(e.target.value)}
                style={{padding:"9px 8px",borderRadius:"8px",border:"1px solid #1e293b",background:"#060820",color:"#f1f5f9",fontSize:"12px",width:"100%"}}>
                <option value="">Select sector...</option>
                {SECTORS.map(s=><option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label style={{fontSize:"9px",fontWeight:"700",color:"#64748b",textTransform:"uppercase",letterSpacing:"0.05em",display:"block",marginBottom:"4px"}}>Theme</label>
              <select value={theme} onChange={e=>setTheme(e.target.value)}
                style={{padding:"9px 8px",borderRadius:"8px",border:"1px solid #1e293b",background:"#060820",color:"#f1f5f9",fontSize:"12px",width:"100%"}}>
                <option value="">Select theme...</option>
                {THEMES.map(t=><option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={{fontSize:"9px",fontWeight:"700",color:"#64748b",textTransform:"uppercase",letterSpacing:"0.05em",display:"block",marginBottom:"4px"}}>Notes</label>
              <input value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Why watching..."
                style={{padding:"9px 12px",borderRadius:"8px",border:"1px solid #1e293b",background:"#060820",color:"#f1f5f9",fontSize:"12px",outline:"none",width:"100%",boxSizing:"border-box"}}/>
            </div>
            <button onClick={addItem}
              style={{padding:"9px 20px",borderRadius:"8px",fontWeight:"700",fontSize:"13px",cursor:"pointer",border:"none",background:`linear-gradient(135deg,${gold},#d97706)`,color:"#060820",whiteSpace:"nowrap"}}>
              + Add
            </button>
          </div>
        </div>

        {message&&(
          <div style={{padding:"10px 14px",borderRadius:"8px",marginBottom:"12px",fontSize:"12px",background:message.ok?"rgba(16,185,129,0.1)":"rgba(239,68,68,0.1)",color:message.ok?green:red,border:`1px solid ${message.ok?"rgba(16,185,129,0.3)":"rgba(239,68,68,0.3)"}`}}>
            {message.text}
          </div>
        )}

        {/* Analysis loading */}
        {analyzing&&(
          <div style={{background:"linear-gradient(145deg,#0f172a,#1e293b)",border:"1px solid rgba(96,165,250,0.3)",borderRadius:"14px",padding:"30px",marginBottom:"16px",textAlign:"center"}}>
            <div style={{fontSize:"40px",marginBottom:"12px"}}>🧠</div>
            <div style={{color:blue,fontSize:"16px",fontWeight:"700",marginBottom:"6px"}}>Running Lynch + Wyckoff Analysis...</div>
            <div style={{color:"#475569",fontSize:"12px",marginBottom:"4px"}}>Fundamental engine · Technical phase detection · Synthesis scoring</div>
            <div style={{color:"#334155",fontSize:"11px"}}>{analyzeProgress}</div>
          </div>
        )}

        {/* Analysis result */}
        {analysis&&!analyzing&&(
          <div style={{background:"linear-gradient(145deg,#0f172a,#1e293b)",border:"1px solid rgba(96,165,250,0.3)",borderRadius:"14px",padding:"20px",marginBottom:"16px"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"16px"}}>
              <div style={{display:"flex",alignItems:"center",gap:"8px",flexWrap:"wrap"}}>
                <span style={{fontSize:"18px"}}>🧠</span>
                <span style={{color:"#f1f5f9",fontWeight:"700",fontSize:"14px"}}>Watchlist Analysis</span>
                <span style={{padding:"2px 8px",borderRadius:"10px",fontSize:"10px",fontWeight:"700",background:"rgba(16,185,129,0.15)",color:green,border:"1px solid rgba(16,185,129,0.3)"}}>LYNCH + WYCKOFF</span>
                <span style={{padding:"2px 8px",borderRadius:"10px",fontSize:"10px",fontWeight:"700",background:"rgba(96,165,250,0.15)",color:blue,border:"1px solid rgba(96,165,250,0.3)"}}>INSTITUTIONAL GRADE</span>
              </div>
              <button onClick={()=>setAnalysis(null)}
                style={{padding:"4px 10px",borderRadius:"6px",fontSize:"11px",cursor:"pointer",border:"1px solid #1e293b",background:"transparent",color:"#475569"}}>
                ✕ Close
              </button>
            </div>
            <pre style={{color:"#e2e8f0",fontSize:"12px",lineHeight:"1.8",whiteSpace:"pre-wrap",fontFamily:"'Courier New',monospace",margin:0}}>
              {analysis}
            </pre>
            <div style={{marginTop:"12px",fontSize:"10px",color:"#334155"}}>
              Lynch Fundamental Framework + Wyckoff Phase Analysis · Not financial advice
            </div>
          </div>
        )}

        {/* Search and filter */}
        <div style={{background:"linear-gradient(145deg,#0f172a,#1e293b)",border:"1px solid #1e293b",borderRadius:"12px",padding:"12px 16px",marginBottom:"12px",display:"flex",alignItems:"center",gap:"10px",flexWrap:"wrap"}}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search ticker or sector..."
            style={{padding:"7px 12px",borderRadius:"8px",border:"1px solid #1e293b",background:"#060820",color:"#f1f5f9",fontSize:"12px",outline:"none",minWidth:"200px"}}/>
          <div style={{display:"flex",gap:"4px"}}>
            {[["ALL","All"],["US","🇺🇸 US"],["UK","🇬🇧 UK"]].map(([v,l])=>(
              <button key={v} onClick={()=>setFilter(v)}
                style={{padding:"5px 12px",borderRadius:"7px",fontSize:"11px",fontWeight:"600",cursor:"pointer",border:"1px solid",
                  background:filter===v?"rgba(245,158,11,0.15)":"transparent",
                  color:filter===v?gold:"#64748b",
                  borderColor:filter===v?"rgba(245,158,11,0.35)":"#1e293b"}}>
                {l}
              </button>
            ))}
          </div>
          <span style={{fontSize:"11px",color:"#475569",marginLeft:"auto"}}>
            Showing <span style={{color:green,fontWeight:"700"}}>{filtered.length}</span> of {items.length}
          </span>
        </div>

        {/* Watchlist table */}
        <div style={{background:"linear-gradient(145deg,#0f172a,#1e293b)",border:"1px solid #1e293b",borderRadius:"14px",overflow:"hidden"}}>
          <div style={{padding:"12px 16px",borderBottom:"1px solid #1e293b",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <span style={{fontWeight:"700",color:"#f1f5f9",fontSize:"13px"}}>Monitored Stocks</span>
            <span style={{padding:"2px 8px",borderRadius:"10px",fontSize:"10px",fontWeight:"700",background:"rgba(245,158,11,0.15)",color:gold,border:"1px solid rgba(245,158,11,0.3)"}}>
              {filtered.length} stocks
            </span>
          </div>

          {filtered.length===0?(
            <div style={{textAlign:"center",padding:"50px 0"}}>
              <div style={{fontSize:"40px",marginBottom:"12px"}}>👁️</div>
              <div style={{color:"#f1f5f9",fontSize:"15px",fontWeight:"600",marginBottom:"6px"}}>
                {items.length===0?"No stocks yet":"No stocks match your filter"}
              </div>
              <div style={{color:"#475569",fontSize:"12px"}}>
                {items.length===0?"Add tickers above to start monitoring":"Try a different search or filter"}
              </div>
            </div>
          ):(
            <div style={{overflowX:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:"12px"}}>
                <thead>
                  <tr style={{background:"rgba(6,8,32,0.8)"}}>
                    {["Market","Ticker","Sector","Theme","Notes","Added","Action"].map(h=>(
                      <th key={h} style={{padding:"8px 14px",textAlign:"left",fontSize:"9px",fontWeight:"700",color:"#475569",textTransform:"uppercase",letterSpacing:"0.06em",borderBottom:"1px solid #1e293b",whiteSpace:"nowrap"}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(item=>(
                    <tr key={item.id} style={{borderBottom:"1px solid rgba(30,41,59,0.4)"}}
                      onMouseEnter={e=>{e.currentTarget.style.background="rgba(245,158,11,0.04)";}}
                      onMouseLeave={e=>{e.currentTarget.style.background="transparent";}}>
                      <td style={{padding:"10px 14px",color:steel,fontSize:"11px"}}>{item.market==="US"?"🇺🇸":"🇬🇧"} {item.market}</td>
                      <td style={{padding:"10px 14px"}}>
                        <span style={{fontFamily:"monospace",fontWeight:"800",color:gold,fontSize:"13px"}}>{item.ticker}</span>
                      </td>
                      <td style={{padding:"10px 14px"}}>
                        {item.sector?<span style={{padding:"2px 8px",borderRadius:"10px",fontSize:"10px",fontWeight:"600",background:"rgba(96,165,250,0.1)",color:blue,border:"1px solid rgba(96,165,250,0.2)"}}>{item.sector}</span>:<span style={{color:"#334155"}}>—</span>}
                      </td>
                      <td style={{padding:"10px 14px"}}>
                        {item.theme?<span style={{padding:"2px 8px",borderRadius:"10px",fontSize:"10px",fontWeight:"600",background:"rgba(167,139,250,0.1)",color:purple,border:"1px solid rgba(167,139,250,0.2)"}}>{item.theme}</span>:<span style={{color:"#334155"}}>—</span>}
                      </td>
                      <td style={{padding:"10px 14px",color:steel,fontSize:"11px",maxWidth:"160px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{item.notes||"—"}</td>
                      <td style={{padding:"10px 14px",color:"#475569",fontFamily:"monospace",fontSize:"10px"}}>{item.added}</td>
                      <td style={{padding:"10px 14px"}}>
                        <div style={{display:"flex",gap:"6px"}}>
                          <a href={`/analyzer?ticker=${item.ticker}&market=${item.market}`}
                            style={{padding:"4px 10px",borderRadius:"6px",fontSize:"10px",fontWeight:"600",cursor:"pointer",border:"1px solid rgba(245,158,11,0.3)",background:"rgba(245,158,11,0.1)",color:gold,textDecoration:"none",whiteSpace:"nowrap"}}>
                            🔬 Analyze
                          </a>
                          <button onClick={()=>remove(item.id)}
                            style={{padding:"4px 10px",borderRadius:"6px",fontSize:"10px",fontWeight:"600",cursor:"pointer",border:"1px solid rgba(239,68,68,0.3)",background:"rgba(239,68,68,0.1)",color:red,whiteSpace:"nowrap"}}>
                            Remove
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div style={{marginTop:"24px",textAlign:"center",color:"#1e293b",fontSize:"10px"}}>
          AlphaResearch v1.0 · Not financial advice · For institutional use only
        </div>
      </div>
    </div>
  );
}