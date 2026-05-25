-- AlphaResearch: Portfolio & Journal Tables
-- Migration 003

-- Portfolio positions
CREATE TABLE IF NOT EXISTS portfolio_positions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticker VARCHAR(20) NOT NULL,
    company_name VARCHAR(255),
    market VARCHAR(10),
    entry_date DATE NOT NULL,
    entry_price DECIMAL(12, 4) NOT NULL,
    shares DECIMAL(15, 4) NOT NULL,
    entry_conviction INTEGER CHECK (entry_conviction BETWEEN 1 AND 10),
    stop_level DECIMAL(12, 4),
    target_price DECIMAL(12, 4),
    position_size_pct DECIMAL(6, 4),
    status VARCHAR(20) DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'CLOSED', 'PARTIAL')),
    exit_date DATE,
    exit_price DECIMAL(12, 4),
    pnl_amount DECIMAL(20, 2),
    pnl_pct DECIMAL(10, 4),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_portfolio_ticker ON portfolio_positions(ticker);
CREATE INDEX IF NOT EXISTS idx_portfolio_status ON portfolio_positions(status);

-- Trade journal entries
CREATE TABLE IF NOT EXISTS trade_journal (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticker VARCHAR(20) NOT NULL,
    journal_date TIMESTAMPTZ DEFAULT NOW(),
    entry_type VARCHAR(20) CHECK (entry_type IN ('ANALYSIS', 'ENTRY', 'ADJUSTMENT', 'EXIT', 'OBSERVATION')),
    title VARCHAR(255),
    content TEXT NOT NULL,
    check1_summary TEXT,
    check2_summary TEXT,
    check3_summary TEXT,
    conviction_at_time INTEGER,
    price_at_time DECIMAL(12, 4),
    tags TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_journal_ticker ON trade_journal(ticker, journal_date DESC);
