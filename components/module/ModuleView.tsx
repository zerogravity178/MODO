"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LayoutGrid, List, Plus, Settings, Trash2 } from "lucide-react";

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
import { withData } from "@/lib/records";
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

  const items = withData(records);
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

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
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
                  : `${total} ${total === 1 ? "запись" : total < 5 ? "записи" : "записей"}`}
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
          <div className="flex gap-1 rounded-lg border border-neutral-200 p-1 dark:border-neutral-800 sm:w-auto">
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
      ) : view === "cards" ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
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
          ))}
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
              editing ? (withData([editing])[0]?.data ?? {}) : undefined
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
                  className="rounded-md p-2 text-neutral-500 [@media(hover:none)]:p-2.5 opacity-0 transition hover:bg-red-50 group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f97316] hover:text-red-600 dark:text-neutral-400 dark:hover:bg-red-950/40 dark:hover:text-red-400 [@media(hover:none)]:opacity-100"
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
