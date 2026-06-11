"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ApiLoadingState } from "../_components/api-loading-state";
import { AppToast } from "../_components/app-toast";
import { ConfirmationModal } from "../_components/confirmation-modal";
import { ApiRequestError } from "../_lib/api-client";
import { type ServerPaginationMeta } from "../_lib/pagination";
import { CustomerEditForm } from "./_components/customer-edit-form";
import { CustomerTableFilter } from "./_components/customer-table-filter";
import {
  createCustomer,
  defaultCustomerFilter,
  deleteCustomer,
  fetchCustomerById,
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

type CustomerPageMode = "list" | "form";

type CustomerPageContentProps = {
  mode?: CustomerPageMode;
  itemId?: string;
};

export function CustomerPageContent({ mode = "list", itemId = "" }: CustomerPageContentProps) {
  const { t } = useI18n();
  const router = useRouter();
  const isFormMode = mode === "form";
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
        form: CustomerFormState;
        selectedItem: CustomerItem;
      }
    | {
        type: "delete";
        selectedItem: CustomerItem;
      }
    | null
  >(null);

  const canManageCustomer = true;

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

        const customer = await fetchCustomerById(itemId);
        const customerRows = customer ? [customer] : [];

        setRows(customerRows);
        setPagination({
          page: 1,
          limit: 1,
          totalItems: customerRows.length,
          totalPages: 1,
        });
        setFilteredCount(customerRows.length);
        setSelectedId(customer?.id || itemId);
        return;
      }

      const customerResult = await fetchCustomerList({
        ...filter,
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
  }, [filter, isFormMode, itemId, paginationQuery, t]);

  useEffect(() => {
    void loadCustomers();
  }, [loadCustomers]);

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

  const showDataSection = isFormMode
    ? !isLoading && !errorMessage
    : !isLoading && (rows.length > 0 || !errorMessage);

  const navigateToForm = useCallback(
    (id?: string) => {
      const normalizedId = String(id || "").trim();
      router.push(normalizedId ? `/customer/form?id=${encodeURIComponent(normalizedId)}` : "/customer/form");
    },
    [router]
  );

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
          if (isFormMode) {
            router.replace(`/customer/form?id=${encodeURIComponent(updatedCustomer?.id || selectedItem.id)}`);
          }
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
        if (isFormMode && createdCustomer?.id) {
          router.replace(`/customer/form?id=${encodeURIComponent(createdCustomer.id)}`);
        }
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
    [canManageCustomer, isFormMode, loadCustomers, router, showToast, t]
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
        if (isFormMode) {
          router.push("/customer");
        }
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
    [canManageCustomer, isFormMode, loadCustomers, router, showToast, t]
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
              {isFormMode ? (
                <>
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => router.push("/customer")}
                      className="rounded-lg border border-sky-300 bg-white px-4 py-2 text-sm font-medium text-sky-700 hover:bg-sky-50 dark:border-sky-800 dark:bg-slate-900 dark:text-sky-200 dark:hover:bg-slate-800"
                    >
                      {t("common.close")}
                    </button>
                  </div>
                  <CustomerEditForm
                    key={selectedId || "new"}
                    item={selectedRow}
                    canManageCustomer={canManageCustomer}
                    isSaving={isSaving}
                    isDeleting={isDeleting}
                    actionErrorMessage={actionErrorMessage}
                    onSave={handleSaveCustomer}
                    onDelete={handleDeleteCustomer}
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
                  <CustomerTableFilter
                    rows={rows}
                    filter={filter}
                    filteredCount={filteredCount}
                    pagination={pagination}
                    selectedId=""
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

export default function CustomerPage() {
  return <CustomerPageContent mode="list" />;
}
