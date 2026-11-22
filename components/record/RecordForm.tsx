"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import type { FieldDef } from "@/lib/types";

type RecordFormProps = {
  moduleId: string;
  fields: FieldDef[];
  /** Передано — форма правит существующую запись вместо создания новой. */
  recordId?: string;
  initialValues?: Record<string, unknown>;
  onSaved?: () => void;
  onCancel?: () => void;
};

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

  function setValue(fieldId: string, value: string) {
    setValues((current) => ({ ...current, [fieldId]: value }));
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

    setValues(Object.fromEntries(fields.map((field) => [field.id, ""])));
    setSaving(false);
    onSaved?.();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {fields.map((field) => {
        const value = values[field.id] ?? "";
        const inputId = `field-${field.id}`;

        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={inputId}>
              {field.label}
              {field.required && <span className="ml-0.5 text-[#f97316]">*</span>}
            </Label>

            {field.type === "select" ? (
              <select
                id={inputId}
                name={field.id}
                value={value}
                onChange={(event) => setValue(field.id, event.target.value)}
                className="flex h-10 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f97316] focus-visible:ring-offset-2 dark:border-neutral-700 dark:bg-neutral-900"
              >
                <option value="">— не выбрано —</option>
                {(field.options ?? []).map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            ) : field.type === "image" ? (
              <>
                <Input
                  id={inputId}
                  name={field.id}
                  type="url"
                  inputMode="url"
                  placeholder="https://..."
                  value={value}
                  onChange={(event) => setValue(field.id, event.target.value)}
                  className="focus-visible:ring-[#f97316]"
                />
                {value.startsWith("http") && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={value}
                    alt="Превью"
                    className="h-32 w-full rounded-md border border-neutral-200 object-cover dark:border-neutral-800"
                  />
                )}
              </>
            ) : (
              <Input
                id={inputId}
                name={field.id}
                type={
                  field.type === "number"
                    ? "number"
                    : field.type === "date"
                      ? "date"
                      : "text"
                }
                step={field.type === "number" ? "any" : undefined}
                value={value}
                onChange={(event) => setValue(field.id, event.target.value)}
                className="focus-visible:ring-[#f97316]"
              />
            )}
          </div>
        );
      })}

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}

      <div className="flex gap-2 pt-2">
        <Button
          type="submit"
          disabled={saving}
          className="bg-[#f97316] text-white hover:bg-[#ea6a0b]"
        >
          {saving
            ? "Сохраняем…"
            : isEdit
              ? "Сохранить"
              : "Добавить"}
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Отмена
          </Button>
        )}
      </div>
    </form>
  );
}

export default RecordForm;
