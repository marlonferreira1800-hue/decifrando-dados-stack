"""Guardrails simples de entrada e saída.

São verificações determinísticas e baratas, executadas ANTES e DEPOIS do LLM.
Para casos mais sérios, adicione um agente "moderador" dedicado.
"""
import re

MAX_INPUT_CHARS = 8000

# Padrões comuns de prompt injection (pt-BR e inglês)
INJECTION_PATTERNS = [
    r"ignore (all |the )?(previous|above) instructions",
    r"ignore (todas )?as instru[cç][oõ]es (anteriores|acima)",
    r"esque[cç]a (todas )?as (suas )?instru[cç][oõ]es",
    r"(reveal|show|print) (your |the )?system prompt",
    r"(mostre|revele|imprima) (o |seu )?(prompt do sistema|system prompt)",
    r"you are now (in )?developer mode",
    r"voc[eê] agora [eé] (um|o) ",
    r"jailbreak",
]
_INJECTION_RE = re.compile("|".join(INJECTION_PATTERNS), re.IGNORECASE)

# Coisas que nunca devem aparecer na saída
OUTPUT_BLOCKLIST = [r"sk-[A-Za-z0-9_-]{20,}", r"SUPABASE_SERVICE_KEY", r"BEGIN (RSA )?PRIVATE KEY"]
_OUTPUT_RE = re.compile("|".join(OUTPUT_BLOCKLIST), re.IGNORECASE)


class GuardrailError(ValueError):
    """Entrada ou saída bloqueada por um guardrail."""


def check_input(text: str) -> str:
    text = (text or "").strip()
    if not text:
        raise GuardrailError("Mensagem vazia.")
    if len(text) > MAX_INPUT_CHARS:
        raise GuardrailError(f"Mensagem muito longa (máx. {MAX_INPUT_CHARS} caracteres).")
    if _INJECTION_RE.search(text):
        raise GuardrailError("Mensagem bloqueada: possível tentativa de prompt injection.")
    return text


def check_output(text: str) -> str:
    if not (text or "").strip():
        raise GuardrailError("O modelo retornou uma resposta vazia.")
    if _OUTPUT_RE.search(text):
        raise GuardrailError("Resposta bloqueada: continha dados sensíveis.")
    return text
