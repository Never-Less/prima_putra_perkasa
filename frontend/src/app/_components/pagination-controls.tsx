"use client";

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
    <div className="flex flex-col gap-3 rounded-xl border border-sky-200 bg-white/80 px-3 py-3 text-sm shadow-sm dark:border-slate-800 dark:bg-slate-900/70 md:flex-row md:items-center md:justify-between">
      <div className="flex flex-wrap items-center gap-2 text-slate-600 dark:text-slate-300">
        <label className="flex items-center gap-2">
          <span>{t("common.pagination.itemsPerPage")}</span>
          <select
            value={pageSize}
            onChange={(event) => onPageSizeChange(Number(event.target.value))}
            className="rounded-lg border border-sky-200 bg-white px-2 py-1 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
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

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-slate-600 dark:text-slate-300">
          {t("common.pagination.pageInfo", { page: currentPage, totalPages })}
        </span>
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className="rounded-lg border border-sky-200 bg-white px-3 py-1.5 text-sm text-sky-700 hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-sky-800 dark:bg-slate-900 dark:text-sky-200 dark:hover:bg-slate-800"
        >
          {t("common.pagination.previous")}
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
              className={`min-w-9 rounded-lg border px-3 py-1.5 text-sm ${
                isActive
                  ? "border-sky-700 bg-sky-700 text-white dark:border-sky-500 dark:bg-sky-500 dark:text-slate-950"
                  : "border-sky-200 bg-white text-sky-700 hover:bg-sky-50 dark:border-sky-800 dark:bg-slate-900 dark:text-sky-200 dark:hover:bg-slate-800"
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
          className="rounded-lg border border-sky-200 bg-white px-3 py-1.5 text-sm text-sky-700 hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-sky-800 dark:bg-slate-900 dark:text-sky-200 dark:hover:bg-slate-800"
        >
          {t("common.pagination.next")}
        </button>
      </div>
    </div>
  );
}
