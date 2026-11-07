"""Tarefas Celery: pipelines de IA executados fora do ciclo da requisição HTTP."""
import json
import logging
from typing import Any

from app.agents.guardrails import GuardrailError, check_input, check_output
from app.db.events import update_event
from app.worker.celery_app import celery_app

log = logging.getLogger(__name__)


def extract_text(payload: Any) -> str:
    """Tenta achar o texto principal do payload do webhook."""
    if isinstance(payload, dict):
        for key in ("message", "text", "body", "content", "prompt", "raw"):
            if isinstance(payload.get(key), str):
                return payload[key]
    return json.dumps(payload, ensure_ascii=False)


@celery_app.task(bind=True, max_retries=3, default_retry_delay=10)
def process_prompt(self, prompt: str) -> dict:
    """Executa o agente respondedor em segundo plano."""
    from app.agents.responder import respond_sync

    try:
        reply = respond_sync(check_input(prompt))
        check_output(reply.answer)
        return reply.model_dump()
    except GuardrailError as e:
        return {"error": str(e)}
    except Exception as exc:  # erros de rede/LLM -> nova tentativa com backoff
        raise self.retry(exc=exc, countdown=10 * 2**self.request.retries)


@celery_app.task(bind=True, max_retries=3, default_retry_delay=10)
def process_event(self, event_id: str, source: str, payload: Any) -> dict:
    """Pipeline: classificar -> responder -> salvar resultado no Supabase."""
    from app.agents.classifier import classify_sync
    from app.agents.responder import respond_sync

    try:
        update_event(event_id, "processing")
        text = check_input(extract_text(payload))
        classification = classify_sync(text)
        context = f"Origem: {source}. Categoria: {classification.category.value}. Urgência: {classification.urgency.value}."
        reply = respond_sync(text, context=context)
        check_output(reply.answer)
        result = {"classification": classification.model_dump(mode="json"), "reply": reply.model_dump()}
        update_event(event_id, "completed", result=result)
        return result
    except GuardrailError as e:
        update_event(event_id, "rejected", error=str(e))
        return {"error": str(e)}
    except Exception as exc:
        if self.request.retries >= self.max_retries:
            log.exception("Evento %s falhou definitivamente", event_id)
            update_event(event_id, "failed", error=str(exc))
            raise
        raise self.retry(exc=exc, countdown=10 * 2**self.request.retries)
