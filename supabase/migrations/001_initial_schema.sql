-- AlphaResearch: Initial Schema
-- Migration 001: Core tables

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Watchlist table
CREATE TABLE IF NOT EXISTS watchlist (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticker VARCHAR(20) NOT NULL,
    company_name VARCHAR(255),
    market VARCHAR(10) NOT NULL CHECK (market IN ('US', 'UK')),
    exchange VARCHAR(20),
    sector VARCHAR(100),
    theme VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    added_at TIMESTAMPTZ DEFAULT NOW(),
    notes TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_watchlist_ticker ON watchlist(ticker);

-- Scan results table
CREATE TABLE IF NOT EXISTS scan_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    scan_date TIMESTAMPTZ DEFAULT NOW(),
    ticker VARCHAR(20) NOT NULL,
    company_name VARCHAR(255),
    market VARCHAR(10),
    price DECIMAL(12, 4),
    market_cap DECIMAL(20, 2),
    check1_pass BOOLEAN,
    check2_pass BOOLEAN,
    check3_pass BOOLEAN,
    overall_pass BOOLEAN,
    fundamental_verdict TEXT,
    technical_stage VARCHAR(50),
    smart_money_trigger TEXT,
    conviction_score INTEGER CHECK (conviction_score BETWEEN 1 AND 10),
    data_quality VARCHAR(10) CHECK (data_quality IN ('HIGH', 'MEDIUM', 'LOW')),
    raw_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scan_results_date ON scan_results(scan_date DESC);
CREATE INDEX IF NOT EXISTS idx_scan_results_ticker ON scan_results(ticker);

-- Full analysis cache table
CREATE TABLE IF NOT EXISTS analysis_cache (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticker VARCHAR(20) NOT NULL,
    analysis_date TIMESTAMPTZ DEFAULT NOW(),
    full_report JSONB NOT NULL,
    conviction_score INTEGER,
    verdict VARCHAR(20),
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours'),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analysis_ticker ON analysis_cache(ticker, analysis_date DESC);
