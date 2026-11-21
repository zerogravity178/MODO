-- ============================================================
--  modo — 001_init.sql
--  Схема БД: modules, records, templates + Row Level Security
--  Куда вставить: Supabase → SQL Editor → New query → Run
-- ============================================================

-- gen_random_uuid() встроен в Postgres 13+; строка ниже — подстраховка
create extension if not exists pgcrypto with schema extensions;

-- ============================================================
--  1. modules — модули пользователя (например «Книги»)
-- ============================================================
create table if not exists public.modules (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  name          text not null,
  icon          text default 'box',
  fields        jsonb not null default '[]'::jsonb,
  default_view  text default 'cards',
  created_at    timestamptz default now()
);

comment on table  public.modules              is 'Модули пользователя (его собственные разделы)';
comment on column public.modules.fields       is 'Поля модуля: [{"key":"title","label":"Название","type":"text"}]';
comment on column public.modules.default_view is 'Вид по умолчанию: cards | table | list';

create index if not exists modules_user_id_idx
  on public.modules (user_id);

-- ============================================================
--  2. records — записи внутри модуля
-- ============================================================
create table if not exists public.records (
  id          uuid primary key default gen_random_uuid(),
  module_id   uuid not null references public.modules (id) on delete cascade,
  user_id     uuid not null references auth.users (id) on delete cascade,
  data        jsonb not null default '{}'::jsonb,
  created_at  timestamptz default now()
);

comment on table  public.records      is 'Записи внутри модуля';
comment on column public.records.data is 'Значения полей записи: {"title":"Дюна","year":1965}';

create index if not exists records_module_id_idx
  on public.records (module_id);
create index if not exists records_user_id_idx
  on public.records (user_id);
create index if not exists records_data_gin_idx
  on public.records using gin (data);

-- ============================================================
--  3. templates — публичные шаблоны модулей (RLS не включаем)
-- ============================================================
create table if not exists public.templates (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  icon          text default 'box',
  fields        jsonb not null,
  default_view  text default 'cards',
  sort_order    int default 0
);

comment on table public.templates is 'Публичные шаблоны модулей — читают все, RLS не включён';

-- Явно разрешаем публичное чтение (запись — только через service_role/дашборд)
grant select on table public.templates to anon, authenticated;

-- ============================================================
--  4. RLS: modules — только свои строки
-- ============================================================
alter table public.modules enable row level security;

drop policy if exists "modules_own_rows" on public.modules;

create policy "modules_own_rows"
  on public.modules
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================
--  5. RLS: records — только свои строки
-- ============================================================
alter table public.records enable row level security;

drop policy if exists "records_own_rows" on public.records;

create policy "records_own_rows"
  on public.records
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================
--  6. Проверка после Run (необязательно, отдельным запросом):
--     select tablename, rowsecurity from pg_tables
--      where schemaname = 'public'
--        and tablename in ('modules','records','templates');
--  Ожидается: modules = true, records = true, templates = false
-- ============================================================
