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
  const [form, setForm] = useState<CustomerFormState>(() =>
    item ? toCustomerFormState(item) : createEmptyCustomerFormState()
  );

  return (
    <section className="rounded-2xl border border-sky-200 bg-sky-50/40 p-5 shadow-sm">
      <div className="mb-3">
        <h2 className="text-lg font-semibold text-sky-900">{t("customer.form.title")}</h2>
        <p className="text-sm text-sky-800">
          {t("customer.form.description")}
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-transparent bg-slate-100/80 p-4">
          <div className="grid gap-3">
            <label className="text-sm text-slate-700">
              {t("field.nama")}
              <input
                value={form.nama}
                onChange={(event) => setForm((prev) => ({ ...prev, nama: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-transparent bg-white px-3 py-2 text-sm shadow-sm"
              />
            </label>

            <label className="text-sm text-slate-700">
              {t("field.alamat")}
              <textarea
                rows={4}
                value={form.alamat}
                onChange={(event) => setForm((prev) => ({ ...prev, alamat: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-transparent bg-white px-3 py-2 text-sm shadow-sm"
              />
            </label>

            <label className="text-sm text-slate-700">
              {t("field.atasNama")}
              <input
                value={form.atasNama}
                onChange={(event) => setForm((prev) => ({ ...prev, atasNama: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-transparent bg-white px-3 py-2 text-sm shadow-sm"
              />
            </label>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void onSave?.(form, item)}
              disabled={!canManageCustomer || isSaving || isDeleting}
              className="rounded-lg bg-sky-700 px-4 py-2 text-sm font-medium text-white hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-60"
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
              className="rounded-lg border border-sky-300 bg-white px-4 py-2 text-sm text-sky-700 hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {t("common.newData")}
            </button>
            <button
              type="button"
              disabled={isSaving || isDeleting}
              onClick={() =>
                setForm(item ? toCustomerFormState(item) : createEmptyCustomerFormState())
              }
              className="rounded-lg border border-sky-300 bg-white px-4 py-2 text-sm text-sky-700 hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {t("common.resetForm")}
            </button>
            {item ? (
              <button
                type="button"
                onClick={() => void onDelete?.(item)}
                disabled={!canManageCustomer || isSaving || isDeleting}
                className="rounded-lg border border-red-300 bg-white px-4 py-2 text-sm text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isDeleting ? t("common.loading") : t("common.delete")}
              </button>
            ) : null}
          </div>
          {!canManageCustomer ? (
            <p className="mt-3 text-xs text-amber-700">{t("customer.adminOnlyAction")}</p>
          ) : null}
          {actionErrorMessage ? (
            <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {actionErrorMessage}
            </p>
          ) : null}
        </div>

        <div className="rounded-xl border border-transparent bg-slate-100/70 p-4">
          <p className="text-sm font-semibold text-slate-900">{t("customer.preview.title")}</p>
          <div className="mt-3 space-y-2 text-sm text-slate-700">
            <p>
              <span className="text-slate-500">{t("field.nama")}:</span> {form.nama || "-"}
            </p>
            <p>
              <span className="text-slate-500">{t("field.alamat")}:</span> {form.alamat || "-"}
            </p>
            <p>
              <span className="text-slate-500">{t("field.atasNama")}:</span> {form.atasNama || "-"}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
