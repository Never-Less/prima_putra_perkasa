"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ApiLoadingState } from "../_components/api-loading-state";
import { AppToast } from "../_components/app-toast";
import { ConfirmationModal } from "../_components/confirmation-modal";
import { requestUnsavedChangesConfirmation } from "../_hooks/use-unsaved-changes-warning";
import { ApiRequestError } from "../_lib/api-client";
import {
  buildFormRouteWithReturnPagination,
  buildListRouteWithPagination,
  normalizePaginationQueryState,
  normalizeReturnPaginationQueryState,
  type ServerPaginationMeta,
} from "../_lib/pagination";
import { PembelianEditForm } from "./_components/pembelian-edit-form";
import { PembelianTableFilter } from "./_components/pembelian-table-filter";
import {
  consumePembelianPrefill,
  createPembelian,
  defaultPembelianFilter,
  deletePembelian,
  fetchPembelianById,
  fetchPembelianList,
  pembelianStockInvoiceId,
  toPembelianFormStateFromPrefill,
  updatePembelian,
  type PembelianFilter,
  type PembelianFormState,
  type PembelianInvoiceOption,
  type PembelianItem,
} from "./_lib/pembelian";
import { useI18n } from "../_i18n/provider";
import { fetchInvoiceRows } from "../invoice/_lib/invoice";
import { fetchSupplierRows, type SupplierItem } from "../supplier/_lib/supplier";

type ToastState = {
  id: number;
  message: string;
  variant: "success" | "error";
};

type PembelianPageMode = "list" | "form";

type PembelianPageContentProps = {
  mode?: PembelianPageMode;
  itemId?: string;
};

const defaultPembelianPaginationQuery = {
  page: 1,
  limit: 10,
};

function normalizeDuplicateKey(value: string) {
  return String(value || "").trim().toLowerCase();
}

export function PembelianPageContent({ mode = "list", itemId = "" }: PembelianPageContentProps) {
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
        defaultPembelianPaginationQuery
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
        defaultPembelianPaginationQuery
      ),
    [searchParams]
  );
  const returnListPath = useMemo(
    () => buildListRouteWithPagination("/pembelian", returnPaginationQuery),
    [returnPaginationQuery]
  );
  const [rows, setRows] = useState<PembelianItem[]>([]);
  const [filter, setFilter] = useState<PembelianFilter>(defaultPembelianFilter);
  const [paginationQuery, setPaginationQuery] = useState(() =>
    isFormMode ? defaultPembelianPaginationQuery : initialPaginationQuery
  );
  const [pagination, setPagination] = useState<ServerPaginationMeta>({
    page: paginationQuery.page,
    limit: paginationQuery.limit,
    totalItems: 0,
    totalPages: 1,
  });
  const [filteredCount, setFilteredCount] = useState(0);
  const [invoiceOptions, setInvoiceOptions] = useState<PembelianInvoiceOption[]>([]);
  const [supplierOptions, setSupplierOptions] = useState<SupplierItem[]>([]);
  const [prefillOnLoad] = useState(() => consumePembelianPrefill());
  const [selectedId, setSelectedId] = useState(itemId);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [actionErrorMessage, setActionErrorMessage] = useState("");
  const [toast, setToast] = useState<ToastState | null>(null);
  const [initialForm, setInitialForm] = useState<PembelianFormState | null>(() =>
    prefillOnLoad ? toPembelianFormStateFromPrefill(prefillOnLoad) : null
  );
  const [initialFormKey, setInitialFormKey] = useState(() => (prefillOnLoad ? Date.now() : 0));
  const [pendingConfirmation, setPendingConfirmation] = useState<
    | {
        type: "update";
        form: PembelianFormState;
        selectedItem: PembelianItem;
      }
    | {
        type: "delete";
        selectedItem: PembelianItem;
      }
    | {
        type: "duplicate";
        form: PembelianFormState;
        selectedItem?: PembelianItem;
        duplicateItem: PembelianItem;
      }
    | null
  >(null);

  const showToast = useCallback((message: string, variant: ToastState["variant"]) => {
    setToast({
      id: Date.now(),
      message,
      variant,
    });
  }, []);

  const loadPembelianRows = useCallback(
    async (options: { showLoading?: boolean } = {}) => {
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

          const pembelian = await fetchPembelianById(itemId);
          const pembelianRows = pembelian ? [pembelian] : [];

          setRows(pembelianRows);
          setPagination({
            page: 1,
            limit: 1,
            totalItems: pembelianRows.length,
            totalPages: 1,
          });
          setFilteredCount(pembelianRows.length);
          setSelectedId(pembelian?.id || itemId);
          return;
        }

        const pembelianResult = await fetchPembelianList({
          ...filter,
          ...paginationQuery,
        });
        const pembelianRows = pembelianResult.items;
        setRows(pembelianRows);
        setPagination(pembelianResult.pagination);
        setFilteredCount(pembelianResult.totalRows);
        setSelectedId((prevSelectedId) => {
          if (pembelianRows.some((row) => row.id === prevSelectedId)) {
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
          setErrorMessage(error.message || t("pembelian.apiLoadError"));
          return;
        }

        setErrorMessage(t("pembelian.apiLoadError"));
      } finally {
        if (showLoading) {
          setIsLoading(false);
        }
      }
    },
    [filter, isFormMode, itemId, paginationQuery, t]
  );

  const loadInvoiceOptions = useCallback(async () => {
    try {
      const invoiceRows = await fetchInvoiceRows();
      const optionMap = new Map<string, string>();

      invoiceRows.forEach((invoice) => {
        const id = String(invoice.id || "").trim();

        if (!id) {
          return;
        }

        optionMap.set(id, String(invoice.noInvoice || "").trim() || id);
      });

      const mappedOptions = Array.from(optionMap.entries()).map(([id, noInvoice]) => ({
        id,
        noInvoice,
      }));

      setInvoiceOptions(mappedOptions);

      if (prefillOnLoad) {
        setInitialForm(toPembelianFormStateFromPrefill(prefillOnLoad, mappedOptions));
        setInitialFormKey(Date.now());
      }
    } catch (error) {
      setInvoiceOptions([]);

      if (error instanceof ApiRequestError) {
        showToast(error.message || t("pembelian.invoiceLoadError"), "error");
      } else {
        showToast(t("pembelian.invoiceLoadError"), "error");
      }
    }
  }, [prefillOnLoad, showToast, t]);

  const loadSupplierOptions = useCallback(async () => {
    try {
      const suppliers = await fetchSupplierRows();
      setSupplierOptions(suppliers);
    } catch (error) {
      setSupplierOptions([]);

      if (error instanceof ApiRequestError) {
        showToast(error.message || t("pembelian.supplierLoadError"), "error");
      } else {
        showToast(t("pembelian.supplierLoadError"), "error");
      }
    }
  }, [showToast, t]);

  useEffect(() => {
    void loadPembelianRows();
  }, [loadPembelianRows]);

  useEffect(() => {
    void loadInvoiceOptions();
  }, [loadInvoiceOptions]);

  useEffect(() => {
    void loadSupplierOptions();
  }, [loadSupplierOptions]);

  const handleFilterChange = useCallback(
    <K extends keyof PembelianFilter,>(key: K, value: PembelianFilter[K]) => {
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
    setFilter(defaultPembelianFilter);
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

  const navigateToForm = useCallback(
    (id?: string) => {
      const normalizedId = String(id || "").trim();
      router.push(
        buildFormRouteWithReturnPagination("/pembelian/form", normalizedId, paginationQuery)
      );
    },
    [paginationQuery, router]
  );

  const invoiceLabelMap = useMemo(() => {
    const map = new Map<string, string>();

    invoiceOptions.forEach((option) => {
      const id = String(option.id || "").trim();

      if (!id) {
        return;
      }

      map.set(id, String(option.noInvoice || "").trim() || id);
    });

    return map;
  }, [invoiceOptions]);

  const resolveInvoiceLabel = useCallback(
    (invoiceId: string) => {
      const key = String(invoiceId || "").trim();

      if (!key || key === pembelianStockInvoiceId) {
        return t("pembelian.stockInvoiceLabel");
      }

      return invoiceLabelMap.get(key) || key;
    },
    [invoiceLabelMap, t]
  );

  const findDuplicatePembelian = useCallback(
    async (form: PembelianFormState, selectedItem?: PembelianItem) => {
      const namaSupplier = String(form.namaSupplier || "").trim();
      const noNota = String(form.noNota || "").trim();

      if (!namaSupplier || !noNota) {
        return null;
      }

      const pembelianResult = await fetchPembelianList({
        ...defaultPembelianFilter,
        namaSupplier,
        noNota,
        page: 1,
        limit: 100,
      });
      const normalizedSupplier = normalizeDuplicateKey(namaSupplier);
      const normalizedNoNota = normalizeDuplicateKey(noNota);

      return (
        pembelianResult.items.find((item) => {
          if (selectedItem?.id && item.id === selectedItem.id) {
            return false;
          }

          return (
            normalizeDuplicateKey(item.namaSupplier) === normalizedSupplier &&
            normalizeDuplicateKey(item.noNota) === normalizedNoNota
          );
        }) || null
      );
    },
    []
  );

  const executeSavePembelian = useCallback(
    async (form: PembelianFormState, selectedItem?: PembelianItem) => {
      setActionErrorMessage("");
      setIsSaving(true);

      try {
        if (selectedItem?.id) {
          const updatedPembelian = await updatePembelian(selectedItem.id, form);
          await loadPembelianRows({ showLoading: false });
          setSelectedId(updatedPembelian?.id || selectedItem.id);
          if (isFormMode) {
            router.replace(
              buildFormRouteWithReturnPagination(
                "/pembelian/form",
                updatedPembelian?.id || selectedItem.id,
                returnPaginationQuery
              )
            );
          }
          showToast(
            t("pembelian.toast.updateSuccess", {
              namaSupplier: form.namaSupplier || selectedItem.namaSupplier || "-",
            }),
            "success"
          );
          return;
        }

        const createdPembelian = await createPembelian(form);
        await loadPembelianRows({ showLoading: false });
        setSelectedId(createdPembelian?.id || "");
        if (isFormMode && createdPembelian?.id) {
          router.replace(
            buildFormRouteWithReturnPagination(
              "/pembelian/form",
              createdPembelian.id,
              returnPaginationQuery
            )
          );
        }
        setInitialForm(null);
        setInitialFormKey(Date.now());
        showToast(t("pembelian.toast.createSuccess"), "success");
      } catch (error) {
        if (error instanceof ApiRequestError) {
          const message = error.message || t("pembelian.mutationError");
          setActionErrorMessage(message);
          showToast(message, "error");
          return;
        }

        const message = t("pembelian.mutationError");
        setActionErrorMessage(message);
        showToast(message, "error");
      } finally {
        setIsSaving(false);
      }
    },
    [isFormMode, loadPembelianRows, returnPaginationQuery, router, showToast, t]
  );

  const executeDeletePembelian = useCallback(
    async (selectedItem: PembelianItem) => {
      setActionErrorMessage("");
      setIsDeleting(true);

      try {
        await deletePembelian(selectedItem.id);
        setSelectedId("");
        await loadPembelianRows({ showLoading: false });
        if (isFormMode) {
          router.push(returnListPath);
        }
        showToast(
          t("pembelian.toast.deleteSuccess", {
            namaSupplier: selectedItem.namaSupplier || "-",
          }),
          "success"
        );
      } catch (error) {
        if (error instanceof ApiRequestError) {
          const message = error.message || t("pembelian.mutationError");
          setActionErrorMessage(message);
          showToast(message, "error");
          return;
        }

        const message = t("pembelian.mutationError");
        setActionErrorMessage(message);
        showToast(message, "error");
      } finally {
        setIsDeleting(false);
      }
    },
    [isFormMode, loadPembelianRows, returnListPath, router, showToast, t]
  );

  const handleSavePembelian = useCallback(
    async (form: PembelianFormState, selectedItem?: PembelianItem) => {
      try {
        const duplicateItem = await findDuplicatePembelian(form, selectedItem);

        if (duplicateItem) {
          setPendingConfirmation({
            type: "duplicate",
            form,
            selectedItem,
            duplicateItem,
          });
          return;
        }
      } catch (error) {
        if (error instanceof ApiRequestError) {
          const message = error.message || t("pembelian.apiLoadError");
          setActionErrorMessage(message);
          showToast(message, "error");
          return;
        }

        const message = t("pembelian.apiLoadError");
        setActionErrorMessage(message);
        showToast(message, "error");
        return;
      }

      if (selectedItem?.id) {
        setPendingConfirmation({
          type: "update",
          form,
          selectedItem,
        });
        return;
      }

      await executeSavePembelian(form, selectedItem);
    },
    [executeSavePembelian, findDuplicatePembelian, showToast, t]
  );

  const handleDeletePembelian = useCallback((selectedItem: PembelianItem) => {
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
      await executeSavePembelian(currentConfirmation.form, currentConfirmation.selectedItem);
      return;
    }

    if (currentConfirmation.type === "duplicate") {
      await executeSavePembelian(currentConfirmation.form, currentConfirmation.selectedItem);
      return;
    }

    await executeDeletePembelian(currentConfirmation.selectedItem);
  }, [executeDeletePembelian, executeSavePembelian, pendingConfirmation]);

  const confirmationConfig = useMemo(() => {
    if (!pendingConfirmation) {
      return null;
    }

    if (pendingConfirmation.type === "update") {
      return {
        title: t("pembelian.confirmUpdateTitle"),
        description: t("pembelian.confirmUpdateDescription", {
          namaSupplier: pendingConfirmation.selectedItem.namaSupplier || "-",
        }),
        confirmLabel: t("common.saveChanges"),
        variant: "default" as const,
      };
    }

    if (pendingConfirmation.type === "duplicate") {
      return {
        title: t("pembelian.confirmDuplicateTitle"),
        description: t("pembelian.confirmDuplicateDescription", {
          namaSupplier: pendingConfirmation.form.namaSupplier || "-",
          noNota: pendingConfirmation.form.noNota || "-",
        }),
        confirmLabel: t("pembelian.confirmDuplicateContinue"),
        variant: "default" as const,
      };
    }

    return {
      title: t("pembelian.confirmDeleteTitle"),
      description: t("pembelian.confirmDeleteDescription", {
        namaSupplier: pendingConfirmation.selectedItem.namaSupplier || "-",
      }),
      confirmLabel: t("common.delete"),
      variant: "danger" as const,
    };
  }, [pendingConfirmation, t]);

  const showDataSection = isFormMode
    ? !isLoading && !errorMessage
    : !isLoading && (rows.length > 0 || !errorMessage);

  return (
    <>
      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <section className="rounded-2xl border border-sky-100 bg-gradient-to-r from-sky-50 to-white p-4 shadow-sm dark:border-slate-800 dark:from-slate-900 dark:to-slate-950 sm:p-5">
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100 sm:text-2xl">{t("nav.pembelian")}</h1>
          <p className="mt-1 max-w-3xl text-sm text-slate-600 dark:text-slate-300">{t("pembelian.page.description")}</p>
        </section>

        <div className="mt-5 space-y-5">
          {isLoading ? <ApiLoadingState /> : null}

          {!isLoading && errorMessage ? (
            <section className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-200">
              <p>{errorMessage}</p>
              <button
                type="button"
                onClick={() => void loadPembelianRows()}
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
                  <PembelianEditForm
                    key={`${selectedId || "new"}-${initialFormKey}`}
                    item={selectedRow}
                    initialForm={selectedRow ? undefined : initialForm || undefined}
                    invoiceOptions={invoiceOptions}
                    supplierOptions={supplierOptions}
                    isSaving={isSaving}
                    isDeleting={isDeleting}
                    actionErrorMessage={actionErrorMessage}
                    onSave={handleSavePembelian}
                    onNewData={() => {
                      setActionErrorMessage("");
                      setInitialForm(null);
                      setInitialFormKey(Date.now());
                      setSelectedId("");
                      router.replace(
                        buildFormRouteWithReturnPagination(
                          "/pembelian/form",
                          "",
                          returnPaginationQuery
                        )
                      );
                    }}
                    onDelete={handleDeletePembelian}
                  />
                </>
              ) : (
                <>
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => navigateToForm()}
                      className="rounded-lg bg-sky-700 px-4 py-2 text-sm font-medium text-white hover:bg-sky-600 dark:bg-sky-500 dark:text-slate-950 dark:hover:bg-sky-400"
                    >
                      {t("common.newData")}
                    </button>
                  </div>
                  <PembelianTableFilter
                    rows={rows}
                    filter={filter}
                    filteredCount={filteredCount}
                    pagination={pagination}
                    selectedId=""
                    resolveInvoiceLabel={resolveInvoiceLabel}
                    onFilterChange={handleFilterChange}
                    onResetFilter={handleResetFilter}
                    onPageChange={handlePageChange}
                    onPageSizeChange={handlePageSizeChange}
                    onSelectRow={(row) => {
                      setInitialForm(null);
                      navigateToForm(row.id);
                    }}
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

export default function PembelianPage() {
  return <PembelianPageContent mode="list" />;
}
