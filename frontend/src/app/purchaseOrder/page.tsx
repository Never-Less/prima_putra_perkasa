"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ApiLoadingState } from "../_components/api-loading-state";
import { AppToast } from "../_components/app-toast";
import { ConfirmationModal } from "../_components/confirmation-modal";
import { useExportAccess } from "../_hooks/use-export-access";
import { useI18n } from "../_i18n/provider";
import { ApiRequestError } from "../_lib/api-client";
import { type ServerPaginationMeta } from "../_lib/pagination";
import { PurchaseOrderEditForm } from "./_components/purchase-order-edit-form";
import { PurchaseOrderTableFilter } from "./_components/purchase-order-table-filter";
import {
  createPurchaseOrder,
  defaultPurchaseOrderFilter,
  deletePurchaseOrder,
  fetchPurchaseOrderById,
  fetchPurchaseOrderList,
  fetchPurchaseOrderOptions,
  updatePurchaseOrder,
  type PurchaseOrderCustomerOption,
  type PurchaseOrderFilter,
  type PurchaseOrderFormState,
  type PurchaseOrderInvoiceOption,
  type PurchaseOrderItem,
} from "./_lib/purchase-order";

type ToastState = {
  id: number;
  message: string;
  variant: "success" | "error";
};

type PurchaseOrderPageMode = "list" | "form";

type PurchaseOrderPageContentProps = {
  mode?: PurchaseOrderPageMode;
  itemId?: string;
};

export function PurchaseOrderPageContent({ mode = "list", itemId = "" }: PurchaseOrderPageContentProps) {
  const { t } = useI18n();
  const router = useRouter();
  const isFormMode = mode === "form";
  const canExport = useExportAccess();
  const [rows, setRows] = useState<PurchaseOrderItem[]>([]);
  const [filter, setFilter] = useState<PurchaseOrderFilter>(defaultPurchaseOrderFilter);
  const [paginationQuery, setPaginationQuery] = useState({
    page: 1,
    limit: 10,
  });
  const [pagination, setPagination] = useState<ServerPaginationMeta>({
    page: 1,
    limit: 10,
    totalItems: 0,
    totalPages: 1,
  });
  const [filteredCount, setFilteredCount] = useState(0);
  const [customerOptions, setCustomerOptions] = useState<PurchaseOrderCustomerOption[]>([]);
  const [invoiceOptions, setInvoiceOptions] = useState<PurchaseOrderInvoiceOption[]>([]);
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
        form: PurchaseOrderFormState;
        selectedItem: PurchaseOrderItem;
      }
    | {
        type: "delete";
        selectedItem: PurchaseOrderItem;
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

  const loadPurchaseOrders = useCallback(
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
            return [];
          }

          const purchaseOrder = await fetchPurchaseOrderById(itemId);
          const purchaseOrderRows = purchaseOrder ? [purchaseOrder] : [];

          setRows(purchaseOrderRows);
          setPagination({
            page: 1,
            limit: 1,
            totalItems: purchaseOrderRows.length,
            totalPages: 1,
          });
          setFilteredCount(purchaseOrderRows.length);
          setSelectedId(purchaseOrder?.id || itemId);
          return purchaseOrderRows;
        }

        const purchaseOrderResult = await fetchPurchaseOrderList({
          ...filter,
          ...paginationQuery,
        });
        const purchaseOrderRows = purchaseOrderResult.items;
        setRows(purchaseOrderRows);
        setPagination(purchaseOrderResult.pagination);
        setFilteredCount(purchaseOrderResult.totalRows);
        setSelectedId((prevSelectedId) => {
          if (purchaseOrderRows.some((row) => row.id === prevSelectedId)) {
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
          setErrorMessage(error.message || t("purchaseOrder.apiLoadError"));
          return;
        }

        setErrorMessage(t("purchaseOrder.apiLoadError"));
      } finally {
        if (showLoading) {
          setIsLoading(false);
        }
      }
    },
    [filter, isFormMode, itemId, paginationQuery, t]
  );

  const loadOptions = useCallback(async () => {
    try {
      const options = await fetchPurchaseOrderOptions();
      setCustomerOptions(options.customerOptions);
      setInvoiceOptions(options.invoiceOptions);
    } catch (error) {
      setCustomerOptions([]);
      setInvoiceOptions([]);

      if (error instanceof ApiRequestError) {
        showToast(error.message || t("purchaseOrder.optionsLoadError"), "error");
        return;
      }

      showToast(t("purchaseOrder.optionsLoadError"), "error");
    }
  }, [showToast, t]);

  useEffect(() => {
    void loadPurchaseOrders();
  }, [loadPurchaseOrders]);

  useEffect(() => {
    void loadOptions();
  }, [loadOptions]);

  const handleFilterChange = useCallback(
    <K extends keyof PurchaseOrderFilter,>(key: K, value: PurchaseOrderFilter[K]) => {
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
    setFilter(defaultPurchaseOrderFilter);
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

  const handleOpenExportPage = useCallback(() => {
    if (!canExport) {
      return;
    }

    const searchParams = new URLSearchParams();

    Object.entries(filter).forEach(([key, value]) => {
      const normalizedValue = String(value || "").trim();

      if (!normalizedValue) {
        return;
      }

      searchParams.set(key, normalizedValue);
    });

    const targetPath = searchParams.toString()
      ? `/purchaseOrder/export?${searchParams.toString()}`
      : "/purchaseOrder/export";

    window.open(targetPath, "_blank", "noopener,noreferrer");
  }, [canExport, filter]);

  const navigateToForm = useCallback(
    (id?: string) => {
      const normalizedId = String(id || "").trim();
      router.push(
        normalizedId
          ? `/purchaseOrder/form?id=${encodeURIComponent(normalizedId)}`
          : "/purchaseOrder/form"
      );
    },
    [router]
  );

  const selectedRow = useMemo(() => {
    return rows.find((row) => row.id === selectedId);
  }, [rows, selectedId]);

  const customerLabelMap = useMemo(() => {
    return new Map(customerOptions.map((option) => [option.id, option.nama]));
  }, [customerOptions]);

  const invoiceLabelMap = useMemo(() => {
    return new Map(invoiceOptions.map((option) => [option.id, option.noInvoice]));
  }, [invoiceOptions]);

  const resolveCustomerLabel = useCallback(
    (customerId: string) => {
      const key = String(customerId || "").trim();

      if (!key) {
        return "-";
      }

      return customerLabelMap.get(key) || key;
    },
    [customerLabelMap]
  );

  const resolveInvoiceLabel = useCallback(
    (invoiceId: string) => {
      const key = String(invoiceId || "").trim();

      if (!key) {
        return "-";
      }

      return invoiceLabelMap.get(key) || key;
    },
    [invoiceLabelMap]
  );

  const executeSavePurchaseOrder = useCallback(
    async (form: PurchaseOrderFormState, selectedItem?: PurchaseOrderItem) => {
      setActionErrorMessage("");
      setIsSaving(true);

      try {
        if (selectedItem?.id) {
          const updatedPurchaseOrder = await updatePurchaseOrder(selectedItem.id, form);
          await loadPurchaseOrders({ showLoading: false });
          setSelectedId(updatedPurchaseOrder?.id || selectedItem.id);
          if (isFormMode) {
            router.replace(`/purchaseOrder/form?id=${encodeURIComponent(updatedPurchaseOrder?.id || selectedItem.id)}`);
          }
          showToast(
            t("purchaseOrder.toast.updateSuccess", {
              noPo: form.noPo || selectedItem.noPo || "-",
            }),
            "success"
          );
          return;
        }

        const createdPurchaseOrder = await createPurchaseOrder(form);
        await loadPurchaseOrders({ showLoading: false });
        setSelectedId(createdPurchaseOrder?.id || "");
        if (isFormMode && createdPurchaseOrder?.id) {
          router.replace(`/purchaseOrder/form?id=${encodeURIComponent(createdPurchaseOrder.id)}`);
        }
        showToast(
          t("purchaseOrder.toast.createSuccess", {
            noPo: form.noPo || "-",
          }),
          "success"
        );
      } catch (error) {
        if (error instanceof ApiRequestError) {
          const message = error.message || t("purchaseOrder.mutationError");
          setActionErrorMessage(message);
          showToast(message, "error");
          return;
        }

        const message = t("purchaseOrder.mutationError");
        setActionErrorMessage(message);
        showToast(message, "error");
      } finally {
        setIsSaving(false);
      }
    },
    [isFormMode, loadPurchaseOrders, router, showToast, t]
  );

  const executeDeletePurchaseOrder = useCallback(
    async (selectedItem: PurchaseOrderItem) => {
      setActionErrorMessage("");
      setIsDeleting(true);

      try {
        await deletePurchaseOrder(selectedItem.id);
        setSelectedId("");
        await loadPurchaseOrders({ showLoading: false });
        if (isFormMode) {
          router.push("/purchaseOrder");
        }
        showToast(
          t("purchaseOrder.toast.deleteSuccess", {
            noPo: selectedItem.noPo || "-",
          }),
          "success"
        );
      } catch (error) {
        if (error instanceof ApiRequestError) {
          const message = error.message || t("purchaseOrder.mutationError");
          setActionErrorMessage(message);
          showToast(message, "error");
          return;
        }

        const message = t("purchaseOrder.mutationError");
        setActionErrorMessage(message);
        showToast(message, "error");
      } finally {
        setIsDeleting(false);
      }
    },
    [isFormMode, loadPurchaseOrders, router, showToast, t]
  );

  const handleSavePurchaseOrder = useCallback(
    async (form: PurchaseOrderFormState, selectedItem?: PurchaseOrderItem) => {
      if (selectedItem?.id) {
        setPendingConfirmation({
          type: "update",
          form,
          selectedItem,
        });
        return;
      }

      await executeSavePurchaseOrder(form, selectedItem);
    },
    [executeSavePurchaseOrder]
  );

  const handleDeletePurchaseOrder = useCallback((selectedItem: PurchaseOrderItem) => {
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
      await executeSavePurchaseOrder(currentConfirmation.form, currentConfirmation.selectedItem);
      return;
    }

    await executeDeletePurchaseOrder(currentConfirmation.selectedItem);
  }, [executeDeletePurchaseOrder, executeSavePurchaseOrder, pendingConfirmation]);

  const confirmationConfig = useMemo(() => {
    if (!pendingConfirmation) {
      return null;
    }

    if (pendingConfirmation.type === "update") {
      return {
        title: t("purchaseOrder.confirmUpdateTitle"),
        description: t("purchaseOrder.confirmUpdateDescription", {
          noPo: pendingConfirmation.selectedItem.noPo || "-",
        }),
        confirmLabel: t("common.saveChanges"),
        variant: "default" as const,
      };
    }

    return {
      title: t("purchaseOrder.confirmDeleteTitle"),
      description: t("purchaseOrder.confirmDeleteDescription", {
        noPo: pendingConfirmation.selectedItem.noPo || "-",
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
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100 sm:text-2xl">{t("nav.purchaseOrder")}</h1>
          <p className="mt-1 max-w-3xl text-sm text-slate-600 dark:text-slate-300">{t("purchaseOrder.page.description")}</p>
        </section>

        <div className="mt-5 space-y-5">
          {isLoading ? <ApiLoadingState /> : null}

          {!isLoading && errorMessage ? (
            <section className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-200">
              <p>{errorMessage}</p>
              <button
                type="button"
                onClick={() => void loadPurchaseOrders()}
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
                      onClick={() => router.push("/purchaseOrder")}
                      className="rounded-lg border border-sky-300 bg-white px-4 py-2 text-sm font-medium text-sky-700 hover:bg-sky-50 dark:border-sky-800 dark:bg-slate-900 dark:text-sky-200 dark:hover:bg-slate-800"
                    >
                      {t("common.close")}
                    </button>
                  </div>
                  <PurchaseOrderEditForm
                    key={selectedId || "new"}
                    item={selectedRow}
                    customerOptions={customerOptions}
                    invoiceOptions={invoiceOptions}
                    isSaving={isSaving}
                    isDeleting={isDeleting}
                    actionErrorMessage={actionErrorMessage}
                    onSave={handleSavePurchaseOrder}
                    onDelete={handleDeletePurchaseOrder}
                    onNewData={() => {
                      setActionErrorMessage("");
                      setToast(null);
                      setSelectedId("");
                      router.push("/purchaseOrder/form");
                    }}
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
                  <PurchaseOrderTableFilter
                    rows={rows}
                    filter={filter}
                    filteredCount={filteredCount}
                    pagination={pagination}
                    selectedId=""
                    canExport={canExport}
                    resolveCustomerLabel={resolveCustomerLabel}
                    resolveInvoiceLabel={resolveInvoiceLabel}
                    onExportPage={handleOpenExportPage}
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

export default function PurchaseOrderPage() {
  return <PurchaseOrderPageContent mode="list" />;
}
