# Design System Oficial — Decifrando Dados (Referência: The Rundown AI)

Este documento define os tokens visuais, tipografia, grid editorial e componentes do portal **Decifrando Dados**, extraídos e adaptados da arquitetura visual do **The Rundown AI** (`therundown.ai`).

---

## 1. Paleta de Cores Semântica (Ink & Paper)

O sistema utiliza um contraste editorial de altíssima legibilidade (inspirado em jornalismo tecnológico moderno), combinando superfícies neutras (`paper` / `mist` / `ink`) com acentos vibrantes pontuais.

| Token CSS | Classe Tailwind | Hex | Uso Principal |
| :--- | :--- | :--- | :--- |
| `--color-ink` | `bg-ink` / `text-ink` | `#171717` | Texto principal, botões primários e cabeçalhos |
| `--color-ink-soft` | `bg-ink-soft` | `#212121` | Superfícies escuras secundárias |
| `--color-ink-card` | `bg-ink-card` | `#272727` | Cards em seções escuras |
| `--color-paper` | `bg-paper` / `text-paper` | `#FFFFFF` | Fundo principal de leitura e cartões elevados |
| `--color-mist` | `bg-mist` | `#F5F5F5` | Superfície secundária, hover de botões e moldura de rodapé |
| `--color-line` | `border-line` | `#E5E5E5` | Divisórias estruturais de `1px` em todo o layout |
| `--color-line-dark` | `border-line-dark` | `#333333` | Divisórias em blocos escuros |
| `--color-mute` | `text-mute` | `#737373` | Metadados, datas, tempo de leitura e legendas |
| `--color-brand-pink` | `text-gradient` | `#CD408F` | Gradiente de destaque no Hero (início) |
| `--color-brand-violet` | `text-gradient` | `#8B4CD4` | Gradiente de destaque no Hero (meio) |
| `--color-brand-blue` | `text-gradient` | `#6254FF` | Gradiente de destaque no Hero (fim) |
| `--color-editorial-emerald` | `text-emerald-600` | `#009767` | Pill de categoria da edição (`border-emerald-200`) |
| `--color-editorial-amber` | `.rundown-article-link` | `#FFA800` | Sublinhado de links e destaques dentro do artigo |

---

## 2. Tipografia

- **Fonte Display & UI (`--font-sans`):** `"Satoshi", "Satoshi Variable", ui-sans-serif, system-ui, sans-serif` (carregada via Fontshare CDN, pesos `400`, `500`, `700`, `900`).
- **Fonte de Leitura Longa (`--font-editorial`):** `"Helvetica Neue", Helvetica, Arial, sans-serif` para parágrafos do artigo com ritmo confortável.
- **Escala Tipográfica:**
  - **Hero Display (`H1 Home`):** `text-[1.75rem] md:text-7xl font-bold leading-[1.08] tracking-tight`
  - **Título de Artigo (`H1 Artigo`):** `text-2xl md:text-5xl font-bold leading-tight tracking-tight`
  - **Título de Seção (`H2`):** `text-3xl md:text-5xl font-bold tracking-tight text-gradient-dark`
  - **Título de Card (`H3 Card`):** `text-[17px] font-bold leading-snug text-ink`
  - **Corpo Editorial:** `text-[17px] leading-[1.7] text-ink/90`

---

## 3. Arquitetura de Layout & Grid

1. **Header Fixo (`68px`):**
   - `sticky top-0 z-50 bg-paper/95 backdrop-blur border-b border-line`
   - Container `max-w-7xl h-[68px] px-5`
   - Links com micro-interação `.rundown-nav-link` (sublinhado animado com `cubic-bezier(0.6, 0, 0.2, 1)`).
2. **Coluna de Leitura de Artigo (`675px`):**
   - `mx-auto max-w-[675px] px-5 py-12` — largura áurea de leitura rápida (65–72 caracteres por linha).
   - Barra de autor e compartilhamento com divisória `border-b border-line pb-6` e botões circulares `rounded-full border border-line p-2.5`.
3. **Grid de Edições Recentes (4 Colunas):**
   - `mx-auto max-w-7xl` com `grid gap-6 sm:grid-cols-2 lg:grid-cols-4`.
   - Card com capa `aspect-[16/10] rounded-lg bg-mist border border-line`, zoom suave `group-hover:scale-[1.02]` e badge flutuante no canto superior esquerdo (`bg-paper px-2 py-0.5 text-xs font-semibold text-ink shadow`).
4. **Banner Escuro de Conversão (`.bg-gradient-dark`):**
   - `mx-auto max-w-4xl rounded-3xl bg-gradient-dark px-6 py-16 text-center` (`linear-gradient(180deg, #000000 0%, #292929 100%)`).
   - Caixa de inscrição embutida estilo pílula: `rounded-xl bg-paper p-1.5 shadow-lg ring-1 ring-black/10` com botão `bg-ink text-paper hover:bg-black`.
5. **Rodapé em Folha Arredondada (`.sheet`):**
   - Fundo externo `bg-mist px-2 pb-4 pt-12 md:px-5` contendo o bloco `.sheet` (`bg-paper border border-line rounded-[1.8rem] px-6 py-12 md:px-12`).
