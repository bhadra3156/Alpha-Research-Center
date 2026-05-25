from fastapi import APIRouter
from app.models.schemas import JournalEntry

router = APIRouter()
ENTRIES = []

@router.get("/")
async def get_journal(): return ENTRIES

@router.post("/")
async def add_entry(entry: JournalEntry):
    ENTRIES.append(entry.dict())
    return {"status": "added"}