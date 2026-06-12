"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ApiLoadingState } from "../_components/api-loading-state";
import { AppToast } from "../_components/app-toast";
import { ConfirmationModal } from "../_components/confirmation-modal";
import { confirmUnsavedChanges } from "../_hooks/use-unsaved-changes-warning";
import { useI18n } from "../_i18n/provider";
import { ApiRequestError } from "../_lib/api-client";
import { type ServerPaginationMeta } from "../_lib/pagination";
import { UserEditForm } from "./_components/user-edit-form";
import { UserTableFilter } from "./_components/user-table-filter";
import {
  createUser,
  defaultUserFilter,
  deleteUser,
  fetchUserById,
  fetchUserList,
  updateUser,
  type UserFilter,
  type UserFormState,
  type UserItem,
} from "./_lib/user";

type ToastState = {
  id: number;
  message: string;
  variant: "success" | "error";
};

type UserPageMode = "list" | "form";

type UserPageContentProps = {
  mode?: UserPageMode;
  itemId?: string;
};

export function UserPageContent({ mode = "list", itemId = "" }: UserPageContentProps) {
  const { t } = useI18n();
  const router = useRouter();
  const isFormMode = mode === "form";
  const [rows, setRows] = useState<UserItem[]>([]);
  const [filter, setFilter] = useState<UserFilter>(defaultUserFilter);
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
        form: UserFormState;
        selectedItem: UserItem;
      }
    | {
        type: "delete";
        selectedItem: UserItem;
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

  const loadUsers = useCallback(
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

          const user = await fetchUserById(itemId);
          const userRows = user ? [user] : [];

          setRows(userRows);
          setPagination({
            page: 1,
            limit: 1,
            totalItems: userRows.length,
            totalPages: 1,
          });
          setFilteredCount(userRows.length);
          setSelectedId(user?.id || itemId);
          return;
        }

        const userResult = await fetchUserList({
          ...filter,
          ...paginationQuery,
        });
        const userRows = userResult.items;

        setRows(userRows);
        setPagination(userResult.pagination);
        setFilteredCount(userResult.totalRows);
        setSelectedId((prevSelectedId) => {
          if (userRows.some((row) => row.id === prevSelectedId)) {
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
          setErrorMessage(error.message || t("user.apiLoadError"));
          return;
        }

        setErrorMessage(t("user.apiLoadError"));
      } finally {
        if (showLoading) {
          setIsLoading(false);
        }
      }
    },
    [filter, isFormMode, itemId, paginationQuery, t]
  );

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const handleFilterChange = useCallback(
    <K extends keyof UserFilter,>(key: K, value: UserFilter[K]) => {
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
    setFilter(defaultUserFilter);
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
      router.push(normalizedId ? `/user/form?id=${encodeURIComponent(normalizedId)}` : "/user/form");
    },
    [router]
  );

  const executeSaveUser = useCallback(
    async (form: UserFormState, selectedItem?: UserItem) => {
      setActionErrorMessage("");
      setIsSaving(true);

      try {
        if (selectedItem?.id) {
          const updatedUser = await updateUser(selectedItem.id, form);
          await loadUsers({ showLoading: false });
          setSelectedId(updatedUser?.id || selectedItem.id);
          if (isFormMode) {
            router.replace(`/user/form?id=${encodeURIComponent(updatedUser?.id || selectedItem.id)}`);
          }
          showToast(
            t("user.toast.updateSuccess", {
              username: form.username || selectedItem.username || "-",
            }),
            "success"
          );
          return;
        }

        const createdUser = await createUser(form);
        await loadUsers({ showLoading: false });
        setSelectedId(createdUser?.id || "");
        if (isFormMode && createdUser?.id) {
          router.replace(`/user/form?id=${encodeURIComponent(createdUser.id)}`);
        }
        showToast(
          t("user.toast.createSuccess", {
            username: form.username || "-",
          }),
          "success"
        );
      } catch (error) {
        if (error instanceof ApiRequestError) {
          const message = error.message || t("user.mutationError");
          setActionErrorMessage(message);
          showToast(message, "error");
          return;
        }

        const message = t("user.mutationError");
        setActionErrorMessage(message);
        showToast(message, "error");
      } finally {
        setIsSaving(false);
      }
    },
    [isFormMode, loadUsers, router, showToast, t]
  );

  const executeDeleteUser = useCallback(
    async (selectedItem: UserItem) => {
      setActionErrorMessage("");
      setIsDeleting(true);

      try {
        await deleteUser(selectedItem.id);
        setSelectedId("");
        await loadUsers({ showLoading: false });
        if (isFormMode) {
          router.push("/user");
        }
        showToast(
          t("user.toast.deleteSuccess", {
            username: selectedItem.username || "-",
          }),
          "success"
        );
      } catch (error) {
        if (error instanceof ApiRequestError) {
          const message = error.message || t("user.mutationError");
          setActionErrorMessage(message);
          showToast(message, "error");
          return;
        }

        const message = t("user.mutationError");
        setActionErrorMessage(message);
        showToast(message, "error");
      } finally {
        setIsDeleting(false);
      }
    },
    [isFormMode, loadUsers, router, showToast, t]
  );

  const handleSaveUser = useCallback(
    async (form: UserFormState, selectedItem?: UserItem) => {
      if (selectedItem?.id) {
        setPendingConfirmation({
          type: "update",
          form,
          selectedItem,
        });
        return;
      }

      await executeSaveUser(form, selectedItem);
    },
    [executeSaveUser]
  );

  const handleDeleteUser = useCallback((selectedItem: UserItem) => {
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
      await executeSaveUser(currentConfirmation.form, currentConfirmation.selectedItem);
      return;
    }

    await executeDeleteUser(currentConfirmation.selectedItem);
  }, [executeDeleteUser, executeSaveUser, pendingConfirmation]);

  const confirmationConfig = useMemo(() => {
    if (!pendingConfirmation) {
      return null;
    }

    if (pendingConfirmation.type === "update") {
      return {
        title: t("user.confirmUpdateTitle"),
        description: t("user.confirmUpdateDescription", {
          username: pendingConfirmation.selectedItem.username || "-",
        }),
        confirmLabel: t("common.saveChanges"),
        variant: "default" as const,
      };
    }

    return {
      title: t("user.confirmDeleteTitle"),
      description: t("user.confirmDeleteDescription", {
        username: pendingConfirmation.selectedItem.username || "-",
      }),
      confirmLabel: t("common.delete"),
      variant: "danger" as const,
    };
  }, [pendingConfirmation, t]);

  return (
    <>
      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <section className="rounded-2xl border border-sky-100 bg-gradient-to-r from-sky-50 to-white p-4 shadow-sm dark:border-slate-800 dark:from-slate-900 dark:to-slate-950 sm:p-5">
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100 sm:text-2xl">{t("nav.user")}</h1>
          <p className="mt-1 max-w-3xl text-sm text-slate-600 dark:text-slate-300">{t("user.page.description")}</p>
        </section>

        <div className="mt-5 space-y-5">
          {isLoading ? <ApiLoadingState /> : null}

          {!isLoading && errorMessage ? (
            <section className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-200">
              <p>{errorMessage}</p>
              <button
                type="button"
                onClick={() => void loadUsers()}
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
                        if (confirmUnsavedChanges(t("common.unsavedChangesWarning"))) {
                          router.push("/user");
                        }
                      }}
                      className="rounded-lg border border-sky-300 bg-white px-4 py-2 text-sm font-medium text-sky-700 hover:bg-sky-50 dark:border-sky-800 dark:bg-slate-900 dark:text-sky-200 dark:hover:bg-slate-800"
                    >
                      {t("common.close")}
                    </button>
                  </div>
                  <UserEditForm
                    key={selectedId || "new"}
                    item={selectedRow}
                    isSaving={isSaving}
                    isDeleting={isDeleting}
                    actionErrorMessage={actionErrorMessage}
                    onSave={handleSaveUser}
                    onDelete={handleDeleteUser}
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
                  <UserTableFilter
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

export default function UserPage() {
  return <UserPageContent mode="list" />;
}
