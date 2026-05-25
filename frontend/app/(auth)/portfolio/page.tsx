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
  id: string;
  ticker: string;
  market: string;
  entry_date: string;
  entry_price: number;
  shares: number;
  stop_level: number;
  target_price: number;
  notes: string;
}

const gold = "#f59e0b";
const green = "#10b981";
const red = "#ef4444";
const steel = "#94a3b8";

function n(v: unknown): number {
  const x = parseFloat(String(v));
  return isNaN(x) ? 0 : x;
}

function fmt(v: number): string {
  if (!v || isNaN(v)) return "$0.00";
  return "$" + v.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});
}

export default function Portfolio() {
  const [positions, setPositions] = useState<Position[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{text:string,ok:boolean}|null>(null);
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
      const saved = localStorage.getItem("alpha_positions");
      if (saved) setPositions(JSON.parse(saved));
    } catch(e) {}
  }, []);

  const persist = (list: Position[]) => {
    setPositions(list);
    try { localStorage.setItem("alpha_positions", JSON.stringify(list)); } catch(e) {}
  };

  const handleSave = () => {
    if (!ticker.trim()) { setMessage({text:"Please enter a ticker symbol", ok:false}); return; }
    if (!entryPrice || n(entryPrice) === 0) { setMessage({text:"Please enter entry price", ok:false}); return; }
    if (!shares || n(shares) === 0) { setMessage({text:"Please enter number of shares", ok:false}); return; }

    setSaving(true);
    const pos: Position = {
      id: Date.now().toString(),
      ticker: ticker.trim().toUpperCase(),
      market,
      entry_date: entryDate,
      entry_price: n(entryPrice),
      shares: n(shares),
      stop_level: n(stopLevel),
      target_price: n(targetPrice),
      notes: notes.trim(),
    };

    persist([...positions, pos]);
    setMessage({text:`✅ ${pos.ticker} — ${pos.shares} shares @ ${fmt(pos.entry_price)} saved!`, ok:true});
    setTicker(""); setEntryPrice(""); setShares(""); setStopLevel(""); setTargetPrice(""); setNotes("");
    setShowForm(false);
    setSaving(false);
  };

  const remove = (id: string) => persist(positions.filter(p => p.id !== id));

  const totalDeployed = positions.reduce((s, p) => s + (n(p.entry_price) * n(p.shares)), 0);

  const inp = (label: string, value: string, setter: (v:string)=>void, type="text", placeholder="") => (
    <div style={{display:"flex",flexDirection:"column",gap:"4px"}}>
      <label style={{fontSize:"10px",fontWeight:"700",color:"#64748b",textTransform:"uppercase",letterSpacing:"0.05em"}}>{label}</label>
      <input type={type} value={value} onChange={e=>setter(e.target.value)} placeholder={placeholder}
        style={{padding:"10px 12px",borderRadius:"8px",border:"1px solid #1e293b",background:"#0f172a",color:"#f1f5f9",fontSize:"13px",outline:"none",width:"100%",boxSizing:"border-box"}}/>
    </div>
  );

  return (
    <div style={{minHeight:"100vh",background:"linear-gradient(135deg,#060820 0%,#0d1145 50%,#060820 100%)"}}>
      <Navigation/>
      <div style={{maxWidth:"1200px",margin:"0 auto",padding:"72px 20px 40px"}}>

        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"20px"}}>
          <div>
            <h1 style={{fontSize:"22px",fontWeight:"900",color:"#f1f5f9",marginBottom:"2px"}}>
              <span style={{color:gold}}>Portfolio</span> Tracker
            </h1>
            <p style={{color:"#475569",fontSize:"12px"}}>{positions.length} open positions · Track entries, stops and targets</p>
          </div>
          <button onClick={()=>{setShowForm(!showForm);setMessage(null);}}
            style={{padding:"10px 20px",borderRadius:"10px",fontWeight:"700",fontSize:"13px",cursor:"pointer",border:"none",background:`linear-gradient(135deg,${gold},#d97706)`,color:"#060820"}}>
            + Add Position
          </button>
        </div>

        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"10px",marginBottom:"16px"}}>
          {[
            {label:"Open Positions", value:String(positions.length), color:green},
            {label:"Total Deployed", value:"$"+totalDeployed.toLocaleString(undefined,{maximumFractionDigits:0}), color:gold},
            {label:"Markets", value:positions.length>0?[...new Set(positions.map(p=>p.market))].join(" · "):"—", color:steel},
          ].map(s=>(
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
          <div style={{background:"linear-gradient(145deg,#0f172a,#1e293b)",border:"1px solid rgba(245,158,11,0.3)",borderRadius:"14px",padding:"20px",marginBottom:"16px"}}>
            <h3 style={{color:"#f1f5f9",fontSize:"14px",fontWeight:"700",marginBottom:"16px"}}>📋 New Position</h3>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"12px",marginBottom:"12px"}}>
              {inp("Ticker *", ticker, setTicker, "text", "NVDA")}
              <div style={{display:"flex",flexDirection:"column",gap:"4px"}}>
                <label style={{fontSize:"10px",fontWeight:"700",color:"#64748b",textTransform:"uppercase",letterSpacing:"0.05em"}}>Market *</label>
                <select value={market} onChange={e=>setMarket(e.target.value)}
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
              <textarea value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Thesis, setup notes, catalyst..."
                style={{padding:"10px 12px",borderRadius:"8px",border:"1px solid #1e293b",background:"#0f172a",color:"#f1f5f9",fontSize:"13px",minHeight:"60px",resize:"vertical",width:"100%",boxSizing:"border-box"}}/>
            </div>
            <div style={{display:"flex",gap:"8px"}}>
              <button onClick={handleSave} disabled={saving}
                style={{padding:"10px 24px",borderRadius:"8px",fontWeight:"700",fontSize:"13px",cursor:"pointer",border:"none",background:`linear-gradient(135deg,${gold},#d97706)`,color:"#060820"}}>
                {saving?"Saving...":"💾 Save Position"}
              </button>
              <button onClick={()=>{setShowForm(false);setMessage(null);}}
                style={{padding:"10px 20px",borderRadius:"8px",fontWeight:"600",fontSize:"13px",cursor:"pointer",border:"1px solid #1e293b",background:"transparent",color:"#64748b"}}>
                Cancel
              </button>
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
                    {["Ticker","Market","Entry Date","Entry Price","Shares","Position Size","Stop","Target","Notes","Action"].map(h=>(
                      <th key={h} style={{padding:"8px 12px",textAlign:"left",fontSize:"9px",fontWeight:"700",color:"#475569",textTransform:"uppercase",letterSpacing:"0.06em",borderBottom:"1px solid #1e293b",whiteSpace:"nowrap"}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {positions.map(p => {
                    const ep = n(p.entry_price);
                    const sh = n(p.shares);
                    const sl = n(p.stop_level);
                    const tp = n(p.target_price);
                    const posSize = ep * sh;
                    return (
                      <tr key={p.id} style={{borderBottom:"1px solid rgba(30,41,59,0.4)"}}
                        onMouseEnter={e=>{e.currentTarget.style.background="rgba(245,158,11,0.04)";}}
                        onMouseLeave={e=>{e.currentTarget.style.background="transparent";}}>
                        <td style={{padding:"10px 12px"}}>
                          <span style={{fontFamily:"monospace",fontWeight:"800",color:gold,fontSize:"13px"}}>{p.ticker}</span>
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
                          <button onClick={()=>remove(p.id)}
                            style={{padding:"4px 10px",borderRadius:"6px",fontSize:"10px",fontWeight:"600",cursor:"pointer",border:`1px solid rgba(239,68,68,0.3)`,background:"rgba(239,68,68,0.1)",color:red}}>
                            Remove
                          </button>
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