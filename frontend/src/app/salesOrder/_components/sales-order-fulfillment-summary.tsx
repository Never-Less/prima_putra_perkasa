"use client";

import Link from "next/link";
import { useI18n } from "../../_i18n/provider";
import { formatRupiah, formatTanggal, type PurchaseOrderItem } from "../_lib/purchase-order";

const statusKeys = {
  toDeliver: "salesOrderDashboard.status.toDeliver",
  partlyDelivered: "salesOrderDashboard.status.partlyDelivered",
  deliveredToBilled: "salesOrderDashboard.status.deliveredToBilled",
  partlyBilled: "salesOrderDashboard.status.partlyBilled",
  billed: "salesOrderDashboard.status.billed",
  paid: "salesOrderDashboard.status.paid",
} as const;

export function SalesOrderFulfillmentSummary({ item }: { item: PurchaseOrderItem }) {
  const { locale, t } = useI18n();
  const workflow = item.workflow;

  if (!workflow) return null;

  const outstandingItems = workflow.items.filter(
    (progress) =>
      progress.remainingDeliveryQty > 0 || progress.remainingBillingQty > 0
  );

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            {t("purchaseOrder.workflow.title")}
          </h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {t("purchaseOrder.workflow.description")}
          </p>
        </div>
        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
          {t(statusKeys[workflow.status])}
        </span>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <div className="rounded-lg border border-emerald-100 bg-emerald-50/50 p-3 dark:border-emerald-950 dark:bg-emerald-950/20">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800 dark:text-emerald-300">
            {t("purchaseOrder.workflow.deliveryNotes", { count: workflow.suratJalan.length })}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {workflow.suratJalan.length > 0 ? workflow.suratJalan.map((document) => (
              <Link
                key={document.id}
                href={`/suratJalan/form?id=${encodeURIComponent(document.id)}`}
                className="rounded-md border border-emerald-200 bg-white px-2 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100 dark:border-emerald-900 dark:bg-slate-900 dark:text-emerald-300"
              >
                <span className="underline decoration-emerald-300 underline-offset-2">{document.number}</span>
                <span className="ml-1.5 text-emerald-600/70 dark:text-emerald-400/70">
                  {formatTanggal(document.date, locale)}
                </span>
              </Link>
            )) : (
              <p className="text-xs text-slate-500">{t("purchaseOrder.workflow.noDeliveryNote")}</p>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-indigo-100 bg-indigo-50/50 p-3 dark:border-indigo-950 dark:bg-indigo-950/20">
          <p className="text-xs font-semibold uppercase tracking-wide text-indigo-800 dark:text-indigo-300">
            {t("purchaseOrder.workflow.invoices", { count: workflow.invoices.length })}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {workflow.invoices.length > 0 ? workflow.invoices.map((document) => (
              <Link
                key={document.id}
                href={`/invoice/form?id=${encodeURIComponent(document.id)}`}
                className="rounded-md border border-indigo-200 bg-white px-2 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-100 dark:border-indigo-900 dark:bg-slate-900 dark:text-indigo-300"
              >
                <span className="underline decoration-indigo-300 underline-offset-2">{document.number}</span>
                <span className="ml-1.5 text-indigo-600/70 dark:text-indigo-400/70">
                  {formatTanggal(document.date, locale)}
                </span>
              </Link>
            )) : (
              <p className="text-xs text-slate-500">{t("purchaseOrder.workflow.noInvoice")}</p>
            )}
          </div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
        <div className="rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-900">
          <p className="text-[11px] text-slate-500">{t("purchaseOrder.workflow.orderAmount")}</p>
          <p className="mt-0.5 text-sm font-semibold">{formatRupiah(workflow.billing.orderAmount, locale)}</p>
        </div>
        <div className="rounded-lg bg-indigo-50 px-3 py-2 dark:bg-indigo-950/30">
          <p className="text-[11px] text-indigo-600 dark:text-indigo-300">{t("purchaseOrder.workflow.invoicedAmount")}</p>
          <p className="mt-0.5 text-sm font-semibold">{formatRupiah(workflow.billing.invoicedAmount, locale)}</p>
        </div>
        <div className="rounded-lg bg-amber-50 px-3 py-2 dark:bg-amber-950/30">
          <p className="text-[11px] text-amber-700 dark:text-amber-300">{t("purchaseOrder.workflow.remainingInvoiceAmount")}</p>
          <p className="mt-0.5 text-sm font-semibold">{formatRupiah(workflow.billing.remainingAmount, locale)}</p>
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
        <div className="border-b border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
            {t("purchaseOrder.workflow.outstandingItems")}
          </p>
        </div>
        {outstandingItems.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-xs">
              <thead className="bg-white text-left text-slate-500 dark:bg-slate-950 dark:text-slate-400">
                <tr>
                  <th className="px-3 py-2 font-medium">{t("field.namaBarang")}</th>
                  <th className="px-3 py-2 text-right font-medium">{t("purchaseOrder.workflow.ordered")}</th>
                  <th className="px-3 py-2 text-right font-medium">{t("purchaseOrder.workflow.inDeliveryNote")}</th>
                  <th className="px-3 py-2 text-right font-medium">{t("purchaseOrder.workflow.inInvoice")}</th>
                  <th className="px-3 py-2 text-right font-medium">{t("purchaseOrder.workflow.notDelivered")}</th>
                  <th className="px-3 py-2 text-right font-medium">{t("purchaseOrder.workflow.notBilled")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {outstandingItems.map((progress, index) => (
                  <tr key={`${progress.namaBarang}-${progress.spesifikasi}-${progress.unit}-${index}`}>
                    <td className="px-3 py-2.5">
                      <p className="font-medium text-slate-800 dark:text-slate-100">{progress.namaBarang}</p>
                      {progress.spesifikasi ? <p className="text-slate-500">{progress.spesifikasi}</p> : null}
                    </td>
                    <td className="px-3 py-2.5 text-right">{progress.orderedQty} {progress.unit}</td>
                    <td className="px-3 py-2.5 text-right">{progress.deliveredQty} {progress.unit}</td>
                    <td className="px-3 py-2.5 text-right">{progress.billedQty} {progress.unit}</td>
                    <td className="px-3 py-2.5 text-right font-semibold text-amber-700 dark:text-amber-300">{progress.remainingDeliveryQty} {progress.unit}</td>
                    <td className="px-3 py-2.5 text-right font-semibold text-indigo-700 dark:text-indigo-300">{progress.remainingBillingQty} {progress.unit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="bg-emerald-50 px-3 py-3 text-sm font-medium text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">
            {t("purchaseOrder.workflow.complete")}
          </p>
        )}
      </div>
    </section>
  );
}
