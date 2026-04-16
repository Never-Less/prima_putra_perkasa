"use client";

import { useMemo, useState } from "react";
import { useI18n } from "../../_i18n/provider";
import {
  formatRupiah,
  formatTanggal,
  toPurchaseOrderFormState,
  type PurchaseOrderCustomerOption,
  type PurchaseOrderFormState,
  type PurchaseOrderInvoiceOption,
  type PurchaseOrderItem,
} from "../_lib/purchase-order";

type PurchaseOrderEditFormProps = {
  item?: PurchaseOrderItem;
  customerOptions?: PurchaseOrderCustomerOption[];
  invoiceOptions?: PurchaseOrderInvoiceOption[];
  isSaving?: boolean;
  isDeleting?: boolean;
  actionErrorMessage?: string;
  onNewData?: () => void;
  onSave?: (form: PurchaseOrderFormState, selectedItem?: PurchaseOrderItem) => Promise<void> | void;
  onDelete?: (selectedItem: PurchaseOrderItem) => Promise<void> | void;
};

function createEmptyPurchaseOrderFormState(): PurchaseOrderFormState {
  return {
    noPo: "",
    tanggalPo: "",
    namaCustomer: "",
    nominalPo: "0",
    isPaid: false,
    tanggalBayar: "",
    tanggalKirim: "",
    noInvoice: "",
  };
}

export function PurchaseOrderEditForm({
  item,
  customerOptions = [],
  invoiceOptions = [],
  isSaving = false,
  isDeleting = false,
  actionErrorMessage = "",
  onNewData,
  onSave,
  onDelete,
}: PurchaseOrderEditFormProps) {
  const { locale, t } = useI18n();
  const inputPlaceholder = (fieldKey: string) =>
    t("common.placeholder.input", { field: t(fieldKey) });
  const [form, setForm] = useState<PurchaseOrderFormState>(() =>
    item ? toPurchaseOrderFormState(item) : createEmptyPurchaseOrderFormState()
  );

  const customerLabelMap = useMemo(() => {
    return new Map(customerOptions.map((option) => [option.id, option.nama]));
  }, [customerOptions]);

  const invoiceLabelMap = useMemo(() => {
    return new Map(invoiceOptions.map((option) => [option.id, option.noInvoice]));
  }, [invoiceOptions]);

  const previewCustomer = customerLabelMap.get(form.namaCustomer) || form.namaCustomer || "-";
  const previewInvoice = invoiceLabelMap.get(form.noInvoice) || form.noInvoice || "-";

  return (
    <section className="rounded-2xl border border-sky-200 bg-sky-50/40 p-5 shadow-sm dark:border-sky-900/70 dark:bg-slate-950/85">
      <div className="mb-3">
        <h2 className="text-lg font-semibold text-sky-900 dark:text-sky-100">{t("purchaseOrder.form.title")}</h2>
        <p className="text-sm text-sky-800 dark:text-sky-200">{t("purchaseOrder.form.description")}</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-sky-100 bg-white/85 p-4 dark:border-slate-800 dark:bg-slate-900/70">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm text-slate-700 dark:text-slate-200">
              {t("field.noPo")}
              <input
                value={form.noPo}
                onChange={(event) => setForm((prev) => ({ ...prev, noPo: event.target.value }))}
                placeholder={inputPlaceholder("field.noPo")}
                className="mt-1 w-full rounded-lg border border-sky-100 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </label>

            <label className="text-sm text-slate-700 dark:text-slate-200">
              {t("field.tanggalPo")}
              <input
                type="date"
                value={form.tanggalPo}
                onChange={(event) => setForm((prev) => ({ ...prev, tanggalPo: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-sky-100 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </label>

            <label className="text-sm text-slate-700 dark:text-slate-200 sm:col-span-2">
              {t("field.namaCustomer")}
              <select
                value={form.namaCustomer}
                onChange={(event) => setForm((prev) => ({ ...prev, namaCustomer: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-sky-100 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              >
                <option value="">{t("purchaseOrder.form.customerPlaceholder")}</option>
                {customerOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.nama}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm text-slate-700 dark:text-slate-200">
              {t("field.nominalPo")}
              <input
                type="number"
                min={0}
                value={form.nominalPo}
                onChange={(event) => setForm((prev) => ({ ...prev, nominalPo: event.target.value }))}
                placeholder={inputPlaceholder("field.nominalPo")}
                className="mt-1 w-full rounded-lg border border-sky-100 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </label>

            <label className="text-sm text-slate-700 dark:text-slate-200">
              {t("field.isPaid")}
              <select
                value={String(form.isPaid)}
                onChange={(event) => {
                  const isPaid = event.target.value === "true";

                  setForm((prev) => ({
                    ...prev,
                    isPaid,
                    tanggalBayar: isPaid ? prev.tanggalBayar : "",
                  }));
                }}
                className="mt-1 w-full rounded-lg border border-sky-100 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              >
                <option value="true">{t("common.true")}</option>
                <option value="false">{t("common.false")}</option>
              </select>
            </label>

            <label className="text-sm text-slate-700 dark:text-slate-200">
              {t("field.tanggalBayar")}
              <input
                type="date"
                value={form.tanggalBayar}
                disabled={!form.isPaid}
                onChange={(event) => setForm((prev) => ({ ...prev, tanggalBayar: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-sky-100 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm disabled:cursor-not-allowed disabled:bg-sky-100/70 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:disabled:bg-slate-900"
              />
            </label>

            <label className="text-sm text-slate-700 dark:text-slate-200">
              {t("field.tanggalKirim")}
              <input
                type="date"
                value={form.tanggalKirim}
                onChange={(event) => setForm((prev) => ({ ...prev, tanggalKirim: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-sky-100 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </label>

            <label className="text-sm text-slate-700 dark:text-slate-200 sm:col-span-2">
              {t("field.noInvoice")}
              <select
                value={form.noInvoice}
                onChange={(event) => setForm((prev) => ({ ...prev, noInvoice: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-sky-100 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              >
                <option value="">{t("purchaseOrder.form.invoicePlaceholder")}</option>
                {invoiceOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.noInvoice}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-3 grid gap-2 sm:flex sm:flex-wrap">
            <button
              type="button"
              onClick={() => void onSave?.(form, item)}
              disabled={isSaving || isDeleting}
              className="w-full rounded-lg bg-sky-700 px-4 py-2 text-sm font-medium text-white hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-sky-500 dark:text-slate-950 dark:hover:bg-sky-400 sm:w-auto"
            >
              {isSaving ? t("common.loading") : t("common.saveChanges")}
            </button>
            <button
              type="button"
              disabled={isSaving || isDeleting}
              onClick={() => {
                onNewData?.();
                setForm(createEmptyPurchaseOrderFormState());
              }}
              className="w-full rounded-lg border border-sky-300 bg-white px-4 py-2 text-sm text-sky-700 hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-sky-800 dark:bg-slate-900 dark:text-sky-200 dark:hover:bg-slate-800 sm:w-auto"
            >
              {t("common.newData")}
            </button>
            <button
              type="button"
              disabled={isSaving || isDeleting}
              onClick={() => setForm(item ? toPurchaseOrderFormState(item) : createEmptyPurchaseOrderFormState())}
              className="w-full rounded-lg border border-sky-300 bg-white px-4 py-2 text-sm text-sky-700 hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-sky-800 dark:bg-slate-900 dark:text-sky-200 dark:hover:bg-slate-800 sm:w-auto"
            >
              {t("common.resetForm")}
            </button>
            {item ? (
              <button
                type="button"
                onClick={() => void onDelete?.(item)}
                disabled={isSaving || isDeleting}
                className="w-full rounded-lg border border-red-300 bg-white px-4 py-2 text-sm text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-900 dark:bg-slate-900 dark:text-red-300 dark:hover:bg-red-950/40 sm:w-auto"
              >
                {isDeleting ? t("common.loading") : t("common.delete")}
              </button>
            ) : null}
          </div>
          {actionErrorMessage ? (
            <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-200">
              {actionErrorMessage}
            </p>
          ) : null}
        </div>

        <div className="rounded-xl border border-sky-100 bg-sky-100/50 p-4 dark:border-slate-800 dark:bg-slate-900/60">
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{t("purchaseOrder.preview.title")}</p>
          <div className="mt-3 space-y-1 text-sm text-slate-700 dark:text-slate-200">
            <p>
              <span className="text-slate-500 dark:text-slate-400">{t("field.noPo")}:</span> {form.noPo || "-"}
            </p>
            <p>
              <span className="text-slate-500 dark:text-slate-400">{t("field.tanggalPo")}:</span> {formatTanggal(form.tanggalPo || null, locale)}
            </p>
            <p>
              <span className="text-slate-500 dark:text-slate-400">{t("field.namaCustomer")}:</span> {previewCustomer}
            </p>
            <p>
              <span className="text-slate-500 dark:text-slate-400">{t("field.nominalPo")}:</span> {formatRupiah(Number(form.nominalPo || "0"), locale)}
            </p>
            <p>
              <span className="text-slate-500 dark:text-slate-400">{t("field.isPaid")}:</span> {form.isPaid ? t("common.true") : t("common.false")}
            </p>
            <p>
              <span className="text-slate-500 dark:text-slate-400">{t("field.tanggalBayar")}:</span> {formatTanggal(form.tanggalBayar || null, locale)}
            </p>
            <p>
              <span className="text-slate-500 dark:text-slate-400">{t("field.tanggalKirim")}:</span> {formatTanggal(form.tanggalKirim || null, locale)}
            </p>
            <p>
              <span className="text-slate-500 dark:text-slate-400">{t("field.noInvoice")}:</span> {previewInvoice}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
