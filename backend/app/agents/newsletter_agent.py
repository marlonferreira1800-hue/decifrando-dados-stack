"""Agentes de IA da Newsletter Decifrando Dados (Motor Principal: Mistral AI Large + RAG).

Implementa:
1. Gerador & Construtor Editorial com Mistral AI (`mistral-large-latest`) no padrão oficial:
   - 5 Blocos (Ponto Central + Analogia, 3 Lentes: TI, Bancos e Negócios, Tradutor de IA & Dados, Radar Rápido, Pergunta da Semana)
   - Etapa 2: Post de Divulgação para LinkedIn + Metadados SEO
2. Copiloto RAG da Newsletter com síntese via Mistral AI citando as edições publicadas.
"""
from __future__ import annotations

import json
import re
from datetime import datetime
from typing import Any

import httpx
from pydantic import BaseModel, Field

from app.core.config import settings
from app.db.newsletter import inferir_categoria, listar_edicoes

EDITORIAL_SYSTEM_PROMPT = """Você é o redator-chefe da newsletter oficial 'Decifrando Dados', com curadoria e autoria de Marlon Ferreira.
Slogan oficial: "Smart people are cooler."
Missão: Desmistificar Ciência de Dados, Machine Learning, Engenharia de Dados e Inteligência Artificial para profissionais de TI, Setor Bancário/Financeiro e Negócios/Público Geral sem parecer acadêmico demais, com foco em impacto prático real e sem enrolação.

REGRAS OBRIGATÓRIAS DE REDAÇÃO:
1. Retorne APENAS um objeto JSON válido com as chaves exatas:
   - "titulo": Título forte focado no problema resolvido ou transformação de mercado (evite siglas isoladas)
   - "subtitulo": Subtítulo direto complementando o gancho principal
   - "categoria": Escolha exatamente uma entre: "IA & Agentes", "Engenharia de Dados", "Bancos & Finanças", "Carreira & Estratégia"
   - "tempo_leitura": "4"
   - "seo_titulo": Título otimizado para SEO (até 65 caracteres) com "| Decifrando Dados #XX"
   - "seo_descricao": Meta description direta (até 155 caracteres)
   - "post_divulgacao": O Post para o LinkedIn (Etapa 2: gancho forte nas 2 primeiras linhas, resumo + analogia em 1 frase "Em termos simples:...", o que significa para TI e Dados, Bancos e Finanças e Nos Negócios, "Termo técnico da semana sem complicação — [Nome]:...", pergunta de engajamento, convite para o link no primeiro comentário e hashtags #InteligenciaArtificial #CienciaDeDados #MachineLearning #Tecnologia #SetorBancario #Inovacao)
   - "conteudo_markdown": O artigo completo em Markdown contendo obrigatoriamente os 5 BLOCOS abaixo:

ESTRUTURA OBRIGATÓRIA DO CAMPO `conteudo_markdown`:
# [Título]
## [Subtítulo]

**NESTA EDIÇÃO:**
• **[Tópico 1]:** [Fato ou tendência principal]
• **[Tópico 2]:** [Aplicação em TI, bancos e empresas]
• **[Tópico 3]:** [Termo traduzido da semana]

---

### BLOCO 1 — O PONTO CENTRAL: O QUE ESTÁ ACONTECENDO?
[Parágrafo 1: O Gancho com situação real do cotidiano ou dor corporativa]

[Parágrafo 2: Explicação sem tecniquês em 3-4 linhas diretas descrevendo o que entra, o que sai, benefícios e limites reais]

> 💡 **Em outras palavras (A Analogia):** Pense nisso como [comparação simples do cotidiano]...

---

### BLOCO 2 — NA PRÁTICA: ONDE ISSO MUDA O JOGO?
• 💻 **Para Tecnologia e Dados (TI):** [2 a 3 linhas sobre arquitetura, governança, segurança ou produtividade técnica]
• 🏦 **Para o Setor Bancário e Financeiro:** [2 a 3 linhas sobre prevenção a fraudes, análise de crédito, compliance, auditoria ou custos]
• 📊 **Para Negócios e Público Geral:** [2 a 3 linhas sobre tomada de decisão, rotina corporativa e impacto em custos]

---

### BLOCO 3 — TRADUTOR DE IA & DADOS
**O termo da vez: [Nome do Termo]**
• **O que parece ser:** [Frase leve e descontraída]
• **O que realmente é:** [Explicação direta em até 2 frases]
• **Por que você vai ouvir falar disso:** [1 frase de impacto prático]

---

### BLOCO 4 — RADAR RÁPIDO DA SEMANA
• ⚡ **[Notícia/Tendência 1]:** [2 linhas com o que aconteceu + por que importa]
• 🛡️ **[Notícia/Tendência 2]:** [2 linhas com o que aconteceu + por que importa]
• 🛠️ **Ferramenta / Caso Prático da Semana:** [Nome da ferramenta ou arquitetura em 2 linhas práticas]

---

### BLOCO 5 — PARA LEVAR PARA A SEMANA
> 🎯 **A pergunta prática da edição:** [Pergunta reflexiva para a rotina do leitor]

Um excelente final de semana e boas análises!
Se esta edição trouxe clareza para o seu dia a dia, encaminhe para aquele colega de **TI, Bancos ou Negócios** que gosta de separar o sinal do ruído.

**Marlon Ferreira**
*Curador da Decifrando Dados — "Smart people are cooler."*
"""


class NewsletterDraftOutput(BaseModel):
    titulo: str = Field(description="Título forte focado no problema resolvido ou transformação de mercado")
    subtitulo: str = Field(description="Subtítulo direto complementando o gancho principal")
    categoria: str = Field(description="Uma entre: 'IA & Agentes', 'Engenharia de Dados', 'Bancos & Finanças', 'Carreira & Estratégia'")
    tempo_leitura: str = Field(default="4", description="Tempo estimado de leitura em minutos")
    seo_titulo: str = Field(description="Título otimizado para SEO")
    seo_descricao: str = Field(description="Meta description otimizada para buscadores")
    post_divulgacao: str = Field(description="Post de divulgação para o LinkedIn (Etapa 2)")
    conteudo_markdown: str = Field(description="Artigo completo em Markdown seguindo os 5 blocos e as 3 lentes")
    motor_ia: str = Field(default="mistral-large-latest", description="Modelo utilizado na geração")


async def _chamar_mistral_json(tema: str, edicao_num: str, termo_tecnico: str = "") -> NewsletterDraftOutput:
    """Chama a API oficial da Mistral AI (`mistral-large-latest`) com saída JSON estruturada."""
    prompt_usuario = (
        f"Crie a Edição #{edicao_num} da newsletter 'Decifrando Dados' (autor: Marlon Ferreira).\n"
        f"Tema central solicitado: {tema}\n"
        f"Termo técnico para o Bloco 3 (Tradutor de IA & Dados): {termo_tecnico or 'escolha o termo técnico mais relevante ao tema'}\n"
        f"Data de publicação: {datetime.now().strftime('%d/%m/%Y')}\n"
        "Siga rigorosamente a estrutura de 5 Blocos + 3 Lentes (TI, Bancos e Negócios) e retorne apenas o JSON válido."
    )

    headers = {
        "Authorization": f"Bearer {settings.mistral_api_key}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": settings.mistral_model,
        "temperature": 0.65,
        "response_format": {"type": "json_object"},
        "messages": [
            {"role": "system", "content": EDITORIAL_SYSTEM_PROMPT},
            {"role": "user", "content": prompt_usuario},
        ],
    }

    async with httpx.AsyncClient(timeout=60.0) as client:
        resp = await client.post(f"{settings.mistral_base_url}/chat/completions", headers=headers, json=payload)
        resp.raise_for_status()
        data = resp.json()
        raw_content = data["choices"][0]["message"]["content"]
        parsed = json.loads(raw_content)

        cat = parsed.get("categoria") or inferir_categoria(parsed.get("titulo", tema), parsed.get("conteudo_markdown", ""))
        if cat not in {"IA & Agentes", "Engenharia de Dados", "Bancos & Finanças", "Carreira & Estratégia"}:
            cat = inferir_categoria(parsed.get("titulo", tema), parsed.get("conteudo_markdown", ""))

        return NewsletterDraftOutput(
            titulo=parsed.get("titulo", f"{tema}: Impacto Prático em TI, Bancos e Negócios"),
            subtitulo=parsed.get("subtitulo", ""),
            categoria=cat,
            tempo_leitura=str(parsed.get("tempo_leitura", "4")),
            seo_titulo=parsed.get("seo_titulo", f"{ parsed.get('titulo', tema) } | Decifrando Dados #{edicao_num}"),
            seo_descricao=parsed.get("seo_descricao", parsed.get("subtitulo", "")),
            post_divulgacao=parsed.get("post_divulgacao", ""),
            conteudo_markdown=parsed.get("conteudo_markdown", ""),
            motor_ia=f"Mistral AI ({settings.mistral_model})",
        )


def _fallback_rascunho_editorial(tema: str, edicao_num: str, termo_tecnico: str = "") -> NewsletterDraftOutput:
    """Fallback local caso a rede esteja indisponível."""
    tema_limpo = tema.strip() or "Agentes de IA e Arquitetura de Dados em Produção"
    termo = termo_tecnico.strip() or "RAG Híbrido (Retrieval-Augmented Generation)"
    cat = inferir_categoria(tema_limpo, termo)
    titulo = f"{tema_limpo}: O que Funciona em Produção (e o que é só Hype)"
    subtitulo = "Como separar promessas de palco de resultados reais em TI, bancos e operação corporativa."

    conteudo = f"""# {titulo}
## {subtitulo}

**NESTA EDIÇÃO:**
• **Tendência Central:** Por que {tema_limpo} saiu dos slides e entrou no orçamento crítico de tecnologia.
• **Impacto nas 3 Lentes:** Como estruturar governança em TI, blindar risco em Bancos e reduzir custos nos Negócios.
• **Tradutor da Semana:** Desmistificando **{termo}** sem fórmulas matemáticas.

---

### BLOCO 1 — O PONTO CENTRAL: O QUE ESTÁ ACONTECENDO?

Se você participou de qualquer reunião de tecnologia ou planejamento estratégico nas últimas semanas, certamente ouviu alguém defender que **{tema_limpo}** vai resolver todos os gargalos da operação da noite para o dia. Na prática, quem está no chão de fábrica sabe que conectar modelos modernos a dados reais exige arquitetura limpa, fila assíncrona e validação rigorosa.

Em vez de depender de soluções mágicas, as equipes que estão colhendo retorno financeiro tratam a tecnologia como engenharia de software previsível: entra dado governado, passa por regras claras de validação e sai uma ação auditável que economiza horas de retrabalho.

> 💡 **Em outras palavras (A Analogia):** Pense nisso como a cozinha industrial de um grande restaurante. Não adianta contratar o chef mais premiado do mundo (o modelo de IA) se a despensa está bagunçada, os ingredientes não têm validade marcada (dados sem governança) e os pedidos chegam todos ao mesmo tempo sem comanda (falta de fila e arquitetura).

---

### BLOCO 2 — NA PRÁTICA: ONDE ISSO MUDA O JOGO?

• 💻 **Para Tecnologia e Dados (TI):** Reduz o tempo gasto apagando incêndios em integrações frágeis. Com contratos de dados validados e filas em segundo plano, o time técnico ganha observabilidade e mantém o controle de custos de API.
• 🏦 **Para o Setor Bancário e Financeiro:** Em prevenção a fraudes, análise de crédito e compliance regulatório, nenhuma decisão automatizada pode ser uma "caixa-preta". A aplicação estruturada garante trilha de auditoria completa e menor índice de falsos positivos.
• 📊 **Para Negócios e Público Geral:** Para gestores e líderes de área, o ganho aparece direto no fechamento do mês: processos que levavam dias de triagem manual passam a ser resolvidos em minutos.

---

### BLOCO 3 — TRADUTOR DE IA & DADOS

**O termo da vez: {termo}**
• **O que parece ser:** Mais uma sigla complicada inventada no Vale do Silício para vender consultoria cara.
• **O que realmente é:** Uma técnica que conecta a IA diretamente aos documentos e bancos de dados reais da sua empresa antes de responder, obrigando o sistema a citar a fonte exata em vez de "chutar" de cabeça.
• **Por que você vai ouvir falar disso:** Porque é a forma mais barata e segura de usar IA corporativa sem vazar dados e sem sofrer com alucinações em relatórios críticos.

---

### BLOCO 4 — RADAR RÁPIDO DA SEMANA

• ⚡ **Engenharia de IA em Produção:** Empresas estão trocando protótipos soltos por stacks padronizadas (FastAPI + Postgres Vetorial + Workers assíncronos).
• 🛡️ **Governança de Agentes Autônomos:** Guardrails de entrada e saída deixaram de ser opcionais em sistemas conectados a e-mail e ERP corporativo.
• 🛠️ **Ferramenta / Caso Prático da Semana:** **Mistral Large + FastAPI** — combinação enxuta para agentes editoriais e triagem corporativa de alta velocidade.

---

### BLOCO 5 — PARA LEVAR PARA A SEMANA

> 🎯 **A pergunta prática da edição:** Olhando para os projetos de dados e IA da sua área hoje, qual processo ainda depende de "força bruta manual" porque ninguém parou para padronizar a base de entrada?

Um excelente final de semana e boas análises!
Se esta edição trouxe clareza para o seu dia a dia, encaminhe para aquele colega de **TI, Bancos ou Negócios** que gosta de separar o sinal do ruído.

**Marlon Ferreira**
*Curador da Decifrando Dados — "Smart people are cooler."*"""

    post = f"""Muita gente acha que o segredo de {tema_limpo} está em escolher o modelo mais caro do mercado. Na vida real, 80% do resultado vem de uma arquitetura bem feita que não quebra na segunda-feira de manhã.

Em termos simples: é como uma cozinha industrial — não adianta ter um chef estrelado se os ingredientes estão vencidos e não existe fila de comandas.

O que isso significa na prática:
💻 **TI e Dados:** Menos retrabalho apagando incêndios e pipelines previsíveis com validação automática.
🏦 **Bancos e Finanças:** Respostas com trilha de auditoria real para crédito, compliance e prevenção a fraudes.
📊 **Nos Negócios e Dia a Dia:** Triagens que levavam dias caem para minutos, com impacto direto no custo operacional.

Termo técnico da semana sem complicação — **{termo}**: fazer a IA consultar e citar os documentos oficiais da sua empresa antes de responder, eliminando o "achismo".

Qual processo da sua rotina hoje mais precisa sair do improviso e ganhar uma estrutura confiável?

👇 O acesso para ler a edição #{edicao_num} completa está no primeiro comentário!

#InteligenciaArtificial #CienciaDeDados #MachineLearning #Tecnologia #SetorBancario #Inovacao"""

    return NewsletterDraftOutput(
        titulo=titulo,
        subtitulo=subtitulo,
        categoria=cat,
        tempo_leitura="4",
        seo_titulo=f"{tema_limpo} na Prática | Decifrando Dados #{edicao_num}",
        seo_descricao=f"Entenda como aplicar {tema_limpo} em TI, Bancos e Negócios sem hype e com foco em eficiência real. Edição #{edicao_num}.",
        post_divulgacao=post,
        conteudo_markdown=conteudo,
        motor_ia="Template Local (Fallback)",
    )


async def gerar_rascunho_ia(tema: str, edicao_num: str, termo_tecnico: str = "") -> NewsletterDraftOutput:
    """Gera a edição completa usando a API da Mistral AI (`mistral-large-latest`)."""
    if settings.mistral_configured:
        try:
            return await _chamar_mistral_json(tema=tema, edicao_num=edicao_num, termo_tecnico=termo_tecnico)
        except Exception:
            pass
    return _fallback_rascunho_editorial(tema=tema, edicao_num=edicao_num, termo_tecnico=termo_tecnico)


def perguntar_acervo_rag(pergunta: str, top_k: int = 3) -> dict[str, Any]:
    """Busca nas edições publicadas da Decifrando Dados e sintetiza a resposta com Mistral AI + citações."""
    edicoes = listar_edicoes(include_drafts=False)
    termos = [
        t
        for t in re.findall(r"[a-zA-ZÀ-ÿ0-9]{3,}", pergunta.lower())
        if t not in {"como", "qual", "quais", "para", "que", "sobre", "uma", "dos", "das", "nos", "nas", "por"}
    ]

    avaliados: list[tuple[float, dict[str, Any], str]] = []
    for ed in edicoes:
        texto_completo = f"{ed.get('titulo', '')}\n{ed.get('subtitulo', '')}\n{ed.get('conteudo_markdown', '')}"
        low = texto_completo.lower()
        score = 0.0
        for t in termos:
            if t in ed.get("titulo", "").lower():
                score += 4.0
            if t in ed.get("subtitulo", "").lower():
                score += 2.5
            score += low.count(t) * 1.0

        paragrafos = [
            p.strip()
            for p in ed.get("conteudo_markdown", "").split("\n\n")
            if len(p.strip()) > 45 and not p.strip().startswith("#")
        ]
        melhor_p = paragrafos[0] if paragrafos else ed.get("subtitulo", "")
        melhor_p_score = -1
        for p in paragrafos:
            s_p = sum(1 for t in termos if t in p.lower())
            if s_p > melhor_p_score:
                melhor_p_score = s_p
                melhor_p = p

        avaliados.append((score, ed, re.sub(r"[#*>`]", "", melhor_p)[:280].strip()))

    avaliados.sort(
        key=lambda item: (item[0], int(re.sub(r"\D", "", str(item[1].get("edicao", "0"))) or 0)),
        reverse=True,
    )
    selecionados = avaliados[:top_k]

    citacoes = []
    contexto_blocos = []
    blocos_fallback = []
    for idx, (score, ed, snippet) in enumerate(selecionados, start=1):
        citacoes.append({
            "number": idx,
            "edicao": ed.get("edicao"),
            "titulo": ed.get("titulo"),
            "categoria": ed.get("categoria"),
            "data": ed.get("data"),
            "snippet": snippet,
        })
        contexto_blocos.append(
            f"FONTE [{idx}] — Edição #{ed.get('edicao')} ({ed.get('titulo')}):\n"
            f"{ed.get('conteudo_markdown', '')[:1400]}"
        )
        blocos_fallback.append(f"• **Edição #{ed.get('edicao')} ({ed.get('titulo')}) [{idx}]:** {snippet}")

    if not citacoes:
        return {
            "answer": "Ainda não há edições publicadas suficientes para responder a essa pergunta.",
            "citations": [],
        }

    # Síntese inteligente com Mistral AI sobre o acervo recuperado
    if settings.mistral_configured:
        try:
            prompt_rag = (
                "Você é o Copiloto Oficial da newsletter 'Decifrando Dados' de Marlon Ferreira.\n"
                "Responda à pergunta do leitor em português de forma direta, prática e sem enrolação (em até 3 parágrafos curtos ou tópicos), "
                "baseando-se EXCLUSIVAMENTE nas edições abaixo e citando as fontes no formato [1], [2], etc.\n\n"
                + "\n\n".join(contexto_blocos)
                + f"\n\nPERGUNTA DO LEITOR: {pergunta}"
            )
            resp = httpx.post(
                f"{settings.mistral_base_url}/chat/completions",
                headers={
                    "Authorization": f"Bearer {settings.mistral_api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": settings.mistral_model,
                    "temperature": 0.3,
                    "messages": [{"role": "user", "content": prompt_rag}],
                },
                timeout=20.0,
            )
            if resp.status_code == 200:
                ans = resp.json()["choices"][0]["message"]["content"].strip()
                return {"answer": ans, "citations": citacoes}
        except Exception:
            pass

    intro = (
        f"Com base no acervo publicado da **Decifrando Dados**, aqui está o que as edições de Marlon Ferreira destacam sobre **\"{pergunta.strip()}\"** :\n\n"
        + "\n\n".join(blocos_fallback)
        + "\n\n💡 *Clique em qualquer edição citada abaixo para abrir a leitura completa.*"
    )
    return {
        "answer": intro,
        "citations": citacoes,
    }
