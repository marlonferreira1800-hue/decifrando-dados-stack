"""Aplicação Celery (fila de tarefas em segundo plano com Redis).

Worker:  celery -A app.worker.celery_app worker --loglevel=info
         (no Windows adicione --pool=solo)
Beat:    celery -A app.worker.celery_app beat --loglevel=info
"""
from celery import Celery

from app.core.config import settings

celery_app = Celery(
    "decifrando-dados",
    broker=settings.redis_url,
    backend=settings.redis_url,
    include=["app.worker.tasks"],
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="America/Sao_Paulo",
    enable_utc=True,
    task_track_started=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    result_expires=60 * 60 * 24,
    broker_connection_retry_on_startup=True,
)

# Tarefas agendadas (executadas pelo serviço "beat"). Exemplo:
# from celery.schedules import crontab
# celery_app.conf.beat_schedule = {
#     "resumo-diario": {
#         "task": "app.worker.tasks.process_prompt",
#         "schedule": crontab(hour=8, minute=0),  # todo dia às 08:00
#         "args": ("Gere um resumo dos eventos de ontem",),
#     },
# }
celery_app.conf.beat_schedule = {}
