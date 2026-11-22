import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";

import { ExportAllButton } from "@/components/module/ExportAllButton";
import { ModuleCard } from "@/components/module/ModuleCard";
import { getModuleIcon } from "@/components/module/module-icons";
import { Button } from "@/components/ui/button";
import { buildBackup } from "@/lib/export";
import { createClient } from "@/lib/supabase/server";
import type { ModuleRow, RecordRow } from "@/lib/types";

import { createModuleFromTemplate } from "./actions";

// Дата должна считаться заново при каждом заходе, а не на этапе сборки.
export const dynamic = "force-dynamic";

const TIME_ZONE = "Europe/Moscow";

function formatToday(now: Date) {
  const date = new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    timeZone: TIME_ZONE,
  }).format(now);
  const weekday = new Intl.DateTimeFormat("ru-RU", {
    weekday: "long",
    timeZone: TIME_ZONE,
  }).format(now);

  return `${date}, ${weekday}`;
}

/** Вложенный count приходит как [{ count: n }] — достаём число. */
function readCount(row: { records?: { count: number }[] | null }) {
  return row.records?.[0]?.count ?? 0;
}

export default async function HomePage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [modulesResult, templatesResult] = await Promise.all([
    supabase
      .from("modules")
      .select("*, records(count)")
      .order("created_at", { ascending: false }),
    supabase.from("templates").select().order("sort_order"),
  ]);

  const modules = modulesResult.data ?? [];
  const templates = templatesResult.data ?? [];
  const hasModules = modules.length > 0;

  // Резервная копия собирается заранее на сервере: клиенту остаётся скачать
  // готовый файл, без второго похода в базу.
  let backupJson = "";
  if (hasModules) {
    const { data: allRecords } = await supabase
      .from("records")
      .select()
      .order("created_at", { ascending: true });

    backupJson = JSON.stringify(
      buildBackup(
        (modules as ModuleRow[]).map((module) => ({
          module,
          records: ((allRecords ?? []) as RecordRow[]).filter(
            (record) => record.module_id === module.id
          ),
        }))
      ),
      null,
      2
    );
  }

  return (
    <main className="space-y-10">
      <header className="space-y-1">
        <p className="text-sm font-medium text-primary">
          {formatToday(new Date())}
        </p>
        <p className="text-xs text-muted-foreground">
          Твои инструменты, твои правила
        </p>
      </header>

      {hasModules ? (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-foreground">
              Мои модули
            </h2>
            <div className="flex flex-wrap items-center gap-2">
              {backupJson && <ExportAllButton content={backupJson} />}
              <Button
                asChild
                size="sm"
                className="bg-primary text-primary-foreground hover:bg-primary-hover"
              >
                <Link href="/m/new">
                  <Plus className="mr-1 h-4 w-4" />
                  Создать модуль
                </Link>
              </Button>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {modules.map((module) => (
              <ModuleCard
                key={module.id}
                id={module.id}
                name={module.name}
                icon={module.icon}
                count={readCount(module)}
                href={`/m/${module.id}`}
                canDuplicate
              />
            ))}
          </div>
        </section>
      ) : (
        <section className="space-y-4">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-foreground">
              С чего начать
            </h2>
            <p className="text-sm text-muted-foreground">
              Выберите готовый шаблон — модуль создастся сразу.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {templates.map((template) => {
              const Icon = getModuleIcon(template.icon);

              return (
                <div
                  key={template.id}
                  className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </span>
                    <p className="truncate font-medium text-foreground">
                      {template.name}
                    </p>
                  </div>

                  <form action={createModuleFromTemplate.bind(null, template.id)}>
                    <Button
                      type="submit"
                      size="sm"
                      className="w-full bg-primary text-primary-foreground hover:bg-primary-hover"
                    >
                      Использовать
                    </Button>
                  </form>
                </div>
              );
            })}
          </div>

          {templates.length === 0 && (
            <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
              Шаблоны не загружены. Выполните `002_seed_templates.sql` в Supabase
              SQL Editor.
            </p>
          )}

          <Button
            asChild
            className="w-full bg-primary text-primary-foreground hover:bg-primary-hover"
          >
            <Link href="/m/new">
              <Plus className="mr-1 h-4 w-4" />
              Создать модуль
            </Link>
          </Button>
          <p className="text-xs text-muted-foreground">
            Назовите модуль, выберите иконку и поля — всё остальное настроите
            внутри.
          </p>
        </section>
      )}
    </main>
  );
}
