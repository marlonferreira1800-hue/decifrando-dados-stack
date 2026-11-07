"""Padrão base dos agentes (Pydantic AI).

Cada agente = modelo + system prompt (arquivo .md em prompts/) + saída estruturada
(um modelo Pydantic). A saída é validada automaticamente: se o LLM devolver algo
fora do schema, o Pydantic AI pede a correção ao modelo.
"""
from pathlib import Path
from typing import TypeVar

from pydantic import BaseModel
from pydantic_ai import Agent

from app.core.config import settings

PROMPTS_DIR = Path(__file__).parent / "prompts"
T = TypeVar("T", bound=BaseModel)


def load_prompt(name: str) -> str:
    """Lê app/agents/prompts/<name>.md — versionar prompts como arquivos facilita revisões."""
    return (PROMPTS_DIR / f"{name}.md").read_text(encoding="utf-8").strip()


def build_agent(output_type: type[T], prompt_name: str, model: str | None = None, **kwargs) -> Agent[None, T]:
    """Cria um Agent com saída estruturada. Chame dentro de uma função com @lru_cache
    (criação lazy) para que os testes não exijam chaves de API."""
    return Agent(
        model or settings.llm_model,
        output_type=output_type,
        system_prompt=load_prompt(prompt_name),
        retries=2,
        **kwargs,
    )
