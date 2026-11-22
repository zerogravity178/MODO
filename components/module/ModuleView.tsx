"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowDownUp,
  LayoutGrid,
  List,
  Plus,
  Search,
  Settings,
  SlidersHorizontal,
  Trash2,
  X,
} from "lucide-react";

import { RecordCard } from "@/components/module/RecordCard";
import { getModuleIcon } from "@/components/module/module-icons";
import { RecordForm } from "@/components/record/RecordForm";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { createClient } from "@/lib/supabase/client";
import {
  filterValues,
  matchesFilters,
  matchesQuery,
  plural,
  sortItems,
  withData,
  type SortDirection,
  type SortKey,
} from "@/lib/records";
import {
  formatFieldValue,
  type FieldDef,
  type ModuleRow,
  type RecordRow,
} from "@/lib/types";
import { cn } from "@/lib/utils";

type ViewMode = "cards" | "table";

type ModuleViewProps = {
  module: ModuleRow;
  fields: FieldDef[];
  records: RecordRow[];
  /** recordId → fieldId → подписанная ссылка на картинку из Storage. */
  imageUrls?: Record<string, Record<string, string>>;
};

const selectClass =
  "flex h-10 w-full rounded-md border border-neutral-300 bg-white px-2 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f97316] focus-visible:ring-offset-2 dark:border-neutral-700 dark:bg-neutral-900 sm:h-9 sm:text-sm";

/** Поля, по которым имеет смысл фильтровать: мало вариантов, легко выбрать. */
function filterableFields(fields: FieldDef[]): FieldDef[] {
  return fields.filter(
    (field) => field.type === "select" || field.type === "boolean"
  );
}

export function ModuleView({
  module,
  fields,
  records,
  imageUrls,
}: ModuleViewProps) {
  const router = useRouter();
  const Icon = getModuleIcon(module.icon);

  const [view, setView] = useState<ViewMode>(
    module.default_view === "table" ? "table" : "cards"
  );

  const [query, setQuery] = useState("");
  const [panelOpen, setPanelOpen] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("__created_at__");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [filters, setFilters] = useState<Record<string, string>>({});

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<RecordRow | null>(null);

  const [pendingDelete, setPendingDelete] = useState<RecordRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const items = useMemo(() => withData(records), [records]);
  const total = records.length;

  const activeFilters = Object.values(filters).filter(Boolean).length;
  const filtersActive = activeFilters > 0 || query.trim().length > 0;

  const visible = useMemo(() => {
    const filtered = items.filter(
      (item) => matchesQuery(item, fields, query) && matchesFilters(item, filters)
    );
    return sortItems(filtered, sortKey, sortDirection);
  }, [items, fields, query, filters, sortKey, sortDirection]);

  /**
   * Режим хранится в modules.default_view, чтобы при следующем заходе
   * открывался тот же вид. Ошибку не показываем: это настройка удобства,
   * а не данные.
   */
  function changeView(next: ViewMode) {
    setView(next);
    if (next === module.default_view) return;

    void createClient()
      .from("modules")
      .update({ default_view: next })
      .eq("id", module.id);
  }

  function resetAll() {
    setQuery("");
    setFilters({});
    setSortKey("__created_at__");
    setSortDirection("desc");
  }

  function handleSaved() {
    setFormOpen(false);
    setEditing(null);
    router.refresh();
  }

  async function confirmDelete() {
    if (!pendingDelete) return;

    setDeleting(true);
    setDeleteError(null);

    const supabase = createClient();
    const { error } = await supabase
      .from("records")
      .delete()
      .eq("id", pendingDelete.id);

    if (error) {
      setDeleteError(error.message);
      setDeleting(false);
      return;
    }

    setDeleting(false);
    setPendingDelete(null);
    router.refresh();
  }

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function urlFor(recordId: string, fieldId: string): string | undefined {
    return imageUrls?.[recordId]?.[fieldId];
  }

  return (
    <div className="space-y-6">
      <header className="space-y-4">
        <Link
          href="/"
          className="inline-flex min-h-9 items-center gap-1 text-sm text-neutral-500 transition hover:text-[#f97316] dark:text-neutral-400"
        >
          ← Назад
        </Link>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#f97316]/10 text-[#f97316]">
              <Icon className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <h1 className="truncate text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
                {module.name}
              </h1>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
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
              onClick={openCreate}
              className="bg-[#f97316] text-white hover:bg-[#ea6a0b]"
            >
              <Plus className="mr-1 h-4 w-4" />
              Добавить
            </Button>
          </div>
        </div>

        {total > 0 && (
          <>
            <div className="flex gap-1 rounded-lg border border-neutral-200 p-1 dark:border-neutral-800 sm:w-fit">
              {(
                [
                  { id: "cards" as const, label: "Карточки", icon: LayoutGrid },
                  { id: "table" as const, label: "Таблица", icon: List },
                ]
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => changeView(tab.id)}
                  aria-pressed={view === tab.id}
                  className={cn(
                    "flex min-h-9 flex-1 items-center justify-center gap-1 rounded-md px-3 py-1.5 text-sm font-medium transition sm:flex-none",
                    view === tab.id
                      ? "bg-[#f97316] text-white"
                      : "text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
                  )}
                >
                  <tab.icon className="h-3.5 w-3.5" />
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500 dark:text-neutral-400" />
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Поиск по записям"
                  aria-label="Поиск по записям"
                  className="h-10 w-full rounded-md border border-neutral-300 bg-white pl-9 pr-2 text-base text-neutral-900 placeholder:text-neutral-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f97316] focus-visible:ring-offset-2 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:placeholder:text-neutral-400 sm:h-9 sm:text-sm"
                />
              </div>

              <button
                type="button"
                onClick={() => setPanelOpen((open) => !open)}
                aria-expanded={panelOpen}
                aria-controls="filters-panel"
                className={cn(
                  "flex h-10 shrink-0 items-center gap-1.5 rounded-md border px-3 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f97316] focus-visible:ring-offset-2 sm:h-9",
                  activeFilters > 0
                    ? "border-[#f97316] text-[#f97316]"
                    : "border-neutral-300 text-neutral-600 hover:border-neutral-400 dark:border-neutral-700 dark:text-neutral-300 dark:hover:border-neutral-600"
                )}
              >
                <SlidersHorizontal className="h-4 w-4" />
                <span className="hidden sm:inline">Фильтры</span>
                {activeFilters > 0 && (
                  <span className="rounded-full bg-[#f97316] px-1.5 text-xs font-semibold text-white">
                    {activeFilters}
                  </span>
                )}
              </button>
            </div>

            {panelOpen && (
              <div
                id="filters-panel"
                className="space-y-3 rounded-xl border border-neutral-200 p-3 dark:border-neutral-800"
              >
                <div className="grid gap-2 sm:grid-cols-2">
                  <label className="space-y-1">
                    <span className="text-xs text-neutral-500 dark:text-neutral-400">
                      Сортировка
                    </span>
                    <select
                      value={sortKey}
                      onChange={(event) => setSortKey(event.target.value)}
                      className={selectClass}
                    >
                      <option value="__created_at__">По дате создания</option>
                      {fields.map((field) => (
                        <option key={field.id} value={field.id}>
                          {field.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <div className="space-y-1">
                    <span className="text-xs text-neutral-500 dark:text-neutral-400">
                      Направление
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setSortDirection((current) =>
                          current === "asc" ? "desc" : "asc"
                        )
                      }
                      className="flex h-10 w-full items-center justify-center gap-1.5 rounded-md border border-neutral-300 px-2 text-sm text-neutral-700 transition hover:border-[#f97316] hover:text-[#f97316] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f97316] focus-visible:ring-offset-2 dark:border-neutral-700 dark:text-neutral-200 sm:h-9"
                    >
                      <ArrowDownUp className="h-4 w-4" />
                      {sortDirection === "asc" ? "По возрастанию" : "По убыванию"}
                    </button>
                  </div>
                </div>

                {filterableFields(fields).length > 0 && (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {filterableFields(fields).map((field) => (
                      <label key={field.id} className="space-y-1">
                        <span className="text-xs text-neutral-500 dark:text-neutral-400">
                          {field.label}
                        </span>
                        <select
                          value={filters[field.id] ?? ""}
                          onChange={(event) =>
                            setFilters((current) => ({
                              ...current,
                              [field.id]: event.target.value,
                            }))
                          }
                          className={selectClass}
                        >
                          <option value="">Любое</option>
                          {filterValues(items, field).map((value) => (
                            <option key={value} value={value}>
                              {value}
                            </option>
                          ))}
                          <option value="__empty__">Пустые</option>
                        </select>
                      </label>
                    ))}
                  </div>
                )}

                <button
                  type="button"
                  onClick={resetAll}
                  className="inline-flex min-h-9 items-center gap-1 text-xs text-neutral-500 transition hover:text-[#f97316] dark:text-neutral-400"
                >
                  <X className="h-3.5 w-3.5" />
                  Сбросить
                </button>
              </div>
            )}

            {filtersActive && (
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Найдено: {visible.length} из {total}
              </p>
            )}
          </>
        )}
      </header>

      {total === 0 ? (
        <EmptyState
          icon={module.icon}
          title="Пока нет записей"
          description="Добавьте первую запись — она появится здесь."
        >
          <Button
            onClick={openCreate}
            className="bg-[#f97316] text-white hover:bg-[#ea6a0b]"
          >
            <Plus className="mr-1 h-4 w-4" />
            Добавить запись
          </Button>
        </EmptyState>
      ) : visible.length === 0 ? (
        <EmptyState
          icon="search"
          title="Ничего не нашлось"
          description="Попробуйте другой запрос или сбросьте фильтры."
        >
          <Button variant="outline" onClick={resetAll}>
            Сбросить
          </Button>
        </EmptyState>
      ) : view === "cards" ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((item) => (
            <RecordCard
              key={item.record.id}
              fields={fields}
              data={item.data}
              imageUrls={imageUrls?.[item.record.id]}
              onEdit={() => setEditing(item.record)}
              onDelete={() => {
                setDeleteError(null);
                setPendingDelete(item.record);
              }}
            />
          ))}
        </div>
      ) : (
        <RecordTable
          fields={fields}
          items={visible}
          imageUrls={imageUrls}
          onEdit={setEditing}
          onDelete={(record) => {
            setDeleteError(null);
            setPendingDelete(record);
          }}
        />
      )}

      <Dialog
        open={formOpen || editing !== null}
        onOpenChange={(open) => {
          if (!open) {
            setFormOpen(false);
            setEditing(null);
          }
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Изменить запись" : "Новая запись"}
            </DialogTitle>
            <DialogDescription>
              {module.name} · заполните поля и сохраните.
            </DialogDescription>
          </DialogHeader>
          <RecordForm
            key={editing?.id ?? "new"}
            moduleId={module.id}
            fields={fields}
            recordId={editing?.id}
            initialValues={
              editing ? (withData([editing])[0]?.data ?? {}) : undefined
            }
            initialImageUrls={
              editing ? imageUrls?.[editing.id] : undefined
            }
            onSaved={handleSaved}
            onCancel={() => {
              setFormOpen(false);
              setEditing(null);
            }}
          />
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPendingDelete(null);
            setDeleteError(null);
          }
        }}
        title="Удалить запись?"
        description="Запись будет удалена безвозвратно."
        pending={deleting}
        error={deleteError}
        onConfirm={() => {
          void confirmDelete();
        }}
      />
    </div>
  );
}

type RecordTableProps = {
  fields: FieldDef[];
  items: ReturnType<typeof withData>;
  imageUrls?: Record<string, Record<string, string>>;
  onEdit: (record: RecordRow) => void;
  onDelete: (record: RecordRow) => void;
};

function RecordTable({
  fields,
  items,
  imageUrls,
  onEdit,
  onDelete,
}: RecordTableProps) {
  return (
    <div className="relative overflow-x-auto rounded-xl border border-neutral-200 dark:border-neutral-800">
      <table className="w-full border-collapse text-sm">
        <thead className="bg-neutral-50 text-left text-xs uppercase tracking-wide text-neutral-500 dark:bg-neutral-900 dark:text-neutral-400">
          <tr>
            {fields.map((field) => (
              <th key={field.id} className="px-3 py-2 font-medium">
                {field.label}
              </th>
            ))}
            <th className="px-3 py-2 font-medium">Создано</th>
            <th className="w-10 px-3 py-2">
              <span className="sr-only">Действия</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map(({ record, data }) => (
            <tr
              key={record.id}
              onClick={() => onEdit(record)}
              className="group cursor-pointer border-t border-neutral-100 align-middle transition hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-900"
            >
              {fields.map((field) => {
                const value = data[field.id];
                const src =
                  field.type === "image"
                    ? (imageUrls?.[record.id]?.[field.id] ??
                      (typeof value === "string" && value.startsWith("http")
                        ? value
                        : undefined))
                    : undefined;

                return (
                  <td
                    key={field.id}
                    className="px-3 py-2 text-neutral-800 dark:text-neutral-200"
                  >
                    {src ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={src}
                        alt={field.label}
                        className="h-10 w-10 rounded object-cover"
                      />
                    ) : field.type === "image" && value ? (
                      <span className="text-xs text-neutral-500 dark:text-neutral-400">
                        файл
                      </span>
                    ) : (
                      formatFieldValue(value)
                    )}
                  </td>
                );
              })}
              <td className="whitespace-nowrap px-3 py-2 text-xs text-neutral-500 dark:text-neutral-400">
                {record.created_at
                  ? new Date(record.created_at).toLocaleDateString("ru-RU")
                  : "—"}
              </td>
              <td className="px-3 py-2 text-right">
                <button
                  type="button"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    onDelete(record);
                  }}
                  aria-label="Удалить запись"
                  title="Удалить запись"
                  className="rounded-md p-2 text-neutral-500 opacity-0 transition hover:bg-red-50 hover:text-red-600 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f97316] group-hover:opacity-100 dark:text-neutral-400 dark:hover:bg-red-950/40 dark:hover:text-red-400 [@media(hover:none)]:p-2.5 [@media(hover:none)]:opacity-100"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default ModuleView;
