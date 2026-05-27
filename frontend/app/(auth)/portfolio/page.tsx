"use client";
import React, { useState, useEffect } from "react";

const BACKEND = "https://alpha-research-center-backend.onrender.com";

interface Position {
  id: string; ticker: string; market: string; entry_date: string;
  entry_price: number; shares: number; stop_level: number;
  target_price: number; notes: string;
}

function n(v: unknown): number { const x = parseFloat(String(v)); return isNaN(x) ? 0 : x; }
function fmt(v: number): string { return v > 0 ? "$" + v.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2}) : "—"; }

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = React.useState(false);
  const copy = () => { navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2500); }); };
  return (
    <button onClick={copy} style={{background:copied?"rgba(34,197,94,0.15)":"transparent",border:`1px solid ${copied?"#22c55e44":"#253345"}`,color:copied?"#22c55e":"#4a5568",fontSize:"9px",padding:"3px 8px",cursor:"pointer",letterSpacing:"0.05em"}}>
      {copied?"✓ COPIED":"⧉ COPY"}
    </button>
  );
}

function generateLocalAnalysis(positions: Position[]): string {
  const total = positions.reduce((s,p) => s + n(p.entry_price)*n(p.shares), 0);
  const largest = positions.reduce((a,b) => n(a.entry_price)*n(a.shares) > n(b.entry_price)*n(b.shares) ? a : b);
  const pct = ((n(largest.entry_price)*n(largest.shares))/total*100).toFixed(1);
  const noStop = positions.filter(p => !p.stop_level).length;
  return `PORTFOLIO ANALYSIS — ${positions.length} POSITIONS · $${total.toLocaleString(undefined,{maximumFractionDigits:0})} DEPLOYED\n\nSWOT ANALYSIS\n${"─".repeat(40)}\nSTRENGTHS: ${positions.length} positions with defined entry points.\nWEAKNESSES: ${pct}% concentration in ${largest.ticker}. ${noStop} positions without stop losses.\nOPPORTUNITIES: Set price targets on all positions to lock in gains.\nTHREATS: ${noStop > 0 ? `${noStop} positions without stops — unlimited downside risk.` : "All positions have stops — good discipline."}\n\nPOSITION VERDICTS\n${"─".repeat(40)}\n${positions.map(p => { const cost=n(p.entry_price)*n(p.shares); const pp=(cost/total*100).toFixed(1); const v=cost/total>0.35?"REVIEW SIZE":!p.stop_level?"SET STOP LOSS":"HOLD"; return `${p.ticker}: ${v} — ${pp}% of portfolio ($${cost.toLocaleString(undefined,{maximumFractionDigits:0})})`; }).join("\n")}\n\nACTION REQUIRED\n${"─".repeat(40)}\nSet stop losses on all positions at 7-8% below entry immediately.`;
}

export default function Portfolio() {
  const [positions, setPositions] = useState<Position[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string|null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{text:string;ok:boolean}|null>(null);
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

  useEffect(() => { try { const s=localStorage.getItem("alpha_positions"); if(s) setPositions(JSON.parse(s)); } catch(e) {} }, []);

  const persist = (list: Position[]) => { setPositions(list); try { localStorage.setItem("alpha_positions", JSON.stringify(list)); } catch(e) {} };
  const resetForm = () => { setTicker(""); setMarket("US"); setEntryDate(new Date().toISOString().split("T")[0]); setEntryPrice(""); setShares(""); setStopLevel(""); setTargetPrice(""); setNotes(""); setEditId(null); };
  const openEdit = (p: Position) => { setEditId(p.id); setTicker(p.ticker); setMarket(p.market); setEntryDate(p.entry_date); setEntryPrice(String(p.entry_price)); setShares(String(p.shares)); setStopLevel(String(p.stop_level||"")); setTargetPrice(String(p.target_price||"")); setNotes(p.notes||""); setShowForm(true); setMsg(null); setAnalysis(null); window.scrollTo({top:0,behavior:"smooth"}); };

  const handleSave = () => {
    if (!ticker.trim()) { setMsg({text:"ENTER TICKER SYMBOL",ok:false}); return; }
    if (!entryPrice || n(entryPrice)===0) { setMsg({text:"ENTER ENTRY PRICE",ok:false}); return; }
    if (!shares || n(shares)===0) { setMsg({text:"ENTER NUMBER OF SHARES",ok:false}); return; }
    setSaving(true);
    const pos: Position = { id:editId||Date.now().toString(), ticker:ticker.trim().toUpperCase(), market, entry_date:entryDate, entry_price:n(entryPrice), shares:n(shares), stop_level:n(stopLevel), target_price:n(targetPrice), notes:notes.trim() };
    persist(editId ? positions.map(p=>p.id===editId?pos:p) : [...positions, pos]);
    setMsg({text:`${pos.ticker} — ${n(shares)} SHARES @ ${fmt(n(entryPrice))} ${editId?"UPDATED":"SAVED"}`,ok:true});
    resetForm(); setShowForm(false); setSaving(false);
  };

  const remove = (id: string) => { persist(positions.filter(p=>p.id!==id)); setAnalysis(null); };

  const analyzePortfolio = async () => {
    if (!positions.length) { setMsg({text:"ADD POSITIONS FIRST",ok:false}); return; }
    setAnalyzing(true); setAnalysis(null); setMsg(null);
    try {
      const res = await fetch(`${BACKEND}/analyze/portfolio-deep`, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({holdings:positions.map(p=>({ticker:p.ticker,shares:n(p.shares),entry_price:n(p.entry_price),stop_level:n(p.stop_level),target_price:n(p.target_price),notes:p.notes||""}))}) });
      if (!res.ok) throw new Error("Backend error "+res.status);
      const d = await res.json();
      if (d.status==="error") throw new Error(d.analysis);
      setAnalysis(d.analysis||"Analysis unavailable");
    } catch(e) { setAnalysis(generateLocalAnalysis(positions)); }
    setAnalyzing(false);
  };

  const total = positions.reduce((s,p)=>s+n(p.entry_price)*n(p.shares),0);
  const now = new Date();
  const timeStr = now.toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit",timeZone:"America/New_York"})+" EST";
  const dateStr = now.toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"}).toUpperCase();

  const inp = (label: string, value: string, setter: (v:string)=>void, type="text", placeholder="") => (
    <div>
      <div style={{color:"#253345",fontSize:"8px",letterSpacing:"0.08em",marginBottom:"3px"}}>{label}</div>
      <input type={type} value={value} onChange={e=>setter(e.target.value)} placeholder={placeholder}
        style={{width:"100%",boxSizing:"border-box",background:"#060d18",border:"1px solid #1a2535",color:"#e2e8f0",padding:"6px 8px",fontSize:"11px",fontFamily:"inherit",outline:"none"}}/>
    </div>
  );

  return (
    <div style={{minHeight:"100vh",background:"#060d18",fontFamily:"'SF Mono','Fira Code','Consolas',monospace",color:"#e2e8f0"}}>

      {/* TOP BAR */}
      <div style={{position:"fixed",top:0,left:0,right:0,zIndex:50,background:"#04080f",borderBottom:"1px solid #1a2535",display:"flex",alignItems:"center",justifyContent:"space-between",height:"44px"}}>
        <div style={{display:"flex",alignItems:"center",height:"100%"}}>
          <div style={{background:"#f59e0b",color:"#000",fontSize:"11px",fontWeight:"700",padding:"0 14px",height:"100%",display:"flex",alignItems:"center",letterSpacing:"0.08em"}}>ALPHA<span style={{opacity:0.6}}>RESEARCH</span></div>
          {[["dashboard","COMMAND CTR"],["analyzer","ANALYZER"],["watchlist","WATCHLIST"],["portfolio","PORTFOLIO"],["journal","JOURNAL"]].map(([href,label])=>(
            <a key={href} href={"/"+href} style={{display:"flex",alignItems:"center",height:"100%",padding:"0 14px",textDecoration:"none",fontSize:"10px",letterSpacing:"0.06em",borderBottom:href==="portfolio"?"2px solid #f59e0b":"2px solid transparent",color:href==="portfolio"?"#f59e0b":"#4a5568",fontWeight:href==="portfolio"?"700":"400"}}>{label}</a>
          ))}
        </div>
        <div style={{display:"flex",alignItems:"center",gap:"16px",paddingRight:"16px"}}>
          <div style={{display:"flex",alignItems:"center",gap:"4px"}}><div style={{width:"5px",height:"5px",borderRadius:"50%",background:"#22c55e"}}></div><span style={{color:"#22c55e",fontSize:"9px",letterSpacing:"0.08em"}}>LIVE</span></div>
          <span style={{color:"#253345",fontSize:"9px"}}>{dateStr} {timeStr}</span>
        </div>
      </div>

      <div style={{paddingTop:"44px"}}>

        {/* STAT STRIP */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",borderBottom:"1px solid #1a2535"}}>
          {[
            {label:"OPEN POSITIONS",value:String(positions.length),sub:"active trades",color:"#22c55e"},
            {label:"TOTAL DEPLOYED",value:"$"+total.toLocaleString(undefined,{maximumFractionDigits:0}),sub:"capital at risk",color:"#f59e0b"},
            {label:"MARKETS",value:positions.length>0?[...new Set(positions.map(p=>p.market))].join(" / "):"—",sub:"US / UK exposure",color:"#94a3b8"},
          ].map((s,i)=>(
            <div key={s.label} style={{padding:"10px 14px",borderRight:i<2?"1px solid #1a2535":"none"}}>
              <div style={{color:"#374151",fontSize:"9px",letterSpacing:"0.08em",marginBottom:"3px"}}>{s.label}</div>
              <div style={{color:s.color,fontSize:"20px",fontWeight:"700",lineHeight:"1"}}>{s.value}</div>
              <div style={{color:"#374151",fontSize:"9px",marginTop:"2px"}}>{s.sub}</div>
            </div>
          ))}
        </div>

        {/* ACTION BAR */}
        <div style={{background:"#04080f",borderBottom:"1px solid #1a2535",padding:"7px 14px",display:"flex",alignItems:"center",gap:"8px"}}>
          <span style={{color:"#374151",fontSize:"9px",letterSpacing:"0.06em"}}>PORTFOLIO TRACKER</span>
          <div style={{flex:1}}></div>
          {positions.length>0&&<button onClick={analyzePortfolio} disabled={analyzing} style={{background:"transparent",border:"1px solid #60a5fa44",color:analyzing?"#374151":"#60a5fa",fontSize:"9px",padding:"4px 12px",cursor:"pointer",letterSpacing:"0.06em"}}>{analyzing?"ANALYZING...":"🧠 AI ANALYSIS"}</button>}
          <button onClick={()=>{resetForm();setShowForm(!showForm);setMsg(null);setAnalysis(null);}} style={{background:"#f59e0b",border:"none",color:"#000",fontSize:"9px",fontWeight:"700",padding:"5px 14px",cursor:"pointer",letterSpacing:"0.06em"}}>+ ADD POSITION</button>
        </div>

        {/* ADD/EDIT FORM */}
        {showForm&&(
          <div style={{background:"#04080f",borderBottom:"1px solid #1a2535",padding:"12px 14px"}}>
            <div style={{color:"#374151",fontSize:"8px",letterSpacing:"0.1em",marginBottom:"10px"}}>{editId?"EDIT POSITION":"NEW POSITION"}</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:"8px",marginBottom:"10px"}}>
              {inp("TICKER *",ticker,setTicker,"text","NVDA")}
              <div>
                <div style={{color:"#253345",fontSize:"8px",letterSpacing:"0.08em",marginBottom:"3px"}}>MARKET</div>
                <select value={market} onChange={e=>setMarket(e.target.value)} style={{width:"100%",background:"#060d18",border:"1px solid #1a2535",color:"#e2e8f0",padding:"6px 8px",fontSize:"10px",fontFamily:"inherit",outline:"none"}}>
                  <option value="US">US</option><option value="UK">UK</option>
                </select>
              </div>
              {inp("ENTRY DATE",entryDate,setEntryDate,"date")}
              {inp("ENTRY PRICE *",entryPrice,setEntryPrice,"number","215.33")}
              {inp("SHARES *",shares,setShares,"number","100")}
              {inp("STOP LEVEL",stopLevel,setStopLevel,"number","195.00")}
              {inp("TARGET",targetPrice,setTargetPrice,"number","260.00")}
            </div>
            <div style={{marginBottom:"10px"}}>
              <div style={{color:"#253345",fontSize:"8px",letterSpacing:"0.08em",marginBottom:"3px"}}>NOTES / THESIS</div>
              <textarea value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Entry thesis, setup, catalyst..."
                style={{width:"100%",boxSizing:"border-box",background:"#060d18",border:"1px solid #1a2535",color:"#94a3b8",padding:"6px 8px",fontSize:"10px",fontFamily:"inherit",outline:"none",minHeight:"50px",resize:"vertical"}}/>
            </div>
            <div style={{display:"flex",gap:"8px"}}>
              <button onClick={handleSave} disabled={saving} style={{background:editId?"#60a5fa":"#f59e0b",border:"none",color:"#000",fontSize:"9px",fontWeight:"700",padding:"6px 16px",cursor:"pointer",letterSpacing:"0.06em"}}>{saving?"SAVING...":(editId?"UPDATE POSITION":"SAVE POSITION")}</button>
              <button onClick={()=>{setShowForm(false);resetForm();setMsg(null);}} style={{background:"transparent",border:"1px solid #1a2535",color:"#374151",fontSize:"9px",padding:"6px 12px",cursor:"pointer",letterSpacing:"0.06em"}}>CANCEL</button>
            </div>
          </div>
        )}

        {/* MSG */}
        {msg&&<div style={{padding:"6px 14px",background:msg.ok?"#052e16":"#1a0505",borderBottom:"1px solid #1a2535",color:msg.ok?"#22c55e":"#ef4444",fontSize:"9px",letterSpacing:"0.06em"}}>{msg.ok?"✓":"⚠"} {msg.text}</div>}

        {/* ANALYSIS */}
        {analyzing&&<div style={{padding:"40px 0",textAlign:"center"}}><div style={{color:"#60a5fa",fontSize:"10px",letterSpacing:"0.1em",marginBottom:"6px"}}>RUNNING PORTFOLIO ANALYSIS</div><div style={{color:"#253345",fontSize:"9px",letterSpacing:"0.08em"}}>SENIOR HEDGE FUND PM · WEB SEARCH · SWOT · POSITION VERDICTS</div></div>}
        {analysis&&!analyzing&&(
          <div style={{borderBottom:"1px solid #1a2535"}}>
            <div style={{padding:"8px 14px",background:"#04080f",borderBottom:"1px solid #1a2535",display:"flex",alignItems:"center",gap:"8px"}}>
              <span style={{color:"#e2e8f0",fontSize:"10px",fontWeight:"700",letterSpacing:"0.06em"}}>AI PORTFOLIO ANALYSIS</span>
              <span style={{background:"#0a1a2e",color:"#60a5fa",fontSize:"8px",padding:"2px 6px",letterSpacing:"0.05em"}}>HEDGE FUND GRADE</span>
              <div style={{flex:1}}></div>
              <CopyButton text={analysis}/>
              <button onClick={()=>setAnalysis(null)} style={{background:"transparent",border:"1px solid #1a2535",color:"#374151",fontSize:"9px",padding:"3px 8px",cursor:"pointer",letterSpacing:"0.05em"}}>✕ CLOSE</button>
            </div>
            <div style={{padding:"16px 14px",maxHeight:"500px",overflowY:"auto"}}>
              <pre style={{color:"#94a3b8",fontSize:"11px",lineHeight:"1.8",whiteSpace:"pre-wrap",fontFamily:"inherit",margin:0}}>{analysis}</pre>
            </div>
            <div style={{padding:"6px 14px",borderTop:"1px solid #1a2535",color:"#253345",fontSize:"8px",letterSpacing:"0.05em"}}>POWERED BY CLAUDE AI · NOT FINANCIAL ADVICE</div>
          </div>
        )}

        {/* POSITIONS TABLE */}
        <div>
          <div style={{padding:"6px 14px",background:"#04080f",borderBottom:"1px solid #1a2535",display:"flex",alignItems:"center",gap:"8px"}}>
            <span style={{color:"#e2e8f0",fontSize:"10px",fontWeight:"700",letterSpacing:"0.06em"}}>OPEN POSITIONS</span>
            <span style={{background:"#052e16",color:"#22c55e",fontSize:"8px",padding:"2px 8px",letterSpacing:"0.05em"}}>{positions.length} ACTIVE</span>
          </div>
          {positions.length===0?(
            <div style={{padding:"60px 0",textAlign:"center"}}>
              <div style={{color:"#253345",fontSize:"10px",letterSpacing:"0.1em",marginBottom:"6px"}}>NO POSITIONS TRACKED</div>
              <div style={{color:"#1a2535",fontSize:"9px",letterSpacing:"0.08em"}}>ADD YOUR FIRST POSITION ABOVE</div>
            </div>
          ):(
            <div style={{overflowX:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:"11px"}}>
                <thead>
                  <tr style={{background:"#04080f",borderBottom:"1px solid #1a2535"}}>
                    {["TICKER","MKT","ENTRY DATE","ENTRY PRICE","SHARES","POSITION SIZE","WEIGHT","STOP","TARGET","R/R","NOTES","ACTIONS"].map(h=>(
                      <th key={h} style={{padding:"6px 10px",textAlign:"left",color:"#253345",fontSize:"8px",letterSpacing:"0.08em",fontWeight:"600",whiteSpace:"nowrap"}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {positions.map((p,i)=>{
                    const ep=n(p.entry_price), sh=n(p.shares), sl=n(p.stop_level), tp=n(p.target_price);
                    const posSize=ep*sh;
                    const weight=(posSize/total*100).toFixed(1);
                    const rr = sl>0&&tp>0 ? ((tp-ep)/(ep-sl)).toFixed(1) : "—";
                    const overweight = posSize/total > 0.3;
                    return (
                      <tr key={p.id} style={{borderBottom:"1px solid #0d1520",background:i%2===0?"#0a1420":"#080e18"}}
                        onMouseEnter={e=>{e.currentTarget.style.background="#0f1c2e";}} onMouseLeave={e=>{e.currentTarget.style.background=i%2===0?"#0a1420":"#080e18";}}>
                        <td style={{padding:"8px 10px"}}>
                          <div style={{display:"flex",alignItems:"center",gap:"6px"}}>
                            <div style={{width:"3px",height:"32px",background:overweight?"#ef4444":"#22c55e",borderRadius:"1px"}}></div>
                            <div style={{color:"#f59e0b",fontWeight:"700",fontSize:"12px",letterSpacing:"0.03em"}}>{p.ticker}</div>
                          </div>
                        </td>
                        <td style={{padding:"8px 8px",color:"#374151",fontSize:"9px"}}>{p.market==="US"?"US":"🇬🇧"}</td>
                        <td style={{padding:"8px 8px",color:"#374151",fontSize:"9px",fontFamily:"monospace"}}>{p.entry_date}</td>
                        <td style={{padding:"8px 8px",color:"#e2e8f0",fontWeight:"600",fontFamily:"monospace"}}>{fmt(ep)}</td>
                        <td style={{padding:"8px 8px",color:"#94a3b8",fontFamily:"monospace"}}>{sh.toLocaleString()}</td>
                        <td style={{padding:"8px 8px",color:"#22c55e",fontWeight:"600",fontFamily:"monospace"}}>${posSize.toLocaleString(undefined,{maximumFractionDigits:0})}</td>
                        <td style={{padding:"8px 8px"}}>
                          <div style={{display:"flex",alignItems:"center",gap:"4px"}}>
                            <div style={{width:"36px",height:"3px",background:"#1a2535",borderRadius:"1px",overflow:"hidden"}}>
                              <div style={{height:"100%",width:`${Math.min(100,posSize/total*100*3)}%`,background:overweight?"#ef4444":"#f59e0b"}}></div>
                            </div>
                            <span style={{color:overweight?"#ef4444":"#94a3b8",fontSize:"9px",fontFamily:"monospace"}}>{weight}%</span>
                          </div>
                        </td>
                        <td style={{padding:"8px 8px",color:sl>0?"#ef4444":"#253345",fontFamily:"monospace",fontSize:"10px"}}>{sl>0?fmt(sl):"—"}</td>
                        <td style={{padding:"8px 8px",color:tp>0?"#22c55e":"#253345",fontFamily:"monospace",fontSize:"10px"}}>{tp>0?fmt(tp):"—"}</td>
                        <td style={{padding:"8px 8px",color:rr!=="—"&&parseFloat(rr)>=2?"#22c55e":rr!=="—"?"#f59e0b":"#253345",fontFamily:"monospace",fontSize:"10px"}}>{rr!=="—"?rr+"x":"—"}</td>
                        <td style={{padding:"8px 8px",color:"#374151",fontSize:"9px",maxWidth:"120px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.notes||"—"}</td>
                        <td style={{padding:"8px 8px"}}>
                          <div style={{display:"flex",gap:"3px"}}>
                            <button onClick={()=>openEdit(p)} style={{background:"transparent",border:"1px solid #1a3a5a",color:"#60a5fa",fontSize:"8px",padding:"2px 6px",cursor:"pointer",letterSpacing:"0.04em"}}>EDIT</button>
                            <button onClick={()=>remove(p.id)} style={{background:"transparent",border:"1px solid #3a1a1a",color:"#ef4444",fontSize:"8px",padding:"2px 6px",cursor:"pointer"}}>✕</button>
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
          DATA PERSISTED IN LOCAL STORAGE · AI ANALYSIS POWERED BY CLAUDE SONNET · NOT FINANCIAL ADVICE
        </div>
      </div>
    </div>
  );
}