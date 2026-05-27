New-Item -Path "frontend/app/journal/page.tsx" -ItemType File -Force
Set-Content -Path "frontend/app/journal/page.tsx" -Value @'
"use client";

import { useState } from "react";

interface JournalEntry {
  id: string;
  ticker: string;
  market: "US" | "UK";
  entryDate: string;
  exitDate?: string;
  entryPrice: number;
  exitPrice?: number;
  conviction: number;
  notes: string;
  status: "open" | "closed";
  pnl?: number;
}

const MOCK_ENTRIES: JournalEntry[] = [
  { id:"1", ticker:"AMD",  market:"US", entryDate:"2026-03-12", exitDate:"2026-05-01", entryPrice:380.00, exitPrice:467.51, conviction:8, notes:"AI infrastructure thesis. Stage 2 breakout on volume. ExodusPoint 13F.", status:"closed", pnl:23.0 },
  { id:"2", ticker:"BA.",  market:"UK", entryDate:"2026-04-03", entryPrice:1180,       conviction:8, notes:"Defence spending super-cycle. Director buy cluster in March. Stage 2.", status:"open" },
  { id:"3", ticker:"NVDA", market:"US", entryDate:"2026-02-20", exitDate:"2026-04-15", entryPrice:820.00, exitPrice:1089.20, conviction:9, notes:"Blackwell ramp. 13F consensus from 7 top funds. Exceptional FCF.", status:"closed", pnl:32.8 },
];

function StatCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-5">
      <p className="text-[10px] font-semibold text-[#71717a] uppercase tracking-widest mb-2">{label}</p>
      <p className="text-2xl font-bold tracking-tight text-[#fafafa] font-mono tabular-nums">{value}</p>
      <p className="text-[11px] text-[#52525b] mt-1">{sub}</p>
    </div>
  );
}

export default function JournalPage() {
  const [entries] = useState<JournalEntry[]>(MOCK_ENTRIES);

  const closed   = entries.filter((e) => e.status === "closed");
  const winRate  = closed.length
    ? Math.round((closed.filter((e) => (e.pnl ?? 0) > 0).length / closed.length) * 100)
    : 0;
  const avgConv  = Math.round(entries.reduce((a, e) => a + e.conviction, 0) / entries.length);
  const avgPnl   = closed.length
    ? (closed.reduce((a, e) => a + (e.pnl ?? 0), 0) / closed.length).toFixed(1)
    : "—";

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[18px] font-bold tracking-tight text-[#fafafa]">Trade Journal</h1>
          <p className="text-[11px] text-[#52525b] mt-0.5 uppercase tracking-widest">
            Position log · Conviction tracking · P&amp;L analysis
          </p>
        </div>
        <button className="bg-[#fafafa] hover:bg-[#e4e4e7] text-[#18181b] font-semibold text-[12px] px-4 py-2 rounded-lg transition-colors">
          + Add Entry
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total Entries"    value={String(entries.length)} sub="All time"              />
        <StatCard label="Win Rate"         value={`${winRate}%`}          sub={`${closed.length} closed trades`} />
        <StatCard label="Avg Conviction"   value={`${avgConv}/10`}        sub="Mean score at entry"   />
        <StatCard label="Avg Return"       value={`+${avgPnl}%`}          sub="Closed positions only" />
      </div>

      {/* Entries table */}
      <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-5">
        <p className="text-[10px] font-semibold text-[#52525b] uppercase tracking-widest mb-4">Journal Entries</p>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                {["Ticker", "Entry Date", "Entry Price", "Exit Price", "P&L", "Conviction", "Status", "Notes"].map((h) => (
                  <th key={h} className="text-left text-[10px] font-semibold text-[#52525b] uppercase tracking-widest pb-3 pr-4">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#27272a]">
              {entries.map((e) => (
                <tr key={e.id} className="hover:bg-[#1c1c1f] transition-colors">
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-2">
                      <span>{e.market === "US" ? "🇺🇸" : "🇬🇧"}</span>
                      <span className="text-[13px] font-bold text-[#fafafa]">{e.ticker}</span>
                    </div>
                  </td>
                  <td className="py-3 pr-4 text-[12px] text-[#a1a1aa] tabular-nums">{e.entryDate}</td>
                  <td className="py-3 pr-4 text-[12px] text-[#fafafa] tabular-nums font-mono">
                    {e.market === "US" ? "$" : "p"}{e.entryPrice.toLocaleString()}
                  </td>
                  <td className="py-3 pr-4 text-[12px] text-[#a1a1aa] tabular-nums font-mono">
                    {e.exitPrice ? `${e.market === "US" ? "$" : "p"}${e.exitPrice.toLocaleString()}` : "—"}
                  </td>
                  <td className="py-3 pr-4">
                    {e.pnl != null ? (
                      <span className={`text-[12px] font-bold tabular-nums ${e.pnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                        {e.pnl >= 0 ? "+" : ""}{e.pnl}%
                      </span>
                    ) : <span className="text-[12px] text-[#52525b]">Open</span>}
                  </td>
                  <td className="py-3 pr-4 text-[12px] font-semibold text-[#fafafa] tabular-nums">{e.conviction}/10</td>
                  <td className="py-3 pr-4">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${
                      e.status === "open"
                        ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                        : "bg-[#27272a] text-[#a1a1aa] border border-[#27272a]"
                    }`}>
                      {e.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="py-3 text-[11px] text-[#71717a] max-w-[220px] leading-relaxed">{e.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
'@