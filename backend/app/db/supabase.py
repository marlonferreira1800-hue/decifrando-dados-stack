"""Cliente Supabase criado sob demanda (lazy) e reaproveitado."""
from functools import lru_cache

from supabase import Client, create_client

from app.core.config import settings


class SupabaseNotConfigured(RuntimeError):
    pass


@lru_cache
def get_supabase() -> Client:
    if not settings.supabase_configured:
        raise SupabaseNotConfigured(
            "Supabase não configurado: defina SUPABASE_URL e SUPABASE_SERVICE_KEY no .env"
        )
    return create_client(settings.supabase_url, settings.supabase_service_key)
