"""Busca híbrida (full-text + vetorial, combinadas por RRF) via RPC `hybrid_search`."""
from starlette.concurrency import run_in_threadpool

from app.db.supabase import get_supabase
from app.rag.embeddings import embed_query


def _rpc(query: str, embedding: list[float], match_count: int) -> list[dict]:
    res = get_supabase().rpc(
        "hybrid_search",
        {"query_text": query, "query_embedding": embedding, "match_count": match_count},
    ).execute()
    return res.data or []


async def hybrid_search(query: str, match_count: int = 5) -> list[dict]:
    embedding = await embed_query(query)
    return await run_in_threadpool(_rpc, query, embedding, match_count)
