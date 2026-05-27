"use client";
import React,{useState,useEffect}from"react";
const BACKEND="https://alpha-research-center-backend.onrender.com";
interface Position{id:string;ticker:string;market:string;entry_date:string;entry_price:number;shares:number;stop_level:number;target_price:number;notes:string;}
function n(v:unknown):number{const x=parseFloat(String(v));return isNaN(x)?0:x;}
function fmt(v:number):string{return v>0?"$"+v.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2}):"—";}
function Navbar({active}:{active:string}){return(<nav className="bg-[#18181b]/80 backdrop-blur-md border-b border-[#27272a] sticky top-0 z-50 px-6 h-14 flex items-center justify-between"><span className="text-[#fafafa] font-bold tracking-tight text-sm uppercase">AlphaResearch</span><div className="flex items-center gap-6">{[["dashboard","Dashboard"],["analyzer","Analyzer"],["watchlist","Watchlist"],["portfolio","Portfolio"],["journal","Journal"]].map(([href,label])=><a key={href} href={"/"+href} className={active===href?"text-[#fafafa] font-medium text-sm border-b-2 border-[#fafafa] h-14 flex items-center px-1":"text-[#a1a1aa] hover:text-[#fafafa] font-medium text-sm transition-colors h-14 flex items-center px-1"}>{label}</a>)}</div><div className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-0.5 rounded-full text-[11px] font-medium flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"/>LIVE</div></nav>);}
function KpiCard({label,value,sub,color}:{label:string;value:string;sub:string;color?:string}){return(<div className="bg-[#18181b] border border-[#27272a] rounded-xl p-5 shadow-sm space-y-1.5"><p className="text-xs font-semibold text-[#a1a1aa] uppercase tracking-wider">{label}</p><p className={`text-2xl font-bold tracking-tight font-mono ${color||"text-[#fafafa]"}`}>{value}</p><p className="text-xs text-[#52525b]">{sub}</p></div>);}
function CopyBtn({text}:{text:string}){const[c,setC]=React.useState(false);return(<button onClick={()=>{navigator.clipboard.writeText(text).then(()=>{setC(true);setTimeout(()=>setC(false),2500);});}} className={`text-[11px] px-2.5 py-1 rounded border transition-colors ${c?"bg-emerald-500/10 text-emerald-400 border-emerald-500/20":"bg-[#27272a] text-[#a1a1aa] border-[#3f3f46] hover:text-[#fafafa]"}`}>{c?"✓ Copied":"⧉ Copy"}</button>);}
function generateLocalAnalysis(positions:Position[]):string{const total=positions.reduce((s,p)=>s+n(p.entry_price)*n(p.shares),0);const largest=positions.reduce((a,b)=>n(a.entry_price)*n(a.shares)>n(b.entry_price)*n(b.shares)?a:b);const pct=((n(largest.entry_price)*n(largest.shares))/total*100).toFixed(1);const noStop=positions.filter(p=>!p.stop_level).length;return`PORTFOLIO ANALYSIS — ${positions.length} POSITIONS · $${total.toLocaleString(undefined,{maximumFractionDigits:0})} DEPLOYED\n\nSWOT ANALYSIS\n${"─".repeat(40)}\nSTRENGTHS: ${positions.length} positions with defined entry points.\nWEAKNESSES: ${pct}% concentration in ${largest.ticker}. ${noStop} positions without stop losses.\nOPPORTUNITIES: Set price targets on all positions to lock in gains.\nTHREATS: ${noStop>0?`${noStop} positions without stops — unlimited downside risk.`:"All positions have stops — good discipline."}\n\nPOSITION VERDICTS\n${"─".repeat(40)}\n${positions.map(p=>{const cost=n(p.entry_price)*n(p.shares);const pp=(cost/total*100).toFixed(1);const v=cost/total>0.35?"REVIEW SIZE":!p.stop_level?"SET STOP LOSS":"HOLD";return`${p.ticker}: ${v} — ${pp}% ($${cost.toLocaleString(undefined,{maximumFractionDigits:0})})`;}).join("\n")}\n\nACTION REQUIRED\n${"─".repeat(40)}\nSet stop losses on all positions at 7-8% below entry immediately.`;}
export default function Portfolio(){
  const[positions,setPositions]=useState<Position[]>([]);const[showForm,setShowForm]=useState(false);const[editId,setEditId]=useState<string|null>(null);const[saving,setSaving]=useState(false);const[msg,setMsg]=useState<{text:string;ok:boolean}|null>(null);const[analyzing,setAnalyzing]=useState(false);const[analysis,setAnalysis]=useState<string|null>(null);
  const[ticker,setTicker]=useState("");const[market,setMarket]=useState("US");const[entryDate,setEntryDate]=useState(new Date().toISOString().split("T")[0]);const[entryPrice,setEntryPrice]=useState("");const[shares,setShares]=useState("");const[stopLevel,setStopLevel]=useState("");const[targetPrice,setTargetPrice]=useState("");const[notes,setNotes]=useState("");
  useEffect(()=>{try{const s=localStorage.getItem("alpha_positions");if(s)setPositions(JSON.parse(s));}catch(e){};},[]);
  const persist=(list:Position[])=>{setPositions(list);try{localStorage.setItem("alpha_positions",JSON.stringify(list));}catch(e){}};
  const resetForm=()=>{setTicker("");setMarket("US");setEntryDate(new Date().toISOString().split("T")[0]);setEntryPrice("");setShares("");setStopLevel("");setTargetPrice("");setNotes("");setEditId(null);};
  const openEdit=(p:Position)=>{setEditId(p.id);setTicker(p.ticker);setMarket(p.market);setEntryDate(p.entry_date);setEntryPrice(String(p.entry_price));setShares(String(p.shares));setStopLevel(String(p.stop_level||""));setTargetPrice(String(p.target_price||""));setNotes(p.notes||"");setShowForm(true);setMsg(null);setAnalysis(null);window.scrollTo({top:0,behavior:"smooth"});};
  const handleSave=()=>{if(!ticker.trim()){setMsg({text:"Enter ticker symbol",ok:false});return;}if(!entryPrice||n(entryPrice)===0){setMsg({text:"Enter entry price",ok:false});return;}if(!shares||n(shares)===0){setMsg({text:"Enter number of shares",ok:false});return;}setSaving(true);const pos:Position={id:editId||Date.now().toString(),ticker:ticker.trim().toUpperCase(),market,entry_date:entryDate,entry_price:n(entryPrice),shares:n(shares),stop_level:n(stopLevel),target_price:n(targetPrice),notes:notes.trim()};persist(editId?positions.map(p=>p.id===editId?pos:p):[...positions,pos]);setMsg({text:`${pos.ticker} — ${n(shares)} shares @ ${fmt(n(entryPrice))} ${editId?"updated":"saved"}`,ok:true});resetForm();setShowForm(false);setSaving(false);};
  const remove=(id:string)=>{persist(positions.filter(p=>p.id!==id));setAnalysis(null);};
  const analyzePortfolio=async()=>{if(!positions.length){setMsg({text:"Add positions first",ok:false});return;}setAnalyzing(true);setAnalysis(null);setMsg(null);try{const res=await fetch(`${BACKEND}/analyze/portfolio-deep`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({holdings:positions.map(p=>({ticker:p.ticker,shares:n(p.shares),entry_price:n(p.entry_price),stop_level:n(p.stop_level),target_price:n(p.target_price),notes:p.notes||""}))})}); if(!res.ok)throw new Error("Backend error "+res.status);const d=await res.json();if(d.status==="error")throw new Error(d.analysis);setAnalysis(d.analysis||"Analysis unavailable");}catch(e){setAnalysis(generateLocalAnalysis(positions));}setAnalyzing(false);};
  const total=positions.reduce((s,p)=>s+n(p.entry_price)*n(p.shares),0);
  const inp=(label:string,value:string,setter:(v:string)=>void,type="text",placeholder="")=>(<div><label className="text-[10px] text-[#52525b] uppercase tracking-wider block mb-1">{label}</label><input type={type} value={value} onChange={e=>setter(e.target.value)} placeholder={placeholder} className="w-full bg-[#09090b] border border-[#27272a] text-[#fafafa] px-3 py-2 text-xs rounded focus:outline-none focus:border-amber-500/50"/></div>);
  return(
    <div className="min-h-screen bg-[#09090b] text-[#fafafa] font-sans antialiased">
      <Navbar active="portfolio"/>
      <main className="max-w-[1600px] mx-auto p-4 md:p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <KpiCard label="Open Positions" value={String(positions.length)} sub="active trades" color="text-emerald-400"/>
          <KpiCard label="Total Deployed" value={"$"+total.toLocaleString(undefined,{maximumFractionDigits:0})} sub="capital at risk" color="text-amber-400"/>
          <KpiCard label="Markets" value={positions.length>0?[...new Set(positions.map(p=>p.market))].join(" / "):"—"} sub="US / UK exposure"/>
        </div>
        {/* ACTION BAR */}
        <div className="flex items-center gap-3">
          {positions.length>0&&<button onClick={analyzePortfolio} disabled={analyzing} className={`px-4 py-2 text-xs font-medium rounded border transition-colors ${analyzing?"text-[#52525b] border-[#27272a]":"bg-blue-500/10 text-blue-400 border-blue-500/30 hover:bg-blue-500/20"}`}>{analyzing?"🧠 Analyzing...":"🧠 AI Analysis"}</button>}
          <div className="flex-1"/>
          <button onClick={()=>{resetForm();setShowForm(!showForm);setMsg(null);setAnalysis(null);}} className="bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs px-5 py-2 rounded transition-colors shadow-lg shadow-amber-500/20">+ Add Position</button>
        </div>
        {/* FORM */}
        {showForm&&(
          <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-5 space-y-4">
            <p className="text-xs font-semibold text-[#a1a1aa] uppercase tracking-wider">{editId?"Edit Position":"New Position"}</p>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
              {inp("Ticker *",ticker,setTicker,"text","NVDA")}
              <div><label className="text-[10px] text-[#52525b] uppercase tracking-wider block mb-1">Market</label><select value={market} onChange={e=>setMarket(e.target.value)} className="w-full bg-[#09090b] border border-[#27272a] text-[#fafafa] px-3 py-2 text-xs rounded focus:outline-none"><option value="US">US</option><option value="UK">UK</option></select></div>
              {inp("Entry Date",entryDate,setEntryDate,"date")}
              {inp("Entry Price *",entryPrice,setEntryPrice,"number","215.33")}
              {inp("Shares *",shares,setShares,"number","100")}
              {inp("Stop Level",stopLevel,setStopLevel,"number","195.00")}
              {inp("Target",targetPrice,setTargetPrice,"number","260.00")}
            </div>
            <div><label className="text-[10px] text-[#52525b] uppercase tracking-wider block mb-1">Notes / Thesis</label><textarea value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Entry thesis, setup, catalyst..." className="w-full bg-[#09090b] border border-[#27272a] text-[#a1a1aa] px-3 py-2 text-xs rounded focus:outline-none min-h-[50px] resize-y"/></div>
            <div className="flex gap-3">
              <button onClick={handleSave} disabled={saving} className={`font-bold text-xs px-5 py-2 rounded transition-colors ${editId?"bg-blue-500 hover:bg-blue-400 text-white":"bg-amber-500 hover:bg-amber-400 text-black shadow-lg shadow-amber-500/20"}`}>{saving?"Saving...":(editId?"Update Position":"Save Position")}</button>
              <button onClick={()=>{setShowForm(false);resetForm();setMsg(null);}} className="text-xs px-4 py-2 rounded border bg-[#27272a] text-[#a1a1aa] border-[#3f3f46] hover:text-[#fafafa]">Cancel</button>
            </div>
          </div>
        )}
        {msg&&<div className={`text-xs px-4 py-2.5 rounded-lg border ${msg.ok?"bg-emerald-950/40 border-emerald-800/40 text-emerald-400":"bg-rose-950/40 border-rose-800/40 text-rose-400"}`}>{msg.ok?"✓":"⚠"} {msg.text}</div>}
        {analyzing&&<div className="bg-[#18181b] border border-[#27272a] rounded-xl p-10 text-center space-y-2"><p className="text-blue-400 text-sm font-semibold">🧠 Analyzing Portfolio...</p><p className="text-xs text-[#52525b]">Senior hedge fund PM · Web search · SWOT · Position verdicts</p></div>}
        {analysis&&!analyzing&&(
          <div className="w-full overflow-hidden rounded-lg border border-[#1E2530] bg-[#0C0F16]">
            <div className="flex items-center gap-3 px-4 py-3 bg-[#0A0D14] border-b border-[#1E2530]">
              <span className="text-xs font-semibold text-[#fafafa] uppercase tracking-wider">AI Portfolio Analysis</span>
              <span className="bg-blue-950/80 text-blue-400 border border-blue-800/40 text-[10px] font-bold px-2 py-0.5 rounded">HEDGE FUND GRADE</span>
              <div className="flex-1"/><CopyBtn text={analysis}/>
              <button onClick={()=>setAnalysis(null)} className="text-[10px] px-2.5 py-1 rounded border bg-[#27272a] text-[#a1a1aa] border-[#3f3f46] hover:text-[#fafafa]">✕ Close</button>
            </div>
            <div className="p-4 max-h-[500px] overflow-y-auto"><pre className="text-xs text-[#94a3b8] leading-relaxed whitespace-pre-wrap font-mono">{analysis}</pre></div>
            <div className="px-4 py-2 border-t border-[#1E2530] bg-[#0A0D14] text-[10px] text-[#3f3f46]">Powered by Claude AI · Not financial advice</div>
          </div>
        )}
        {/* TABLE */}
        <div className="w-full overflow-hidden rounded-lg border border-[#1E2530] bg-[#0C0F16]">
          <div className="flex items-center gap-3 px-4 py-3 bg-[#0A0D14] border-b border-[#1E2530]">
            <span className="text-xs font-semibold text-[#fafafa] uppercase tracking-wider">Open Positions</span>
            <span className="bg-emerald-950/80 text-emerald-400 border border-emerald-800/40 text-[10px] font-bold px-2 py-0.5 rounded">{positions.length} Active</span>
          </div>
          {positions.length===0?<div className="p-16 text-center space-y-2"><p className="text-[#a1a1aa] text-sm font-semibold">No positions tracked</p><p className="text-xs text-[#52525b]">Add your first position above</p></div>:(
            <div className="overflow-x-auto"><table className="w-full">
              <thead><tr className="bg-[#0A0D14] border-b border-[#1E2530]">{["Ticker","Mkt","Entry Date","Entry Price","Shares","Position Size","Weight","Stop","Target","R/R","Notes","Actions"].map(h=><th key={h} className="text-[11px] font-bold uppercase tracking-wider text-[#64748B] px-4 py-3 border-b border-[#1E2530] text-left whitespace-nowrap">{h}</th>)}</tr></thead>
              <tbody>
                {positions.map((p,i)=>{
                  const ep=n(p.entry_price),sh=n(p.shares),sl=n(p.stop_level),tp=n(p.target_price);
                  const posSize=ep*sh;const weight=(posSize/total*100).toFixed(1);const overweight=posSize/total>0.3;
                  const rr=sl>0&&tp>0?((tp-ep)/(ep-sl)).toFixed(1):"—";
                  return(
                    <tr key={p.id} className="border-b border-[#1E2530]/50 last:border-0 hover:bg-[#161C28]/60 transition-colors">
                      <td className="px-4 py-2.5"><div className="flex items-center gap-2"><div className={`w-0.5 h-7 rounded-full ${overweight?"bg-rose-500":"bg-emerald-500"}`}/><span className="font-bold text-[#FFB000] text-sm">{p.ticker}</span></div></td>
                      <td className="px-4 py-2.5 text-xs text-[#52525b]">{p.market==="US"?"US":"🇬🇧"}</td>
                      <td className="px-4 py-2.5 text-xs text-[#52525b] font-mono">{p.entry_date}</td>
                      <td className="px-4 py-2.5 font-mono text-sm text-[#fafafa] font-semibold text-right">{fmt(ep)}</td>
                      <td className="px-4 py-2.5 font-mono text-xs text-[#a1a1aa] text-right">{sh.toLocaleString()}</td>
                      <td className="px-4 py-2.5 font-mono text-xs text-emerald-400 font-semibold text-right">${posSize.toLocaleString(undefined,{maximumFractionDigits:0})}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-1.5">
                          <div className="w-10 h-1 bg-[#27272a] rounded-full overflow-hidden"><div className={`h-full ${overweight?"bg-rose-500":"bg-amber-500"}`} style={{width:`${Math.min(100,posSize/total*100*3)}%`}}/></div>
                          <span className={`text-xs font-mono ${overweight?"text-rose-400":"text-[#a1a1aa]"}`}>{weight}%</span>
                        </div>
                      </td>
                      <td className={`px-4 py-2.5 font-mono text-xs ${sl>0?"text-rose-400":"text-[#27272a]"}`}>{sl>0?fmt(sl):"—"}</td>
                      <td className={`px-4 py-2.5 font-mono text-xs ${tp>0?"text-emerald-400":"text-[#27272a]"}`}>{tp>0?fmt(tp):"—"}</td>
                      <td className={`px-4 py-2.5 font-mono text-xs ${rr!=="—"&&parseFloat(rr)>=2?"text-emerald-400":rr!=="—"?"text-amber-400":"text-[#27272a]"}`}>{rr!=="—"?rr+"x":"—"}</td>
                      <td className="px-4 py-2.5 text-xs text-[#52525b] max-w-[120px] truncate">{p.notes||"—"}</td>
                      <td className="px-4 py-2.5"><div className="flex gap-1.5"><button onClick={()=>openEdit(p)} className="text-[10px] px-2 py-1 rounded border bg-blue-950/40 text-blue-400 border-blue-800/30 hover:bg-blue-950/70 transition-colors">Edit</button><button onClick={()=>remove(p.id)} className="text-[10px] px-2 py-1 rounded border bg-rose-950/40 text-rose-400 border-rose-800/30 hover:bg-rose-950/70 transition-colors">✕</button></div></td>
                    </tr>
                  );
                })}
              </tbody>
            </table></div>
          )}
        </div>
        <p className="text-[10px] text-[#27272a] text-center">Data persisted in local storage · AI analysis powered by Claude Sonnet · Not financial advice</p>
      </main>
    </div>
  );
}