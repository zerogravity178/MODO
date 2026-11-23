"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { FieldList } from "@/components/constructor/FieldList";
import { FormPreview } from "@/components/constructor/FormPreview";
import { IconPicker } from "@/components/constructor/icon-picker";
import { PreviewToggle } from "@/components/constructor/preview-toggle";
import { getModuleIcon } from "@/components/module/module-icons";
import { deleteModuleWithImages } from "@/app/(app)/image-actions";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, FieldInput } from "@/components/ui/field";
import { IconBadge } from "@/components/ui/icon-badge";
import { Notice } from "@/components/ui/notice";
import { Surface } from "@/components/ui/surface";
import {
  describeIssue,
  makeEmptyField,
  toDraft,
  toFieldDefs,
  validateDrafts,
  type DraftField,
} from "@/lib/fields";
import { buildModuleExport, downloadFile, safeFileName, toCsv } from "@/lib/export";
import { createClient } from "@/lib/supabase/client";
import { plural } from "@/lib/records";
import { parseFields, type ModuleRow, type RecordRow } from "@/lib/types";

type ModuleSettingsProps = {
  module: ModuleRow;
  records: RecordRow[];
  imageCount: number;
};

export function ModuleSettings({
  module,
  records,
  imageCount,
}: ModuleSettingsProps) {
  const router = useRouter();
  const Icon = getModuleIcon(module.icon);

  const initialFields = useMemo(() => parseFields(module.fields), [module.fields]);

  const [name, setName] = useState(module.name);
  const [icon, setIcon] = useState(module.icon ?? "box");
  const [drafts, setDrafts] = useState<DraftField[]>(() =>
    toDraft(initialFields)
  );
  // Ключи строк должны быть уникальны: берём заведомо больший, чем любой стартовый.
  const [nextKey, setNextKey] = useState(() =>
    initialFields.length + 1
  );
  const [showPreview, setShowPreview] = useState(false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  function patchField(key: number, patch: Partial<DraftField>) {
    const next = drafts.map((field) =>
      field.key === key ? { ...field, ...patch } : field
    );

    setDrafts(next);
    setSaved(false);

    if (patch.type) {
      warnAboutTypeChange(next, key);
    }
  }

  function addField() {
    setDrafts((current) => [...current, makeEmptyField(nextKey)]);
    setNextKey((current) => current + 1);
    setSaved(false);
  }

  function removeField(key: number) {
    setDrafts((current) => current.filter((field) => field.key !== key));
    setSaved(false);
  }

  /**
   * Смена типа у существующего поля. Данные не переписываем — значения
   * просто могут перестать отображаться в новом виде, об этом предупреждаем.
   */
  function warnAboutTypeChange(next: DraftField[], key: number) {
    const draft = next.find((field) => field.key === key);
    if (!draft?.id) return;

    const before = initialFields.find((field) => field.id === draft.id);
    if (!before || before.type === draft.type) return;
    if (records.length === 0) return;

    setError(
      `Тип поля «${draft.label || "без названия"}» изменён. Уже сохранённые значения могут отображаться иначе.`
    );
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

    const issue = validateDrafts(drafts);
    if (issue) {
      setError(describeIssue(issue));
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

    const result = await deleteModuleWithImages(module.id);

    if (result.error) {
      setDeleteError(result.error);
      setDeleting(false);
      return;
    }

    setDeleting(false);
    setConfirmOpen(false);
    router.push("/");
    router.refresh();
  }

  function exportJson() {
    const payload = buildModuleExport(module, records);
    downloadFile(
      JSON.stringify(payload, null, 2),
      safeFileName(module.name, "json"),
      "application/json"
    );
  }

  function exportCsv() {
    const payload = buildModuleExport(module, records);
    downloadFile(
      toCsv(payload.fields, payload.records),
      safeFileName(module.name, "csv"),
      "text/csv"
    );
  }

  return (
    <div className="space-y-10">
      <header className="space-y-5">
        <Link
          href={`/m/${module.id}`}
          className="inline-flex min-h-9 items-center gap-1 text-sm text-muted-foreground transition hover:text-primary"
        >
          ← Назад к модулю
        </Link>

        <div className="flex min-w-0 items-center gap-3">
          <IconBadge icon={Icon} size="md" />
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-semibold text-foreground">
              Настройки
            </h1>
            <p className="truncate text-sm text-muted-foreground">
              {module.name}
            </p>
          </div>
        </div>
      </header>

      <form onSubmit={handleSave} className="space-y-8">
        <section className="space-y-3">
          <Field id="module-name" label="Название модуля">
            <FieldInput
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                setSaved(false);
              }}
            />
          </Field>

          <div className="space-y-2">
            <span className="text-sm font-medium leading-none text-foreground">
              Иконка
            </span>
            <IconPicker
              value={icon}
              onChange={(key) => {
                setIcon(key);
                setSaved(false);
              }}
            />
          </div>
        </section>

        <FieldList
          fields={drafts}
          onChange={patchField}
          onAdd={addField}
          onRemove={removeField}
          onReorder={(next) => {
            setDrafts(next);
            setSaved(false);
          }}
        />

        <div className="space-y-3">
          <PreviewToggle
            open={showPreview}
            onToggle={() => setShowPreview((current) => !current)}
          />

          {showPreview && <FormPreview fields={drafts} />}
        </div>

        {initialFields.length > 0 && (
          <p className="rounded-lg bg-surface px-3 py-2 text-xs text-muted-foreground">
            Удаление поля не стирает уже сохранённые значения — они просто
            перестают показываться.
          </p>
        )}

        {error && <Notice>{error}</Notice>}

        {saved && <Notice kind="success">Сохранено</Notice>}

        <Button type="submit" disabled={saving}>
          {saving ? "Сохраняем…" : "Сохранить"}
        </Button>
      </form>

      <Surface padding="md" className="space-y-3">
        <div className="space-y-1">
          <h2 className="font-semibold text-foreground">Экспорт</h2>
          <p className="text-sm text-muted-foreground">
            {records.length === 0
              ? "В модуле пока нет записей."
              : `Выгрузит ${records.length} ${plural(
                  records.length,
                  "запись",
                  "записи",
                  "записей"
                )} вместе с описанием полей.`}
            {imageCount > 0 &&
              " Ссылки на загруженные картинки в файл не попадают — файлы лежат в приватном хранилище."}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={exportJson}
            disabled={records.length === 0}
          >
            Скачать JSON
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={exportCsv}
            disabled={records.length === 0}
          >
            Скачать CSV
          </Button>
        </div>
      </Surface>

      <Surface variant="danger" padding="md" className="space-y-3">
        <div className="space-y-1">
          <h2 className="font-semibold text-foreground">Удаление модуля</h2>
          <p className="text-sm text-muted-foreground">
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
          className="border-danger/40 text-danger hover:bg-danger/15 hover:text-danger"
        >
          Удалить модуль
        </Button>
      </Surface>

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

      {records.length === 0 && (
        <EmptyState
          icon={module.icon}
          title="Записей пока нет"
          description="Экспорт появится, как только вы добавите первую запись."
        />
      )}
    </div>
  );
}

export default ModuleSettings;
