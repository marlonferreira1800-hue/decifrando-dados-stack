"""Rotas de RAG: ingestão de documentos e perguntas com citações."""
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.agents.guardrails import GuardrailError, check_input
from app.db.supabase import SupabaseNotConfigured
from app.rag.answer import AskResult, answer_question
from app.rag.ingestion import ingest_text

router = APIRouter()


class IngestRequest(BaseModel):
    content: str = Field(min_length=1)
    metadata: dict[str, Any] = Field(default_factory=dict, examples=[{"source": "manual.pdf"}])
    chunk_size: int = Field(default=1000, ge=100, le=8000)
    overlap: int = Field(default=200, ge=0, le=2000)


class AskRequest(BaseModel):
    question: str = Field(min_length=1)
    match_count: int = Field(default=5, ge=1, le=30)


@router.post("/ingest")
async def ingest(req: IngestRequest) -> dict:
    try:
        n = await ingest_text(req.content, req.metadata, req.chunk_size, min(req.overlap, req.chunk_size - 1))
    except (SupabaseNotConfigured, RuntimeError) as e:
        raise HTTPException(status_code=503, detail=str(e))
    return {"chunks": n}


@router.post("/ask", response_model=AskResult)
async def ask(req: AskRequest) -> AskResult:
    try:
        question = check_input(req.question)
        return await answer_question(question, req.match_count)
    except GuardrailError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except (SupabaseNotConfigured, RuntimeError) as e:
        raise HTTPException(status_code=503, detail=str(e))
