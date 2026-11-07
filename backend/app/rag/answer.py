"""Resposta com citações: busca -> monta fontes numeradas -> agente responde."""
from functools import lru_cache

from pydantic import BaseModel, Field
from pydantic_ai import Agent

from app.agents.base import build_agent
from app.rag.search import hybrid_search


class RagAnswer(BaseModel):
    answer: str = Field(description="Resposta com citações no formato [n]")
    citations: list[int] = Field(default_factory=list, description="Números das fontes usadas")


class Citation(BaseModel):
    number: int
    document_id: int | None = None
    snippet: str
    metadata: dict = {}


class AskResult(BaseModel):
    answer: str
    citations: list[Citation]


@lru_cache
def get_rag_agent() -> Agent[None, RagAnswer]:
    return build_agent(RagAnswer, "rag_answer")


def build_context(docs: list[dict]) -> str:
    return "\n\n".join(f"[{i}] {d['content']}" for i, d in enumerate(docs, start=1))


async def answer_question(question: str, match_count: int = 5) -> AskResult:
    docs = await hybrid_search(question, match_count=match_count)
    if not docs:
        return AskResult(answer="Não encontrei documentos relevantes na base.", citations=[])
    prompt = f"Fontes:\n{build_context(docs)}\n\nPergunta: {question}"
    out = (await get_rag_agent().run(prompt)).output
    citations = [
        Citation(
            number=n,
            document_id=docs[n - 1].get("id"),
            snippet=docs[n - 1]["content"][:300],
            metadata=docs[n - 1].get("metadata") or {},
        )
        for n in sorted(set(out.citations))
        if 1 <= n <= len(docs)
    ]
    return AskResult(answer=out.answer, citations=citations)
