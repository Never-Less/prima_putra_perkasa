"use client";

import { useMemo, useRef, useState } from "react";
import { normalizeSupplierNumberInput, supplierNpwpPattern } from "../_lib/supplier-contact";
import {
  requestUnsavedChangesConfirmation,
  serializeUnsavedChangesValue,
  useUnsavedChangesWarning,
} from "../../_hooks/use-unsaved-changes-warning";
import { toSupplierFormState, type SupplierFormState, type SupplierItem } from "../_lib/supplier";
import { useI18n } from "../../_i18n/provider";
import { SupplierTagInput } from "./supplier-tag-input";
import { SupplierDocumentLinksEditor, SupplierDocumentLinksList } from "./supplier-document-links";
import { isSupplierDocumentUrl } from "../_lib/supplier-documents";
import { SupplierDocumentList, SupplierDocumentPicker } from "./supplier-documents";

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
    alamat: "", npwp: "", picName: "", phone: "", whatsapp: "", email: "", productCategories: "", productBrands: "",
    notes: "", documentLinksText: "", documentLinks: [], documentFiles: [], isActive: true,
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
  const sectionRef = useRef<HTMLElement>(null);
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
    <section ref={sectionRef} className="ppp-form-view rounded-2xl border border-sky-200 bg-sky-50/40 p-5 shadow-sm dark:border-sky-900/70 dark:bg-slate-950/85">
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

            <label className="text-sm text-slate-700 dark:text-slate-200 sm:col-span-2">{t("supplier.field.alamat")}<textarea value={form.alamat} onChange={(event) => setForm((prev) => ({ ...prev, alamat: event.target.value }))} className="erp-field mt-1 min-h-20 w-full" /></label>
            <label className="text-sm text-slate-700 dark:text-slate-200">{t("supplier.field.npwp")}<input inputMode="numeric" maxLength={20} pattern={supplierNpwpPattern} value={form.npwp} onChange={(event) => setForm((prev) => ({ ...prev, npwp: normalizeSupplierNumberInput(event.target.value, "npwp") }))} className="erp-field mt-1 w-full" /></label>
            <label className="text-sm text-slate-700 dark:text-slate-200">{t("supplier.field.pic")}<input value={form.picName} onChange={(event) => setForm((prev) => ({ ...prev, picName: event.target.value }))} className="erp-field mt-1 w-full" /></label>
            <label className="text-sm text-slate-700 dark:text-slate-200">{t("supplier.field.phone")}<input type="tel" inputMode="numeric" maxLength={15} pattern="[0-9]{7,15}" value={form.phone} onChange={(event) => setForm((prev) => ({ ...prev, phone: normalizeSupplierNumberInput(event.target.value, "phone") }))} className="erp-field mt-1 w-full" /></label>
            <label className="text-sm text-slate-700 dark:text-slate-200">{t("supplierOnboarding.whatsapp")}<input type="tel" inputMode="numeric" maxLength={15} pattern="[0-9]{7,15}" value={form.whatsapp} onChange={(event) => setForm((prev) => ({ ...prev, whatsapp: normalizeSupplierNumberInput(event.target.value, "whatsapp") }))} className="erp-field mt-1 w-full" /></label>
            <label className="text-sm text-slate-700 dark:text-slate-200">{t("supplier.field.email")}<input type="email" inputMode="email" autoComplete="email" maxLength={150} value={form.email} onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))} className="erp-field mt-1 w-full" /></label>
            <div className="space-y-4 rounded-xl border border-sky-100 bg-sky-50/40 p-4 sm:col-span-2 dark:border-slate-800 dark:bg-slate-950/40"><div><h3 className="text-sm font-semibold">{t("supplierOnboarding.productsSection")}</h3><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t("supplierOnboarding.productsDescription")}</p></div><div><label htmlFor="supplier-categories" className="text-sm font-medium">{t("supplierOnboarding.productCategories")}</label><SupplierTagInput id="supplier-categories" value={form.productCategories} onChange={(value) => setForm((prev) => ({ ...prev, productCategories: value }))} disabled={!canManageSupplier || isSaving || isDeleting} /></div><div><label htmlFor="supplier-brands" className="text-sm font-medium">{t("supplierOnboarding.productBrands")}</label><SupplierTagInput id="supplier-brands" value={form.productBrands} onChange={(value) => setForm((prev) => ({ ...prev, productBrands: value }))} disabled={!canManageSupplier || isSaving || isDeleting} /></div></div>
            <section className="space-y-3 rounded-xl border border-sky-100 p-4 sm:col-span-2 dark:border-slate-800"><div><h3 className="text-sm font-semibold">{t("supplierOnboarding.documentsTitle")}</h3><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t("supplierOnboarding.documentsDescription")}</p></div>{item ? <SupplierDocumentList supplierId={item.id} documents={item.documents} /> : null}<SupplierDocumentPicker files={form.documentFiles || []} onChange={(files) => setForm((prev) => ({ ...prev, documentFiles: files }))} disabled={!canManageSupplier || isSaving || isDeleting} /></section>
            <div className="space-y-3 sm:col-span-2">{item ? <SupplierDocumentLinksList links={item.documentLinks} /> : null}<SupplierDocumentLinksEditor links={form.documentLinks || []} onChange={(links) => setForm((prev) => ({ ...prev, documentLinks: links }))} disabled={!canManageSupplier || isSaving || isDeleting} /></div>
            <label className="text-sm text-slate-700 dark:text-slate-200 sm:col-span-2">{t("field.note")}<textarea value={form.notes} onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))} className="erp-field mt-1 min-h-20 w-full" /></label>
            <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200"><input type="checkbox" checked={form.isActive} onChange={(event) => setForm((prev) => ({ ...prev, isActive: event.target.checked }))} />{t("supplier.field.active")}</label>

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
              onClick={() => {
                const inputs = sectionRef.current?.querySelectorAll<HTMLInputElement>("input");
                if (inputs) for (const input of inputs) { if (!input.reportValidity()) return; }
                void onSave?.(form, item);
              }}
              disabled={!canManageSupplier || isSaving || isDeleting || (form.documentLinks || []).some((link) => !link.label.trim() || !isSupplierDocumentUrl(link.url.trim()))}
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
