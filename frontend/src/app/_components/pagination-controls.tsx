"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useI18n } from "../_i18n/provider";

type PaginationControlsProps = {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  from: number;
  to: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  pageSizeOptions?: number[];
};

type PaginationToken =
  | {
      type: "page";
      value: number;
    }
  | {
      type: "ellipsis";
      key: string;
    };

function buildPaginationTokens(currentPage: number, totalPages: number): PaginationToken[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => ({
      type: "page" as const,
      value: index + 1,
    }));
  }

  const visiblePages = new Set<number>([
    1,
    totalPages,
    currentPage - 1,
    currentPage,
    currentPage + 1,
  ]);

  if (currentPage <= 3) {
    visiblePages.add(2);
    visiblePages.add(3);
    visiblePages.add(4);
  }

  if (currentPage >= totalPages - 2) {
    visiblePages.add(totalPages - 1);
    visiblePages.add(totalPages - 2);
    visiblePages.add(totalPages - 3);
  }

  const sortedPages = Array.from(visiblePages.values())
    .filter((value) => value >= 1 && value <= totalPages)
    .sort((left, right) => left - right);

  const tokens: PaginationToken[] = [];

  sortedPages.forEach((page, index) => {
    const previousPage = sortedPages[index - 1];

    if (index > 0 && previousPage && page - previousPage > 1) {
      tokens.push({
        type: "ellipsis",
        key: `ellipsis-${previousPage}-${page}`,
      });
    }

    tokens.push({
      type: "page",
      value: page,
    });
  });

  return tokens;
}

export function PaginationControls({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  from,
  to,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [5, 10, 20, 50],
}: PaginationControlsProps) {
  const { t } = useI18n();
  const hasPagination = totalItems > 0;
  const paginationTokens = buildPaginationTokens(currentPage, totalPages);

  return (
    <div className="flex flex-col gap-3 border-t border-slate-200 bg-white px-3 py-3 text-sm dark:border-slate-800 dark:bg-slate-950 md:flex-row md:items-center md:justify-between">
      <div className="flex flex-wrap items-center gap-2 text-slate-600 dark:text-slate-300">
        <label className="flex items-center gap-2">
          <span>{t("common.pagination.itemsPerPage")}</span>
          <select
            value={pageSize}
            onChange={(event) => onPageSizeChange(Number(event.target.value))}
            className="erp-field h-8 w-16 py-1"
          >
            {pageSizeOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <span>
          {hasPagination
            ? t("common.pagination.summary", { from, to, total: totalItems })
            : t("common.pagination.emptySummary")}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-slate-600 dark:text-slate-300">
          {t("common.pagination.pageInfo", { page: currentPage, totalPages })}
        </span>
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className="erp-icon-button h-8 w-8"
          aria-label={t("common.pagination.previous")}
          title={t("common.pagination.previous")}
        >
          <ChevronLeft aria-hidden="true" className="h-4 w-4" />
        </button>
        {paginationTokens.map((token) => {
          if (token.type === "ellipsis") {
            return (
              <span key={token.key} className="px-1.5 text-slate-500 dark:text-slate-400">
                ...
              </span>
            );
          }

          const isActive = token.value === currentPage;

          return (
            <button
              key={token.value}
              type="button"
              onClick={() => onPageChange(token.value)}
              aria-current={isActive ? "page" : undefined}
              className={`h-8 min-w-8 rounded-md border px-2 text-sm font-medium ${
                isActive
                  ? "border-blue-600 bg-blue-600 text-white dark:border-blue-500 dark:bg-blue-500 dark:text-white"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
              }`}
            >
              {token.value}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="erp-icon-button h-8 w-8"
          aria-label={t("common.pagination.next")}
          title={t("common.pagination.next")}
        >
          <ChevronRight aria-hidden="true" className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
