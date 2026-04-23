"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ApiLoadingState } from "../_components/api-loading-state";
import { AppToast } from "../_components/app-toast";
import { ConfirmationModal } from "../_components/confirmation-modal";
import { useExportAccess } from "../_hooks/use-export-access";
import { ApiRequestError } from "../_lib/api-client";
import { type ServerPaginationMeta } from "../_lib/pagination";
import { useI18n } from "../_i18n/provider";
import { fetchCustomerRows, type CustomerItem } from "../customer/_lib/customer";
import { savePembelianPrefill } from "../pembelian/_lib/pembelian";
import { InvoiceEditForm } from "./_components/invoice-edit-form";
import { PostSaveActionModal } from "./_components/post-save-action-modal";
import { InvoiceTableFilter } from "./_components/invoice-table-filter";
import {
  consumeInvoicePrefill,
  createInvoice,
  defaultInvoiceFilter,
  fetchInvoiceList,
  fetchInvoiceSuratJalanOptions,
  toInvoiceFormStateFromPrefill,
  updateInvoice,
  deleteInvoice,
  type InvoiceFilter,
  type InvoiceFormState,
  type InvoiceItem,
  type InvoiceSuratJalanOption,
} from "./_lib/invoice";

type ToastState = {
  id: number;
  message: string;
  variant: "success" | "error";
};

type PostSaveActionState = {
  actionType: "create" | "update";
  invoice: InvoiceItem;
};

export default function InvoicePage() {
  const { t } = useI18n();
  const router = useRouter();
  const canExport = useExportAccess();
  const [rows, setRows] = useState<InvoiceItem[]>([]);
  const [filter, setFilter] = useState<InvoiceFilter>(defaultInvoiceFilter);
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
  const [customerRows, setCustomerRows] = useState<CustomerItem[]>([]);
  const [suratJalanOptions, setSuratJalanOptions] = useState<InvoiceSuratJalanOption[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [actionErrorMessage, setActionErrorMessage] = useState("");
  const [toast, setToast] = useState<ToastState | null>(null);
  const [postSaveAction, setPostSaveAction] = useState<PostSaveActionState | null>(null);
  const [prefillOnLoad] = useState(() => consumeInvoicePrefill());
  const [initialForm, setInitialForm] = useState<InvoiceFormState | null>(() =>
    prefillOnLoad ? toInvoiceFormStateFromPrefill(prefillOnLoad) : null
  );
  const [initialFormKey, setInitialFormKey] = useState(() => (prefillOnLoad ? Date.now() : 0));
  const [pendingConfirmation, setPendingConfirmation] = useState<
    | {
        type: "update";
        form: InvoiceFormState;
        selectedItem: InvoiceItem;
      }
    | {
        type: "delete";
        selectedItem: InvoiceItem;
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

  const loadInvoices = useCallback(
    async (options: { showLoading?: boolean } = {}) => {
      const { showLoading = true } = options;

      if (showLoading) {
        setIsLoading(true);
      }

      setErrorMessage("");

      try {
        const invoiceResult = await fetchInvoiceList({
          ...filter,
          ...paginationQuery,
        });
        const invoiceRows = invoiceResult.items;
        setRows(invoiceRows);
        setPagination(invoiceResult.pagination);
        setFilteredCount(invoiceResult.totalRows);
        setSelectedId((prevSelectedId) => {
          if (invoiceRows.some((row) => row.id === prevSelectedId)) {
            return prevSelectedId;
          }

          return "";
        });

        return invoiceRows;
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
          setErrorMessage(error.message || t("invoice.apiLoadError"));
          return [];
        }

        setErrorMessage(t("invoice.apiLoadError"));
        return [];
      } finally {
        if (showLoading) {
          setIsLoading(false);
        }
      }
    },
    [filter, paginationQuery, t]
  );

  const loadCustomerOptions = useCallback(async () => {
    try {
      const customers = await fetchCustomerRows();
      setCustomerRows(customers);
    } catch (error) {
      setCustomerRows([]);

      if (error instanceof ApiRequestError) {
        showToast(error.message || t("invoice.customerLoadError"), "error");
      } else {
        showToast(t("invoice.customerLoadError"), "error");
      }
    }
  }, [showToast, t]);

  const loadSuratJalanOptions = useCallback(async () => {
    try {
      const options = await fetchInvoiceSuratJalanOptions();
      setSuratJalanOptions(options);
    } catch (error) {
      setSuratJalanOptions([]);

      if (error instanceof ApiRequestError) {
        showToast(error.message || t("invoice.suratJalanLoadError"), "error");
      } else {
        showToast(t("invoice.suratJalanLoadError"), "error");
      }
    }
  }, [showToast, t]);

  useEffect(() => {
    void loadInvoices();
  }, [loadInvoices]);

  useEffect(() => {
    void Promise.all([loadCustomerOptions(), loadSuratJalanOptions()]);
  }, [loadCustomerOptions, loadSuratJalanOptions]);

  const handleFilterChange = useCallback(
    <K extends keyof InvoiceFilter,>(key: K, value: InvoiceFilter[K]) => {
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
    setFilter(defaultInvoiceFilter);
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

  const customerLabelMap = useMemo(() => {
    const map = new Map<string, string>();

    customerRows.forEach((customer) => {
      const id = String(customer.id || "").trim();
      const nama = String(customer.nama || "").trim();

      if (!id) {
        return;
      }

      map.set(id, nama || id);
    });

    return map;
  }, [customerRows]);

  const resolveCustomerLabel = useCallback(
    (idCustomer: string) => {
      const key = String(idCustomer || "").trim();

      if (!key) {
        return "-";
      }

      return customerLabelMap.get(key) || key;
    },
    [customerLabelMap]
  );

  const customerOptions = useMemo(() => {
    return customerRows.map((customer) => ({
      id: customer.id,
      nama: customer.nama || customer.id,
    }));
  }, [customerRows]);

  const executeSaveInvoice = useCallback(
    async (form: InvoiceFormState, selectedItem?: InvoiceItem) => {
      setActionErrorMessage("");
      setIsSaving(true);

      try {
        if (selectedItem?.id) {
          const updatedInvoice = await updateInvoice(selectedItem.id, form);
          const refreshedRows = await loadInvoices({ showLoading: false });
          const currentUpdatedInvoice = updatedInvoice
            ? refreshedRows.find((row) => row.id === updatedInvoice.id) || updatedInvoice
            : undefined;
          setSelectedId(currentUpdatedInvoice?.id || selectedItem.id);
          if (currentUpdatedInvoice) {
            setPostSaveAction({
              actionType: "update",
              invoice: currentUpdatedInvoice,
            });
          }
          showToast(
            t("invoice.toast.updateSuccess", {
              noInvoice: form.noInvoice || selectedItem.noInvoice || "-",
            }),
            "success"
          );
          return;
        }

        const createdInvoice = await createInvoice(form);
        const refreshedRows = await loadInvoices({ showLoading: false });
        const currentCreatedInvoice = createdInvoice
          ? refreshedRows.find((row) => row.id === createdInvoice.id) || createdInvoice
          : undefined;
        setSelectedId(currentCreatedInvoice?.id || "");
        setInitialForm(null);
        setInitialFormKey(Date.now());
        if (currentCreatedInvoice) {
          setPostSaveAction({
            actionType: "create",
            invoice: currentCreatedInvoice,
          });
        }
        showToast(
          t("invoice.toast.createSuccess", {
            noInvoice: form.noInvoice || "-",
          }),
          "success"
        );
      } catch (error) {
        if (error instanceof ApiRequestError) {
          const message = error.message || t("invoice.mutationError");
          setActionErrorMessage(message);
          showToast(message, "error");
          return;
        }

        const message = t("invoice.mutationError");
        setActionErrorMessage(message);
        showToast(message, "error");
      } finally {
        setIsSaving(false);
      }
    },
    [loadInvoices, showToast, t]
  );

  const executeDeleteInvoice = useCallback(
    async (selectedItem: InvoiceItem) => {
      setActionErrorMessage("");
      setIsDeleting(true);

      try {
        await deleteInvoice(selectedItem.id);
        setSelectedId("");
        await loadInvoices({ showLoading: false });
        setPostSaveAction(null);
        showToast(
          t("invoice.toast.deleteSuccess", {
            noInvoice: selectedItem.noInvoice || "-",
          }),
          "success"
        );
      } catch (error) {
        if (error instanceof ApiRequestError) {
          const message = error.message || t("invoice.mutationError");
          setActionErrorMessage(message);
          showToast(message, "error");
          return;
        }

        const message = t("invoice.mutationError");
        setActionErrorMessage(message);
        showToast(message, "error");
      } finally {
        setIsDeleting(false);
      }
    },
    [loadInvoices, showToast, t]
  );

  const handleSaveInvoice = useCallback(
    async (form: InvoiceFormState, selectedItem?: InvoiceItem) => {
      if (selectedItem?.id) {
        setPendingConfirmation({
          type: "update",
          form,
          selectedItem,
        });
        return;
      }

      await executeSaveInvoice(form, selectedItem);
    },
    [executeSaveInvoice]
  );

  const handleDeleteInvoice = useCallback((selectedItem: InvoiceItem) => {
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
      await executeSaveInvoice(currentConfirmation.form, currentConfirmation.selectedItem);
      return;
    }

    await executeDeleteInvoice(currentConfirmation.selectedItem);
  }, [executeDeleteInvoice, executeSaveInvoice, pendingConfirmation]);

  const confirmationConfig = useMemo(() => {
    if (!pendingConfirmation) {
      return null;
    }

    if (pendingConfirmation.type === "update") {
      return {
        title: t("invoice.confirmUpdateTitle"),
        description: t("invoice.confirmUpdateDescription", {
          noInvoice: pendingConfirmation.selectedItem.noInvoice || "-",
        }),
        confirmLabel: t("common.saveChanges"),
        variant: "default" as const,
      };
    }

    return {
      title: t("invoice.confirmDeleteTitle"),
      description: t("invoice.confirmDeleteDescription", {
        noInvoice: pendingConfirmation.selectedItem.noInvoice || "-",
      }),
      confirmLabel: t("common.delete"),
      variant: "danger" as const,
    };
  }, [pendingConfirmation, t]);

  const postSaveModalConfig = useMemo(() => {
    if (!postSaveAction) {
      return null;
    }

    const isCreate = postSaveAction.actionType === "create";

    return {
      title: isCreate ? t("invoice.postCreateModal.title") : t("invoice.postUpdateModal.title"),
      description: isCreate
        ? t("invoice.postCreateModal.description", {
            noInvoice: postSaveAction.invoice.noInvoice || "-",
            noPo: postSaveAction.invoice.noPo || "-",
          })
        : t("invoice.postUpdateModal.description", {
            noInvoice: postSaveAction.invoice.noInvoice || "-",
            noPo: postSaveAction.invoice.noPo || "-",
          }),
      showCreatePembelianButton: isCreate,
    };
  }, [postSaveAction, t]);

  const handleCreatePembelianFromPostSave = useCallback(() => {
    if (!postSaveAction || postSaveAction.actionType !== "create") {
      return;
    }

    savePembelianPrefill({
      tanggalNota: postSaveAction.invoice.tanggal,
      idInvoice: postSaveAction.invoice.id,
      noInvoice: postSaveAction.invoice.noInvoice,
      ppn: postSaveAction.invoice.isPpn,
      nilaiNota: postSaveAction.invoice.grandTotal,
    });

    setPostSaveAction(null);
    router.push("/pembelian");
  }, [postSaveAction, router]);

  const handleExportInvoice = useCallback((invoiceId: string) => {
    const id = String(invoiceId || "").trim();

    if (!canExport || !id || typeof window === "undefined") {
      return;
    }

    window.open(`/invoice/export/${id}`, "_blank", "noopener,noreferrer");
  }, [canExport]);

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
      ? `/invoice/export?${searchParams.toString()}`
      : "/invoice/export";

    window.open(targetPath, "_blank", "noopener,noreferrer");
  }, [canExport, filter]);

  const showDataSection = !isLoading && (rows.length > 0 || !errorMessage);

  return (
    <>
      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <section className="rounded-2xl border border-sky-100 bg-gradient-to-r from-sky-50 to-white p-4 shadow-sm dark:border-slate-800 dark:from-slate-900 dark:to-slate-950 sm:p-5">
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100 sm:text-2xl">{t("nav.invoice")}</h1>
          <p className="mt-1 max-w-3xl text-sm text-slate-600 dark:text-slate-300">{t("invoice.page.description")}</p>
        </section>

        <div className="mt-5 space-y-5">
          {isLoading ? <ApiLoadingState /> : null}

          {!isLoading && errorMessage ? (
            <section className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-200">
              <p>{errorMessage}</p>
              <button
                type="button"
                onClick={() => void loadInvoices()}
                className="mt-3 rounded-lg border border-red-300 bg-white px-3 py-2 text-xs font-medium text-red-700 hover:bg-red-100 dark:border-red-900 dark:bg-slate-900 dark:text-red-200 dark:hover:bg-red-950/40"
              >
                {t("common.retry")}
              </button>
            </section>
          ) : null}

          {showDataSection ? (
            <>
              <InvoiceTableFilter
                rows={rows}
                filter={filter}
                filteredCount={filteredCount}
                pagination={pagination}
                selectedId={selectedId}
                canExport={canExport}
                resolveCustomerLabel={resolveCustomerLabel}
                onFilterChange={handleFilterChange}
                onResetFilter={handleResetFilter}
                onPageChange={handlePageChange}
                onPageSizeChange={handlePageSizeChange}
                onExportRow={(row) => handleExportInvoice(row.id)}
                onExportPage={handleOpenExportPage}
                onSelectRow={(row) => {
                  setActionErrorMessage("");
                  setToast(null);
                  setPostSaveAction(null);
                  setInitialForm(null);
                  setSelectedId(row.id);
                }}
              />

              <InvoiceEditForm
                key={`${selectedId || "new"}-${initialFormKey}`}
                item={selectedRow}
                initialForm={selectedRow ? undefined : initialForm || undefined}
                customerOptions={customerOptions}
                suratJalanOptions={suratJalanOptions}
                isSaving={isSaving}
                isDeleting={isDeleting}
                actionErrorMessage={actionErrorMessage}
                onSave={handleSaveInvoice}
                onDelete={handleDeleteInvoice}
                onNewData={() => {
                  setActionErrorMessage("");
                  setToast(null);
                  setPostSaveAction(null);
                  setInitialForm(null);
                  setInitialFormKey(Date.now());
                  setSelectedId("");
                }}
              />
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

      <PostSaveActionModal
        isOpen={Boolean(postSaveModalConfig)}
        title={postSaveModalConfig?.title ?? ""}
        description={postSaveModalConfig?.description ?? ""}
        showExportButton={canExport}
        showCreatePembelianButton={Boolean(postSaveModalConfig?.showCreatePembelianButton)}
        exportLabel={t("invoice.postSaveModal.exportButton")}
        createPembelianLabel={t("invoice.postSaveModal.createPembelianButton")}
        closeLabel={t("common.close")}
        onExport={() => handleExportInvoice(postSaveAction?.invoice.id || "")}
        onCreatePembelian={handleCreatePembelianFromPostSave}
        onClose={() => setPostSaveAction(null)}
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
