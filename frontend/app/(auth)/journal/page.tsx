"use client";
import React,{useState,useEffect,useCallback}from"react";
import{createClient}from"@supabase/supabase-js";
const supabase=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
interface JournalEntry{id?:number;ticker:string;market:string;action:string;entry_price:number;shares:number;exit_price?:number;stop_loss?:number;target_price?:number;setup_type:string;thesis:string;outcome?:string;pnl?:number;pnl_pct?:number;confidence:number;emotion:string;lessons?:string;trade_date:string;exit_date?:string;created_at?:string;}
function n(v:unknown):number{const x=parseFloat(String(v));return isNaN(x)?0:x;}
function fmt(v:number){return v>0?"$"+v.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2}):"—";}
const SETUP_TYPES=["Stage 2 Breakout","Stage 1 Base","Pullback to MA50","Pullback to MA200","VCP Pattern","Cup & Handle","Double Bottom","Momentum","Earnings Play","Other"];
const EMOTIONS=["Confident","Neutral","Cautious","FOMO","Fearful","Disciplined","Greedy","Patient"];
const OUTCOMES=["Win","Loss","Breakeven","Open"];
function Navbar({active}:{active:string}){return(<nav className="bg-[#18181b]/80 backdrop-blur-md border-b border-[#27272a] sticky top-0 z-50 px-6 h-14 flex items-center justify-between"><span className="text-[#fafafa] font-bold tracking-tight text-sm uppercase">AlphaResearch</span><div className="flex items-center gap-6">{[["dashboard","Dashboard"],["analyzer","Analyzer"],["watchlist","Watchlist"],["portfolio","Portfolio"],["journal","Journal"]].map(([href,label])=><a key={href} href={"/"+href} className={active===href?"text-[#fafafa] font-medium text-sm border-b-2 border-[#fafafa] h-14 flex items-center px-1":"text-[#a1a1aa] hover:text-[#fafafa] font-medium text-sm transition-colors h-14 flex items-center px-1"}>{label}</a>)}</div><div className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-0.5 rounded-full text-[11px] font-medium flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"/>LIVE</div></nav>);}
function KpiCard({label,value,sub,color}:{label:string;value:string;sub:string;color?:string}){return(<div className="bg-[#18181b] border border-[#27272a] rounded-xl p-5 shadow-sm space-y-1.5"><p className="text-xs font-semibold text-[#a1a1aa] uppercase tracking-wider">{label}</p><p className={`text-2xl font-bold tracking-tight font-mono ${color||"text-[#fafafa]"}`}>{value}</p><p className="text-xs text-[#52525b]">{sub}</p></div>);}
function CopyBtn({text}:{text:string}){const[c,setC]=React.useState(false);return(<button onClick={()=>{navigator.clipboard.writeText(text).then(()=>{setC(true);setTimeout(()=>setC(false),2500);});}} className={`text-[11px] px-2.5 py-1 rounded border transition-colors ${c?"bg-emerald-500/10 text-emerald-400 border-emerald-500/20":"bg-[#27272a] text-[#a1a1aa] border-[#3f3f46] hover:text-[#fafafa]"}`}>{c?"✓ Copied":"⧉ Copy"}</button>);}
function ConvBar({score}:{score:number}){return(<div className="flex space-x-0.5 h-1.5 w-16 bg-slate-800 rounded-sm overflow-hidden">{Array.from({length:10},(_,i)=>{const lit=i<score;const col=score>=9?"bg-emerald-500":score>=7?"bg-amber-500":score>=5?"bg-blue-500":"bg-rose-500";return<div key={i} className={`flex-1 ${lit?col:"bg-slate-700"}`}/>;})}</div>);}
export default function Journal(){
  const[entries,setEntries]=useState<JournalEntry[]>([]);const[loading,setLoading]=useState(true);const[showForm,setShowForm]=useState(false);const[saving,setSaving]=useState(false);const[msg,setMsg]=useState<{text:string;ok:boolean}|null>(null);const[filter,setFilter]=useState("ALL");const[editEntry,setEditEntry]=useState<JournalEntry|null>(null);
  const[ticker,setTicker]=useState("");const[market,setMarket]=useState("US");const[action,setAction]=useState("BUY");const[entryPrice,setEntryPrice]=useState("");const[shares,setShares]=useState("");const[exitPrice,setExitPrice]=useState("");const[stopLoss,setStopLoss]=useState("");const[targetPrice,setTargetPrice]=useState("");const[setupType,setSetupType]=useState("");const[thesis,setThesis]=useState("");const[outcome,setOutcome]=useState("Open");const[confidence,setConfidence]=useState(5);const[emotion,setEmotion]=useState("Neutral");const[lessons,setLessons]=useState("");const[tradeDate,setTradeDate]=useState(new Date().toISOString().split("T")[0]);const[exitDate,setExitDate]=useState("");
  const load=useCallback(async()=>{setLoading(true);try{const{data,error}=await supabase.from("trade_journal").select("*").order("trade_date",{ascending:false});if(error)throw error;setEntries(data||[]);}catch(e){setMsg({text:"Failed to load — check Supabase connection",ok:false});}setLoading(false);},[]);
  useEffect(()=>{load();},[load]);
  const resetForm=()=>{setTicker("");setMarket("US");setAction("BUY");setEntryPrice("");setShares("");setExitPrice("");setStopLoss("");setTargetPrice("");setSetupType("");setThesis("");setOutcome("Open");setConfidence(5);setEmotion("Neutral");setLessons("");setTradeDate(new Date().toISOString().split("T")[0]);setExitDate("");setEditEntry(null);};
  const openEdit=(e:JournalEntry)=>{setEditEntry(e);setTicker(e.ticker);setMarket(e.market);setAction(e.action);setEntryPrice(String(e.entry_price));setShares(String(e.shares));setExitPrice(String(e.exit_price||""));setStopLoss(String(e.stop_loss||""));setTargetPrice(String(e.target_price||""));setSetupType(e.setup_type||"");setThesis(e.thesis||"");setOutcome(e.outcome||"Open");setConfidence(e.confidence||5);setEmotion(e.emotion||"Neutral");setLessons(e.lessons||"");setTradeDate(e.trade_date||"");setExitDate(e.exit_date||"");setShowForm(true);window.scrollTo({top:0,behavior:"smooth"});};
  const save=async()=>{if(!ticker.trim()){setMsg({text:"Enter ticker symbol",ok:false});return;}if(!entryPrice){setMsg({text:"Enter entry price",ok:false});return;}setSaving(true);const ep=n(entryPrice),sh=n(shares),xp=n(exitPrice);const pnl=xp>0&&sh>0?(xp-ep)*sh:undefined;const pnl_pct=xp>0&&ep>0?((xp-ep)/ep*100):undefined;const entry:Omit<JournalEntry,"id"|"created_at">={ticker:ticker.toUpperCase(),market,action,entry_price:ep,shares:sh,exit_price:xp||undefined,stop_loss:n(stopLoss)||undefined,target_price:n(targetPrice)||undefined,setup_type:setupType,thesis,outcome,pnl,pnl_pct,confidence,emotion,lessons:lessons||undefined,trade_date:tradeDate,exit_date:exitDate||undefined};try{if(editEntry?.id){const{error}=await supabase.from("trade_journal").update(entry).eq("id",editEntry.id);if(error)throw error;setMsg({text:`${ticker.toUpperCase()} trade updated`,ok:true});}else{const{error}=await supabase.from("trade_journal").insert([entry]);if(error)throw error;setMsg({text:`${ticker.toUpperCase()} trade logged`,ok:true});}resetForm();setShowForm(false);load();}catch(e:any){setMsg({text:"Save failed: "+e.message,ok:false});}setSaving(false);};
  const deleteEntry=async(id:number)=>{if(!confirm("Delete this trade?"))return;try{await supabase.from("trade_journal").delete().eq("id",id);load();}catch(e){}};
  const filtered=entries.filter(e=>filter==="ALL"||e.outcome===filter||filter===e.action);
  const wins=entries.filter(e=>e.outcome==="Win").length;const losses=entries.filter(e=>e.outcome==="Loss").length;const totalPnl=entries.reduce((s,e)=>s+(e.pnl||0),0);const winRate=entries.filter(e=>e.outcome!=="Open"&&e.outcome!=="Breakeven").length>0?(wins/(wins+losses)*100).toFixed(0):"—";
  const copyText=entries.map(e=>`${e.trade_date} ${e.action} ${e.ticker} ${e.shares}sh @$${e.entry_price} | ${e.setup_type} | ${e.outcome||"Open"} | P&L:${e.pnl?`$${e.pnl.toFixed(0)}`:"—"}`).join("\n");
  const inp=(label:string,value:string,setter:(v:string)=>void,type="text",placeholder="")=>(<div><label className="text-[10px] text-[#52525b] uppercase tracking-wider block mb-1">{label}</label><input type={type} value={value} onChange={e=>setter(e.target.value)} placeholder={placeholder} className="w-full bg-[#09090b] border border-[#27272a] text-[#fafafa] px-3 py-2 text-xs rounded focus:outline-none focus:border-amber-500/50"/></div>);
  return(
    <>
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <KpiCard label="Total Trades" value={String(entries.length)} sub="all time"/>
          <KpiCard label="Win Rate" value={winRate+"%"} sub={`${wins}W / ${losses}L`} color={Number(winRate)>=60?"text-emerald-400":Number(winRate)>=40?"text-amber-400":"text-rose-400"}/>
          <KpiCard label="Total P&L" value={`${totalPnl>=0?"":"-"}$${Math.abs(totalPnl).toLocaleString(undefined,{maximumFractionDigits:0})}`} sub="realised" color={totalPnl>=0?"text-emerald-400":"text-rose-400"}/>
          <KpiCard label="Open Trades" value={String(entries.filter(e=>e.outcome==="Open").length)} sub="in progress" color="text-amber-400"/>
          <KpiCard label="Closed" value={String(entries.filter(e=>e.outcome!=="Open").length)} sub="completed"/>
        </div>
        {/* CONTROLS */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex gap-1">{[["ALL","All"],["Open","Open"],["Win","Wins"],["Loss","Losses"],["BUY","Longs"],["SHORT","Shorts"]].map(([v,l])=><button key={v} onClick={()=>setFilter(v)} className={`px-3 py-1.5 text-xs font-medium rounded border transition-colors ${filter===v?"bg-amber-500/10 text-amber-400 border-amber-500/30":"bg-[#18181b] text-[#a1a1aa] border-[#27272a] hover:text-[#fafafa]"}`}>{l}</button>)}</div>
          <div className="flex-1"/>
          {entries.length>0&&<CopyBtn text={copyText}/>}
          <button onClick={()=>{resetForm();setShowForm(!showForm);setMsg(null);}} className="bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs px-5 py-2 rounded transition-colors shadow-lg shadow-amber-500/20">+ Log Trade</button>
        </div>
        {/* FORM */}
        {showForm&&(
          <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-5 space-y-4">
            <p className="text-xs font-semibold text-[#a1a1aa] uppercase tracking-wider">{editEntry?"Edit Trade":"Log New Trade"}</p>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {inp("Ticker *",ticker,setTicker,"text","NVDA")}
              <div><label className="text-[10px] text-[#52525b] uppercase tracking-wider block mb-1">Market</label><select value={market} onChange={e=>setMarket(e.target.value)} className="w-full bg-[#09090b] border border-[#27272a] text-[#fafafa] px-3 py-2 text-xs rounded focus:outline-none"><option value="US">US</option><option value="UK">UK</option></select></div>
              <div><label className="text-[10px] text-[#52525b] uppercase tracking-wider block mb-1">Action</label><select value={action} onChange={e=>setAction(e.target.value)} className={`w-full bg-[#09090b] border border-[#27272a] px-3 py-2 text-xs rounded focus:outline-none ${action==="BUY"?"text-emerald-400":"text-rose-400"}`}><option value="BUY">BUY</option><option value="SHORT">SHORT</option></select></div>
              {inp("Trade Date",tradeDate,setTradeDate,"date")}
              {inp("Entry Price *",entryPrice,setEntryPrice,"number","215.33")}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {inp("Shares",shares,setShares,"number","100")}
              {inp("Exit Price",exitPrice,setExitPrice,"number","260.00")}
              {inp("Exit Date",exitDate,setExitDate,"date")}
              {inp("Stop Loss",stopLoss,setStopLoss,"number","195.00")}
              {inp("Target",targetPrice,setTargetPrice,"number","280.00")}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div><label className="text-[10px] text-[#52525b] uppercase tracking-wider block mb-1">Setup Type</label><select value={setupType} onChange={e=>setSetupType(e.target.value)} className="w-full bg-[#09090b] border border-[#27272a] text-[#fafafa] px-3 py-2 text-xs rounded focus:outline-none"><option value="">Select...</option>{SETUP_TYPES.map(s=><option key={s} value={s}>{s}</option>)}</select></div>
              <div><label className="text-[10px] text-[#52525b] uppercase tracking-wider block mb-1">Outcome</label><select value={outcome} onChange={e=>setOutcome(e.target.value)} className={`w-full bg-[#09090b] border border-[#27272a] px-3 py-2 text-xs rounded focus:outline-none ${outcome==="Win"?"text-emerald-400":outcome==="Loss"?"text-rose-400":"text-[#fafafa]"}`}>{OUTCOMES.map(o=><option key={o} value={o}>{o}</option>)}</select></div>
              <div><label className="text-[10px] text-[#52525b] uppercase tracking-wider block mb-1">Confidence: {confidence}/10</label><input type="range" min="1" max="10" value={confidence} onChange={e=>setConfidence(Number(e.target.value))} className="w-full mt-2 accent-amber-500"/></div>
              <div><label className="text-[10px] text-[#52525b] uppercase tracking-wider block mb-1">Emotion</label><select value={emotion} onChange={e=>setEmotion(e.target.value)} className="w-full bg-[#09090b] border border-[#27272a] text-[#fafafa] px-3 py-2 text-xs rounded focus:outline-none">{EMOTIONS.map(em=><option key={em} value={em}>{em}</option>)}</select></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div><label className="text-[10px] text-[#52525b] uppercase tracking-wider block mb-1">Trade Thesis *</label><textarea value={thesis} onChange={e=>setThesis(e.target.value)} placeholder="Why did you take this trade?" className="w-full bg-[#09090b] border border-[#27272a] text-[#a1a1aa] px-3 py-2 text-xs rounded focus:outline-none min-h-[60px] resize-y"/></div>
              <div><label className="text-[10px] text-[#52525b] uppercase tracking-wider block mb-1">Lessons Learned</label><textarea value={lessons} onChange={e=>setLessons(e.target.value)} placeholder="What did this trade teach you?" className="w-full bg-[#09090b] border border-[#27272a] text-[#a1a1aa] px-3 py-2 text-xs rounded focus:outline-none min-h-[60px] resize-y"/></div>
            </div>
            <div className="flex gap-3"><button onClick={save} disabled={saving} className={`font-bold text-xs px-5 py-2 rounded transition-colors ${editEntry?"bg-blue-500 hover:bg-blue-400 text-white":"bg-amber-500 hover:bg-amber-400 text-black shadow-lg shadow-amber-500/20"}`}>{saving?"Saving...":(editEntry?"Update Trade":"Log Trade")}</button><button onClick={()=>{setShowForm(false);resetForm();setMsg(null);}} className="text-xs px-4 py-2 rounded border bg-[#27272a] text-[#a1a1aa] border-[#3f3f46] hover:text-[#fafafa]">Cancel</button></div>
          </div>
        )}
        {msg&&<div className={`text-xs px-4 py-2.5 rounded-lg border ${msg.ok?"bg-emerald-950/40 border-emerald-800/40 text-emerald-400":"bg-rose-950/40 border-rose-800/40 text-rose-400"}`}>{msg.ok?"✓":"⚠"} {msg.text}</div>}
        {/* TABLE */}
        <div className="w-full overflow-hidden rounded-lg border border-[#1E2530] bg-[#0C0F16]">
          <div className="flex items-center gap-3 px-4 py-3 bg-[#0A0D14] border-b border-[#1E2530]">
            <span className="text-xs font-semibold text-[#fafafa] uppercase tracking-wider">Trade Journal</span>
            <span className="bg-[#18181b] text-[#52525b] border border-[#27272a] text-[10px] font-bold px-2 py-0.5 rounded">{filtered.length} entries</span>
          </div>
          {loading?<div className="p-10 text-center text-xs text-[#52525b]">Loading journal...</div>:filtered.length===0?<div className="p-16 text-center space-y-2"><p className="text-[#a1a1aa] text-sm font-semibold">No trades logged</p><p className="text-xs text-[#52525b]">Click Log Trade to record your first trade</p></div>:(
            <div className="overflow-x-auto"><table className="w-full">
              <thead><tr className="bg-[#0A0D14] border-b border-[#1E2530]">{["Date","Ticker","Action","Entry","Shares","Exit","P&L","P&L%","Setup","Outcome","Conf","Emotion","Actions"].map(h=><th key={h} className="text-[11px] font-bold uppercase tracking-wider text-[#64748B] px-4 py-3 border-b border-[#1E2530] text-left whitespace-nowrap">{h}</th>)}</tr></thead>
              <tbody>
                {filtered.map((e,i)=>{
                  const isWin=e.outcome==="Win";const isLoss=e.outcome==="Loss";
                  return(
                    <tr key={e.id} className="border-b border-[#1E2530]/50 last:border-0 hover:bg-[#161C28]/60 transition-colors">
                      <td className="px-4 py-2.5 text-xs text-[#52525b] font-mono whitespace-nowrap">{e.trade_date}</td>
                      <td className="px-4 py-2.5"><div className="flex items-center gap-2"><div className={`w-0.5 h-6 rounded-full ${isWin?"bg-emerald-500":isLoss?"bg-rose-500":"bg-[#3f3f46]"}`}/><span className="font-bold text-[#FFB000] text-sm">{e.ticker}</span></div></td>
                      <td className="px-4 py-2.5"><span className={`text-[10px] font-bold px-2 py-0.5 rounded tracking-wide font-sans ${e.action==="BUY"?"bg-emerald-950/80 text-emerald-400 border border-emerald-800/40":"bg-rose-950/80 text-rose-400 border border-rose-800/40"}`}>{e.action}</span></td>
                      <td className="px-4 py-2.5 font-mono text-sm text-[#fafafa] font-semibold text-right">{fmt(e.entry_price)}</td>
                      <td className="px-4 py-2.5 font-mono text-xs text-[#a1a1aa] text-right">{e.shares||"—"}</td>
                      <td className="px-4 py-2.5 font-mono text-xs text-[#a1a1aa] text-right">{e.exit_price?fmt(e.exit_price):"—"}</td>
                      <td className={`px-4 py-2.5 font-mono text-xs font-semibold text-right ${!e.pnl?"text-[#27272a]":e.pnl>0?"text-emerald-400":"text-rose-400"}`}>{e.pnl?`${e.pnl>0?"+":""}$${Math.abs(e.pnl).toFixed(0)}`:"—"}</td>
                      <td className={`px-4 py-2.5 font-mono text-xs font-semibold text-right ${!e.pnl_pct?"text-[#27272a]":e.pnl_pct>0?"text-emerald-400":"text-rose-400"}`}>{e.pnl_pct?`${e.pnl_pct>0?"+":""}${e.pnl_pct.toFixed(1)}%`:"—"}</td>
                      <td className="px-4 py-2.5 text-xs text-[#52525b] whitespace-nowrap">{e.setup_type||"—"}</td>
                      <td className="px-4 py-2.5"><span className={`text-[10px] font-bold px-2 py-0.5 rounded tracking-wide ${isWin?"bg-emerald-950/80 text-emerald-400 border border-emerald-800/40":isLoss?"bg-rose-950/80 text-rose-400 border border-rose-800/40":e.outcome==="Open"?"bg-blue-950/80 text-blue-400 border border-blue-800/40":"bg-amber-950/80 text-amber-400 border border-amber-800/40"}`}>{e.outcome||"OPEN"}</span></td>
                      <td className="px-4 py-2.5"><div className="flex items-center gap-1.5"><ConvBar score={e.confidence||5}/><span className="text-xs text-[#52525b]">{e.confidence||5}</span></div></td>
                      <td className="px-4 py-2.5 text-xs text-[#52525b]">{e.emotion||"—"}</td>
                      <td className="px-4 py-2.5"><div className="flex gap-1.5"><button onClick={()=>openEdit(e)} className="text-[10px] px-2 py-1 rounded border bg-blue-950/40 text-blue-400 border-blue-800/30 hover:bg-blue-950/70 transition-colors">Edit</button><button onClick={()=>e.id&&deleteEntry(e.id)} className="text-[10px] px-2 py-1 rounded border bg-rose-950/40 text-rose-400 border-rose-800/30 hover:bg-rose-950/70 transition-colors">✕</button></div></td>
                    </tr>
                  );
                })}
              </tbody>
            </table></div>
          )}
        </div>
        <p className="text-[10px] text-[#27272a] text-center">Journal data stored in Supabase · Not financial advice</p>
      </div>
  );
}