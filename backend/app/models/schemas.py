from pydantic import BaseModel
from typing import Optional, List, Dict, Any

class ScanRequest(BaseModel):
    market: str = "BOTH"
    tickers: Optional[List[str]] = None
    notify_telegram: bool = False

class QualifyingStock(BaseModel):
    ticker: str
    company_name: str
    market: str
    price: float
    market_cap: float
    change_pct: float = 0.0
    check1_pass: bool
    check2_pass: bool
    check3_pass: bool
    fundamental_verdict: str
    technical_stage: str
    smart_money_trigger: str
    conviction_score: int
    data_quality: str
    entry_zone: str
    rsi14: float = 50.0
    ma50: float = 0.0
    ma200: float = 0.0
    golden_cross: bool = False
    week52_high: float = 0.0
    week52_low: float = 0.0
    range_pct: float = 0.0
    revenue_growth: float = 0.0
    net_margin: float = 0.0
    pe_ratio: float = 0.0
    sector: str = ""
    action: str = "Deep Analyze"

class ScanResponse(BaseModel):
    scan_id: str
    scan_date: str
    market: str
    stocks_scanned: int
    qualifying_count: int
    qualifying_stocks: List[QualifyingStock]
    scan_duration_ms: float

class AnalysisResponse(BaseModel):
    ticker: str
    company_name: str
    market: str
    price: float
    market_cap: float
    conviction_score: int
    verdict: str
    narrative: str
    check1: Dict[str, Any]
    check2: Dict[str, Any]
    check3: Dict[str, Any]
    data_quality: str
    generated_at: str

class WatchlistItem(BaseModel):
    ticker: str
    company_name: Optional[str] = None
    market: str = "US"
    exchange: Optional[str] = None
    sector: Optional[str] = None
    theme: Optional[str] = None

class PortfolioPosition(BaseModel):
    ticker: str
    company_name: Optional[str] = None
    market: str = "US"
    entry_date: str
    entry_price: float
    shares: float
    stop_level: Optional[float] = None
    target_price: Optional[float] = None
    notes: Optional[str] = None

class JournalEntry(BaseModel):
    ticker: str
    entry_type: str = "OBSERVATION"
    title: str
    content: str
    conviction_at_time: Optional[int] = None
    price_at_time: Optional[float] = None
    tags: Optional[List[str]] = []
