-- ============================================================
--  modo — 004_storage_images.sql
--  Хранилище картинок: приватный bucket + политики доступа
--  Куда вставить: Supabase → SQL Editor → New query → Run
--  Запускать ПОСЛЕ 003_security_improvements.sql
--
--  Что делает:
--    • создаёт приватный bucket «modo-images» (5 МБ, только картинки);
--    • разрешает каждому пользователю работать ТОЛЬКО со своей
--      папкой {user_id}/... — чужие файлы не видны и не меняются;
--    • публичного чтения нет: ссылки выдаются подписанными (signed URL).
--
--  Данные не изменяются и не удаляются. Скрипт идемпотентен.
-- ============================================================

begin;

-- ============================================================
--  1. Bucket
--     public = false → без подписи файл не открыть.
--     Ограничения задаются на уровне bucket: даже если клиент
--     попытается залить 20 МБ PDF, Storage откажет.
-- ============================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'modo-images',
  'modo-images',
  false,
  5242880, -- 5 МБ
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- ============================================================
--  2. Политики на storage.objects
--     Путь файла: {user_id}/{module_id}/{имя-файла}
--     Первый сегмент пути должен совпадать с uid — это и есть
--     «владелец папки». Подделать путь нельзя: with check
--     проверяет его при вставке.
-- ============================================================
drop policy if exists "modo_images_select_own" on storage.objects;
drop policy if exists "modo_images_insert_own" on storage.objects;
drop policy if exists "modo_images_update_own" on storage.objects;
drop policy if exists "modo_images_delete_own" on storage.objects;

create policy "modo_images_select_own"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'modo-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "modo_images_insert_own"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'modo-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

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
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "modo_images_delete_own"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'modo-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

commit;

-- ============================================================
--  Проверка после Run (необязательно, отдельным запросом):
--
--    select id, public, file_size_limit, allowed_mime_types
--      from storage.buckets where id = 'modo-images';
--    -- Ожидается: public = false, 5242880, 4 MIME-типа
--
--    select policyname, cmd from pg_policies
--     where schemaname = 'storage' and tablename = 'objects'
--       and policyname like 'modo_images%';
--    -- Ожидается 4 строки: SELECT, INSERT, UPDATE, DELETE
-- ============================================================
