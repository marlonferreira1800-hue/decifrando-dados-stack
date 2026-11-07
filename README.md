# Decifrando Dados — Portal Público & Estúdio Editorial IA

Plataforma Full-Stack da newsletter oficial **Decifrando Dados** (Curadoria e autoria de **Marlon Ferreira** — *"Smart people are cooler."*), construída sobre a **GenAI Production Stack** dos vídeos de Dave Ebbelaar (Datalumina):

- **Backend (`backend/`):** FastAPI + Pydantic AI (Agente Editorial no padrão 5 Blocos + 3 Lentes e Guardrails) + Celery/Redis + RAG Híbrido
- **Banco de Dados (`supabase/` & `backend/data/`):** Persistência dupla — funciona 100% local (JSON + arquivos `.md` em `edicoes/`) e sincroniza com **Supabase PostgreSQL + `pgvector`** quando configurado
- **Frontend (`frontend/`):** React 19 + TypeScript + Vite + Tailwind CSS v4 + shadcn/ui
- **Infraestrutura:** Docker Compose (`docker-compose.yml`) + Deploy Railway (`railway.toml`)

---

## Como Iniciar em 1 Clique (Windows)

Dê dois cliques em [`Iniciar_Site_Decifrando_Dados.bat`](Iniciar_Site_Decifrando_Dados.bat) ou execute:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/dev.ps1
```

- **Portal Público (Leitores):** http://localhost:5173
- **Área Administrativa (Estúdio Editorial):** Clique no botão **"Área Administrativa"** no topo direito (Senha padrão local: `decifrando2026`, configurável via `ADMIN_PASSWORD` no `.env`)
- **Documentação interativa da API (Swagger):** http://localhost:8000/docs

---

## Funcionalidades Incluídas

1. **Área Pública (Portal dos Leitores):**
   - Leitura completa das edições publicadas (já pré-carregada com as edições **#01, #02, #30, #31 e #32** encontradas no seu PC).
   - **Copiloto Decifrando Dados (RAG — Vídeo 13):** Os leitores fazem perguntas sobre Ciência de Dados, Engenharia e IA e recebem respostas fundamentadas nas suas edições com citação clicável da fonte.
   - **Filtro por Categorias e Busca Instantânea:** `IA & Agentes`, `Engenharia de Dados`, `Bancos & Finanças` e `Carreira & Estratégia`.
   - **Formulário de Inscrição Segmentado:** Leitores se cadastram escolhendo sua lente principal (`TI & Dados`, `Bancos & Finanças` ou `Negócios`).

2. **Área Administrativa (Estúdio Editorial — Só Você):**
   - **Assistente Editorial Pydantic AI (Vídeo 14):** Digite o tema e o termo técnico da semana e gere automaticamente a edição completa nos **5 Blocos + 3 Lentes (TI, Bancos e Negócios)** + SEO + Post de divulgação.
   - **Editor com Preview ao Vivo:** Crie, edite, salve como rascunho, agende ou publique em 1 clique. Toda edição publicada gera também o arquivo `.md` em `edicoes/edicao-XX.md`.
   - **Importador de Edições do LinkedIn:** Envie arquivos `.md`, `.html` ou o arquivo `.zip` da exportação oficial do LinkedIn (*Configurações → Privacidade dos dados → Obter uma cópia dos seus dados → Artigos*) para importar todas as edições antigas de uma vez.
   - **Gestão de Inscritos:** Visualize todos os leitores inscritos e exporte a base em `.csv`.
