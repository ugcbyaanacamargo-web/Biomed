-- BIOMED AI-first conversational persistence
-- Only BIOMED-prefixed objects are created or changed.

create table if not exists public.biomed_ai_conversations (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.biomed_students(id) on delete cascade,
  title text not null default 'Nova conversa' check (char_length(title) between 1 and 120),
  status text not null default 'active' check (status in ('active','archived')),
  current_goal text,
  memory_summary text not null default '',
  study_state jsonb not null default '{"overall":0,"mode":"diagnose","currentGoal":"","nextGoal":"","objectives":[],"mastered":[],"struggling":[],"misconceptions":[]}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_message_at timestamptz not null default now()
);

create index if not exists biomed_ai_conversations_student_last_idx
  on public.biomed_ai_conversations(student_id, status, last_message_at desc);

create table if not exists public.biomed_ai_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.biomed_ai_conversations(id) on delete cascade,
  student_id uuid not null references public.biomed_students(id) on delete cascade,
  client_message_id uuid,
  reply_to_client_message_id uuid,
  role text not null check (role in ('user','assistant')),
  content text not null check (char_length(content) between 1 and 50000),
  ui jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  generation_status text not null default 'complete' check (generation_status in ('complete','failed')),
  created_at timestamptz not null default now(),
  unique(conversation_id, client_message_id),
  unique(conversation_id, reply_to_client_message_id)
);

create index if not exists biomed_ai_messages_conversation_created_idx
  on public.biomed_ai_messages(conversation_id, created_at asc);

create index if not exists biomed_ai_messages_student_idx
  on public.biomed_ai_messages(student_id);

create table if not exists public.biomed_ai_memory (
  student_id uuid primary key references public.biomed_students(id) on delete cascade,
  long_term_summary text not null default '',
  study_plan jsonb not null default '{}'::jsonb,
  strengths jsonb not null default '[]'::jsonb,
  weaknesses jsonb not null default '[]'::jsonb,
  mastered_topics jsonb not null default '[]'::jsonb,
  current_focus text,
  recent_misconceptions jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.biomed_ai_conversations enable row level security;
alter table public.biomed_ai_messages enable row level security;
alter table public.biomed_ai_memory enable row level security;

revoke all on public.biomed_ai_conversations from anon, authenticated;
revoke all on public.biomed_ai_messages from anon, authenticated;
revoke all on public.biomed_ai_memory from anon, authenticated;

drop trigger if exists biomed_ai_conversations_updated_at on public.biomed_ai_conversations;
create trigger biomed_ai_conversations_updated_at
before update on public.biomed_ai_conversations
for each row execute function public.biomed_touch_updated_at();

drop trigger if exists biomed_ai_memory_updated_at on public.biomed_ai_memory;
create trigger biomed_ai_memory_updated_at
before update on public.biomed_ai_memory
for each row execute function public.biomed_touch_updated_at();

create or replace function public.biomed_ai_list_conversations(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  sid uuid := public.biomed_student_id_from_token(p_token);
  result jsonb;
begin
  if sid is null then raise exception 'Sessão inválida ou expirada'; end if;

  select coalesce(jsonb_agg(to_jsonb(x) order by x."lastMessageAt" desc),'[]'::jsonb)
  into result
  from (
    select
      c.id,
      c.title,
      c.current_goal as "currentGoal",
      c.study_state as "studyState",
      c.created_at as "createdAt",
      c.updated_at as "updatedAt",
      c.last_message_at as "lastMessageAt",
      (
        select left(m.content,180)
        from public.biomed_ai_messages m
        where m.conversation_id=c.id
        order by m.created_at desc
        limit 1
      ) as preview
    from public.biomed_ai_conversations c
    where c.student_id=sid and c.status='active'
    order by c.last_message_at desc
    limit 80
  ) x;

  return jsonb_build_object('conversations',result);
end;
$function$;

create or replace function public.biomed_ai_create_conversation(p_token text, p_title text default 'Nova conversa')
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  sid uuid := public.biomed_student_id_from_token(p_token);
  c public.biomed_ai_conversations%rowtype;
  clean_title text := left(regexp_replace(trim(coalesce(p_title,'Nova conversa')), '\s+', ' ', 'g'),120);
begin
  if sid is null then raise exception 'Sessão inválida ou expirada'; end if;
  if clean_title='' then clean_title:='Nova conversa'; end if;

  insert into public.biomed_ai_memory(student_id)
  values(sid)
  on conflict(student_id) do nothing;

  insert into public.biomed_ai_conversations(student_id,title)
  values(sid,clean_title)
  returning * into c;

  return jsonb_build_object(
    'conversation',jsonb_build_object(
      'id',c.id,'title',c.title,'currentGoal',c.current_goal,'studyState',c.study_state,
      'createdAt',c.created_at,'updatedAt',c.updated_at,'lastMessageAt',c.last_message_at
    )
  );
end;
$function$;

create or replace function public.biomed_ai_get_conversation(p_token text, p_conversation_id uuid, p_limit integer default 80)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  sid uuid := public.biomed_student_id_from_token(p_token);
  c public.biomed_ai_conversations%rowtype;
  mem public.biomed_ai_memory%rowtype;
  msgs jsonb;
begin
  if sid is null then raise exception 'Sessão inválida ou expirada'; end if;

  select * into c from public.biomed_ai_conversations
  where id=p_conversation_id and student_id=sid and status='active';

  if c.id is null then raise exception 'Conversa não encontrada'; end if;

  insert into public.biomed_ai_memory(student_id) values(sid)
  on conflict(student_id) do nothing;
  select * into mem from public.biomed_ai_memory where student_id=sid;

  select coalesce(jsonb_agg(to_jsonb(x) order by x."createdAt"),'[]'::jsonb)
  into msgs
  from (
    select * from (
      select
        m.id,m.role,m.content,m.ui,m.metadata,m.generation_status as "generationStatus",
        m.client_message_id as "clientMessageId",
        m.reply_to_client_message_id as "replyToClientMessageId",
        m.created_at as "createdAt"
      from public.biomed_ai_messages m
      where m.conversation_id=c.id and m.student_id=sid
      order by m.created_at desc
      limit greatest(1,least(200,coalesce(p_limit,80)))
    ) recent
    order by "createdAt" asc
  ) x;

  return jsonb_build_object(
    'conversation',jsonb_build_object(
      'id',c.id,'title',c.title,'currentGoal',c.current_goal,'studyState',c.study_state,
      'memorySummary',c.memory_summary,'createdAt',c.created_at,'updatedAt',c.updated_at,
      'lastMessageAt',c.last_message_at
    ),
    'messages',msgs,
    'memory',jsonb_build_object(
      'longTermSummary',mem.long_term_summary,'studyPlan',mem.study_plan,
      'strengths',mem.strengths,'weaknesses',mem.weaknesses,'masteredTopics',mem.mastered_topics,
      'currentFocus',mem.current_focus,'recentMisconceptions',mem.recent_misconceptions,
      'updatedAt',mem.updated_at
    )
  );
end;
$function$;

create or replace function public.biomed_ai_archive_conversation(p_token text, p_conversation_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  sid uuid := public.biomed_student_id_from_token(p_token);
  changed integer;
begin
  if sid is null then raise exception 'Sessão inválida ou expirada'; end if;

  update public.biomed_ai_conversations
  set status='archived',updated_at=now()
  where id=p_conversation_id and student_id=sid and status='active';

  get diagnostics changed=row_count;
  if changed=0 then raise exception 'Conversa não encontrada'; end if;
  return jsonb_build_object('archived',true,'id',p_conversation_id);
end;
$function$;

create or replace function public.biomed_ai_begin_message(
  p_token text,
  p_conversation_id uuid,
  p_client_message_id uuid,
  p_content text,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  sid uuid := public.biomed_student_id_from_token(p_token);
  clean_content text := trim(coalesce(p_content,''));
  existing public.biomed_ai_messages%rowtype;
  inserted public.biomed_ai_messages%rowtype;
begin
  if sid is null then raise exception 'Sessão inválida ou expirada'; end if;
  if p_client_message_id is null then raise exception 'client_message_id ausente'; end if;
  if char_length(clean_content)<1 or char_length(clean_content)>12000 then raise exception 'Mensagem inválida'; end if;
  if not exists(
    select 1 from public.biomed_ai_conversations
    where id=p_conversation_id and student_id=sid and status='active'
  ) then raise exception 'Conversa não encontrada'; end if;

  select * into existing
  from public.biomed_ai_messages
  where conversation_id=p_conversation_id and client_message_id=p_client_message_id
  limit 1;

  if existing.id is not null then
    return jsonb_build_object('duplicate',true,'messageId',existing.id);
  end if;

  insert into public.biomed_ai_messages(
    conversation_id,student_id,client_message_id,role,content,metadata
  ) values (
    p_conversation_id,sid,p_client_message_id,'user',clean_content,coalesce(p_metadata,'{}'::jsonb)
  )
  returning * into inserted;

  update public.biomed_ai_conversations
  set last_message_at=now()
  where id=p_conversation_id and student_id=sid;

  return jsonb_build_object('duplicate',false,'messageId',inserted.id);
end;
$function$;

create or replace function public.biomed_ai_context(
  p_token text,
  p_conversation_id uuid,
  p_limit integer default 24
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  sid uuid := public.biomed_student_id_from_token(p_token);
  c public.biomed_ai_conversations%rowtype;
  s public.biomed_students%rowtype;
  mem public.biomed_ai_memory%rowtype;
  msgs jsonb;
  cnt integer;
begin
  if sid is null then raise exception 'Sessão inválida ou expirada'; end if;
  select * into c from public.biomed_ai_conversations
  where id=p_conversation_id and student_id=sid and status='active';
  if c.id is null then raise exception 'Conversa não encontrada'; end if;

  select * into s from public.biomed_students where id=sid;
  insert into public.biomed_ai_memory(student_id) values(sid)
  on conflict(student_id) do nothing;
  select * into mem from public.biomed_ai_memory where student_id=sid;

  select count(*) into cnt from public.biomed_ai_messages
  where conversation_id=c.id and student_id=sid;

  select coalesce(jsonb_agg(to_jsonb(x) order by x."createdAt"),'[]'::jsonb)
  into msgs
  from (
    select * from (
      select m.role,m.content,m.ui,m.metadata,m.created_at as "createdAt"
      from public.biomed_ai_messages m
      where m.conversation_id=c.id and m.student_id=sid and m.generation_status='complete'
      order by m.created_at desc
      limit greatest(4,least(40,coalesce(p_limit,24)))
    ) recent
    order by "createdAt" asc
  ) x;

  return jsonb_build_object(
    'student',jsonb_build_object('id',s.id,'name',s.name,'level',s.level,'learningScore',s.learning_score),
    'conversation',jsonb_build_object(
      'id',c.id,'title',c.title,'currentGoal',c.current_goal,'studyState',c.study_state,
      'memorySummary',c.memory_summary,'messageCount',cnt
    ),
    'memory',jsonb_build_object(
      'longTermSummary',mem.long_term_summary,'studyPlan',mem.study_plan,
      'strengths',mem.strengths,'weaknesses',mem.weaknesses,'masteredTopics',mem.mastered_topics,
      'currentFocus',mem.current_focus,'recentMisconceptions',mem.recent_misconceptions
    ),
    'messages',msgs
  );
end;
$function$;

create or replace function public.biomed_ai_complete_turn(
  p_token text,
  p_conversation_id uuid,
  p_client_message_id uuid,
  p_assistant_content text,
  p_ui jsonb,
  p_metadata jsonb,
  p_title text,
  p_learning jsonb,
  p_memory_summary text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  sid uuid := public.biomed_student_id_from_token(p_token);
  c public.biomed_ai_conversations%rowtype;
  existing public.biomed_ai_messages%rowtype;
  a public.biomed_ai_messages%rowtype;
  clean_title text := left(regexp_replace(trim(coalesce(p_title,'Nova conversa')), '\s+', ' ', 'g'),120);
  goal text := left(coalesce(p_learning->>'currentGoal',''),400);
  next_goal text := left(coalesce(p_learning->>'nextGoal',''),400);
  progress numeric := greatest(0,least(100,coalesce((p_learning->>'progress')::numeric,0)));
  state jsonb;
begin
  if sid is null then raise exception 'Sessão inválida ou expirada'; end if;
  if char_length(trim(coalesce(p_assistant_content,'')))<1 then raise exception 'Resposta vazia'; end if;

  select * into c from public.biomed_ai_conversations
  where id=p_conversation_id and student_id=sid and status='active'
  for update;
  if c.id is null then raise exception 'Conversa não encontrada'; end if;

  if not exists(
    select 1 from public.biomed_ai_messages
    where conversation_id=c.id and student_id=sid and client_message_id=p_client_message_id and role='user'
  ) then raise exception 'Mensagem do aluno não encontrada'; end if;

  select * into existing from public.biomed_ai_messages
  where conversation_id=c.id and reply_to_client_message_id=p_client_message_id and role='assistant'
  limit 1;
  if existing.id is not null then
    return jsonb_build_object('duplicate',true,'message',to_jsonb(existing));
  end if;

  insert into public.biomed_ai_messages(
    conversation_id,student_id,reply_to_client_message_id,role,content,ui,metadata,generation_status
  ) values (
    c.id,sid,p_client_message_id,'assistant',trim(p_assistant_content),
    coalesce(p_ui,'{}'::jsonb),coalesce(p_metadata,'{}'::jsonb),'complete'
  ) returning * into a;

  state := jsonb_build_object(
    'overall',progress,
    'mode',coalesce(p_learning->>'mode','teach'),
    'currentGoal',goal,
    'nextGoal',next_goal,
    'objectives',coalesce(p_learning->'objectives','[]'::jsonb),
    'mastered',coalesce(p_learning->'mastered','[]'::jsonb),
    'struggling',coalesce(p_learning->'struggling','[]'::jsonb),
    'misconceptions',coalesce(p_learning->'misconceptions','[]'::jsonb)
  );

  update public.biomed_ai_conversations
  set
    title=case when title='Nova conversa' and clean_title<>'' then clean_title else title end,
    current_goal=nullif(goal,''),
    memory_summary=case when length(trim(coalesce(p_memory_summary,'')))>0 then left(p_memory_summary,5000) else memory_summary end,
    study_state=state,
    last_message_at=now(),
    updated_at=now()
  where id=c.id;

  insert into public.biomed_ai_memory(
    student_id,long_term_summary,study_plan,strengths,weaknesses,mastered_topics,current_focus,recent_misconceptions
  ) values (
    sid,left(coalesce(p_memory_summary,''),5000),
    jsonb_build_object('currentGoal',goal,'nextGoal',next_goal,'overall',progress,'objectives',coalesce(p_learning->'objectives','[]'::jsonb)),
    coalesce(p_learning->'mastered','[]'::jsonb),
    coalesce(p_learning->'struggling','[]'::jsonb),
    coalesce(p_learning->'mastered','[]'::jsonb),
    nullif(goal,''),
    coalesce(p_learning->'misconceptions','[]'::jsonb)
  )
  on conflict(student_id) do update set
    long_term_summary=case when length(excluded.long_term_summary)>0 then excluded.long_term_summary else public.biomed_ai_memory.long_term_summary end,
    study_plan=excluded.study_plan,
    strengths=excluded.strengths,
    weaknesses=excluded.weaknesses,
    mastered_topics=excluded.mastered_topics,
    current_focus=excluded.current_focus,
    recent_misconceptions=excluded.recent_misconceptions,
    updated_at=now();

  return jsonb_build_object(
    'duplicate',false,
    'message',jsonb_build_object(
      'id',a.id,'role',a.role,'content',a.content,'ui',a.ui,'metadata',a.metadata,
      'replyToClientMessageId',a.reply_to_client_message_id,'createdAt',a.created_at
    ),
    'studyState',state
  );
end;
$function$;

create or replace function public.biomed_ai_seed_assistant(
  p_token text,
  p_conversation_id uuid,
  p_assistant_content text,
  p_ui jsonb,
  p_metadata jsonb,
  p_title text,
  p_learning jsonb,
  p_memory_summary text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  sid uuid := public.biomed_student_id_from_token(p_token);
  c public.biomed_ai_conversations%rowtype;
  a public.biomed_ai_messages%rowtype;
  clean_title text := left(regexp_replace(trim(coalesce(p_title,'Nova conversa')), '\s+', ' ', 'g'),120);
  goal text := left(coalesce(p_learning->>'currentGoal',''),400);
  progress numeric := greatest(0,least(100,coalesce((p_learning->>'progress')::numeric,0)));
  state jsonb;
begin
  if sid is null then raise exception 'Sessão inválida ou expirada'; end if;
  select * into c from public.biomed_ai_conversations
  where id=p_conversation_id and student_id=sid and status='active'
  for update;
  if c.id is null then raise exception 'Conversa não encontrada'; end if;

  if exists(select 1 from public.biomed_ai_messages where conversation_id=c.id) then
    return jsonb_build_object('seeded',false);
  end if;

  state := jsonb_build_object(
    'overall',progress,'mode',coalesce(p_learning->>'mode','diagnose'),
    'currentGoal',goal,'nextGoal',coalesce(p_learning->>'nextGoal',''),
    'objectives',coalesce(p_learning->'objectives','[]'::jsonb),
    'mastered',coalesce(p_learning->'mastered','[]'::jsonb),
    'struggling',coalesce(p_learning->'struggling','[]'::jsonb),
    'misconceptions',coalesce(p_learning->'misconceptions','[]'::jsonb)
  );

  insert into public.biomed_ai_messages(conversation_id,student_id,role,content,ui,metadata)
  values(c.id,sid,'assistant',trim(p_assistant_content),coalesce(p_ui,'{}'::jsonb),coalesce(p_metadata,'{}'::jsonb))
  returning * into a;

  update public.biomed_ai_conversations
  set title=case when clean_title<>'' then clean_title else title end,
      current_goal=nullif(goal,''),memory_summary=left(coalesce(p_memory_summary,''),5000),
      study_state=state,last_message_at=now(),updated_at=now()
  where id=c.id;

  insert into public.biomed_ai_memory(student_id,long_term_summary,study_plan,current_focus)
  values(sid,left(coalesce(p_memory_summary,''),5000),jsonb_build_object('currentGoal',goal,'overall',progress),nullif(goal,''))
  on conflict(student_id) do update set
    long_term_summary=case when length(excluded.long_term_summary)>0 then excluded.long_term_summary else public.biomed_ai_memory.long_term_summary end,
    study_plan=excluded.study_plan,current_focus=excluded.current_focus,updated_at=now();

  return jsonb_build_object('seeded',true,'message',jsonb_build_object(
    'id',a.id,'role',a.role,'content',a.content,'ui',a.ui,'metadata',a.metadata,'createdAt',a.created_at
  ));
end;
$function$;

revoke all on function public.biomed_ai_list_conversations(text) from public, authenticated;
revoke all on function public.biomed_ai_create_conversation(text,text) from public, authenticated;
revoke all on function public.biomed_ai_get_conversation(text,uuid,integer) from public, authenticated;
revoke all on function public.biomed_ai_archive_conversation(text,uuid) from public, authenticated;
revoke all on function public.biomed_ai_begin_message(text,uuid,uuid,text,jsonb) from public, authenticated;
revoke all on function public.biomed_ai_context(text,uuid,integer) from public, authenticated;
revoke all on function public.biomed_ai_complete_turn(text,uuid,uuid,text,jsonb,jsonb,text,jsonb,text) from public, authenticated;
revoke all on function public.biomed_ai_seed_assistant(text,uuid,text,jsonb,jsonb,text,jsonb,text) from public, authenticated;

grant execute on function public.biomed_ai_list_conversations(text) to anon;
grant execute on function public.biomed_ai_create_conversation(text,text) to anon;
grant execute on function public.biomed_ai_get_conversation(text,uuid,integer) to anon;
grant execute on function public.biomed_ai_archive_conversation(text,uuid) to anon;
grant execute on function public.biomed_ai_begin_message(text,uuid,uuid,text,jsonb) to anon;
grant execute on function public.biomed_ai_context(text,uuid,integer) to anon;
grant execute on function public.biomed_ai_complete_turn(text,uuid,uuid,text,jsonb,jsonb,text,jsonb,text) to anon;
grant execute on function public.biomed_ai_seed_assistant(text,uuid,text,jsonb,jsonb,text,jsonb,text) to anon;
