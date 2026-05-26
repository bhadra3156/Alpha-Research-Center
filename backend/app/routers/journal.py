# FILE: backend/app/routers/journal.py
# ─────────────────────────────────────────────────────────────────────────────
# FIXED: Was using in-memory list (ENTRIES = []) — data wiped on every restart.
# NOW:   Writes to Supabase via supabase-py. Survives restarts, scaling, deploys.
# ─────────────────────────────────────────────────────────────────────────────

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from supabase import create_client, Client
from app.core.config import settings          # has SUPABASE_URL + SUPABASE_SERVICE_KEY

router = APIRouter(prefix="/journal", tags=["journal"])

# ── Supabase client (uses service key — bypasses RLS) ─────────────────────────
def get_supabase() -> Client:
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)


# ── Schemas ───────────────────────────────────────────────────────────────────
class JournalEntryCreate(BaseModel):
    ticker:             str
    entry_type:         str = "OBSERVATION"
    title:              Optional[str] = None
    content:            str
    conviction_at_time: Optional[int] = Field(None, ge=1, le=10)
    price_at_time:      Optional[float] = None
    tags:               Optional[List[str]] = []
    market:             Optional[str] = "US"
    # Extended fields
    emotional_state:    Optional[str] = "NEUTRAL"
    setup_quality:      Optional[int] = Field(None, ge=1, le=10)
    risk_reward:        Optional[float] = None
    outcome_pct:        Optional[float] = None
    mistake_tag:        Optional[str] = "NONE"
    checklist_passed:   Optional[bool] = True


class JournalEntryOut(JournalEntryCreate):
    id:           str
    journal_date: datetime
    created_at:   datetime


# ── Encode extended fields into tags (no schema migration needed) ─────────────
def encode_tags(entry: JournalEntryCreate) -> List[str]:
    """
    Store extended fields as __key:value prefixed tags so they live
    in the existing TEXT[] column without requiring a DB migration.
    The frontend decodes them back on load.
    """
    user_tags = [t.strip() for t in (entry.tags or []) if t.strip() and not t.startswith("__")]
    meta = [
        f"__emo:{entry.emotional_state}",
        f"__cl:{'1' if entry.checklist_passed else '0'}",
        f"__mkt:{entry.market}",
    ]
    if entry.setup_quality:
        meta.append(f"__sq:{entry.setup_quality}")
    if entry.risk_reward:
        meta.append(f"__rr:{entry.risk_reward}")
    if entry.outcome_pct is not None:
        meta.append(f"__op:{entry.outcome_pct}")
    if entry.mistake_tag and entry.mistake_tag != "NONE":
        meta.append(f"__mk:{entry.mistake_tag}")
    return user_tags + meta


# ── GET /journal/ ─────────────────────────────────────────────────────────────
@router.get("/", response_model=List[dict])
async def get_journal(ticker: Optional[str] = None, limit: int = 200):
    """
    Fetch journal entries, newest first.
    Optional ?ticker=NVDA filter.
    """
    sb = get_supabase()
    q  = sb.table("trade_journal").select("*").order("journal_date", desc=True).limit(limit)
    if ticker:
        q = q.eq("ticker", ticker.upper())

    resp = q.execute()
    if resp.data is None:
        raise HTTPException(status_code=500, detail="Supabase query failed")
    return resp.data


# ── POST /journal/ ────────────────────────────────────────────────────────────
@router.post("/", response_model=dict, status_code=201)
async def add_entry(entry: JournalEntryCreate):
    """
    Persist a new journal entry to Supabase.
    Extended fields are encoded as prefixed tags for schema compatibility.
    """
    sb = get_supabase()

    payload = {
        "ticker":             entry.ticker.upper().strip(),
        "entry_type":         entry.entry_type,
        "title":              entry.title or f"{entry.ticker.upper()} — {entry.entry_type}",
        "content":            entry.content.strip(),
        "conviction_at_time": entry.conviction_at_time,
        "price_at_time":      entry.price_at_time,
        "tags":               encode_tags(entry),
        "journal_date":       datetime.utcnow().isoformat(),
    }

    resp = sb.table("trade_journal").insert(payload).execute()
    if not resp.data:
        raise HTTPException(status_code=500, detail=f"Insert failed: {resp}")

    return {"status": "ok", "id": resp.data[0]["id"]}


# ── DELETE /journal/{id} ──────────────────────────────────────────────────────
@router.delete("/{entry_id}", status_code=204)
async def delete_entry(entry_id: str):
    sb = get_supabase()
    sb.table("trade_journal").delete().eq("id", entry_id).execute()
    return None


# ── GET /journal/stats ────────────────────────────────────────────────────────
@router.get("/stats", response_model=dict)
async def get_stats():
    """
    Returns aggregate stats across the full journal:
    total entries, win rate, avg conviction, rule break count.
    """
    sb = get_supabase()
    resp = sb.table("trade_journal").select("entry_type, conviction_at_time, tags").execute()
    entries = resp.data or []

    total     = len(entries)
    exits     = [e for e in entries if e["entry_type"] == "EXIT"]
    wins      = 0
    rule_breaks = 0

    for e in exits:
        for t in (e.get("tags") or []):
            if t.startswith("__op:"):
                try:
                    if float(t[5:]) > 0:
                        wins += 1
                except ValueError:
                    pass
    for e in entries:
        for t in (e.get("tags") or []):
            if t == "__mk:RULE_BREAK":
                rule_breaks += 1

    convictions = [e["conviction_at_time"] for e in entries if e.get("conviction_at_time")]
    avg_conv    = round(sum(convictions) / len(convictions), 1) if convictions else None
    win_rate    = round(wins / len(exits) * 100, 1) if exits else None

    return {
        "total":        total,
        "exits":        len(exits),
        "win_rate_pct": win_rate,
        "avg_conviction": avg_conv,
        "rule_breaks":  rule_breaks,
    }