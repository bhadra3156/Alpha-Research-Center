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
  id: string; ticker: string; company_name: string; market: string;
  entry_date: string; entry_price: number; shares: number;
  stop_level: number; target_price: number; notes: string;
  status: string; pnl_pct?: number; current_price?: number;
}

const API = "https://alpha-research-center-backend.onrender.com";
const gold = "#f59e0b"; const green = "#10b981"; const red = "#ef4444"; const steel = "#94a3b8";

export default function Portfolio() {
  const [positions, setPositions] = useState<Position[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{text:string,ok:boolean}|null>(null);
  const [form, setForm] = useState({
    ticker:"", market:"US", entry_date: new Date().toISOString().split("T")[0],
    entry_price:"", shares:"", stop_level:"", target_price:"", notes:""
  });

  // Load positions from localStorage (persistent without backend)
  useEffect(() => {
    try {
      const saved = localStorage.getItem("alpharesearch_positions");
      if (saved) setPositions(JSON.parse(saved));
    } catch(e) {}
  }, []);

  const saveToLocal = (newPositions: Position[]) => {
    localStorage.setItem("alpharesearch_positions", JSON.stringify(newPositions));
    setPositions(newPositions);
  };

  const handleSave = async () => {
    if (!form.ticker || !form.entry_price || !form.shares) {
      setMessage({text:"Please fill in Ticker, Entry Price and Shares", ok:false});
      return;
    }
    setSaving(true);
    setMessage(null);

    const newPos: Position = {
      id: Date.now().toString(),
      ticker: form.ticker.toUpperCase(),
      company_name: form.ticker.toUpperCase(),
      market: form.market,
      entry_date: form.entry_date,
      entry_price: parseFloat(form.entry_price),
      shares: parseFloat(form.shares),
      stop_level: parseFloat(form.stop_level) || 0,
      target_price: parseFloat(form.target_price) || 0,
      notes: form.notes,
      status: "OPEN",
    };

    // Try backend first, fall back to localStorage
    try {
      const res = await fetch(`${API}/portfolio/`, {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body: JSON.stringify(newPos),
      });
      if (res.ok) {
        const saved = await res.json();
        const updated = [...positions, saved];
        saveToLocal(updated);
        setMessage({text:`✅ ${newPos.ticker} position saved!`, ok:true});
      } else {
        throw new Error("Backend error");
      }
    } catch(e) {
      // Save locally if backend fails
      const updated = [...positions, newPos];
      saveToLocal(updated);
      setMessage({text:`✅ ${newPos.ticker} saved locally!`, ok:true});
    }

    setForm({ticker:"",market:"US",entry_date:new Date().toISOString().split("T")[0],entry_price:"",shares:"",stop_level:"",target_price:"",notes:""});
    setShowForm(false);
    setSaving(false);
  };

  const handleDelete = (id: string) => {
    const updated = positions.filter(p => p.id !== id);
    saveToLocal(updated);
  };

  const totalDeployed = positions.reduce((s,p) => s + (p.entry_price * (p.shares||0)), 0);
  const inp = (label:string, key:string, type="text", placeholder="") => (
    <div style={{display:"flex",flexDirection:"column",gap:"4px"}}>
      <label style={{fontSize:"10px",fontWeight:"700",color:"#64748b",textTransform:"uppercase",letterSpacing:"0.05em"}}>{label}</label>
      <input type={type} value={(form as any)[key]} onChange={e=>setForm({...form,[key]:e.target.value})} placeholder={placeholder}
        style={{padding:"10px 12px",borderRadius:"8px",border:"1px solid #1e293b",background:"#0f172a",color:"#f1f5f9",fontSize:"13px",outline:"none"}}/>
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
          <button onClick={()=>setShowForm(!showForm)}
            style={{padding:"10px 20px",borderRadius:"10px",fontWeight:"700",fontSize:"13px",cursor:"pointer",border:"none",background:`linear-gradient(135deg,${gold},#d97706)`,color:"#060820"}}>
            + Add Position
          </button>
        </div>

        {/* Stats */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"10px",marginBottom:"16px"}}>
          {[
            {label:"Open Positions", value:String(positions.length), color:green},
            {label:"Total Deployed", value:`$${totalDeployed.toLocaleString(undefined,{maximumFractionDigits:0})}`, color:gold},
            {label:"Markets", value:positions.length>0?[...new Set(positions.map(p=>p.market))].join(" · "):"—", color:steel},
          ].map(s=>(
            <div key={s.label} style={{background:"linear-gradient(145deg,#0f172a,#1e293b)",border:"1px solid #1e293b",borderRadius:"12px",padding:"14px 18px"}}>
              <div style={{fontSize:"22px",fontWeight:"900",color:s.color,fontFamily:"monospace"}}>{s.value}</div>
              <div style={{fontSize:"10px",color:"#475569",textTransform:"uppercase",letterSpacing:"0.05em",marginTop:"2px"}}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Message */}
        {message && (
          <div style={{padding:"10px 14px",borderRadius:"8px",marginBottom:"12px",fontSize:"12px",
            background:message.ok?"rgba(16,185,129,0.1)":"rgba(239,68,68,0.1)",
            color:message.ok?green:red,border:`1px solid ${message.ok?"rgba(16,185,129,0.3)":"rgba(239,68,68,0.3)"}`}}>
            {message.text}
          </div>
        )}

        {/* Add Form */}
        {showForm && (
          <div style={{background:"linear-gradient(145deg,#0f172a,#1e293b)",border:"1px solid rgba(245,158,11,0.3)",borderRadius:"14px",padding:"20px",marginBottom:"16px"}}>
            <h3 style={{color:"#f1f5f9",fontSize:"14px",fontWeight:"700",marginBottom:"16px"}}>📋 New Position</h3>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"12px",marginBottom:"12px"}}>
              {inp("Ticker *","ticker","text","NVDA")}
              <div style={{display:"flex",flexDirection:"column",gap:"4px"}}>
                <label style={{fontSize:"10px",fontWeight:"700",color:"#64748b",textTransform:"uppercase",letterSpacing:"0.05em"}}>Market *</label>
                <select value={form.market} onChange={e=>setForm({...form,market:e.target.value})}
                  style={{padding:"10px 12px",borderRadius:"8px",border:"1px solid #1e293b",background:"#0f172a",color:"#f1f5f9",fontSize:"13px"}}>
                  <option value="US">🇺🇸 US</option>
                  <option value="UK">🇬🇧 UK</option>
                </select>
              </div>
              {inp("Entry Date *","entry_date","date")}
              {inp("Entry Price *","entry_price","number","0.00")}
              {inp("Shares *","shares","number","100")}
              {inp("Stop Level","stop_level","number","0.00")}
              {inp("Target Price","target_price","number","0.00")}
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:"4px",marginBottom:"16px"}}>
              <label style={{fontSize:"10px",fontWeight:"700",color:"#64748b",textTransform:"uppercase",letterSpacing:"0.05em"}}>Notes</label>
              <textarea value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} placeholder="Thesis, setup notes..."
                style={{padding:"10px 12px",borderRadius:"8px",border:"1px solid #1e293b",background:"#0f172a",color:"#f1f5f9",fontSize:"13px",minHeight:"60px",resize:"vertical"}}/>
            </div>
            <div style={{display:"flex",gap:"8px"}}>
              <button onClick={handleSave} disabled={saving}
                style={{padding:"10px 24px",borderRadius:"8px",fontWeight:"700",fontSize:"13px",cursor:saving?"not-allowed":"pointer",border:"none",
                  background:saving?"rgba(245,158,11,0.4)":`linear-gradient(135deg,${gold},#d97706)`,color:"#060820"}}>
                {saving?"Saving...":"💾 Save Position"}
              </button>
              <button onClick={()=>{setShowForm(false);setMessage(null);}}
                style={{padding:"10px 20px",borderRadius:"8px",fontWeight:"600",fontSize:"13px",cursor:"pointer",border:"1px solid #1e293b",background:"transparent",color:"#64748b"}}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Positions Table */}
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
                  {positions.map(p=>{
                    const posSize = p.entry_price * (p.shares||0);
                    return (
                      <tr key={p.id} style={{borderBottom:"1px solid rgba(30,41,59,0.4)"}}
                        onMouseEnter={e=>{e.currentTarget.style.background="rgba(245,158,11,0.04)";}}
                        onMouseLeave={e=>{e.currentTarget.style.background="transparent";}}>
                        <td style={{padding:"10px 12px"}}>
                          <span style={{fontFamily:"monospace",fontWeight:"800",color:gold,fontSize:"13px"}}>{p.ticker}</span>
                        </td>
                        <td style={{padding:"10px 12px",color:steel,fontSize:"11px"}}>{p.market==="US"?"🇺🇸":"🇬🇧"} {p.market}</td>
                        <td style={{padding:"10px 12px",color:steel,fontFamily:"monospace",fontSize:"11px"}}>{p.entry_date}</td>
                        <td style={{padding:"10px 12px",fontFamily:"monospace",color:"#f1f5f9",fontWeight:"600"}}>${(p.entry_price||0).toFixed(2)}</td>
                        <td style={{padding:"10px 12px",fontFamily:"monospace",color:steel}}>{(p.shares||0)}</td>
                        <td style={{padding:"10px 12px",fontFamily:"monospace",color:green,fontWeight:"600"}}>${posSize.toLocaleString(undefined,{maximumFractionDigits:0})}</td>
                        <td style={{padding:"10px 12px",fontFamily:"monospace",color:p.stop_level>0?red:steel}}>{p.stop_level>0?`$${(p.stop_level||0).toFixed(2)}`:"—"}</td>
                        <td style={{padding:"10px 12px",fontFamily:"monospace",color:p.target_price>0?green:steel}}>{p.target_price>0?`$${(p.target_price||0).toFixed(2)}`:"—"}</td>
                        <td style={{padding:"10px 12px",color:steel,fontSize:"11px",maxWidth:"120px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.notes||"—"}</td>
                        <td style={{padding:"10px 12px"}}>
                          <button onClick={()=>handleDelete(p.id)}
                            style={{padding:"4px 10px",borderRadius:"6px",fontSize:"10px",fontWeight:"600",cursor:"pointer",border:"1px solid rgba(239,68,68,0.3)",background:"rgba(239,68,68,0.1)",color:red}}>
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