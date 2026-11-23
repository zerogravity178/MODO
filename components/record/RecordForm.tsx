"use client";

import { useEffect, useRef, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Field,
  FieldCheck,
  FieldInput,
  FieldSelect,
  FieldTextarea,
} from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import {
  IMAGE_BUCKET,
  SIGNED_URL_TTL_SECONDS,
  isOwnStoragePath,
  isStoragePath,
  removeOwnImages,
} from "@/lib/images";
import { createClient } from "@/lib/supabase/client";
import type { FieldDef } from "@/lib/types";

type RecordFormProps = {
  moduleId: string;
  fields: FieldDef[];
  /** Передано — форма правит существующую запись вместо создания новой. */
  recordId?: string;
  initialValues?: Record<string, unknown>;
  /** Поле картинки → уже подписанная ссылка (для записей из Storage). */
  initialImageUrls?: Record<string, string>;
  onSaved?: () => void;
  onCancel?: () => void;
};

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/** Приводит значение из jsonb к строке для контролируемого input. */
function toInputString(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  return "";
}

export function RecordForm({
  moduleId,
  fields,
  recordId,
  initialValues,
  initialImageUrls,
  onSaved,
  onCancel,
}: RecordFormProps) {
  const isEdit = Boolean(recordId);

  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      fields.map((field) => [field.id, toInputString(initialValues?.[field.id])])
    )
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  /** id поля → идёт загрузка файла. */
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  /** id поля → подписанная ссылка на только что загруженный файл. */
  const [uploadedUrls, setUploadedUrls] = useState<Record<string, string>>({});
  /**
   * Пути файлов, которые пользователь убрал или заменил. Удаляем их только
   * после успешного сохранения — иначе «убрать» и «Отмена» стёрли бы
   * картинку у существующей записи.
   */
  const [pendingRemoval, setPendingRemoval] = useState<string[]>([]);
  /** Файлы, загруженные в этой сессии формы. При отмене их надо убрать. */
  const [sessionUploads, setSessionUploads] = useState<string[]>([]);
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({});
  /** Чтобы уборка при размонтировании видела актуальный список. */
  const sessionUploadsRef = useRef<string[]>([]);
  const savedRef = useRef(false);
  const userIdRef = useRef<string>("");

  useEffect(() => {
    sessionUploadsRef.current = sessionUploads;
  }, [sessionUploads]);

  /**
   * Уборка мусора, если форму закрыли крестиком или кликом по фону:
   * загруженные файлы остались, но запись их уже не получит.
   */
  useEffect(() => {
    return () => {
      const leftovers = sessionUploadsRef.current;
      if (savedRef.current || leftovers.length === 0) return;
      if (!userIdRef.current) return;
      void removeOwnImages(
        createClient(),
        leftovers,
        userIdRef.current
      );
    };
  }, []);

  function setValue(fieldId: string, value: string) {
    setValues((current) => ({ ...current, [fieldId]: value }));
  }

  function markForRemoval(path: string) {
    setPendingRemoval((current) =>
      current.includes(path) ? current : [...current, path]
    );
  }

  async function handleFile(field: FieldDef, file: File) {
    setError(null);

    if (!file.type.startsWith("image/")) {
      setError("Можно загрузить только изображение");
      return;
    }

    if (file.size > MAX_IMAGE_BYTES) {
      setError("Файл больше 5 МБ");
      return;
    }

    setUploading((current) => ({ ...current, [field.id]: true }));

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("Сессия истекла — войдите заново");
      setUploading((current) => ({ ...current, [field.id]: false }));
      return;
    }

    userIdRef.current = user.id;

    // Расширение из имени файла подчищаем: только буквы и цифры.
    const rawExt = file.name.split(".").pop() ?? "jpg";
    const ext = rawExt.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
    const path = `${user.id}/${moduleId}/${field.id}-${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from(IMAGE_BUCKET)
      .upload(path, file, { cacheControl: "3600", upsert: false });

    if (uploadError) {
      setError(`Не удалось загрузить картинку: ${uploadError.message}`);
      setUploading((current) => ({ ...current, [field.id]: false }));
      return;
    }

    // Заменили существующую картинку — старую уберём после сохранения,
    // иначе в хранилище останется файл-сирота.
    const previous = values[field.id];
    if (isOwnStoragePath(previous, user.id) && previous !== path) {
      markForRemoval(previous);
    }

    // Сразу показываем картинку: bucket приватный, публичной ссылки нет.
    const { data: signedUrl } = await supabase.storage
      .from(IMAGE_BUCKET)
      .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);

    if (signedUrl?.signedUrl) {
      setUploadedUrls((current) => ({
        ...current,
        [field.id]: signedUrl.signedUrl,
      }));
    }

    setValue(field.id, path);
    setSessionUploads((current) => [...current, path]);
    setUploading((current) => ({ ...current, [field.id]: false }));
  }

  /** Отмена: сохранения не будет, поэтому загруженные файлы — мусор. */
  function handleCancel() {
    savedRef.current = true;
    if (sessionUploads.length > 0 && userIdRef.current) {
      void removeOwnImages(
        createClient(),
        sessionUploads,
        userIdRef.current
      );
    }
    onCancel?.();
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const missing = fields.find(
      (field) => field.required && !values[field.id]?.trim()
    );

    if (missing) {
      setError(`Заполните поле «${missing.label}»`);
      return;
    }

    const data: Record<string, unknown> = {};

    for (const field of fields) {
      const raw = values[field.id]?.trim() ?? "";
      if (raw === "") continue;

      if (field.type === "number") {
        const parsed = Number(raw.replace(",", "."));
        if (Number.isNaN(parsed)) {
          setError(`Поле «${field.label}» должно быть числом`);
          return;
        }
        data[field.id] = parsed;
      } else if (field.type === "boolean") {
        data[field.id] = raw === "true";
      } else {
        data[field.id] = raw;
      }
    }

    setSaving(true);

    const supabase = createClient();

    if (isEdit) {
      const { error: updateError } = await supabase
        .from("records")
        .update({ data })
        .eq("id", recordId);

      if (updateError) {
        setError(updateError.message);
        setSaving(false);
        return;
      }

      // Запись сохранена — теперь можно убрать снятые и заменённые файлы.
      savedRef.current = true;
      if (pendingRemoval.length > 0 && userIdRef.current) {
        void removeOwnImages(supabase, pendingRemoval, userIdRef.current);
      }
      setPendingRemoval([]);
      setSessionUploads([]);
      setSaving(false);
      onSaved?.();
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("Сессия истекла — войдите заново");
      setSaving(false);
      return;
    }

    userIdRef.current = user.id;

    const { error: insertError } = await supabase.from("records").insert({
      module_id: moduleId,
      user_id: user.id,
      data,
    });

    if (insertError) {
      setError(insertError.message);
      setSaving(false);
      return;
    }

    savedRef.current = true;
    if (pendingRemoval.length > 0) {
      void removeOwnImages(supabase, pendingRemoval, user.id);
    }
    setPendingRemoval([]);
    setSessionUploads([]);
    setValues(Object.fromEntries(fields.map((field) => [field.id, ""])));
    setUploadedUrls({});
    setSaving(false);
    onSaved?.();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {fields.map((field) => {
        const value = values[field.id] ?? "";
        const inputId = `field-${field.id}`;
        const busy = uploading[field.id] === true;
        // Для загруженного файла показываем подписанную ссылку, а не путь.
        const uploadedPath = isStoragePath(value) ? value : "";
        const previewUrl = uploadedPath
          ? (uploadedUrls[field.id] ?? initialImageUrls?.[field.id] ?? "")
          : value.startsWith("http")
            ? value
            : "";

        return (
          <Field
            key={field.id}
            id={inputId}
            label={field.label}
            required={field.required}
          >
            {field.type === "select" ? (
              <FieldSelect
                id={inputId}
                name={field.id}
                value={value}
                onChange={(event) => setValue(field.id, event.target.value)}
              >
                <option value="">— не выбрано —</option>
                {(field.options ?? []).map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </FieldSelect>
            ) : field.type === "boolean" ? (
              <FieldCheck
                id={inputId}
                name={field.id}
                checked={value === "true"}
                onChange={(event) =>
                  setValue(field.id, event.target.checked ? "true" : "")
                }
                text={value === "true" ? "Да" : "Отметить, если да"}
              />
            ) : field.type === "textarea" ? (
              <FieldTextarea
                id={inputId}
                name={field.id}
                value={value}
                rows={4}
                onChange={(event) => setValue(field.id, event.target.value)}
              />
            ) : field.type === "image" ? (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <FieldInput
                    id={inputId}
                    name={field.id}
                    type="url"
                    inputMode="url"
                    placeholder="https://... или загрузите файл"
                    value={isStoragePath(value) ? "" : value}
                    onChange={(event) => setValue(field.id, event.target.value)}
                  />
                  <input
                    ref={(element) => {
                      fileInputs.current[field.id] = element;
                    }}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      event.target.value = "";
                      if (file) void handleFile(field, file);
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    disabled={busy}
                    onClick={() => fileInputs.current[field.id]?.click()}
                    className="shrink-0"
                  >
                    {busy ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ImagePlus className="h-4 w-4" />
                    )}
                    <span className="ml-1 hidden sm:inline">Файл</span>
                  </Button>
                </div>

                {isStoragePath(value) && (
                  <div className="flex items-center justify-between gap-2 rounded-md border border-border px-2 py-1.5 text-xs text-muted-foreground">
                    <span className="truncate">Загруженный файл</span>
                    <button
                      type="button"
                      onClick={() => {
                        // Файл трогаем только после успешного сохранения:
                        // иначе «убрать» + «Отмена» удалило бы картинку
                        // у записи, которая никуда не делась.
                        if (isStoragePath(value)) {
                          markForRemoval(value);
                        }
                        setValue(field.id, "");
                        setUploadedUrls((current) => {
                          const next = { ...current };
                          delete next[field.id];
                          return next;
                        });
                      }}
                      aria-label="Убрать файл"
                      className="rounded-md p-2 text-muted-foreground transition hover:text-danger [@media(hover:none)]:p-2.5"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}

                {previewUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={previewUrl}
                    alt="Превью"
                    className="h-32 w-full rounded-md border border-border object-cover"
                  />
                )}
              </div>
            ) : (
              <FieldInput
                id={inputId}
                name={field.id}
                // Число — обычный текст с цифровой клавиатурой: браузерный
                // type="number" не принимает запятую, а в русской раскладке
                // её набирают чаще точки.
                type={field.type === "date" ? "date" : "text"}
                inputMode={field.type === "number" ? "decimal" : undefined}
                value={value}
                onChange={(event) => setValue(field.id, event.target.value)}
              />
            )}
          </Field>
        );
      })}

      {error && <Notice>{error}</Notice>}

      <div className="flex gap-2 pt-2">
        <Button type="submit" disabled={saving}>
          {saving ? "Сохраняем…" : isEdit ? "Сохранить" : "Добавить"}
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" onClick={handleCancel}>
            Отмена
          </Button>
        )}
      </div>
    </form>
  );
}

export default RecordForm;
