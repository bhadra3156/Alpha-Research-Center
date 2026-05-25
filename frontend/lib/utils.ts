import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Format currency
export function formatCurrency(value: number, currency: "USD" | "GBP" = "USD"): string {
  const symbol = currency === "GBP" ? "£" : "$";
  if (value >= 1_000_000_000) return `${symbol}${(value / 1_000_000_000).toFixed(2)}B`;
  if (value >= 1_000_000)     return `${symbol}${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000)         return `${symbol}${(value / 1_000).toFixed(2)}K`;
  return `${symbol}${value.toFixed(2)}`;
}

// Format market cap
export function formatMarketCap(value: number, market: "US" | "UK" = "US"): string {
  return formatCurrency(value, market === "UK" ? "GBP" : "USD");
}

// Format percentage
export function formatPct(value: number): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

// Format number with commas
export function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

// Get conviction colour class
export function getConvictionColor(score: number): string {
  if (score >= 8) return "text-emerald-400";
  if (score >= 6) return "text-gold-400";
  if (score >= 4) return "text-yellow-500";
  return "text-red-400";
}

// Get conviction label
export function getConvictionLabel(score: number): string {
  if (score >= 9) return "Maximum";
  if (score >= 8) return "Very High";
  if (score >= 7) return "High";
  if (score >= 6) return "Above Average";
  if (score >= 5) return "Moderate";
  return "Low";
}

// Stage badge colour
export function getStageBadgeClass(stage: string): string {
  if (stage.includes("Stage 2") || stage.includes("Markup"))       return "badge-pass";
  if (stage.includes("Stage 1") || stage.includes("Accumulation")) return "badge-blue";
  if (stage.includes("Stage 3") || stage.includes("Distribution")) return "badge-gold";
  return "badge-fail";
}

// Data quality class
export function getDataQualityClass(quality: string): string {
  if (quality === "HIGH")   return "dq-high";
  if (quality === "MEDIUM") return "dq-medium";
  return "dq-low";
}

// Time ago
export function timeAgo(date: string | Date): string {
  const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
  if (seconds < 60)   return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

// Market flag emoji
export function getMarketFlag(market: string): string {
  return market === "UK" ? "????" : "????";
}
