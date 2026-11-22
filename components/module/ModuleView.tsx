"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Settings, Trash2 } from "lucide-react";

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
import { createClient } from "@/lib/supabase/client";
import {
  formatFieldValue,
  parseRecordData,
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
  const [view, setView] = useState<ViewMode>(
    module.default_view === "table" ? "table" : "cards"
  );
  const [formOpen, setFormOpen] = useState(false);

  const [pendingRecord, setPendingRecord] = useState<RecordRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const Icon = getModuleIcon(module.icon);
  const rows = records.map((record) => ({
    record,
    data: parseRecordData(record.data),
  }));

  function handleSaved() {
    setFormOpen(false);
    router.refresh();
  }

  function askDeleteRecord(record: RecordRow) {
    setDeleteError(null);
    setPendingRecord(record);
  }

  async function confirmDeleteRecord() {
    if (!pendingRecord) return;

    setDeleting(true);
    setDeleteError(null);

    const supabase = createClient();
    const { error } = await supabase
      .from("records")
      .delete()
      .eq("id", pendingRecord.id);

    if (error) {
      setDeleteError(error.message);
      setDeleting(false);
      return;
    }

    setDeleting(false);
    setPendingRecord(null);
    router.refresh();
  }

  return (
    <div className="space-y-8">
      <header className="space-y-5">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-neutral-500 transition hover:text-[#f97316]"
        >
          ← Назад
        </Link>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#f97316]/10 text-[#f97316]">
              <Icon className="h-5 w-5" />
            </span>
            <h1 className="truncate text-2xl font-semibold text-neutral-900">
              {module.name}
            </h1>
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
              onClick={() => setFormOpen(true)}
              className="bg-[#f97316] text-white hover:bg-[#ea6a0b]"
            >
              <Plus className="mr-1 h-4 w-4" />
              Добавить
            </Button>
          </div>
        </div>

        <div className="flex gap-1 rounded-lg border border-neutral-200 p-1">
          {(
            [
              { id: "cards", label: "Карточки" },
              { id: "table", label: "Таблица" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setView(tab.id)}
              className={cn(
                "flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition",
                view === tab.id
                  ? "bg-[#f97316] text-white"
                  : "text-neutral-600 hover:bg-neutral-100"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      {rows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-neutral-200 p-6 text-center text-sm text-neutral-500">
          Пока нет записей. Нажмите «Добавить», чтобы создать первую.
        </p>
      ) : view === "cards" ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map(({ record, data }) => (
            <RecordCard
              key={record.id}
              fields={fields}
              data={data}
              onDelete={() => askDeleteRecord(record)}
            />
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-neutral-200">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-neutral-50 text-left text-xs uppercase tracking-wide text-neutral-500">
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
              {rows.map(({ record, data }) => (
                <tr
                  key={record.id}
                  className="group border-t border-neutral-100 align-middle"
                >
                  {fields.map((field) => {
                    const value = data[field.id];
                    const isImage =
                      field.type === "image" &&
                      typeof value === "string" &&
                      value.startsWith("http");

                    return (
                      <td key={field.id} className="px-3 py-2 text-neutral-800">
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
                  <td className="whitespace-nowrap px-3 py-2 text-xs text-neutral-400">
                    {record.created_at
                      ? new Date(record.created_at).toLocaleDateString("ru-RU")
                      : "—"}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => askDeleteRecord(record)}
                      aria-label="Удалить запись"
                      title="Удалить запись"
                      className="rounded-md p-1.5 text-neutral-400 opacity-0 transition hover:bg-red-50 hover:text-red-600 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f97316] group-hover:opacity-100"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Новая запись</DialogTitle>
            <DialogDescription>
              {module.name} · заполните поля и сохраните.
            </DialogDescription>
          </DialogHeader>
          <RecordForm
            moduleId={module.id}
            fields={fields}
            onSaved={handleSaved}
            onCancel={() => setFormOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={pendingRecord !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPendingRecord(null);
            setDeleteError(null);
          }
        }}
        title="Удалить запись?"
        description="Запись будет удалена безвозвратно."
        pending={deleting}
        error={deleteError}
        onConfirm={() => {
          void confirmDeleteRecord();
        }}
      />
    </div>
  );
}

export default ModuleView;
