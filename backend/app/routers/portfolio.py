from fastapi import APIRouter
from app.models.schemas import PortfolioPosition

router = APIRouter()
POSITIONS = []

@router.get("/")
async def get_portfolio(): return POSITIONS

@router.post("/")
async def add_position(pos: PortfolioPosition):
    POSITIONS.append(pos.dict())
    return {"status": "added", "ticker": pos.ticker}