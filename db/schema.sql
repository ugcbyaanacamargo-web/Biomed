-- BIOMED - banco persistente do portal educacional
-- O CPF NUNCA é armazenado em texto puro. A aplicação grava somente HMAC-SHA256 no campo cpf_hash.
-- Execute em um projeto Supabase/Postgres dedicado ao BIOMED.

create extension if not exists pgcrypto;

create table if not exists public.biomed_students (
  id uuid primary key default gen_random_uuid(),
  cpf_hash text unique not null,
  name text not null check (char_length(name) between 2 and 120),
  level text not null default 'bronze' check (level in ('bronze','prata','ouro','diamante')),
  xp integer not null default 0 check (xp >= 0),
  learning_score numeric(5,2) not null default 0 check (learning_score between 0 and 100),
  stats jsonb not null default '{
    "mastery": {},
    "content_completed": [],
    "diagnostic_done": false,
    "exam_scores": [],
    "simulation_scores": [],
    "case_scores": [],
    "open_answer_scores": [],
    "retention_scores": [],
    "active_days": []
  }'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create table if not exists public.biomed_events (
  id bigserial primary key,
  student_id uuid not null references public.biomed_students(id) on delete cascade,
  event_key text not null,
  event_type text not null,
  topic text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique(student_id, event_key)
);

create index if not exists biomed_events_student_created_idx
  on public.biomed_events(student_id, created_at desc);

create index if not exists biomed_students_ranking_idx
  on public.biomed_students(learning_score desc, xp desc);

-- A aplicação usa service role somente no servidor Vercel.
-- Não exponha service_role no navegador.
alter table public.biomed_students enable row level security;
alter table public.biomed_events enable row level security;

-- Sem políticas públicas: o navegador não consulta as tabelas diretamente.
-- Todas as operações passam pelas funções /api/* da Vercel.

create or replace function public.biomed_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists biomed_students_updated_at on public.biomed_students;
create trigger biomed_students_updated_at
before update on public.biomed_students
for each row execute function public.biomed_touch_updated_at();
