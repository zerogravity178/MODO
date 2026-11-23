import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";

import { ModuleCard } from "@/components/module/ModuleCard";
import { getModuleIcon } from "@/components/module/module-icons";
import { Button } from "@/components/ui/button";
import { IconBadge } from "@/components/ui/icon-badge";
import { Surface } from "@/components/ui/surface";
import { createClient } from "@/lib/supabase/server";

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
                <Surface
                  key={template.id}
                  padding="md"
                  className="flex flex-col gap-4"
                >
                  <div className="flex items-center gap-3">
                    <IconBadge icon={Icon} size="sm" />
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
                </Surface>
              );
            })}
          </div>

          {templates.length === 0 && (
            <Surface
              variant="dashed"
              padding="md"
              className="text-sm text-muted-foreground"
            >
              Шаблоны не загружены. Выполните `002_seed_templates.sql` в Supabase
              SQL Editor.
            </Surface>
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
