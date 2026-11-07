"""Consulta dos eventos mais recentes (usado pelo painel)."""
from fastapi import APIRouter, Query

from app.db.events import list_events

router = APIRouter()


@router.get("")
def recent_events(limit: int = Query(default=20, ge=1, le=100)) -> list[dict]:
    return list_events(limit)
