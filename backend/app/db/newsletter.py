"""Camada de persistência da Newsletter Decifrando Dados.

Funciona 100% localmente (JSON + arquivos Markdown em edicoes/) e sincroniza
com o Supabase automaticamente quando SUPABASE_URL e SUPABASE_SERVICE_KEY estão configurados.
"""
from __future__ import annotations

import html
import io
import json
import re
import unicodedata
import uuid
import zipfile
from datetime import datetime
from pathlib import Path
from typing import Any

from app.core.config import settings
from app.db.supabase import get_supabase

BACKEND_DIR = Path(__file__).resolve().parents[2]
PROJECT_ROOT = BACKEND_DIR.parent
DATA_DIR = BACKEND_DIR / "data"
DB_FILE = DATA_DIR / "newsletter_db.json"
PROJECT_EDICOES_DIR = PROJECT_ROOT / "edicoes"
LEGACY_EDICOES_DIRS = [
    Path(r"C:\Users\marlo\decifrando-dados\edicoes"),
    Path(r"C:\Users\marlo\OneDrive\Desktop\Pasta Projetos\01_Newsletter_Decifrando_Dados\edicoes"),
]


def slugify(texto: str) -> str:
    norm = unicodedata.normalize("NFKD", texto).encode("ascii", "ignore").decode("ascii")
    return re.sub(r"[^a-z0-9]+", "-", norm.lower()).strip("-") or "edicao"


def inferir_categoria(titulo: str, conteudo: str) -> str:
    cabecalho = titulo.lower()
    if any(k in cabecalho for k in ("duckdb", "iceberg", "spark", "lakehouse", "pipeline", "parquet", "etl")):
        return "Engenharia de Dados"
    if any(k in cabecalho for k in ("banco", "fraude", "credito", "crédito", "bacen", "financeir", "pix")):
        return "Bancos & Finanças"
    if any(k in cabecalho for k in ("meta", "llama", "muse", "openai", "anthropic", "agente", "llm", "rag", "gpt", "claude", "ia")):
        return "IA & Agentes"
    return "Carreira & Estratégia"


def parse_frontmatter_md(raw_md: str, fallback_edicao: str = "01") -> dict[str, Any]:
    """Lê o YAML frontmatter padrão da Decifrando Dados sem depender de PyYAML externo."""
    meta: dict[str, str] = {}
    corpo = raw_md.strip()

    if corpo.startswith("---"):
        partes = corpo.split("---", 2)
        if len(partes) >= 3:
            yaml_block = partes[1]
            corpo = partes[2].strip()
            chave_multilinha: str | None = None
            buffer_multilinha: list[str] = []

            for linha in yaml_block.splitlines():
                if chave_multilinha:
                    if linha.startswith("  ") or not linha.strip():
                        buffer_multilinha.append(linha[2:] if linha.startswith("  ") else "")
                        continue
                    else:
                        meta[chave_multilinha] = "\n".join(buffer_multilinha).strip()
                        chave_multilinha = None
                        buffer_multilinha = []

                m = re.match(r"^([a-zA-Z0-9_]+)\s*:\s*(.*)$", linha)
                if m:
                    k, v = m.group(1).strip(), m.group(2).strip()
                    if v == "|":
                        chave_multilinha = k
                        buffer_multilinha = []
                    else:
                        meta[k] = v.strip('"').strip("'")

            if chave_multilinha:
                meta[chave_multilinha] = "\n".join(buffer_multilinha).strip()

    # Extrair título e subtítulo do corpo caso não estejam no frontmatter
    linhas_corpo = corpo.splitlines()
    titulo = meta.get("titulo", "")
    subtitulo = meta.get("subtitulo", "")
    for l in linhas_corpo[:8]:
        if l.startswith("# ") and not titulo:
            titulo = l[2:].strip()
        elif l.startswith("## ") and not subtitulo:
            subtitulo = l[3:].strip()

    edicao = str(meta.get("edicao") or fallback_edicao).zfill(2)
    titulo = titulo or f"Edição #{edicao} — Decifrando Dados"
    categoria = meta.get("categoria") or inferir_categoria(titulo, corpo)
    data = meta.get("data") or datetime.now().strftime("%d/%m/%Y")
    tempo = str(meta.get("tempo_leitura") or "4")

    return {
        "id": str(uuid.uuid5(uuid.NAMESPACE_DNS, f"decifrando-dados-edicao-{edicao}")),
        "edicao": edicao,
        "slug": f"edicao-{edicao}-{slugify(titulo)[:60]}",
        "titulo": titulo,
        "subtitulo": subtitulo,
        "categoria": categoria,
        "data": data,
        "tempo_leitura": tempo,
        "status": meta.get("status", "published"),
        "seo_titulo": meta.get("seo_titulo") or f"{titulo} | Decifrando Dados #{edicao}",
        "seo_descricao": meta.get("seo_descricao") or subtitulo or titulo,
        "post_divulgacao": meta.get("post_divulgacao") or (
            f"Nova edição #{edicao} da Decifrando Dados no ar: {titulo}.\n\n"
            f"{subtitulo}\n\n"
            "#InteligenciaArtificial #CienciaDeDados #MachineLearning #Tecnologia #SetorBancario #Inovacao"
        ),
        "conteudo_markdown": corpo,
        "updated_at": datetime.now().isoformat(),
    }


def serializar_markdown(ed: dict[str, Any]) -> str:
    """Gera o arquivo .md com frontmatter YAML compatível com o compilador oficial."""
    post_lines = "\n".join(f"  {l}" for l in (ed.get("post_divulgacao") or "").splitlines())
    return (
        "---\n"
        f'titulo: "{ed.get("titulo", "").replace(chr(34), chr(39))}"\n'
        f'subtitulo: "{ed.get("subtitulo", "").replace(chr(34), chr(39))}"\n'
        f'categoria: "{ed.get("categoria", "IA & Dados")}"\n'
        f'edicao: "{ed.get("edicao", "01")}"\n'
        f'data: "{ed.get("data", "")}"\n'
        f'tempo_leitura: "{ed.get("tempo_leitura", "4")}"\n'
        f'status: "{ed.get("status", "published")}"\n'
        f'seo_titulo: "{ed.get("seo_titulo", "").replace(chr(34), chr(39))}"\n'
        f'seo_descricao: "{ed.get("seo_descricao", "").replace(chr(34), chr(39))}"\n'
        "post_divulgacao: |\n"
        f"{post_lines}\n"
        "---\n\n"
        f"{ed.get('conteudo_markdown', '').strip()}\n"
    )


def _carregar_db() -> dict[str, Any]:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    PROJECT_EDICOES_DIR.mkdir(parents=True, exist_ok=True)
    if DB_FILE.exists():
        try:
            return json.loads(DB_FILE.read_text(encoding="utf-8"))
        except Exception:
            pass
    db = {"editions": [], "subscribers": _subscribers_iniciais()}
    _salvar_db(db)
    sincronizar_pasta_edicoes()
    return json.loads(DB_FILE.read_text(encoding="utf-8"))


def _subscribers_iniciais() -> list[dict[str, Any]]:
    return [
        {
            "id": str(uuid.uuid4()),
            "nome": "Marlon Ferreira (Editor-Chefe)",
            "email": "marlon@decifrandodados.com.br",
            "area": "TI & Dados",
            "ativo": True,
            "created_at": datetime.now().isoformat(),
        }
    ]


def _salvar_db(db: dict[str, Any]) -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    DB_FILE.write_text(json.dumps(db, ensure_ascii=False, indent=2), encoding="utf-8")


def sincronizar_pasta_edicoes() -> int:
    """Importa todas as edições .md das pastas locais para o banco do site."""
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    PROJECT_EDICOES_DIR.mkdir(parents=True, exist_ok=True)

    db = {"editions": [], "subscribers": _subscribers_iniciais()}
    if DB_FILE.exists():
        try:
            db = json.loads(DB_FILE.read_text(encoding="utf-8"))
        except Exception:
            pass

    existentes = {str(e["edicao"]).zfill(2): e for e in db.get("editions", [])}
    pastas = [PROJECT_EDICOES_DIR, *LEGACY_EDICOES_DIRS]
    importadas = 0

    for pasta in pastas:
        if not pasta.exists():
            continue
        for arq in sorted(pasta.glob("*.md")):
            m = re.search(r"(\d+)", arq.stem)
            num = m.group(1).zfill(2) if m else str(len(existentes) + 1).zfill(2)
            raw = arq.read_text(encoding="utf-8", errors="replace")
            parsed = parse_frontmatter_md(raw, fallback_edicao=num)
            existentes[parsed["edicao"]] = parsed
            # Garante cópia na pasta edicoes/ do projeto
            destino = PROJECT_EDICOES_DIR / f"edicao-{parsed['edicao']}.md"
            if not destino.exists():
                destino.write_text(raw, encoding="utf-8")
            importadas += 1

    db["editions"] = sorted(
        existentes.values(),
        key=lambda x: int(re.sub(r"\D", "", str(x.get("edicao", "0"))) or 0),
        reverse=True,
    )
    _salvar_db(db)
    return importadas


def listar_edicoes(include_drafts: bool = False, categoria: str | None = None, busca: str | None = None) -> list[dict[str, Any]]:
    db = _carregar_db()
    edicoes = db.get("editions", [])
    if not edicoes:
        sincronizar_pasta_edicoes()
        edicoes = _carregar_db().get("editions", [])

    resultado = []
    for ed in edicoes:
        if not include_drafts and ed.get("status", "published") != "published":
            continue
        if categoria and categoria != "Todas" and ed.get("categoria") != categoria:
            continue
        if busca:
            termo = busca.lower()
            alvo = f"{ed.get('titulo','')} {ed.get('subtitulo','')} {ed.get('conteudo_markdown','')}".lower()
            if termo not in alvo:
                continue
        resultado.append(ed)
    return resultado


def obter_edicao(identificador: str) -> dict[str, Any] | None:
    db = _carregar_db()
    ident = identificador.strip().lower()
    for ed in db.get("editions", []):
        if (
            str(ed.get("edicao", "")).lower() == ident
            or str(ed.get("edicao", "")).zfill(2) == ident.zfill(2)
            or str(ed.get("slug", "")).lower() == ident
            or str(ed.get("id", "")).lower() == ident
        ):
            return ed
    return None


def salvar_edicao(dados: dict[str, Any]) -> dict[str, Any]:
    db = _carregar_db()
    edicoes = db.get("editions", [])
    edicao_num = str(dados.get("edicao") or (len(edicoes) + 1)).zfill(2)
    titulo = (dados.get("titulo") or f"Edição #{edicao_num}").strip()
    subtitulo = (dados.get("subtitulo") or "").strip()
    conteudo = (dados.get("conteudo_markdown") or "").strip()
    if not conteudo.startswith("# "):
        cabecalho = f"# {titulo}\n"
        if subtitulo:
            cabecalho += f"## {subtitulo}\n\n"
        conteudo = cabecalho + conteudo

    registro = {
        "id": dados.get("id") or str(uuid.uuid5(uuid.NAMESPACE_DNS, f"decifrando-dados-edicao-{edicao_num}")),
        "edicao": edicao_num,
        "slug": f"edicao-{edicao_num}-{slugify(titulo)[:60]}",
        "titulo": titulo,
        "subtitulo": subtitulo,
        "categoria": dados.get("categoria") or inferir_categoria(titulo, conteudo),
        "data": dados.get("data") or datetime.now().strftime("%d/%m/%Y"),
        "tempo_leitura": str(dados.get("tempo_leitura") or "4"),
        "status": dados.get("status") or "published",
        "seo_titulo": dados.get("seo_titulo") or f"{titulo} | Decifrando Dados #{edicao_num}",
        "seo_descricao": dados.get("seo_descricao") or subtitulo or titulo,
        "post_divulgacao": dados.get("post_divulgacao") or "",
        "conteudo_markdown": conteudo,
        "updated_at": datetime.now().isoformat(),
    }

    novos = [e for e in edicoes if str(e.get("edicao")).zfill(2) != edicao_num]
    novos.append(registro)
    db["editions"] = sorted(
        novos,
        key=lambda x: int(re.sub(r"\D", "", str(x.get("edicao", "0"))) or 0),
        reverse=True,
    )
    _salvar_db(db)

    # Salva arquivo .md em edicoes/
    PROJECT_EDICOES_DIR.mkdir(parents=True, exist_ok=True)
    arq_md = PROJECT_EDICOES_DIR / f"edicao-{edicao_num}.md"
    arq_md.write_text(serializar_markdown(registro), encoding="utf-8")

    # Sincroniza com Supabase se configurado
    if settings.supabase_configured:
        try:
            get_supabase().table("newsletter_editions").upsert(registro, on_conflict="edicao").execute()
        except Exception:
            pass

    return registro


def remover_edicao(edicao_num: str) -> bool:
    db = _carregar_db()
    alvo = edicao_num.zfill(2)
    antes = len(db.get("editions", []))
    db["editions"] = [e for e in db.get("editions", []) if str(e.get("edicao")).zfill(2) != alvo]
    _salvar_db(db)
    arq_md = PROJECT_EDICOES_DIR / f"edicao-{alvo}.md"
    if arq_md.exists():
        arq_md.unlink(missing_ok=True)
    return len(db["editions"]) < antes


def _html_para_markdown_simples(raw_html: str) -> tuple[str, str]:
    """Converte HTML exportado de artigos do LinkedIn em Markdown limpo."""
    t_match = re.search(r"<title>(.*?)</title>", raw_html, flags=re.I | re.S)
    h1_match = re.search(r"<h1[^>]*>(.*?)</h1>", raw_html, flags=re.I | re.S)
    titulo = html.unescape(re.sub(r"<[^>]+>", "", (h1_match or t_match).group(1)).strip()) if (h1_match or t_match) else "Edição Importada do LinkedIn"

    body_match = re.search(r"<body[^>]*>(.*?)</body>", raw_html, flags=re.I | re.S)
    corpo = body_match.group(1) if body_match else raw_html
    corpo = re.sub(r"<h1[^>]*>(.*?)</h1>", r"# \1\n\n", corpo, flags=re.I | re.S)
    corpo = re.sub(r"<h2[^>]*>(.*?)</h2>", r"## \1\n\n", corpo, flags=re.I | re.S)
    corpo = re.sub(r"<h3[^>]*>(.*?)</h3>", r"### \1\n\n", corpo, flags=re.I | re.S)
    corpo = re.sub(r"<li[^>]*>(.*?)</li>", r"- \1\n", corpo, flags=re.I | re.S)
    corpo = re.sub(r"<blockquote[^>]*>(.*?)</blockquote>", r"> \1\n\n", corpo, flags=re.I | re.S)
    corpo = re.sub(r"<(strong|b)[^>]*>(.*?)</\1>", r"**\2**", corpo, flags=re.I | re.S)
    corpo = re.sub(r"<(em|i)[^>]*>(.*?)</\1>", r"*\2*", corpo, flags=re.I | re.S)
    corpo = re.sub(r"<p[^>]*>(.*?)</p>", r"\1\n\n", corpo, flags=re.I | re.S)
    corpo = re.sub(r"<br\s*/?>", "\n", corpo, flags=re.I)
    corpo = html.unescape(re.sub(r"<[^>]+>", "", corpo))
    corpo = re.sub(r"\n{3,}", "\n\n", corpo).strip()
    return titulo, corpo


def importar_arquivo_upload(filename: str, content_bytes: bytes) -> list[dict[str, Any]]:
    """Suporta upload de .md, .html ou .zip (Exportação de Dados do LinkedIn)."""
    importados: list[dict[str, Any]] = []
    nome_lower = filename.lower()
    existentes = listar_edicoes(include_drafts=True)
    prox_num = max([int(re.sub(r"\D", "", str(e.get("edicao", "0"))) or 0) for e in existentes] or [0]) + 1

    if nome_lower.endswith(".md"):
        texto = content_bytes.decode("utf-8", errors="replace")
        m = re.search(r"(\d+)", filename)
        ed = parse_frontmatter_md(texto, fallback_edicao=m.group(1) if m else str(prox_num))
        importados.append(salvar_edicao(ed))

    elif nome_lower.endswith((".html", ".htm")):
        texto = content_bytes.decode("utf-8", errors="replace")
        titulo, md = _html_para_markdown_simples(texto)
        importados.append(
            salvar_edicao({
                "edicao": str(prox_num).zfill(2),
                "titulo": titulo,
                "subtitulo": "Edição importada do arquivo do LinkedIn",
                "conteudo_markdown": md,
                "status": "published",
            })
        )

    elif nome_lower.endswith(".zip"):
        with zipfile.ZipFile(io.BytesIO(content_bytes)) as zf:
            for info in zf.infolist():
                if info.is_dir():
                    continue
                low = info.filename.lower()
                if low.endswith(".md"):
                    raw = zf.read(info.filename).decode("utf-8", errors="replace")
                    m = re.search(r"(\d+)", Path(info.filename).stem)
                    ed = parse_frontmatter_md(raw, fallback_edicao=m.group(1) if m else str(prox_num))
                    importados.append(salvar_edicao(ed))
                    prox_num += 1
                elif low.endswith((".html", ".htm")) and ("article" in low or "edicao" in low or not low.startswith("index")):
                    raw = zf.read(info.filename).decode("utf-8", errors="replace")
                    titulo, md = _html_para_markdown_simples(raw)
                    importados.append(
                        salvar_edicao({
                            "edicao": str(prox_num).zfill(2),
                            "titulo": titulo,
                            "subtitulo": "Artigo importado da exportação oficial do LinkedIn",
                            "conteudo_markdown": md,
                            "status": "published",
                        })
                    )
                    prox_num += 1

    return importados


def adicionar_inscrito(email: str, nome: str = "", area: str = "TI & Dados") -> dict[str, Any]:
    db = _carregar_db()
    email_limpo = email.strip().lower()
    for sub in db.get("subscribers", []):
        if sub.get("email", "").lower() == email_limpo:
            sub["nome"] = nome or sub.get("nome", "")
            sub["area"] = area or sub.get("area", "TI & Dados")
            sub["ativo"] = True
            _salvar_db(db)
            return sub

    novo = {
        "id": str(uuid.uuid4()),
        "email": email_limpo,
        "nome": nome.strip() or email_limpo.split("@")[0],
        "area": area,
        "ativo": True,
        "created_at": datetime.now().isoformat(),
    }
    db.setdefault("subscribers", []).insert(0, novo)
    _salvar_db(db)
    if settings.supabase_configured:
        try:
            get_supabase().table("newsletter_subscribers").upsert(novo, on_conflict="email").execute()
        except Exception:
            pass
    return novo


def listar_inscritos() -> list[dict[str, Any]]:
    db = _carregar_db()
    return db.get("subscribers", [])
