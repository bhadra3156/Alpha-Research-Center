"use client";
import React, { useState, useEffect, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

interface JournalEntry {
  id?: number; ticker: string; market: string; action: string;
  entry_price: number; shares: number; exit_price?: number;
  stop_loss?: number; target_price?: number; setup_type: string;
  thesis: string; outcome?: string; pnl?: number; pnl_pct?: number;
  confidence: number; emotion: string; lessons?: string;
  trade_date: string; exit_date?: string; created_at?: string;
}

function n(v: unknown): number { const x=parseFloat(String(v)); return isNaN(x)?0:x; }
function fmt(v: number) { return v>0?"$"+v.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2}):"—"; }

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = React.useState(false);
  const copy = () => { navigator.clipboard.writeText(text).then(()=>{setCopied(true);setTimeout(()=>setCopied(false),2500);}); };
  return (
    <button onClick={copy} style={{background:copied?"rgba(34,197,94,0.15)":"transparent",border:`1px solid ${copied?"#22c55e44":"#253345"}`,color:copied?"#22c55e":"#4a5568",fontSize:"9px",padding:"3px 8px",cursor:"pointer",letterSpacing:"0.05em"}}>
      {copied?"✓ COPIED":"⧉ COPY"}
    </button>
  );
}

const SETUP_TYPES = ["Stage 2 Breakout","Stage 1 Base","Pullback to MA50","Pullback to MA200","VCP Pattern","Cup & Handle","Double Bottom","Momentum","Earnings Play","Other"];
const EMOTIONS = ["Confident","Neutral","Cautious","FOMO","Fearful","Disciplined","Greedy","Patient"];
const OUTCOMES = ["Win","Loss","Breakeven","Open"];

export default function Journal() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{text:string;ok:boolean}|null>(null);
  const [filter, setFilter] = useState("ALL");
  const [editEntry, setEditEntry] = useState<JournalEntry|null>(null);

  const [ticker, setTicker] = useState("");
  const [market, setMarket] = useState("US");
  const [action, setAction] = useState("BUY");
  const [entryPrice, setEntryPrice] = useState("");
  const [shares, setShares] = useState("");
  const [exitPrice, setExitPrice] = useState("");
  const [stopLoss, setStopLoss] = useState("");
  const [targetPrice, setTargetPrice] = useState("");
  const [setupType, setSetupType] = useState("");
  const [thesis, setThesis] = useState("");
  const [outcome, setOutcome] = useState("Open");
  const [confidence, setConfidence] = useState(5);
  const [emotion, setEmotion] = useState("Neutral");
  const [lessons, setLessons] = useState("");
  const [tradeDate, setTradeDate] = useState(new Date().toISOString().split("T")[0]);
  const [exitDate, setExitDate] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from("trade_journal").select("*").order("trade_date",{ascending:false});
      if (error) throw error;
      setEntries(data||[]);
    } catch(e) { setMsg({text:"FAILED TO LOAD — CHECK SUPABASE CONNECTION",ok:false}); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const resetForm = () => {
    setTicker(""); setMarket("US"); setAction("BUY"); setEntryPrice(""); setShares(""); setExitPrice(""); setStopLoss(""); setTargetPrice(""); setSetupType(""); setThesis(""); setOutcome("Open"); setConfidence(5); setEmotion("Neutral"); setLessons(""); setTradeDate(new Date().toISOString().split("T")[0]); setExitDate(""); setEditEntry(null);
  };

  const openEdit = (e: JournalEntry) => {
    setEditEntry(e); setTicker(e.ticker); setMarket(e.market); setAction(e.action);
    setEntryPrice(String(e.entry_price)); setShares(String(e.shares));
    setExitPrice(String(e.exit_price||"")); setStopLoss(String(e.stop_loss||""));
    setTargetPrice(String(e.target_price||"")); setSetupType(e.setup_type||"");
    setThesis(e.thesis||""); setOutcome(e.outcome||"Open");
    setConfidence(e.confidence||5); setEmotion(e.emotion||"Neutral");
    setLessons(e.lessons||""); setTradeDate(e.trade_date||""); setExitDate(e.exit_date||"");
    setShowForm(true); window.scrollTo({top:0,behavior:"smooth"});
  };

  const save = async () => {
    if (!ticker.trim()) { setMsg({text:"ENTER TICKER SYMBOL",ok:false}); return; }
    if (!entryPrice) { setMsg({text:"ENTER ENTRY PRICE",ok:false}); return; }
    setSaving(true);
    const ep=n(entryPrice), sh=n(shares), xp=n(exitPrice);
    const pnl = xp>0&&sh>0 ? (xp-ep)*sh : undefined;
    const pnl_pct = xp>0&&ep>0 ? ((xp-ep)/ep*100) : undefined;
    const entry: Omit<JournalEntry,"id"|"created_at"> = {
      ticker:ticker.toUpperCase(), market, action, entry_price:ep, shares:sh,
      exit_price:xp||undefined, stop_loss:n(stopLoss)||undefined, target_price:n(targetPrice)||undefined,
      setup_type:setupType, thesis, outcome, pnl, pnl_pct, confidence, emotion,
      lessons:lessons||undefined, trade_date:tradeDate, exit_date:exitDate||undefined
    };
    try {
      if (editEntry?.id) {
        const { error } = await supabase.from("trade_journal").update(entry).eq("id",editEntry.id);
        if (error) throw error;
        setMsg({text:`${ticker.toUpperCase()} TRADE UPDATED`,ok:true});
      } else {
        const { error } = await supabase.from("trade_journal").insert([entry]);
        if (error) throw error;
        setMsg({text:`${ticker.toUpperCase()} TRADE LOGGED`,ok:true});
      }
      resetForm(); setShowForm(false); load();
    } catch(e: any) { setMsg({text:"SAVE FAILED: "+e.message,ok:false}); }
    setSaving(false);
  };

  const deleteEntry = async (id: number) => {
    if (!confirm("Delete this trade?")) return;
    try { await supabase.from("trade_journal").delete().eq("id",id); load(); } catch(e) {}
  };

  const filtered = entries.filter(e => filter==="ALL"||e.outcome===filter||filter===e.action);
  const wins = entries.filter(e=>e.outcome==="Win").length;
  const losses = entries.filter(e=>e.outcome==="Loss").length;
  const totalPnl = entries.reduce((s,e)=>s+(e.pnl||0),0);
  const winRate = entries.filter(e=>e.outcome!=="Open"&&e.outcome!=="Breakeven").length>0 ? (wins/(wins+losses)*100).toFixed(0) : "—";

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

  const copyText = entries.map(e=>`${e.trade_date} ${e.action} ${e.ticker} ${e.shares}sh @$${e.entry_price} | ${e.setup_type} | ${e.outcome||"Open"} | P&L:${e.pnl?`$${e.pnl.toFixed(0)}`:"—"}`).join("\n");

  return (
    <div style={{minHeight:"100vh",background:"#060d18",fontFamily:"'SF Mono','Fira Code','Consolas',monospace",color:"#e2e8f0"}}>

      {/* TOP BAR */}
      <div style={{position:"fixed",top:0,left:0,right:0,zIndex:50,background:"#04080f",borderBottom:"1px solid #1a2535",display:"flex",alignItems:"center",justifyContent:"space-between",height:"44px"}}>
        <div style={{display:"flex",alignItems:"center",height:"100%"}}>
          <div style={{background:"#f59e0b",color:"#000",fontSize:"11px",fontWeight:"700",padding:"0 14px",height:"100%",display:"flex",alignItems:"center",letterSpacing:"0.08em"}}>ALPHA<span style={{opacity:0.6}}>RESEARCH</span></div>
          {[["dashboard","COMMAND CTR"],["analyzer","ANALYZER"],["watchlist","WATCHLIST"],["portfolio","PORTFOLIO"],["journal","JOURNAL"]].map(([href,label])=>(
            <a key={href} href={"/"+href} style={{display:"flex",alignItems:"center",height:"100%",padding:"0 14px",textDecoration:"none",fontSize:"10px",letterSpacing:"0.06em",borderBottom:href==="journal"?"2px solid #f59e0b":"2px solid transparent",color:href==="journal"?"#f59e0b":"#4a5568",fontWeight:href==="journal"?"700":"400"}}>{label}</a>
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
            {label:"TOTAL TRADES",value:String(entries.length),sub:"all time",color:"#e2e8f0"},
            {label:"WIN RATE",value:winRate+"%",sub:`${wins}W / ${losses}L`,color:Number(winRate)>=60?"#22c55e":Number(winRate)>=40?"#f59e0b":"#ef4444"},
            {label:"TOTAL P&L",value:`${totalPnl>=0?"":"-"}$${Math.abs(totalPnl).toLocaleString(undefined,{maximumFractionDigits:0})}`,sub:"realised",color:totalPnl>=0?"#22c55e":"#ef4444"},
            {label:"OPEN TRADES",value:String(entries.filter(e=>e.outcome==="Open").length),sub:"in progress",color:"#f59e0b"},
            {label:"CLOSED",value:String(entries.filter(e=>e.outcome!=="Open").length),sub:"completed",color:"#94a3b8"},
          ].map((s,i)=>(
            <div key={s.label} style={{padding:"10px 14px",borderRight:i<4?"1px solid #1a2535":"none"}}>
              <div style={{color:"#374151",fontSize:"9px",letterSpacing:"0.08em",marginBottom:"3px"}}>{s.label}</div>
              <div style={{color:s.color,fontSize:"20px",fontWeight:"700",lineHeight:"1"}}>{s.value}</div>
              <div style={{color:"#374151",fontSize:"9px",marginTop:"2px"}}>{s.sub}</div>
            </div>
          ))}
        </div>

        {/* ACTION BAR */}
        <div style={{background:"#04080f",borderBottom:"1px solid #1a2535",padding:"7px 14px",display:"flex",alignItems:"center",gap:"8px",flexWrap:"wrap"}}>
          <div style={{display:"flex",gap:"1px"}}>
            {[["ALL","ALL"],["Open","OPEN"],["Win","WINS"],["Loss","LOSSES"],["BUY","LONGS"],["SHORT","SHORTS"]].map(([v,l])=>(
              <button key={v} onClick={()=>setFilter(v)} style={{padding:"4px 10px",border:`1px solid ${filter===v?"#f59e0b44":"#1a2535"}`,background:filter===v?"#1a0f00":"transparent",color:filter===v?"#f59e0b":"#374151",fontSize:"9px",letterSpacing:"0.06em",cursor:"pointer"}}>{l}</button>
            ))}
          </div>
          <div style={{flex:1}}></div>
          {entries.length>0&&<CopyButton text={copyText}/>}
          <button onClick={()=>{resetForm();setShowForm(!showForm);setMsg(null);}} style={{background:"#f59e0b",border:"none",color:"#000",fontSize:"9px",fontWeight:"700",padding:"5px 14px",cursor:"pointer",letterSpacing:"0.06em"}}>+ LOG TRADE</button>
        </div>

        {/* FORM */}
        {showForm&&(
          <div style={{background:"#04080f",borderBottom:"1px solid #1a2535",padding:"12px 14px"}}>
            <div style={{color:"#374151",fontSize:"8px",letterSpacing:"0.1em",marginBottom:"10px"}}>{editEntry?"EDIT TRADE":"LOG NEW TRADE"}</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:"8px",marginBottom:"8px"}}>
              {inp("TICKER *",ticker,setTicker,"text","NVDA")}
              <div>
                <div style={{color:"#253345",fontSize:"8px",letterSpacing:"0.08em",marginBottom:"3px"}}>MARKET</div>
                <select value={market} onChange={e=>setMarket(e.target.value)} style={{width:"100%",background:"#060d18",border:"1px solid #1a2535",color:"#e2e8f0",padding:"6px 8px",fontSize:"10px",fontFamily:"inherit",outline:"none"}}>
                  <option value="US">US</option><option value="UK">UK</option>
                </select>
              </div>
              <div>
                <div style={{color:"#253345",fontSize:"8px",letterSpacing:"0.08em",marginBottom:"3px"}}>ACTION</div>
                <select value={action} onChange={e=>setAction(e.target.value)} style={{width:"100%",background:"#060d18",border:"1px solid #1a2535",color:action==="BUY"?"#22c55e":"#ef4444",padding:"6px 8px",fontSize:"10px",fontFamily:"inherit",outline:"none"}}>
                  <option value="BUY">BUY</option><option value="SHORT">SHORT</option>
                </select>
              </div>
              {inp("TRADE DATE",tradeDate,setTradeDate,"date")}
              {inp("ENTRY PRICE *",entryPrice,setEntryPrice,"number","215.33")}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:"8px",marginBottom:"8px"}}>
              {inp("SHARES",shares,setShares,"number","100")}
              {inp("EXIT PRICE",exitPrice,setExitPrice,"number","260.00")}
              {inp("EXIT DATE",exitDate,setExitDate,"date")}
              {inp("STOP LOSS",stopLoss,setStopLoss,"number","195.00")}
              {inp("TARGET",targetPrice,setTargetPrice,"number","280.00")}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:"8px",marginBottom:"8px"}}>
              <div>
                <div style={{color:"#253345",fontSize:"8px",letterSpacing:"0.08em",marginBottom:"3px"}}>SETUP TYPE</div>
                <select value={setupType} onChange={e=>setSetupType(e.target.value)} style={{width:"100%",background:"#060d18",border:"1px solid #1a2535",color:"#e2e8f0",padding:"6px 8px",fontSize:"10px",fontFamily:"inherit",outline:"none"}}>
                  <option value="">Select...</option>
                  {SETUP_TYPES.map(s=><option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <div style={{color:"#253345",fontSize:"8px",letterSpacing:"0.08em",marginBottom:"3px"}}>OUTCOME</div>
                <select value={outcome} onChange={e=>setOutcome(e.target.value)} style={{width:"100%",background:"#060d18",border:"1px solid #1a2535",color:outcome==="Win"?"#22c55e":outcome==="Loss"?"#ef4444":"#e2e8f0",padding:"6px 8px",fontSize:"10px",fontFamily:"inherit",outline:"none"}}>
                  {OUTCOMES.map(o=><option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <div style={{color:"#253345",fontSize:"8px",letterSpacing:"0.08em",marginBottom:"3px"}}>CONFIDENCE (1-10): {confidence}</div>
                <input type="range" min="1" max="10" value={confidence} onChange={e=>setConfidence(Number(e.target.value))} style={{width:"100%",marginTop:"8px"}}/>
              </div>
              <div>
                <div style={{color:"#253345",fontSize:"8px",letterSpacing:"0.08em",marginBottom:"3px"}}>EMOTION</div>
                <select value={emotion} onChange={e=>setEmotion(e.target.value)} style={{width:"100%",background:"#060d18",border:"1px solid #1a2535",color:"#e2e8f0",padding:"6px 8px",fontSize:"10px",fontFamily:"inherit",outline:"none"}}>
                  {EMOTIONS.map(em=><option key={em} value={em}>{em}</option>)}
                </select>
              </div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"8px",marginBottom:"10px"}}>
              <div>
                <div style={{color:"#253345",fontSize:"8px",letterSpacing:"0.08em",marginBottom:"3px"}}>TRADE THESIS *</div>
                <textarea value={thesis} onChange={e=>setThesis(e.target.value)} placeholder="Why did you take this trade? What was the setup?"
                  style={{width:"100%",boxSizing:"border-box",background:"#060d18",border:"1px solid #1a2535",color:"#94a3b8",padding:"6px 8px",fontSize:"10px",fontFamily:"inherit",outline:"none",minHeight:"60px",resize:"vertical"}}/>
              </div>
              <div>
                <div style={{color:"#253345",fontSize:"8px",letterSpacing:"0.08em",marginBottom:"3px"}}>LESSONS LEARNED</div>
                <textarea value={lessons} onChange={e=>setLessons(e.target.value)} placeholder="What did this trade teach you?"
                  style={{width:"100%",boxSizing:"border-box",background:"#060d18",border:"1px solid #1a2535",color:"#94a3b8",padding:"6px 8px",fontSize:"10px",fontFamily:"inherit",outline:"none",minHeight:"60px",resize:"vertical"}}/>
              </div>
            </div>
            <div style={{display:"flex",gap:"8px"}}>
              <button onClick={save} disabled={saving} style={{background:"#f59e0b",border:"none",color:"#000",fontSize:"9px",fontWeight:"700",padding:"6px 16px",cursor:"pointer",letterSpacing:"0.06em"}}>{saving?"SAVING...":(editEntry?"UPDATE TRADE":"LOG TRADE")}</button>
              <button onClick={()=>{setShowForm(false);resetForm();setMsg(null);}} style={{background:"transparent",border:"1px solid #1a2535",color:"#374151",fontSize:"9px",padding:"6px 12px",cursor:"pointer",letterSpacing:"0.06em"}}>CANCEL</button>
            </div>
          </div>
        )}

        {msg&&<div style={{padding:"6px 14px",background:msg.ok?"#052e16":"#1a0505",borderBottom:"1px solid #1a2535",color:msg.ok?"#22c55e":"#ef4444",fontSize:"9px",letterSpacing:"0.06em"}}>{msg.ok?"✓":"⚠"} {msg.text}</div>}

        {/* TABLE */}
        <div>
          <div style={{padding:"6px 14px",background:"#04080f",borderBottom:"1px solid #1a2535",display:"flex",alignItems:"center",gap:"8px"}}>
            <span style={{color:"#e2e8f0",fontSize:"10px",fontWeight:"700",letterSpacing:"0.06em"}}>TRADE JOURNAL</span>
            <span style={{background:"#0a1a2a",color:"#374151",fontSize:"8px",padding:"2px 8px",letterSpacing:"0.05em"}}>{filtered.length} ENTRIES</span>
          </div>

          {loading?(
            <div style={{padding:"40px 0",textAlign:"center",color:"#374151",fontSize:"9px",letterSpacing:"0.08em"}}>LOADING JOURNAL...</div>
          ):filtered.length===0?(
            <div style={{padding:"60px 0",textAlign:"center"}}>
              <div style={{color:"#253345",fontSize:"10px",letterSpacing:"0.1em",marginBottom:"6px"}}>NO TRADES LOGGED</div>
              <div style={{color:"#1a2535",fontSize:"9px",letterSpacing:"0.08em"}}>CLICK LOG TRADE TO RECORD YOUR FIRST TRADE</div>
            </div>
          ):(
            <div style={{overflowX:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:"11px"}}>
                <thead>
                  <tr style={{background:"#04080f",borderBottom:"1px solid #1a2535"}}>
                    {["DATE","TICKER","ACTION","ENTRY","SHARES","EXIT","P&L","P&L%","SETUP","OUTCOME","CONF","EMOTION","ACTIONS"].map(h=>(
                      <th key={h} style={{padding:"6px 10px",textAlign:"left",color:"#253345",fontSize:"8px",letterSpacing:"0.08em",fontWeight:"600",whiteSpace:"nowrap"}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((e,i)=>{
                    const isWin = e.outcome==="Win";
                    const isLoss = e.outcome==="Loss";
                    return (
                      <tr key={e.id} style={{borderBottom:"1px solid #0d1520",background:i%2===0?"#0a1420":"#080e18"}}
                        onMouseEnter={ev=>{ev.currentTarget.style.background="#0f1c2e";}} onMouseLeave={ev=>{ev.currentTarget.style.background=i%2===0?"#0a1420":"#080e18";}}>
                        <td style={{padding:"7px 10px",color:"#374151",fontSize:"9px",fontFamily:"monospace"}}>{e.trade_date}</td>
                        <td style={{padding:"7px 10px"}}>
                          <div style={{display:"flex",alignItems:"center",gap:"5px"}}>
                            <div style={{width:"3px",height:"24px",background:isWin?"#22c55e":isLoss?"#ef4444":"#374151",borderRadius:"1px"}}></div>
                            <span style={{color:"#f59e0b",fontWeight:"700",fontSize:"12px"}}>{e.ticker}</span>
                          </div>
                        </td>
                        <td style={{padding:"7px 8px"}}><span style={{background:e.action==="BUY"?"#052e16":"#1a0505",color:e.action==="BUY"?"#22c55e":"#ef4444",fontSize:"8px",padding:"2px 6px",letterSpacing:"0.05em"}}>{e.action}</span></td>
                        <td style={{padding:"7px 8px",color:"#e2e8f0",fontFamily:"monospace",fontSize:"10px"}}>{fmt(e.entry_price)}</td>
                        <td style={{padding:"7px 8px",color:"#94a3b8",fontFamily:"monospace",fontSize:"10px"}}>{e.shares||"—"}</td>
                        <td style={{padding:"7px 8px",color:"#94a3b8",fontFamily:"monospace",fontSize:"10px"}}>{e.exit_price?fmt(e.exit_price):"—"}</td>
                        <td style={{padding:"7px 8px",fontFamily:"monospace",fontSize:"10px",fontWeight:"600",color:!e.pnl?"#253345":e.pnl>0?"#22c55e":"#ef4444"}}>{e.pnl?`${e.pnl>0?"+":""} $${Math.abs(e.pnl).toFixed(0)}`:"—"}</td>
                        <td style={{padding:"7px 8px",fontFamily:"monospace",fontSize:"10px",fontWeight:"600",color:!e.pnl_pct?"#253345":e.pnl_pct>0?"#22c55e":"#ef4444"}}>{e.pnl_pct?`${e.pnl_pct>0?"+":""}${e.pnl_pct.toFixed(1)}%`:"—"}</td>
                        <td style={{padding:"7px 8px",color:"#374151",fontSize:"9px",whiteSpace:"nowrap"}}>{e.setup_type||"—"}</td>
                        <td style={{padding:"7px 8px"}}><span style={{background:isWin?"#052e16":isLoss?"#1a0505":e.outcome==="Open"?"#0a1a2e":"#1a1a0a",color:isWin?"#22c55e":isLoss?"#ef4444":e.outcome==="Open"?"#60a5fa":"#f59e0b",fontSize:"8px",padding:"2px 6px",letterSpacing:"0.04em"}}>{e.outcome||"OPEN"}</span></td>
                        <td style={{padding:"7px 8px"}}>
                          <div style={{display:"flex",alignItems:"center",gap:"3px"}}>
                            <div style={{width:"24px",height:"3px",background:"#1a2535",borderRadius:"1px",overflow:"hidden"}}>
                              <div style={{height:"100%",width:`${(e.confidence||5)*10}%`,background:e.confidence>=8?"#22c55e":e.confidence>=5?"#f59e0b":"#ef4444"}}></div>
                            </div>
                            <span style={{color:"#374151",fontSize:"8px"}}>{e.confidence||5}</span>
                          </div>
                        </td>
                        <td style={{padding:"7px 8px",color:"#374151",fontSize:"9px"}}>{e.emotion||"—"}</td>
                        <td style={{padding:"7px 8px"}}>
                          <div style={{display:"flex",gap:"3px"}}>
                            <button onClick={()=>openEdit(e)} style={{background:"transparent",border:"1px solid #1a3a5a",color:"#60a5fa",fontSize:"8px",padding:"2px 6px",cursor:"pointer",letterSpacing:"0.04em"}}>EDIT</button>
                            <button onClick={()=>e.id&&deleteEntry(e.id)} style={{background:"transparent",border:"1px solid #3a1a1a",color:"#ef4444",fontSize:"8px",padding:"2px 6px",cursor:"pointer"}}>✕</button>
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
          JOURNAL DATA STORED IN SUPABASE · NOT FINANCIAL ADVICE · FOR INSTITUTIONAL USE ONLY
        </div>
      </div>
    </div>
  );
}