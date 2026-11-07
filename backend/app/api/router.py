"""Agrupa todas as rotas sob /api."""
from fastapi import APIRouter

from app.api.routes import ai, events, newsletter, rag, webhooks

api_router = APIRouter()
api_router.include_router(newsletter.router, prefix="/newsletter", tags=["newsletter"])
api_router.include_router(ai.router, prefix="/ai", tags=["ai"])
api_router.include_router(rag.router, prefix="/rag", tags=["rag"])
api_router.include_router(webhooks.router, prefix="/webhooks", tags=["webhooks"])
api_router.include_router(events.router, prefix="/events", tags=["events"])
