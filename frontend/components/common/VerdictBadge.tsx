type VerdictType = "PASS" | "FAIL" | "Stage 1" | "Stage 2" | "Stage 3" | "Stage 4";

interface VerdictBadgeProps {
  verdict: VerdictType | string;
}

const STYLES: Record<string, string> = {
  "PASS":    "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  "FAIL":    "bg-red-500/10 text-red-400 border-red-500/20",
  "Stage 1": "bg-blue-500/10 text-blue-400 border-blue-500/20",
  "Stage 2": "bg-blue-500/10 text-blue-400 border-blue-500/20",
  "Stage 3": "bg-amber-500/10 text-amber-400 border-amber-500/20",
  "Stage 4": "bg-red-500/10 text-red-400 border-red-500/20",
};

export default function VerdictBadge({ verdict }: VerdictBadgeProps) {
  const styles = STYLES[verdict] ?? "bg-[#27272a] text-[#a1a1aa] border-[#27272a]";
  return (
    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${styles}`}>
      {verdict}
    </span>
  );
}
