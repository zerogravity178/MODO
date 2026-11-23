"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { FieldList } from "@/components/constructor/FieldList";
import { FormPreview } from "@/components/constructor/FormPreview";
import { ICON_CHOICES, IconPicker } from "@/components/constructor/icon-picker";
import { PreviewToggle } from "@/components/constructor/preview-toggle";
import { Button } from "@/components/ui/button";
import { Field, FieldInput } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import {
  describeIssue,
  makeEmptyField,
  toFieldDefs,
  validateDrafts,
  type DraftField,
} from "@/lib/fields";
import { createClient } from "@/lib/supabase/client";

export default function NewModulePage() {
  const router = useRouter();

  const nextKey = useRef(1);
  const [name, setName] = useState("");
  const [icon, setIcon] = useState(ICON_CHOICES[0].key);
  const [fields, setFields] = useState<DraftField[]>(() => [
    makeEmptyField(0),
  ]);
  const [showPreview, setShowPreview] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function addField() {
    const key = nextKey.current++;
    setFields((current) => [...current, makeEmptyField(key)]);
  }

  function updateField(key: number, patch: Partial<DraftField>) {
    setFields((current) =>
      current.map((field) =>
        field.key === key ? { ...field, ...patch } : field
      )
    );
  }

  function removeField(key: number) {
    setFields((current) => current.filter((field) => field.key !== key));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const trimmedName = name.trim();

    if (!trimmedName) {
      setError("Введите название модуля");
      return;
    }

    if (fields.length === 0) {
      setError("Добавьте хотя бы одно поле");
      return;
    }

    const issue = validateDrafts(fields);
    if (issue) {
      setError(describeIssue(issue));
      return;
    }

    // id поля попадает в records.data как ключ — держим его коротким.
    const payloadFields = toFieldDefs(fields, []);

    setSaving(true);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("Сессия истекла — войдите заново");
      setSaving(false);
      return;
    }

    const { data: created, error: insertError } = await supabase
      .from("modules")
      .insert({
        name: trimmedName,
        icon,
        fields: payloadFields,
        default_view: "cards",
        user_id: user.id,
      })
      .select("id")
      .single();

    if (insertError || !created) {
      setError(insertError?.message ?? "Не удалось создать модуль");
      setSaving(false);
      return;
    }

    router.push(`/m/${created.id}`);
    router.refresh();
  }

  return (
    <main className="space-y-8">
      <header className="space-y-5">
        <Link
          href="/"
          className="inline-flex min-h-9 items-center gap-1 text-sm text-muted-foreground transition hover:text-primary"
        >
          ← Назад
        </Link>

        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-foreground">
            Новый модуль
          </h1>
          <p className="text-sm text-muted-foreground">
            Задайте название, иконку и поля — записи добавите позже.
          </p>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="space-y-8">
        <Field id="module-name" label="Название модуля">
          <FieldInput
            id="module-name"
            value={name}
            autoFocus
            placeholder="Например, Расходы"
            onChange={(event) => setName(event.target.value)}
          />
        </Field>

        <section className="space-y-2">
          <span className="text-sm font-medium leading-none text-foreground">
            Иконка
          </span>
          <IconPicker value={icon} onChange={setIcon} size="md" />
        </section>

        <FieldList
          fields={fields}
          onChange={updateField}
          onAdd={addField}
          onRemove={removeField}
          onReorder={setFields}
        />

        <div className="space-y-3">
          <PreviewToggle
            open={showPreview}
            onToggle={() => setShowPreview((current) => !current)}
          />

          {showPreview && <FormPreview fields={fields} />}
        </div>

        {error && <Notice>{error}</Notice>}

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button type="submit" disabled={saving}>
            {saving ? "Создаём…" : "Создать модуль"}
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link href="/">Отмена</Link>
          </Button>
        </div>
      </form>
    </main>
  );
}
