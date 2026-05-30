# ─────────────────────────────────────────────────────────────────────────────
# AlphaResearch — 10-Baggers Scanner
# Dedicated small-cap scanner: $300M–$5B market cap sweet spot
# Separate from main scan.py — independent universe & market cap gate
# ─────────────────────────────────────────────────────────────────────────────

from fastapi import APIRouter
from app.models.schemas import ScanRequest, ScanResponse, QualifyingStock
from app.services.data_fetcher import data_fetcher
from app.services.scoring_service import scoring_service
import uuid
import time
import asyncio
from datetime import datetime
from typing import List

router = APIRouter()

# ─── Market Cap Gate ──────────────────────────────────────────────────────────
MKTCAP_MIN = 300_000_000      # $300M floor — below = micro-cap risk
MKTCAP_MAX = 5_000_000_000    # $5B ceiling — above = institutional efficiency

# ─── Small-Cap Universe ──────────────────────────────────────────────────────
# Curated Russell 2000 / early mid-cap names across sectors
# All NYSE / NASDAQ listed — no OTC or penny stocks
# Market cap filter enforced at scan time (rejects out-of-range)
# ─────────────────────────────────────────────────────────────────────────────

TENBAGGER_UNIVERSE = [
    # ── Technology / Software ─────────────────────────────────────────────
    "DOCN",    # DigitalOcean — cloud infrastructure
    "BRZE",    # Braze — customer engagement platform
    "SEMR",    # SEMrush — digital marketing SaaS
    "BIGC",    # BigCommerce — ecommerce platform
    "JAMF",    # Jamf — Apple device management
    "DV",      # DoubleVerify — ad verification
    "INTA",    # Intapp — professional services software
    "QTWO",    # Q2 Holdings — fintech banking platform
    "ALRM",    # Alarm.com — smart home/security
    "GENI",    # Genius Sports — sports data/betting
    "CFLT",    # Confluent — data streaming
    "ASAN",    # Asana — work management
    "MNDY",    # Monday.com — work OS
    "SMAR",    # Smartsheet — work management
    "ZI",      # ZoomInfo — B2B data platform
    "VMEO",    # Vimeo — video platform
    "PAYO",    # Payoneer — cross-border payments
    "FLYW",    # Flywire — vertical payments
    "VERX",    # Vertex — tax compliance SaaS
    "CWAN",    # Clearwater Analytics — investment mgmt
    "RELY",    # Remitly — digital remittances
    "ACIW",    # ACI Worldwide — payment systems
    "PRGS",    # Progress Software — app development
    "VERI",    # Veritone — AI media solutions
    "BMBL",    # Bumble — dating/social
    "INST",    # Instructure — education tech

    # ── Cybersecurity / Infrastructure ────────────────────────────────────
    "TENB",    # Tenable — vulnerability management
    "VRNS",    # Varonis — data security
    "QLYS",    # Qualys — cloud security
    "TELOS",   # Telos — cyber solutions
    "SASE",    # CATO Networks — SASE security
    "RDWR",    # Radware — application security
    "NSSC",    # NAPCO Security — physical security tech
    "RPD",     # Rapid7 — threat detection

    # ── Healthcare / Biotech ──────────────────────────────────────────────
    "GDRX",    # GoodRx — drug pricing platform
    "HIMS",    # Hims & Hers — telehealth DTC
    "INSP",    # Inspire Medical — sleep apnea devices
    "TMDX",    # TransMedics — organ transplant tech
    "CERT",    # Certara — drug development software
    "SDGR",    # Schrodinger — drug discovery AI
    "RXRX",    # Recursion Pharma — AI drug discovery
    "OLINK",   # Olink — proteomics
    "NVCR",    # NovoCure — tumor treating fields
    "PGNY",    # Progyny — fertility benefits
    "OPRX",    # OptimizeRx — pharma communications
    "GKOS",    # Glaukos — eye care
    "NVST",    # Envista — dental products
    "RVMD",    # Revolution Medicines — oncology
    "PCVX",    # Vaxcyte — vaccines
    "KRYS",    # Krystal Biotech — gene therapy
    "IMVT",    # Immunovant — autoimmune
    "VERA",    # Vera Therapeutics — nephrology
    "ACLX",    # Arcellx — cell therapy
    "BCYC",    # Bicycle Therapeutics — peptide pharma

    # ── Industrials / Defence / Aerospace ─────────────────────────────────
    "KTOS",    # Kratos Defense — drones/unmanned
    "RKLB",    # Rocket Lab — space launch
    "ATKR",    # Atkore — electrical infrastructure
    "ROAD",    # Construction Partners — infrastructure
    "PRIM",    # Primoris — infrastructure services
    "GMS",     # GMS Inc — building products
    "STRL",    # Sterling Infrastructure — construction
    "SPXC",    # SPX Technologies — HVAC/detection
    "ESAB",    # ESAB Corp — welding/cutting
    "APOG",    # Apogee Enterprises — architectural glass
    "WFRD",    # Weatherford — oilfield services
    "XPEL",    # XPEL — protective films/coatings
    "UFPT",    # UFP Technologies — specialty packaging
    "CSWI",    # CSW Industrials — industrial products
    "MATX",    # Matson — shipping/logistics
    "POWL",    # Powell Industries — electrical equipment
    "TDW",     # Tidewater — offshore marine
    "SKYW",    # SkyWest — regional airlines
    "JOBY",    # Joby Aviation — eVTOL
    "ASTS",    # AST SpaceMobile — satellite broadband

    # ── Consumer / Retail ─────────────────────────────────────────────────
    "SHAK",    # Shake Shack — fast casual dining
    "BROS",    # Dutch Bros — coffee chain
    "SG",      # Sweetgreen — healthy fast casual
    "DNUT",    # Krispy Kreme — donut chain
    "XPEL",    # XPEL — automotive films
    "WRBY",    # Warby Parker — DTC eyewear
    "FIGS",    # FIGS — healthcare apparel
    "BIRD",    # Allbirds — sustainable footwear
    "PRPL",    # Purple Innovation — mattress tech
    "COOK",    # Traeger — smart grills
    "DTC",     # Solo Brands — outdoor lifestyle
    "VSTO",    # Vista Outdoor — outdoor sports
    "YETI",    # YETI — premium coolers/drinkware
    "HELE",    # Helen of Troy — consumer brands
    "PLBY",    # PLBY Group — lifestyle brand

    # ── Energy / Clean Tech ───────────────────────────────────────────────
    "GPOR",    # Gulfport Energy — nat gas E&P
    "CNX",     # CNX Resources — nat gas producer
    "AROC",    # Archrock — compression services
    "WTTR",    # Select Water — water solutions
    "AMRC",    # Ameresco — clean energy solutions
    "STEM",    # Stem Inc — energy storage AI
    "ENVX",    # Enovix — silicon batteries
    "BEEM",    # Beam Global — EV charging solar
    "RUN",     # Sunrun — residential solar
    "NOVA",    # Sunnova — residential solar
    "BE",      # Bloom Energy — fuel cells
    "CHPT",    # ChargePoint — EV charging

    # ── Financials / Fintech ──────────────────────────────────────────────
    "UPST",    # Upstart — AI lending
    "LC",      # LendingClub — digital lending
    "STEP",    # StepStone Group — private markets
    "OWL",     # Blue Owl Capital — alternative credit
    "DAVE",    # Dave Inc — neobank/fintech
    "TREE",    # LendingTree — marketplace lending
    "COOP",    # Mr. Cooper — mortgage servicing
    "OPEN",    # Opendoor — iBuying
    "ACVA",    # ACV Auctions — auto marketplace
    "ARIS",    # Aris Water — water management
    "SOFI",    # SoFi Technologies — digital finance
    "AFRM",    # Affirm — BNPL

    # ── AI / Robotics / Frontier ──────────────────────────────────────────
    "BBAI",    # BigBear.ai — AI analytics
    "SOUN",    # SoundHound AI — voice AI
    "IREN",    # IREN — AI/crypto infrastructure
    "SMRT",    # SmartRent — smart home tech
    "PRCT",    # PROCEPT BioRobotics — surgical robots
    "ISPC",    # iSpecimen — biospecimen marketplace
]

# Deduplicate
TENBAGGER_UNIVERSE = list(dict.fromkeys(TENBAGGER_UNIVERSE))


@router.post("/", response_model=ScanResponse)
async def run_10bagger_scan(request: ScanRequest):
    """
    10-Bagger Scanner — Strict $300M–$5B market cap enforcement.
    Same 3-Check methodology as main scan, but:
    1. Different ticker universe (small-cap / early mid-cap)
    2. Hard market cap gate: rejects < $300M and > $5B
    3. Data quality adjusted for smaller companies
    """
    start = time.time()
    scan_id = str(uuid.uuid4())

    if request.tickers:
        tickers = [(t, "UK" if t.endswith(".L") else "US") for t in request.tickers]
    else:
        tickers = [(t, "US") for t in TENBAGGER_UNIVERSE]

    print(f"[10-BAGGERS] Scan start: {len(tickers)} small-cap stocks")
    qualifying: List[QualifyingStock] = []
    scanned = 0
    rejected_mktcap = 0
    sem = asyncio.Semaphore(8)

    async def scan_one(ticker: str, market: str):
        nonlocal scanned, rejected_mktcap
        async with sem:
            try:
                loop = asyncio.get_event_loop()
                data = await loop.run_in_executor(None, data_fetcher.get_stock_data, ticker)
                if data["current_price"] == 0:
                    return None
                scanned += 1

                # ── MARKET CAP GATE (non-negotiable) ─────────────────────
                mktcap = data.get("market_cap", 0) or 0
                if mktcap < MKTCAP_MIN or mktcap > MKTCAP_MAX:
                    rejected_mktcap += 1
                    return None

                # ── 3-Check Pipeline ─────────────────────────────────────
                c1_pass, c1 = scoring_service.check1_fundamentals(data)
                c2_pass, c2 = scoring_service.check2_technicals(data)
                c3_pass, c3 = scoring_service.check3_smart_money(ticker, market)

                if not (c1_pass and c2_pass):
                    return None

                conviction = scoring_service.calculate_conviction(c1, c2, c3)

                # ── Data quality for small-caps ──────────────────────────
                if mktcap > 2e9:
                    dq = "HIGH"
                elif mktcap > 1e9:
                    dq = "MEDIUM"
                else:
                    dq = "LOW"

                print(f"[10-BAGGERS] QUALIFIED: {ticker} ${data['current_price']:.2f} mktcap=${mktcap/1e9:.2f}B conv={conviction}")

                return QualifyingStock(
                    ticker=ticker,
                    company_name=data["company_name"],
                    market=market,
                    price=data["current_price"],
                    market_cap=mktcap,
                    change_pct=data.get("change_pct", 0.0),
                    check1_pass=c1_pass,
                    check2_pass=c2_pass,
                    check3_pass=c3_pass,
                    fundamental_verdict=f"PASS - {c1.get('quality','MED')} Quality",
                    technical_stage=c2.get("stage", "Unknown"),
                    smart_money_trigger=c3.get("primary_signal", {}).get("type", "Institutional"),
                    conviction_score=conviction,
                    data_quality=dq,
                    entry_zone=c2.get("entry_zone", "N/A"),
                    rsi14=float(data.get("rsi14", 50)),
                    ma50=float(data.get("ma50", 0)),
                    ma200=float(data.get("ma200", 0)),
                    golden_cross=bool(c2.get("golden_cross", False)),
                    week52_high=float(data.get("week52_high", 0)),
                    week52_low=float(data.get("week52_low", 0)),
                    range_pct=float(c2.get("range_pct", 0)),
                    revenue_growth=float(data.get("revenue_growth", 0)),
                    net_margin=float(data.get("net_margin", 0)),
                    pe_ratio=float(data.get("pe_ratio", 0)),
                    sector=str(data.get("sector", "")),
                )
            except Exception as e:
                print(f"[10-BAGGERS] Error {ticker}: {e}")
                return None

    tasks = [scan_one(t, m) for t, m in tickers]
    results = await asyncio.gather(*tasks)
    qualifying = [r for r in results if r is not None]
    duration = (time.time() - start) * 1000
    print(f"[10-BAGGERS] Done: {scanned} scanned, {rejected_mktcap} rejected (mktcap), {len(qualifying)} qualified in {duration/1000:.1f}s")

    return ScanResponse(
        scan_id=scan_id,
        scan_date=datetime.now().isoformat(),
        market=request.market or "US",
        stocks_scanned=scanned,
        qualifying_count=len(qualifying),
        qualifying_stocks=sorted(qualifying, key=lambda x: x.conviction_score, reverse=True),
        scan_duration_ms=round(duration, 1),
    )