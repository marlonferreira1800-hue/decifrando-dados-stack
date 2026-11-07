"""Agente respondedor: gera a resposta final ao usuário."""
from functools import lru_cache

from pydantic import BaseModel, Field
from pydantic_ai import Agent

from app.agents.base import build_agent


class Reply(BaseModel):
    answer: str = Field(description="Resposta clara e objetiva em português")
    next_steps: list[str] = Field(default_factory=list, description="Próximos passos sugeridos (0 a 3)")


@lru_cache
def get_responder_agent() -> Agent[None, Reply]:
    return build_agent(Reply, "responder")


def _build_prompt(message: str, context: str | None) -> str:
    return f"Contexto: {context}\n\nMensagem: {message}" if context else message


async def respond(message: str, context: str | None = None) -> Reply:
    result = await get_responder_agent().run(_build_prompt(message, context))
    return result.output


def respond_sync(message: str, context: str | None = None) -> Reply:
    return get_responder_agent().run_sync(_build_prompt(message, context)).output
