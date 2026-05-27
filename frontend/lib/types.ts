// ─────────────────────────────────────────────────────────────────────────────
// AlphaResearch — Shared Types
// Single source of truth for all frontend data contracts
// ─────────────────────────────────────────────────────────────────────────────

export type Market = "US" | "UK";
export type DataQuality = "HIGH" | "MEDIUM" | "LOW";
export type Verdict = "ACCUMULATE" | "HOLD" | "AVOID";
export type ConvictionTier = "Maximum" | "Very High" | "High" | "Above Average" | "Moderate" | "Low";
export type Stage = "Stage 1 Accumulation" | "Stage 2 Markup" | "Stage 3 Distribution" | "Stage 4 Decline";

// ── Scan ─────────────────────────────────────────────────────────────────────
export interface QualifyingStock {
  ticker: string;
  company_name: string;
  market: Market;
  price: number;
  market_cap: number;
  change_pct: number;
  check1_pass: boolean;
  check2_pass: boolean;
  check3_pass: boolean;
  fundamental_verdict: string;
  technical_stage: string;
  smart_money_trigger: string;
  conviction_score: number;
  data_quality: DataQuality;
  entry_zone: string;
  rsi14: number;
  ma50: number;
  ma200: number;
  golden_cross: boolean;
  week52_high: number;
  week52_low: number;
  range_pct: number;
  revenue_growth: number;
  net_margin: number;
  pe_ratio: number;
  sector: string;
  action?: string;
}

export interface ScanResponse {
  scan_id: string;
  scan_date: string;
  market: string;
  stocks_scanned: number;
  qualifying_count: number;
  qualifying_stocks: QualifyingStock[];
  scan_duration_ms: number;
}

// ── Analysis ─────────────────────────────────────────────────────────────────
export interface AnalysisResponse {
  ticker: string;
  company_name: string;
  market: string;
  price: number;
  market_cap: number;
  conviction_score: number;
  verdict: Verdict;
  narrative: string;
  check1: Record<string, any>;
  check2: Record<string, any>;
  check3: Record<string, any>;
  data_quality: DataQuality;
  generated_at: string;
  change_pct?: number;
  rsi14?: number;
  ma50?: number;
  ma200?: number;
  golden_cross?: boolean;
  entry_zone?: string;
  week52_high?: number;
  week52_low?: number;
  revenue_growth?: number;
  net_margin?: number;
  pe_ratio?: number;
  sector?: string;
  technical_stage?: string;
}

// ── Watchlist ────────────────────────────────────────────────────────────────
export interface WatchlistItem {
  id: string;
  ticker: string;
  market: Market;
  sector: string;
  theme: string;
  notes: string;
  added: string;
  score: number;
  c1_pass: boolean;
  c2_pass: boolean;
  stage: string;
  rsi: number;
  entry_zone: string;
  graduated: boolean;
}

// ── Portfolio ────────────────────────────────────────────────────────────────
export interface PortfolioPosition {
  id: string;
  ticker: string;
  market: Market;
  entry_date: string;
  entry_price: number;
  shares: number;
  stop_level: number;
  target_price: number;
  notes: string;
}

// ── Journal ──────────────────────────────────────────────────────────────────
export interface JournalEntry {
  id: string;
  ticker: string;
  entry_type: "ANALYSIS" | "ENTRY" | "ADJUSTMENT" | "EXIT" | "OBSERVATION";
  title: string;
  content: string;
  conviction_at_time: number | null;
  price_at_time: number | null;
  tags: string[];
  journal_date: string;
  created_at: string;
}

export interface JournalStats {
  total: number;
  exits: number;
  win_rate_pct: number | null;
  avg_conviction: number | null;
  rule_breaks: number;
}