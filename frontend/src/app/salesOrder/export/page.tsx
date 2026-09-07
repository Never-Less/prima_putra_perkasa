"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ApiLoadingState } from "../../_components/api-loading-state";
import { ExportCurrencyValue } from "../../_components/export-currency-value";
import { ApiRequestError } from "../../_lib/api-client";
import { useI18n } from "../../_i18n/provider";
import {
  defaultPurchaseOrderFilter,
  fetchPurchaseOrderExportRows,
  fetchPurchaseOrderOptions,
  formatTanggal,
  type PurchaseOrderFilter,
  type PurchaseOrderItem,
} from "../_lib/purchase-order";

function toSearchFilter(searchParams: URLSearchParams): PurchaseOrderFilter {
  const workflowStatus = String(searchParams.get("workflowStatus") || "").trim();

  return {
    ...defaultPurchaseOrderFilter,
    noPo: String(searchParams.get("noPo") || "").trim(),
    workflowStatus:
      workflowStatus === "withoutSuratJalan" || workflowStatus === "readyForInvoice"
        ? workflowStatus
        : "",
    namaCustomer: String(searchParams.get("namaCustomer") || "").trim(),
    namaBarang: String(searchParams.get("namaBarang") || "").trim(),
    noInvoice: String(searchParams.get("noInvoice") || "").trim(),
    tanggalPoDari: String(searchParams.get("tanggalPoDari") || "").trim(),
    tanggalPoSampai: String(searchParams.get("tanggalPoSampai") || "").trim(),
    tanggalInvoiceDari: String(searchParams.get("tanggalInvoiceDari") || "").trim(),
    tanggalInvoiceSampai: String(searchParams.get("tanggalInvoiceSampai") || "").trim(),
    nominalPoMin: String(searchParams.get("nominalPoMin") || "").trim(),
    nominalPoMax: String(searchParams.get("nominalPoMax") || "").trim(),
  };
}

export default function PurchaseOrderExportPage() {
  const { locale, t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [rows, setRows] = useState<PurchaseOrderItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [customerLabelMap, setCustomerLabelMap] = useState<Map<string, string>>(new Map());
  const [invoiceLabelMap, setInvoiceLabelMap] = useState<Map<string, string>>(new Map());

  const filter = useMemo(() => toSearchFilter(searchParams), [searchParams]);
  const activeFilterEntries = useMemo(() => {
    return [
      ["field.noPo", filter.noPo],
      [
        "field.workflowStatus",
        filter.workflowStatus
          ? t(`purchaseOrder.workflowStatus.${filter.workflowStatus}`)
          : "",
      ],
      ["field.namaCustomer", filter.namaCustomer],
      ["field.namaBarang", filter.namaBarang],
      ["field.noInvoice", filter.noInvoice],
      ["field.tanggalPoDari", filter.tanggalPoDari],
      ["field.tanggalPoSampai", filter.tanggalPoSampai],
      ["field.tanggalInvoiceDari", filter.tanggalInvoiceDari],
      ["field.tanggalInvoiceSampai", filter.tanggalInvoiceSampai],
      ["field.nominalPoMin", filter.nominalPoMin],
      ["field.nominalPoMax", filter.nominalPoMax],
    ].filter((entry) => Boolean(String(entry[1] || "").trim()));
  }, [filter, t]);

  useEffect(() => {
    const previousTitle = document.title;
    document.title = activeFilterEntries.length > 0 ? "purchase-order-export-filtered" : "purchase-order-export";

    return () => {
      document.title = previousTitle;
    };
  }, [activeFilterEntries.length]);

  useEffect(() => {
    let isCancelled = false;

    async function loadExportData() {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const [purchaseOrderRows, options] = await Promise.all([
          fetchPurchaseOrderExportRows(filter),
          fetchPurchaseOrderOptions(),
        ]);

        if (isCancelled) {
          return;
        }

        setRows(purchaseOrderRows);
        setCustomerLabelMap(
          new Map(options.customerOptions.map((option) => [option.id, option.nama]))
        );
        setInvoiceLabelMap(
          new Map(options.invoiceOptions.map((option) => [option.id, option.noInvoice]))
        );
      } catch (error) {
        if (isCancelled) {
          return;
        }

        if (error instanceof ApiRequestError) {
          setErrorMessage(error.message || t("purchaseOrder.apiLoadError"));
        } else {
          setErrorMessage(t("purchaseOrder.apiLoadError"));
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadExportData();

    return () => {
      isCancelled = true;
    };
  }, [filter, t]);

  function handleClosePage() {
    window.close();

    window.setTimeout(() => {
      if (!document.hidden) {
        router.push("/salesOrder");
      }
    }, 150);
  }

  return (
    <>
      <style jsx global>{`
        @page {
          size: letter portrait;
          margin: 12mm;
        }
      `}</style>

      <main className="export-normal-weight min-h-screen bg-slate-100 px-4 py-4 print:bg-white print:px-0 print:py-0">
        <div className="mx-auto max-w-[1400px] space-y-4 print:max-w-none">
          <header className="flex flex-wrap items-start justify-between gap-3 rounded-2xl bg-white p-4 shadow-sm print:hidden">
            <div>
              <h1 className="text-xl text-slate-900">{t("purchaseOrder.exportPage.title")}</h1>
              <p className="mt-1 text-sm text-slate-600">{t("purchaseOrder.exportPage.description")}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="rounded-lg bg-sky-700 px-4 py-2 text-sm text-white hover:bg-sky-600"
              >
                {t("common.print")}
              </button>
              <button
                type="button"
                onClick={handleClosePage}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
              >
                {t("common.close")}
              </button>
            </div>
          </header>

          {isLoading ? <ApiLoadingState /> : null}

          {!isLoading && errorMessage ? (
            <section className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {errorMessage}
            </section>
          ) : null}

          {!isLoading && !errorMessage ? (
            <>
              <section className="space-y-4 rounded-2xl bg-white p-4 shadow-sm print:rounded-none print:p-0 print:shadow-none">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2 className="text-base text-slate-900">
                      {t("purchaseOrder.exportPage.activeFilters")}
                    </h2>
                    <span className="text-sm text-slate-500">
                      {t("purchaseOrder.exportPage.totalRows", { count: rows.length })}
                    </span>
                  </div>

                  {activeFilterEntries.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {activeFilterEntries.map(([fieldKey, value]) => (
                        <span
                          key={`${fieldKey}-${value}`}
                          className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs text-sky-800"
                        >
                          {t(fieldKey)}: {value}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-600">{t("purchaseOrder.exportPage.allData")}</p>
                  )}
                </div>

                {rows.length === 0 ? (
                  <div className="rounded-xl border border-slate-200 px-4 py-6 text-center text-sm text-slate-500">
                    {t("purchaseOrder.exportPage.empty")}
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-slate-300 print:overflow-visible">
                    <table className="w-full table-fixed border-collapse text-sm text-slate-800 print:text-[11px]">
                      <colgroup>
                        <col style={{ width: "13%" }} />
                        <col style={{ width: "11%" }} />
                        <col style={{ width: "19%" }} />
                        <col style={{ width: "11%" }} />
                        <col style={{ width: "12%" }} />
                        <col style={{ width: "13%" }} />
                      </colgroup>
                      <thead className="bg-slate-100">
                        <tr>
                          <th className="border border-slate-300 px-3 py-2 text-left print:px-2 print:py-1.5">{t("field.noPo")}</th>
                          <th className="border border-slate-300 px-3 py-2 text-left print:px-2 print:py-1.5">{t("field.tanggalPo")}</th>
                          <th className="border border-slate-300 px-3 py-2 text-left print:px-2 print:py-1.5">{t("field.namaCustomer")}</th>
                          <th className="border border-slate-300 px-3 py-2 text-left print:px-2 print:py-1.5">{t("field.nominalPo")}</th>
                          <th className="border border-slate-300 px-3 py-2 text-left print:px-2 print:py-1.5">{t("field.tanggalInvoice")}</th>
                          <th className="border border-slate-300 px-3 py-2 text-left print:px-2 print:py-1.5">{t("field.noInvoice")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((row, index) => {
                          const customerLabel =
                            customerLabelMap.get(row.namaCustomer) || row.namaCustomer || "-";
                          const invoiceLabel =
                            invoiceLabelMap.get(row.noInvoice) || row.noInvoice || "-";
                          return (
                            <tr key={row.id} className={index % 2 ? "bg-slate-50" : "bg-white"}>
                              <td className="truncate border border-slate-300 px-3 py-2 align-top print:px-2 print:py-1.5" title={row.noPo || "-"}>
                                {row.noPo || "-"}
                              </td>
                              <td className="truncate border border-slate-300 px-3 py-2 align-top print:px-2 print:py-1.5">
                                {formatTanggal(row.tanggalPo, locale)}
                              </td>
                              <td className="truncate border border-slate-300 px-3 py-2 align-top print:px-2 print:py-1.5" title={customerLabel}>
                                {customerLabel}
                              </td>
                              <td className="whitespace-nowrap border border-slate-300 px-3 py-2 align-top print:px-2 print:py-1.5">
                                <ExportCurrencyValue value={row.nominalPo} locale={locale} />
                              </td>
                              <td className="truncate border border-slate-300 px-3 py-2 align-top print:px-2 print:py-1.5">
                                {formatTanggal(row.tanggalInvoice, locale)}
                              </td>
                              <td className="truncate border border-slate-300 px-3 py-2 align-top print:px-2 print:py-1.5" title={invoiceLabel}>
                                {invoiceLabel}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

            </>
          ) : null}
        </div>
      </main>
    </>
  );
}

