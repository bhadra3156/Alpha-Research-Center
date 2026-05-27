// ─────────────────────────────────────────────────────────────────────────────
// AlphaResearch — API Client
// Typed interface to the FastAPI backend on Render
// ─────────────────────────────────────────────────────────────────────────────

import type {
  ScanResponse,
  AnalysisResponse,
  JournalEntry,
  JournalStats,
} from "./types";

const API =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://alpha-research-center-backend.onrender.com";

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${endpoint}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...options?.headers },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: `HTTP ${res.status}` }));
    throw new Error(err.detail || `Request failed: ${res.status}`);
  }
  return res.json();
}

export const api = {
  // ── Health ───────────────────────────────────────────────────────────────
  health: () => request<{ status: string }>("/health"),

  // ── Scan ─────────────────────────────────────────────────────────────────
  scan: (market = "BOTH", tickers?: string[]) =>
    request<ScanResponse>("/scan/", {
      method: "POST",
      body: JSON.stringify({ market, tickers, notify_telegram: false }),
    }),

  // ── Analyze ──────────────────────────────────────────────────────────────
  analyze: (ticker: string, market = "US") =>
    request<AnalysisResponse>(`/analyze/${ticker.toUpperCase()}?market=${market}`),

  // ── Watchlist ────────────────────────────────────────────────────────────
  getWatchlist: () => request<any[]>("/watchlist/"),

  addToWatchlist: (ticker: string, market: string) =>
    request<any>("/watchlist/", {
      method: "POST",
      body: JSON.stringify({ ticker: ticker.toUpperCase(), market }),
    }),

  removeFromWatchlist: (ticker: string) =>
    request<any>(`/watchlist/${ticker.toUpperCase()}`, { method: "DELETE" }),

  // ── Watchlist AI Analysis ────────────────────────────────────────────────
  analyzeWatchlist: (stocks: any[]) =>
    request<{ analysis: string; status: string; model?: string }>(
      "/analyze/watchlist",
      { method: "POST", body: JSON.stringify({ stocks }) }
    ),

  // ── Portfolio AI Analysis ────────────────────────────────────────────────
  analyzePortfolio: (holdings: any[]) =>
    request<{ analysis: string; status: string; model?: string }>(
      "/analyze/portfolio-deep",
      { method: "POST", body: JSON.stringify({ holdings }) }
    ),

  // ── Ticker Info ──────────────────────────────────────────────────────────
  tickerInfo: (ticker: string, market = "US") =>
    request<{ sector: string; theme: string; notes: string; source?: string }>(
      "/analyze/ticker-info",
      { method: "POST", body: JSON.stringify({ ticker: ticker.toUpperCase(), market }) }
    ),

  // ── Journal ──────────────────────────────────────────────────────────────
  getJournal: (ticker?: string) =>
    request<JournalEntry[]>(`/journal/${ticker ? `?ticker=${ticker}` : ""}`),

  addJournalEntry: (entry: any) =>
    request<{ status: string; id: string }>("/journal/", {
      method: "POST",
      body: JSON.stringify(entry),
    }),

  deleteJournalEntry: (id: string) =>
    request<void>(`/journal/${id}`, { method: "DELETE" }),

  getJournalStats: () => request<JournalStats>("/journal/stats"),
};