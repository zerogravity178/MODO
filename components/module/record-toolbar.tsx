"use client";

import { ArrowDownUp, Search, SlidersHorizontal, X } from "lucide-react";

import { FieldInput, FieldSelect } from "@/components/ui/field";
import { Surface } from "@/components/ui/surface";
import { filterValues, type SortDirection, type SortKey } from "@/lib/records";
import type { RecordWithData } from "@/lib/records";
import type { FieldDef } from "@/lib/types";
import { cn } from "@/lib/utils";

type RecordToolbarProps = {
  query: string;
  onQueryChange: (value: string) => void;
  panelOpen: boolean;
  onTogglePanel: () => void;
  activeFilters: number;
  found: number;
  total: number;
  sortKey: SortKey;
  onSortKeyChange: (value: SortKey) => void;
  sortDirection: SortDirection;
  onToggleDirection: () => void;
  filters: Record<string, string>;
  onFilterChange: (fieldId: string, value: string) => void;
  items: RecordWithData[];
  fields: FieldDef[];
  filterable: FieldDef[];
  onReset: () => void;
};

/** Поиск, фильтры и сортировка — отдельно от разметки карточек. */
export function RecordToolbar({
  query,
  onQueryChange,
  panelOpen,
  onTogglePanel,
  activeFilters,
  found,
  total,
  sortKey,
  onSortKeyChange,
  sortDirection,
  onToggleDirection,
  filters,
  onFilterChange,
  items,
  fields,
  filterable,
  onReset,
}: RecordToolbarProps) {
  const filtersActive = activeFilters > 0 || query.trim().length > 0;

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <FieldInput
            type="search"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Поиск по записям"
            aria-label="Поиск по записям"
            size="compact"
            className="pl-9 pr-2"
          />
        </div>

        <button
          type="button"
          onClick={onTogglePanel}
          aria-expanded={panelOpen}
          aria-controls="filters-panel"
          className={cn(
            "flex h-10 shrink-0 items-center gap-1.5 rounded-md border px-3 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:h-9",
            activeFilters > 0
              ? "border-primary text-primary"
              : "border-border-strong text-muted-foreground hover:border-primary"
          )}
        >
          <SlidersHorizontal className="h-4 w-4" />
          <span className="hidden sm:inline">Фильтры</span>
          {activeFilters > 0 && (
            <span className="rounded-full bg-primary px-1.5 text-xs font-semibold text-primary-foreground">
              {activeFilters}
            </span>
          )}
        </button>
      </div>

      {panelOpen && (
        <Surface
          id="filters-panel"
          variant="plain"
          padding="sm"
          className="space-y-3"
        >
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="space-y-1">
              <span className="text-xs text-muted-foreground">Сортировка</span>
              <FieldSelect
                value={sortKey}
                onChange={(event) => onSortKeyChange(event.target.value)}
                size="compact"
              >
                <option value="__created_at__">По дате создания</option>
                {fields.map((field) => (
                  <option key={field.id} value={field.id}>
                    {field.label}
                  </option>
                ))}
              </FieldSelect>
            </label>

            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">Направление</span>
              <button
                type="button"
                onClick={onToggleDirection}
                className="flex h-10 w-full items-center justify-center gap-1.5 rounded-md border border-border-strong px-2 text-sm text-foreground transition hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:h-9"
              >
                <ArrowDownUp className="h-4 w-4" />
                {sortDirection === "asc" ? "По возрастанию" : "По убыванию"}
              </button>
            </div>
          </div>

          {filterable.length > 0 && (
            <div className="grid gap-2 sm:grid-cols-2">
              {filterable.map((field) => (
                <label key={field.id} className="space-y-1">
                  <span className="text-xs text-muted-foreground">
                    {field.label}
                  </span>
                  <FieldSelect
                    value={filters[field.id] ?? ""}
                    onChange={(event) =>
                      onFilterChange(field.id, event.target.value)
                    }
                    size="compact"
                  >
                    <option value="">Любое</option>
                    {filterValues(items, field).map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                    <option value="__empty__">Пустые</option>
                  </FieldSelect>
                </label>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={onReset}
            className="inline-flex min-h-9 items-center gap-1 text-xs text-muted-foreground transition hover:text-primary"
          >
            <X className="h-3.5 w-3.5" />
            Сбросить
          </button>
        </Surface>
      )}

      {filtersActive && (
        <p className="text-xs text-muted-foreground">
          Найдено: {found} из {total}
        </p>
      )}
    </div>
  );
}

export default RecordToolbar;
