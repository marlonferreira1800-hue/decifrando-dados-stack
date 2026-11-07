"""Rotas da plataforma de Newsletter Decifrando Dados (Área Pública + Estúdio Administrativo)."""
from __future__ import annotations

import os
import re
from typing import Any

from fastapi import APIRouter, File, Header, HTTPException, Query, UploadFile
from pydantic import BaseModel, Field

from app.agents.newsletter_agent import gerar_rascunho_ia, perguntar_acervo_rag
from app.db.newsletter import (
    adicionar_inscrito,
    importar_arquivo_upload,
    listar_edicoes,
    listar_inscritos,
    obter_edicao,
    remover_edicao,
    salvar_edicao,
    sincronizar_pasta_edicoes,
)

router = APIRouter()


def _senha_admin() -> str:
    return os.environ.get("ADMIN_PASSWORD", "decifrando2026")


def _verificar_admin(x_admin_token: str | None) -> None:
    esperado = _senha_admin()
    if x_admin_token != esperado:
        raise HTTPException(status_code=401, detail="Acesso administrativo não autorizado. Faça login no painel.")


class AdminLoginRequest(BaseModel):
    password: str


class EditionPayload(BaseModel):
    edicao: str = Field(..., description="Número da edição (ex.: '33')")
    titulo: str
    subtitulo: str = ""
    categoria: str = "IA & Agentes"
    data: str = ""
    tempo_leitura: str = "4"
    status: str = "published"
    seo_titulo: str = ""
    seo_descricao: str = ""
    post_divulgacao: str = ""
    conteudo_markdown: str


class AIDraftRequest(BaseModel):
    tema: str = Field(..., min_length=3)
    edicao: str = "33"
    termo_tecnico: str = ""


class SubscribeRequest(BaseModel):
    email: str = Field(..., min_length=5)
    nome: str = ""
    area: str = "TI & Dados"


class AskNewsletterRequest(BaseModel):
    question: str = Field(..., min_length=3)
    top_k: int = 3


@router.post("/auth")
def autenticar_admin(body: AdminLoginRequest) -> dict[str, Any]:
    if body.password.strip() == _senha_admin():
        return {"authenticated": True, "token": _senha_admin(), "curador": "Marlon Ferreira"}
    raise HTTPException(status_code=401, detail="Senha incorreta.")


@router.get("/stats")
def obter_estatisticas() -> dict[str, Any]:
    todas = listar_edicoes(include_drafts=True)
    publicadas = [e for e in todas if e.get("status", "published") == "published"]
    rascunhos = [e for e in todas if e.get("status") != "published"]
    inscritos = listar_inscritos()
    prox_num = max([int(re.sub(r"\D", "", str(e.get("edicao", "0"))) or 0) for e in todas] or [0]) + 1
    categorias: dict[str, int] = {}
    for e in publicadas:
        c = e.get("categoria", "IA & Agentes")
        categorias[c] = categorias.get(c, 0) + 1
    return {
        "total_edicoes": len(todas),
        "publicadas": len(publicadas),
        "rascunhos": len(rascunhos),
        "inscritos": len(inscritos),
        "proxima_edicao": str(prox_num).zfill(2),
        "categorias": categorias,
    }


@router.get("/editions")
def rota_listar_edicoes(
    include_drafts: bool = Query(default=False),
    categoria: str | None = Query(default=None),
    q: str | None = Query(default=None),
) -> list[dict[str, Any]]:
    return listar_edicoes(include_drafts=include_drafts, categoria=categoria, busca=q)


@router.get("/editions/{identificador}")
def rota_obter_edicao(identificador: str) -> dict[str, Any]:
    ed = obter_edicao(identificador)
    if not ed:
        raise HTTPException(status_code=404, detail=f"Edição '{identificador}' não encontrada.")
    return ed


@router.post("/editions")
def rota_salvar_edicao(
    body: EditionPayload,
    x_admin_token: str | None = Header(default=None),
) -> dict[str, Any]:
    _verificar_admin(x_admin_token)
    return salvar_edicao(body.model_dump())


@router.delete("/editions/{edicao}")
def rota_remover_edicao(
    edicao: str,
    x_admin_token: str | None = Header(default=None),
) -> dict[str, Any]:
    _verificar_admin(x_admin_token)
    ok = remover_edicao(edicao)
    if not ok:
        raise HTTPException(status_code=404, detail="Edição não encontrada.")
    return {"deleted": edicao}


@router.post("/sync")
def rota_sincronizar_pasta(
    x_admin_token: str | None = Header(default=None),
) -> dict[str, Any]:
    _verificar_admin(x_admin_token)
    qtd = sincronizar_pasta_edicoes()
    return {"imported": qtd, "total": len(listar_edicoes(include_drafts=True))}


@router.post("/import")
async def rota_importar_arquivo(
    file: UploadFile = File(...),
    x_admin_token: str | None = Header(default=None),
) -> dict[str, Any]:
    _verificar_admin(x_admin_token)
    raw = await file.read()
    importados = importar_arquivo_upload(file.filename or "edicao.md", raw)
    return {
        "imported_count": len(importados),
        "editions": [e.get("edicao") for e in importados],
    }


@router.post("/ai-draft")
async def rota_gerar_rascunho_ia(
    body: AIDraftRequest,
    x_admin_token: str | None = Header(default=None),
) -> dict[str, Any]:
    _verificar_admin(x_admin_token)
    draft = await gerar_rascunho_ia(
        tema=body.tema,
        edicao_num=str(body.edicao).zfill(2),
        termo_tecnico=body.termo_tecnico,
    )
    return draft.model_dump()


@router.post("/ai-build")
async def rota_construir_e_publicar_ia(
    body: AIDraftRequest,
    x_admin_token: str | None = Header(default=None),
) -> dict[str, Any]:
    """Gera a edição completa via Mistral AI, salva o Markdown e já publica no portal."""
    _verificar_admin(x_admin_token)
    ed_num = str(body.edicao).zfill(2)
    draft = await gerar_rascunho_ia(
        tema=body.tema,
        edicao_num=ed_num,
        termo_tecnico=body.termo_tecnico,
    )
    salvo = salvar_edicao({
        "edicao": ed_num,
        "status": "published",
        **draft.model_dump(),
    })
    return {"edition": salvo, "motor_ia": draft.motor_ia}


@router.post("/ask")
def rota_perguntar_rag(body: AskNewsletterRequest) -> dict[str, Any]:
    return perguntar_acervo_rag(body.question, top_k=body.top_k)


@router.post("/subscribe")
def rota_inscrever(body: SubscribeRequest) -> dict[str, Any]:
    if "@" not in body.email:
        raise HTTPException(status_code=400, detail="Informe um e-mail válido.")
    inscrito = adicionar_inscrito(email=body.email, nome=body.nome, area=body.area)
    return {"ok": True, "subscriber": inscrito}


@router.get("/subscribers")
def rota_listar_inscritos(
    x_admin_token: str | None = Header(default=None),
) -> list[dict[str, Any]]:
    _verificar_admin(x_admin_token)
    return listar_inscritos()
