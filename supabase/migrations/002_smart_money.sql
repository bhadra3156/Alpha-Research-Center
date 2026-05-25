-- AlphaResearch: Smart Money Tables
-- Migration 002

-- Hedge fund 13F holdings
CREATE TABLE IF NOT EXISTS hedge_fund_holdings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    institution_name VARCHAR(255) NOT NULL,
    ticker VARCHAR(20) NOT NULL,
    quarter_end DATE NOT NULL,
    shares_held BIGINT,
    market_value DECIMAL(20, 2),
    portfolio_weight DECIMAL(8, 4),
    change_type VARCHAR(20) CHECK (change_type IN ('NEW', 'INCREASED', 'DECREASED', 'EXITED', 'UNCHANGED')),
    shares_change BIGINT,
    pct_change DECIMAL(10, 4),
    filing_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hf_ticker ON hedge_fund_holdings(ticker, quarter_end DESC);
CREATE INDEX IF NOT EXISTS idx_hf_institution ON hedge_fund_holdings(institution_name, quarter_end DESC);

-- Politician trades (STOCK Act)
CREATE TABLE IF NOT EXISTS politician_trades (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    politician_name VARCHAR(255) NOT NULL,
    party VARCHAR(10),
    chamber VARCHAR(10) CHECK (chamber IN ('House', 'Senate')),
    committee VARCHAR(255),
    ticker VARCHAR(20) NOT NULL,
    transaction_type VARCHAR(10) CHECK (transaction_type IN ('Purchase', 'Sale', 'Exchange')),
    trade_date DATE,
    disclosure_date DATE,
    amount_min DECIMAL(15, 2),
    amount_max DECIMAL(15, 2),
    asset_description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pol_ticker ON politician_trades(ticker, trade_date DESC);

-- Insider Form 4 transactions
CREATE TABLE IF NOT EXISTS insider_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticker VARCHAR(20) NOT NULL,
    insider_name VARCHAR(255) NOT NULL,
    insider_title VARCHAR(255),
    transaction_code VARCHAR(5) NOT NULL,
    transaction_date DATE NOT NULL,
    shares INTEGER,
    price_per_share DECIMAL(12, 4),
    total_value DECIMAL(20, 2),
    shares_owned_after BIGINT,
    filing_date DATE,
    form4_url TEXT,
    market VARCHAR(10) DEFAULT 'US',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_insider_ticker ON insider_transactions(ticker, transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_insider_code ON insider_transactions(transaction_code);
