"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ApiLoadingState } from "../_components/api-loading-state";
import { AppToast } from "../_components/app-toast";
import { ConfirmationModal } from "../_components/confirmation-modal";
import { ListViewHeader } from "../_components/list-view-header";
import { requestUnsavedChangesConfirmation } from "../_hooks/use-unsaved-changes-warning";
import { usePersistentListUrl } from "../_hooks/use-persistent-list-url";
import { ApiRequestError } from "../_lib/api-client";
import {
  buildFormRouteWithReturnPagination,
  buildListRouteWithPagination,
  normalizePaginationQueryState,
  normalizeReturnPaginationQueryState,
  normalizeStringFilterQueryState,
  type ServerPaginationMeta,
} from "../_lib/pagination";
import { SupplierOnboardingPanel } from "./_components/supplier-onboarding-panel";
import { SupplierEditForm } from "./_components/supplier-edit-form";
import { SupplierTableFilter } from "./_components/supplier-table-filter";
import {
  createSupplier,
  defaultSupplierFilter,
  deleteSupplier,
  fetchSupplierById,
  fetchSupplierList,
  updateSupplier,
  type SupplierFilter,
  type SupplierFormState,
  type SupplierItem,
} from "./_lib/supplier";
import { useI18n } from "../_i18n/provider";

type ToastState = {
  id: number;
  message: string;
  variant: "success" | "error";
};

type SupplierPageMode = "list" | "form";

type SupplierPageContentProps = {
  mode?: SupplierPageMode;
  itemId?: string;
};

const defaultSupplierPaginationQuery = {
  page: 1,
  limit: 10,
};
const defaultSupplierSort = "updatedDesc";

export function SupplierPageContent({ mode = "list", itemId = "" }: SupplierPageContentProps) {
  const { t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isFormMode = mode === "form";
  const initialPaginationQuery = useMemo(
    () =>
      normalizePaginationQueryState(
        {
          page: searchParams.get("page"),
          limit: searchParams.get("limit"),
        },
        defaultSupplierPaginationQuery
      ),
    [searchParams]
  );
  const returnPaginationQuery = useMemo(
    () =>
      normalizeReturnPaginationQueryState(
        {
          returnPage: searchParams.get("returnPage"),
          returnLimit: searchParams.get("returnLimit"),
        },
        defaultSupplierPaginationQuery
      ),
    [searchParams]
  );
  const initialFilterQuery = useMemo(() => normalizeStringFilterQueryState(searchParams, defaultSupplierFilter), [searchParams]);
  const initialSortValue = String(searchParams.get("sort") || defaultSupplierSort);
  const returnListState = useMemo(() => ({ ...initialFilterQuery, sort: initialSortValue }), [initialFilterQuery, initialSortValue]);
  const returnListPath = useMemo(
    () => buildListRouteWithPagination("/supplier", returnPaginationQuery, returnListState),
    [returnListState, returnPaginationQuery]
  );
  const [rows, setRows] = useState<SupplierItem[]>([]);
  const [filter, setFilter] = useState<SupplierFilter>(initialFilterQuery);
  const [paginationQuery, setPaginationQuery] = useState(() =>
    isFormMode ? defaultSupplierPaginationQuery : initialPaginationQuery
  );
  const [pagination, setPagination] = useState<ServerPaginationMeta>({
    page: paginationQuery.page,
    limit: paginationQuery.limit,
    totalItems: 0,
    totalPages: 1,
  });
  const [filteredCount, setFilteredCount] = useState(0);
  const [sortValue, setSortValue] = useState(initialSortValue);
  const [selectedId, setSelectedId] = useState(itemId);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [actionErrorMessage, setActionErrorMessage] = useState("");
  const [toast, setToast] = useState<ToastState | null>(null);
  const [pendingConfirmation, setPendingConfirmation] = useState<
    | {
        type: "update";
        form: SupplierFormState;
        selectedItem: SupplierItem;
      }
    | {
        type: "delete";
        selectedItem: SupplierItem;
      }
    | null
  >(null);

  const canManageSupplier = true;

  usePersistentListUrl({ enabled: !isFormMode, basePath: "/supplier", defaultFilter: defaultSupplierFilter, defaultPagination: defaultSupplierPaginationQuery, defaultSort: defaultSupplierSort, filter, pagination: paginationQuery, sort: sortValue, setFilter, setPagination: setPaginationQuery, setSort: setSortValue });

  const showToast = useCallback((message: string, variant: ToastState["variant"]) => {
    setToast({
      id: Date.now(),
      message,
      variant,
    });
  }, []);

  const loadSuppliers = useCallback(async (options: { showLoading?: boolean } = {}) => {
    const { showLoading = true } = options;

    if (showLoading) {
      setIsLoading(true);
    }

    setErrorMessage("");

    try {
      if (isFormMode) {
        if (!itemId) {
          setRows([]);
          setPagination((prevPagination) => ({
            ...prevPagination,
            totalItems: 0,
            totalPages: 1,
          }));
          setFilteredCount(0);
          setSelectedId("");
          return;
        }

        const supplier = await fetchSupplierById(itemId);
        const supplierRows = supplier ? [supplier] : [];

        setRows(supplierRows);
        setPagination({
          page: 1,
          limit: 1,
          totalItems: supplierRows.length,
          totalPages: 1,
        });
        setFilteredCount(supplierRows.length);
        setSelectedId(supplier?.id || itemId);
        return;
      }

      const supplierResult = await fetchSupplierList({
        ...filter,
        ...paginationQuery,
        sort: sortValue,
      });
      const supplierRows = supplierResult.items;

      setRows(supplierRows);
      setPagination(supplierResult.pagination);
      setFilteredCount(supplierResult.totalRows);
      setSelectedId((prevSelectedId) => {
        if (supplierRows.some((row) => row.id === prevSelectedId)) {
          return prevSelectedId;
        }

        return "";
      });
    } catch (error) {
      setRows([]);
      setPagination((prevPagination) => ({
        ...prevPagination,
        totalItems: 0,
        totalPages: 1,
      }));
      setFilteredCount(0);
      setSelectedId("");

      if (error instanceof ApiRequestError) {
        setErrorMessage(error.message || t("supplier.apiLoadError"));
        return;
      }

      setErrorMessage(t("supplier.apiLoadError"));
    } finally {
      if (showLoading) {
        setIsLoading(false);
      }
    }
  }, [filter, isFormMode, itemId, paginationQuery, sortValue, t]);

  useEffect(() => {
    void loadSuppliers();
  }, [loadSuppliers]);

  const handleFilterChange = useCallback(
    <K extends keyof SupplierFilter,>(key: K, value: SupplierFilter[K]) => {
      setFilter((prevFilter) => ({
        ...prevFilter,
        [key]: value,
      }));
      setPaginationQuery((prevQuery) => ({
        ...prevQuery,
        page: 1,
      }));
    },
    []
  );

  const handleResetFilter = useCallback(() => {
    setFilter(defaultSupplierFilter);
    setPaginationQuery((prevQuery) => ({
      ...prevQuery,
      page: 1,
    }));
  }, []);

  const handlePageChange = useCallback((page: number) => {
    setPaginationQuery((prevQuery) => ({
      ...prevQuery,
      page,
    }));
  }, []);

  const handlePageSizeChange = useCallback((limit: number) => {
    setPaginationQuery({
      page: 1,
      limit,
    });
  }, []);

  const selectedRow = useMemo(() => {
    return rows.find((row) => row.id === selectedId);
  }, [rows, selectedId]);

  const sortedRows = useMemo(() => {
    return [...rows].sort((left, right) => {
      if (sortValue === "updatedAsc") {
        return left.updatedAt.localeCompare(right.updatedAt);
      }

      if (sortValue === "nameAsc") {
        return left.namaSupplier.localeCompare(right.namaSupplier);
      }

      if (sortValue === "nameDesc") {
        return right.namaSupplier.localeCompare(left.namaSupplier);
      }

      return right.updatedAt.localeCompare(left.updatedAt);
    });
  }, [rows, sortValue]);

  const showDataSection = isFormMode
    ? !isLoading && !errorMessage
    : !isLoading && (rows.length > 0 || !errorMessage);

  const navigateToForm = useCallback(
    (id?: string) => {
      const normalizedId = String(id || "").trim();
      router.push(
        buildFormRouteWithReturnPagination("/supplier/form", normalizedId, paginationQuery, { ...filter, sort: sortValue })
      );
    },
    [filter, paginationQuery, router, sortValue]
  );

  const executeSaveSupplier = useCallback(
    async (form: SupplierFormState, selectedItem?: SupplierItem) => {
      if (!canManageSupplier) {
        const message = t("supplier.adminOnlyAction");
        setActionErrorMessage(message);
        showToast(message, "error");
        return;
      }

      setActionErrorMessage("");
      setIsSaving(true);

      try {
        if (selectedItem?.id) {
          const updatedSupplier = await updateSupplier(selectedItem.id, form);
          await loadSuppliers({ showLoading: false });
          setSelectedId(updatedSupplier?.id || selectedItem.id);
          if (isFormMode) {
            router.replace(
              buildFormRouteWithReturnPagination(
                "/supplier/form",
                updatedSupplier?.id || selectedItem.id,
                returnPaginationQuery,
                returnListState
              )
            );
          }
          showToast(
            t("supplier.toast.updateSuccess", {
              namaSupplier: form.namaSupplier || selectedItem.namaSupplier || "-",
            }),
            "success"
          );
          return;
        }

        const createdSupplier = await createSupplier(form);
        await loadSuppliers({ showLoading: false });
        setSelectedId(createdSupplier?.id || "");
        if (isFormMode && createdSupplier?.id) {
          router.replace(
            buildFormRouteWithReturnPagination(
              "/supplier/form",
              createdSupplier.id,
              returnPaginationQuery,
              returnListState
            )
          );
        }
        showToast(t("supplier.toast.createSuccess"), "success");
      } catch (error) {
        if (error instanceof ApiRequestError) {
          const message = error.message || t("supplier.mutationError");
          setActionErrorMessage(message);
          showToast(message, "error");
          return;
        }

        const message = t("supplier.mutationError");
        setActionErrorMessage(message);
        showToast(message, "error");
      } finally {
        setIsSaving(false);
      }
    },
    [canManageSupplier, isFormMode, loadSuppliers, returnListState, returnPaginationQuery, router, showToast, t]
  );

  const executeDeleteSupplier = useCallback(
    async (selectedItem: SupplierItem) => {
      if (!canManageSupplier) {
        const message = t("supplier.adminOnlyAction");
        setActionErrorMessage(message);
        showToast(message, "error");
        return;
      }

      setActionErrorMessage("");
      setIsDeleting(true);

      try {
        await deleteSupplier(selectedItem.id);
        setSelectedId("");
        await loadSuppliers({ showLoading: false });
        if (isFormMode) {
          router.push(returnListPath);
        }
        showToast(
          t("supplier.toast.deleteSuccess", {
            namaSupplier: selectedItem.namaSupplier || "-",
          }),
          "success"
        );
      } catch (error) {
        if (error instanceof ApiRequestError) {
          const message = error.message || t("supplier.mutationError");
          setActionErrorMessage(message);
          showToast(message, "error");
          return;
        }

        const message = t("supplier.mutationError");
        setActionErrorMessage(message);
        showToast(message, "error");
      } finally {
        setIsDeleting(false);
      }
    },
    [canManageSupplier, isFormMode, loadSuppliers, returnListPath, router, showToast, t]
  );

  const handleSaveSupplier = useCallback(
    async (form: SupplierFormState, selectedItem?: SupplierItem) => {
      if (selectedItem?.id) {
        setPendingConfirmation({
          type: "update",
          form,
          selectedItem,
        });
        return;
      }

      await executeSaveSupplier(form, selectedItem);
    },
    [executeSaveSupplier]
  );

  const handleDeleteSupplier = useCallback((selectedItem: SupplierItem) => {
    setPendingConfirmation({
      type: "delete",
      selectedItem,
    });
  }, []);

  const handleConfirmAction = useCallback(async () => {
    if (!pendingConfirmation) {
      return;
    }

    const currentConfirmation = pendingConfirmation;
    setPendingConfirmation(null);

    if (currentConfirmation.type === "update") {
      await executeSaveSupplier(currentConfirmation.form, currentConfirmation.selectedItem);
      return;
    }

    await executeDeleteSupplier(currentConfirmation.selectedItem);
  }, [executeDeleteSupplier, executeSaveSupplier, pendingConfirmation]);

  const confirmationConfig = useMemo(() => {
    if (!pendingConfirmation) {
      return null;
    }

    if (pendingConfirmation.type === "update") {
      return {
        title: t("supplier.confirmUpdateTitle"),
        description: t("supplier.confirmUpdateDescription", {
          namaSupplier: pendingConfirmation.selectedItem.namaSupplier || "-",
        }),
        confirmLabel: t("common.saveChanges"),
        variant: "default" as const,
      };
    }

    return {
      title: t("supplier.confirmDeleteTitle"),
      description: t("supplier.confirmDeleteDescription", {
        namaSupplier: pendingConfirmation.selectedItem.namaSupplier || "-",
      }),
      confirmLabel: t("common.delete"),
      variant: "danger" as const,
    };
  }, [pendingConfirmation, t]);

  return (
    <>
      <main className="erp-page">
        <ListViewHeader
          title={t("nav.supplier")}
          addLabel={t("common.addPageData", { page: t("nav.supplier") })}
          onAdd={isFormMode ? undefined : () => navigateToForm()}
        />

        <div className="mt-3 space-y-3">
          {isLoading ? <ApiLoadingState /> : null}

          {!isLoading && errorMessage ? (
            <section className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-200">
              <p>{errorMessage}</p>
              <button
                type="button"
                onClick={() => void loadSuppliers()}
                className="mt-3 rounded-lg border border-red-300 bg-white px-3 py-2 text-xs font-medium text-red-700 hover:bg-red-100 dark:border-red-900 dark:bg-slate-900 dark:text-red-200 dark:hover:bg-red-950/40"
              >
                {t("common.retry")}
              </button>
            </section>
          ) : null}

          {showDataSection ? (
            <>
              {isFormMode ? (
                <>
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        void requestUnsavedChangesConfirmation(t("common.unsavedChangesWarning")).then((canLeave) => {
                          if (canLeave) {
                            router.push(returnListPath);
                          }
                        });
                      }}
                      className="rounded-lg border border-sky-300 bg-white px-4 py-2 text-sm font-medium text-sky-700 hover:bg-sky-50 dark:border-sky-800 dark:bg-slate-900 dark:text-sky-200 dark:hover:bg-slate-800"
                    >
                      {t("common.close")}
                    </button>
                  </div>
                  {selectedRow ? <SupplierOnboardingPanel key={selectedRow.id} item={selectedRow} onChanged={() => loadSuppliers({ showLoading: false })} onCompleted={() => router.push(returnListPath)} /> : <p className="text-sm text-slate-600 dark:text-slate-300">{t("supplierOnboarding.saveFirst")}</p>}
                  <SupplierEditForm
                    key={selectedRow ? `${selectedRow.id}:${selectedRow.updatedAt}` : "new"}
                    item={selectedRow}
                    canManageSupplier={canManageSupplier}
                    isSaving={isSaving}
                    isDeleting={isDeleting}
                    actionErrorMessage={actionErrorMessage}
                    onSave={handleSaveSupplier}
                    onNewData={() => {
                      setActionErrorMessage("");
                      setSelectedId("");
                      router.replace(
                        buildFormRouteWithReturnPagination(
                          "/supplier/form",
                          "",
                          returnPaginationQuery,
                          returnListState
                        )
                      );
                    }}
                    onDelete={handleDeleteSupplier}
                  />
                </>
              ) : (
                <>
                  <SupplierTableFilter
                    rows={sortedRows}
                    filter={filter}
                    filteredCount={filteredCount}
                    pagination={pagination}
                    selectedId=""
                    sortValue={sortValue}
                    onSortChange={setSortValue}
                    sortOptions={[
                      { value: "updatedDesc", label: t("common.sort.updatedDesc") },
                      { value: "updatedAsc", label: t("common.sort.updatedAsc") },
                      { value: "nameAsc", label: t("common.sort.nameAsc") },
                      { value: "nameDesc", label: t("common.sort.nameDesc") },
                    ]}
                    onFilterChange={handleFilterChange}
                    onResetFilter={handleResetFilter}
                    onPageChange={handlePageChange}
                    onPageSizeChange={handlePageSizeChange}
                    onSelectRow={(row) => navigateToForm(row.id)}
                  />
                </>
              )}
            </>
          ) : null}
        </div>
      </main>

      <ConfirmationModal
        isOpen={Boolean(confirmationConfig)}
        title={confirmationConfig?.title ?? ""}
        description={confirmationConfig?.description ?? ""}
        confirmLabel={confirmationConfig?.confirmLabel ?? ""}
        cancelLabel={t("common.cancel")}
        variant={confirmationConfig?.variant ?? "default"}
        isLoading={isSaving || isDeleting}
        onCancel={() => setPendingConfirmation(null)}
        onConfirm={() => void handleConfirmAction()}
      />
      <AppToast
        isOpen={Boolean(toast)}
        message={toast?.message ?? ""}
        variant={toast?.variant ?? "success"}
        closeLabel={t("common.close")}
        toastKey={toast?.id}
        onClose={() => setToast(null)}
      />
    </>
  );
}

export default function SupplierPage() {
  return <SupplierPageContent mode="list" />;
}
