"""Webhooks genéricos: recebe eventos de qualquer sistema (formulários, CRM,
WhatsApp, n8n...), salva no Supabase e processa em segundo plano.

Responder rápido (202) e processar depois é o padrão dos vídeos: o sistema de
origem não fica esperando o LLM.
"""
import json

from fastapi import APIRouter, Header, HTTPException, Request
from starlette.concurrency import run_in_threadpool

from app.core.config import settings
from app.db.events import create_event
from app.worker.tasks import process_event

router = APIRouter()


@router.post("/{source}", status_code=202)
async def receive_webhook(
    source: str, request: Request, x_api_key: str | None = Header(default=None)
) -> dict:
    if settings.api_key and x_api_key != settings.api_key:
        raise HTTPException(status_code=401, detail="X-API-Key inválida")

    raw = await request.body()
    try:
        payload = json.loads(raw) if raw else {}
    except json.JSONDecodeError:
        payload = {"raw": raw.decode("utf-8", errors="replace")}

    event_id = await run_in_threadpool(create_event, source, payload)
    process_event.delay(event_id, source, payload)
    return {"event_id": event_id, "status": "queued"}
