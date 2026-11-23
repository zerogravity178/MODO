"use client";

import Link from "next/link";
import { LayoutGrid, List, Plus, Settings } from "lucide-react";

import { getModuleIcon } from "@/components/module/module-icons";
import { Button } from "@/components/ui/button";
import { IconBadge } from "@/components/ui/icon-badge";
import { plural } from "@/lib/records";
import type { ModuleRow } from "@/lib/types";
import { cn } from "@/lib/utils";

export type ViewMode = "cards" | "table";

type ModuleHeaderProps = {
  module: ModuleRow;
  total: number;
  view: ViewMode;
  onChangeView: (next: ViewMode) => void;
  onCreate: () => void;
};

const VIEW_TABS = [
  { id: "cards" as const, label: "Карточки", icon: LayoutGrid },
  { id: "table" as const, label: "Таблица", icon: List },
];

/** Шапка модуля: назад, название со счётчиком, действия и переключатель вида. */
export function ModuleHeader({
  module,
  total,
  view,
  onChangeView,
  onCreate,
}: ModuleHeaderProps) {
  const Icon = getModuleIcon(module.icon);

  return (
    <header className="space-y-4">
      <Link
        href="/"
        className="inline-flex min-h-9 items-center gap-1 text-sm text-muted-foreground transition hover:text-primary"
      >
        ← Назад
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <IconBadge icon={Icon} size="md" />
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-semibold text-foreground">
              {module.name}
            </h1>
            <p className="text-xs text-muted-foreground">
              {total === 0
                ? "пока пусто"
                : `${total} ${plural(total, "запись", "записи", "записей")}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" asChild>
            <Link
              href={`/m/${module.id}/settings`}
              aria-label="Настройки модуля"
              title="Настройки"
            >
              <Settings className="h-4 w-4" />
            </Link>
          </Button>

          <Button
            onClick={onCreate}
            className="bg-primary text-primary-foreground hover:bg-primary-hover"
          >
            <Plus className="mr-1 h-4 w-4" />
            Добавить
          </Button>
        </div>
      </div>

      {total > 0 && (
        <div className="flex gap-1 rounded-lg border border-border p-1 sm:w-fit">
          {VIEW_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChangeView(tab.id)}
              aria-pressed={view === tab.id}
              className={cn(
                "flex min-h-9 flex-1 items-center justify-center gap-1 rounded-md px-3 py-1.5 text-sm font-medium transition sm:flex-none",
                view === tab.id
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent"
              )}
            >
              <tab.icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          ))}
        </div>
      )}
    </header>
  );
}

export default ModuleHeader;
