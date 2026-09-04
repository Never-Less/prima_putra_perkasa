"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ApiLoadingState } from "../_components/api-loading-state";
import { AppToast } from "../_components/app-toast";
import { ConfirmationModal } from "../_components/confirmation-modal";
import { ListViewHeader } from "../_components/list-view-header";
import { requestUnsavedChangesConfirmation } from "../_hooks/use-unsaved-changes-warning";
import { usePersistentListUrl } from "../_hooks/use-persistent-list-url";
import { useI18n } from "../_i18n/provider";
import { ApiRequestError } from "../_lib/api-client";
import {
  buildFormRouteWithReturnPagination,
  buildListRouteWithPagination,
  normalizePaginationQueryState,
  normalizeReturnPaginationQueryState,
  normalizeStringFilterQueryState,
  type ServerPaginationMeta,
} from "../_lib/pagination";
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

const defaultUserPaginationQuery = {
  page: 1,
  limit: 10,
};
const defaultUserSort = "updatedDesc";

export function UserPageContent({ mode = "list", itemId = "" }: UserPageContentProps) {
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
        defaultUserPaginationQuery
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
        defaultUserPaginationQuery
      ),
    [searchParams]
  );
  const initialFilterQuery = useMemo(() => normalizeStringFilterQueryState(searchParams, defaultUserFilter), [searchParams]);
  const initialSortValue = String(searchParams.get("sort") || defaultUserSort);
  const returnListState = useMemo(() => ({ ...initialFilterQuery, sort: initialSortValue }), [initialFilterQuery, initialSortValue]);
  const returnListPath = useMemo(
    () => buildListRouteWithPagination("/user", returnPaginationQuery, returnListState),
    [returnListState, returnPaginationQuery]
  );
  const [rows, setRows] = useState<UserItem[]>([]);
  const [filter, setFilter] = useState<UserFilter>(initialFilterQuery);
  const [paginationQuery, setPaginationQuery] = useState(() =>
    isFormMode ? defaultUserPaginationQuery : initialPaginationQuery
  );
  const [pagination, setPagination] = useState<ServerPaginationMeta>({
    page: paginationQuery.page,
    limit: paginationQuery.limit,
    totalItems: 0,
    totalPages: 1,
  });
  const [filteredCount, setFilteredCount] = useState(0);
  const [sortValue, setSortValue] = useState(initialSortValue);
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

  usePersistentListUrl({ enabled: !isFormMode, basePath: "/user", defaultFilter: defaultUserFilter, defaultPagination: defaultUserPaginationQuery, defaultSort: defaultUserSort, filter, pagination: paginationQuery, sort: sortValue, setFilter, setPagination: setPaginationQuery, setSort: setSortValue });

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

  const sortedRows = useMemo(() => {
    return [...rows].sort((left, right) => {
      if (sortValue === "updatedAsc") {
        return left.updatedAt.localeCompare(right.updatedAt);
      }

      if (sortValue === "nameAsc") {
        return left.username.localeCompare(right.username);
      }

      if (sortValue === "nameDesc") {
        return right.username.localeCompare(left.username);
      }

      return right.updatedAt.localeCompare(left.updatedAt);
    });
  }, [rows, sortValue]);

  const showDataSection = isFormMode
    ? !isLoading && !errorMessage
    : !isLoading && (rows.length > 0 || !errorMessage);

  const navigateToForm = useCallback(
    (id?: string) => {
      const normalizedId = String(id || "").trim();
      router.push(buildFormRouteWithReturnPagination("/user/form", normalizedId, paginationQuery, { ...filter, sort: sortValue }));
    },
    [filter, paginationQuery, router, sortValue]
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
            router.replace(
              buildFormRouteWithReturnPagination(
                "/user/form",
                updatedUser?.id || selectedItem.id,
                returnPaginationQuery,
                returnListState
              )
            );
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
          router.replace(
            buildFormRouteWithReturnPagination("/user/form", createdUser.id, returnPaginationQuery, returnListState)
          );
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
    [isFormMode, loadUsers, returnListState, returnPaginationQuery, router, showToast, t]
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
          router.push(returnListPath);
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
    [isFormMode, loadUsers, returnListPath, router, showToast, t]
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
      <main className="erp-page">
        <ListViewHeader
          title={t("nav.user")}
          addLabel={t("common.addPageData", { page: t("nav.user") })}
          onAdd={isFormMode ? undefined : () => navigateToForm()}
        />

        <div className="mt-3 space-y-3">
          {isLoading ? <ApiLoadingState /> : null}

          {!isLoading && errorMessage ? (
            <section className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-200">
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
                  <UserEditForm
                    key={selectedId || "new"}
                    item={selectedRow}
                    isSaving={isSaving}
                    isDeleting={isDeleting}
                    actionErrorMessage={actionErrorMessage}
                    onSave={handleSaveUser}
                    onNewData={() => {
                      setActionErrorMessage("");
                      setSelectedId("");
                      router.replace(
                        buildFormRouteWithReturnPagination(
                          "/user/form",
                          "",
                          returnPaginationQuery,
                          returnListState
                        )
                      );
                    }}
                    onDelete={handleDeleteUser}
                  />
                </>
              ) : (
                <>
                  <UserTableFilter
                    rows={sortedRows}
                    filter={filter}
                    filteredCount={filteredCount}
                    pagination={pagination}
                    selectedId=""
                    sortValue={sortValue}
                    onSortChange={setSortValue}
                    sortOptions={[
                      { value: "updatedDesc", label: t("common.sort.updatedDesc") },
                      { value: "updatedAsc", label: t("common.sort.updatedAsc") },
                      { value: "nameAsc", label: t("common.sort.nameAsc") },
                      { value: "nameDesc", label: t("common.sort.nameDesc") },
                    ]}
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
