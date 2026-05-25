export interface Stock {
  ticker:       string;
  company_name: string;
  market:       "US" | "UK";
  exchange:     string;
  sector:       string;
  theme:        string;
}

export interface ScanResult {
  ticker:              string;
  company_name:        string;
  market:              "US" | "UK";
  price:               number;
  market_cap:          number;
  check1_pass:         boolean;
  check2_pass:         boolean;
  check3_pass:         boolean;
  overall_pass:        boolean;
  fundamental_verdict: string;
  technical_stage:     string;
  smart_money_trigger: string;
  conviction_score:    number;
  data_quality:        "HIGH" | "MEDIUM" | "LOW";
  entry_zone?:         string;
  scan_date:           string;
}

export type TechnicalStage =
  | "Stage 1 Accumulation"
  | "Stage 2 Markup"
  | "Stage 3 Distribution"
  | "Stage 4 Decline";

export type DataQuality = "HIGH" | "MEDIUM" | "LOW";
export type Verdict     = "ACCUMULATE" | "HOLD" | "AVOID";
export type Market      = "US" | "UK" | "BOTH";
