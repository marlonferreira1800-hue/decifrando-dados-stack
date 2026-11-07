-- Migração 0002: Tabelas da plataforma de Newsletter Decifrando Dados

create table if not exists public.newsletter_editions (
    id uuid primary key default gen_random_uuid(),
    edicao text not null unique,
    slug text not null unique,
    titulo text not null,
    subtitulo text not null default '',
    categoria text not null default 'IA & Dados',
    data text not null,
    tempo_leitura text not null default '4',
    status text not null default 'published', -- 'published' | 'draft' | 'scheduled'
    seo_titulo text not null default '',
    seo_descricao text not null default '',
    post_divulgacao text not null default '',
    conteudo_markdown text not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_newsletter_editions_status on public.newsletter_editions (status);

create table if not exists public.newsletter_subscribers (
    id uuid primary key default gen_random_uuid(),
    email text not null unique,
    nome text not null default '',
    area text not null default 'TI & Dados', -- 'TI & Dados' | 'Bancos & Finanças' | 'Negócios'
    ativo boolean not null default true,
    created_at timestamptz not null default now()
);

alter table public.newsletter_editions enable row level security;
alter table public.newsletter_subscribers enable row level security;
