"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ApiLoadingState } from "../../_components/api-loading-state";
import { AppToast } from "../../_components/app-toast";
import { ConfirmationModal } from "../../_components/confirmation-modal";
import { saveInvoicePrefill, type InvoicePrefillPayload } from "../../invoice/_lib/invoice";
import { ApiRequestError } from "../../_lib/api-client";
import { useI18n } from "../../_i18n/provider";
import { fetchCustomerRows, type CustomerItem } from "../../customer/_lib/customer";
import {
  createSuratJalan,
  deleteSuratJalan,
  fetchSuratJalanRows,
  updateSuratJalan,
  type SuratJalanFormState,
  type SuratJalanItem,
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

export function FormPreviewStylePage() {
  const { t } = useI18n();
  const router = useRouter();
  const [rows, setRows] = useState<SuratJalanItem[]>([]);
  const [customerRows, setCustomerRows] = useState<CustomerItem[]>([]);
  const [selectedId, setSelectedId] = useState("");
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
        const suratJalanRows = await fetchSuratJalanRows();
        setRows(suratJalanRows);
        setSelectedId((prevSelectedId) => {
          if (suratJalanRows.some((row) => row.id === prevSelectedId)) {
            return prevSelectedId;
          }

          return "";
        });

        return suratJalanRows;
      } catch (error) {
        setRows([]);
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
    [t]
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

  useEffect(() => {
    void Promise.all([loadSuratJalanData(), loadCustomerOptions()]);
  }, [loadCustomerOptions, loadSuratJalanData]);

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
    const noPoSet = new Set<string>();

    rows.forEach((row) => {
      const noPo = String(row.noPo || "").trim();

      if (!noPo) {
        return;
      }

      noPoSet.add(noPo);
    });

    return Array.from(noPoSet.values());
  }, [rows]);
  const noPoCustomerMap = useMemo(() => {
    const map: Record<string, string> = {};

    rows.forEach((row) => {
      const noPo = String(row.noPo || "").trim();
      const idCustomer = String(row.idCustomer || "").trim();

      if (!noPo || !idCustomer || map[noPo]) {
        return;
      }

      map[noPo] = idCustomer;
    });

    return map;
  }, [rows]);

  const buildInvoicePrefillFromNoPo = useCallback(
    (allRows: SuratJalanItem[], createdItem: SuratJalanItem): InvoicePrefillPayload => {
      const sameNoPoRows = allRows.filter((row) => row.noPo === createdItem.noPo);
      const sourceRows = sameNoPoRows.length > 0 ? sameNoPoRows : [createdItem];
      const noSuratJalanSet = new Set<string>();
      const barangMap = new Map<string, number>();

      sourceRows.forEach((row) => {
        const noSuratJalan = String(row.noSuratJalan || "").trim();

        if (noSuratJalan) {
          noSuratJalanSet.add(noSuratJalan);
        }

        row.barang.forEach((barang) => {
          const namaBarang = String(barang.nama || "").trim();

          if (!namaBarang) {
            return;
          }

          const jumlahSaatIni = barangMap.get(namaBarang) || 0;
          barangMap.set(namaBarang, jumlahSaatIni + Number(barang.jumlah || 0));
        });
      });

      const barang = Array.from(barangMap.entries())
        .map(([namaBarang, kuantitas]) => ({
          namaBarang,
          kuantitas,
        }))
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
    [buildInvoicePrefillFromNoPo, loadSuratJalanData, showToast, t]
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
    [loadSuratJalanData, showToast, t]
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
    router.push("/invoice");
  }, [postCreateAction, router]);

  const showDataSection = !isLoading && (rows.length > 0 || !errorMessage);

  return (
    <>
      <div className="space-y-5">
        {isLoading ? <ApiLoadingState /> : null}

        {!isLoading && errorMessage ? (
          <section className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <p>{errorMessage}</p>
            <button
              type="button"
              onClick={() => void loadSuratJalanData()}
              className="mt-3 rounded-lg border border-red-300 bg-white px-3 py-2 text-xs font-medium text-red-700 hover:bg-red-100"
            >
              {t("common.retry")}
            </button>
          </section>
        ) : null}

        {showDataSection ? (
          <>
            <SuratJalanTableFilter
              rows={rows}
              selectedId={selectedId}
              onSelectRow={(row) => {
                setActionErrorMessage("");
                setToast(null);
                setPostCreateAction(null);
                setSelectedId(row.id);
              }}
              resolveCustomerLabel={resolveCustomerLabel}
              colorTone="sky"
              tableStyle="compact"
            />

            <SuratJalanEditForm
              key={selectedId || "new"}
              item={selectedRow}
              onNewData={() => {
                setActionErrorMessage("");
                setToast(null);
                setPostCreateAction(null);
                setSelectedId("");
              }}
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
        showCreateInvoiceButton={Boolean(postCreateModalConfig?.showCreateInvoiceButton)}
        exportLabel={t("suratJalan.postCreateModal.exportButton")}
        createInvoiceLabel={t("suratJalan.postCreateModal.createInvoiceButton")}
        closeLabel={t("common.close")}
        onExport={() => undefined}
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
