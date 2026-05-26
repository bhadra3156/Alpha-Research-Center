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

interface Position {
  id: string; ticker: string; market: string; entry_date: string;
  entry_price: number; shares: number; stop_level: number;
  target_price: number; notes: string;
}

const gold="#f59e0b", green="#10b981", red="#ef4444", steel="#94a3b8", blue="#60a5fa";
const BACKEND = "https://alpha-research-center-backend.onrender.com";

function n(v: unknown): number {
  const x = parseFloat(String(v));
  return isNaN(x) ? 0 : x;
}

function fmt(v: number): string {
  if (!v || isNaN(v)) return "$0.00";
  return "$" + v.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2});
}

function generateLocalAnalysis(positions: Position[]): string {
  const total = positions.reduce((s,p) => s + n(p.entry_price)*n(p.shares), 0);
  const largest = positions.reduce((a,b) => n(a.entry_price)*n(a.shares) > n(b.entry_price)*n(b.shares) ? a : b);
  const largestPct = ((n(largest.entry_price)*n(largest.shares))/total*100).toFixed(1);
  const noStop = positions.filter(p => !p.stop_level).length;
  return `PORTFOLIO ANALYSIS — ${positions.length} POSITIONS · $${total.toLocaleString(undefined,{maximumFractionDigits:0})} DEPLOYED

SWOT ANALYSIS
━━━━━━━━━━━━
STRENGTHS: ${positions.length} diversified positions with defined entry points.
WEAKNESSES: ${largestPct}% concentration in ${largest.ticker}. ${noStop} positions without stop losses.
OPPORTUNITIES: Set price targets on all positions to lock in gains systematically.
THREATS: ${noStop > 0 ? `${noStop} positions without stops creates unlimited downside risk.` : "All positions have stop losses — good discipline."}

POSITION VERDICTS
━━━━━━━━━━━━━━━
${positions.map(p => {
  const cost = n(p.entry_price)*n(p.shares);
  const pct = (cost/total*100).toFixed(1);
  const verdict = cost/total > 0.35 ? "REVIEW SIZE" : !p.stop_level ? "SET STOP LOSS" : "HOLD";
  return `${p.ticker}: ${verdict} — ${pct}% of portfolio ($${cost.toLocaleString(undefined,{maximumFractionDigits:0})})`;
}).join("\n")}

TOP RECOMMENDATION
━━━━━━━━━━━━━━━━
Set stop losses on all positions at 7-8% below entry immediately.
Note: Connect to Render backend for full Claude AI analysis with web search.`;
}

export default function Portfolio() {
  const [positions, setPositions] = useState<Position[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string|null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{text:string,ok:boolean}|null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<string|null>(null);
  const [ticker, setTicker] = useState("");
  const [market, setMarket] = useState("US");
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split("T")[0]);
  const [entryPrice, setEntryPrice] = useState("");
  const [shares, setShares] = useState("");
  const [stopLevel, setStopLevel] = useState("");
  const [targetPrice, setTargetPrice] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    try {
      const s = localStorage.getItem("alpha_positions");
      if (s) setPositions(JSON.parse(s));
    } catch(e) {}
  }, []);

  const persist = (list: Position[]) => {
    setPositions(list);
    try { localStorage.setItem("alpha_positions", JSON.stringify(list)); } catch(e) {}
  };

  const resetForm = () => {
    setTicker(""); setMarket("US");
    setEntryDate(new Date().toISOString().split("T")[0]);
    setEntryPrice(""); setShares(""); setStopLevel("");
    setTargetPrice(""); setNotes(""); setEditId(null);
  };

  const openEdit = (p: Position) => {
    setEditId(p.id); setTicker(p.ticker); setMarket(p.market);
    setEntryDate(p.entry_date); setEntryPrice(String(p.entry_price));
    setShares(String(p.shares)); setStopLevel(String(p.stop_level||""));
    setTargetPrice(String(p.target_price||"")); setNotes(p.notes||"");
    setShowForm(true); setMessage(null); setAnalysis(null);
    window.scrollTo({top:0, behavior:"smooth"});
  };

  const handleSave = () => {
    if (!ticker.trim()) { setMessage({text:"Please enter a ticker symbol", ok:false}); return; }
    if (!entryPrice || n(entryPrice) === 0) { setMessage({text:"Please enter entry price", ok:false}); return; }
    if (!shares || n(shares) === 0) { setMessage({text:"Please enter number of shares", ok:false}); return; }
    setSaving(true);
    const pos: Position = {
      id: editId || Date.now().toString(),
      ticker: ticker.trim().toUpperCase(), market, entry_date: entryDate,
      entry_price: n(entryPrice), shares: n(shares),
      stop_level: n(stopLevel), target_price: n(targetPrice), notes: notes.trim()
    };
    const updated = editId ? positions.map(p => p.id === editId ? pos : p) : [...positions, pos];
    persist(updated);
    setMessage({text:`✅ ${pos.ticker} — ${n(shares)} shares @ ${fmt(n(entryPrice))} ${editId?"updated":"saved"}!`, ok:true});
    resetForm(); setShowForm(false); setSaving(false);
  };

  const remove = (id: string) => { persist(positions.filter(p => p.id !== id)); setAnalysis(null); };

  const analyzePortfolio = async () => {
    if (positions.length === 0) { setMessage({text:"Add positions first before analyzing", ok:false}); return; }
    setAnalyzing(true); setAnalysis(null); setMessage(null);
    try {
      const res = await fetch(`${BACKEND}/analyze/portfolio-deep`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({
          holdings: positions.map(p => ({
            ticker: p.ticker,
            shares: n(p.shares),
            entry_price: n(p.entry_price),
            stop_level: n(p.stop_level),
            target_price: n(p.target_price),
            notes: p.notes || ""
          }))
        })
      });
      if (!res.ok) throw new Error("Backend error " + res.status);
      const data = await res.json();
      if (data.status === "error") throw new Error(data.analysis);
      setAnalysis(data.analysis || "Analysis unavailable");
    } catch(e) {
      setAnalysis(generateLocalAnalysis(positions));
    }
    setAnalyzing(false);
  };

  const totalDeployed = positions.reduce((s,p) => s + n(p.entry_price)*n(p.shares), 0);

  const inp = (label: string, value: string, setter: (v:string)=>void, type="text", placeholder="") => (
    <div style={{display:"flex",flexDirection:"column",gap:"4px"}}>
      <label style={{fontSize:"10px",fontWeight:"700",color:"#64748b",textTransform:"uppercase",letterSpacing:"0.05em"}}>{label}</label>
      <input type={type} value={value} onChange={e => setter(e.target.value)} placeholder={placeholder}
        style={{padding:"10px 12px",borderRadius:"8px",border:"1px solid #1e293b",background:"#0f172a",color:"#f1f5f9",fontSize:"13px",outline:"none",width:"100%",boxSizing:"border-box"}}/>
    </div>
  );

  return (
    <div style={{minHeight:"100vh",background:"linear-gradient(135deg,#060820 0%,#0d1145 50%,#060820 100%)"}}>
      <Navigation/>
      <div style={{maxWidth:"1200px",margin:"0 auto",padding:"72px 20px 40px"}}>

        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"20px",flexWrap:"wrap",gap:"10px"}}>
          <div>
            <h1 style={{fontSize:"22px",fontWeight:"900",color:"#f1f5f9",marginBottom:"2px"}}>
              <span style={{color:gold}}>Portfolio</span> Tracker
            </h1>
            <p style={{color:"#475569",fontSize:"12px"}}>{positions.length} open positions · Track entries, stops and targets</p>
          </div>
          <div style={{display:"flex",gap:"8px"}}>
            {positions.length > 0 && (
              <button onClick={analyzePortfolio} disabled={analyzing}
                style={{padding:"10px 20px",borderRadius:"10px",fontWeight:"700",fontSize:"13px",cursor:analyzing?"wait":"pointer",border:"1px solid rgba(96,165,250,0.4)",background:analyzing?"rgba(96,165,250,0.1)":"rgba(96,165,250,0.15)",color:analyzing?"#64748b":blue}}>
                {analyzing ? "🧠 Analyzing..." : "🧠 AI Analysis"}
              </button>
            )}
            <button onClick={() => {resetForm(); setShowForm(!showForm); setMessage(null); setAnalysis(null);}}
              style={{padding:"10px 20px",borderRadius:"10px",fontWeight:"700",fontSize:"13px",cursor:"pointer",border:"none",background:`linear-gradient(135deg,${gold},#d97706)`,color:"#060820"}}>
              + Add Position
            </button>
          </div>
        </div>

        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"10px",marginBottom:"16px"}}>
          {[
            {label:"Open Positions", value:String(positions.length), color:green},
            {label:"Total Deployed", value:"$"+totalDeployed.toLocaleString(undefined,{maximumFractionDigits:0}), color:gold},
            {label:"Markets", value:positions.length>0?[...new Set(positions.map(p=>p.market))].join(" · "):"—", color:steel},
          ].map(s => (
            <div key={s.label} style={{background:"linear-gradient(145deg,#0f172a,#1e293b)",border:"1px solid #1e293b",borderRadius:"12px",padding:"14px 18px"}}>
              <div style={{fontSize:"22px",fontWeight:"900",color:s.color,fontFamily:"monospace"}}>{s.value}</div>
              <div style={{fontSize:"10px",color:"#475569",textTransform:"uppercase",letterSpacing:"0.05em",marginTop:"2px"}}>{s.label}</div>
            </div>
          ))}
        </div>

        {message && (
          <div style={{padding:"10px 14px",borderRadius:"8px",marginBottom:"12px",fontSize:"12px",background:message.ok?"rgba(16,185,129,0.1)":"rgba(239,68,68,0.1)",color:message.ok?green:red,border:`1px solid ${message.ok?"rgba(16,185,129,0.3)":"rgba(239,68,68,0.3)"}`}}>
            {message.text}
          </div>
        )}

        {showForm && (
          <div style={{background:"linear-gradient(145deg,#0f172a,#1e293b)",border:`1px solid ${editId?"rgba(96,165,250,0.4)":"rgba(245,158,11,0.3)"}`,borderRadius:"14px",padding:"20px",marginBottom:"16px"}}>
            <h3 style={{color:"#f1f5f9",fontSize:"14px",fontWeight:"700",marginBottom:"16px"}}>
              {editId ? "✏️ Edit Position" : "📋 New Position"}
            </h3>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"12px",marginBottom:"12px"}}>
              {inp("Ticker *", ticker, setTicker, "text", "NVDA")}
              <div style={{display:"flex",flexDirection:"column",gap:"4px"}}>
                <label style={{fontSize:"10px",fontWeight:"700",color:"#64748b",textTransform:"uppercase",letterSpacing:"0.05em"}}>Market *</label>
                <select value={market} onChange={e => setMarket(e.target.value)}
                  style={{padding:"10px 12px",borderRadius:"8px",border:"1px solid #1e293b",background:"#0f172a",color:"#f1f5f9",fontSize:"13px"}}>
                  <option value="US">🇺🇸 US</option>
                  <option value="UK">🇬🇧 UK</option>
                </select>
              </div>
              {inp("Entry Date *", entryDate, setEntryDate, "date")}
              {inp("Entry Price *", entryPrice, setEntryPrice, "number", "215.33")}
              {inp("Shares *", shares, setShares, "number", "100")}
              {inp("Stop Level", stopLevel, setStopLevel, "number", "195.00")}
              {inp("Target Price", targetPrice, setTargetPrice, "number", "260.00")}
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:"4px",marginBottom:"16px"}}>
              <label style={{fontSize:"10px",fontWeight:"700",color:"#64748b",textTransform:"uppercase",letterSpacing:"0.05em"}}>Notes</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Thesis, setup notes, catalyst..."
                style={{padding:"10px 12px",borderRadius:"8px",border:"1px solid #1e293b",background:"#0f172a",color:"#f1f5f9",fontSize:"13px",minHeight:"60px",resize:"vertical",width:"100%",boxSizing:"border-box"}}/>
            </div>
            <div style={{display:"flex",gap:"8px"}}>
              <button onClick={handleSave} disabled={saving}
                style={{padding:"10px 24px",borderRadius:"8px",fontWeight:"700",fontSize:"13px",cursor:"pointer",border:"none",background:`linear-gradient(135deg,${editId?blue:gold},${editId?"#3b82f6":"#d97706"})`,color:"#060820"}}>
                {saving ? "Saving..." : (editId ? "✅ Update Position" : "💾 Save Position")}
              </button>
              <button onClick={() => {setShowForm(false); resetForm(); setMessage(null);}}
                style={{padding:"10px 20px",borderRadius:"8px",fontWeight:"600",fontSize:"13px",cursor:"pointer",border:"1px solid #1e293b",background:"transparent",color:"#64748b"}}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {analyzing && (
          <div style={{background:"linear-gradient(145deg,#0f172a,#1e293b)",border:"1px solid rgba(96,165,250,0.3)",borderRadius:"14px",padding:"30px",marginBottom:"16px",textAlign:"center"}}>
            <div style={{fontSize:"40px",marginBottom:"12px"}}>🧠</div>
            <div style={{color:blue,fontSize:"16px",fontWeight:"700",marginBottom:"6px"}}>Analyzing your portfolio...</div>
            <div style={{color:"#475569",fontSize:"12px"}}>Senior hedge fund PM · Web search for real prices · SWOT · Hold/Buy/Sell verdicts</div>
            <div style={{color:"#334155",fontSize:"11px",marginTop:"6px"}}>This takes 60-90 seconds — Claude is researching each position</div>
          </div>
        )}

        {analysis && !analyzing && (
          <div style={{background:"linear-gradient(145deg,#0f172a,#1e293b)",border:"1px solid rgba(96,165,250,0.3)",borderRadius:"14px",padding:"20px",marginBottom:"16px"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"16px"}}>
              <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
                <span style={{fontSize:"18px"}}>🧠</span>
                <span style={{color:"#f1f5f9",fontWeight:"700",fontSize:"14px"}}>AI Portfolio Analysis</span>
                <span style={{padding:"2px 8px",borderRadius:"10px",fontSize:"10px",fontWeight:"700",background:"rgba(96,165,250,0.15)",color:blue,border:"1px solid rgba(96,165,250,0.3)"}}>HEDGE FUND GRADE</span>
              </div>
              <button onClick={() => setAnalysis(null)}
                style={{padding:"4px 10px",borderRadius:"6px",fontSize:"11px",cursor:"pointer",border:"1px solid #1e293b",background:"transparent",color:"#475569"}}>
                ✕ Close
              </button>
            </div>
            <pre style={{color:"#e2e8f0",fontSize:"12px",lineHeight:"1.7",whiteSpace:"pre-wrap",fontFamily:"'Courier New',monospace",margin:0}}>
              {analysis}
            </pre>
            <div style={{marginTop:"12px",fontSize:"10px",color:"#334155"}}>
              Powered by Claude AI · Not financial advice · For informational purposes only
            </div>
          </div>
        )}

        <div style={{background:"linear-gradient(145deg,#0f172a,#1e293b)",border:"1px solid #1e293b",borderRadius:"14px",overflow:"hidden"}}>
          <div style={{padding:"12px 16px",borderBottom:"1px solid #1e293b"}}>
            <span style={{fontWeight:"700",color:"#f1f5f9",fontSize:"13px"}}>Open Positions</span>
          </div>
          {positions.length === 0 ? (
            <div style={{textAlign:"center",padding:"50px 0"}}>
              <div style={{fontSize:"40px",marginBottom:"12px"}}>💼</div>
              <div style={{color:"#f1f5f9",fontSize:"15px",fontWeight:"600",marginBottom:"6px"}}>No positions yet</div>
              <div style={{color:"#475569",fontSize:"12px"}}>Click Add Position to track your first trade</div>
            </div>
          ) : (
            <div style={{overflowX:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:"12px"}}>
                <thead>
                  <tr style={{background:"rgba(6,8,32,0.8)"}}>
                    {["Ticker","Market","Entry Date","Entry Price","Shares","Position Size","Stop","Target","Notes","Actions"].map(h => (
                      <th key={h} style={{padding:"8px 12px",textAlign:"left",fontSize:"9px",fontWeight:"700",color:"#475569",textTransform:"uppercase",letterSpacing:"0.06em",borderBottom:"1px solid #1e293b",whiteSpace:"nowrap"}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {positions.map(p => {
                    const ep=n(p.entry_price), sh=n(p.shares), sl=n(p.stop_level), tp=n(p.target_price);
                    const posSize = ep * sh;
                    const pct = (posSize/totalDeployed*100).toFixed(1);
                    return (
                      <tr key={p.id} style={{borderBottom:"1px solid rgba(30,41,59,0.4)"}}
                        onMouseEnter={e => {e.currentTarget.style.background="rgba(245,158,11,0.04)";}}
                        onMouseLeave={e => {e.currentTarget.style.background="transparent";}}>
                        <td style={{padding:"10px 12px"}}>
                          <div style={{fontFamily:"monospace",fontWeight:"800",color:gold,fontSize:"13px"}}>{p.ticker}</div>
                          <div style={{fontSize:"9px",color:"#475569",marginTop:"1px"}}>{pct}% of portfolio</div>
                        </td>
                        <td style={{padding:"10px 12px",color:steel,fontSize:"11px"}}>{p.market==="US"?"🇺🇸":"🇬🇧"} {p.market}</td>
                        <td style={{padding:"10px 12px",color:steel,fontFamily:"monospace",fontSize:"11px"}}>{p.entry_date}</td>
                        <td style={{padding:"10px 12px",fontFamily:"monospace",color:"#f1f5f9",fontWeight:"600"}}>{fmt(ep)}</td>
                        <td style={{padding:"10px 12px",fontFamily:"monospace",color:steel}}>{sh.toLocaleString()}</td>
                        <td style={{padding:"10px 12px",fontFamily:"monospace",color:green,fontWeight:"600"}}>${posSize.toLocaleString(undefined,{maximumFractionDigits:0})}</td>
                        <td style={{padding:"10px 12px",fontFamily:"monospace",color:sl>0?red:steel}}>{sl>0?fmt(sl):"—"}</td>
                        <td style={{padding:"10px 12px",fontFamily:"monospace",color:tp>0?green:steel}}>{tp>0?fmt(tp):"—"}</td>
                        <td style={{padding:"10px 12px",color:steel,fontSize:"11px",maxWidth:"120px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.notes||"—"}</td>
                        <td style={{padding:"10px 12px"}}>
                          <div style={{display:"flex",gap:"6px"}}>
                            <button onClick={() => openEdit(p)}
                              style={{padding:"4px 10px",borderRadius:"6px",fontSize:"10px",fontWeight:"600",cursor:"pointer",border:"1px solid rgba(96,165,250,0.3)",background:"rgba(96,165,250,0.1)",color:blue,whiteSpace:"nowrap"}}>
                              ✏️ Edit
                            </button>
                            <button onClick={() => remove(p.id)}
                              style={{padding:"4px 10px",borderRadius:"6px",fontSize:"10px",fontWeight:"600",cursor:"pointer",border:"1px solid rgba(239,68,68,0.3)",background:"rgba(239,68,68,0.1)",color:red,whiteSpace:"nowrap"}}>
                              Remove
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

        <div style={{marginTop:"24px",textAlign:"center",color:"#1e293b",fontSize:"10px"}}>
          AlphaResearch v1.0 · Not financial advice · For institutional use only
        </div>
      </div>
    </div>
  );
}