-- ============================================================
--  modo — 002_seed_templates.sql
--  Три стартовых шаблона модулей: Расходы, Коллекции, Задачи
--  Куда вставить: Supabase → SQL Editor → New query → Run
--  Запускать ПОСЛЕ 001_init.sql
-- ============================================================

insert into public.templates (id, name, icon, fields, default_view, sort_order)
values
  (
    '11111111-1111-4111-8111-111111111111',
    'Расходы',
    'wallet',
    $json$[
      {"id":"name","label":"Название","type":"text","required":true},
      {"id":"amount","label":"Сумма","type":"number"},
      {"id":"category","label":"Категория","type":"select","options":["Еда","Транспорт","Жильё","Развлечения","Другое"]},
      {"id":"date","label":"Дата","type":"date"}
    ]$json$::jsonb,
    'table',
    1
  ),
  (
    '22222222-2222-4222-8222-222222222222',
    'Коллекции',
    'watch',
    $json$[
      {"id":"name","label":"Название","type":"text","required":true},
      {"id":"brand","label":"Бренд","type":"text"},
      {"id":"price","label":"Цена","type":"number"},
      {"id":"purchase_date","label":"Дата покупки","type":"date"},
      {"id":"condition","label":"Состояние","type":"select","options":["Отличное","Хорошее","Среднее"]},
      {"id":"photo","label":"Фото","type":"image"}
    ]$json$::jsonb,
    'cards',
    2
  ),
  (
    '33333333-3333-4333-8333-333333333333',
    'Задачи',
    'check-square',
    $json$[
      {"id":"title","label":"Задача","type":"text","required":true},
      {"id":"status","label":"Статус","type":"select","options":["Сделать","В процессе","Готово"]},
      {"id":"due_date","label":"Срок","type":"date"}
    ]$json$::jsonb,
    'cards',
    3
  ),
  (
    '44444444-4444-4444-8444-444444444444',
    'Книги',
    'clipboard-list',
    $json$[
      {"id":"title","label":"Название","type":"text","required":true},
      {"id":"author","label":"Автор","type":"text"},
      {"id":"pages","label":"Страниц","type":"number"},
      {"id":"status","label":"Статус","type":"select","options":["Хочу прочитать","Читаю","Прочитано"]},
      {"id":"cover","label":"Обложка","type":"image"}
    ]$json$::jsonb,
    'cards',
    4
  ),
  (
    '55555555-5555-4555-8555-555555555555',
    'Привычки',
    'check-square',
    $json$[
      {"id":"title","label":"Привычка","type":"text","required":true},
      {"id":"frequency","label":"Частота","type":"select","options":["Каждый день","Через день","Раз в неделю"]},
      {"id":"started","label":"Начал","type":"date"},
      {"id":"streak","label":"Серия, дней","type":"number"}
    ]$json$::jsonb,
    'table',
    5
  ),
  (
    '66666666-6666-4666-8666-666666666666',
    'Вишлист',
    'box',
    $json$[
      {"id":"name","label":"Что хочу","type":"text","required":true},
      {"id":"price","label":"Примерная цена","type":"number"},
      {"id":"priority","label":"Приоритет","type":"select","options":["Очень","Средне","Когда-нибудь"]},
      {"id":"link","label":"Ссылка","type":"text"}
    ]$json$::jsonb,
    'cards',
    6
  )
on conflict (id) do update
  set name         = excluded.name,
      icon         = excluded.icon,
      fields       = excluded.fields,
      default_view = excluded.default_view,
      sort_order   = excluded.sort_order;

-- ============================================================
--  Проверка (необязательно, отдельным запросом):
--    select sort_order, name, icon, default_view,
--           jsonb_array_length(fields) as fields_count
--      from public.templates
--     order by sort_order;
--  Ожидается 3 строки:
--    1 | Расходы   | wallet       | table | 4
--    2 | Коллекции | watch        | cards | 6
--    3 | Задачи    | check-square | cards | 3
-- ============================================================
