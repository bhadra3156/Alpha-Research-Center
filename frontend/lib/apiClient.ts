const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url      = `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: "Unknown error" }));
      throw new Error(error.detail || `HTTP ${response.status}`);
    }

    return response.json();
  }

  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: "GET" });
  }

  async post<T>(endpoint: string, body?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    });
  }
}

export const apiClient = new ApiClient(BASE_URL);

// Typed API methods
export const alphaApi = {
  // Scan
  runScan: (market: string = "BOTH") =>
    apiClient.post<ScanResponse>("/scan", { market, notify_telegram: false }),

  // Analysis
  analyzeStock: (ticker: string) =>
    apiClient.get<AnalysisResponse>(`/analyze/${ticker}`),

  // Watchlist
  getWatchlist: () =>
    apiClient.get<WatchlistItem[]>("/watchlist"),

  addToWatchlist: (ticker: string, market: string) =>
    apiClient.post("/watchlist", { ticker, market }),

  // Portfolio
  getPortfolio: () =>
    apiClient.get<PortfolioPosition[]>("/portfolio"),

  // Health check
  healthCheck: () =>
    apiClient.get<{ status: string }>("/health"),
};

// Types for API responses
export interface ScanResponse {
  scan_id:           string;
  scan_date:         string;
  stocks_scanned:    number;
  qualifying_stocks: QualifyingStock[];
  scan_duration_ms:  number;
}

export interface QualifyingStock {
  ticker:               string;
  company_name:         string;
  market:               "US" | "UK";
  price:                number;
  market_cap:           number;
  check1_pass:          boolean;
  check2_pass:          boolean;
  check3_pass:          boolean;
  fundamental_verdict:  string;
  technical_stage:      string;
  smart_money_trigger:  string;
  conviction_score:     number;
  data_quality:         "HIGH" | "MEDIUM" | "LOW";
  action_zone:          string;
}

export interface AnalysisResponse {
  ticker:           string;
  company_name:     string;
  market:           string;
  price:            number;
  market_cap:       number;
  conviction_score: number;
  verdict:          "ACCUMULATE" | "HOLD" | "AVOID";
  sections:         ReportSection[];
  data_quality:     string;
  generated_at:     string;
}

export interface ReportSection {
  section_number: number;
  title:          string;
  content:        string;
  verdict?:       string;
  data_quality?:  string;
}

export interface WatchlistItem {
  id:           string;
  ticker:       string;
  company_name: string;
  market:       string;
  sector:       string;
  theme:        string;
  is_active:    boolean;
}

export interface PortfolioPosition {
  id:                string;
  ticker:            string;
  company_name:      string;
  entry_price:       number;
  shares:            number;
  stop_level:        number;
  target_price:      number;
  status:            string;
  entry_conviction:  number;
}
