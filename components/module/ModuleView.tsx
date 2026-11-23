"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";

import { ModuleHeader, type ViewMode } from "@/components/module/module-header";
import { RecordCard } from "@/components/module/RecordCard";
import { RecordTable } from "@/components/module/record-table";
import { RecordToolbar } from "@/components/module/record-toolbar";
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
import { deleteRecordWithImages } from "@/app/(app)/image-actions";
import { createClient } from "@/lib/supabase/client";
import {
  matchesFilters,
  matchesQuery,
  sortItems,
  withData,
  type SortDirection,
  type SortKey,
} from "@/lib/records";
import type { FieldDef, ModuleRow, RecordRow } from "@/lib/types";

type ModuleViewProps = {
  module: ModuleRow;
  fields: FieldDef[];
  records: RecordRow[];
  /** recordId → fieldId → подписанная ссылка на картинку из Storage. */
  imageUrls?: Record<string, Record<string, string>>;
};

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
  const filterable = useMemo(() => filterableFields(fields), [fields]);

  const activeFilters = Object.values(filters).filter(Boolean).length;

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

    // Картинки записи убирает серверная часть: клиент не должен получать
    // список чужих путей, а Storage всё равно проверит владельца.
    const result = await deleteRecordWithImages(pendingDelete.id);

    if (result.error) {
      setDeleteError(result.error);
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

  function askDelete(record: RecordRow) {
    setDeleteError(null);
    setPendingDelete(record);
  }

  return (
    <div className="space-y-6">
      <ModuleHeader
        module={module}
        total={total}
        view={view}
        onChangeView={changeView}
        onCreate={openCreate}
      />

      {total > 0 && (
        <RecordToolbar
          query={query}
          onQueryChange={setQuery}
          panelOpen={panelOpen}
          onTogglePanel={() => setPanelOpen((open) => !open)}
          activeFilters={activeFilters}
          found={visible.length}
          total={total}
          sortKey={sortKey}
          onSortKeyChange={setSortKey}
          sortDirection={sortDirection}
          onToggleDirection={() =>
            setSortDirection((current) => (current === "asc" ? "desc" : "asc"))
          }
          filters={filters}
          onFilterChange={(fieldId, value) =>
            setFilters((current) => ({ ...current, [fieldId]: value }))
          }
          items={items}
          fields={fields}
          filterable={filterable}
          onReset={resetAll}
        />
      )}

      {total === 0 ? (
        <EmptyState
          icon={module.icon}
          title="Пока нет записей"
          description="Добавьте первую запись — она появится здесь."
        >
          <Button
            onClick={openCreate}
            className="bg-primary text-primary-foreground hover:bg-primary-hover"
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
              createdAt={item.record.created_at ?? undefined}
              onEdit={() => setEditing(item.record)}
              onDelete={() => askDelete(item.record)}
            />
          ))}
        </div>
      ) : (
        <RecordTable
          fields={fields}
          items={visible}
          imageUrls={imageUrls}
          onEdit={setEditing}
          onDelete={askDelete}
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
            initialImageUrls={editing ? imageUrls?.[editing.id] : undefined}
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

export default ModuleView;
