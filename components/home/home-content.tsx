import Link from "next/link";
import { Plus } from "lucide-react";

import { ModuleCard } from "@/components/module/ModuleCard";
import { getModuleIcon } from "@/components/module/module-icons";
import { RecentActivity } from "@/components/home/recent-activity";
import { Button } from "@/components/ui/button";
import { IconBadge } from "@/components/ui/icon-badge";
import { Surface } from "@/components/ui/surface";
import type { ModuleRow, RecordRow } from "@/lib/types";
import { plural } from "@/lib/records";

import { createModuleFromTemplate } from "@/app/(app)/actions";

type TemplatesProps = {
  templates: ModuleRow[];
};

type HomeContentProps = {
  modules: ModuleRow[];
  templates: TemplatesProps["templates"];
  recent: RecordRow[];
  totalRecords: number;
};

/** Сводка: сколько модулей и записей — одна строка, без отдельной карточки. */
function summaryLine(moduleCount: number, recordCount: number) {
  return `${moduleCount} ${plural(moduleCount, "модуль", "модуля", "модулей")} · ${recordCount} ${plural(recordCount, "запись", "записи", "записей")}`;
}

export function HomeContent({
  modules,
  templates,
  recent,
  totalRecords,
}: HomeContentProps) {
  const hasModules = modules.length > 0;

  return (
    <div className="space-y-10">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Мои инструменты
        </h1>
        <p className="text-sm text-muted-foreground">
          {hasModules
            ? summaryLine(modules.length, totalRecords)
            : "Соберите свой первый модуль под задачу."}
        </p>
      </header>

      {hasModules ? (
        <>
          <section className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-foreground">
                Мои модули
              </h2>
              <Button asChild size="sm">
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
                  count={module.records?.[0]?.count ?? 0}
                  href={`/m/${module.id}`}
                  canDuplicate
                />
              ))}
            </div>
          </section>

          <RecentActivity modules={modules} records={recent} />
        </>
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

                  <form
                    action={createModuleFromTemplate.bind(null, template.id)}
                  >
                    <Button type="submit" size="sm" className="w-full">
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

          <Button asChild className="w-full">
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
    </div>
  );
}

export default HomeContent;
