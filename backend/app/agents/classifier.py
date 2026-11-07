"""Agente classificador: decide categoria e urgência de uma mensagem."""
from enum import Enum
from functools import lru_cache

from pydantic import BaseModel, Field
from pydantic_ai import Agent

from app.agents.base import build_agent


class Category(str, Enum):
    suporte = "suporte"
    vendas = "vendas"
    financeiro = "financeiro"
    outro = "outro"


class Urgency(str, Enum):
    baixa = "baixa"
    media = "media"
    alta = "alta"


class Classification(BaseModel):
    category: Category = Field(description="Categoria principal da mensagem")
    urgency: Urgency = Field(description="Nível de urgência")
    confidence: float = Field(ge=0, le=1, description="Confiança entre 0 e 1")
    reasoning: str = Field(description="Justificativa curta (1 frase)")


@lru_cache
def get_classifier_agent() -> Agent[None, Classification]:
    return build_agent(Classification, "classifier")


async def classify(text: str) -> Classification:
    result = await get_classifier_agent().run(text)
    return result.output


def classify_sync(text: str) -> Classification:
    """Versão síncrona para workers Celery e scripts (evals)."""
    return get_classifier_agent().run_sync(text).output
