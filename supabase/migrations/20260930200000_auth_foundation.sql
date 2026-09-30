-- BIOMED authentication/session foundation.
-- Idempotent baseline for a fresh Supabase project. No secret is copied from production.

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.biomed_private_config (
  id smallint primary key check (id = 1),
  cpf_pepper text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.biomed_private_config(id,cpf_pepper)
values(1,encode(extensions.gen_random_bytes(32),'hex'))
on conflict(id) do nothing;

create table if not exists public.biomed_students (
  id uuid primary key default gen_random_uuid(),
  cpf_hash text unique not null,
  name text not null check (char_length(name) between 2 and 120),
  level text not null default 'bronze' check (level in ('bronze','prata','ouro','diamante')),
  xp integer not null default 0 check (xp >= 0),
  learning_score numeric(5,2) not null default 0 check (learning_score between 0 and 100),
  stats jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create table if not exists public.biomed_sessions (
  token_hash text primary key,
  student_id uuid not null references public.biomed_students(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create index if not exists biomed_sessions_exp_idx on public.biomed_sessions(expires_at);
create index if not exists biomed_sessions_student_idx on public.biomed_sessions(student_id);

alter table public.biomed_private_config enable row level security;
alter table public.biomed_students enable row level security;
alter table public.biomed_sessions enable row level security;

revoke all on public.biomed_private_config from anon,authenticated;
revoke all on public.biomed_students from anon,authenticated;
revoke all on public.biomed_sessions from anon,authenticated;

create or replace function public.biomed_touch_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $function$
begin
  new.updated_at=now();
  return new;
end;
$function$;

drop trigger if exists biomed_students_updated_at on public.biomed_students;
create trigger biomed_students_updated_at
before update on public.biomed_students
for each row execute function public.biomed_touch_updated_at();

create or replace function public.biomed_valid_cpf(p_cpf text)
returns boolean
language plpgsql
immutable
set search_path = public, pg_temp
as $function$
declare
  c text := regexp_replace(coalesce(p_cpf,''), '\D', '', 'g');
  s integer := 0;
  d1 integer;
  d2 integer;
  i integer;
begin
  if length(c) <> 11 or c ~ '^(\d)\1{10}$' then return false; end if;
  for i in 1..9 loop s := s + substring(c from i for 1)::integer * (11-i); end loop;
  d1 := (s*10)%11; if d1=10 then d1:=0; end if;
  s:=0;
  for i in 1..10 loop s := s + substring(c from i for 1)::integer * (12-i); end loop;
  d2 := (s*10)%11; if d2=10 then d2:=0; end if;
  return d1=substring(c from 10 for 1)::integer and d2=substring(c from 11 for 1)::integer;
end;
$function$;

create or replace function public.biomed_cpf_hash(p_cpf text)
returns text
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $function$
declare
  c text := regexp_replace(coalesce(p_cpf,''), '\D', '', 'g');
  pepper text;
begin
  select cpf_pepper into pepper from public.biomed_private_config where id=1;
  if pepper is null then raise exception 'BIOMED config unavailable'; end if;
  return encode(extensions.hmac(c,pepper,'sha256'),'hex');
end;
$function$;

create or replace function public.biomed_student_json(p_row public.biomed_students)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $function$
declare
  pieces text[];
  ranking_name text;
begin
  pieces:=regexp_split_to_array(trim(p_row.name),'\s+');
  if array_length(pieces,1)>1 then
    ranking_name:=pieces[1]||' '||left(pieces[array_length(pieces,1)],1)||'.';
  else
    ranking_name:=pieces[1];
  end if;
  return jsonb_build_object(
    'id',p_row.id,'name',p_row.name,'rankingName',ranking_name,'level',p_row.level,
    'xp',p_row.xp,'learningScore',p_row.learning_score,'stats',p_row.stats,
    'createdAt',p_row.created_at,'updatedAt',p_row.updated_at,'lastSeenAt',p_row.last_seen_at
  );
end;
$function$;

create or replace function public.biomed_student_id_from_token(p_token text)
returns uuid
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $function$
declare
  h text;
  sid uuid;
begin
  if coalesce(length(p_token),0)<32 then return null; end if;
  h:=encode(extensions.digest(p_token,'sha256'),'hex');
  select student_id into sid
  from public.biomed_sessions
  where token_hash=h and expires_at>now();
  if sid is not null then
    update public.biomed_sessions set last_seen_at=now() where token_hash=h;
  end if;
  return sid;
end;
$function$;

create or replace function public.biomed_auth(p_cpf text,p_name text default null)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $function$
declare
  c text := regexp_replace(coalesce(p_cpf,''),'\D','','g');
  h text;
  r public.biomed_students%rowtype;
  clean_name text := regexp_replace(trim(coalesce(p_name,'')),'\s+',' ','g');
  raw_token text;
  token_hash text;
begin
  if not public.biomed_valid_cpf(c) then raise exception 'CPF inválido'; end if;
  h:=public.biomed_cpf_hash(c);
  select * into r from public.biomed_students where cpf_hash=h limit 1;
  if r.id is null then
    if clean_name='' then return jsonb_build_object('newStudent',true); end if;
    if char_length(clean_name)<2 or char_length(clean_name)>120 then raise exception 'Nome inválido'; end if;
    insert into public.biomed_students(cpf_hash,name) values(h,clean_name) returning * into r;
  else
    update public.biomed_students set last_seen_at=now() where id=r.id returning * into r;
  end if;
  delete from public.biomed_sessions where expires_at<=now();
  raw_token:=encode(extensions.gen_random_bytes(32),'hex');
  token_hash:=encode(extensions.digest(raw_token,'sha256'),'hex');
  insert into public.biomed_sessions(token_hash,student_id,expires_at)
  values(token_hash,r.id,now()+interval '30 days');
  return jsonb_build_object('newStudent',false,'token',raw_token,'student',public.biomed_student_json(r));
end;
$function$;

create or replace function public.biomed_profile(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  sid uuid := public.biomed_student_id_from_token(p_token);
  r public.biomed_students%rowtype;
begin
  if sid is null then raise exception 'Sessão inválida ou expirada'; end if;
  update public.biomed_students set last_seen_at=now() where id=sid returning * into r;
  return jsonb_build_object('student',public.biomed_student_json(r));
end;
$function$;

revoke all on function public.biomed_cpf_hash(text) from public,anon,authenticated;
revoke all on function public.biomed_student_json(public.biomed_students) from public,anon,authenticated;
revoke all on function public.biomed_student_id_from_token(text) from public,anon,authenticated;
revoke all on function public.biomed_auth(text,text) from public,authenticated;
revoke all on function public.biomed_profile(text) from public,authenticated;
grant execute on function public.biomed_auth(text,text) to anon;
grant execute on function public.biomed_profile(text) to anon;
