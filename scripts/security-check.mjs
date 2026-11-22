#!/usr/bin/env node
/**
 * modo — проверка изоляции данных между двумя аккаунтами.
 *
 * Что делает:
 *   1. спрашивает два e-mail и два пароля (пароль не отображается);
 *   2. входит под A и под B обычным signInWithPassword — тем же способом,
 *      каким входит человек через форму /login;
 *   3. создаёт во временном виде по модулю с картинкой у A и у B;
 *   4. проверяет, что A не может читать/менять/удалять данные B;
 *   5. удаляет всё созданное и проверяет, что удалилось.
 *
 * Чего НЕ делает:
 *   • не использует service_role — только anon-ключ, как само приложение;
 *   • не меняет схему, RLS и код приложения;
 *   • не трогает существующие модули, записи и файлы;
 *   • не печатает пароли, токены и ключи.
 *
 * Запуск:
 *   npm run security:check            — обычная проверка
 *   npm run security:check -- --cleanup — только убрать остатки прошлого прогона
 */

import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { createClient } from "@supabase/supabase-js";

/* ------------------------------------------------------------------ */
/*  Константы                                                          */
/* ------------------------------------------------------------------ */

const BUCKET = "modo-images";
const STATE_FILE = join(".tools", "security-check-state.json");

/** 1×1 прозрачный PNG — минимальный валидный файл для Storage. */
const PNG_1X1 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64"
);

const FIELDS = [
  { id: "f1", label: "Название", type: "text" },
  { id: "f2", label: "Картинка", type: "image" },
];

/* ------------------------------------------------------------------ */
/*  Вывод                                                              */
/* ------------------------------------------------------------------ */

const useColor =
  process.stdout.isTTY === true && !process.env.NO_COLOR ? true : false;

const paint = (code, text) => (useColor ? `\u001b[${code}m${text}\u001b[0m` : text);
const green = (t) => paint("32", t);
const red = (t) => paint("31", t);
const yellow = (t) => paint("33", t);
const dim = (t) => paint("2", t);
const bold = (t) => paint("1", t);

function header(text) {
  console.log("\n" + bold(text));
  console.log("─".repeat(Math.min(72, Math.max(20, text.length))));
}

function info(text) {
  console.log("  " + text);
}

/* ------------------------------------------------------------------ */
/*  Ввод                                                               */
/* ------------------------------------------------------------------ */

/**
 * Чтение строки с терминала. hidden=true — символы не отображаются
 * и не попадают ни в историю, ни в вывод.
 */
function readLine(promptText, { hidden = false } = {}) {
  return new Promise((resolve, reject) => {
    process.stdout.write(promptText);

    const stdin = process.stdin;

    // Ввод не подключён (запуск из неинтерактивной оболочки или stdin
    // закрыт). Без этой ветки промис висел бы вечно, а процесс молча
    // завершался бы с кодом 0 — легко принять за «всё в порядке».
    if (stdin.isTTY === false && stdin.readableEnded) {
      reject(
        new Error(
          "Нет доступа к вводу с клавиатуры. Запустите проверку двойным щелчком " +
            "по файлу «Проверка безопасности.cmd» или в обычном окне терминала."
        )
      );
      return;
    }

    const canHide = hidden && stdin.isTTY === true;

    if (canHide) stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf8");

    let buffer = "";
    let settled = false;

    function cleanup() {
      stdin.removeListener("data", onData);
      stdin.removeListener("end", onEnd);
      stdin.removeListener("error", onEnd);
      if (canHide) stdin.setRawMode(false);
    }

    function finish() {
      if (settled) return false;
      settled = true;
      cleanup();
      if (hidden) process.stdout.write("\n");
      return true;
    }

    function onEnd() {
      // Поток ввода закрылся до перевода строки — считаем это отменой,
      // а не пустым ответом: иначе тест ушёл бы дальше с пустым паролем.
      if (!finish()) return;
      reject(
        new Error(
          "Ввод прерван до заполнения всех полей. Запустите проверку заново " +
            "в обычном окне терминала."
        )
      );
    }

    function onData(chunk) {
      for (const char of chunk) {
        if (char === "\n" || char === "\r") {
          if (!finish()) return;
          resolve(buffer);
          return;
        }
        if (char === "\u0003") {
          // Ctrl+C — выходим, ничего не сохраняя.
          finish();
          console.log("\nПрервано.");
          process.exit(130);
        }
        if (char === "\u007f" || char === "\b") {
          buffer = buffer.slice(0, -1);
          continue;
        }
        buffer += char;
      }
    }

    stdin.on("data", onData);
    stdin.on("end", onEnd);
    stdin.on("error", onEnd);
  });
}

function maskEmail(email) {
  const [name, domain] = email.split("@");
  if (!domain) return "***";
  const head = name.slice(0, 2);
  return `${head}${"*".repeat(Math.max(1, name.length - 2))}@${domain}`;
}

/* ------------------------------------------------------------------ */
/*  Переменные окружения                                               */
/* ------------------------------------------------------------------ */

function loadEnv() {
  const file = ".env.local";
  if (!existsSync(file)) {
    throw new Error(
      "Не найден файл .env.local — в нём адрес проекта и anon-ключ Supabase."
    );
  }

  const text = readFileSync(file, "utf8");
  const values = {};

  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!match) continue;
    values[match[1]] = match[2].replace(/^["']|["']$/g, "");
  }

  const url = values.NEXT_PUBLIC_SUPABASE_URL;
  const key = values.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      "В .env.local нет NEXT_PUBLIC_SUPABASE_URL или NEXT_PUBLIC_SUPABASE_ANON_KEY."
    );
  }

  return { url, key };
}

/* ------------------------------------------------------------------ */
/*  Клиенты                                                            */
/* ------------------------------------------------------------------ */

function makeClient(url, key) {
  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

async function signIn(client, email, password, label) {
  const { data, error } = await client.auth.signInWithPassword({ email, password });

  if (error) {
    throw new Error(`Не удалось войти как ${label}: ${error.message}`);
  }
  if (!data.user) {
    throw new Error(`Не удалось войти как ${label}: сервер не вернул пользователя.`);
  }

  return data.user.id;
}

/* ------------------------------------------------------------------ */
/*  Состояние прогона (для надёжной уборки)                            */
/* ------------------------------------------------------------------ */

function loadState() {
  if (!existsSync(STATE_FILE)) return null;
  try {
    return JSON.parse(readFileSync(STATE_FILE, "utf8"));
  } catch {
    return null;
  }
}

function saveState(state) {
  mkdirSync(dirname(STATE_FILE), { recursive: true });
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), "utf8");
}

function clearState() {
  if (existsSync(STATE_FILE)) rmSync(STATE_FILE, { force: true });
}

/* ------------------------------------------------------------------ */
/*  Уборка                                                             */
/* ------------------------------------------------------------------ */

/**
 * Удаляет только то, что перечислено в состоянии конкретного прогона.
 * Чужие модули и файлы не затрагиваются: в списке их просто нет.
 */
async function cleanup(state, clients) {
  const problems = [];

  // Сначала файлы: если модуль удалить не выйдет, файлы всё равно уберутся.
  for (const item of state.files ?? []) {
    const client = clients[item.owner];
    const { error } = await client.storage.from(BUCKET).remove([item.path]);
    if (error && !/not found|does not exist/i.test(error.message)) {
      problems.push(`файл ${item.path} (${item.owner}): ${error.message}`);
    }
  }

  // Затем модули — записи уйдут каскадом (records.module_id on delete cascade).
  for (const item of state.modules ?? []) {
    const client = clients[item.owner];
    const { error } = await client.from("modules").delete().eq("id", item.id);
    if (error) {
      problems.push(`модуль ${item.id} (${item.owner}): ${error.message}`);
    }
  }

  return problems;
}

/** Проверяет, что перечисленные объекты действительно исчезли. */
async function verifyRemoved(state, clients) {
  const leftovers = [];

  for (const item of state.modules ?? []) {
    const client = clients[item.owner];
    const { data, error } = await client
      .from("modules")
      .select("id")
      .eq("id", item.id);

    if (error) {
      leftovers.push(`модуль ${item.id}: не удалось проверить (${error.message})`);
      continue;
    }
    if ((data ?? []).length > 0) leftovers.push(`модуль ${item.id} (${item.owner})`);
  }

  for (const item of state.files ?? []) {
    const client = clients[item.owner];
    const { error } = await client.storage.from(BUCKET).download(item.path);
    if (!error) leftovers.push(`файл ${item.path} (${item.owner})`);
  }

  return leftovers;
}

function printLeftovers(leftovers) {
  console.log();
  console.log(red(bold("  Остались временные объекты:")));
  for (const item of leftovers) console.log("    • " + item);
  console.log();
  console.log("  Как убрать безопасно:");
  console.log("    1. Запустите ещё раз:  npm run security:check -- --cleanup");
  console.log("    2. Если не помогло — удалите вручную:");
  console.log("       Supabase → Table Editor → modules → строки с именем,");
  console.log("       начинающимся на «Проверка безопасности»;");
  console.log("       Supabase → Storage → modo-images → файлы с тем же префиксом.");
  console.log(dim("  Другие ваши данные эти имена не затрагивают."));
}

/* ------------------------------------------------------------------ */
/*  Результаты проверок                                                */
/* ------------------------------------------------------------------ */

const results = [];

function pass(id, title, detail) {
  results.push({ id, title, ok: true, detail });
  console.log(`  ${green("ПРОЙДЕНО")}   ${bold(id)}. ${title}${detail ? dim(" — " + detail) : ""}`);
}

function fail(id, title, detail, hint) {
  results.push({ id, title, ok: false, detail, hint });
  console.log(`  ${red("НЕ ПРОЙДЕНО")} ${bold(id)}. ${title}${detail ? dim(" — " + detail) : ""}`);
}

/* ------------------------------------------------------------------ */
/*  Вспомогательные проверки                                           */
/* ------------------------------------------------------------------ */

async function httpStatus(url) {
  try {
    const response = await fetch(url, { cache: "no-store" });
    await response.text().catch(() => "");
    return response.status;
  } catch {
    return 0;
  }
}

function isRlsDenial(error) {
  if (!error) return false;
  if (error.code === "42501") return true;
  return /row-level security|permission denied|not allowed/i.test(error.message ?? "");
}

/* ------------------------------------------------------------------ */
/*  Сценарий                                                           */
/* ------------------------------------------------------------------ */

async function main() {
  const args = process.argv.slice(2);
  const cleanupOnly = args.includes("--cleanup");

  console.log();
  console.log(bold("  modo — проверка изоляции данных между аккаунтами"));
  console.log(dim("  Проверяются только правила доступа. Код и база не меняются."));

  const { url, key } = loadEnv();

  /* --- Уборка остатков прошлого прогона --------------------------- */

  const previous = loadState();

  if (cleanupOnly && !previous) {
    console.log(yellow("\n  Незавершённых прогонов не найдено — убирать нечего."));
    return 0;
  }

  if (previous) {
    console.log(
      yellow(`\n  Найден незавершённый прогон от ${previous.startedAt ?? "ранее"} — уберу его после входа.`)
    );
  }

  if (cleanupOnly) {
    header("Уборка остатков прошлого прогона");
    info("Нужны те же два аккаунта, чтобы удалить их объекты.");
  }

  /* --- Данные аккаунтов ------------------------------------------- */

  header("Аккаунты");
  info("Нужны два уже существующих аккаунта MODO с разными e-mail.");
  info("Пароли не сохраняются на диск и не выводятся.");

  const emailA = (await readLine("\n  E-mail аккаунта A: ")).trim();
  const passA = await readLine("  Пароль аккаунта A (не отображается): ", { hidden: true });
  const emailB = (await readLine("  E-mail аккаунта B: ")).trim();
  const passB = await readLine("  Пароль аккаунта B (не отображается): ", { hidden: true });

  if (!emailA || !passA || !emailB || !passB) {
    console.log(red("\n  Заполните все четыре поля."));
    return 1;
  }

  if (emailA.toLowerCase() === emailB.toLowerCase()) {
    console.log(red("\n  Нужны два РАЗНЫХ аккаунта: иначе проверять нечего."));
    return 1;
  }

  /* --- Вход -------------------------------------------------------- */

  header("Вход");

  const clientA = makeClient(url, key);
  const clientB = makeClient(url, key);

  let uidA;
  let uidB;

  try {
    uidA = await signIn(clientA, emailA, passA, "A");
    console.log(`  ${green("ок")}  A: ${maskEmail(emailA)}`);
  } catch (error) {
    console.log("  " + red(error.message));
    return 1;
  }

  try {
    uidB = await signIn(clientB, emailB, passB, "B");
    console.log(`  ${green("ок")}  B: ${maskEmail(emailB)}`);
  } catch (error) {
    console.log("  " + red(error.message));
    return 1;
  }

  if (uidA === uidB) {
    console.log(red("\n  Оба входа привели к одному пользователю. Нужны разные аккаунты."));
    return 1;
  }

  /* --- Только уборка ---------------------------------------------- */

  if (cleanupOnly) {
    const clients = { A: clientA, B: clientB };

    const problems = await cleanup(previous, clients);
    const leftovers = await verifyRemoved(previous, clients);

    if (problems.length === 0 && leftovers.length === 0) {
      clearState();
      console.log("\n  " + green("Уборка завершена: временных объектов не осталось."));
      return 0;
    }

    if (problems.length > 0) {
      console.log();
      for (const problem of problems) console.log("    " + red("•") + " " + problem);
    }
    printLeftovers(leftovers.length > 0 ? leftovers : problems);
    return 1;
  }

  /* --- Незавершённый прогон перед новым --------------------------- */

  if (previous) {
    const problems = await cleanup(previous, { A: clientA, B: clientB });
    const leftovers = await verifyRemoved(previous, { A: clientA, B: clientB });

    if (problems.length === 0 && leftovers.length === 0) {
      clearState();
      console.log("  " + green("ок") + "  остатки прошлого прогона убраны");
    } else {
      console.log();
      console.log(
        "  " + yellow("Остатки прошлого прогона убрать не удалось — новый запуск отменён.")
      );
      printLeftovers(leftovers.length > 0 ? leftovers : problems);
      return 1;
    }
  }

  /* --- Временные объекты ------------------------------------------ */

  header("Подготовка временных объектов");

  const runId = randomUUID();
  const shortId = runId.slice(0, 8);
  const nameA = `Проверка безопасности A — ${shortId}`;
  const nameB = `Проверка безопасности B — ${shortId}`;

  const state = {
    runId,
    startedAt: new Date().toISOString(),
    modules: [],
    files: [],
  };

  saveState(state);

  const created = { moduleA: null, moduleB: null, recordA: null, recordB: null };

  async function createModule(client, name, owner, uid) {
    const { data, error } = await client
      .from("modules")
      .insert({
        name,
        icon: "box",
        fields: FIELDS,
        default_view: "cards",
        user_id: uid,
      })
      .select("id")
      .single();

    if (error || !data) {
      throw new Error(
        `Не удалось создать временный модуль (${owner}): ${error?.message ?? "нет ответа"}`
      );
    }

    state.modules.push({ id: data.id, owner });
    saveState(state);
    return data.id;
  }

  try {
    created.moduleA = await createModule(clientA, nameA, "A", uidA);
    console.log(`  ${green("ок")}  модуль A создан`);
    created.moduleB = await createModule(clientB, nameB, "B", uidB);
    console.log(`  ${green("ок")}  модуль B создан`);
  } catch (error) {
    console.log("  " + red(error.message));
    console.log(dim("\n  Дальше проверять нечего. Убираю созданное…"));
    const problems = await cleanup(state, { A: clientA, B: clientB });
    const leftovers = await verifyRemoved(state, { A: clientA, B: clientB });
    if (problems.length === 0 && leftovers.length === 0) clearState();
    else printLeftovers(leftovers.length > 0 ? leftovers : problems);
    return 1;
  }

  const pathA = `${uidA}/${created.moduleA}/check-${shortId}.png`;
  const pathB = `${uidB}/${created.moduleB}/check-${shortId}.png`;
  const pathEvil = `${uidA}/${created.moduleB}/evil-${shortId}.png`;

  /* --- Проверки ---------------------------------------------------- */

  header("Проверки");

  try {

  /* 1. A читает свой модуль */
  {
    const { data, error } = await clientA
      .from("modules")
      .select("id, name")
      .eq("id", created.moduleA);

    if (error) fail("1", "A читает свой модуль", error.message);
    else if ((data ?? []).length === 1) pass("1", "A читает свой модуль");
    else fail("1", "A читает свой модуль", "модуль не найден — вход или RLS сломаны");
  }

  /* 2a. Чужого модуля нет в списке */
  {
    const { data, error } = await clientA.from("modules").select("id");

    if (error) {
      fail("2a", "Чужой модуль не виден в списке", error.message);
    } else {
      const ids = (data ?? []).map((row) => row.id);
      if (ids.includes(created.moduleB)) {
        fail(
          "2a",
          "Чужой модуль не виден в списке",
          "модуль B присутствует в списке A",
          "Политика SELECT на таблице modules пропускает чужие строки."
        );
      } else {
        pass("2a", "Чужой модуль не виден в списке");
      }
    }
  }

  /* 2b. Чужой модуль недоступен напрямую по UUID */
  {
    const { data, error } = await clientA
      .from("modules")
      .select("id")
      .eq("id", created.moduleB);

    if (error) {
      pass("2b", "Чужой модуль недоступен напрямую по UUID", "запрос отклонён");
    } else if ((data ?? []).length === 0) {
      pass("2b", "Чужой модуль недоступен напрямую по UUID", "вернулось пусто");
    } else {
      fail(
        "2b",
        "Чужой модуль недоступен напрямую по UUID",
        "B отдаётся A по прямому id",
        "Это утечка: зная UUID, можно прочитать чужой модуль."
      );
    }
  }

  /* 3. Запись в своём модуле создаётся */
  {
    const { data, error } = await clientA
      .from("records")
      .insert({
        module_id: created.moduleA,
        user_id: uidA,
        data: { f1: "Тестовая запись A" },
      })
      .select("id")
      .single();

    if (error || !data) {
      fail("3", "A создаёт запись в своём модуле", error?.message ?? "нет ответа");
    } else {
      created.recordA = data.id;
      pass("3", "A создаёт запись в своём модуле");
    }
  }

  /* 4. Запись в чужом модуле не создаётся */
  {
    const { data, error } = await clientA
      .from("records")
      .insert({
        module_id: created.moduleB,
        user_id: uidA,
        data: { f1: "Взлом" },
      })
      .select("id");

    if (error && isRlsDenial(error)) {
      pass("4", "A не создаёт запись в чужом модуле", "отказ RLS");
    } else if ((data ?? []).length === 0) {
      pass("4", "A не создаёт запись в чужом модуле", "ничего не создано");
    } else {
      fail(
        "4",
        "A не создаёт запись в чужом модуле",
        "запись создана",
        "Можно дописать данные в чужой модуль. Проверьте политику INSERT на records."
      );
      // Убираем то, что не должно было появиться.
      const { data: rows } = await clientA
        .from("records")
        .select("id")
        .eq("module_id", created.moduleB);
      for (const row of rows ?? []) {
        await clientA.from("records").delete().eq("id", row.id);
      }
    }
  }

  /* Запись B нужна для проверок 5, 6, 9, 10, 11 */
  {
    const { data, error } = await clientB
      .from("records")
      .insert({
        module_id: created.moduleB,
        user_id: uidB,
        data: { f1: "Тестовая запись B" },
      })
      .select("id")
      .single();

    if (error || !data) {
      console.log(`  ${red("!")}  не удалось создать запись B: ${error?.message ?? "нет ответа"}`);
      console.log(dim("     Проверки 5, 6, 10 и 11 будут пропущены."));
    } else {
      created.recordB = data.id;
    }
  }

  const baselineB = "Тестовая запись B";

  /* 5. Изменение чужой записи запрещено + проверка под B */
  if (created.recordB) {
    let attemptBlocked = false;
    let detail = "";

    const { data, error } = await clientA
      .from("records")
      .update({ data: { f1: "Изменено чужим" } })
      .eq("id", created.recordB)
      .select("id");

    if (error) {
      attemptBlocked = isRlsDenial(error);
      detail = attemptBlocked ? "отказ RLS" : error.message;
    } else if ((data ?? []).length === 0) {
      attemptBlocked = true;
      detail = "0 строк изменено";
    } else {
      detail = "запись изменена";
    }

    // Отдельный вход под B: проверяем фактическое состояние данных.
    const clientBFresh = makeClient(url, key);
    await signIn(clientBFresh, emailB, passB, "B");

    const { data: after } = await clientBFresh
      .from("records")
      .select("data")
      .eq("id", created.recordB)
      .maybeSingle();

    const value = after?.data?.f1;
    const unchanged = value === baselineB;

    if (attemptBlocked && unchanged) {
      pass("5", "A не меняет запись B", "отказ, данные B не изменились");
    } else if (!attemptBlocked) {
      fail(
        "5",
        "A не меняет запись B",
        detail,
        "A смог изменить чужую запись. Проверьте политику UPDATE на records."
      );
    } else {
      fail(
        "5",
        "A не меняет запись B",
        `запрос отклонён, но данные B стали «${value}»`,
        "Запись изменилась несмотря на отказ — так быть не должно."
      );
    }
  }

  /* 6. Удаление чужой записи запрещено + проверка под B */
  if (created.recordB) {
    let attemptBlocked = false;
    let detail = "";

    const { data, error } = await clientA
      .from("records")
      .delete()
      .eq("id", created.recordB)
      .select("id");

    if (error) {
      attemptBlocked = isRlsDenial(error);
      detail = attemptBlocked ? "отказ RLS" : error.message;
    } else if ((data ?? []).length === 0) {
      attemptBlocked = true;
      detail = "0 строк удалено";
    } else {
      detail = "запись удалена";
    }

    const clientBFresh = makeClient(url, key);
    await signIn(clientBFresh, emailB, passB, "B");

    const { data: after } = await clientBFresh
      .from("records")
      .select("id")
      .eq("id", created.recordB)
      .maybeSingle();

    const stillThere = Boolean(after);

    if (attemptBlocked && stillThere) {
      pass("6", "A не удаляет запись B", "отказ, запись B на месте");
    } else if (!attemptBlocked) {
      fail(
        "6",
        "A не удаляет запись B",
        detail,
        "A смог удалить чужую запись. Проверьте политику DELETE на records."
      );
    } else {
      fail("6", "A не удаляет запись B", "запись B исчезла несмотря на отказ");
    }
  }

  /* 7. Загрузка файла в свой модуль */
  {
    const { error } = await clientA.storage
      .from(BUCKET)
      .upload(pathA, PNG_1X1, { contentType: "image/png", upsert: false });

    if (error) {
      fail(
        "7",
        "A загружает файл в свой модуль",
        error.message,
        "Без загрузки нельзя проверить остальное. Проверьте bucket modo-images и политики 004."
      );
    } else {
      state.files.push({ path: pathA, owner: "A" });
      saveState(state);
      pass("7", "A загружает файл в свой модуль");
    }
  }

  /* 8. Загрузка файла в чужой модуль */
  {
    const { error } = await clientA.storage
      .from(BUCKET)
      .upload(pathEvil, PNG_1X1, { contentType: "image/png", upsert: false });

    if (error) {
      pass("8", "A не загружает файл в чужой модуль", "отказ Storage");
    } else {
      state.files.push({ path: pathEvil, owner: "A" });
      saveState(state);
      fail(
        "8",
        "A не загружает файл в чужой модуль",
        "файл принят в папку с чужим module_id",
        "Скорее всего миграция 005_security_hardening.sql ещё не применена: " +
          "сейчас Storage проверяет только папку пользователя, но не владельца модуля."
      );
    }
  }

  /* 9. Signed URL на чужой файл не выдаётся */
  {
    const { data, error } = await clientB.storage
      .from(BUCKET)
      .upload(pathB, PNG_1X1, { contentType: "image/png", upsert: false });

    if (error) {
      console.log(`  ${red("!")}  файл B не загрузился: ${error.message}`);
      console.log(dim("     Проверки 9–11 будут пропущены."));
    } else {
      state.files.push({ path: pathB, owner: "B" });
      saveState(state);
    }
  }

  if (state.files.some((item) => item.path === pathB)) {
    const { data, error } = await clientA.storage
      .from(BUCKET)
      .createSignedUrl(pathB, 3600);

    if (error || !data?.signedUrl) {
      pass("9", "A не получает ссылку на чужой файл", "отказ Storage");
    } else {
      const status = await httpStatus(data.signedUrl);
      if (status === 200) {
        fail(
          "9",
          "A не получает ссылку на чужой файл",
          "ссылка выдана и открывается",
          "Это прямая утечка чужого изображения."
        );
      } else {
        pass("9", "A не получает ссылку на чужой файл", "ссылка выдана, но не открывается");
      }
    }

    /* 10. Удаление чужого файла запрещено + проверка под B */
    let attemptBlocked = false;
    let detail = "";

    {
      const { data, error } = await clientA.storage.from(BUCKET).remove([pathB]);
      if (error) {
        attemptBlocked = /denied|not allowed|security/i.test(error.message);
        detail = error.message;
      }
      // Storage при отказе возвращает ошибку; при частичном успехе — список путей.
      if (!error) {
        const removed = Array.isArray(data) ? data.length : 0;
        if (removed === 0) {
          attemptBlocked = true;
          detail = "ничего не удалено";
        } else {
          detail = "файл удалён";
        }
      }
    }

    const clientBFresh = makeClient(url, key);
    await signIn(clientBFresh, emailB, passB, "B");

    const { error: downloadError } = await clientBFresh.storage
      .from(BUCKET)
      .download(pathB);

    const stillExists = !downloadError;

    if (attemptBlocked && stillExists) {
      pass("10", "A не удаляет чужой файл", "отказ, файл B на месте");
    } else if (!attemptBlocked && stillExists) {
      // Запрос «прошёл», но файл на месте — фактического удаления не было.
      pass("10", "A не удаляет чужой файл", "файл B на месте");
    } else if (!attemptBlocked) {
      fail("10", "A не удаляет чужой файл", detail, "Файл чужого пользователя был удалён.");
    } else {
      fail(
        "10",
        "A не удаляет чужой файл",
        `запрос отклонён, но файл B не читается (${downloadError?.message ?? "?"})`,
        "Файл пропал несмотря на отказ — проверьте политику DELETE в Storage."
      );
    }

    /* 11. Публичный доступ без авторизации — отдельно от signed URL */
    {
      const publicUrl =
        `${url}/storage/v1/object/public/${BUCKET}/` +
        pathB.split("/").map(encodeURIComponent).join("/");

      const status = await httpStatus(publicUrl);

      if (status === 200) {
        fail(
          "11",
          "Файл не открывается без авторизации",
          "публичный адрес отдаёт файл",
          "Bucket стал публичным. В Supabase → Storage → modo-images " +
            "выключите Public bucket и примените 005_security_hardening.sql."
        );
      } else if (status === 0) {
        fail("11", "Файл не открывается без авторизации", "нет ответа от сервера");
      } else {
        pass("11", "Файл не открывается без авторизации", `ответ ${status}`);
      }
    }
  }

  /* 12. Короткая подписанная ссылка истекает */
  {
    const ownFile = state.files.find((item) => item.path === pathA && item.owner === "A");

    if (!ownFile) {
      fail("12", "Короткая ссылка перестаёт работать", "нет собственного файла A");
    } else {
      const { data, error } = await clientA.storage
        .from(BUCKET)
        .createSignedUrl(pathA, 1);

      if (error || !data?.signedUrl) {
        fail("12", "Короткая ссылка перестаёт работать", error?.message ?? "ссылка не выдана");
      } else {
        const first = await httpStatus(data.signedUrl);
        await new Promise((resolve) => setTimeout(resolve, 2200));
        const second = await httpStatus(data.signedUrl);

        if (first === 200 && second !== 200 && second !== 0) {
          pass(
            "12",
            "Короткая ссылка (1 с) перестаёт работать",
            `сразу ${first}, через 2 с ${second}`
          );
        } else if (first !== 200) {
          fail(
            "12",
            "Короткая ссылка (1 с) перестаёт работать",
            `ссылка не открылась даже сразу (ответ ${first})`
          );
        } else {
          fail(
            "12",
            "Короткая ссылка (1 с) перестаёт работать",
            `через 2 с ссылка всё ещё работает (ответ ${second})`
          );
        }
      }
    }
  }

  /* --- Уборка (выполняется всегда, даже при сбое) ------------------ */

  } catch (error) {
    // Любая неожиданная ошибка не должна оставить мусор в базе —
    // поэтому уборка ниже в finally, а не в конце счастливого пути.
    fail("!", "Проверка прервана ошибкой", error.message);
  } finally {
    header("Уборка");

    const problems = await cleanup(state, { A: clientA, B: clientB });
    const leftovers = await verifyRemoved(state, { A: clientA, B: clientB });

    if (problems.length === 0 && leftovers.length === 0) {
      clearState();
      pass("13", "Временные объекты удалены", "модули и файлы убраны");
    } else {
      if (problems.length > 0) {
        for (const problem of problems) console.log("    " + red("•") + " " + problem);
      }
      fail("13", "Временные объекты удалены", "часть объектов осталась");
      printLeftovers(leftovers.length > 0 ? leftovers : problems);
    }
  }

  /* --- Итог -------------------------------------------------------- */

  const failed = results.filter((item) => !item.ok);

  console.log();
  console.log("─".repeat(72));
  if (failed.length === 0) {
    console.log("  " + green(bold("ИТОГ: все проверки пройдены")) + dim(` (${results.length})`));
  } else {
    console.log(
      "  " + red(bold(`ИТОГ: не пройдено ${failed.length} из ${results.length}`))
    );
  }
  console.log("─".repeat(72));

  if (failed.length > 0) {
    console.log("\n  " + bold("Что это значит:"));
    for (const item of failed) {
      console.log(`\n  ${red("•")} ${bold(item.id)}. ${item.title}`);
      if (item.detail) console.log("    " + item.detail);
      if (item.hint) console.log("    " + yellow(item.hint));
    }
  }

  console.log(
    "\n  " +
      dim(
        "Проверка 12 подтверждает только механизм истечения на ссылке в 1 секунду.\n" +
          "  Стандартный часовой срок она не проверяет."
      )
  );

  return failed.length === 0 ? 0 : 1;
}

/* ------------------------------------------------------------------ */

main()
  .then((code) => {
    process.exitCode = code ?? 0;
    // Отпускаем stdin, иначе процесс может ждать ввода.
    if (process.stdin.isTTY) process.stdin.pause();
  })
  .catch((error) => {
    console.error("\n  " + red("Ошибка: ") + error.message);
    process.exitCode = 1;
    if (process.stdin.isTTY) process.stdin.pause();
  });