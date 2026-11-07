// Cliente HTTP Híbrido (FastAPI Local/Railway + Motor Cloud Autônomo p/ Netlify com Mistral AI).
import { SEED_EDITIONS } from "./seedEditions"

const BASE_URL = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "")
const MISTRAL_KEY = import.meta.env.VITE_MISTRAL_API_KEY || localStorage.getItem("dd_mistral_key") || ""
const MISTRAL_MODEL = "mistral-large-latest"

const LS_EDITIONS_KEY = "dd_cloud_editions_v1"
const LS_SUBS_KEY = "dd_cloud_subscribers_v1"

export type Edition = {
  id: string
  edicao: string
  slug: string
  titulo: string
  subtitulo: string
  categoria: string
  data: string
  tempo_leitura: string
  status: "published" | "draft" | "scheduled" | string
  seo_titulo: string
  seo_descricao: string
  post_divulgacao: string
  conteudo_markdown: string
  updated_at?: string
}

export type NewsletterCitation = {
  number: number
  edicao: string
  titulo: string
  categoria: string
  data: string
  snippet: string
}

export type NewsletterAskResult = {
  answer: string
  citations: NewsletterCitation[]
}

export type Subscriber = {
  id: string
  email: string
  nome: string
  area: string
  ativo: boolean
  created_at: string
}

export type NewsletterStats = {
  total_edicoes: number
  publicadas: number
  rascunhos: number
  inscritos: number
  proxima_edicao: string
  categorias: Record<string, number>
}

export type TaskStatus = { task_id: string; status: string; result: unknown }

function carregarEdicoesCloud(): Edition[] {
  try {
    const raw = localStorage.getItem(LS_EDITIONS_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) return parsed
    }
  } catch {
    // ignore
  }
  localStorage.setItem(LS_EDITIONS_KEY, JSON.stringify(SEED_EDITIONS))
  return [...(SEED_EDITIONS as Edition[])]
}

function salvarEdicoesCloud(lista: Edition[]) {
  const ordenada = [...lista].sort(
    (a, b) => (parseInt(b.edicao.replace(/\D/g, ""), 10) || 0) - (parseInt(a.edicao.replace(/\D/g, ""), 10) || 0)
  )
  localStorage.setItem(LS_EDITIONS_KEY, JSON.stringify(ordenada))
  return ordenada
}

function carregarSubsCloud(): Subscriber[] {
  try {
    const raw = localStorage.getItem(LS_SUBS_KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    // ignore
  }
  const inicial: Subscriber[] = [
    {
      id: "sub-1",
      nome: "Marlon Ferreira (Editor-Chefe)",
      email: "marlon@decifrandodados.com.br",
      area: "TI & Dados",
      ativo: true,
      created_at: new Date().toISOString(),
    },
  ]
  localStorage.setItem(LS_SUBS_KEY, JSON.stringify(inicial))
  return inicial
}

async function gerarMistralCloud(tema: string, edicaoNum: string, termoTecnico = "") {
  const systemPrompt = `Você é o redator-chefe da newsletter oficial 'Decifrando Dados', com curadoria e autoria de Marlon Ferreira.
Slogan oficial: "Smart people are cooler."
Retorne APENAS um JSON válido com as chaves: "titulo", "subtitulo", "categoria" ("IA & Agentes" | "Engenharia de Dados" | "Bancos & Finanças" | "Carreira & Estratégia"), "tempo_leitura" ("4"), "seo_titulo", "seo_descricao", "post_divulgacao" e "conteudo_markdown".
O campo "conteudo_markdown" DEVE conter os 5 BLOCOS oficiais: NESTA EDIÇÃO, BLOCO 1 — O PONTO CENTRAL (com > 💡 **Em outras palavras (A Analogia):**), BLOCO 2 — NA PRÁTICA com as 3 lentes (💻 TI, 🏦 Bancos e 📊 Negócios), BLOCO 3 — TRADUTOR DE IA & DADOS, BLOCO 4 — RADAR RÁPIDO DA SEMANA e BLOCO 5 — PARA LEVAR PARA A SEMANA (com > 🎯 **A pergunta prática da edição:** e assinatura Marlon Ferreira).`

  const res = await fetch("https://api.mistral.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${MISTRAL_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MISTRAL_MODEL,
      temperature: 0.65,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Crie a Edição #${edicaoNum} da Decifrando Dados sobre: ${tema}. Termo técnico (Bloco 3): ${
            termoTecnico || "escolha o mais relevante"
          }. Data: ${new Date().toLocaleDateString("pt-BR")}.`,
        },
      ],
    }),
  })
  if (!res.ok) throw new Error(`Erro Mistral API (${res.status})`)
  const data = await res.json()
  const parsed = JSON.parse(data.choices[0].message.content)
  return {
    titulo: parsed.titulo || `${tema}: O que Muda na Prática`,
    subtitulo: parsed.subtitulo || "",
    categoria: parsed.categoria || "IA & Agentes",
    tempo_leitura: String(parsed.tempo_leitura || "4"),
    seo_titulo: parsed.seo_titulo || `${parsed.titulo} | Decifrando Dados #${edicaoNum}`,
    seo_descricao: parsed.seo_descricao || parsed.subtitulo || "",
    post_divulgacao: parsed.post_divulgacao || "",
    conteudo_markdown: parsed.conteudo_markdown || "",
    motor_ia: `Mistral AI (${MISTRAL_MODEL})`,
  }
}

async function fallbackCloudRouter(path: string, init?: RequestInit): Promise<unknown> {
  const method = (init?.method || "GET").toUpperCase()
  const bodyObj = init?.body && typeof init.body === "string" ? JSON.parse(init.body) : {}

  if (path.startsWith("/api/newsletter/editions") && method === "GET") {
    const includeDrafts = path.includes("include_drafts=true")
    const todas = carregarEdicoesCloud()
    return includeDrafts ? todas : todas.filter((e) => e.status === "published")
  }

  if (path === "/api/newsletter/stats") {
    const todas = carregarEdicoesCloud()
    const pub = todas.filter((e) => e.status === "published")
    const subs = carregarSubsCloud()
    const maxNum = Math.max(0, ...todas.map((e) => parseInt(e.edicao.replace(/\D/g, ""), 10) || 0))
    const categorias: Record<string, number> = {}
    pub.forEach((e) => {
      categorias[e.categoria] = (categorias[e.categoria] || 0) + 1
    })
    return {
      total_edicoes: todas.length,
      publicadas: pub.length,
      rascunhos: todas.length - pub.length,
      inscritos: subs.length,
      proxima_edicao: String(maxNum + 1).padStart(2, "0"),
      categorias,
    } satisfies NewsletterStats
  }

  if (path === "/api/newsletter/auth" && method === "POST") {
    if (bodyObj.password === "decifrando2026") {
      return { authenticated: true, token: "decifrando2026", curador: "Marlon Ferreira" }
    }
    throw new Error("Senha incorreta.")
  }

  if (path === "/api/newsletter/subscribe" && method === "POST") {
    const subs = carregarSubsCloud()
    const novo: Subscriber = {
      id: `sub-${Date.now()}`,
      email: bodyObj.email,
      nome: bodyObj.nome || bodyObj.email.split("@")[0],
      area: bodyObj.area || "TI & Dados",
      ativo: true,
      created_at: new Date().toISOString(),
    }
    const atualizados = [novo, ...subs.filter((s) => s.email !== novo.email)]
    localStorage.setItem(LS_SUBS_KEY, JSON.stringify(atualizados))
    return { ok: true, subscriber: novo }
  }

  if (path === "/api/newsletter/subscribers" && method === "GET") {
    return carregarSubsCloud()
  }

  if (path === "/api/newsletter/editions" && method === "POST") {
    const todas = carregarEdicoesCloud()
    const edNum = String(bodyObj.edicao || "33").padStart(2, "0")
    const registro: Edition = {
      id: `ed-${edNum}`,
      edicao: edNum,
      slug: `edicao-${edNum}`,
      titulo: bodyObj.titulo,
      subtitulo: bodyObj.subtitulo || "",
      categoria: bodyObj.categoria || "IA & Agentes",
      data: bodyObj.data || new Date().toLocaleDateString("pt-BR"),
      tempo_leitura: String(bodyObj.tempo_leitura || "4"),
      status: bodyObj.status || "published",
      seo_titulo: bodyObj.seo_titulo || "",
      seo_descricao: bodyObj.seo_descricao || "",
      post_divulgacao: bodyObj.post_divulgacao || "",
      conteudo_markdown: bodyObj.conteudo_markdown || "",
      updated_at: new Date().toISOString(),
    }
    salvarEdicoesCloud([registro, ...todas.filter((e) => e.edicao !== edNum)])
    return registro
  }

  if (path.startsWith("/api/newsletter/editions/") && method === "DELETE") {
    const num = path.split("/").pop()?.padStart(2, "0")
    const todas = carregarEdicoesCloud()
    salvarEdicoesCloud(todas.filter((e) => e.edicao !== num))
    return { deleted: num }
  }

  if (path === "/api/newsletter/sync" && method === "POST") {
    const todas = carregarEdicoesCloud()
    return { imported: todas.length, total: todas.length }
  }

  if (path === "/api/newsletter/ai-draft" && method === "POST") {
    return await gerarMistralCloud(bodyObj.tema, String(bodyObj.edicao || "33").padStart(2, "0"), bodyObj.termo_tecnico)
  }

  if (path === "/api/newsletter/ai-build" && method === "POST") {
    const edNum = String(bodyObj.edicao || "33").padStart(2, "0")
    const draft = await gerarMistralCloud(bodyObj.tema, edNum, bodyObj.termo_tecnico)
    const todas = carregarEdicoesCloud()
    const salvo: Edition = {
      id: `ed-${edNum}`,
      edicao: edNum,
      slug: `edicao-${edNum}`,
      data: new Date().toLocaleDateString("pt-BR"),
      status: "published",
      ...draft,
    }
    salvarEdicoesCloud([salvo, ...todas.filter((e) => e.edicao !== edNum)])
    return { edition: salvo, motor_ia: draft.motor_ia }
  }

  if (path === "/api/newsletter/ask" && method === "POST") {
    const edicoes = carregarEdicoesCloud().filter((e) => e.status === "published")
    const q = String(bodyObj.question || "").toLowerCase()
    const termos = q.split(/\s+/).filter((t) => t.length >= 3)
    const ranqueadas = edicoes
      .map((ed) => {
        const txt = `${ed.titulo} ${ed.subtitulo} ${ed.conteudo_markdown}`.toLowerCase()
        const score = termos.reduce((acc, t) => acc + (txt.includes(t) ? 2 : 0), 0)
        return { ed, score }
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)

    const citations: NewsletterCitation[] = ranqueadas.map((item, idx) => ({
      number: idx + 1,
      edicao: item.ed.edicao,
      titulo: item.ed.titulo,
      categoria: item.ed.categoria,
      data: item.ed.data,
      snippet: item.ed.subtitulo || item.ed.conteudo_markdown.slice(0, 180),
    }))

    try {
      const contexto = ranqueadas
        .map(
          (item, idx) =>
            `FONTE [${idx + 1}] — Edição #${item.ed.edicao} (${item.ed.titulo}):\n${item.ed.conteudo_markdown.slice(0, 1200)}`
        )
        .join("\n\n")
      const r = await fetch("https://api.mistral.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${MISTRAL_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: MISTRAL_MODEL,
          temperature: 0.3,
          messages: [
            {
              role: "user",
              content: `Você é o Copiloto da newsletter Decifrando Dados de Marlon Ferreira. Responda de forma direta em português citando [1], [2], [3] com base nas edições:\n\n${contexto}\n\nPergunta: ${bodyObj.question}`,
            },
          ],
        }),
      })
      if (r.ok) {
        const d = await r.json()
        return { answer: d.choices[0].message.content, citations } satisfies NewsletterAskResult
      }
    } catch {
      // fallback abaixo
    }

    return {
      answer: citations
        .map((c) => `• **Edição #${c.edicao} (${c.titulo}) [${c.number}]:** ${c.snippet}`)
        .join("\n\n"),
      citations,
    } satisfies NewsletterAskResult
  }

  throw new Error("Rota não suportada no modo estático.")
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...init?.headers },
    })
    const contentType = res.headers.get("content-type") || ""
    if (res.ok && contentType.includes("application/json")) {
      return (await res.json()) as T
    }
    if (res.status === 401 || res.status === 400) {
      const errData = await res.json().catch(() => null)
      throw new Error(errData?.detail || `Erro ${res.status}`)
    }
  } catch (err) {
    if (err instanceof Error && (err.message === "Senha incorreta." || err.message.includes("não autorizado"))) {
      throw err
    }
  }
  return (await fallbackCloudRouter(path, init)) as T
}

export const post = <T>(path: string, body: unknown, headers?: Record<string, string>) =>
  api<T>(path, { method: "POST", body: JSON.stringify(body), headers })
