"use client";

import { useMemo, useState } from "react";
import { AppDateInput } from "../../_components/app-date-input";
import {
  requestUnsavedChangesConfirmation,
  serializeUnsavedChangesValue,
  useUnsavedChangesWarning,
} from "../../_hooks/use-unsaved-changes-warning";
import { useI18n } from "../../_i18n/provider";
import {
  calculatePurchaseOrderBarangTotal,
  createEmptyPurchaseOrderBarangRow,
  ensureTrailingEmptyPurchaseOrderBarangRow,
  formatRupiah,
  formatTanggal,
  purchaseOrderBarangRowsToList,
  toPurchaseOrderFormState,
  type PurchaseOrderBarangFormRow,
  type PurchaseOrderCustomerOption,
  type PurchaseOrderFormState,
  type PurchaseOrderInvoiceOption,
  type PurchaseOrderItem,
} from "../_lib/purchase-order";
import { PurchaseOrderBarangSpreadsheet } from "./purchase-order-barang-spreadsheet";
import { DocumentAuditLog } from "../../_components/document-audit-log";
import { defaultPaymentTerm, formatPaymentTermLabel, normalizePaymentTerm, type PaymentTermType } from "../../_lib/payment-term";

type PurchaseOrderEditFormProps = {
  item?: PurchaseOrderItem;
  customerOptions?: PurchaseOrderCustomerOption[];
  invoiceOptions?: PurchaseOrderInvoiceOption[];
  isSaving?: boolean;
  isDeleting?: boolean;
  actionErrorMessage?: string;
  isShortcutLoading?: boolean;
  onSave?: (form: PurchaseOrderFormState, selectedItem?: PurchaseOrderItem) => Promise<void> | void;
  onNewData?: () => void;
  onDelete?: (selectedItem: PurchaseOrderItem) => Promise<void> | void;
  onCreateSuratJalan?: (selectedItem: PurchaseOrderItem) => Promise<void> | void;
  onCreateInvoice?: (selectedItem: PurchaseOrderItem) => Promise<void> | void;
  onPrint?: (selectedItem: PurchaseOrderItem) => void;
};

function createEmptyPurchaseOrderFormState(): PurchaseOrderFormState {
  return {
    noPo: "",
    tanggalPo: "",
    namaCustomer: "",
    nominalPo: "0",
    barangRows: ensureTrailingEmptyPurchaseOrderBarangRow([
      createEmptyPurchaseOrderBarangRow(),
    ]),
    paymentTerm: { ...defaultPaymentTerm },
    tanggalInvoice: "",
    noInvoice: "",
  };
}

function createPurchaseOrderDirtyValue(form: PurchaseOrderFormState) {
  const { barangRows, ...restForm } = form;

  return {
    ...restForm,
    barang: purchaseOrderBarangRowsToList(barangRows),
  };
}

export function PurchaseOrderEditForm({
  item,
  customerOptions = [],
  invoiceOptions = [],
  isSaving = false,
  isDeleting = false,
  actionErrorMessage = "",
  isShortcutLoading = false,
  onSave,
  onNewData,
  onDelete,
  onCreateSuratJalan,
  onCreateInvoice,
  onPrint,
}: PurchaseOrderEditFormProps) {
  const { locale, t } = useI18n();
  const inputPlaceholder = (fieldKey: string) =>
    t("common.placeholder.input", { field: t(fieldKey) });
  const baselineForm = useMemo(
    () => (item ? toPurchaseOrderFormState(item) : createEmptyPurchaseOrderFormState()),
    [item]
  );
  const [form, setForm] = useState<PurchaseOrderFormState>(() => baselineForm);
  const isDirty =
    serializeUnsavedChangesValue(createPurchaseOrderDirtyValue(form)) !==
    serializeUnsavedChangesValue(createPurchaseOrderDirtyValue(baselineForm));

  useUnsavedChangesWarning(
    isDirty && !isSaving && !isDeleting,
    t("common.unsavedChangesWarning")
  );

  const handleNewData = async () => {
    const canLeave = await requestUnsavedChangesConfirmation(t("common.unsavedChangesWarning"));

    if (!canLeave) {
      return;
    }

    setForm(createEmptyPurchaseOrderFormState());
    onNewData?.();
  };

  const customerLabelMap = useMemo(() => {
    return new Map(customerOptions.map((option) => [option.id, option.nama]));
  }, [customerOptions]);

  const invoiceLabelMap = useMemo(() => {
    return new Map(invoiceOptions.map((option) => [option.id, option.noInvoice]));
  }, [invoiceOptions]);

  const previewCustomer = customerLabelMap.get(form.namaCustomer) || form.namaCustomer || "-";
  const previewInvoice = invoiceLabelMap.get(form.noInvoice) || form.noInvoice || "-";
  const barangList = useMemo(() => purchaseOrderBarangRowsToList(form.barangRows), [form.barangRows]);
  const paymentTermLabel = formatPaymentTermLabel(form.paymentTerm, {
    cashBeforeDelivery: t("paymentTerm.cashBeforeDelivery"),
    cashOnDelivery: t("paymentTerm.cashOnDelivery"),
    days: t("common.days"),
  });

  function updateBarangRows(rows: PurchaseOrderBarangFormRow[]) {
    const nextRows = ensureTrailingEmptyPurchaseOrderBarangRow(rows);
    const nextBarang = purchaseOrderBarangRowsToList(nextRows);
    const nextTotal = calculatePurchaseOrderBarangTotal(nextBarang);

    setForm((prev) => ({
      ...prev,
      barangRows: nextRows,
      nominalPo: nextBarang.length > 0 ? String(nextTotal) : prev.nominalPo,
    }));
  }

  return (
    <section className="ppp-form-view rounded-2xl border border-sky-200 bg-sky-50/40 p-5 shadow-sm dark:border-sky-900/70 dark:bg-slate-950/85">
      <div className="mb-3">
        <h2 className="text-lg font-semibold text-sky-900 dark:text-sky-100">{t("purchaseOrder.form.title")}</h2>
        <p className="text-sm text-sky-800 dark:text-sky-200">{t("purchaseOrder.form.description")}</p>
      </div>

      <div className="space-y-4">
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
                <AppDateInput
                  value={form.tanggalPo}
                  onValueChange={(value) => setForm((prev) => ({ ...prev, tanggalPo: value }))}
                  className="mt-1 w-full rounded-lg border border-sky-100 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
            </label>

            <label className="text-sm text-slate-700 dark:text-slate-200 sm:col-span-2">
              {t("field.namaCustomer")}
              <select
                value={form.namaCustomer}
                onChange={(event) => {
                  const namaCustomer = event.target.value;
                  const customer = customerOptions.find((option) => option.id === namaCustomer);
                  setForm((prev) => ({
                    ...prev,
                    namaCustomer,
                    paymentTerm: customer
                      ? normalizePaymentTerm(customer.defaultPaymentTerm)
                      : prev.paymentTerm,
                  }));
                }}
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

            <div className="rounded-lg border border-sky-100 p-3 dark:border-slate-700 sm:col-span-2">
              <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{t("field.paymentTerm")}</p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t("purchaseOrder.form.paymentTermHint")}</p>
              <div className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <label className="text-sm text-slate-700 dark:text-slate-200">{t("field.paymentTermType")}
                  <select value={form.paymentTerm.type} onChange={(event) => { const type = event.target.value as PaymentTermType; setForm((prev) => ({ ...prev, paymentTerm: type === "dpNet" ? { type, netDays: 30, downPaymentPercent: 30, remainingPaymentPercent: 70 } : type === "net" ? { type, netDays: 30, downPaymentPercent: 0, remainingPaymentPercent: 100 } : { type, netDays: 0, downPaymentPercent: 0, remainingPaymentPercent: 100 } })); }} className="mt-1 w-full rounded-lg border border-sky-100 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800">
                    <option value="net">Net</option><option value="cashBeforeDelivery">{t("paymentTerm.cashBeforeDelivery")}</option><option value="cashOnDelivery">{t("paymentTerm.cashOnDelivery")}</option><option value="dpNet">{t("paymentTerm.dpNet")}</option>
                  </select>
                </label>
                {(form.paymentTerm.type === "net" || form.paymentTerm.type === "dpNet") ? <label className="text-sm text-slate-700 dark:text-slate-200">{t("field.netDays")}<input type="number" min={0} max={3650} value={form.paymentTerm.netDays} onChange={(event) => setForm((prev) => ({ ...prev, paymentTerm: { ...prev.paymentTerm, netDays: Number(event.target.value) } }))} className="mt-1 w-full rounded-lg border border-sky-100 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" /></label> : null}
                {form.paymentTerm.type === "dpNet" ? <><label className="text-sm text-slate-700 dark:text-slate-200">{t("field.downPaymentPercent")}<input type="number" min={1} max={99} value={form.paymentTerm.downPaymentPercent} onChange={(event) => { const dp = Number(event.target.value); setForm((prev) => ({ ...prev, paymentTerm: { ...prev.paymentTerm, downPaymentPercent: dp, remainingPaymentPercent: 100 - dp } })); }} className="mt-1 w-full rounded-lg border border-sky-100 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" /></label><label className="text-sm text-slate-700 dark:text-slate-200">{t("field.remainingPaymentPercent")}<input readOnly value={form.paymentTerm.remainingPaymentPercent} className="mt-1 w-full rounded-lg border border-sky-100 bg-slate-100 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900" /></label></> : null}
              </div>
            </div>

            <label className="text-sm text-slate-700 dark:text-slate-200">
              {t("field.nominalPo")}
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {t("purchaseOrder.form.nominalFromItems")}
              </p>
              <input
                type="number"
                min={0}
                value={form.nominalPo}
                readOnly
                placeholder={inputPlaceholder("field.nominalPo")}
                className="mt-1 w-full cursor-not-allowed rounded-lg border border-sky-100 bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-900 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              />
            </label>

            <label className="text-sm text-slate-700 dark:text-slate-200">
              {t("field.tanggalInvoice")}
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {t("purchaseOrder.form.autoFilledFromInvoice")}
              </p>
                <AppDateInput
                  value={form.tanggalInvoice}
                  onValueChange={() => undefined}
                  disabled={true}
                  readOnly={true}
                  className="mt-1 w-full rounded-lg border border-sky-100 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm disabled:cursor-not-allowed disabled:bg-sky-100/70 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:disabled:bg-slate-900"
                />
            </label>

            <label className="text-sm text-slate-700 dark:text-slate-200 sm:col-span-2">
              {t("field.noInvoice")}
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {t("purchaseOrder.form.autoFilledFromInvoice")}
              </p>
              <select
                value={form.noInvoice}
                disabled={true}
                className="mt-1 w-full rounded-lg border border-sky-100 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm disabled:cursor-not-allowed disabled:bg-sky-100/70 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:disabled:bg-slate-900"
              >
                <option value="">{t("purchaseOrder.form.invoicePlaceholder")}</option>
                {invoiceOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.noInvoice}
                  </option>
                ))}
              </select>
            </label>

            <div className="text-sm text-slate-700 dark:text-slate-200 sm:col-span-2">
              <p>{t("purchaseOrder.form.items.title")}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t("purchaseOrder.form.items.hint")}
              </p>
              <PurchaseOrderBarangSpreadsheet
                rows={form.barangRows}
                disabled={isSaving || isDeleting}
                onRowsChange={updateBarangRows}
              />
            </div>
          </div>

          <div className="mt-3 grid gap-2 sm:flex sm:flex-wrap">
            <button
              type="button"
              onClick={() => void onSave?.(form, item)}
              disabled={isSaving || isDeleting || isShortcutLoading}
              className="w-full rounded-lg bg-sky-700 px-4 py-2 text-sm font-medium text-white hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-sky-500 dark:text-slate-950 dark:hover:bg-sky-400 sm:w-auto"
            >
              {isSaving ? t("common.loading") : t("common.saveChanges")}
            </button>
            <button
              type="button"
              disabled={isSaving || isDeleting || isShortcutLoading}
              onClick={() => void handleNewData()}
              className="w-full rounded-lg border border-sky-300 bg-white px-4 py-2 text-sm text-sky-700 hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-sky-800 dark:bg-slate-900 dark:text-sky-200 dark:hover:bg-slate-800 sm:w-auto"
            >
              {t("common.newData")}
            </button>
            <button
              type="button"
              disabled={isSaving || isDeleting || isShortcutLoading}
              onClick={() => setForm(baselineForm)}
              className="w-full rounded-lg border border-sky-300 bg-white px-4 py-2 text-sm text-sky-700 hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-sky-800 dark:bg-slate-900 dark:text-sky-200 dark:hover:bg-slate-800 sm:w-auto"
            >
              {t("common.resetForm")}
            </button>
            {item ? (
              <>
                <button
                  type="button"
                  onClick={() => onPrint?.(item)}
                  disabled={isSaving || isDeleting || isShortcutLoading}
                  className="w-full rounded-lg border border-sky-300 bg-white px-4 py-2 text-sm font-medium text-sky-700 hover:bg-sky-50 disabled:opacity-60 dark:border-sky-800 dark:bg-slate-900 dark:text-sky-200 sm:w-auto"
                >{t("common.print")}</button>
                <button
                  type="button"
                  onClick={() => void onCreateSuratJalan?.(item)}
                  disabled={isSaving || isDeleting || isShortcutLoading}
                  className="w-full rounded-lg border border-emerald-300 bg-white px-4 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-emerald-900 dark:bg-slate-900 dark:text-emerald-300 dark:hover:bg-emerald-950/40 sm:w-auto"
                >
                  {isShortcutLoading ? t("common.loading") : t("purchaseOrder.shortcut.createSuratJalan")}
                </button>
                <button
                  type="button"
                  onClick={() => void onCreateInvoice?.(item)}
                  disabled={isSaving || isDeleting || isShortcutLoading}
                  className="w-full rounded-lg border border-indigo-300 bg-white px-4 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-indigo-900 dark:bg-slate-900 dark:text-indigo-300 dark:hover:bg-indigo-950/40 sm:w-auto"
                >
                  {isShortcutLoading ? t("common.loading") : t("purchaseOrder.shortcut.createInvoice")}
                </button>
                <button
                  type="button"
                  onClick={() => void onDelete?.(item)}
                  disabled={isSaving || isDeleting || isShortcutLoading}
                  className="w-full rounded-lg border border-red-300 bg-white px-4 py-2 text-sm text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-900 dark:bg-slate-900 dark:text-red-300 dark:hover:bg-red-950/40 sm:w-auto"
                >
                  {isDeleting ? t("common.loading") : t("common.delete")}
                </button>
              </>
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
            <p><span className="text-slate-500 dark:text-slate-400">{t("field.paymentTerm")}:</span> {paymentTermLabel}</p>
            <p>
              <span className="text-slate-500 dark:text-slate-400">{t("field.tanggalInvoice")}:</span> {formatTanggal(form.tanggalInvoice || null, locale)}
            </p>
            <p>
              <span className="text-slate-500 dark:text-slate-400">{t("field.noInvoice")}:</span> {previewInvoice}
            </p>
          </div>

          <div className="mt-3 rounded-lg border border-sky-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">
              {t("field.barang")}
            </p>
            {barangList.length > 0 ? (
              <ul className="space-y-1 text-sm text-slate-700 dark:text-slate-200">
                {barangList.map((barang, index) => (
                  <li key={`purchase-order-preview-barang-${index}`}>
                    {barang.spesifikasi
                      ? `${barang.namaBarang} (${barang.spesifikasi})`
                      : barang.namaBarang}
                    : {barang.kuantitas} {barang.unit} x{" "}
                    {formatRupiah(barang.hargaSatuan, locale)} ={" "}
                    {formatRupiah(barang.jumlah, locale)}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {t("common.noItems")}
              </p>
            )}
          </div>
        </div>
      </div>
      {item && item.revision > 0 ? (
        <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100">
          <p className="font-semibold">{t("purchaseOrder.revision.title", { revision: item.revision })}</p>
          <p className="mt-1">{t("purchaseOrder.revision.impact", { suratJalan: item.revisionHistory[0]?.affectedSuratJalan || 0, invoices: item.revisionHistory[0]?.affectedInvoices || 0 })}</p>
          <p className="mt-1 text-xs">{t("purchaseOrder.revision.hint")}</p>
        </div>
      ) : null}
      {item ? <DocumentAuditLog entityType="purchaseOrder" entityId={item.id} /> : null}
    </section>
  );
}
