"""Geração de embeddings via API da OpenAI (HTTP direto com httpx)."""
import httpx

from app.core.config import settings

OPENAI_EMBEDDINGS_URL = "https://api.openai.com/v1/embeddings"
BATCH_SIZE = 100


async def embed_texts(texts: list[str]) -> list[list[float]]:
    if not settings.openai_api_key:
        raise RuntimeError("OPENAI_API_KEY não configurada (necessária para embeddings).")
    headers = {"Authorization": f"Bearer {settings.openai_api_key}"}
    vectors: list[list[float]] = []
    async with httpx.AsyncClient(timeout=60) as client:
        for i in range(0, len(texts), BATCH_SIZE):
            batch = texts[i : i + BATCH_SIZE]
            resp = await client.post(
                OPENAI_EMBEDDINGS_URL,
                headers=headers,
                json={"model": settings.embedding_model, "input": batch},
            )
            resp.raise_for_status()
            data = sorted(resp.json()["data"], key=lambda d: d["index"])
            vectors.extend(d["embedding"] for d in data)
    return vectors


async def embed_query(text: str) -> list[float]:
    return (await embed_texts([text]))[0]
