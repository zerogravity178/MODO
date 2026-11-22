import type { FieldDef, FieldType } from "@/lib/types";

/**
 * Черновик поля в конструкторе.
 * `id` есть только у полей, которые уже сохранены в модуле.
 */
export type DraftField = {
  /** Стабильный ключ строки в интерфейсе — в базу не попадает. */
  key: number;
  id?: string;
  label: string;
  type: FieldType;
  required: boolean;
  /** «Еда, Транспорт» — разбирается в options при сохранении. */
  optionsText: string;
};

/** «Еда, Транспорт,  Жильё» → ["Еда","Транспорт","Жильё"] */
export function splitOptions(value: string): string[] {
  return value
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

export function makeEmptyField(key: number): DraftField {
  return { key, label: "", type: "text", required: false, optionsText: "" };
}

/** FieldDef → DraftField: id сохраняем, чтобы правки не порвали записи. */
export function toDraft(fields: FieldDef[]): DraftField[] {
  return fields.map((field, index) => ({
    key: index + 1,
    id: field.id,
    label: field.label,
    type: field.type,
    required: field.required === true,
    optionsText: (field.options ?? []).join(", "),
  }));
}

/**
 * DraftField → FieldDef. Прежние поля сохраняют свой id, новые получают
 * свободный `fN` — иначе удаление строки в середине сдвинуло бы значения
 * у всех последующих полей.
 */
export function toFieldDefs(
  drafts: DraftField[],
  previous: FieldDef[]
): FieldDef[] {
  const taken = new Set(
    drafts.map((draft) => draft.id).filter((id): id is string => Boolean(id))
  );
  let counter = previous.length + 1;

  return drafts.map((draft) => {
    let id = draft.id;

    if (!id) {
      while (taken.has(`f${counter}`)) counter += 1;
      id = `f${counter}`;
      taken.add(id);
      counter += 1;
    }

    const def: FieldDef = {
      id,
      label: draft.label.trim(),
      type: draft.type,
    };

    if (draft.type === "select") {
      def.options = splitOptions(draft.optionsText);
    }

    // Пишем только когда правда обязательное: лишний ключ в jsonb ни к чему.
    if (draft.required) def.required = true;

    return def;
  });
}

/** Переставляет элемент массива; вне границ возвращает копию как есть. */
export function moveItem<T>(items: T[], index: number, offset: number): T[] {
  const target = index + offset;
  if (target < 0 || target >= items.length) return [...items];

  const next = [...items];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

export type DraftIssue =
  | { kind: "empty-label"; index: number }
  | { kind: "empty-options"; index: number; label: string };

/** Проверки, общие для создания модуля и его настроек. */
export function validateDrafts(drafts: DraftField[]): DraftIssue | null {
  const withoutLabel = drafts.findIndex((draft) => !draft.label.trim());
  if (withoutLabel !== -1) return { kind: "empty-label", index: withoutLabel };

  const emptySelect = drafts.findIndex(
    (draft) =>
      draft.type === "select" && splitOptions(draft.optionsText).length === 0
  );

  if (emptySelect !== -1) {
    return {
      kind: "empty-options",
      index: emptySelect,
      label: drafts[emptySelect].label.trim(),
    };
  }

  return null;
}

export function describeIssue(issue: DraftIssue | null): string | null {
  if (!issue) return null;
  if (issue.kind === "empty-label") {
    return `У поля ${issue.index + 1} нет названия`;
  }
  return `У списка «${issue.label}» нет вариантов`;
}
