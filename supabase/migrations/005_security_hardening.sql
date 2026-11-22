-- ============================================================
--  modo — 005_security_hardening.sql
--  Дополнительное усиление безопасности после 003 и 004
--  Куда вставить: Supabase → SQL Editor → New query → Run
--  Запускать ПОСЛЕ 004_storage_images.sql
--
--  Что исправляет (подробности — в отчёте):
--    1. Загрузка в Storage проверяла только папку пользователя,
--       но не принадлежность module_id. Теперь проверяет.
--    2. Добавлена защита от «..» в пути файла.
--    3. Функция owns_module закреплена за владельцем схемы:
--       у обычных ролей отобрано право создавать объекты в public.
--    4. Bucket принудительно остаётся приватным.
--
--  Данные не изменяются и не удаляются. Файлы и записи остаются
--  на месте. Повторный запуск безопасен.
-- ============================================================

begin;

-- ============================================================
--  1. Функция owns_module — закрепляем права
--
--     security definer + фиксированный search_path уже заданы
--     в 003. Здесь закрываем остальное:
--       • execute — только authenticated (у anon и public прав нет);
--       • право создавать объекты в схеме public отбираем у
--         клиентских ролей. Без create role не сможет подсунуть
--         свою функцию с тем же именем и перехватить вызов.
--
--     Саму функцию не пересоздаём: она уже корректна, а лишний
--     create or replace сбросил бы владельца.
-- ============================================================
revoke all on function public.owns_module(uuid) from public;
revoke all on function public.owns_module(uuid) from anon;
grant execute on function public.owns_module(uuid) to authenticated;

-- Supabase рекомендует держать public без права создания объектов
-- для клиентских ролей: иначе любой вошедший пользователь может
-- завести в public свою таблицу/функцию и помешать приложению.
revoke create on schema public from anon;
revoke create on schema public from authenticated;

-- ============================================================
--  2. Storage: проверка module_id
--
--     Путь файла: {user_id}/{module_id}/{имя}
--
--     Было (004): проверялся только первый сегмент. Пользователь
--     мог залить файл в папку СВОЕГО uid с ЧУЖИМ module_id —
--     например подставить id модуля другого человека. Чтения
--     чужой папки это не давало, но мусор в хранилище и
--     неверная привязка к модулю — реальная проблема.
--
--     Стало: для insert/update второй сегмент обязан быть
--     модулем, которым владеет тот же пользователь.
--
--     ВАЖНО про delete/select: там проверяем только папку.
--     Причина — файлы удалённых модулей. Если требовать
--     owns_module и при удалении, такие «сироты» стало бы
--     невозможно убрать: модуля уже нет, проверка всегда false.
--     Владение при этом не страдает: папка = uid пользователя.
-- ============================================================

-- Вспомогательная функция: путь лежит в моей папке и в моём модуле.
-- Отдельная функция, чтобы не дублировать выражение в политиках
-- и чтобы null-безопасно обрабатывать короткие и битые пути.
--
-- plpgsql, а не sql, ради одной вещи: второй сегмент приводится
-- к uuid. Если в пути окажется не uuid («uid/aaa/file.png»), чистый
-- SQL упал бы ошибкой приведения типов — пользователь получил бы
-- 500 вместо честного «доступа нет». Здесь исключение ловится
-- и превращается в false.
create or replace function public.owns_storage_path(object_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  segments text[];
  module_segment text;
begin
  if object_name is null then
    return false;
  end if;

  segments := storage.foldername(object_name);

  -- Нужны минимум два сегмента: {user_id}/{module_id}, плюс имя файла.
  if segments is null or array_length(segments, 1) < 2 then
    return false;
  end if;

  -- Первый сегмент — мой uid.
  if segments[1] is distinct from auth.uid()::text then
    return false;
  end if;

  -- Никаких «..» и «.» в пути.
  if exists (
    select 1 from unnest(segments) as segment
     where segment in ('.', '..')
  ) then
    return false;
  end if;

  -- Второй сегмент — модуль, которым я владею.
  module_segment := segments[2];

  if module_segment !~
     '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
  then
    return false;
  end if;

  return public.owns_module(module_segment::uuid);
exception
  -- Битый uuid или неожиданная форма пути — просто «нельзя».
  when others then
    return false;
end;
$$;

comment on function public.owns_storage_path(text)
  is 'true, если файл лежит в папке текущего пользователя и в его модуле';

revoke all on function public.owns_storage_path(text) from public;
revoke all on function public.owns_storage_path(text) from anon;
grant execute on function public.owns_storage_path(text) to authenticated;

drop policy if exists "modo_images_select_own" on storage.objects;
drop policy if exists "modo_images_insert_own" on storage.objects;
drop policy if exists "modo_images_update_own" on storage.objects;
drop policy if exists "modo_images_delete_own" on storage.objects;

-- Чтение: только своя папка. Проверка module_id намеренно не нужна —
-- иначе картинки удалённых модулей перестали бы открываться, а
-- чужой папки это всё равно не касается.
create policy "modo_images_select_own"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'modo-images'
    and (storage.foldername(name))[1] = auth.uid()::text
    and not exists (
      select 1
        from unnest(storage.foldername(name)) as segment
       where segment in ('.', '..')
    )
  );

-- Загрузка: папка своя И модуль свой. Существующий ИЛИ чужой
-- module_id больше не пройдёт.
create policy "modo_images_insert_own"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'modo-images'
    and public.owns_storage_path(name)
  );

-- Обновление: проверяем и старый путь (using), и новый (with check).
-- Иначе можно было бы переписать объект из своей папки в чужой
-- module_id или подменить путь целиком.
create policy "modo_images_update_own"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'modo-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'modo-images'
    and public.owns_storage_path(name)
  );

-- Удаление: только своя папка (см. объяснение про «сирот» выше).
create policy "modo_images_delete_own"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'modo-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ============================================================
--  3. Bucket: подтверждаем приватность и лимиты
--     На случай, если bucket кто-то переключил в public
--     через дашборд. Существующие файлы не затрагиваются.
-- ============================================================
update storage.buckets
   set public             = false,
       file_size_limit    = 5242880,
       allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
 where id = 'modo-images';

-- ============================================================
--  4. Публичные шаблоны — без изменений.
--     001 выдал grant select на public.templates ролям anon и
--     authenticated, RLS на таблице не включён. Это задумано:
--     шаблоны видны всем, в том числе до входа. Не трогаем.
-- ============================================================

commit;

-- ============================================================
--  Проверка после Run (выполнять отдельно, только чтение)
--
--  -- 1. Политики таблиц
--    select tablename, policyname, cmd, roles, qual, with_check
--      from pg_policies
--     where schemaname = 'public'
--       and tablename in ('modules','records')
--     order by tablename, cmd;
--    Ожидается 8 строк, все с roles = {authenticated}.
--
--  -- 2. Политики хранилища
--    select policyname, cmd, roles
--      from pg_policies
--     where schemaname = 'storage' and tablename = 'objects'
--       and policyname like 'modo_images%'
--     order by cmd;
--    Ожидается 4 строки.
--
--  -- 3. Нет ли ЛИШНИХ политик на storage.objects
--    select policyname, cmd, roles, permissive
--      from pg_policies
--     where schemaname = 'storage' and tablename = 'objects'
--     order by policyname;
--    Если увидите политику, которой нет в этом файле и в 004 —
--    она расширяет доступ (permissive-политики складываются
--    через OR). Разберитесь, откуда она, прежде чем удалять.
--
--  -- 4. Функция и её права
--    select p.proname, p.prosecdef, p.proconfig,
--           pg_get_userbyid(p.proowner) as owner,
--           has_function_privilege('anon', p.oid, 'execute') as anon_can
--      from pg_proc p
--      join pg_namespace n on n.oid = p.pronamespace
--     where n.nspname = 'public'
--       and p.proname in ('owns_module','owns_storage_path');
--    Ожидается: prosecdef = true, proconfig = {search_path=public, pg_temp},
--               anon_can = false.
--
--  -- 5. Bucket
--    select id, public, file_size_limit, allowed_mime_types
--      from storage.buckets where id = 'modo-images';
--    Ожидается public = false.
-- ============================================================
