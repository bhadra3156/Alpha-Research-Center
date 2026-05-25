export interface HedgeFundHolding {
  institution_name: string;
  ticker:           string;
  quarter_end:      string;
  shares_held:      number;
  market_value:     number;
  portfolio_weight: number;
  change_type:      "NEW" | "INCREASED" | "DECREASED" | "EXITED" | "UNCHANGED";
  shares_change:    number;
  pct_change:       number;
  filing_date:      string;
}

export interface PoliticianTrade {
  politician_name:  string;
  party:            string;
  chamber:          "House" | "Senate";
  committee:        string;
  ticker:           string;
  transaction_type: "Purchase" | "Sale";
  trade_date:       string;
  disclosure_date:  string;
  amount_min:       number;
  amount_max:       number;
}

export interface InsiderTransaction {
  ticker:             string;
  insider_name:       string;
  insider_title:      string;
  transaction_code:   string;
  transaction_date:   string;
  shares:             number;
  price_per_share:    number;
  total_value:        number;
  shares_owned_after: number;
  filing_date:        string;
}

export interface SmartMoneySignal {
  signal_type:      "13F" | "STOCK_ACT" | "FORM_4" | "RNS";
  institution:      string;
  ticker:           string;
  signal_date:      string;
  conviction_score: number;
  details:          string;
}
