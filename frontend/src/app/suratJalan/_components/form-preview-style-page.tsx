"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ApiLoadingState } from "../../_components/api-loading-state";
import { AppToast } from "../../_components/app-toast";
import { ConfirmationModal } from "../../_components/confirmation-modal";
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
import { SuratJalanEditForm } from "./surat-jalan-edit-form";
import { SuratJalanTableFilter } from "./surat-jalan-table-filter";

type ToastState = {
  id: number;
  message: string;
  variant: "success" | "error";
};

export function FormPreviewStylePage() {
  const { t } = useI18n();
  const [rows, setRows] = useState<SuratJalanItem[]>([]);
  const [customerRows, setCustomerRows] = useState<CustomerItem[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [actionErrorMessage, setActionErrorMessage] = useState("");
  const [toast, setToast] = useState<ToastState | null>(null);
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
      } catch (error) {
        setRows([]);
        setSelectedId("");

        if (error instanceof ApiRequestError) {
          setErrorMessage(error.message || t("suratJalan.apiLoadError"));
        } else {
          setErrorMessage(t("suratJalan.apiLoadError"));
        }
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

  const executeSaveSuratJalan = useCallback(
    async (form: SuratJalanFormState, selectedItem?: SuratJalanItem) => {
      setActionErrorMessage("");
      setIsSaving(true);

      try {
        if (selectedItem?.id) {
          const updatedItem = await updateSuratJalan(selectedItem.id, form);
          await loadSuratJalanData({ showLoading: false });
          setSelectedId(updatedItem?.id || selectedItem.id);
          showToast(
            t("suratJalan.toast.updateSuccess", {
              noSuratJalan: form.noSuratJalan || selectedItem.noSuratJalan || "-",
            }),
            "success"
          );
          return;
        }

        const createdItem = await createSuratJalan(form);
        await loadSuratJalanData({ showLoading: false });
        setSelectedId(createdItem?.id || "");
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
    [loadSuratJalanData, showToast, t]
  );

  const executeDeleteSuratJalan = useCallback(
    async (selectedItem: SuratJalanItem) => {
      setActionErrorMessage("");
      setIsDeleting(true);

      try {
        await deleteSuratJalan(selectedItem.id);
        setSelectedId("");
        await loadSuratJalanData({ showLoading: false });
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
                setSelectedId("");
              }}
              customerOptions={customerOptions}
              noPoOptions={noPoOptions}
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
