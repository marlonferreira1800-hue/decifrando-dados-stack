"""Rotas de IA: chat síncrono e tarefas em segundo plano (Celery)."""
from typing import Any

from celery.result import AsyncResult
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.agents.guardrails import GuardrailError, check_input, check_output
from app.agents.responder import Reply, respond
from app.worker.celery_app import celery_app
from app.worker.tasks import process_prompt

router = APIRouter()


class ChatRequest(BaseModel):
    message: str = Field(min_length=1)
    context: str | None = None


class TaskRequest(BaseModel):
    prompt: str = Field(min_length=1)


class TaskStatus(BaseModel):
    task_id: str
    status: str
    result: Any = None


@router.post("/chat", response_model=Reply)
async def chat(req: ChatRequest) -> Reply:
    """Resposta imediata (bom para respostas curtas, < ~30s)."""
    try:
        message = check_input(req.message)
        reply = await respond(message, req.context)
        check_output(reply.answer)
    except GuardrailError as e:
        raise HTTPException(status_code=422, detail=str(e))
    return reply


@router.post("/tasks", response_model=TaskStatus, status_code=202)
def enqueue_task(req: TaskRequest) -> TaskStatus:
    """Enfileira o processamento no worker e devolve o id para consulta posterior."""
    try:
        check_input(req.prompt)
    except GuardrailError as e:
        raise HTTPException(status_code=422, detail=str(e))
    task = process_prompt.delay(req.prompt)
    return TaskStatus(task_id=task.id, status="PENDING")


@router.get("/tasks/{task_id}", response_model=TaskStatus)
def get_task(task_id: str) -> TaskStatus:
    res = AsyncResult(task_id, app=celery_app)
    result = res.result if res.successful() else (str(res.result) if res.failed() else None)
    return TaskStatus(task_id=task_id, status=res.status, result=result)
