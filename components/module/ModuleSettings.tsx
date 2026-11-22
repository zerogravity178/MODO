"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { FieldList } from "@/components/constructor/FieldList";
import type { DraftField } from "@/components/constructor/FieldRow";
import { getModuleIcon } from "@/components/module/module-icons";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { parseFields, type FieldDef, type ModuleRow } from "@/lib/types";

type ModuleSettingsProps = {
  module: ModuleRow;
};

const ICON_CHOICES: { key: string; emoji: string; label: string }[] = [
  { key: "box", emoji: "📦", label: "Коробка" },
  { key: "wallet", emoji: "💰", label: "Деньги" },
  { key: "watch", emoji: "⌚", label: "Часы" },
  { key: "check-square", emoji: "✅", label: "Задачи" },
  { key: "clipboard-list", emoji: "📋", label: "Список" },
];

/** FieldDef → DraftField: id сохраняем, чтобы правки не порвали записи. */
function toDraft(fields: FieldDef[]): DraftField[] {
  return fields.map((field, index) => ({
    key: index + 1,
    id: field.id,
    label: field.label,
    type: field.type,
    optionsText: (field.options ?? []).join(", "),
  }));
}

/**
 * DraftField → FieldDef. Прежние поля сохраняют свой id, новые получают
 * свободный `fN` — иначе удаление строки в середине сдвинуло бы значения
 * у всех последующих полей.
 */
function toFieldDefs(drafts: DraftField[], previous: FieldDef[]): FieldDef[] {
  const taken = new Set(drafts.map((draft) => draft.id).filter(Boolean));
  let counter = previous.length + 1;

  return drafts.map((draft) => {
    let id = draft.id;

    if (!id) {
      while (taken.has(`f${counter}`)) counter += 1;
      id = `f${counter}`;
      taken.add(id);
      counter += 1;
    }

    return {
      id,
      label: draft.label.trim(),
      type: draft.type,
      ...(draft.type === "select"
        ? {
            options: draft.optionsText
              .split(",")
              .map((option) => option.trim())
              .filter(Boolean),
          }
        : {}),
    };
  });
}

export function ModuleSettings({ module }: ModuleSettingsProps) {
  const router = useRouter();
  const Icon = getModuleIcon(module.icon);

  const initialFields = parseFields(module.fields);

  const [name, setName] = useState(module.name);
  const [icon, setIcon] = useState(module.icon ?? "box");
  const [drafts, setDrafts] = useState<DraftField[]>(() =>
    toDraft(initialFields)
  );
  const [nextKey, setNextKey] = useState(drafts.length + 1);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  function patchField(key: number, patch: Partial<DraftField>) {
    setDrafts((current) =>
      current.map((field) => (field.key === key ? { ...field, ...patch } : field))
    );
    setSaved(false);
  }

  function addField() {
    setDrafts((current) => [
      ...current,
      { key: nextKey, label: "", type: "text", optionsText: "" },
    ]);
    setNextKey((current) => current + 1);
    setSaved(false);
  }

  function removeField(key: number) {
    setDrafts((current) => current.filter((field) => field.key !== key));
    setSaved(false);
  }

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSaved(false);

    const trimmed = name.trim();

    if (!trimmed) {
      setError("Название не может быть пустым");
      return;
    }

    const incomplete = drafts.find((field) => !field.label.trim());

    if (incomplete) {
      setError("У каждого поля должно быть название");
      return;
    }

    const brokenSelect = drafts.find(
      (field) =>
        field.type === "select" &&
        field.optionsText
          .split(",")
          .map((option) => option.trim())
          .filter(Boolean).length === 0
    );

    if (brokenSelect) {
      setError(`У списка «${brokenSelect.label}» нет вариантов`);
      return;
    }

    setSaving(true);

    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("modules")
      .update({
        name: trimmed,
        icon,
        fields: toFieldDefs(drafts, initialFields),
      })
      .eq("id", module.id);

    setSaving(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setSaved(true);
    router.refresh();
  }

  async function handleDelete() {
    setDeleting(true);
    setDeleteError(null);

    const supabase = createClient();
    const { error: removeError } = await supabase
      .from("modules")
      .delete()
      .eq("id", module.id);

    if (removeError) {
      setDeleteError(removeError.message);
      setDeleting(false);
      return;
    }

    setDeleting(false);
    setConfirmOpen(false);
    router.push("/");
    router.refresh();
  }

  return (
    <div className="space-y-10">
      <header className="space-y-5">
        <Link
          href={`/m/${module.id}`}
          className="inline-flex min-h-9 items-center gap-1 text-sm text-neutral-500 transition hover:text-[#f97316] dark:text-neutral-400"
        >
          ← Назад к модулю
        </Link>

        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#f97316]/10 text-[#f97316]">
            <Icon className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
              Настройки
            </h1>
            <p className="truncate text-sm text-neutral-500 dark:text-neutral-400">
              {module.name}
            </p>
          </div>
        </div>
      </header>

      <form onSubmit={handleSave} className="space-y-8">
        <section className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="module-name">Название модуля</Label>
            <Input
              id="module-name"
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                setSaved(false);
              }}
              className="focus-visible:ring-[#f97316]"
            />
          </div>

          <div className="space-y-2">
            <Label>Иконка</Label>
            <div className="flex flex-wrap gap-2">
              {ICON_CHOICES.map((choice) => (
                <button
                  key={choice.key}
                  type="button"
                  onClick={() => {
                    setIcon(choice.key);
                    setSaved(false);
                  }}
                  aria-pressed={icon === choice.key}
                  title={choice.label}
                  className={
                    icon === choice.key
                      ? "h-10 w-10 rounded-lg border-2 border-[#f97316] bg-[#f97316]/10 text-lg"
                      : "h-10 w-10 rounded-lg border border-neutral-200 bg-white text-lg transition hover:border-[#f97316] dark:border-neutral-800 dark:bg-neutral-900"
                  }
                >
                  {choice.emoji}
                </button>
              ))}
            </div>
          </div>
        </section>

        <FieldList
          fields={drafts}
          onChange={patchField}
          onAdd={addField}
          onRemove={removeField}
        />

        {initialFields.length > 0 && (
          <p className="rounded-lg bg-neutral-50 px-3 py-2 text-xs text-neutral-500 dark:bg-neutral-900 dark:text-neutral-400">
            Удаление поля не стирает уже сохранённые значения — они просто
            перестают показываться.
          </p>
        )}

        {error && (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        )}

        {saved && (
          <p role="status" className="text-sm text-green-700 dark:text-green-500">
            Сохранено
          </p>
        )}

        <Button
          type="submit"
          disabled={saving}
          className="bg-[#f97316] text-white hover:bg-[#ea6a0b]"
        >
          {saving ? "Сохраняем…" : "Сохранить"}
        </Button>
      </form>

      <section className="space-y-3 rounded-xl border border-red-200 bg-red-50/50 p-4 dark:border-red-900/50 dark:bg-red-950/20">
        <div className="space-y-1">
          <h2 className="font-semibold text-neutral-900 dark:text-neutral-100">
            Удаление модуля
          </h2>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            Модуль и все записи внутри будут удалены безвозвратно.
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setDeleteError(null);
            setConfirmOpen(true);
          }}
          className="border-red-300 text-red-700 hover:bg-red-100 hover:text-red-800 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/40"
        >
          Удалить модуль
        </Button>
      </section>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={(open) => {
          if (!open) {
            setConfirmOpen(false);
            setDeleteError(null);
          }
        }}
        title="Удалить модуль?"
        description={`«${module.name}» и все записи внутри будут удалены безвозвратно.`}
        confirmLabel="Удалить модуль"
        pending={deleting}
        error={deleteError}
        onConfirm={() => {
          void handleDelete();
        }}
      />
    </div>
  );
}

export default ModuleSettings;
