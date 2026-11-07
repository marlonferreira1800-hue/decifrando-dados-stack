"""Repositório da tabela `events` (webhooks e tarefas).

Se o Supabase não estiver configurado, as funções apenas registram um aviso —
assim o projeto roda em modo de desenvolvimento sem banco.
"""
import logging
import uuid
from typing import Any

from app.core.config import settings
from app.db.supabase import get_supabase

log = logging.getLogger(__name__)
TABLE = "events"


def create_event(source: str, payload: Any) -> str:
    event_id = str(uuid.uuid4())
    if not settings.supabase_configured:
        log.warning("Supabase não configurado — evento %s não foi salvo.", event_id)
        return event_id
    get_supabase().table(TABLE).insert(
        {"id": event_id, "source": source, "payload": payload, "status": "queued"}
    ).execute()
    return event_id


def update_event(event_id: str, status: str, result: Any = None, error: str | None = None) -> None:
    if not settings.supabase_configured:
        log.warning("Supabase não configurado — status '%s' do evento %s não salvo.", status, event_id)
        return
    data: dict[str, Any] = {"status": status}  # updated_at é atualizado por trigger no banco
    if result is not None:
        data["result"] = result
    if error is not None:
        data["error"] = error
    get_supabase().table(TABLE).update(data).eq("id", event_id).execute()


def list_events(limit: int = 20) -> list[dict]:
    if not settings.supabase_configured:
        return []
    res = get_supabase().table(TABLE).select("*").order("created_at", desc=True).limit(limit).execute()
    return res.data or []
