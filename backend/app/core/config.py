"""Configuração central (lida de variáveis de ambiente / arquivo .env)."""
import os
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=("../.env", ".env"), env_file_encoding="utf-8", extra="ignore")

    project_name: str = "Decifrando Dados"
    environment: str = "development"
    cors_origins: list[str] = ["http://localhost:5173", "http://localhost:8080"]

    # Supabase
    supabase_url: str = ""
    supabase_service_key: str = ""

    # Fila de tarefas
    redis_url: str = "redis://localhost:6379/0"

    # LLMs (Mistral AI lido exclusivamente do arquivo local .env)
    mistral_api_key: str = ""
    mistral_model: str = "mistral-large-latest"
    mistral_base_url: str = "https://api.mistral.ai/v1"

    llm_model: str = "mistral:mistral-large-latest"
    embedding_model: str = "mistral-embed"
    openai_api_key: str = ""
    anthropic_api_key: str = ""

    # Chave opcional para proteger webhooks (header X-API-Key)
    api_key: str = ""

    @property
    def supabase_configured(self) -> bool:
        return bool(self.supabase_url and self.supabase_service_key)

    @property
    def mistral_configured(self) -> bool:
        return bool(self.mistral_api_key)


@lru_cache
def get_settings() -> Settings:
    s = Settings()
    if s.mistral_api_key:
        os.environ.setdefault("MISTRAL_API_KEY", s.mistral_api_key)
    if s.openai_api_key:
        os.environ.setdefault("OPENAI_API_KEY", s.openai_api_key)
    if s.anthropic_api_key:
        os.environ.setdefault("ANTHROPIC_API_KEY", s.anthropic_api_key)
    return s


settings = get_settings()
