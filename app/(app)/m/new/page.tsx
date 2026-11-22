"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { FieldList } from "@/components/constructor/FieldList";
import type { DraftField } from "@/components/constructor/FieldRow";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import type { FieldDef, FieldType } from "@/lib/types";
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

function makeEmptyField(key: number): DraftField {
  return { key, label: "", type: "text", optionsText: "" };
}

/** «Еда, Транспорт,  Жильё» → ["Еда","Транспорт","Жильё"] */
function splitOptions(value: string): string[] {
  return value
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

export default function NewModulePage() {
  const router = useRouter();

  const nextKey = useRef(1);
  const [name, setName] = useState("");
  const [icon, setIcon] = useState(ICON_CHOICES[0].icon);
  const [fields, setFields] = useState<DraftField[]>(() => [
    makeEmptyField(0),
  ]);
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

    const withoutLabel = fields.findIndex(
      (field) => field.label.trim() === ""
    );

    if (withoutLabel !== -1) {
      setError(`У поля ${withoutLabel + 1} нет названия`);
      return;
    }

    const emptySelect = fields.findIndex(
      (field) =>
        field.type === "select" && splitOptions(field.optionsText).length === 0
    );

    if (emptySelect !== -1) {
      setError(`У поля ${emptySelect + 1} не заполнены варианты`);
      return;
    }

    // id поля попадает в records.data как ключ — держим его коротким.
    const payloadFields: FieldDef[] = fields.map((field, index) => {
      const base: FieldDef = {
        id: `f${index + 1}`,
        label: field.label.trim(),
        type: field.type as FieldType,
      };

      if (field.type === "select") {
        base.options = splitOptions(field.optionsText);
      }

      return base;
    });

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
          className="inline-flex items-center gap-1 text-sm text-neutral-500 transition hover:text-[#f97316] dark:text-neutral-400"
        >
          ← Назад
        </Link>

        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
            Новый модуль
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Задайте название, иконку и поля — записи добавите позже.
          </p>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="space-y-8">
        <section className="space-y-2">
          <Label htmlFor="module-name">Название модуля</Label>
          <Input
            id="module-name"
            value={name}
            autoFocus
            placeholder="Например, Расходы"
            onChange={(event) => setName(event.target.value)}
            className="focus-visible:ring-[#f97316]"
          />
        </section>

        <section className="space-y-2">
          <Label>Иконка</Label>
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
                    "flex h-12 w-12 items-center justify-center rounded-xl border text-2xl transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f97316] focus-visible:ring-offset-2",
                    selected
                      ? "border-[#f97316] bg-[#f97316]/10 ring-2 ring-[#f97316]/30"
                      : "border-neutral-200 bg-white hover:border-neutral-300 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-700"
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
        />

        {error && (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        )}

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            type="submit"
            disabled={saving}
            className="bg-[#f97316] text-white hover:bg-[#ea6a0b]"
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
