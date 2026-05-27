// ─────────────────────────────────────────────────────────────────────────────
// AlphaResearch — Shared UI Primitives
// Reusable across Dashboard, Analyzer, Watchlist, Portfolio, Journal
// ─────────────────────────────────────────────────────────────────────────────
"use client";

import React, { useState } from "react";

/* ── KPI Card ─────────────────────────────────────────────────────────────── */
export function KpiCard({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string;
  sub: string;
  color?: string;
}) {
  return (
    <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-5 shadow-sm space-y-1.5">
      <p className="text-[10px] font-semibold text-[#71717a] uppercase tracking-widest">
        {label}
      </p>
      <p
        className={`text-2xl font-bold tracking-tight font-mono tabular-nums ${color || "text-[#fafafa]"}`}
      >
        {value}
      </p>
      <p className="text-xs text-[#52525b]">{sub}</p>
    </div>
  );
}

/* ── Conviction Bar (10-segment) ──────────────────────────────────────────── */
export function ConvictionBar({ score }: { score: number }) {
  const color =
    score >= 9
      ? "bg-emerald-500"
      : score >= 7
        ? "bg-amber-500"
        : score >= 5
          ? "bg-blue-500"
          : "bg-rose-500";

  return (
    <div className="flex space-x-0.5 h-1.5 w-16 bg-slate-800 rounded-sm overflow-hidden">
      {Array.from({ length: 10 }, (_, i) => (
        <div
          key={i}
          className={`flex-1 ${i < score ? color : "bg-slate-700"}`}
        />
      ))}
    </div>
  );
}

/* ── Pass / Fail Badge ────────────────────────────────────────────────────── */
export function CheckBadge({ pass, label }: { pass: boolean; label?: string }) {
  return (
    <span
      className={`text-[10px] font-bold px-2 py-0.5 rounded tracking-wide font-sans ${
        pass
          ? "bg-emerald-950/80 text-emerald-400 border border-emerald-800/40"
          : "bg-rose-950/80 text-rose-400 border border-rose-800/40"
      }`}
    >
      {label || (pass ? "PASS" : "FAIL")}
    </span>
  );
}

/* ── Stage Tag ────────────────────────────────────────────────────────────── */
export function StageTag({ stage }: { stage: string }) {
  const isS2 = stage.includes("Stage 2") || stage.includes("Markup");
  const isS1 = stage.includes("Stage 1") || stage.includes("Accumulation");

  const short = isS2 ? "STG2" : isS1 ? "STG1" : "STG3/4";
  const colorClass = isS2
    ? "text-emerald-400"
    : isS1
      ? "text-blue-400"
      : "text-rose-400";

  return (
    <span
      className={`bg-blue-950/60 border border-blue-900/40 text-[10px] font-medium px-1.5 py-0.5 rounded ${colorClass}`}
    >
      {short}
    </span>
  );
}

/* ── Data Quality Badge ───────────────────────────────────────────────────── */
export function DataQualityBadge({ quality }: { quality: string }) {
  const cls =
    quality === "HIGH"
      ? "text-emerald-400 bg-emerald-950/60 border-emerald-800/40"
      : quality === "MEDIUM"
        ? "text-amber-400 bg-amber-950/60 border-amber-800/40"
        : "text-rose-400 bg-rose-950/60 border-rose-800/40";

  return (
    <span
      className={`text-[9px] font-bold px-1.5 py-0.5 rounded border tracking-wider ${cls}`}
    >
      {quality}
    </span>
  );
}

/* ── Copy Button ──────────────────────────────────────────────────────────── */
export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  return (
    <button
      onClick={handleCopy}
      className={`text-[11px] px-2.5 py-1 rounded border transition-colors ${
        copied
          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
          : "bg-[#27272a] text-[#a1a1aa] border-[#3f3f46] hover:text-[#fafafa]"
      }`}
    >
      {copied ? "✓ Copied" : "⧉ Copy"}
    </button>
  );
}

/* ── Conviction Score Display ─────────────────────────────────────────────── */
export function ConvictionScore({ score }: { score: number }) {
  const color =
    score >= 9
      ? "text-emerald-400"
      : score >= 7
        ? "text-amber-400"
        : score >= 5
          ? "text-blue-400"
          : "text-rose-400";

  return (
    <div className="flex items-center gap-2">
      <ConvictionBar score={score} />
      <span className={`font-bold font-mono text-sm ${color}`}>{score}</span>
    </div>
  );
}

/* ── 3-Check Mini Row ─────────────────────────────────────────────────────── */
export function ThreeCheckMini({
  c1,
  c2,
  c3,
}: {
  c1: boolean;
  c2: boolean;
  c3: boolean;
}) {
  return (
    <div className="flex gap-1">
      <CheckBadge pass={c1} label="C1" />
      <CheckBadge pass={c2} label="C2" />
      <CheckBadge pass={c3} label="C3" />
    </div>
  );
}

/* ── Empty State ──────────────────────────────────────────────────────────── */
export function EmptyState({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-16 text-center space-y-2">
      <p className="text-[#a1a1aa] text-sm font-semibold">{title}</p>
      <p className="text-xs text-[#52525b]">{subtitle}</p>
    </div>
  );
}

/* ── Loading Skeleton ─────────────────────────────────────────────────────── */
export function ScanLoading({ label }: { label?: string }) {
  return (
    <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-16 text-center space-y-3">
      <div className="flex justify-center">
        <div className="w-6 h-6 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
      </div>
      <p className="text-amber-400 text-sm font-semibold tracking-wider">
        {label || "Processing..."}
      </p>
      <p className="text-xs text-[#52525b] tracking-wider">
        Fundamentals · Technicals · Smart Money · Scoring
      </p>
    </div>
  );
}