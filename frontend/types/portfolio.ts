export interface PortfolioPosition {
  id:                string;
  ticker:            string;
  company_name:      string;
  market:            "US" | "UK";
  entry_date:        string;
  entry_price:       number;
  shares:            number;
  entry_conviction:  number;
  stop_level:        number;
  target_price:      number;
  position_size_pct: number;
  status:            "OPEN" | "CLOSED" | "PARTIAL";
  exit_date?:        string;
  exit_price?:       number;
  pnl_amount?:       number;
  pnl_pct?:         number;
  notes?:            string;
  current_price?:    number;
  unrealised_pnl?:   number;
}

export interface JournalEntry {
  id:               string;
  ticker:           string;
  journal_date:     string;
  entry_type:       "ANALYSIS" | "ENTRY" | "ADJUSTMENT" | "EXIT" | "OBSERVATION";
  title:            string;
  content:          string;
  conviction_at_time?: number;
  price_at_time?:   number;
  tags:             string[];
}
