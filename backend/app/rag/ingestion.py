"""Ingestão: texto -> chunks -> embeddings -> tabela `documents` no Supabase."""
from typing import Any

from starlette.concurrency import run_in_threadpool

from app.db.supabase import get_supabase
from app.rag.chunking import chunk_text
from app.rag.embeddings import embed_texts


def _insert_rows(rows: list[dict]) -> list[dict]:
    return get_supabase().table("documents").insert(rows).execute().data or []


async def ingest_text(
    content: str, metadata: dict[str, Any] | None = None, chunk_size: int = 1000, overlap: int = 200
) -> int:
    chunks = chunk_text(content, chunk_size=chunk_size, overlap=overlap)
    if not chunks:
        return 0
    vectors = await embed_texts(chunks)
    meta = metadata or {}
    rows = [
        {"content": c, "metadata": {**meta, "chunk_index": i, "total_chunks": len(chunks)}, "embedding": v}
        for i, (c, v) in enumerate(zip(chunks, vectors))
    ]
    await run_in_threadpool(_insert_rows, rows)
    return len(rows)
