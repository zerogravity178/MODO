-- ============================================================
--  modo — 003_security_improvements.sql
--  Усиление Row Level Security: modules, records
--  Куда вставить: Supabase → SQL Editor → New query → Run
--  Запускать ПОСЛЕ 001_init.sql и 002_seed_templates.sql
--
--  Что делает:
--    • запись нельзя привязать к чужому модулю (была дыра);
--    • user_id записи нельзя подменить;
--    • UPDATE/DELETE разрешены только владельцу;
--    • модули: явные политики на чтение/создание/правку/удаление.
--
--  Данные не изменяются и не удаляются. Скрипт идемпотентен:
--  повторный запуск безопасен.
-- ============================================================

begin;

-- ============================================================
--  1. Вспомогательная функция: принадлежит ли модуль текущему юзеру
--     security definer — чтобы проверка не зависела от RLS самой
--     таблицы modules и не вызывала рекурсию политик.
-- ============================================================
create or replace function public.owns_module(target_module_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
      from public.modules m
     where m.id = target_module_id
       and m.user_id = auth.uid()
  );
$$;

comment on function public.owns_module(uuid)
  is 'true, если модуль существует и принадлежит текущему пользователю';

revoke all on function public.owns_module(uuid) from public;
grant execute on function public.owns_module(uuid) to authenticated;

-- ============================================================
--  2. RLS: modules
--     Была одна политика FOR ALL — заменяем на явные, чтобы
--     правила UPDATE/DELETE читались отдельно.
-- ============================================================
alter table public.modules enable row level security;

drop policy if exists "modules_own_rows" on public.modules;
drop policy if exists "modules_select_own" on public.modules;
drop policy if exists "modules_insert_own" on public.modules;
drop policy if exists "modules_update_own" on public.modules;
drop policy if exists "modules_delete_own" on public.modules;

create policy "modules_select_own"
  on public.modules
  for select
  to authenticated
  using (user_id = auth.uid());

create policy "modules_insert_own"
  on public.modules
  for insert
  to authenticated
  with check (user_id = auth.uid());

-- with check не даёт переписать user_id на чужой при обновлении
create policy "modules_update_own"
  on public.modules
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "modules_delete_own"
  on public.modules
  for delete
  to authenticated
  using (user_id = auth.uid());

-- ============================================================
--  3. RLS: records
--     Было: using/with check (user_id = auth.uid()).
--     Дыра: user_id свой, а module_id — чужой. Такая запись
--     создавалась «в модуле другого человека» и становилась
--     видна владельцу модуля.
--     Теперь дополнительно требуем owns_module(module_id).
-- ============================================================
alter table public.records enable row level security;

drop policy if exists "records_own_rows" on public.records;
drop policy if exists "records_select_own" on public.records;
drop policy if exists "records_insert_own" on public.records;
drop policy if exists "records_update_own" on public.records;
drop policy if exists "records_delete_own" on public.records;

create policy "records_select_own"
  on public.records
  for select
  to authenticated
  using (user_id = auth.uid());

create policy "records_insert_own"
  on public.records
  for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and public.owns_module(module_id)
  );

-- using  — какие строки можно менять (только свои),
-- with check — что должно остаться после правки:
--   свой user_id и модуль, которым владеет тот же человек.
-- Поэтому нельзя ни подменить user_id, ни перенести запись
-- в чужой модуль.
create policy "records_update_own"
  on public.records
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and public.owns_module(module_id)
  );

create policy "records_delete_own"
  on public.records
  for delete
  to authenticated
  using (user_id = auth.uid());

-- ============================================================
--  4. Индексы под новую проверку
--     owns_module() ищет по modules(id) — это первичный ключ,
--     отдельный индекс не нужен. У records уже есть
--     records_module_id_idx и records_user_id_idx из 001.
-- ============================================================

commit;

-- ============================================================
--  Проверка после Run (необязательно, отдельным запросом):
--
--    select tablename, policyname, cmd
--      from pg_policies
--     where schemaname = 'public'
--       and tablename in ('modules','records')
--     order by tablename, cmd;
--
--  Ожидается 8 строк:
--    modules | modules_delete_own | DELETE
--    modules | modules_insert_own | INSERT
--    modules | modules_select_own | SELECT
--    modules | modules_update_own | UPDATE
--    records | records_delete_own | DELETE
--    records | records_insert_own | INSERT
--    records | records_select_own | SELECT
--    records | records_update_own | UPDATE
-- ============================================================
