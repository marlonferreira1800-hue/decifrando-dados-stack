"""Decifrando Dados — API FastAPI."""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.core.config import settings

app = FastAPI(title=settings.project_name, version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", tags=["infra"])
def health() -> dict:
    """Usado pelo healthcheck do Railway/Docker e pelo badge do painel."""
    return {"status": "ok", "project": settings.project_name, "environment": settings.environment}


app.include_router(api_router, prefix="/api")
