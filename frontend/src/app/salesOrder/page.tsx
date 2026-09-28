"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ApiLoadingState } from "../_components/api-loading-state";
import { AppToast } from "../_components/app-toast";
import { ConfirmationModal } from "../_components/confirmation-modal";
import { ListViewHeader } from "../_components/list-view-header";
import { useExportAccess } from "../_hooks/use-export-access";
import { requestUnsavedChangesConfirmation } from "../_hooks/use-unsaved-changes-warning";
import { usePersistentListUrl } from "../_hooks/use-persistent-list-url";
import { useI18n } from "../_i18n/provider";
import { ApiRequestError } from "../_lib/api-client";
import { getDocumentValidationWarning } from "../_lib/document-validation-warning";
import {
  buildFormRouteWithReturnPagination,
  buildListRouteWithPagination,
  normalizePaginationQueryState,
  normalizeReturnPaginationQueryState,
  normalizeStringFilterQueryState,
  type ServerPaginationMeta,
} from "../_lib/pagination";
import {
  defaultInvoiceFilter,
  fetchInvoiceExportRows,
  saveInvoicePrefill,
  type InvoicePrefillPayload,
} from "../invoice/_lib/invoice";
import {
  fetchSuratJalanByNoPo,
  saveSuratJalanPrefill,
  type SuratJalanPrefillPayload,
} from "../suratJalan/_lib/surat-jalan";
import { PurchaseOrderEditForm } from "./_components/purchase-order-edit-form";
import { SalesOrderFulfillmentSummary } from "./_components/sales-order-fulfillment-summary";
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
type PurchaseOrderShortcutTarget = "suratJalan" | "invoice";

type PurchaseOrderShortcutCheck = {
  suratJalanCount: number;
  invoiceCount: number;
};

type PurchaseOrderShortcutConfirmation = PurchaseOrderShortcutCheck & {
  target: PurchaseOrderShortcutTarget;
  item: PurchaseOrderItem;
};

type PurchaseOrderPageContentProps = {
  mode?: PurchaseOrderPageMode;
  itemId?: string;
};

const defaultPurchaseOrderPaginationQuery = {
  page: 1,
  limit: 10,
};
const defaultPurchaseOrderSort = "updatedDesc";

function buildSuratJalanPrefillFromPurchaseOrder(
  item: PurchaseOrderItem
): SuratJalanPrefillPayload {
  return {
    noPo: item.noPo,
    tanggal: item.tanggalPo,
    idCustomer: item.namaCustomer,
    barang: item.barang.map((barang) => ({
      nama: barang.namaBarang,
      spesifikasi: barang.spesifikasi,
      kodeDepartemen: "",
      jumlah: barang.kuantitas,
      unit: barang.unit,
    })),
  };
}

function buildInvoicePrefillFromPurchaseOrder(item: PurchaseOrderItem): InvoicePrefillPayload {
  return {
    tanggal: item.tanggalPo,
    noPo: item.noPo,
    noPoList: [item.noPo].filter(Boolean),
    noSuratJalan: [],
    idCustomer: item.namaCustomer,
    barang: item.barang.map((barang) => ({
      namaBarang: barang.namaBarang,
      spesifikasi: barang.spesifikasi,
      kuantitas: barang.kuantitas,
      unit: barang.unit,
      hargaSatuan: barang.hargaSatuan,
      noPoManual: item.noPo,
      sources: [],
    })),
    isPpn: true,
    ppnRate: 11,
  };
}

export function PurchaseOrderPageContent({ mode = "list", itemId = "" }: PurchaseOrderPageContentProps) {
  const { t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isFormMode = mode === "form";
  const canExport = useExportAccess();
  const initialPaginationQuery = useMemo(
    () =>
      normalizePaginationQueryState(
        {
          page: searchParams.get("page"),
          limit: searchParams.get("limit"),
        },
        defaultPurchaseOrderPaginationQuery
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
        defaultPurchaseOrderPaginationQuery
      ),
    [searchParams]
  );
  const initialFilterQuery = useMemo(() => normalizeStringFilterQueryState(searchParams, defaultPurchaseOrderFilter), [searchParams]);
  const initialSortValue = String(searchParams.get("sort") || defaultPurchaseOrderSort);
  const returnListState = useMemo(() => ({ ...initialFilterQuery, sort: initialSortValue }), [initialFilterQuery, initialSortValue]);
  const returnListPath = useMemo(
    () => buildListRouteWithPagination("/salesOrder", returnPaginationQuery, returnListState),
    [returnListState, returnPaginationQuery]
  );
  const [rows, setRows] = useState<PurchaseOrderItem[]>([]);
  const [filter, setFilter] = useState<PurchaseOrderFilter>(initialFilterQuery);
  const [paginationQuery, setPaginationQuery] = useState(() =>
    isFormMode ? defaultPurchaseOrderPaginationQuery : initialPaginationQuery
  );
  const [pagination, setPagination] = useState<ServerPaginationMeta>({
    page: paginationQuery.page,
    limit: paginationQuery.limit,
    totalItems: 0,
    totalPages: 1,
  });
  const [filteredCount, setFilteredCount] = useState(0);
  const [sortValue, setSortValue] = useState(initialSortValue);
  const [customerOptions, setCustomerOptions] = useState<PurchaseOrderCustomerOption[]>([]);
  const [invoiceOptions, setInvoiceOptions] = useState<PurchaseOrderInvoiceOption[]>([]);
  const [selectedId, setSelectedId] = useState(itemId);
  const [formVersion, setFormVersion] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isShortcutLoading, setIsShortcutLoading] = useState(false);
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
  const [pendingValidationWarning, setPendingValidationWarning] = useState<{
    form: PurchaseOrderFormState;
    selectedItem: PurchaseOrderItem;
    message: string;
  } | null>(null);

  usePersistentListUrl({ enabled: !isFormMode, basePath: "/salesOrder", defaultFilter: defaultPurchaseOrderFilter, defaultPagination: defaultPurchaseOrderPaginationQuery, defaultSort: defaultPurchaseOrderSort, filter, pagination: paginationQuery, sort: sortValue, setFilter, setPagination: setPaginationQuery, setSort: setSortValue });
  const [pendingShortcutConfirmation, setPendingShortcutConfirmation] =
    useState<PurchaseOrderShortcutConfirmation | null>(null);

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
      ? `/salesOrder/export?${searchParams.toString()}`
      : "/salesOrder/export";

    window.open(targetPath, "_blank", "noopener,noreferrer");
  }, [canExport, filter]);

  const navigateToForm = useCallback(
    (id?: string) => {
      const normalizedId = String(id || "").trim();
      router.push(
        buildFormRouteWithReturnPagination(
          "/salesOrder/form",
          normalizedId,
          paginationQuery,
          { ...filter, sort: sortValue }
        )
      );
    },
    [filter, paginationQuery, router, sortValue]
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

  const sortedRows = useMemo(() => {
    return [...rows].sort((left, right) => {
      if (sortValue === "updatedAsc") {
        return left.updatedAt.localeCompare(right.updatedAt);
      }

      if (sortValue === "dateDesc") {
        return right.tanggalPo.localeCompare(left.tanggalPo);
      }

      if (sortValue === "dateAsc") {
        return left.tanggalPo.localeCompare(right.tanggalPo);
      }

      if (sortValue === "nameAsc") {
        return resolveCustomerLabel(left.namaCustomer).localeCompare(resolveCustomerLabel(right.namaCustomer));
      }

      if (sortValue === "nameDesc") {
        return resolveCustomerLabel(right.namaCustomer).localeCompare(resolveCustomerLabel(left.namaCustomer));
      }

      if (sortValue === "amountDesc") {
        return right.nominalPo - left.nominalPo;
      }

      if (sortValue === "amountAsc") {
        return left.nominalPo - right.nominalPo;
      }

      return right.updatedAt.localeCompare(left.updatedAt);
    });
  }, [resolveCustomerLabel, rows, sortValue]);

  const executeSavePurchaseOrder = useCallback(
    async (
      form: PurchaseOrderFormState,
      selectedItem?: PurchaseOrderItem,
      continueOnValidationWarning = false
    ) => {
      setActionErrorMessage("");
      setIsSaving(true);

      try {
        if (selectedItem?.id) {
          const updatedPurchaseOrder = await updatePurchaseOrder(selectedItem.id, form, {
            continueOnValidationWarning,
          });
          await loadPurchaseOrders({ showLoading: false });
          setSelectedId(updatedPurchaseOrder?.id || selectedItem.id);
          setFormVersion((currentVersion) => currentVersion + 1);
          if (isFormMode) {
            router.replace(
              buildFormRouteWithReturnPagination(
                "/salesOrder/form",
                updatedPurchaseOrder?.id || selectedItem.id,
                returnPaginationQuery,
                returnListState
              )
            );
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
          router.replace(
            buildFormRouteWithReturnPagination(
              "/salesOrder/form",
              createdPurchaseOrder.id,
              returnPaginationQuery,
              returnListState
            )
          );
        }
        showToast(
          t("purchaseOrder.toast.createSuccess", {
            noPo: form.noPo || "-",
          }),
          "success"
        );
      } catch (error) {
        const validationWarning = getDocumentValidationWarning(error);
        if (validationWarning && selectedItem?.id && !continueOnValidationWarning) {
          setPendingValidationWarning({ form, selectedItem, message: validationWarning.message });
          return;
        }

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
    [isFormMode, loadPurchaseOrders, returnListState, returnPaginationQuery, router, showToast, t]
  );

  const handleContinueAfterValidationWarning = useCallback(async () => {
    if (!pendingValidationWarning) return;
    const currentWarning = pendingValidationWarning;
    setPendingValidationWarning(null);
    await executeSavePurchaseOrder(currentWarning.form, currentWarning.selectedItem, true);
  }, [executeSavePurchaseOrder, pendingValidationWarning]);

  const executeDeletePurchaseOrder = useCallback(
    async (selectedItem: PurchaseOrderItem) => {
      setActionErrorMessage("");
      setIsDeleting(true);

      try {
        await deletePurchaseOrder(selectedItem.id);
        setSelectedId("");
        await loadPurchaseOrders({ showLoading: false });
        if (isFormMode) {
          router.push(returnListPath);
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
    [isFormMode, loadPurchaseOrders, returnListPath, router, showToast, t]
  );

  const executePurchaseOrderShortcut = useCallback(
    (target: PurchaseOrderShortcutTarget, item: PurchaseOrderItem) => {
      if (target === "suratJalan") {
        saveSuratJalanPrefill(buildSuratJalanPrefillFromPurchaseOrder(item));
        router.push("/suratJalan/form");
        return;
      }

      saveInvoicePrefill(buildInvoicePrefillFromPurchaseOrder(item));
      router.push("/invoice/form");
    },
    [router]
  );

  const checkPurchaseOrderLinkedData = useCallback(
    async (noPo: string): Promise<PurchaseOrderShortcutCheck> => {
      const normalizedNoPo = String(noPo || "").trim();

      if (!normalizedNoPo) {
        return {
          suratJalanCount: 0,
          invoiceCount: 0,
        };
      }

      const [suratJalanRows, invoiceRows] = await Promise.all([
        fetchSuratJalanByNoPo(normalizedNoPo),
        fetchInvoiceExportRows({
          ...defaultInvoiceFilter,
          noPo: normalizedNoPo,
        }),
      ]);
      const normalizedNoPoKey = normalizedNoPo.toLowerCase();
      const exactInvoiceRows = invoiceRows.filter((invoice) =>
        invoice.noPoList.some(
          (invoiceNoPo) => String(invoiceNoPo || "").trim().toLowerCase() === normalizedNoPoKey
        )
      );

      return {
        suratJalanCount: suratJalanRows.length,
        invoiceCount: exactInvoiceRows.length,
      };
    },
    []
  );

  const handlePurchaseOrderShortcut = useCallback(
    async (target: PurchaseOrderShortcutTarget, item: PurchaseOrderItem) => {
      if (!(await requestUnsavedChangesConfirmation(t("common.unsavedChangesWarning")))) {
        return;
      }

      const noPo = String(item.noPo || "").trim();

      if (!noPo) {
        showToast(t("purchaseOrder.shortcut.missingNoPo"), "error");
        return;
      }

      if (!Array.isArray(item.barang) || item.barang.length === 0) {
        showToast(t("purchaseOrder.shortcut.emptyItems"), "error");
        return;
      }

      setActionErrorMessage("");
      setIsShortcutLoading(true);

      try {
        const linkedData = await checkPurchaseOrderLinkedData(noPo);

        if (linkedData.suratJalanCount > 0 || linkedData.invoiceCount > 0) {
          setPendingShortcutConfirmation({
            target,
            item,
            ...linkedData,
          });
          return;
        }

        executePurchaseOrderShortcut(target, item);
      } catch (error) {
        if (error instanceof ApiRequestError) {
          showToast(error.message || t("purchaseOrder.shortcut.checkError"), "error");
          return;
        }

        showToast(t("purchaseOrder.shortcut.checkError"), "error");
      } finally {
        setIsShortcutLoading(false);
      }
    },
    [checkPurchaseOrderLinkedData, executePurchaseOrderShortcut, showToast, t]
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

  const handleConfirmShortcut = useCallback(() => {
    if (!pendingShortcutConfirmation) {
      return;
    }

    const currentShortcut = pendingShortcutConfirmation;
    setPendingShortcutConfirmation(null);
    executePurchaseOrderShortcut(currentShortcut.target, currentShortcut.item);
  }, [executePurchaseOrderShortcut, pendingShortcutConfirmation]);

  const confirmationConfig = useMemo(() => {
    if (!pendingConfirmation) {
      return null;
    }

    if (pendingConfirmation.type === "update") {
      const previousStatus = pendingConfirmation.selectedItem.workflow?.status || "toDeliver";
      const nextStatus = pendingConfirmation.form.workflowStatus;

      if (previousStatus !== nextStatus) {
        return {
          title: t("purchaseOrder.confirmStatusUpdateTitle"),
          description: t("purchaseOrder.confirmStatusUpdateDescription", {
            noPo: pendingConfirmation.selectedItem.noPo || "-",
            previousStatus: t(`salesOrderDashboard.status.${previousStatus}`),
            nextStatus: t(`salesOrderDashboard.status.${nextStatus}`),
          }),
          confirmLabel: t("common.saveChanges"),
          variant: "warning" as const,
        };
      }

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

  const shortcutConfirmationConfig = useMemo(() => {
    if (!pendingShortcutConfirmation) {
      return null;
    }

    return {
      title:
        pendingShortcutConfirmation.target === "suratJalan"
          ? t("purchaseOrder.shortcut.confirmSuratJalanTitle")
          : t("purchaseOrder.shortcut.confirmInvoiceTitle"),
      description: t("purchaseOrder.shortcut.existingDataDescription", {
        noPo: pendingShortcutConfirmation.item.noPo || "-",
        suratJalanCount: pendingShortcutConfirmation.suratJalanCount,
        invoiceCount: pendingShortcutConfirmation.invoiceCount,
      }),
      confirmLabel:
        pendingShortcutConfirmation.target === "suratJalan"
          ? t("purchaseOrder.shortcut.createSuratJalan")
          : t("purchaseOrder.shortcut.createInvoice"),
    };
  }, [pendingShortcutConfirmation, t]);

  const showDataSection = isFormMode
    ? !isLoading && !errorMessage
    : !isLoading && (rows.length > 0 || !errorMessage);

  return (
    <>
      <main className="erp-page">
        <ListViewHeader
          title={t("nav.purchaseOrder")}
          addLabel={t("common.addPageData", { page: t("nav.purchaseOrder") })}
          onAdd={isFormMode ? undefined : () => navigateToForm()}
        />

        <div className="mt-3 space-y-3">
          {isLoading ? <ApiLoadingState /> : null}

          {!isLoading && errorMessage ? (
            <section className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-200">
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
                  {selectedRow ? <SalesOrderFulfillmentSummary item={selectedRow} /> : null}
                  <PurchaseOrderEditForm
                    key={`${selectedId || "new"}-${formVersion}`}
                    item={selectedRow}
                    customerOptions={customerOptions}
                    invoiceOptions={invoiceOptions}
                    isSaving={isSaving}
                    isDeleting={isDeleting}
                    isShortcutLoading={isShortcutLoading}
                    actionErrorMessage={actionErrorMessage}
                    onSave={handleSavePurchaseOrder}
                    onNewData={() => {
                      setActionErrorMessage("");
                      setSelectedId("");
                      router.replace(
                        buildFormRouteWithReturnPagination(
                          "/salesOrder/form",
                          "",
                          returnPaginationQuery,
                          returnListState
                        )
                      );
                    }}
                    onDelete={handleDeletePurchaseOrder}
                    onCreateSuratJalan={(item) =>
                      handlePurchaseOrderShortcut("suratJalan", item)
                    }
                    onCreateInvoice={(item) =>
                      handlePurchaseOrderShortcut("invoice", item)
                    }
                    onPrint={(item) => window.open(`/salesOrder/export/${item.id}`, "_blank", "noopener,noreferrer")}
                  />
                </>
              ) : (
                <>
                  <PurchaseOrderTableFilter
                    rows={sortedRows}
                    filter={filter}
                    filteredCount={filteredCount}
                    pagination={pagination}
                    selectedId=""
                    canExport={canExport}
                    sortValue={sortValue}
                    onSortChange={setSortValue}
                    sortOptions={[
                      { value: "updatedDesc", label: t("common.sort.updatedDesc") },
                      { value: "updatedAsc", label: t("common.sort.updatedAsc") },
                      { value: "dateDesc", label: t("common.sort.dateDesc") },
                      { value: "dateAsc", label: t("common.sort.dateAsc") },
                      { value: "nameAsc", label: t("common.sort.nameAsc") },
                      { value: "nameDesc", label: t("common.sort.nameDesc") },
                      { value: "amountDesc", label: t("common.sort.amountDesc") },
                      { value: "amountAsc", label: t("common.sort.amountAsc") },
                    ]}
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

      <ConfirmationModal
        isOpen={Boolean(pendingValidationWarning)}
        title={t("documentValidation.warningTitle")}
        description={t("documentValidation.warningDescription", {
          message: pendingValidationWarning?.message || "-",
        })}
        confirmLabel={t("documentValidation.continue")}
        cancelLabel={t("common.cancel")}
        variant="warning"
        isLoading={isSaving}
        onCancel={() => setPendingValidationWarning(null)}
        onConfirm={() => void handleContinueAfterValidationWarning()}
      />

      <ConfirmationModal
        isOpen={Boolean(shortcutConfirmationConfig)}
        title={shortcutConfirmationConfig?.title ?? ""}
        description={shortcutConfirmationConfig?.description ?? ""}
        confirmLabel={shortcutConfirmationConfig?.confirmLabel ?? ""}
        cancelLabel={t("common.cancel")}
        variant="default"
        isLoading={false}
        onCancel={() => setPendingShortcutConfirmation(null)}
        onConfirm={handleConfirmShortcut}
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
