"use client";

import { useState } from "react";
import { toCustomerFormState, type CustomerFormState, type CustomerItem } from "../_lib/customer";
import { useI18n } from "../../_i18n/provider";

type CustomerEditFormProps = {
  item?: CustomerItem;
  onNewData?: () => void;
  canManageCustomer?: boolean;
  isSaving?: boolean;
  isDeleting?: boolean;
  actionErrorMessage?: string;
  onSave?: (form: CustomerFormState, selectedItem?: CustomerItem) => Promise<void> | void;
  onDelete?: (selectedItem: CustomerItem) => Promise<void> | void;
};

function createEmptyCustomerFormState(): CustomerFormState {
  return {
    nama: "",
    alamat: "",
    npwp: "",
    atasNama: "",
  };
}

export function CustomerEditForm({
  item,
  onNewData,
  canManageCustomer = false,
  isSaving = false,
  isDeleting = false,
  actionErrorMessage = "",
  onSave,
  onDelete,
}: CustomerEditFormProps) {
  const { t } = useI18n();
  const inputPlaceholder = (fieldKey: string) =>
    t("common.placeholder.input", { field: t(fieldKey) });
  const [form, setForm] = useState<CustomerFormState>(() =>
    item ? toCustomerFormState(item) : createEmptyCustomerFormState()
  );

  return (
    <section className="rounded-2xl border border-sky-200 bg-sky-50/40 p-5 shadow-sm dark:border-sky-900/70 dark:bg-slate-950/85">
      <div className="mb-3">
        <h2 className="text-lg font-semibold text-sky-900 dark:text-sky-100">{t("customer.form.title")}</h2>
        <p className="text-sm text-sky-800 dark:text-sky-200">
          {t("customer.form.description")}
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-sky-100 bg-white/85 p-4 dark:border-slate-800 dark:bg-slate-900/70">
          <div className="grid gap-3">
            <label className="text-sm text-slate-700 dark:text-slate-200">
              {t("field.nama")}
              <input
                value={form.nama}
                onChange={(event) => setForm((prev) => ({ ...prev, nama: event.target.value }))}
                placeholder={inputPlaceholder("field.nama")}
                className="mt-1 w-full rounded-lg border border-sky-100 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </label>

            <label className="text-sm text-slate-700 dark:text-slate-200">
              {t("field.alamat")}
              <textarea
                rows={4}
                value={form.alamat}
                onChange={(event) => setForm((prev) => ({ ...prev, alamat: event.target.value }))}
                placeholder={inputPlaceholder("field.alamat")}
                className="mt-1 w-full rounded-lg border border-sky-100 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </label>

            <label className="text-sm text-slate-700 dark:text-slate-200">
              {t("field.npwp")}
              <input
                value={form.npwp}
                onChange={(event) => setForm((prev) => ({ ...prev, npwp: event.target.value }))}
                placeholder={inputPlaceholder("field.npwp")}
                className="mt-1 w-full rounded-lg border border-sky-100 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </label>

            <label className="text-sm text-slate-700 dark:text-slate-200">
              {t("field.atasNama")}
              <input
                value={form.atasNama}
                onChange={(event) => setForm((prev) => ({ ...prev, atasNama: event.target.value }))}
                placeholder={inputPlaceholder("field.atasNama")}
                className="mt-1 w-full rounded-lg border border-sky-100 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </label>
          </div>

          <div className="mt-3 grid gap-2 sm:flex sm:flex-wrap">
            <button
              type="button"
              onClick={() => void onSave?.(form, item)}
              disabled={!canManageCustomer || isSaving || isDeleting}
              className="w-full rounded-lg bg-sky-700 px-4 py-2 text-sm font-medium text-white hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-sky-500 dark:text-slate-950 dark:hover:bg-sky-400 sm:w-auto"
            >
              {isSaving ? t("common.loading") : t("common.saveChanges")}
            </button>
            <button
              type="button"
              disabled={isSaving || isDeleting}
              onClick={() => {
                onNewData?.();
                setForm(createEmptyCustomerFormState());
              }}
              className="w-full rounded-lg border border-sky-300 bg-white px-4 py-2 text-sm text-sky-700 hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-sky-800 dark:bg-slate-900 dark:text-sky-200 dark:hover:bg-slate-800 sm:w-auto"
            >
              {t("common.newData")}
            </button>
            <button
              type="button"
              disabled={isSaving || isDeleting}
              onClick={() =>
                setForm(item ? toCustomerFormState(item) : createEmptyCustomerFormState())
              }
              className="w-full rounded-lg border border-sky-300 bg-white px-4 py-2 text-sm text-sky-700 hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-sky-800 dark:bg-slate-900 dark:text-sky-200 dark:hover:bg-slate-800 sm:w-auto"
            >
              {t("common.resetForm")}
            </button>
            {item ? (
              <button
                type="button"
                onClick={() => void onDelete?.(item)}
                disabled={!canManageCustomer || isSaving || isDeleting}
                className="w-full rounded-lg border border-red-300 bg-white px-4 py-2 text-sm text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-900 dark:bg-slate-900 dark:text-red-300 dark:hover:bg-red-950/40 sm:w-auto"
              >
                {isDeleting ? t("common.loading") : t("common.delete")}
              </button>
            ) : null}
          </div>
          {!canManageCustomer ? (
            <p className="mt-3 text-xs text-amber-700 dark:text-amber-300">{t("customer.adminOnlyAction")}</p>
          ) : null}
          {actionErrorMessage ? (
            <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-200">
              {actionErrorMessage}
            </p>
          ) : null}
        </div>

        <div className="rounded-xl border border-sky-100 bg-sky-100/50 p-4 dark:border-slate-800 dark:bg-slate-900/60">
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{t("customer.preview.title")}</p>
          <div className="mt-3 space-y-2 text-sm text-slate-700 dark:text-slate-200">
            <p>
              <span className="text-slate-500 dark:text-slate-400">{t("field.nama")}:</span> {form.nama || "-"}
            </p>
            <p>
              <span className="text-slate-500 dark:text-slate-400">{t("field.alamat")}:</span> {form.alamat || "-"}
            </p>
            <p>
              <span className="text-slate-500 dark:text-slate-400">{t("field.npwp")}:</span> {form.npwp || "-"}
            </p>
            <p>
              <span className="text-slate-500 dark:text-slate-400">{t("field.atasNama")}:</span> {form.atasNama || "-"}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
