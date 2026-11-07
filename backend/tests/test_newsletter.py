"""Testes das rotas da plataforma Decifrando Dados."""
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_listar_edicoes_importadas():
    r = client.get("/api/newsletter/editions")
    assert r.status_code == 200
    dados = r.json()
    assert len(dados) >= 5
    numeros = {e["edicao"] for e in dados}
    assert {"01", "02", "30", "31", "32"}.issubset(numeros)


def test_rag_copiloto_newsletter():
    r = client.post("/api/newsletter/ask", json={"question": "O que a edição fala sobre DuckDB e Iceberg?", "top_k": 2})
    assert r.status_code == 200
    body = r.json()
    assert "answer" in body
    assert len(body["citations"]) >= 1


def test_gerar_rascunho_ia_e_publicar():
    headers = {"X-Admin-Token": "decifrando2026"}
    r = client.post(
        "/api/newsletter/ai-draft",
        json={"tema": "Agentes Financeiros com Pydantic AI", "edicao": "33", "termo_tecnico": "Guardrails"},
        headers=headers,
    )
    assert r.status_code == 200
    draft = r.json()
    assert "BLOCO 1" in draft["conteudo_markdown"]
    assert "Para o Setor Bancário e Financeiro" in draft["conteudo_markdown"]

    pub = client.post(
        "/api/newsletter/editions",
        json={
            "edicao": "33",
            **draft,
            "data": "07/11/2026",
            "status": "draft",
        },
        headers=headers,
    )
    assert pub.status_code == 200
    assert pub.json()["edicao"] == "33"
    client.delete("/api/newsletter/editions/33", headers=headers)
