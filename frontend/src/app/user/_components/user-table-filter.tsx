"use client";

import { useMemo, useState } from "react";
import {
  ColumnSettingsMenu,
  HiddenColumnStyles,
  ListSortControl,
  SortableHeader,
} from "../../_components/list-view-header";
import { PaginationControls } from "../../_components/pagination-controls";
import { DebouncedFilterInput } from "../../_components/debounced-filter-input";
import { type ServerPaginationMeta } from "../../_lib/pagination";
import { useI18n } from "../../_i18n/provider";
import { useFilterDraft } from "../../_hooks/use-filter-draft";
import { MobileFilterPanel } from "../../_components/mobile-filter-panel";
import { userRoleOptions, type UserFilter, type UserItem } from "../_lib/user";

type UserTableFilterProps = {
  rows: UserItem[];
  filter: UserFilter;
  filteredCount: number;
  pagination: ServerPaginationMeta;
  selectedId?: string;
  sortValue?: string;
  sortOptions?: Array<{ value: string; label: string }>;
  onSelectRow?: (row: UserItem) => void;
  onSortChange?: (value: string) => void;
  onFilterChange: <K extends keyof UserFilter>(key: K, value: UserFilter[K]) => void;
  onResetFilter: () => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
};

export function UserTableFilter({
  rows,
  filter,
  filteredCount,
  pagination,
  selectedId,
  sortValue,
  sortOptions = [],
  onSelectRow,
  onSortChange,
  onFilterChange,
  onResetFilter,
  onPageChange,
  onPageSizeChange,
}: UserTableFilterProps) {
  const { t } = useI18n();
  const { draftFilter, updateDraftFilter, applyDraftFilter, resetDraftFilter } =
    useFilterDraft(filter, onFilterChange, onResetFilter);
  const filterPlaceholder = (fieldKey: string) => t(fieldKey);
  const getRoleLabel = (role: "admin" | "staff") =>
    role === "admin" ? t("user.role.admin") : t("user.role.staff");
  const roleLabelMap = new Map(
    userRoleOptions.map((role) => [role, getRoleLabel(role)])
  );
  const columns = useMemo(
    () => [
      { key: "action", label: t("common.action"), index: 1, locked: true },
      { key: "username", label: t("field.username"), index: 2 },
      { key: "role", label: t("field.role"), index: 3 },
    ],
    [t]
  );
  const [hiddenColumns, setHiddenColumns] = useState<string[]>([]);
  const hiddenColumnIndexes = columns
    .filter((column) => hiddenColumns.includes(column.key))
    .map((column) => column.index);
  const isColumnVisible = (key: string) => !hiddenColumns.includes(key);

  return (
    <section className="ppp-list-view ppp-user-list space-y-4 rounded-xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <HiddenColumnStyles scopeClassName="ppp-user-list" hiddenColumnIndexes={hiddenColumnIndexes} />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{t("user.table.title")}</h2>
        <div className="flex flex-wrap items-center gap-2">
          <ListSortControl sortValue={sortValue} sortOptions={sortOptions} onSortChange={onSortChange} />
          <ColumnSettingsMenu
            columns={columns}
            hiddenColumns={hiddenColumns}
            onHiddenColumnsChange={setHiddenColumns}
          />
        </div>
      </div>

      <form onSubmit={applyDraftFilter}>
        <MobileFilterPanel label={t("common.filterByField")} labelClassName="text-slate-500 dark:text-slate-400">
        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm text-slate-700 dark:text-slate-200">
            {t("field.username")}
            <DebouncedFilterInput
              value={draftFilter.username}
              onValueChange={(value) => updateDraftFilter("username", value)}
              placeholder={filterPlaceholder("field.username")}
              className="mt-1 w-full rounded-lg border border-transparent bg-slate-100 px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-400 dark:bg-slate-900 dark:text-slate-100"
            />
          </label>

          <label className="text-sm text-slate-700 dark:text-slate-200">
            {t("field.role")}
            <select
              value={draftFilter.role}
              onChange={(event) => updateDraftFilter("role", event.target.value as UserFilter["role"])}
              className="mt-1 w-full rounded-lg border border-transparent bg-slate-100 px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-400 dark:bg-slate-900 dark:text-slate-100"
            >
              <option value="">{t("common.all")}</option>
              {userRoleOptions.map((role) => (
                <option key={role} value={role}>
                  {roleLabelMap.get(role) || role}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="mt-3 flex flex-wrap justify-end gap-2">
          <button type="button" onClick={resetDraftFilter} className="border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
            {t("common.resetFilter")}
          </button>
          <button type="submit" className="rounded-lg bg-sky-700 px-4 py-2 text-sm font-medium text-white hover:bg-sky-600 dark:bg-sky-500 dark:text-slate-950">
            {t("common.applyFilter")}
          </button>
        </div>
        </MobileFilterPanel>
      </form>

      <div className="space-y-3 md:hidden">
        {rows.length === 0 ? (
          <div className="rounded-xl border border-sky-200 bg-white px-4 py-5 text-center text-sm text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
            {t("common.noData")}
          </div>
        ) : (
          rows.map((row) => {
            const isSelected = selectedId === row.id;

            return (
              <article
                key={row.id}
                className={`rounded-xl border bg-white p-4 shadow-sm ${
                  isSelected
                    ? "border-sky-300 bg-sky-50/80 dark:border-sky-700 dark:bg-sky-950/35"
                    : "border-sky-100 dark:border-slate-800 dark:bg-slate-900"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    {isColumnVisible("username") ? (
                      <p className="truncate text-base font-semibold text-slate-900 dark:text-slate-100">{row.username || "-"}</p>
                    ) : null}
                    {isColumnVisible("role") ? (
                      <p className="mt-1 text-xs uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
                        {roleLabelMap.get(row.role) || row.role}
                      </p>
                    ) : null}
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                      isSelected
                        ? "bg-sky-700 text-white dark:bg-sky-500 dark:text-slate-950"
                        : "bg-sky-100 text-sky-700 dark:bg-slate-800 dark:text-slate-300"
                    }`}
                  >
                    {isSelected ? t("common.selected") : t("common.action")}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => onSelectRow?.(row)}
                  className={`mt-4 w-full rounded-lg px-3 py-2 text-sm font-medium ${
                    isSelected
                      ? "bg-sky-700 text-white dark:bg-sky-500 dark:text-slate-950"
                      : "border border-sky-200 bg-white text-sky-700 hover:bg-sky-50 dark:border-sky-800 dark:bg-slate-900 dark:text-sky-200 dark:hover:bg-slate-800"
                  }`}
                >
                  {isSelected ? t("common.selected") : t("common.selectRow")}
                </button>
              </article>
            );
          })
        )}
      </div>

      <div className="hidden md:block">
        <div className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] table-fixed text-sm">
              <colgroup>
                <col style={{ width: "140px" }} />
                <col style={{ width: "240px" }} />
                <col style={{ width: "180px" }} />
              </colgroup>
              <thead className="bg-slate-100 text-left text-slate-600 dark:bg-slate-900 dark:text-slate-300">
                <tr>
                  <th className="px-3 py-2 font-medium">{t("common.action")}</th>
                  <th className="px-3 py-2 font-medium">
                    <SortableHeader
                      label={t("field.username")}
                      sortValue={sortValue}
                      ascValue="nameAsc"
                      descValue="nameDesc"
                      onSortChange={onSortChange}
                    />
                  </th>
                  <th className="px-3 py-2 font-medium">{t("field.role")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white dark:divide-slate-800 dark:bg-slate-900">
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-3 py-4 text-center text-slate-500 dark:text-slate-400">
                      {t("common.noData")}
                    </td>
                  </tr>
                ) : (
                  rows.map((row, index) => {
                    const isSelected = selectedId === row.id;

                    return (
                      <tr key={row.id} className={isSelected ? "bg-sky-100 dark:bg-sky-950/40" : index % 2 ? "bg-sky-50/70 dark:bg-slate-950/40" : undefined}>
                        <td className="whitespace-nowrap px-3 py-2">
                          <button
                            type="button"
                            onClick={() => onSelectRow?.(row)}
                            className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
                              isSelected
                                ? "bg-sky-700 text-white dark:bg-sky-500 dark:text-slate-950"
                                : "border border-sky-200 bg-white text-sky-700 hover:bg-sky-50 dark:border-sky-800 dark:bg-slate-900 dark:text-sky-200 dark:hover:bg-slate-800"
                            }`}
                          >
                            {isSelected ? t("common.selected") : t("common.selectRow")}
                          </button>
                        </td>
                        <td className="truncate px-3 py-2 font-medium text-slate-800 dark:text-slate-100" title={row.username || "-"}>{row.username || "-"}</td>
                        <td className="truncate px-3 py-2 text-slate-600 dark:text-slate-300" title={roleLabelMap.get(row.role) || row.role}>{roleLabelMap.get(row.role) || row.role}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <PaginationControls
        currentPage={pagination.page}
        totalPages={pagination.totalPages}
        totalItems={pagination.totalItems}
        pageSize={pagination.limit}
        from={rows.length === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1}
        to={rows.length === 0 ? 0 : (pagination.page - 1) * pagination.limit + rows.length}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
      />

      <p className="text-sm text-slate-500 dark:text-slate-400">{t("common.filterResult", { count: filteredCount })}</p>
    </section>
  );
}
