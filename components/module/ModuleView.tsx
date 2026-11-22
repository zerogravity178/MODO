"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowDownUp,
  Download,
  LayoutGrid,
  List,
  Plus,
  Search,
  Settings,
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
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import {
  formatNumber,
  groupByField,
  matchesQuery,
  sortItems,
  summarizeNumeric,
  toCsv,
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
};

const selectClass =
  "flex h-9 w-full rounded-md border border-neutral-300 bg-white px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f97316] focus-visible:ring-offset-2 dark:border-neutral-700 dark:bg-neutral-900";

export function ModuleView({ module, fields, records }: ModuleViewProps) {
  const router = useRouter();
  const Icon = getModuleIcon(module.icon);

  const [view, setView] = useState<ViewMode>(
    module.default_view === "table" ? "table" : "cards"
  );

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<RecordRow | null>(null);

  const [pendingDelete, setPendingDelete] = useState<RecordRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [filterField, setFilterField] = useState("");
  const [filterValue, setFilterValue] = useState("");
  const [groupField, setGroupField] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("__created_at__");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const selectFields = fields.filter(
    (field) => field.type === "select" && (field.options ?? []).length > 0
  );
  const numberFields = fields.filter((field) => field.type === "number");

  const items = useMemo(() => {
    let result = withData(records);

    if (query.trim()) {
      result = result.filter((item) => matchesQuery(item, fields, query));
    }

    if (filterField && filterValue) {
      result = result.filter(
        (item) => formatFieldValue(item.data[filterField]) === filterValue
      );
    }

    return sortItems(result, sortKey, sortDirection);
  }, [records, fields, query, filterField, filterValue, sortKey, sortDirection]);

  const groups = useMemo(() => {
    if (!groupField) return null;
    const field = fields.find((item) => item.id === groupField);
    if (!field) return null;
    return groupByField(items, field);
  }, [items, groupField, fields]);

  const summaryField = numberFields[0];
  const summary = summaryField ? summarizeNumeric(items, summaryField.id) : null;

  const filtersActive = Boolean(query || filterField || groupField);
  const total = records.length;

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

  function resetFilters() {
    setQuery("");
    setFilterField("");
    setFilterValue("");
    setGroupField("");
  }

  function downloadCsv() {
    // Экспортируем то, что сейчас видно: с учётом поиска, фильтра и сортировки.
    const csv = toCsv(
      fields,
      items.map((item) => item.record)
    );
    // BOM нужен, чтобы Excel открыл кириллицу не крякозябрами.
    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `${module.name.replace(/[\\/:*?"<>|]/g, "-")}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function renderRecord(item: (typeof items)[number]) {
    if (view === "cards") {
      return (
        <RecordCard
          key={item.record.id}
          fields={fields}
          data={item.data}
          onEdit={() => setEditing(item.record)}
          onDelete={() => {
            setDeleteError(null);
            setPendingDelete(item.record);
          }}
        />
      );
    }

    return null;
  }

  return (
    <div className="space-y-6">
      <header className="space-y-5">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-neutral-500 transition hover:text-[#f97316] dark:text-neutral-400"
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
                  : `${formatNumber(total)} ${total === 1 ? "запись" : total < 5 ? "записи" : "записей"}`}
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
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
              className="bg-[#f97316] text-white hover:bg-[#ea6a0b]"
            >
              <Plus className="mr-1 h-4 w-4" />
              Добавить
            </Button>
          </div>
        </div>

        {total > 0 && (
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative min-w-[12rem] flex-1">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500 dark:text-neutral-400" />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Поиск по записям"
                  className="h-9 pl-8 focus-visible:ring-[#f97316]"
                />
              </div>

              <div className="flex gap-1 rounded-lg border border-neutral-200 p-1 dark:border-neutral-800">
                {(
                  [
                    { id: "cards" as const, label: "Карточки", icon: LayoutGrid },
                    { id: "table" as const, label: "Таблица", icon: List },
                  ]
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setView(tab.id)}
                    aria-pressed={view === tab.id}
                    className={cn(
                      "flex items-center gap-1 rounded-md px-2.5 py-1 text-sm font-medium transition",
                      view === tab.id
                        ? "bg-[#f97316] text-white"
                        : "text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
                    )}
                  >
                    <tab.icon className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">{tab.label}</span>
                  </button>
                ))}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={downloadCsv}
                title="Скачать CSV"
                className="h-9"
              >
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">CSV</span>
              </Button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {selectFields.length > 0 && (
                <>
                  <select
                    value={filterField}
                    onChange={(event) => {
                      setFilterField(event.target.value);
                      setFilterValue("");
                    }}
                    className={cn(selectClass, "w-auto min-w-[8rem]")}
                    aria-label="Поле фильтра"
                  >
                    <option value="">Фильтр: все</option>
                    {selectFields.map((field) => (
                      <option key={field.id} value={field.id}>
                        {field.label}
                      </option>
                    ))}
                  </select>

                  {filterField && (
                    <select
                      value={filterValue}
                      onChange={(event) => setFilterValue(event.target.value)}
                      className={cn(selectClass, "w-auto min-w-[8rem]")}
                      aria-label="Значение фильтра"
                    >
                      <option value="">Любое</option>
                      {(fields.find((field) => field.id === filterField)
                        ?.options ?? []
                      ).map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  )}
                </>
              )}

              <select
                value={sortKey}
                onChange={(event) => {
                  setSortKey(event.target.value);
                  setSortDirection("asc");
                }}
                className={cn(selectClass, "w-auto min-w-[8rem]")}
                aria-label="Сортировка"
              >
                <option value="__created_at__">По дате создания</option>
                {fields.map((field) => (
                  <option key={field.id} value={field.id}>
                    {field.label}
                  </option>
                ))}
              </select>

              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setSortDirection((current) =>
                    current === "asc" ? "desc" : "asc"
                  )
                }
                title={sortDirection === "asc" ? "По возрастанию" : "По убыванию"}
                className="h-9"
              >
                <ArrowDownUp className="h-4 w-4" />
                {sortDirection === "asc" ? "А-Я" : "Я-А"}
              </Button>

              {selectFields.length > 0 && (
                <select
                  value={groupField}
                  onChange={(event) => setGroupField(event.target.value)}
                  className={cn(selectClass, "w-auto min-w-[8rem]")}
                  aria-label="Группировка"
                >
                  <option value="">Без группировки</option>
                  {selectFields.map((field) => (
                    <option key={field.id} value={field.id}>
                      По «{field.label}»
                    </option>
                  ))}
                </select>
              )}

              {filtersActive && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetFilters}
                  className="h-9 text-neutral-500 dark:text-neutral-400"
                >
                  <X className="h-4 w-4" />
                  Сбросить
                </Button>
              )}
            </div>
          </div>
        )}

        {summary && (
          <div className="space-y-1">
            <div className="grid gap-2 rounded-xl border border-neutral-200 bg-neutral-50/60 p-3 sm:grid-cols-4 dark:border-neutral-800 dark:bg-neutral-900/60">
              {[
                { label: `Сумма · ${summaryField.label}`, value: summary.sum },
                { label: "Среднее", value: summary.average },
                { label: "Минимум", value: summary.min },
                { label: "Максимум", value: summary.max },
              ].map((cell) => (
                <div key={cell.label} className="space-y-0.5">
                  <p className="text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                    {cell.label}
                  </p>
                  <p className="text-lg font-semibold tabular-nums text-neutral-900 dark:text-neutral-100">
                    {formatNumber(cell.value)}
                  </p>
                </div>
              ))}
            </div>

            {items.length !== total && (
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Считано по {items.length} из {total} — с учётом поиска и фильтра.
              </p>
            )}
          </div>
        )}
      </header>

      {total === 0 ? (
        <EmptyState
          icon={module.icon}
          title="Пока нет записей"
          description="Добавьте первую запись — она появится здесь."
        >
          <Button
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
            className="bg-[#f97316] text-white hover:bg-[#ea6a0b]"
          >
            <Plus className="mr-1 h-4 w-4" />
            Добавить запись
          </Button>
        </EmptyState>
      ) : items.length === 0 ? (
        <EmptyState
          title="Ничего не найдено"
          description="Попробуйте изменить запрос или сбросить фильтры."
        >
          <Button variant="outline" onClick={resetFilters}>
            Сбросить фильтры
          </Button>
        </EmptyState>
      ) : groups ? (
        <div className="space-y-8">
          {groups.map((group) => {
            const groupSummary = summaryField
              ? summarizeNumeric(group.items, summaryField.id)
              : null;

            return (
              <section key={group.value} className="space-y-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-neutral-200 pb-2 dark:border-neutral-800">
                  <h2 className="font-semibold text-neutral-900 dark:text-neutral-100">
                    {group.value}
                    <span className="ml-2 text-xs font-normal text-neutral-500 dark:text-neutral-400">
                      {group.items.length}
                    </span>
                  </h2>
                  {groupSummary && (
                    <p className="text-sm tabular-nums text-neutral-500 dark:text-neutral-400">
                      {summaryField.label}: {formatNumber(groupSummary.sum)}
                    </p>
                  )}
                </div>

                {view === "cards" ? (
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {group.items.map(renderRecord)}
                  </div>
                ) : (
                  <RecordTable
                    fields={fields}
                    items={group.items}
                    onEdit={setEditing}
                    onDelete={(record) => {
                      setDeleteError(null);
                      setPendingDelete(record);
                    }}
                  />
                )}
              </section>
            );
          })}
        </div>
      ) : view === "cards" ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map(renderRecord)}
        </div>
      ) : (
        <RecordTable
          fields={fields}
          items={items}
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
            <DialogTitle>{editing ? "Изменить запись" : "Новая запись"}</DialogTitle>
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
              editing
                ? (withData([editing])[0]?.data ?? {})
                : undefined
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
  onEdit: (record: RecordRow) => void;
  onDelete: (record: RecordRow) => void;
};

function RecordTable({ fields, items, onEdit, onDelete }: RecordTableProps) {
  return (
    <div className="overflow-x-auto rounded-xl border border-neutral-200 dark:border-neutral-800">
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
                const isImage =
                  field.type === "image" &&
                  typeof value === "string" &&
                  value.startsWith("http");

                return (
                  <td
                    key={field.id}
                    className="px-3 py-2 text-neutral-800 dark:text-neutral-200"
                  >
                    {isImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={value as string}
                        alt={field.label}
                        className="h-10 w-10 rounded object-cover"
                      />
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
                  className="rounded-md p-1.5 text-neutral-500 opacity-0 transition hover:bg-red-50 dark:text-neutral-400 hover:text-red-600 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f97316] group-hover:opacity-100 dark:hover:bg-red-950/40 dark:hover:text-red-400 dark:text-neutral-500"
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
