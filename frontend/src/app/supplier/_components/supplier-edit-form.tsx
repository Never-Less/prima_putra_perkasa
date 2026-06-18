"use client";

import { useMemo, useState } from "react";
import {
  requestUnsavedChangesConfirmation,
  serializeUnsavedChangesValue,
  useUnsavedChangesWarning,
} from "../../_hooks/use-unsaved-changes-warning";
import { toSupplierFormState, type SupplierFormState, type SupplierItem } from "../_lib/supplier";
import { useI18n } from "../../_i18n/provider";

type SupplierEditFormProps = {
  item?: SupplierItem;
  canManageSupplier?: boolean;
  isSaving?: boolean;
  isDeleting?: boolean;
  actionErrorMessage?: string;
  onSave?: (form: SupplierFormState, selectedItem?: SupplierItem) => Promise<void> | void;
  onNewData?: () => void;
  onDelete?: (selectedItem: SupplierItem) => Promise<void> | void;
};

function createEmptySupplierFormState(): SupplierFormState {
  return {
    namaSupplier: "",
    hutang: false,
    lamaHutang: "",
  };
}

export function SupplierEditForm({
  item,
  canManageSupplier = false,
  isSaving = false,
  isDeleting = false,
  actionErrorMessage = "",
  onSave,
  onNewData,
  onDelete,
}: SupplierEditFormProps) {
  const { t } = useI18n();
  const inputPlaceholder = (fieldKey: string) =>
    t("common.placeholder.input", { field: t(fieldKey) });
  const baselineForm = useMemo(
    () => (item ? toSupplierFormState(item) : createEmptySupplierFormState()),
    [item]
  );
  const [form, setForm] = useState<SupplierFormState>(() => baselineForm);
  const isDirty =
    serializeUnsavedChangesValue(form) !== serializeUnsavedChangesValue(baselineForm);

  useUnsavedChangesWarning(
    isDirty && !isSaving && !isDeleting,
    t("common.unsavedChangesWarning")
  );

  const handleNewData = async () => {
    const canLeave = await requestUnsavedChangesConfirmation(t("common.unsavedChangesWarning"));

    if (!canLeave) {
      return;
    }

    setForm(createEmptySupplierFormState());
    onNewData?.();
  };

  return (
    <section className="rounded-2xl border border-sky-200 bg-sky-50/40 p-5 shadow-sm dark:border-sky-900/70 dark:bg-slate-950/85">
      <div className="mb-3">
        <h2 className="text-lg font-semibold text-sky-900 dark:text-sky-100">{t("supplier.form.title")}</h2>
        <p className="text-sm text-sky-800 dark:text-sky-200">{t("supplier.form.description")}</p>
      </div>

      <div className="space-y-4">
        <div className="rounded-xl border border-sky-100 bg-white/85 p-4 dark:border-slate-800 dark:bg-slate-900/70">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm text-slate-700 dark:text-slate-200 sm:col-span-2">
              {t("field.namaSupplier")}
              <input
                value={form.namaSupplier}
                onChange={(event) => setForm((prev) => ({ ...prev, namaSupplier: event.target.value }))}
                placeholder={inputPlaceholder("field.namaSupplier")}
                className="mt-1 w-full rounded-lg border border-sky-100 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </label>

            <label className="text-sm text-slate-700 dark:text-slate-200">
              {t("field.hutang")}
              <select
                value={String(form.hutang)}
                onChange={(event) => {
                  const hutang = event.target.value === "true";

                  setForm((prev) => ({
                    ...prev,
                    hutang,
                    lamaHutang: hutang ? prev.lamaHutang : "",
                  }));
                }}
                className="mt-1 w-full rounded-lg border border-sky-100 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              >
                <option value="true">{t("common.true")}</option>
                <option value="false">{t("common.false")}</option>
              </select>
            </label>

            <label className="text-sm text-slate-700 dark:text-slate-200">
              {t("field.lamaHutang")}
              <input
                type="number"
                min={1}
                value={form.hutang ? form.lamaHutang : ""}
                disabled={!form.hutang}
                onChange={(event) => setForm((prev) => ({ ...prev, lamaHutang: event.target.value }))}
                placeholder={form.hutang ? inputPlaceholder("field.lamaHutang") : ""}
                className="mt-1 w-full rounded-lg border border-sky-100 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm disabled:cursor-not-allowed disabled:bg-sky-100/70 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:disabled:bg-slate-900"
              />
            </label>
          </div>

          <div className="mt-3 grid gap-2 sm:flex sm:flex-wrap">
            <button
              type="button"
              onClick={() => void onSave?.(form, item)}
              disabled={!canManageSupplier || isSaving || isDeleting}
              className="w-full rounded-lg bg-sky-700 px-4 py-2 text-sm font-medium text-white hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-sky-500 dark:text-slate-950 dark:hover:bg-sky-400 sm:w-auto"
            >
              {isSaving ? t("common.loading") : t("common.saveChanges")}
            </button>
            <button
              type="button"
              disabled={isSaving || isDeleting}
              onClick={() => void handleNewData()}
              className="w-full rounded-lg border border-sky-300 bg-white px-4 py-2 text-sm text-sky-700 hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-sky-800 dark:bg-slate-900 dark:text-sky-200 dark:hover:bg-slate-800 sm:w-auto"
            >
              {t("common.newData")}
            </button>
            <button
              type="button"
              disabled={isSaving || isDeleting}
              onClick={() => setForm(baselineForm)}
              className="w-full rounded-lg border border-sky-300 bg-white px-4 py-2 text-sm text-sky-700 hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-sky-800 dark:bg-slate-900 dark:text-sky-200 dark:hover:bg-slate-800 sm:w-auto"
            >
              {t("common.resetForm")}
            </button>
            {item ? (
              <button
                type="button"
                onClick={() => void onDelete?.(item)}
                disabled={!canManageSupplier || isSaving || isDeleting}
                className="w-full rounded-lg border border-red-300 bg-white px-4 py-2 text-sm text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-900 dark:bg-slate-900 dark:text-red-300 dark:hover:bg-red-950/40 sm:w-auto"
              >
                {isDeleting ? t("common.loading") : t("common.delete")}
              </button>
            ) : null}
          </div>
          {!canManageSupplier ? (
            <p className="mt-3 text-xs text-amber-700 dark:text-amber-300">{t("supplier.adminOnlyAction")}</p>
          ) : null}
          {actionErrorMessage ? (
            <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-200">
              {actionErrorMessage}
            </p>
          ) : null}
        </div>

        <div className="rounded-xl border border-sky-100 bg-sky-100/50 p-4 dark:border-slate-800 dark:bg-slate-900/60">
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{t("supplier.preview.title")}</p>
          <div className="mt-3 space-y-2 text-sm text-slate-700 dark:text-slate-200">
            <p>
              <span className="text-slate-500 dark:text-slate-400">{t("field.namaSupplier")}:</span>{" "}
              {form.namaSupplier || "-"}
            </p>
            <p>
              <span className="text-slate-500 dark:text-slate-400">{t("field.hutang")}:</span>{" "}
              {form.hutang ? t("common.true") : t("common.false")}
            </p>
            <p>
              <span className="text-slate-500 dark:text-slate-400">{t("field.lamaHutang")}:</span>{" "}
              {form.hutang ? form.lamaHutang || "-" : "-"}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
