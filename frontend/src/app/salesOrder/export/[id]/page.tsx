"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { ApiLoadingState } from "../../../_components/api-loading-state";
import { ExportCurrencyValue } from "../../../_components/export-currency-value";
import { useI18n } from "../../../_i18n/provider";
import { ApiRequestError } from "../../../_lib/api-client";
import { formatAppUppercaseDate } from "../../../_lib/date";
import { formatPaymentTermLabel } from "../../../_lib/payment-term";
import { printDocumentWhenFontsReady } from "../../../_lib/print";
import { fetchCustomerById, type CustomerItem } from "../../../customer/_lib/customer";
import { fetchPurchaseOrderById, type PurchaseOrderItem } from "../../_lib/purchase-order";

const companyProfile = {
  name: "CV. PRIMA PUTRA PERKASA",
  addressLines: [
    "Lindeteves Trade Centre Lt. 2 Blok B20 No. 6, Jl. Hayam Wuruk No.127, Jakarta",
    "Tel. 021. 6246441, 62320362",
  ],
};

const paymentProfile = {
  nama: "CV. PRIMA PUTRA PERKASA",
  rekening: "588-511-9945",
  bank: "BCA (CABANG LTC GLODOK)",
};

export default function PurchaseOrderPrintPage() {
  const params = useParams<{ id: string }>();
  const { locale, t } = useI18n();
  const [purchaseOrder, setPurchaseOrder] = useState<PurchaseOrderItem | null>(null);
  const [customer, setCustomer] = useState<CustomerItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const purchaseOrderId = String(params?.id || "").trim();

  useEffect(() => {
    let mounted = true;
    async function loadData() {
      setIsLoading(true);
      setErrorMessage("");
      try {
        const order = await fetchPurchaseOrderById(purchaseOrderId);
        if (!order) throw new Error("not found");
        const customerData = await fetchCustomerById(order.namaCustomer);
        if (mounted) {
          setPurchaseOrder(order);
          setCustomer(customerData);
        }
      } catch (error) {
        if (mounted) setErrorMessage(error instanceof ApiRequestError ? error.message : t("purchaseOrder.print.loadError"));
      } finally {
        if (mounted) setIsLoading(false);
      }
    }
    void loadData();
    return () => { mounted = false; };
  }, [purchaseOrderId, t]);

  useEffect(() => {
    if (!purchaseOrder?.noPo) return;
    const previousTitle = document.title;
    document.title = purchaseOrder.noPo;
    return () => { document.title = previousTitle; };
  }, [purchaseOrder?.noPo]);

  const paymentTermLabel = useMemo(() => formatPaymentTermLabel(
    purchaseOrder?.paymentTerm || { type: "net", netDays: 30, downPaymentPercent: 0, remainingPaymentPercent: 100 },
    { cashBeforeDelivery: t("paymentTerm.cashBeforeDelivery"), cashOnDelivery: t("paymentTerm.cashOnDelivery"), days: t("common.days") }
  ), [purchaseOrder?.paymentTerm, t]);

  return <main className="min-h-screen bg-slate-200/60 px-3 py-4 print:bg-white print:px-0 print:py-0">
    <div className="mx-auto flex w-full max-w-[8.5in] items-center justify-between gap-3 pb-4 print:hidden">
      <div><h1 className="text-lg text-slate-900">{t("purchaseOrder.print.previewTitle")}</h1><p className="text-sm text-slate-600">{t("purchaseOrder.print.previewDescription")}</p></div>
      <button type="button" onClick={printDocumentWhenFontsReady} className="rounded-lg bg-sky-700 px-4 py-2 text-sm font-medium text-white hover:bg-sky-600">{t("common.print")}</button>
    </div>
    {isLoading ? <div className="mx-auto max-w-[8.5in] print:hidden"><ApiLoadingState /></div> : errorMessage || !purchaseOrder ? <section className="mx-auto max-w-[8.5in] rounded-xl border border-red-200 bg-red-50 p-4 text-red-700 print:hidden">{errorMessage || t("purchaseOrder.print.loadError")}</section> :
      <section className="invoice-print-page mx-auto flex h-[11in] min-h-[11in] w-full max-w-[8.5in] flex-col bg-white px-[4mm] py-[1cm] text-[13px] leading-[1.18] text-black shadow-xl print:h-[11in] print:min-h-[11in] print:max-w-none print:shadow-none" style={{ fontFamily: 'var(--font-geist-sans), "Segoe UI", sans-serif' }}>
        <div className="flex items-start justify-between gap-8 pt-3">
          <div className="max-w-[58%]"><p className="text-[17px]">{companyProfile.name}</p>{companyProfile.addressLines.map((line) => <p key={line}>{line}</p>)}</div>
          <div className="shrink-0 pt-2"><div className="grid grid-cols-[86px_12px_1fr] gap-x-1"><span>{t("invoice.export.tanggalLabel")}</span><span>:</span><span>{formatAppUppercaseDate(purchaseOrder.tanggalPo, locale)}</span><span>{t("purchaseOrder.print.noSalesOrder")}</span><span>:</span><span>{purchaseOrder.noPo || "-"}</span></div></div>
        </div>
        <div className="mt-1 border-t-2 border-black pt-1">
          <div className="flex items-center justify-between"><p className="italic">{t("invoice.export.customerLabel")}</p><p className="text-[17px] italic">{t("purchaseOrder.print.title")}</p></div>
          <div className="mt-0.5 grid grid-cols-[50%_1fr] gap-3"><div className="border border-black px-1.5 py-0.5"><p>{String(customer?.nama || "-").toUpperCase()}</p><p>{t("invoice.export.customerNpwpLabel")} : {customer?.npwp || "-"}</p><p className="whitespace-pre-line">{String(customer?.alamat || "-").toUpperCase()}</p></div></div>
        </div>
        <div className="mt-1 min-h-0 flex-1 overflow-hidden border border-black">
          <table className="w-full table-fixed border-collapse"><colgroup><col className="w-[7%]"/><col className="w-[38%]"/><col className="w-[12%]"/><col className="w-[10%]"/><col className="w-[16.5%]"/><col className="w-[16.5%]"/></colgroup>
            <thead><tr className="h-8"><th className="border border-black">NO</th><th className="border border-black">{t("field.namaBarang").toUpperCase()}</th><th className="border border-black">QTY</th><th className="border border-black">{t("field.unit").toUpperCase()}</th><th className="border border-black">{t("field.hargaSatuan").toUpperCase()}</th><th className="border border-black">{t("field.jumlah").toUpperCase()}</th></tr></thead>
            <tbody>{purchaseOrder.barang.map((item, index) => <tr key={`${item.namaBarang}-${index}`} className="align-top"><td className="border-x border-black px-1 py-1 text-center">{index + 1}</td><td className="border-x border-black px-1 py-1">{item.namaBarang}{item.spesifikasi ? <><br/><span>{item.spesifikasi}</span></> : null}</td><td className="border-x border-black px-1 py-1 text-right">{item.kuantitas}</td><td className="border-x border-black px-1 py-1 text-center">{item.unit}</td><td className="border-x border-black px-1 py-1"><ExportCurrencyValue value={item.hargaSatuan} locale={locale}/></td><td className="border-x border-black px-1 py-1"><ExportCurrencyValue value={item.jumlah} locale={locale}/></td></tr>)}</tbody>
          </table>
        </div>
        <div className="mt-2 grid shrink-0 grid-cols-[0.86fr_0.68fr] gap-3">
          <div className="space-y-2"><div className="border border-black px-2 py-1"><p>{t("invoice.export.payment.title")}</p><div className="mt-0.5 grid grid-cols-[52px_10px_1fr] gap-x-1"><span>{t("invoice.export.payment.nameLabel")}</span><span>:</span><span>{paymentProfile.nama}</span><span>{t("invoice.export.payment.accountLabel")}</span><span>:</span><span>{paymentProfile.rekening}</span><span>{t("invoice.export.payment.bankLabel")}</span><span>:</span><span>{paymentProfile.bank}</span></div></div>
            <div><p>{t("invoice.export.noteTitle")}</p><ol className="mt-0.5 list-decimal pl-5 leading-[1.2]"><li>{t("invoice.export.note.1")}</li><li>{t("invoice.export.note.2")}</li><li>{t("invoice.export.note.paymentTerm", { paymentTerm: paymentTermLabel })}</li></ol></div>
          </div>
          <div className="space-y-2"><div className="border border-black"><div className="grid grid-cols-[1fr_150px] border-b border-black"><div className="border-r border-black px-2 py-1">{t("field.subtotal")}</div><div className="px-2 py-1"><ExportCurrencyValue value={purchaseOrder.nominalPo} locale={locale}/></div></div><div className="grid grid-cols-[1fr_150px]"><div className="border-r border-black px-2 py-1">{t("invoice.export.summary.total")}</div><div className="px-2 py-1"><ExportCurrencyValue value={purchaseOrder.nominalPo} locale={locale}/></div></div></div><div className="ml-auto w-[200px] pt-4 text-center"><p>{t("invoice.export.signature.regards")}</p><div className="h-[96px]" /></div></div>
        </div>
      </section>}
  </main>;
}
