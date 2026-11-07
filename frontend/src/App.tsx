import { useEffect, useMemo, useState } from "react"
import {
  ArrowLeft,
  ArrowUpRight,
  BookOpen,
  Bot,
  CheckCircle2,
  Copy,
  Download,
  ExternalLink,
  Eye,
  FileUp,
  FolderSync,
  Layers,
  Lock,
  LogOut,
  Palette,
  PenTool,
  PlusCircle,
  Search,
  Send,
  Share2,
  Sparkles,
  Trash2,
  Users,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  api,
  post,
  type Edition,
  type NewsletterAskResult,
  type NewsletterStats,
  type Subscriber,
  type TaskStatus,
} from "@/lib/api"

const CATEGORIAS = [
  "Todas",
  "IA & Agentes",
  "Engenharia de Dados",
  "Bancos & Finanças",
  "Carreira & Estratégia",
]

/* Capa editorial 16:10 gerada no estilo The Rundown AI para cada edição */
function CapaEditorialCard({ edicao, categoria, titulo }: { edicao: string; categoria: string; titulo: string }) {
  const paletas: Record<string, { bg: string; accent: string; tag: string }> = {
    "IA & Agentes": {
      bg: "from-[#171717] via-[#241b35] to-[#171717]",
      accent: "#cd408f",
      tag: "AI & AGENTS",
    },
    "Engenharia de Dados": {
      bg: "from-[#111827] via-[#0f2922] to-[#171717]",
      accent: "#009767",
      tag: "DATA ENG",
    },
    "Bancos & Finanças": {
      bg: "from-[#171717] via-[#1e293b] to-[#0f172a]",
      accent: "#ffa800",
      tag: "BANKING & RISK",
    },
    "Carreira & Estratégia": {
      bg: "from-[#171717] via-[#272727] to-[#171717]",
      accent: "#6254ff",
      tag: "STRATEGY",
    },
  }
  const p = paletas[categoria] || paletas["IA & Agentes"]

  return (
    <div
      className={`relative aspect-[16/10] w-full overflow-hidden rounded-lg border border-line bg-gradient-to-br ${p.bg} p-4 text-paper transition duration-300 group-hover:scale-[1.02] flex flex-col justify-between`}
    >
      {/* Grade geométrica sutil de fundo */}
      <div
        className="pointer-events-none absolute inset-0 opacity-15"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.45) 1px, transparent 0)",
          backgroundSize: "18px 18px",
        }}
      />
      <div className="relative z-10 flex items-center justify-end">
        <span
          className="rounded px-1.5 py-0.5 font-mono text-[10px] font-bold tracking-wider uppercase"
          style={{ backgroundColor: "rgba(255,255,255,0.12)", color: "#ffffff" }}
        >
          #{edicao}
        </span>
      </div>

      <div className="relative z-10 space-y-1.5">
        <div className="flex items-center gap-1.5">
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ backgroundColor: p.accent }}
          />
          <span className="font-mono text-[10px] tracking-widest text-paper/70 uppercase">
            {p.tag}
          </span>
        </div>
        <p className="line-clamp-2 text-xs font-bold leading-snug text-paper/95">
          {titulo}
        </p>
      </div>
    </div>
  )
}

/* Renderizador Editorial no padrão The Rundown AI (675px column, #ffa800 links, table-c callouts) */
function renderizarMarkdownRundown(md: string) {
  const linhas = md.split(/\r?\n/)
  const elementos: React.ReactNode[] = []
  let idx = 0

  for (let i = 0; i < linhas.length; i++) {
    const linha = linhas[i].trim()
    if (!linha) continue

    // Ignora título H1/H2 inicial repetido
    if (i < 4 && (linha.startsWith("# ") || linha.startsWith("## "))) {
      continue
    }

    if (linha === "---") {
      elementos.push(<hr key={idx++} className="my-8 border-line" />)
      continue
    }

    if (linha.startsWith("### ")) {
      elementos.push(
        <h3
          key={idx++}
          className="mt-9 mb-3 text-[22px] font-bold leading-[1.25] tracking-tight text-ink"
        >
          {formatarInlineRundown(linha.slice(4))}
        </h3>
      )
      continue
    }

    if (linha.startsWith("## ")) {
      elementos.push(
        <h2
          key={idx++}
          className="mt-10 mb-4 text-2xl font-bold leading-tight tracking-tight text-ink"
        >
          {formatarInlineRundown(linha.slice(3))}
        </h2>
      )
      continue
    }

    if (linha.startsWith("> ")) {
      const textoCallout = linha.slice(2)
      const isPergunta = textoCallout.includes("🎯")
      elementos.push(
        <div
          key={idx++}
          className={`my-6 rounded-xl border p-5 text-[16px] leading-[1.65] ${
            isPergunta
              ? "border-emerald-200 bg-emerald-50/70 text-ink"
              : "border-line bg-mist text-ink"
          }`}
        >
          {formatarInlineRundown(textoCallout)}
        </div>
      )
      continue
    }

    if (linha.startsWith("- ") || linha.startsWith("* ") || linha.startsWith("• ")) {
      elementos.push(
        <div
          key={idx++}
          className="my-2.5 flex items-start gap-3 pl-1 text-[17px] leading-[1.68] text-ink/90"
        >
          <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-ink" />
          <div className="flex-1">{formatarInlineRundown(linha.slice(2))}</div>
        </div>
      )
      continue
    }

    if (/^\d+\.\s+/.test(linha)) {
      const m = linha.match(/^(\d+)\.\s+(.*)$/)
      if (m) {
        elementos.push(
          <div
            key={idx++}
            className="my-3 flex items-start gap-3 pl-1 text-[17px] leading-[1.68] text-ink/90"
          >
            <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-ink text-xs font-bold text-paper">
              {m[1]}
            </span>
            <div className="flex-1">{formatarInlineRundown(m[2])}</div>
          </div>
        )
        continue
      }
    }

    elementos.push(
      <p key={idx++} className="my-4 text-[17px] leading-[1.7] text-ink/90">
        {formatarInlineRundown(linha)}
      </p>
    )
  }

  return elementos
}

function formatarInlineRundown(texto: string): React.ReactNode {
  const partes = texto.split(/(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g)
  return partes.map((parte, i) => {
    if (parte.startsWith("**") && parte.endsWith("**")) {
      return (
        <strong key={i} className="font-bold text-ink">
          {parte.slice(2, -2)}
        </strong>
      )
    }
    if (parte.startsWith("`") && parte.endsWith("`")) {
      return (
        <code
          key={i}
          className="rounded border border-line bg-mist px-1.5 py-0.5 font-mono text-[13px] font-medium text-ink"
        >
          {parte.slice(1, -1)}
        </code>
      )
    }
    const linkMatch = parte.match(/^\[([^\]]+)\]\(([^)]+)\)$/)
    if (linkMatch) {
      return (
        <a
          key={i}
          href={linkMatch[2]}
          target="_blank"
          rel="noreferrer"
          className="rundown-article-link"
        >
          {linkMatch[1]}
        </a>
      )
    }
    return parte
  })
}

export default function App() {
  // Modos: "public" (Portal & Artigos), "design" (Design System The Rundown), "admin" (Estúdio Editorial)
  const [modo, setModo] = useState<"public" | "design" | "admin">("public")
  const [abaAdmin, setAbaAdmin] = useState<"editor" | "acervo" | "inscritos" | "stack">("editor")

  // Estado Público
  const [edicoes, setEdicoes] = useState<Edition[]>([])
  const [categoriaAtiva, setCategoriaAtiva] = useState<string>("Todas")
  const [busca, setBusca] = useState<string>("")
  const [edicaoAberta, setEdicaoAberta] = useState<Edition | null>(null)
  const [carregando, setCarregando] = useState<boolean>(true)
  const [copiadoMsg, setCopiadoMsg] = useState<string>("")

  // Inscrição de Leitores
  const [subEmail, setSubEmail] = useState("")
  const [subArea, setSubArea] = useState("TI & Dados")
  const [subMsg, setSubMsg] = useState("")

  // Copiloto RAG (Vídeo 13)
  const [perguntaRag, setPerguntaRag] = useState("")
  const [respostaRag, setRespostaRag] = useState<NewsletterAskResult | null>(null)
  const [buscandoRag, setBuscandoRag] = useState(false)

  // Estado Administrativo
  const [adminToken, setAdminToken] = useState<string>(() => localStorage.getItem("dd_admin_token") || "")
  const [senhaInput, setSenhaInput] = useState("")
  const [erroLogin, setErroLogin] = useState("")
  const [stats, setStats] = useState<NewsletterStats | null>(null)
  const [edicoesAdmin, setEdicoesAdmin] = useState<Edition[]>([])
  const [inscritos, setInscritos] = useState<Subscriber[]>([])
  const [avisoAdmin, setAvisoAdmin] = useState("")

  // Editor + Agente IA (Vídeo 14)
  const [temaIA, setTemaIA] = useState("")
  const [termoIA, setTermoIA] = useState("")
  const [gerandoIA, setGerandoIA] = useState(false)
  const [previewEditor, setPreviewEditor] = useState(false)

  const [formEdicao, setFormEdicao] = useState({
    edicao: "33",
    titulo: "",
    subtitulo: "",
    categoria: "IA & Agentes",
    data: new Date().toLocaleDateString("pt-BR"),
    tempo_leitura: "4",
    status: "published",
    seo_titulo: "",
    seo_descricao: "",
    post_divulgacao: "",
    conteudo_markdown: "",
  })

  // Status da Stack IA (Vídeo 11)
  const [apiOnline, setApiOnline] = useState<boolean | null>(null)
  const [taskPrompt, setTaskPrompt] = useState("Resumir tendências de IA para bancos em 3 pontos")
  const [taskStatus, setTaskStatus] = useState<TaskStatus | null>(null)

  async function carregarPortalPublico() {
    setCarregando(true)
    try {
      const lista = await api<Edition[]>("/api/newsletter/editions")
      setEdicoes(lista)
      setApiOnline(true)
    } catch {
      setApiOnline(false)
    } finally {
      setCarregando(false)
    }
  }

  async function carregarDadosAdmin(token = adminToken) {
    if (!token) return
    try {
      const [st, todas, subs] = await Promise.all([
        api<NewsletterStats>("/api/newsletter/stats"),
        api<Edition[]>("/api/newsletter/editions?include_drafts=true"),
        api<Subscriber[]>("/api/newsletter/subscribers", {
          headers: { "X-Admin-Token": token },
        }),
      ])
      setStats(st)
      setEdicoesAdmin(todas)
      setInscritos(subs)
      if (!formEdicao.titulo && st.proxima_edicao) {
        setFormEdicao((f) => ({ ...f, edicao: st.proxima_edicao }))
      }
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    carregarPortalPublico()
  }, [])

  useEffect(() => {
    if (modo === "admin" && adminToken) {
      carregarDadosAdmin(adminToken)
    }
  }, [modo, adminToken])

  const edicoesFiltradas = useMemo(() => {
    return edicoes.filter((e) => {
      const okCat = categoriaAtiva === "Todas" || e.categoria === categoriaAtiva
      const termo = busca.trim().toLowerCase()
      const okBusca =
        !termo ||
        e.titulo.toLowerCase().includes(termo) ||
        e.subtitulo.toLowerCase().includes(termo) ||
        e.conteudo_markdown.toLowerCase().includes(termo) ||
        e.edicao.includes(termo)
      return okCat && okBusca
    })
  }, [edicoes, categoriaAtiva, busca])

  const edicaoDestaque = edicoes[0] || null

  async function inscreverLeitor(e: React.FormEvent) {
    e.preventDefault()
    if (!subEmail.trim()) return
    try {
      await post("/api/newsletter/subscribe", {
        email: subEmail,
        nome: "",
        area: subArea,
      })
      setSubMsg("✓ Inscrição confirmada! Bem-vindo à Decifrando Dados.")
      setSubEmail("")
    } catch (err) {
      setSubMsg(err instanceof Error ? err.message : "Erro ao realizar inscrição.")
    }
  }

  async function consultarCopilotoRag(perguntaCustom?: string) {
    const q = (perguntaCustom ?? perguntaRag).trim()
    if (!q) return
    if (perguntaCustom) setPerguntaRag(perguntaCustom)
    setBuscandoRag(true)
    try {
      const res = await post<NewsletterAskResult>("/api/newsletter/ask", {
        question: q,
        top_k: 3,
      })
      setRespostaRag(res)
    } catch (err) {
      setRespostaRag({
        answer: err instanceof Error ? err.message : "Erro ao consultar o acervo.",
        citations: [],
      })
    } finally {
      setBuscandoRag(false)
    }
  }

  async function fazerLoginAdmin(senha?: string) {
    setErroLogin("")
    const pwd = senha ?? senhaInput
    try {
      const res = await post<{ authenticated: boolean; token: string }>("/api/newsletter/auth", {
        password: pwd,
      })
      localStorage.setItem("dd_admin_token", res.token)
      setAdminToken(res.token)
      await carregarDadosAdmin(res.token)
    } catch (err) {
      setErroLogin(err instanceof Error ? err.message : "Senha incorreta.")
    }
  }

  async function acionarGeradorIA(publicarDireto = false) {
    if (!temaIA.trim()) {
      setAvisoAdmin("Informe um tema para o Agente Mistral AI gerar a edição.")
      return
    }
    setGerandoIA(true)
    setAvisoAdmin("")
    try {
      if (publicarDireto) {
        const res = await post<{ edition: Edition; motor_ia: string }>(
          "/api/newsletter/ai-build",
          {
            tema: temaIA,
            edicao: formEdicao.edicao,
            termo_tecnico: termoIA,
          },
          { "X-Admin-Token": adminToken }
        )
        const ed = res.edition
        setFormEdicao({
          edicao: ed.edicao,
          titulo: ed.titulo,
          subtitulo: ed.subtitulo,
          categoria: ed.categoria,
          data: ed.data,
          tempo_leitura: ed.tempo_leitura || "4",
          status: ed.status,
          seo_titulo: ed.seo_titulo,
          seo_descricao: ed.seo_descricao,
          post_divulgacao: ed.post_divulgacao,
          conteudo_markdown: ed.conteudo_markdown,
        })
        setAvisoAdmin(
          `🚀 Edição #${ed.edicao} ("${ed.titulo}") gerada via ${res.motor_ia} e publicada no site!`
        )
        await carregarPortalPublico()
        await carregarDadosAdmin()
        return
      }

      const draft = await post<
        Omit<Edition, "id" | "slug" | "edicao" | "data" | "status"> & { motor_ia?: string }
      >(
        "/api/newsletter/ai-draft",
        {
          tema: temaIA,
          edicao: formEdicao.edicao,
          termo_tecnico: termoIA,
        },
        { "X-Admin-Token": adminToken }
      )
      setFormEdicao((f) => ({
        ...f,
        titulo: draft.titulo,
        subtitulo: draft.subtitulo,
        categoria: draft.categoria,
        tempo_leitura: draft.tempo_leitura || "4",
        seo_titulo: draft.seo_titulo,
        seo_descricao: draft.seo_descricao,
        post_divulgacao: draft.post_divulgacao,
        conteudo_markdown: draft.conteudo_markdown,
      }))
      setAvisoAdmin(
        `✨ Rascunho completo gerado via ${draft.motor_ia || "Mistral AI"} no padrão 5 Blocos + 3 Lentes!`
      )
    } catch (err) {
      setAvisoAdmin(err instanceof Error ? err.message : "Falha ao gerar edição.")
    } finally {
      setGerandoIA(false)
    }
  }

  async function salvarEPublicarEdicao() {
    if (!formEdicao.titulo.trim() || !formEdicao.conteudo_markdown.trim()) {
      setAvisoAdmin("Preencha pelo menos o Título e o Conteúdo da edição.")
      return
    }
    try {
      const salvo = await post<Edition>("/api/newsletter/editions", formEdicao, {
        "X-Admin-Token": adminToken,
      })
      setAvisoAdmin(`✅ Edição #${salvo.edicao} ("${salvo.titulo}") salva com status: ${salvo.status.toUpperCase()}!`)
      await carregarPortalPublico()
      await carregarDadosAdmin()
    } catch (err) {
      setAvisoAdmin(err instanceof Error ? err.message : "Erro ao salvar edição.")
    }
  }

  function carregarEdicaoNoEditor(ed: Edition) {
    setFormEdicao({
      edicao: ed.edicao,
      titulo: ed.titulo,
      subtitulo: ed.subtitulo,
      categoria: ed.categoria,
      data: ed.data,
      tempo_leitura: ed.tempo_leitura,
      status: ed.status,
      seo_titulo: ed.seo_titulo,
      seo_descricao: ed.seo_descricao,
      post_divulgacao: ed.post_divulgacao,
      conteudo_markdown: ed.conteudo_markdown,
    })
    setModo("admin")
    setAbaAdmin("editor")
    setAvisoAdmin(`✏️ Editando Edição #${ed.edicao}`)
  }

  async function excluirEdicao(num: string) {
    try {
      await api(`/api/newsletter/editions/${num}`, {
        method: "DELETE",
        headers: { "X-Admin-Token": adminToken },
      })
      setAvisoAdmin(`🗑️ Edição #${num} removida.`)
      await carregarPortalPublico()
      await carregarDadosAdmin()
    } catch (err) {
      setAvisoAdmin(err instanceof Error ? err.message : "Erro ao excluir.")
    }
  }

  async function sincronizarPastaLocal() {
    try {
      const r = await post<{ imported: number; total: number }>(
        "/api/newsletter/sync",
        {},
        { "X-Admin-Token": adminToken }
      )
      setAvisoAdmin(`🔄 Pasta local sincronizada! ${r.imported} arquivos lidos (${r.total} edições no acervo).`)
      await carregarPortalPublico()
      await carregarDadosAdmin()
    } catch (err) {
      setAvisoAdmin(err instanceof Error ? err.message : "Erro ao sincronizar.")
    }
  }

  async function importarArquivoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const fd = new FormData()
    fd.append("file", file)
    try {
      const res = await fetch("/api/newsletter/import", {
        method: "POST",
        headers: { "X-Admin-Token": adminToken },
        body: fd,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.detail || "Falha ao importar arquivo.")
      setAvisoAdmin(`📥 Importação concluída: ${data.imported_count} edição(ões) adicionada(s) ao site!`)
      await carregarPortalPublico()
      await carregarDadosAdmin()
    } catch (err) {
      setAvisoAdmin(err instanceof Error ? err.message : "Erro no upload.")
    } finally {
      e.target.value = ""
    }
  }

  function copiarPacoteLinkedIn() {
    const pacote = [
      `=== METADADOS SEO ===`,
      `SEO Título: ${formEdicao.seo_titulo || formEdicao.titulo}`,
      `SEO Descrição: ${formEdicao.seo_descricao || formEdicao.subtitulo}`,
      ``,
      `=== POST DE DIVULGAÇÃO (FEED) ===`,
      formEdicao.post_divulgacao,
      ``,
      `=== ARTIGO COMPLETO (NEWSLETTER) ===`,
      formEdicao.conteudo_markdown,
    ].join("\n")
    navigator.clipboard.writeText(pacote)
    setAvisoAdmin("📋 Pacote completo (SEO + Post + Artigo) copiado para a área de transferência!")
  }

  function exportarInscritosCSV() {
    const header = "Nome,Email,Area,Data\n"
    const rows = inscritos
      .map((s) => `"${s.nome}","${s.email}","${s.area}","${s.created_at}"`)
      .join("\n")
    const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "inscritos_decifrando_dados.csv"
    a.click()
  }

  function abrirEdicao(ed: Edition) {
    setEdicaoAberta(ed)
    setModo("public")
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  return (
    <div className="min-h-screen bg-paper text-ink">
      {/* =================================================================== */}
      {/* STICKY HEADER (68px — PADRÃO EXATO THE RUNDOWN AI)                  */}
      {/* =================================================================== */}
      <header className="sticky top-0 z-50 border-b border-line bg-paper/95 backdrop-blur transition-colors duration-300">
        <div className="mx-auto flex h-[68px] max-w-7xl items-center justify-between px-5">
          {/* Logo Monograma + Marca */}
          <button
            onClick={() => {
              setModo("public")
              setEdicaoAberta(null)
              window.scrollTo({ top: 0, behavior: "smooth" })
            }}
            className="flex items-center gap-3 text-left group"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-ink font-black text-sm tracking-tighter text-paper transition group-hover:opacity-85">
              DD
            </div>
            <div className="flex flex-col">
              <span className="text-[17px] font-bold leading-none tracking-tight text-ink">
                Decifrando Dados
              </span>
              <span className="mt-1 text-[11px] font-medium text-mute">
                por Marlon Ferreira
              </span>
            </div>
          </button>

          {/* Navegação Central com sublinhado animado (.rundown-nav-link) */}
          <nav className="hidden items-center gap-7 md:flex">
            <button
              onClick={() => {
                setModo("public")
                setEdicaoAberta(null)
              }}
              className="rundown-nav-link text-[15px] font-medium text-ink/90 hover:opacity-70"
            >
              Edições
            </button>
            {edicaoDestaque && (
              <button
                onClick={() => abrirEdicao(edicaoDestaque)}
                className="rundown-nav-link text-[15px] font-medium text-ink/90 hover:opacity-70"
              >
                Artigo #{edicaoDestaque.edicao}
              </button>
            )}
            <button
              onClick={() => {
                setModo("public")
                setEdicaoAberta(null)
                setTimeout(() => {
                  document.getElementById("copiloto-rag")?.scrollIntoView({ behavior: "smooth" })
                }, 80)
              }}
              className="rundown-nav-link text-[15px] font-medium text-ink/90 hover:opacity-70"
            >
              Copiloto IA
            </button>
            <button
              onClick={() => setModo("design")}
              className={`rundown-nav-link text-[15px] font-medium ${
                modo === "design" ? "font-bold text-ink" : "text-ink/90 hover:opacity-70"
              }`}
            >
              Design System
            </button>
            <a
              href="https://www.linkedin.com/newsletters/decifrando-dados-7513791689808064512/"
              target="_blank"
              rel="noreferrer"
              className="rundown-nav-link inline-flex items-center gap-1 text-[15px] font-medium text-ink/90 hover:opacity-70"
            >
              LinkedIn <ArrowUpRight className="h-3.5 w-3.5" />
            </a>
          </nav>

          {/* Ações à Direita */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setModo(modo === "design" ? "public" : "design")}
              className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-paper px-3 py-2 text-xs font-semibold text-ink transition hover:bg-mist md:hidden"
            >
              <Palette className="h-3.5 w-3.5" /> DS
            </button>

            {modo !== "admin" ? (
              <button
                onClick={() => setModo("admin")}
                className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-paper px-3.5 py-2 text-sm font-medium text-ink transition hover:bg-mist"
              >
                <Lock className="h-3.5 w-3.5" /> Área Admin
              </button>
            ) : (
              <button
                onClick={() => setModo("public")}
                className="inline-flex items-center gap-1.5 rounded-lg bg-ink px-3.5 py-2 text-sm font-semibold text-paper transition hover:bg-black"
              >
                <BookOpen className="h-3.5 w-3.5" /> Ver Site Público
              </button>
            )}
          </div>
        </div>
      </header>

      {/* =================================================================== */}
      {/* MODO 1: PORTAL PÚBLICO & LEITOR DE ARTIGOS (THE RUNDOWN AI LAYOUT)  */}
      {/* =================================================================== */}
      {modo === "public" && (
        <>
          {edicaoAberta ? (
            /* =============================================================== */
            /* PÁGINA DE ARTIGO (RÉPLICA EXATA DE therundown.ai/articles/...)  */
            /* =============================================================== */
            <div>
              <article className="mx-auto max-w-[675px] px-5 py-12">
                {/* Topo: Voltar + Pill Esmeralda */}
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => setEdicaoAberta(null)}
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-ink/70 transition hover:text-ink"
                  >
                    <ArrowLeft className="h-4 w-4" /> Todas as edições
                  </button>
                  <span className="font-mono text-xs font-semibold text-mute">
                    EDIÇÃO #{edicaoAberta.edicao}
                  </span>
                </div>

                {/* Pill de Categoria Esmeralda (idêntico a border-emerald-200 text-emerald-600) */}
                <div className="mt-6 inline-block rounded-md border border-emerald-200 bg-emerald-50/60 px-3 py-1 text-sm font-semibold text-emerald-600">
                  {edicaoAberta.categoria}
                </div>

                {/* Headline Principal (mt-4 text-2xl font-bold leading-tight md:text-5xl) */}
                <h1 className="mt-4 text-2xl font-bold leading-tight tracking-tight text-ink md:text-5xl">
                  {edicaoAberta.titulo}
                </h1>

                {/* Deck / Subtítulo (mt-3 text-base md:text-lg text-ink/80) */}
                {edicaoAberta.subtitulo && (
                  <p className="mt-3 text-base leading-relaxed text-ink/80 md:text-lg">
                    <strong className="font-semibold text-ink">MAIS:</strong> {edicaoAberta.subtitulo}
                  </p>
                )}

                {/* Barra de Autor, Data e Botões Circulares de Compartilhamento */}
                <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-b border-line pb-6">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-ink text-xs font-bold text-paper">
                      MF
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-ink">Marlon Ferreira</div>
                      <div className="text-xs text-mute">
                        {edicaoAberta.data} • {edicaoAberta.tempo_leitura} min de leitura
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {copiadoMsg && (
                      <span className="text-xs font-medium text-emerald-600">{copiadoMsg}</span>
                    )}
                    <button
                      title="Copiar link do artigo"
                      onClick={() => {
                        navigator.clipboard.writeText(window.location.href)
                        setCopiadoMsg("Link copiado!")
                        setTimeout(() => setCopiadoMsg(""), 2000)
                      }}
                      className="rounded-full border border-line p-2.5 text-ink/70 transition hover:bg-mist hover:text-ink"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                    <a
                      title="Ver Newsletter no LinkedIn"
                      href="https://www.linkedin.com/newsletters/decifrando-dados-7513791689808064512/"
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-full border border-line p-2.5 text-ink/70 transition hover:bg-mist hover:text-ink"
                    >
                      <Share2 className="h-4 w-4" />
                    </a>
                    {adminToken && (
                      <button
                        title="Editar esta edição no Estúdio Admin"
                        onClick={() => carregarEdicaoNoEditor(edicaoAberta)}
                        className="rounded-full border border-line p-2.5 text-ink/70 transition hover:bg-mist hover:text-ink"
                      >
                        <PenTool className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Corpo do Artigo (beehiiv-content mt-8) */}
                <div className="beehiiv-content mt-8">
                  {renderizarMarkdownRundown(edicaoAberta.conteudo_markdown)}
                </div>

                {/* Fechamento Assinatura The Rundown */}
                <div className="mt-12 rounded-2xl border border-line bg-mist p-6">
                  <h3 className="text-lg font-bold text-ink">
                    Isso é tudo na edição #{edicaoAberta.edicao} da Decifrando Dados!
                  </h3>
                  <p className="mt-1 text-sm text-ink/75">
                    Curadoria e autoria de <strong>Marlon Ferreira</strong> —{" "}
                    <em>&ldquo;Smart people are cooler.&rdquo;</em>
                  </p>
                </div>
              </article>

              {/* SEÇÃO INFERIOR: RECENT NEWSLETTERS (4 COLUNAS — PADRÃO THE RUNDOWN) */}
              <section className="border-t border-line px-5 py-16">
                <div className="mx-auto max-w-7xl">
                  <div className="flex items-center justify-between">
                    <h2 className="text-3xl font-bold tracking-tight text-ink">
                      Edições Recentes
                    </h2>
                    <button
                      onClick={() => setEdicaoAberta(null)}
                      className="inline-flex items-center gap-2 rounded-lg border border-line px-5 py-2.5 text-sm font-semibold text-ink transition hover:bg-mist"
                    >
                      Ver Todas <ArrowUpRight className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                    {edicoes
                      .filter((e) => e.edicao !== edicaoAberta.edicao)
                      .slice(0, 4)
                      .map((ed) => (
                        <button
                          key={ed.edicao}
                          onClick={() => abrirEdicao(ed)}
                          className="group relative block text-left"
                        >
                          <span className="absolute top-3 left-3 z-10 rounded-md bg-paper px-2 py-0.5 text-xs font-semibold text-ink shadow">
                            {ed.categoria}
                          </span>
                          <CapaEditorialCard
                            edicao={ed.edicao}
                            categoria={ed.categoria}
                            titulo={ed.titulo}
                          />
                          <h3 className="mt-3 text-[17px] font-bold leading-snug text-ink group-hover:underline">
                            {ed.titulo}
                          </h3>
                          <p className="mt-2 text-xs text-mute">
                            Edição #{ed.edicao} • {ed.data} • {ed.tempo_leitura} min
                          </p>
                        </button>
                      ))}
                  </div>
                </div>
              </section>
            </div>
          ) : (
            /* =============================================================== */
            /* PÁGINA INICIAL (HERO THE RUNDOWN + GRID 4 COLUNAS + RAG)        */
            /* =============================================================== */
            <div>
              {/* HERO CENTRALIZADO THE RUNDOWN AI */}
              <section className="border-b border-line px-5 pt-14 pb-16 text-center md:pt-20 md:pb-24">
                <div className="mx-auto max-w-4xl">
                  <div className="inline-flex items-center gap-2 rounded-full border border-line bg-mist px-3.5 py-1 text-xs font-semibold text-ink">
                    <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Smart people are cooler • TI, Setor Bancário & Negócios</span>
                  </div>

                  <h1 className="mx-auto mt-6 max-w-3xl text-[2rem] font-bold leading-[1.12] tracking-tight text-ink md:text-7xl md:leading-[1.06]">
                    Decifre Dados & IA em{" "}
                    <br className="hidden md:block" />
                    <span className="text-gradient">4 minutos</span> por semana.
                  </h1>

                  <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-ink/75 md:text-lg">
                    Receba análises práticas de <strong>Marlon Ferreira</strong> sobre Ciência de Dados,
                    Engenharia, Lakehouse e Agentes de IA — sem enrolação acadêmica e com impacto direto em{" "}
                    <strong>TI, Bancos e Negócios</strong>.
                  </p>

                  {/* PÍLULA DE INSCRIÇÃO EMBUTIDA (IDÊNTICA AO THE RUNDOWN) */}
                  <div className="mx-auto mt-8 w-full max-w-lg">
                    <form
                      onSubmit={inscreverLeitor}
                      className="flex items-center overflow-hidden rounded-xl bg-paper p-1.5 shadow-lg ring-1 ring-black/10"
                    >
                      <input
                        type="email"
                        required
                        value={subEmail}
                        onChange={(e) => setSubEmail(e.target.value)}
                        placeholder="Digite seu e-mail profissional..."
                        className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-sm text-ink outline-none placeholder:text-mute"
                      />
                      <button
                        type="submit"
                        className="flex shrink-0 items-center gap-1.5 rounded-lg bg-ink px-5 py-2.5 text-sm font-semibold text-paper transition hover:bg-black"
                      >
                        Inscrever-se
                      </button>
                    </form>

                    {/* Seletor das 3 Lentes */}
                    <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-xs text-mute">
                      <span>Sua lente principal:</span>
                      {["TI & Dados", "Bancos & Finanças", "Negócios"].map((lente) => (
                        <button
                          key={lente}
                          type="button"
                          onClick={() => setSubArea(lente)}
                          className={`rounded-full px-2.5 py-0.5 font-medium transition ${
                            subArea === lente
                              ? "bg-ink text-paper"
                              : "bg-mist text-ink/75 hover:bg-line"
                          }`}
                        >
                          {lente}
                        </button>
                      ))}
                    </div>

                    {subMsg && (
                      <p className="mt-3 text-xs font-semibold text-emerald-600">{subMsg}</p>
                    )}
                  </div>
                </div>
              </section>

              {/* ARTIGO EM DESTAQUE + ARQUIVO EM 4 COLUNAS */}
              <section className="mx-auto max-w-7xl px-5 py-16 space-y-12">
                {/* Cabeçalho de Seção + Busca + Pílulas de Categoria */}
                <div className="flex flex-col justify-between gap-6 border-b border-line pb-6 lg:flex-row lg:items-end">
                  <div>
                    <span className="font-mono text-xs font-bold tracking-widest text-mute uppercase">
                      ARQUIVO OFICIAL
                    </span>
                    <h2 className="mt-1 text-3xl font-bold tracking-tight md:text-5xl text-gradient-dark">
                      Últimas Edições
                    </h2>
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <div className="flex flex-wrap gap-1.5">
                      {CATEGORIAS.map((cat) => (
                        <button
                          key={cat}
                          onClick={() => setCategoriaAtiva(cat)}
                          className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                            categoriaAtiva === cat
                              ? "bg-ink text-paper"
                              : "border border-line bg-paper text-ink hover:bg-mist"
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>

                    <div className="relative w-full sm:w-64">
                      <Search className="pointer-events-none absolute top-2.5 left-3 h-4 w-4 text-mute" />
                      <input
                        value={busca}
                        onChange={(e) => setBusca(e.target.value)}
                        placeholder="Buscar edição ou tema..."
                        className="w-full rounded-lg border border-line bg-paper py-2 pr-3 pl-9 text-xs text-ink outline-none focus:border-ink"
                      />
                    </div>
                  </div>
                </div>

                {/* EDIÇÃO EM DESTAQUE (HERO CARD HORIZONTAL) */}
                {edicaoDestaque && categoriaAtiva === "Todas" && !busca && (
                  <div
                    onClick={() => abrirEdicao(edicaoDestaque)}
                    className="group grid cursor-pointer gap-6 rounded-2xl border border-line bg-paper p-5 transition hover:border-ink/40 hover:shadow-md md:grid-cols-12 md:items-center md:p-7"
                  >
                    <div className="relative md:col-span-5">
                      <span className="absolute top-3 left-3 z-10 rounded-md bg-paper px-2.5 py-1 text-xs font-semibold text-ink shadow">
                        Destaque • Edição #{edicaoDestaque.edicao}
                      </span>
                      <CapaEditorialCard
                        edicao={edicaoDestaque.edicao}
                        categoria={edicaoDestaque.categoria}
                        titulo={edicaoDestaque.titulo}
                      />
                    </div>

                    <div className="space-y-3 md:col-span-7">
                      <div className="flex items-center gap-2.5">
                        <span className="inline-block rounded-md border border-emerald-200 bg-emerald-50/70 px-2.5 py-0.5 text-xs font-semibold text-emerald-600">
                          {edicaoDestaque.categoria}
                        </span>
                        <span className="text-xs text-mute">
                          {edicaoDestaque.data} • {edicaoDestaque.tempo_leitura} min de leitura
                        </span>
                      </div>

                      <h3 className="text-2xl font-bold leading-tight tracking-tight text-ink group-hover:underline md:text-3xl">
                        {edicaoDestaque.titulo}
                      </h3>

                      <p className="line-clamp-3 text-sm leading-relaxed text-ink/75 md:text-base">
                        {edicaoDestaque.subtitulo}
                      </p>

                      <div className="pt-2">
                        <span className="inline-flex items-center gap-1.5 text-sm font-bold text-ink">
                          Ler artigo completo <ArrowUpRight className="h-4 w-4" />
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* GRID DE 4 COLUNAS (PADRÃO RECENT NEWSLETTERS THE RUNDOWN) */}
                {carregando ? (
                  <p className="py-12 text-center text-sm text-mute">Carregando edições...</p>
                ) : edicoesFiltradas.length === 0 ? (
                  <div className="rounded-2xl border border-line bg-mist py-12 text-center text-sm text-mute">
                    Nenhuma edição encontrada para este filtro.
                  </div>
                ) : (
                  <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                    {edicoesFiltradas.map((ed) => (
                      <button
                        key={ed.edicao}
                        onClick={() => abrirEdicao(ed)}
                        className="group relative flex flex-col justify-between text-left"
                      >
                        <div>
                          <span className="absolute top-3 left-3 z-10 rounded-md bg-paper px-2 py-0.5 text-xs font-semibold text-ink shadow">
                            {ed.categoria}
                          </span>
                          <CapaEditorialCard
                            edicao={ed.edicao}
                            categoria={ed.categoria}
                            titulo={ed.titulo}
                          />
                          <h3 className="mt-3 text-[17px] font-bold leading-snug text-ink group-hover:underline">
                            {ed.titulo}
                          </h3>
                          <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-ink/70">
                            {ed.subtitulo}
                          </p>
                        </div>
                        <p className="mt-3 text-xs font-medium text-mute">
                          Edição #{ed.edicao} • {ed.data} • {ed.tempo_leitura} min
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </section>

              {/* COPILOTO RAG DO ACERVO (VÍDEO 13 — DOCUMENT COPILOT NO ESTILO THE RUNDOWN) */}
              <section id="copiloto-rag" className="border-t border-line bg-mist/60 px-5 py-16">
                <div className="mx-auto max-w-5xl">
                  <div className="rounded-3xl border border-line bg-paper p-6 shadow-xs sm:p-10">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-600">
                        <Bot className="h-3.5 w-3.5" /> Document Copilot • RAG Híbrido
                      </span>
                      <span className="font-mono text-xs text-mute">
                        RESPOSTAS COM CITAÇÃO DE FONTE
                      </span>
                    </div>

                    <h2 className="mt-3 text-2xl font-bold tracking-tight text-ink md:text-4xl">
                      Pergunte ao Acervo da Decifrando Dados
                    </h2>
                    <p className="mt-2 text-sm text-ink/75 md:text-base">
                      Faça qualquer pergunta sobre Engenharia de Dados, Lakehouse, IA ou Carreira. O copiloto consulta as edições publicadas por Marlon Ferreira e cita a fonte exata.
                    </p>

                    <div className="mt-6 flex flex-col gap-2.5 sm:flex-row">
                      <input
                        value={perguntaRag}
                        onChange={(e) => setPerguntaRag(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && consultarCopilotoRag()}
                        placeholder="Ex.: Vale a pena trocar Spark por DuckDB e Apache Iceberg?"
                        className="flex-1 rounded-xl border border-line bg-mist/60 px-4 py-3 text-sm text-ink outline-none focus:border-ink focus:bg-paper"
                      />
                      <button
                        onClick={() => consultarCopilotoRag()}
                        disabled={buscandoRag}
                        className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-ink px-6 py-3 text-sm font-semibold text-paper transition hover:bg-black disabled:opacity-50"
                      >
                        <Send className="h-4 w-4" />
                        {buscandoRag ? "Buscando..." : "Perguntar"}
                      </button>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {[
                        "DuckDB vs Spark em 2026",
                        "Qual o risco de privacidade do Muse Wonder da Meta?",
                        "Como montar um Lakehouse com Iceberg?",
                        "O que mais importa em Ciência de Dados na prática?",
                      ].map((sugestao) => (
                        <button
                          key={sugestao}
                          onClick={() => consultarCopilotoRag(sugestao)}
                          className="rounded-lg border border-line bg-paper px-3 py-1 text-xs font-medium text-ink/80 transition hover:bg-mist hover:text-ink"
                        >
                          {sugestao}
                        </button>
                      ))}
                    </div>

                    {respostaRag && (
                      <div className="mt-6 rounded-2xl border border-line bg-mist/50 p-5 space-y-4">
                        <div className="text-sm leading-relaxed text-ink">
                          {renderizarMarkdownRundown(respostaRag.answer)}
                        </div>
                        {respostaRag.citations.length > 0 && (
                          <div className="border-t border-line pt-4">
                            <p className="mb-2.5 font-mono text-[11px] font-bold tracking-wider text-mute uppercase">
                              Edições Citadas (clique para abrir o artigo):
                            </p>
                            <div className="grid gap-3 sm:grid-cols-3">
                              {respostaRag.citations.map((c) => {
                                const edEncontrada = edicoes.find((x) => x.edicao === c.edicao)
                                return (
                                  <button
                                    key={c.number}
                                    onClick={() => edEncontrada && abrirEdicao(edEncontrada)}
                                    className="rounded-xl border border-line bg-paper p-3 text-left transition hover:border-ink"
                                  >
                                    <div className="flex items-center justify-between text-xs font-bold text-ink">
                                      <span>[{c.number}] Edição #{c.edicao}</span>
                                      <span className="text-mute">{c.data}</span>
                                    </div>
                                    <p className="mt-1 line-clamp-1 text-xs font-semibold text-ink">
                                      {c.titulo}
                                    </p>
                                    <p className="mt-1 line-clamp-2 text-[11px] text-mute">
                                      {c.snippet}
                                    </p>
                                  </button>
                                )
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </section>

              {/* BLOCO ESCURO ASSINATURA THE RUNDOWN (.bg-gradient-dark — "Stay Ahead on AI") */}
              <section className="px-5 py-20">
                <div className="mx-auto max-w-4xl rounded-3xl bg-gradient-dark px-6 py-16 text-center text-paper">
                  <h2 className="text-2xl font-bold tracking-tight text-paper md:text-4xl">
                    Fique à Frente em Dados & IA.
                  </h2>
                  <p className="mx-auto mt-4 max-w-md text-base text-paper/80 md:text-lg">
                    Sem ruído acadêmico. Uma edição por semana traduzindo tecnologia em decisão para TI, Bancos e Negócios.
                  </p>
                  <div className="mx-auto mt-7 flex justify-center">
                    <form
                      onSubmit={inscreverLeitor}
                      className="flex w-full max-w-lg items-center overflow-hidden rounded-xl bg-paper p-1.5 shadow-lg ring-1 ring-black/10"
                    >
                      <input
                        type="email"
                        required
                        value={subEmail}
                        onChange={(e) => setSubEmail(e.target.value)}
                        placeholder="Seu melhor e-mail..."
                        className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-sm text-ink outline-none placeholder:text-mute"
                      />
                      <button
                        type="submit"
                        className="flex shrink-0 items-center gap-1.5 rounded-lg bg-ink px-5 py-2.5 text-sm font-semibold text-paper transition hover:bg-black"
                      >
                        Assinar Agora
                      </button>
                    </form>
                  </div>
                </div>
              </section>
            </div>
          )}
        </>
      )}

      {/* =================================================================== */}
      {/* MODO 2: DESIGN SYSTEM INTERATIVO (REFERÊNCIA THE RUNDOWN AI)        */}
      {/* =================================================================== */}
      {modo === "design" && (
        <main className="mx-auto max-w-7xl px-5 py-12 space-y-14">
          <div className="border-b border-line pb-8">
            <div className="inline-block rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-600">
              Design System Oficial • Referência: The Rundown AI
            </div>
            <h1 className="mt-4 text-3xl font-bold tracking-tight text-ink md:text-5xl">
              Sistema Visual Decifrando Dados
            </h1>
            <p className="mt-3 max-w-2xl text-base text-ink/75">
              Tokens semânticos, escala tipográfica Satoshi, superfícies <code>Ink & Paper</code> e componentes editoriais extraídos de{" "}
              <code>therundown.ai</code>.
            </p>
          </div>

          {/* 1. PALETA DE CORES SEMÂNTICA */}
          <section className="space-y-4">
            <h2 className="text-2xl font-bold tracking-tight text-ink">
              1. Tokens Semânticos de Cor (Ink & Paper)
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
              {[
                { nome: "Ink (Primária)", var: "--color-ink", hex: "#171717", bg: "#171717", text: "#FFFFFF" },
                { nome: "Ink Soft", var: "--color-ink-soft", hex: "#212121", bg: "#212121", text: "#FFFFFF" },
                { nome: "Paper (Fundo)", var: "--color-paper", hex: "#FFFFFF", bg: "#FFFFFF", text: "#171717" },
                { nome: "Mist (Superfície 2)", var: "--color-mist", hex: "#F5F5F5", bg: "#F5F5F5", text: "#171717" },
                { nome: "Line (Divisória 1px)", var: "--color-line", hex: "#E5E5E5", bg: "#E5E5E5", text: "#171717" },
                { nome: "Mute (Metadados)", var: "--color-mute", hex: "#737373", bg: "#737373", text: "#FFFFFF" },
                { nome: "Emerald Tag", var: "--color-editorial-emerald", hex: "#009767", bg: "#009767", text: "#FFFFFF" },
                { nome: "Amber Link Underline", var: "--color-editorial-amber", hex: "#FFA800", bg: "#FFA800", text: "#171717" },
              ].map((c) => (
                <div key={c.nome} className="overflow-hidden rounded-xl border border-line bg-paper">
                  <div
                    className="flex h-20 items-end justify-between p-3 font-mono text-xs font-bold"
                    style={{ backgroundColor: c.bg, color: c.text }}
                  >
                    <span>{c.hex}</span>
                    <span>{c.var}</span>
                  </div>
                  <div className="p-3">
                    <p className="text-sm font-bold text-ink">{c.nome}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* 2. ESCALA TIPOGRÁFICA SATOSHI */}
          <section className="space-y-4">
            <h2 className="text-2xl font-bold tracking-tight text-ink">
              2. Tipografia (Satoshi Display + Editorial Body)
            </h2>
            <div className="divide-y divide-line rounded-2xl border border-line bg-paper p-6 space-y-6">
              <div>
                <p className="font-mono text-xs text-mute">Hero H1 • md:text-7xl font-bold leading-[1.08]</p>
                <p className="mt-2 text-4xl font-bold tracking-tight md:text-6xl">
                  Decifre Dados em <span className="text-gradient">4 minutos</span>.
                </p>
              </div>
              <div className="pt-6">
                <p className="font-mono text-xs text-mute">Artigo H1 • md:text-5xl font-bold leading-tight (Coluna 675px)</p>
                <p className="mt-2 text-2xl font-bold leading-tight md:text-4xl">
                  Meta lança Muse Wonder: o plano B de Zuckerberg virou plano A
                </p>
              </div>
              <div className="pt-6">
                <p className="font-mono text-xs text-mute">Corpo Editorial • 17px / line-height 1.7 + Link Sublinhado Âmbar (#ffa800)</p>
                <p className="mt-2 max-w-[675px] text-[17px] leading-[1.7] text-ink/90">
                  A aposta agora é transformar infraestrutura cara em receita recorrente. Confira a{" "}
                  <a href="#ds" className="rundown-article-link">
                    análise completa das 3 lentes (TI, Bancos e Negócios)
                  </a>{" "}
                  com métricas reais de produção.
                </p>
              </div>
            </div>
          </section>

          {/* 3. COMPONENTES EDITORIAIS */}
          <section className="space-y-4">
            <h2 className="text-2xl font-bold tracking-tight text-ink">
              3. Componentes & Superfícies Assinatura
            </h2>
            <div className="grid gap-6 md:grid-cols-2">
              <div className="rounded-2xl border border-line bg-paper p-6 space-y-4">
                <p className="font-mono text-xs font-bold text-mute uppercase">Botões, Badges & Links</p>
                <div className="flex flex-wrap items-center gap-3">
                  <button className="rounded-lg bg-ink px-4 py-2.5 text-sm font-semibold text-paper hover:bg-black">
                    Botão Primário (Ink)
                  </button>
                  <button className="rounded-lg border border-line bg-paper px-4 py-2.5 text-sm font-semibold text-ink hover:bg-mist">
                    Botão Secundário (Paper/Mist)
                  </button>
                  <span className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-600">
                    IA & Agentes
                  </span>
                </div>
              </div>

              <div className="rounded-2xl border border-line bg-paper p-6 space-y-3">
                <p className="font-mono text-xs font-bold text-mute uppercase">Callout de Analogia / Pergunta</p>
                <div className="rounded-xl border border-line bg-mist p-4 text-sm leading-relaxed text-ink">
                  💡 <strong>Em outras palavras (A Analogia):</strong> Pense nisso como uma cozinha industrial organizada com fila de comandas.
                </div>
              </div>
            </div>
          </section>
        </main>
      )}

      {/* =================================================================== */}
      {/* MODO 3: ÁREA ADMINISTRATIVA (ESTÚDIO EDITORIAL & STACK IA)          */}
      {/* =================================================================== */}
      {modo === "admin" && (
        <main className="mx-auto max-w-7xl px-5 py-10">
          {!adminToken ? (
            <Card className="mx-auto max-w-md border-line bg-paper shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Lock className="h-5 w-5 text-ink" /> Acesso do Editor-Chefe
                </CardTitle>
                <CardDescription>
                  Painel exclusivo de Marlon Ferreira para criar, agendar e publicar edições da Decifrando Dados.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Input
                  type="password"
                  placeholder="Senha administrativa (padrão: decifrando2026)"
                  value={senhaInput}
                  onChange={(e) => setSenhaInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && fazerLoginAdmin()}
                />
                {erroLogin && <p className="text-xs font-medium text-red-600">{erroLogin}</p>}
                <div className="flex gap-2">
                  <Button onClick={() => fazerLoginAdmin()} className="flex-1 bg-ink text-paper hover:bg-black">
                    Entrar no Painel
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => fazerLoginAdmin("decifrando2026")}
                    className="text-xs"
                  >
                    Acesso Rápido Local
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {/* CABEÇALHO DO ESTÚDIO + KPI CARDS */}
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-5">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-ink">
                    Estúdio Editorial — Decifrando Dados
                  </h1>
                  <p className="text-xs text-mute">
                    Gerencie publicações, gere rascunhos com Pydantic AI (5 Blocos + 3 Lentes) e importe arquivos.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={apiOnline ? "default" : "destructive"}>
                    {apiOnline ? "Stack IA Online (:8000)" : "API Offline"}
                  </Badge>
                  <Button
                    variant="outline"
                    onClick={() => {
                      localStorage.removeItem("dd_admin_token")
                      setAdminToken("")
                    }}
                    className="gap-1.5 text-xs"
                  >
                    <LogOut className="h-3.5 w-3.5" /> Sair
                  </Button>
                </div>
              </div>

              {stats && (
                <div className="grid gap-4 sm:grid-cols-4">
                  <Card className="border-line">
                    <CardContent className="pt-5">
                      <p className="text-xs font-medium text-mute">Edições Publicadas</p>
                      <p className="mt-1 text-2xl font-bold text-ink">{stats.publicadas}</p>
                    </CardContent>
                  </Card>
                  <Card className="border-line">
                    <CardContent className="pt-5">
                      <p className="text-xs font-medium text-mute">Rascunhos / Agendadas</p>
                      <p className="mt-1 text-2xl font-bold text-amber-600">{stats.rascunhos}</p>
                    </CardContent>
                  </Card>
                  <Card className="border-line">
                    <CardContent className="pt-5">
                      <p className="text-xs font-medium text-mute">Leitores Inscritos</p>
                      <p className="mt-1 text-2xl font-bold text-emerald-600">{stats.inscritos}</p>
                    </CardContent>
                  </Card>
                  <Card className="border-line">
                    <CardContent className="pt-5">
                      <p className="text-xs font-medium text-mute">Próxima Edição Sugerida</p>
                      <p className="mt-1 text-2xl font-bold text-ink">#{stats.proxima_edicao}</p>
                    </CardContent>
                  </Card>
                </div>
              )}

              {avisoAdmin && (
                <div className="flex items-center justify-between rounded-xl border border-line bg-mist px-4 py-3 text-xs font-semibold text-ink">
                  <span>{avisoAdmin}</span>
                  <button onClick={() => setAvisoAdmin("")} className="underline">
                    Fechar
                  </button>
                </div>
              )}

              {/* ABAS DO PAINEL ADMINISTRATIVO */}
              <div className="flex flex-wrap gap-2 border-b border-line pb-3">
                <Button
                  variant={abaAdmin === "editor" ? "default" : "outline"}
                  onClick={() => setAbaAdmin("editor")}
                  className="gap-1.5 text-xs"
                >
                  <PenTool className="h-3.5 w-3.5" /> 1. Editor & Agente IA
                </Button>
                <Button
                  variant={abaAdmin === "acervo" ? "default" : "outline"}
                  onClick={() => setAbaAdmin("acervo")}
                  className="gap-1.5 text-xs"
                >
                  <BookOpen className="h-3.5 w-3.5" /> 2. Acervo & Importador ({edicoesAdmin.length})
                </Button>
                <Button
                  variant={abaAdmin === "inscritos" ? "default" : "outline"}
                  onClick={() => setAbaAdmin("inscritos")}
                  className="gap-1.5 text-xs"
                >
                  <Users className="h-3.5 w-3.5" /> 3. Inscritos ({inscritos.length})
                </Button>
                <Button
                  variant={abaAdmin === "stack" ? "default" : "outline"}
                  onClick={() => setAbaAdmin("stack")}
                  className="gap-1.5 text-xs"
                >
                  <Layers className="h-3.5 w-3.5" /> 4. Infraestrutura Stack IA
                </Button>
              </div>

              {/* ABA 1: EDITOR & GERADOR PYDANTIC AI */}
              {abaAdmin === "editor" && (
                <div className="space-y-6">
                  <Card className="border-line bg-mist/60">
                    <CardHeader className="pb-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <CardTitle className="flex items-center gap-2 text-base text-ink">
                          <Sparkles className="h-5 w-5 text-emerald-600" /> Construtor Editorial Mistral AI (`mistral-large-latest`)
                        </CardTitle>
                        <span className="rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-600">
                          API Mistral Conectada • 5 Blocos + 3 Lentes
                        </span>
                      </div>
                      <CardDescription>
                        Digite o tema da semana: a API da Mistral gera toda a edição com Analogia, Lentes (TI, Bancos e Negócios), Tradutor de Termo, SEO e Post do LinkedIn.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid gap-3 sm:grid-cols-12">
                        <div className="sm:col-span-8">
                          <Input
                            value={temaIA}
                            onChange={(e) => setTemaIA(e.target.value)}
                            placeholder="Tema da edição (ex.: Agentes de IA em Prevenção a Fraudes no PIX)"
                            className="bg-paper"
                          />
                        </div>
                        <div className="sm:col-span-4">
                          <Input
                            value={termoIA}
                            onChange={(e) => setTermoIA(e.target.value)}
                            placeholder="Termo do Bloco 3 (ex.: Guardrails)"
                            className="bg-paper"
                          />
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2.5">
                        <Button
                          onClick={() => acionarGeradorIA(false)}
                          disabled={gerandoIA}
                          variant="outline"
                          className="gap-1.5 border-line bg-paper text-ink hover:bg-mist"
                        >
                          <Sparkles className="h-4 w-4 text-emerald-600" />
                          {gerandoIA ? "Gerando com Mistral AI..." : "1. Gerar Rascunho no Editor"}
                        </Button>
                        <Button
                          onClick={() => acionarGeradorIA(true)}
                          disabled={gerandoIA}
                          className="gap-1.5 bg-ink text-paper hover:bg-black"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          {gerandoIA ? "Construindo com Mistral AI..." : "2. Construir & Publicar Direto no Site"}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-line">
                    <CardHeader className="flex flex-row items-center justify-between pb-3">
                      <div>
                        <CardTitle className="text-base">Subir / Editar Edição da Newsletter</CardTitle>
                        <CardDescription>
                          Publica diretamente no site e salva o arquivo Markdown compatível na pasta `edicoes/`.
                        </CardDescription>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          onClick={() => setPreviewEditor((p) => !p)}
                          className="gap-1.5 text-xs"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          {previewEditor ? "Modo Edição" : "Preview The Rundown"}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() =>
                            setFormEdicao({
                              edicao: stats?.proxima_edicao || "33",
                              titulo: "",
                              subtitulo: "",
                              categoria: "IA & Agentes",
                              data: new Date().toLocaleDateString("pt-BR"),
                              tempo_leitura: "4",
                              status: "published",
                              seo_titulo: "",
                              seo_descricao: "",
                              post_divulgacao: "",
                              conteudo_markdown: "",
                            })
                          }
                          className="gap-1.5 text-xs"
                        >
                          <PlusCircle className="h-3.5 w-3.5" /> Limpar / Nova
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid gap-3 sm:grid-cols-5">
                        <div>
                          <label className="mb-1 block text-xs font-semibold text-mute">Edição #</label>
                          <Input
                            value={formEdicao.edicao}
                            onChange={(e) => setFormEdicao({ ...formEdicao, edicao: e.target.value })}
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="mb-1 block text-xs font-semibold text-mute">Categoria</label>
                          <select
                            value={formEdicao.categoria}
                            onChange={(e) => setFormEdicao({ ...formEdicao, categoria: e.target.value })}
                            className="w-full rounded-md border border-line bg-paper px-3 py-2 text-sm"
                          >
                            {CATEGORIAS.filter((c) => c !== "Todas").map((c) => (
                              <option key={c} value={c}>
                                {c}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-semibold text-mute">Data</label>
                          <Input
                            value={formEdicao.data}
                            onChange={(e) => setFormEdicao({ ...formEdicao, data: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-semibold text-mute">Status no Site</label>
                          <select
                            value={formEdicao.status}
                            onChange={(e) => setFormEdicao({ ...formEdicao, status: e.target.value })}
                            className="w-full rounded-md border border-line bg-paper px-3 py-2 text-sm font-medium"
                          >
                            <option value="published">🟢 Publicado (Visível)</option>
                            <option value="draft">🟡 Rascunho (Oculto)</option>
                            <option value="scheduled">🔵 Agendado</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <label className="mb-1 block text-xs font-semibold text-mute">Título Principal</label>
                          <Input
                            value={formEdicao.titulo}
                            onChange={(e) => setFormEdicao({ ...formEdicao, titulo: e.target.value })}
                            placeholder="Ex.: O Fim dos Clusters Gigantes em 2026?"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-semibold text-mute">Subtítulo (MAIS: ...)</label>
                          <Input
                            value={formEdicao.subtitulo}
                            onChange={(e) => setFormEdicao({ ...formEdicao, subtitulo: e.target.value })}
                            placeholder="Complemento direto sobre o impacto prático"
                          />
                        </div>
                      </div>

                      {previewEditor ? (
                        <div className="mx-auto max-w-[675px] rounded-2xl border border-line bg-paper p-8">
                          <span className="inline-block rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-600">
                            {formEdicao.categoria}
                          </span>
                          <h2 className="mt-4 text-3xl font-bold text-ink">{formEdicao.titulo}</h2>
                          <p className="mt-2 text-base text-ink/80">{formEdicao.subtitulo}</p>
                          <div className="mt-6 border-t border-line pt-6">
                            {renderizarMarkdownRundown(formEdicao.conteudo_markdown)}
                          </div>
                        </div>
                      ) : (
                        <div>
                          <label className="mb-1 block text-xs font-semibold text-mute">
                            Conteúdo Completo da Edição (Markdown — 5 Blocos + 3 Lentes)
                          </label>
                          <Textarea
                            rows={16}
                            value={formEdicao.conteudo_markdown}
                            onChange={(e) =>
                              setFormEdicao({ ...formEdicao, conteudo_markdown: e.target.value })
                            }
                            placeholder="Escreva ou gere com IA o artigo completo aqui..."
                            className="font-mono text-xs leading-relaxed"
                          />
                        </div>
                      )}

                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <label className="mb-1 block text-xs font-semibold text-mute">SEO Título</label>
                          <Input
                            value={formEdicao.seo_titulo}
                            onChange={(e) => setFormEdicao({ ...formEdicao, seo_titulo: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-semibold text-mute">SEO Descrição</label>
                          <Input
                            value={formEdicao.seo_descricao}
                            onChange={(e) => setFormEdicao({ ...formEdicao, seo_descricao: e.target.value })}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="mb-1 block text-xs font-semibold text-mute">
                          Post de Divulgação (Etapa 2 — Caso queira colar no feed do LinkedIn)
                        </label>
                        <Textarea
                          rows={5}
                          value={formEdicao.post_divulgacao}
                          onChange={(e) => setFormEdicao({ ...formEdicao, post_divulgacao: e.target.value })}
                          className="text-xs"
                        />
                      </div>

                      <div className="flex flex-wrap items-center gap-3 pt-2">
                        <Button onClick={salvarEPublicarEdicao} className="gap-2 bg-ink text-paper hover:bg-black">
                          <CheckCircle2 className="h-4 w-4" /> Salvar e Publicar no Site
                        </Button>
                        <Button variant="outline" onClick={copiarPacoteLinkedIn} className="gap-2 text-xs">
                          <Copy className="h-4 w-4" /> Copiar Pacote p/ LinkedIn
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* ABA 2: ACERVO & IMPORTADOR */}
              {abaAdmin === "acervo" && (
                <div className="space-y-6">
                  <Card className="border-line">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">
                        Importar Edições Anteriores (Pasta Local ou Arquivo .ZIP do LinkedIn)
                      </CardTitle>
                      <CardDescription>
                        Suba arquivos `.md`, `.html` ou o `.zip` oficial exportado do LinkedIn (Configurações → Obter cópia dos seus dados → Artigos).
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-wrap items-center gap-3">
                      <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-ink px-4 py-2 text-xs font-semibold text-paper hover:bg-black">
                        <FileUp className="h-4 w-4" /> Enviar .MD, .HTML ou .ZIP do LinkedIn
                        <input
                          type="file"
                          accept=".md,.html,.htm,.zip"
                          onChange={importarArquivoUpload}
                          className="hidden"
                        />
                      </label>
                      <Button variant="outline" onClick={sincronizarPastaLocal} className="gap-2 text-xs">
                        <FolderSync className="h-4 w-4" /> Sincronizar Pasta Local (`decifrando-dados/edicoes`)
                      </Button>
                    </CardContent>
                  </Card>

                  <Card className="border-line">
                    <CardHeader>
                      <CardTitle className="text-base">Todas as Edições no Sistema ({edicoesAdmin.length})</CardTitle>
                    </CardHeader>
                    <CardContent className="divide-y divide-line">
                      {edicoesAdmin.map((ed) => (
                        <div
                          key={ed.edicao}
                          className="flex flex-col justify-between gap-3 py-3.5 sm:flex-row sm:items-center"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-bold text-ink">
                                #{ed.edicao}
                              </span>
                              <Badge
                                variant={ed.status === "published" ? "default" : "secondary"}
                                className="text-[11px]"
                              >
                                {ed.status === "published"
                                  ? "Publicado"
                                  : ed.status === "draft"
                                  ? "Rascunho"
                                  : "Agendado"}
                              </Badge>
                              <Badge variant="outline" className="text-[11px]">
                                {ed.categoria}
                              </Badge>
                              <span className="text-xs text-mute">{ed.data}</span>
                            </div>
                            <p className="text-sm font-bold text-ink">{ed.titulo}</p>
                            <p className="line-clamp-1 text-xs text-mute">{ed.subtitulo}</p>
                          </div>

                          <div className="flex shrink-0 items-center gap-2">
                            <Button
                              variant="outline"
                              onClick={() => abrirEdicao(ed)}
                              className="text-xs"
                            >
                              Ler
                            </Button>
                            <Button
                              variant="secondary"
                              onClick={() => carregarEdicaoNoEditor(ed)}
                              className="text-xs"
                            >
                              Editar
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => excluirEdicao(ed.edicao)}
                              className="text-xs text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* ABA 3: GESTÃO DE INSCRITOS */}
              {abaAdmin === "inscritos" && (
                <Card className="border-line">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-base">Base de Leitores Inscritos ({inscritos.length})</CardTitle>
                      <CardDescription>
                        Leitores cadastrados pelo formulário público, segmentados pelas 3 lentes da newsletter.
                      </CardDescription>
                    </div>
                    <Button variant="outline" onClick={exportarInscritosCSV} className="gap-1.5 text-xs">
                      <Download className="h-3.5 w-3.5" /> Exportar CSV
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-line text-mute">
                            <th className="py-2.5 font-semibold">Nome</th>
                            <th className="py-2.5 font-semibold">E-mail</th>
                            <th className="py-2.5 font-semibold">Lente de Interesse</th>
                            <th className="py-2.5 font-semibold">Data</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-line">
                          {inscritos.map((s) => (
                            <tr key={s.id}>
                              <td className="py-2.5 font-medium text-ink">{s.nome}</td>
                              <td className="py-2.5 text-ink/80">{s.email}</td>
                              <td className="py-2.5">
                                <Badge variant="secondary">{s.area}</Badge>
                              </td>
                              <td className="py-2.5 text-mute">
                                {new Date(s.created_at).toLocaleDateString("pt-BR")}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* ABA 4: INFRAESTRUTURA DA STACK IA */}
              {abaAdmin === "stack" && (
                <div className="grid gap-5 md:grid-cols-2">
                  <Card className="border-line">
                    <CardHeader>
                      <CardTitle className="text-base">Arquitetura Ativa (Datalumina Stack)</CardTitle>
                      <CardDescription>
                        Construído com o gerador reutilizável `stack_ia_generator`.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2.5 text-xs text-ink">
                      <div className="flex items-center justify-between rounded-lg bg-mist p-2.5">
                        <span>⚡ <strong>Backend API:</strong> FastAPI + Pydantic v2</span>
                        <Badge>Ativo (:8000)</Badge>
                      </div>
                      <div className="flex items-center justify-between rounded-lg bg-mist p-2.5">
                        <span>🤖 <strong>Agentes & Guardrails:</strong> Pydantic AI</span>
                        <Badge variant="secondary">5 Blocos + 3 Lentes</Badge>
                      </div>
                      <div className="flex items-center justify-between rounded-lg bg-mist p-2.5">
                        <span>🔎 <strong>Document Copilot (RAG):</strong> Acervo + Supabase pgvector</span>
                        <Badge variant="secondary">Busca Híbrida</Badge>
                      </div>
                      <div className="flex items-center justify-between rounded-lg bg-mist p-2.5">
                        <span>🎨 <strong>Design System:</strong> The Rundown AI (Satoshi + Ink/Paper)</span>
                        <Badge variant="outline">Ativo</Badge>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-line">
                    <CardHeader>
                      <CardTitle className="text-base">Testar Fila Assíncrona (Celery Worker)</CardTitle>
                      <CardDescription>
                        Dispara uma tarefa em segundo plano via `/api/ai/tasks` (requer Redis ativo).
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <Input
                        value={taskPrompt}
                        onChange={(e) => setTaskPrompt(e.target.value)}
                      />
                      <Button
                        variant="outline"
                        onClick={async () => {
                          try {
                            const r = await post<TaskStatus>("/api/ai/tasks", { prompt: taskPrompt })
                            setTaskStatus(r)
                          } catch (err) {
                            setTaskStatus({
                              task_id: "-",
                              status: "REDIS_OFFLINE",
                              result: err instanceof Error ? err.message : "Erro",
                            })
                          }
                        }}
                        className="text-xs"
                      >
                        Enfileirar Tarefa no Worker
                      </Button>
                      {taskStatus && (
                        <pre className="rounded-lg bg-ink p-3 text-xs text-paper overflow-x-auto">
                          {JSON.stringify(taskStatus, null, 2)}
                        </pre>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          )}
        </main>
      )}

      {/* =================================================================== */}
      {/* RODAPÉ EM FOLHA ARREDONDADA (.sheet — PADRÃO EXATO THE RUNDOWN AI)  */}
      {/* =================================================================== */}
      <footer className="bg-mist px-2 pt-12 pb-4 md:px-5">
        <div className="sheet mx-auto border border-line px-6 py-12 md:px-12">
          <div className="mx-auto grid max-w-7xl gap-10 md:grid-cols-[1.2fr_2fr]">
            <div>
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-ink text-xs font-black text-paper">
                  DD
                </div>
                <span className="text-base font-bold text-ink">Decifrando Dados</span>
              </div>
              <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-ink/80">
                Receba toda semana análises diretas sobre Ciência de Dados, Engenharia e IA aplicadas a TI, Bancos e Negócios.{" "}
                <em>&ldquo;Smart people are cooler.&rdquo;</em>
              </p>
              <form
                onSubmit={inscreverLeitor}
                className="mt-5 flex w-full max-w-xs items-center overflow-hidden rounded-xl border border-line bg-paper p-1"
              >
                <input
                  type="email"
                  required
                  value={subEmail}
                  onChange={(e) => setSubEmail(e.target.value)}
                  placeholder="Seu e-mail..."
                  className="min-w-0 flex-1 bg-transparent px-3 py-1.5 text-sm text-ink outline-none placeholder:text-mute"
                />
                <button
                  type="submit"
                  className="shrink-0 rounded-lg bg-ink px-3 py-1.5 text-xs font-semibold text-paper transition hover:bg-black"
                >
                  Assinar
                </button>
              </form>
            </div>

            <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
              <div>
                <h3 className="mb-4 font-bold text-ink">Navegação</h3>
                <ul className="space-y-2.5 text-sm text-ink/70">
                  <li>
                    <button
                      onClick={() => {
                        setModo("public")
                        setEdicaoAberta(null)
                      }}
                      className="transition hover:text-ink"
                    >
                      Todas as Edições
                    </button>
                  </li>
                  <li>
                    <button onClick={() => setModo("design")} className="transition hover:text-ink">
                      Design System
                    </button>
                  </li>
                  <li>
                    <button onClick={() => setModo("admin")} className="transition hover:text-ink">
                      Estúdio Editorial
                    </button>
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="mb-4 font-bold text-ink">As 3 Lentes</h3>
                <ul className="space-y-2.5 text-sm text-ink/70">
                  <li>💻 TI & Engenharia</li>
                  <li>🏦 Setor Bancário</li>
                  <li>📊 Negócios & Gestão</li>
                </ul>
              </div>

              <div>
                <h3 className="mb-4 font-bold text-ink">Curadoria</h3>
                <ul className="space-y-2.5 text-sm text-ink/70">
                  <li>Marlon Ferreira</li>
                  <li>
                    <a
                      href="https://www.linkedin.com/newsletters/decifrando-dados-7513791689808064512/"
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 transition hover:text-ink"
                    >
                      LinkedIn Oficial <ExternalLink className="h-3 w-3" />
                    </a>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <div className="mx-auto mt-10 flex max-w-7xl flex-col items-center justify-between gap-4 border-t border-line pt-6 text-xs text-mute sm:flex-row">
            <p>© 2026 Decifrando Dados — Marlon Ferreira. Todos os direitos reservados.</p>
            <p className="font-mono">
              Design System: The Rundown AI • Stack: FastAPI + Pydantic AI + Supabase + React
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
