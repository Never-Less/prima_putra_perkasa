"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ApiLoadingState } from "../_components/api-loading-state";
import { AppToast } from "../_components/app-toast";
import { ConfirmationModal } from "../_components/confirmation-modal";
import { useDebouncedValue } from "../_hooks/use-debounced-value";
import { ApiRequestError } from "../_lib/api-client";
import { type ServerPaginationMeta } from "../_lib/pagination";
import { CustomerEditForm } from "./_components/customer-edit-form";
import { CustomerTableFilter } from "./_components/customer-table-filter";
import {
  createCustomer,
  defaultCustomerFilter,
  deleteCustomer,
  fetchCurrentUserRole,
  fetchCustomerList,
  updateCustomer,
  type CustomerFilter,
  type CustomerFormState,
  type CustomerItem,
} from "./_lib/customer";
import { useI18n } from "../_i18n/provider";

type ToastState = {
  id: number;
  message: string;
  variant: "success" | "error";
};

export default function CustomerPage() {
  const { t } = useI18n();
  const [rows, setRows] = useState<CustomerItem[]>([]);
  const [filter, setFilter] = useState<CustomerFilter>(defaultCustomerFilter);
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
  const [selectedId, setSelectedId] = useState("");
  const [userRole, setUserRole] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [actionErrorMessage, setActionErrorMessage] = useState("");
  const [toast, setToast] = useState<ToastState | null>(null);
  const [pendingConfirmation, setPendingConfirmation] = useState<
    | {
        type: "update";
        form: CustomerFormState;
        selectedItem: CustomerItem;
      }
    | {
        type: "delete";
        selectedItem: CustomerItem;
      }
    | null
  >(null);
  const debouncedFilter = useDebouncedValue(filter);

  const canManageCustomer = userRole === "admin";

  const showToast = useCallback((message: string, variant: ToastState["variant"]) => {
    setToast({
      id: Date.now(),
      message,
      variant,
    });
  }, []);

  const loadCustomers = useCallback(async (options: { showLoading?: boolean } = {}) => {
    const { showLoading = true } = options;

    if (showLoading) {
      setIsLoading(true);
    }

    setErrorMessage("");

    try {
        const customerResult = await fetchCustomerList({
        ...debouncedFilter,
        ...paginationQuery,
      });
      const customerRows = customerResult.items;

      setRows(customerRows);
      setPagination(customerResult.pagination);
      setFilteredCount(customerResult.totalRows);
      setSelectedId((prevSelectedId) => {
        if (customerRows.some((row) => row.id === prevSelectedId)) {
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
        setErrorMessage(error.message || t("customer.apiLoadError"));
        return;
      }

      setErrorMessage(t("customer.apiLoadError"));
    } finally {
      if (showLoading) {
        setIsLoading(false);
      }
    }
  }, [debouncedFilter, paginationQuery, t]);

  const loadCurrentUserRole = useCallback(async () => {
    try {
      const role = await fetchCurrentUserRole();
      setUserRole(role);
    } catch {
      setUserRole("");
    }
  }, []);

  useEffect(() => {
    void loadCustomers();
  }, [loadCustomers]);

  useEffect(() => {
    void loadCurrentUserRole();
  }, [loadCurrentUserRole]);

  const handleFilterChange = useCallback(
    <K extends keyof CustomerFilter,>(key: K, value: CustomerFilter[K]) => {
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
    setFilter(defaultCustomerFilter);
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

  const showDataSection = !isLoading && (rows.length > 0 || !errorMessage);

  const executeSaveCustomer = useCallback(
    async (form: CustomerFormState, selectedItem?: CustomerItem) => {
      if (!canManageCustomer) {
        const message = t("customer.adminOnlyAction");
        setActionErrorMessage(message);
        showToast(message, "error");
        return;
      }

      setActionErrorMessage("");
      setIsSaving(true);

      try {
        if (selectedItem?.id) {
          const updatedCustomer = await updateCustomer(selectedItem.id, form);
          await loadCustomers({ showLoading: false });
          setSelectedId(updatedCustomer?.id || selectedItem.id);
          showToast(
            t("customer.toast.updateSuccess", {
              nama: form.nama || selectedItem.nama || "-",
            }),
            "success"
          );
          return;
        }

        const createdCustomer = await createCustomer(form);
        await loadCustomers({ showLoading: false });
        setSelectedId(createdCustomer?.id || "");
        showToast(t("customer.toast.createSuccess"), "success");
      } catch (error) {
        if (error instanceof ApiRequestError) {
          const message = error.message || t("customer.mutationError");
          setActionErrorMessage(message);
          showToast(message, "error");
          return;
        }

        const message = t("customer.mutationError");
        setActionErrorMessage(message);
        showToast(message, "error");
      } finally {
        setIsSaving(false);
      }
    },
    [canManageCustomer, loadCustomers, showToast, t]
  );

  const executeDeleteCustomer = useCallback(
    async (selectedItem: CustomerItem) => {
      if (!canManageCustomer) {
        const message = t("customer.adminOnlyAction");
        setActionErrorMessage(message);
        showToast(message, "error");
        return;
      }

      setActionErrorMessage("");
      setIsDeleting(true);

      try {
        await deleteCustomer(selectedItem.id);
        setSelectedId("");
        await loadCustomers({ showLoading: false });
        showToast(
          t("customer.toast.deleteSuccess", {
            nama: selectedItem.nama || "-",
          }),
          "success"
        );
      } catch (error) {
        if (error instanceof ApiRequestError) {
          const message = error.message || t("customer.mutationError");
          setActionErrorMessage(message);
          showToast(message, "error");
          return;
        }

        const message = t("customer.mutationError");
        setActionErrorMessage(message);
        showToast(message, "error");
      } finally {
        setIsDeleting(false);
      }
    },
    [canManageCustomer, loadCustomers, showToast, t]
  );

  const handleSaveCustomer = useCallback(
    async (form: CustomerFormState, selectedItem?: CustomerItem) => {
      if (selectedItem?.id) {
        setPendingConfirmation({
          type: "update",
          form: form,
          selectedItem: selectedItem,
        });
        return;
      }

      await executeSaveCustomer(form, selectedItem);
    },
    [executeSaveCustomer]
  );

  const handleDeleteCustomer = useCallback((selectedItem: CustomerItem) => {
    setPendingConfirmation({
      type: "delete",
      selectedItem: selectedItem,
    });
  }, []);

  const handleConfirmAction = useCallback(async () => {
    if (!pendingConfirmation) {
      return;
    }

    const currentConfirmation = pendingConfirmation;
    setPendingConfirmation(null);

    if (currentConfirmation.type === "update") {
      await executeSaveCustomer(currentConfirmation.form, currentConfirmation.selectedItem);
      return;
    }

    await executeDeleteCustomer(currentConfirmation.selectedItem);
  }, [executeDeleteCustomer, executeSaveCustomer, pendingConfirmation]);

  const confirmationConfig = useMemo(() => {
    if (!pendingConfirmation) {
      return null;
    }

    if (pendingConfirmation.type === "update") {
      return {
        title: t("customer.confirmUpdateTitle"),
        description: t("customer.confirmUpdateDescription", {
          nama: pendingConfirmation.selectedItem.nama || "-",
        }),
        confirmLabel: t("common.saveChanges"),
        variant: "default" as const,
      };
    }

    return {
      title: t("customer.confirmDeleteTitle"),
      description: t("customer.confirmDeleteDescription", {
        nama: pendingConfirmation.selectedItem.nama || "-",
      }),
      confirmLabel: t("common.delete"),
      variant: "danger" as const,
    };
  }, [pendingConfirmation, t]);

  return (
    <>
      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <section className="rounded-2xl border border-sky-100 bg-gradient-to-r from-sky-50 to-white p-4 shadow-sm dark:border-slate-800 dark:from-slate-900 dark:to-slate-950 sm:p-5">
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100 sm:text-2xl">{t("nav.customer")}</h1>
          <p className="mt-1 max-w-3xl text-sm text-slate-600 dark:text-slate-300">
            {t("customer.page.description")}
          </p>
        </section>

        <div className="mt-5 space-y-5">
          {isLoading ? <ApiLoadingState /> : null}

          {!isLoading && errorMessage ? (
            <section className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-200">
              <p>{errorMessage}</p>
              <button
                onClick={() => void loadCustomers()}
                className="mt-3 rounded-lg border border-red-300 bg-white px-3 py-2 text-xs font-medium text-red-700 hover:bg-red-100 dark:border-red-900 dark:bg-slate-900 dark:text-red-200 dark:hover:bg-red-950/40"
              >
                {t("common.retry")}
              </button>
            </section>
          ) : null}

          {showDataSection ? (
            <>
              <CustomerTableFilter
                rows={rows}
                filter={filter}
                filteredCount={filteredCount}
                pagination={pagination}
                selectedId={selectedId}
                onFilterChange={handleFilterChange}
                onResetFilter={handleResetFilter}
                onPageChange={handlePageChange}
                onPageSizeChange={handlePageSizeChange}
                onSelectRow={(row) => {
                  setActionErrorMessage("");
                  setToast(null);
                  setSelectedId(row.id);
                }}
              />

              <CustomerEditForm
                key={selectedId || "new"}
                item={selectedRow}
                onNewData={() => {
                  setActionErrorMessage("");
                  setToast(null);
                  setSelectedId("");
                }}
                canManageCustomer={canManageCustomer}
                isSaving={isSaving}
                isDeleting={isDeleting}
                actionErrorMessage={actionErrorMessage}
                onSave={handleSaveCustomer}
                onDelete={handleDeleteCustomer}
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
