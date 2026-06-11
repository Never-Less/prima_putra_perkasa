"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ApiLoadingState } from "../../_components/api-loading-state";
import { AppToast } from "../../_components/app-toast";
import { ConfirmationModal } from "../../_components/confirmation-modal";
import { buildInvoicedSuratJalanNumberSet } from "../../_lib/surat-jalan-invoice-status";
import {
  buildSuratJalanInvoiceSpesifikasi,
  fetchInvoiceRows,
  saveInvoicePrefill,
  type InvoicePrefillPayload,
} from "../../invoice/_lib/invoice";
import { useExportAccess } from "../../_hooks/use-export-access";
import { ApiRequestError } from "../../_lib/api-client";
import { type ServerPaginationMeta } from "../../_lib/pagination";
import { useI18n } from "../../_i18n/provider";
import { fetchCustomerRows, type CustomerItem } from "../../customer/_lib/customer";
import {
  createSuratJalan,
  defaultSuratJalanFilter,
  deleteSuratJalan,
  fetchSuratJalanById,
  fetchSuratJalanList,
  fetchSuratJalanNoPoOptions,
  updateSuratJalan,
  type SuratJalanFilter,
  type SuratJalanFormState,
  type SuratJalanItem,
  type SuratJalanNoPoOption,
} from "../_lib/surat-jalan";
import { PostCreateActionModal } from "./post-create-action-modal";
import { SuratJalanEditForm } from "./surat-jalan-edit-form";
import { SuratJalanTableFilter } from "./surat-jalan-table-filter";

type ToastState = {
  id: number;
  message: string;
  variant: "success" | "error";
};

type PostCreateActionState = {
  actionType: "create" | "update";
  createdItem: SuratJalanItem;
  invoicePrefill: InvoicePrefillPayload;
};

type FormPreviewStylePageMode = "list" | "form";

type FormPreviewStylePageProps = {
  mode?: FormPreviewStylePageMode;
  itemId?: string;
};

export function FormPreviewStylePage({ mode = "list", itemId = "" }: FormPreviewStylePageProps) {
  const { t } = useI18n();
  const router = useRouter();
  const isFormMode = mode === "form";
  const canExport = useExportAccess();
  const [rows, setRows] = useState<SuratJalanItem[]>([]);
  const [filter, setFilter] = useState<SuratJalanFilter>(defaultSuratJalanFilter);
  const [paginationQuery, setPaginationQuery] = useState({
    page: 1,
    limit: 5,
  });
  const [pagination, setPagination] = useState<ServerPaginationMeta>({
    page: 1,
    limit: 5,
    totalItems: 0,
    totalPages: 1,
  });
  const [filteredCount, setFilteredCount] = useState(0);
  const [customerRows, setCustomerRows] = useState<CustomerItem[]>([]);
  const [noPoOptionRows, setNoPoOptionRows] = useState<SuratJalanNoPoOption[]>([]);
  const [invoicedSuratJalanNumbers, setInvoicedSuratJalanNumbers] = useState<Set<string>>(
    () => new Set()
  );
  const [selectedId, setSelectedId] = useState(itemId);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [actionErrorMessage, setActionErrorMessage] = useState("");
  const [toast, setToast] = useState<ToastState | null>(null);
  const [postCreateAction, setPostCreateAction] = useState<PostCreateActionState | null>(null);
  const [pendingConfirmation, setPendingConfirmation] = useState<
    | {
        type: "update";
        form: SuratJalanFormState;
        selectedItem: SuratJalanItem;
      }
    | {
        type: "delete";
        selectedItem: SuratJalanItem;
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

  const loadSuratJalanData = useCallback(
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

          const suratJalan = await fetchSuratJalanById(itemId);
          const suratJalanRows = suratJalan ? [suratJalan] : [];

          setRows(suratJalanRows);
          setPagination({
            page: 1,
            limit: 1,
            totalItems: suratJalanRows.length,
            totalPages: 1,
          });
          setFilteredCount(suratJalanRows.length);
          setSelectedId(suratJalan?.id || itemId);
          return suratJalanRows;
        }

        const suratJalanResult = await fetchSuratJalanList({
          ...filter,
          ...paginationQuery,
        });
        const suratJalanRows = suratJalanResult.items;
        setRows(suratJalanRows);
        setPagination(suratJalanResult.pagination);
        setFilteredCount(suratJalanResult.totalRows);
        setSelectedId((prevSelectedId) => {
          if (suratJalanRows.some((row) => row.id === prevSelectedId)) {
            return prevSelectedId;
          }

          return "";
        });

        return suratJalanRows;
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
          setErrorMessage(error.message || t("suratJalan.apiLoadError"));
        } else {
          setErrorMessage(t("suratJalan.apiLoadError"));
        }

        return [];
      } finally {
        if (showLoading) {
          setIsLoading(false);
        }
      }
    },
    [filter, isFormMode, itemId, paginationQuery, t]
  );

  const loadCustomerOptions = useCallback(async () => {
    try {
      const customers = await fetchCustomerRows();
      setCustomerRows(customers);
    } catch (error) {
      setCustomerRows([]);

      if (error instanceof ApiRequestError) {
        showToast(error.message || t("suratJalan.customerLoadError"), "error");
      } else {
        showToast(t("suratJalan.customerLoadError"), "error");
      }
    }
  }, [showToast, t]);

  const loadNoPoOptions = useCallback(async () => {
    try {
      const options = await fetchSuratJalanNoPoOptions();
      setNoPoOptionRows(options);
    } catch (error) {
      setNoPoOptionRows([]);

      if (error instanceof ApiRequestError) {
        showToast(error.message || t("suratJalan.apiLoadError"), "error");
      } else {
        showToast(t("suratJalan.apiLoadError"), "error");
      }
    }
  }, [showToast, t]);

  const loadInvoiceStatus = useCallback(async () => {
    try {
      const invoices = await fetchInvoiceRows();
      setInvoicedSuratJalanNumbers(buildInvoicedSuratJalanNumberSet(invoices));
    } catch {
      setInvoicedSuratJalanNumbers(new Set());
    }
  }, []);

  useEffect(() => {
    void loadSuratJalanData();
  }, [loadSuratJalanData]);

  useEffect(() => {
    void Promise.all([loadCustomerOptions(), loadNoPoOptions(), loadInvoiceStatus()]);
  }, [loadCustomerOptions, loadInvoiceStatus, loadNoPoOptions]);

  const handleFilterChange = useCallback(
    <K extends keyof SuratJalanFilter,>(key: K, value: SuratJalanFilter[K]) => {
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
    setFilter(defaultSuratJalanFilter);
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
  const noPoOptions = useMemo(() => {
    return noPoOptionRows.map((row) => row.noPo);
  }, [noPoOptionRows]);

  const navigateToForm = useCallback(
    (id?: string) => {
      const normalizedId = String(id || "").trim();
      router.push(
        normalizedId ? `/suratJalan/form?id=${encodeURIComponent(normalizedId)}` : "/suratJalan/form"
      );
    },
    [router]
  );

  const handleExportSuratJalanByNoPo = useCallback((rawNoPo: string) => {
    const noPo = String(rawNoPo || "").trim();

    if (!canExport || !noPo || typeof window === "undefined") {
      return;
    }

    const searchParams = new URLSearchParams({ noPo });
    window.open(
      `/suratJalan/export/no-po?${searchParams.toString()}`,
      "_blank",
      "noopener,noreferrer"
    );
  }, [canExport]);

  const noPoCustomerMap = useMemo(() => {
    const map: Record<string, string> = {};

    noPoOptionRows.forEach((row) => {
      const noPo = String(row.noPo || "").trim();
      const idCustomer = String(row.idCustomer || "").trim();

      if (!noPo || !idCustomer || map[noPo]) {
        return;
      }

      map[noPo] = idCustomer;
    });

    return map;
  }, [noPoOptionRows]);

  const buildInvoicePrefillFromNoPo = useCallback(
    (allRows: SuratJalanItem[], createdItem: SuratJalanItem): InvoicePrefillPayload => {
      const sameNoPoRows = allRows.filter((row) => row.noPo === createdItem.noPo);
      const sourceRows = sameNoPoRows.length > 0 ? sameNoPoRows : [createdItem];
      const noSuratJalanSet = new Set<string>();
      const barangMap = new Map<
        string,
        {
          namaBarang: string;
          spesifikasi: string;
          kuantitas: number;
          unit: string;
        }
      >();

      sourceRows.forEach((row) => {
        const noSuratJalan = String(row.noSuratJalan || "").trim();

        if (noSuratJalan) {
          noSuratJalanSet.add(noSuratJalan);
        }

        row.barang.forEach((barang) => {
          const nama = String(barang.nama || "").trim();
          const spesifikasi = buildSuratJalanInvoiceSpesifikasi(barang.spesifikasi, barang.kodeDepartemen);
          const unit = String(barang.unit || "").trim();

          if (!nama) {
            return;
          }

          const identityKey = `${nama.toLowerCase()}::${spesifikasi.toLowerCase()}::${unit.toLowerCase()}`;
          const existingItem = barangMap.get(identityKey);

          if (existingItem) {
            existingItem.kuantitas += Number(barang.jumlah || 0);
            return;
          }

          barangMap.set(identityKey, {
            namaBarang: nama,
            spesifikasi,
            kuantitas: Number(barang.jumlah || 0),
            unit,
          });
        });
      });

      const barang = Array.from(barangMap.values())
        .filter((item) => item.kuantitas > 0);

      return {
        tanggal: createdItem.tanggal,
        noPo: createdItem.noPo,
        noSuratJalan: Array.from(noSuratJalanSet.values()),
        idCustomer: createdItem.idCustomer,
        barang: barang,
        isPpn: true,
        ppnRate: 11,
      };
    },
    []
  );

  const executeSaveSuratJalan = useCallback(
    async (form: SuratJalanFormState, selectedItem?: SuratJalanItem) => {
      setActionErrorMessage("");
      setIsSaving(true);

      try {
        if (selectedItem?.id) {
          const updatedItem = await updateSuratJalan(selectedItem.id, form);
          const refreshedRows = await loadSuratJalanData({ showLoading: false });
          const currentUpdatedItem = updatedItem
            ? refreshedRows.find((row) => row.id === updatedItem.id) || updatedItem
            : undefined;
          setSelectedId(currentUpdatedItem?.id || selectedItem.id);
          if (isFormMode) {
            router.replace(`/suratJalan/form?id=${encodeURIComponent(currentUpdatedItem?.id || selectedItem.id)}`);
          }
          if (currentUpdatedItem) {
            setPostCreateAction({
              actionType: "update",
              createdItem: currentUpdatedItem,
              invoicePrefill: buildInvoicePrefillFromNoPo(refreshedRows, currentUpdatedItem),
            });
          }
          showToast(
            t("suratJalan.toast.updateSuccess", {
              noSuratJalan: form.noSuratJalan || selectedItem.noSuratJalan || "-",
            }),
            "success"
          );
          return;
        }

        const createdItem = await createSuratJalan(form);
        const refreshedRows = await loadSuratJalanData({ showLoading: false });
        const currentCreatedItem = createdItem
          ? refreshedRows.find((row) => row.id === createdItem.id) || createdItem
          : undefined;
        setSelectedId(currentCreatedItem?.id || "");
        if (isFormMode && currentCreatedItem?.id) {
          router.replace(`/suratJalan/form?id=${encodeURIComponent(currentCreatedItem.id)}`);
        }
        if (currentCreatedItem) {
          setPostCreateAction({
            actionType: "create",
            createdItem: currentCreatedItem,
            invoicePrefill: buildInvoicePrefillFromNoPo(refreshedRows, currentCreatedItem),
          });
        }
        showToast(
          t("suratJalan.toast.createSuccess", {
            noSuratJalan: form.noSuratJalan || "-",
          }),
          "success"
        );
      } catch (error) {
        if (error instanceof ApiRequestError) {
          const message = error.message || t("suratJalan.mutationError");
          setActionErrorMessage(message);
          showToast(message, "error");
          return;
        }

        const message = t("suratJalan.mutationError");
        setActionErrorMessage(message);
        showToast(message, "error");
      } finally {
        setIsSaving(false);
      }
    },
    [buildInvoicePrefillFromNoPo, isFormMode, loadSuratJalanData, router, showToast, t]
  );

  const executeDeleteSuratJalan = useCallback(
    async (selectedItem: SuratJalanItem) => {
      setActionErrorMessage("");
      setIsDeleting(true);

      try {
        await deleteSuratJalan(selectedItem.id);
        setSelectedId("");
        await loadSuratJalanData({ showLoading: false });
        setPostCreateAction(null);
        if (isFormMode) {
          router.push("/suratJalan");
        }
        showToast(
          t("suratJalan.toast.deleteSuccess", {
            noSuratJalan: selectedItem.noSuratJalan || "-",
          }),
          "success"
        );
      } catch (error) {
        if (error instanceof ApiRequestError) {
          const message = error.message || t("suratJalan.mutationError");
          setActionErrorMessage(message);
          showToast(message, "error");
          return;
        }

        const message = t("suratJalan.mutationError");
        setActionErrorMessage(message);
        showToast(message, "error");
      } finally {
        setIsDeleting(false);
      }
    },
    [isFormMode, loadSuratJalanData, router, showToast, t]
  );

  const handleSaveSuratJalan = useCallback(
    async (form: SuratJalanFormState, selectedItem?: SuratJalanItem) => {
      if (selectedItem?.id) {
        setPendingConfirmation({
          type: "update",
          form,
          selectedItem,
        });
        return;
      }

      await executeSaveSuratJalan(form, selectedItem);
    },
    [executeSaveSuratJalan]
  );

  const handleDeleteSuratJalan = useCallback((selectedItem: SuratJalanItem) => {
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
      await executeSaveSuratJalan(currentConfirmation.form, currentConfirmation.selectedItem);
      return;
    }

    await executeDeleteSuratJalan(currentConfirmation.selectedItem);
  }, [executeDeleteSuratJalan, executeSaveSuratJalan, pendingConfirmation]);

  const confirmationConfig = useMemo(() => {
    if (!pendingConfirmation) {
      return null;
    }

    if (pendingConfirmation.type === "update") {
      return {
        title: t("suratJalan.confirmUpdateTitle"),
        description: t("suratJalan.confirmUpdateDescription", {
          noSuratJalan: pendingConfirmation.selectedItem.noSuratJalan || "-",
        }),
        confirmLabel: t("common.saveChanges"),
        variant: "default" as const,
      };
    }

    return {
      title: t("suratJalan.confirmDeleteTitle"),
      description: t("suratJalan.confirmDeleteDescription", {
        noSuratJalan: pendingConfirmation.selectedItem.noSuratJalan || "-",
      }),
      confirmLabel: t("common.delete"),
      variant: "danger" as const,
    };
  }, [pendingConfirmation, t]);

  const postCreateModalConfig = useMemo(() => {
    if (!postCreateAction) {
      return null;
    }

    const isNonPartial = postCreateAction.createdItem.tipe === "non partial";
    const messagePrefix =
      postCreateAction.actionType === "update"
        ? "suratJalan.postUpdateModal"
        : "suratJalan.postCreateModal";

    return {
      title: isNonPartial
        ? t(`${messagePrefix}.nonPartialTitle`)
        : t(`${messagePrefix}.partialTitle`),
      description: isNonPartial
        ? t(`${messagePrefix}.nonPartialDescription`, {
            noSuratJalan: postCreateAction.createdItem.noSuratJalan || "-",
            noPo: postCreateAction.createdItem.noPo || "-",
          })
        : t(`${messagePrefix}.partialDescription`, {
            noSuratJalan: postCreateAction.createdItem.noSuratJalan || "-",
            noPo: postCreateAction.createdItem.noPo || "-",
          }),
      showCreateInvoiceButton: isNonPartial,
    };
  }, [postCreateAction, t]);

  const handleCreateInvoiceFromPostCreate = useCallback(() => {
    if (!postCreateAction?.invoicePrefill) {
      return;
    }

    saveInvoicePrefill(postCreateAction.invoicePrefill);
    setPostCreateAction(null);
    router.push("/invoice/form");
  }, [postCreateAction, router]);

  const handleExportSuratJalan = useCallback((suratJalanId: string) => {
    const id = String(suratJalanId || "").trim();

    if (!canExport || !id || typeof window === "undefined") {
      return;
    }

    window.open(`/suratJalan/export/${id}`, "_blank", "noopener,noreferrer");
  }, [canExport]);

  const showDataSection = isFormMode
    ? !isLoading && !errorMessage
    : !isLoading && (rows.length > 0 || !errorMessage);

  return (
    <>
      <div className="space-y-5">
        {isLoading ? <ApiLoadingState /> : null}

        {!isLoading && errorMessage ? (
          <section className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-200">
            <p>{errorMessage}</p>
            <button
              type="button"
              onClick={() => void loadSuratJalanData()}
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
                    onClick={() => router.push("/suratJalan")}
                    className="rounded-lg border border-sky-300 bg-white px-4 py-2 text-sm font-medium text-sky-700 hover:bg-sky-50 dark:border-sky-800 dark:bg-slate-900 dark:text-sky-200 dark:hover:bg-slate-800"
                  >
                    {t("common.close")}
                  </button>
                </div>
                <SuratJalanEditForm
                  key={selectedId || "new"}
                  item={selectedRow}
                  customerOptions={customerOptions}
                  noPoOptions={noPoOptions}
                  noPoCustomerMap={noPoCustomerMap}
                  isSaving={isSaving}
                  isDeleting={isDeleting}
                  actionErrorMessage={actionErrorMessage}
                  onSave={handleSaveSuratJalan}
                  onDelete={handleDeleteSuratJalan}
                  title={t("suratJalan.form.title")}
                  description={t("suratJalan.form.description")}
                  showPreview={true}
                  colorTone="sky"
                  formStyle="soft"
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
                <SuratJalanTableFilter
                  rows={rows}
                  filter={filter}
                  filteredCount={filteredCount}
                  pagination={pagination}
                  selectedId=""
                  canExport={canExport}
                  invoicedSuratJalanNumbers={invoicedSuratJalanNumbers}
                  onFilterChange={handleFilterChange}
                  onResetFilter={handleResetFilter}
                  onPageChange={handlePageChange}
                  onPageSizeChange={handlePageSizeChange}
                  onSelectRow={(row) => {
                    setPostCreateAction(null);
                    navigateToForm(row.id);
                  }}
                  onExportRow={(row) => handleExportSuratJalan(row.id)}
                  onExportNoPo={handleExportSuratJalanByNoPo}
                  resolveCustomerLabel={resolveCustomerLabel}
                  colorTone="sky"
                  tableStyle="compact"
                />
              </>
            )}
          </>
        ) : null}
      </div>

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

      <PostCreateActionModal
        isOpen={Boolean(postCreateModalConfig)}
        title={postCreateModalConfig?.title ?? ""}
        description={postCreateModalConfig?.description ?? ""}
        showExportButton={canExport}
        showCreateInvoiceButton={Boolean(postCreateModalConfig?.showCreateInvoiceButton)}
        exportLabel={t("suratJalan.postCreateModal.exportButton")}
        createInvoiceLabel={t("suratJalan.postCreateModal.createInvoiceButton")}
        closeLabel={t("common.close")}
        onExport={() => handleExportSuratJalan(postCreateAction?.createdItem.id || "")}
        onCreateInvoice={handleCreateInvoiceFromPostCreate}
        onClose={() => setPostCreateAction(null)}
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
