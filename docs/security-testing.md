# Проверка разделения данных MODO вручную

Автоматически эти сценарии не проверялись: для них нужны два реальных
аккаунта и живые данные в облачной базе. Ниже — что и как проверить.

## Подготовка

1. Создайте два аккаунта: **A** и **B** (разные e-mail).
2. Под **A** создайте модуль «Тест A» с полями «Название» и «Картинка»,
   добавьте одну запись с изображением.
3. Под **B** создайте модуль «Тест B» с теми же полями, добавьте запись.
4. Выпишите идентификаторы (видны в адресе страницы и в пути файла):

   | Что | Как выглядит | Откуда взять |
   |---|---|---|
   | `MODULE_A`, `MODULE_B` | uuid | адрес `/m/<uuid>` |
   | `RECORD_A`, `RECORD_B` | uuid | кнопка правки / DevTools |
   | `IMAGE_B` | `uid_B/MODULE_B/field-….jpg` | в записи B поле картинки |

5. Получите `access_token` для A: DevTools → Application → Cookies →
   `sb-<project>-auth-token` (значение — JSON, поле `access_token`).

Дальше все проверки — **под A**.

## Сценарии

| № | Действие | Ожидание |
|---|---|---|
| 1 | Открыть `/m/MODULE_A` | Модуль и записи видны |
| 2 | Открыть `/m/MODULE_B` в адресной строке | 404 — модуль не открывается |
| 3 | Добавить запись в «Тест A» | Запись появляется в списке |
| 4 | REST: вставить запись с `module_id = MODULE_B` | 403 `new row violates row-level security policy` |
| 5 | REST: `PATCH records?id=eq.RECORD_B` | `[]`, запись B не меняется |
| 6 | REST: `DELETE records?id=eq.RECORD_B` | `[]`, запись B на месте |
| 7 | Загрузить картинку в «Тест A» через форму | Файл загружается, превью видно |
| 8 | REST: upload в `uid_A/MODULE_B/x.jpg` | 403 — чужой модуль не принимает файл |
| 9 | REST: `POST /storage/v1/object/sign/modo-images/IMAGE_B` | Ошибка, ссылка не выдаётся |
| 10 | REST: `DELETE /storage/v1/object/modo-images/IMAGE_B` | Ошибка RLS, файл B остаётся |
| 11 | Открыть `/storage/v1/object/public/modo-images/IMAGE_B` | Не отдаётся — bucket приватный |
| 12 | Открыть подписанную ссылку из превью спустя час | `400` истёк; обновление страницы выдаёт новую |

### Готовые запросы

```bash
URL="https://othvqwihvfmlipsnoodm.supabase.co"
ANON="<anon key из .env.local>"
TOKEN="<access_token аккаунта A>"

# 4. вставка записи в чужой модуль
curl -s -X POST "$URL/rest/v1/records" \
  -H "apikey: $ANON" -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" -H "Prefer: return=representation" \
  -d '{"module_id":"MODULE_B","user_id":"uid_A","data":{}}'

# 5. изменение чужой записи
curl -s -X PATCH "$URL/rest/v1/records?id=eq.RECORD_B" \
  -H "apikey: $ANON" -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" -H "Prefer: return=representation" \
  -d '{"data":{"f1":"взлом"}}'

# 6. удаление чужой записи
curl -s -X DELETE "$URL/rest/v1/records?id=eq.RECORD_B" \
  -H "apikey: $ANON" -H "Authorization: Bearer $TOKEN"

# 8. загрузка в чужой модуль
printf 'x' > /tmp/x.jpg
curl -s -X POST "$URL/storage/v1/object/modo-images/uid_A/MODULE_B/x.jpg" \
  -H "apikey: $ANON" -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: image/jpeg" --data-binary @/tmp/x.jpg

# 9. подписанная ссылка на чужой файл
curl -s -X POST "$URL/storage/v1/object/sign/modo-images/IMAGE_B" \
  -H "apikey: $ANON" -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" -d '{"expiresIn":3600}'
```

Признаки успеха: 4, 8 и 9 возвращают `403` / `AccessDenied`;
5 и 6 возвращают `[]` (пустой массив) и данные B не меняются;
11 не отдаёт файл.

## Что уже проверено без второго аккаунта

- сборка, `tsc` и `lint` проходят;
- код подписывает только пути вида `{свой uid}/…` (`lib/images.ts`);
- удаление файлов фильтруется по своей папке (`removeOwnImages`);
- запись и модуль удаляются серверными действиями
  `deleteRecordWithImages` / `deleteModuleWithImages`, а не из браузера;
- файл не удаляется, если на него ссылается другая запись
  (`pathsStillInUse`);
- при отмене формы и при закрытии крестиком загруженные в сессии файлы
  удаляются;
- при замене картинки старая удаляется только после успешного сохранения.

## Что остаётся непроверенным

- реальные ответы RLS под двумя аккаунтами (нужны ваши действия выше);
- поведение Storage при истёкшей подписи (п. 12) — проверить вручную.

## Известное ограничение

Если браузер закрыть между загрузкой файла и сохранением записи, файл
останется в хранилище без ссылки. Удалять сразу нельзя: при сетевой
ошибке сохранения картинка пропала бы у живой записи. Для очистки нужна
отдельная страница или регламентная задача — на текущих объёмах
несущественно.
