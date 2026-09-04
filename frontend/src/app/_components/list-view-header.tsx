"use client";

import { ArrowDown, ArrowUp, ArrowUpDown, Columns3, Plus } from "lucide-react";
import { type Dispatch, type SetStateAction, useEffect, useRef, useState } from "react";
import { useI18n } from "../_i18n/provider";

type ListViewHeaderProps = {
  title: string;
  addLabel?: string;
  onAdd?: () => void;
};

type ListSortControlProps = {
  sortValue?: string;
  sortOptions?: Array<{
    value: string;
    label: string;
  }>;
  onSortChange?: (value: string) => void;
};

type ColumnOption = {
  key: string;
  label: string;
  index: number;
  locked?: boolean;
};

type ColumnSettingsMenuProps = {
  columns: ColumnOption[];
  hiddenColumns: string[];
  onHiddenColumnsChange: (columns: string[]) => void;
};

type HiddenColumnStylesProps = {
  scopeClassName: string;
  hiddenColumnIndexes: number[];
};

type SortableHeaderProps = {
  label: string;
  sortValue?: string;
  ascValue?: string;
  descValue?: string;
  onSortChange?: (value: string) => void;
};

function useDismissibleMenu(isOpen: boolean, setIsOpen: Dispatch<SetStateAction<boolean>>) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, setIsOpen]);

  return containerRef;
}

export function ListViewHeader({
  title,
  addLabel,
  onAdd,
}: ListViewHeaderProps) {
  const { t } = useI18n();

  return (
    <section className="pb-3">
      <div className="flex min-h-9 items-center justify-between gap-3">
        <h1 className="min-w-0 truncate text-lg font-semibold leading-tight text-slate-950 dark:text-slate-50 sm:text-xl">
          {title}
        </h1>

        <div className="flex shrink-0 items-center justify-end">
          {onAdd ? (
            <button
              type="button"
              onClick={onAdd}
              className="erp-button erp-button-primary h-8 px-2.5"
            >
              <Plus aria-hidden="true" className="h-3.5 w-3.5" />
              <span className="whitespace-nowrap">{addLabel || t("common.newData")}</span>
            </button>
          ) : null}
        </div>
      </div>
    </section>
  );
}

export function ListSortControl({ sortValue, sortOptions = [], onSortChange }: ListSortControlProps) {
  const { t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useDismissibleMenu(isOpen, setIsOpen);

  if (sortOptions.length === 0 || sortValue === undefined || !onSortChange) {
    return null;
  }

  const selectedLabel = sortOptions.find((option) => option.value === sortValue)?.label || t("common.sort");

  return (
    <div ref={containerRef} className="relative flex justify-end">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className="erp-icon-button"
        aria-label={t("common.sort")}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        title={`${t("common.sort")}: ${selectedLabel}`}
      >
        <ArrowUpDown aria-hidden="true" className="h-4 w-4" />
      </button>

      {isOpen ? (
        <div
          className="erp-menu absolute right-0 top-11 z-20 w-56 py-1"
          role="menu"
        >
          {sortOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onSortChange(option.value);
                setIsOpen(false);
              }}
              className={`block w-full px-3 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-900 ${
                option.value === sortValue
                  ? "font-semibold text-slate-950 dark:text-slate-50"
                  : "text-slate-600 dark:text-slate-300"
              }`}
              role="menuitem"
            >
              {option.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function ColumnSettingsMenu({
  columns,
  hiddenColumns,
  onHiddenColumnsChange,
}: ColumnSettingsMenuProps) {
  const { t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useDismissibleMenu(isOpen, setIsOpen);

  const toggleColumn = (key: string) => {
    if (hiddenColumns.includes(key)) {
      onHiddenColumnsChange(hiddenColumns.filter((columnKey) => columnKey !== key));
      return;
    }

    onHiddenColumnsChange([...hiddenColumns, key]);
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className="erp-icon-button"
        aria-label={t("common.columns")}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        title={t("common.columns")}
      >
        <Columns3 aria-hidden="true" className="h-4 w-4" />
      </button>

      {isOpen ? (
        <div className="erp-menu absolute right-0 top-11 z-20 w-60 py-2">
          <p className="px-3 pb-1 text-xs font-semibold uppercase text-slate-400 dark:text-slate-500">
            {t("common.showColumns")}
          </p>
          {columns.map((column) => (
            <label
              key={column.key}
              className={`flex cursor-pointer items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-900 ${
                column.locked ? "opacity-60" : ""
              }`}
            >
              <input
                type="checkbox"
                checked={!hiddenColumns.includes(column.key)}
                disabled={column.locked}
                onChange={() => toggleColumn(column.key)}
                className="h-4 w-4 rounded border-slate-300"
              />
              <span className="truncate">{column.label}</span>
            </label>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function HiddenColumnStyles({ scopeClassName, hiddenColumnIndexes }: HiddenColumnStylesProps) {
  if (hiddenColumnIndexes.length === 0) {
    return null;
  }

  const rules = hiddenColumnIndexes
    .map(
      (index) =>
        `.${scopeClassName} table :is(th,td):nth-child(${index}), .${scopeClassName} table col:nth-child(${index}) { display: none !important; }`
    )
    .join("\n");

  return <style>{rules}</style>;
}

export function SortableHeader({
  label,
  sortValue,
  ascValue,
  descValue,
  onSortChange,
}: SortableHeaderProps) {
  if (!ascValue || !descValue || !onSortChange) {
    return <span>{label}</span>;
  }

  const isAsc = sortValue === ascValue;
  const isDesc = sortValue === descValue;
  const nextValue = isDesc ? ascValue : descValue;

  return (
    <button
      type="button"
      onClick={() => onSortChange(nextValue)}
      className="inline-flex max-w-full items-center gap-1 text-left font-medium text-inherit"
    >
      <span className="truncate">{label}</span>
      {isAsc ? (
        <ArrowUp aria-hidden="true" className="h-3.5 w-3.5 text-slate-700 dark:text-slate-100" />
      ) : isDesc ? (
        <ArrowDown aria-hidden="true" className="h-3.5 w-3.5 text-slate-700 dark:text-slate-100" />
      ) : (
        <ArrowUpDown aria-hidden="true" className="h-3.5 w-3.5 text-slate-300 dark:text-slate-600" />
      )}
    </button>
  );
}
