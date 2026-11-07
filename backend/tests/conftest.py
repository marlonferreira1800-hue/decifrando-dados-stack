import pytest
from fastapi.testclient import TestClient

from app.core.config import settings
from app.main import app


@pytest.fixture(autouse=True)
def sem_servicos_externos(monkeypatch):
    """Garante que os testes nunca usem Supabase/API keys reais."""
    monkeypatch.setattr(settings, "supabase_url", "")
    monkeypatch.setattr(settings, "supabase_service_key", "")
    monkeypatch.setattr(settings, "api_key", "")


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)
