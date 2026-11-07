-- Decifrando Dados — schema inicial
-- Aplique no Supabase: Dashboard > SQL Editor > cole e execute
-- (ou com a CLI: supabase db push)

create extension if not exists vector;

-- ---------------------------------------------------------------------------
-- Eventos (webhooks / tarefas em segundo plano)
-- ---------------------------------------------------------------------------
create table if not exists public.events (
    id          uuid primary key default gen_random_uuid(),
    source      text not null,
    payload     jsonb not null default '{}'::jsonb,
    status      text not null default 'queued',   -- queued | processing | completed | failed | rejected
    result      jsonb,
    error       text,
    created_at  timestamptz not null default now(),
    updated_at  timestamptz not null default now()
);

create index if not exists events_status_idx on public.events (status);
create index if not exists events_created_at_idx on public.events (created_at desc);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

drop trigger if exists events_set_updated_at on public.events;
create trigger events_set_updated_at
    before update on public.events
    for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Documentos para RAG (vetor + full-text em português)
-- ---------------------------------------------------------------------------
create table if not exists public.documents (
    id          bigserial primary key,
    content     text not null,
    metadata    jsonb not null default '{}'::jsonb,
    embedding   vector(1536),                       -- text-embedding-3-small
    fts         tsvector generated always as (to_tsvector('portuguese', content)) stored,
    created_at  timestamptz not null default now()
);

create index if not exists documents_embedding_idx on public.documents using hnsw (embedding vector_cosine_ops);
create index if not exists documents_fts_idx on public.documents using gin (fts);
create index if not exists documents_metadata_idx on public.documents using gin (metadata);

-- ---------------------------------------------------------------------------
-- Busca híbrida: full-text + semântica combinadas por Reciprocal Rank Fusion
-- ---------------------------------------------------------------------------
create or replace function public.hybrid_search(
    query_text        text,
    query_embedding   vector(1536),
    match_count       int   default 5,
    full_text_weight  float default 1,
    semantic_weight   float default 1,
    rrf_k             int   default 50
)
returns table (id bigint, content text, metadata jsonb, score float)
language sql stable
as $$
with full_text as (
    select d.id,
           row_number() over (order by ts_rank_cd(d.fts, websearch_to_tsquery('portuguese', query_text)) desc) as rank_ix
    from public.documents d
    where d.fts @@ websearch_to_tsquery('portuguese', query_text)
    order by rank_ix
    limit least(match_count, 30) * 2
),
semantic as (
    select d.id,
           row_number() over (order by d.embedding <=> query_embedding) as rank_ix
    from public.documents d
    where d.embedding is not null
    order by rank_ix
    limit least(match_count, 30) * 2
)
select d.id,
       d.content,
       d.metadata,
       (coalesce(1.0 / (rrf_k + ft.rank_ix), 0.0) * full_text_weight
      + coalesce(1.0 / (rrf_k + s.rank_ix), 0.0) * semantic_weight)::float as score
from full_text ft
full outer join semantic s on ft.id = s.id
join public.documents d on d.id = coalesce(ft.id, s.id)
order by score desc
limit least(match_count, 30);
$$;

-- ---------------------------------------------------------------------------
-- Segurança: RLS ligado. O backend usa a service_role key (ignora RLS).
-- Crie policies específicas se o frontend for acessar as tabelas diretamente.
-- ---------------------------------------------------------------------------
alter table public.events enable row level security;
alter table public.documents enable row level security;
