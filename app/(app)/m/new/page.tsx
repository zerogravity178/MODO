"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";

import { FieldList } from "@/components/constructor/FieldList";
import { FormPreview } from "@/components/constructor/FormPreview";
import { Button } from "@/components/ui/button";
import { Field, FieldInput } from "@/components/ui/field";
import {
  describeIssue,
  makeEmptyField,
  toFieldDefs,
  validateDrafts,
  type DraftField,
} from "@/lib/fields";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

/**
 * Ключи иконок — те же, что понимает getModuleIcon() на карточке модуля.
 * Если сохранить эмодзи как есть, карточка покажет серую заглушку.
 */
const ICON_CHOICES: { emoji: string; icon: string; title: string }[] = [
  { emoji: "📦", icon: "box", title: "Коробка" },
  { emoji: "💰", icon: "wallet", title: "Деньги" },
  { emoji: "⌚", icon: "watch", title: "Часы" },
  { emoji: "✅", icon: "check-square", title: "Задачи" },
  { emoji: "📋", icon: "clipboard-list", title: "Список" },
];

export default function NewModulePage() {
  const router = useRouter();

  const nextKey = useRef(1);
  const [name, setName] = useState("");
  const [icon, setIcon] = useState(ICON_CHOICES[0].icon);
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
          <div className="flex flex-wrap gap-2">
            {ICON_CHOICES.map((choice) => {
              const selected = icon === choice.icon;

              return (
                <button
                  key={choice.icon}
                  type="button"
                  title={choice.title}
                  aria-label={choice.title}
                  aria-pressed={selected}
                  onClick={() => setIcon(choice.icon)}
                  className={cn(
                    "flex h-12 w-12 items-center justify-center rounded-xl border text-2xl transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                    selected
                      ? "border-primary bg-primary/10 ring-2 ring-primary/30"
                      : "border-border bg-card hover:border-primary"
                  )}
                >
                  <span aria-hidden>{choice.emoji}</span>
                </button>
              );
            })}
          </div>
        </section>

        <FieldList
          fields={fields}
          onChange={updateField}
          onAdd={addField}
          onRemove={removeField}
          onReorder={setFields}
        />

        <div className="space-y-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowPreview((current) => !current)}
            aria-expanded={showPreview}
            className="w-full sm:w-auto"
          >
            {showPreview ? (
              <EyeOff className="mr-1 h-4 w-4" />
            ) : (
              <Eye className="mr-1 h-4 w-4" />
            )}
            {showPreview ? "Скрыть предпросмотр" : "Предпросмотр формы"}
          </Button>

          {showPreview && <FormPreview fields={fields} />}
        </div>

        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            type="submit"
            disabled={saving}
            className="bg-primary text-primary-foreground hover:bg-primary-hover"
          >
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
