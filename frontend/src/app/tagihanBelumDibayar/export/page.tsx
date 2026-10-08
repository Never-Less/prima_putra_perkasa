"use client";

import { usePageTitle } from "../../_hooks/use-page-title";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ApiLoadingState } from "../../_components/api-loading-state";
import { ExportCurrencyValue } from "../../_components/export-currency-value";
import { useI18n } from "../../_i18n/provider";
import { ApiRequestError, requestApi } from "../../_lib/api-client";
import { fetchCustomerRows } from "../../customer/_lib/customer";
import {
  formatTanggal,
  toInvoiceItem,
  type InvoiceItem,
} from "../../invoice/_lib/invoice";

type OutstandingResponse = {
  invoices?: unknown[];
};

type ExportOutstandingInvoice = InvoiceItem & {
  customerName: string;
};

type MonthlyOutstandingGroup = {
  key: string;
  rows: ExportOutstandingInvoice[];
  total: number;
};

type CustomerOutstandingGroup = {
  key: string;
  customerName: string;
  monthlyGroups: MonthlyOutstandingGroup[];
  total: number;
};

function buildMonthlyGroups(rows: ExportOutstandingInvoice[]) {
  const map = new Map<string, MonthlyOutstandingGroup>();

  rows.forEach((row) => {
    const key = String(row.tanggal || "").slice(0, 7);
    if (!key) return;

    const current = map.get(key);
    if (current) {
      current.rows.push(row);
      current.total += Number(row.grandTotal || 0);
      return;
    }

    map.set(key, {
      key,
      rows: [row],
      total: Number(row.grandTotal || 0),
    });
  });

  return Array.from(map.values()).sort((left, right) => left.key.localeCompare(right.key));
}

function formatMonthLabel(value: string, locale: "id" | "en") {
  const [year, month] = value.split("-").map(Number);

  if (!year || !month) return value;

  return new Intl.DateTimeFormat(locale === "en" ? "en-US" : "id-ID", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}

export default function OutstandingExportPage() {
  const { locale, t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const year = String(searchParams.get("year") || "").trim();
  const customerId = String(searchParams.get("customerId") || "").trim();
  const isAllCustomers = customerId === "all";
  const [rows, setRows] = useState<ExportOutstandingInvoice[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  usePageTitle("outstanding.exportPage.title", year);

  useEffect(() => {
    let isCancelled = false;

    async function loadExportData() {
      setIsLoading(true);
      setErrorMessage("");

      if (!/^\d{4}$/.test(year) || !customerId) {
        setRows([]);
        setErrorMessage(t("outstanding.exportPage.invalidFilter"));
        setIsLoading(false);
        return;
      }

      try {
        const [response, customers] = await Promise.all([
          requestApi<OutstandingResponse>(
            isAllCustomers
              ? "/api/invoices/outstanding"
              : `/api/invoices/outstanding?customerId=${encodeURIComponent(customerId)}`
          ),
          fetchCustomerRows(),
        ]);

        if (isCancelled) return;

        const customer = customers.find((item) => item.id === customerId);
        if (!isAllCustomers && !customer) {
          setRows([]);
          setErrorMessage(t("outstanding.exportPage.invalidFilter"));
          return;
        }

        const customerLabelMap = new Map(customers.map((item) => [item.id, item.nama]));
        const invoiceRows = Array.isArray(response?.invoices)
          ? response.invoices
              .map(toInvoiceItem)
              .filter((item): item is InvoiceItem => Boolean(item))
              .filter((item) => String(item.tanggal || "").startsWith(`${year}-`))
              .map((item) => ({
                ...item,
                customerName: customerLabelMap.get(item.idCustomer) || item.idCustomer || "-",
              }))
              .sort((left, right) => {
                const dateCompare = left.tanggal.localeCompare(right.tanggal);
                const customerCompare = left.customerName.localeCompare(right.customerName);
                return dateCompare || customerCompare || left.noInvoice.localeCompare(
                  right.noInvoice,
                  undefined,
                  { numeric: true, sensitivity: "base" }
                );
              })
          : [];

        setCustomerName(
          isAllCustomers ? t("outstanding.exportModal.allCustomers") : customer?.nama || "-"
        );
        setRows(invoiceRows);
      } catch (error) {
        if (isCancelled) return;

        setRows([]);
        setErrorMessage(
          error instanceof ApiRequestError
            ? error.message || t("outstanding.exportPage.loadError")
            : t("outstanding.exportPage.loadError")
        );
      } finally {
        if (!isCancelled) setIsLoading(false);
      }
    }

    void loadExportData();
    return () => {
      isCancelled = true;
    };
  }, [customerId, isAllCustomers, t, year]);

  const customerGroups = useMemo<CustomerOutstandingGroup[]>(() => {
    if (!isAllCustomers) {
      const monthlyGroups = buildMonthlyGroups(rows);
      return [{
        key: customerId,
        customerName,
        monthlyGroups,
        total: monthlyGroups.reduce((total, group) => total + group.total, 0),
      }];
    }

    const map = new Map<string, ExportOutstandingInvoice[]>();
    rows.forEach((row) => {
      const key = row.idCustomer || row.customerName;
      map.set(key, [...(map.get(key) || []), row]);
    });

    return Array.from(map.entries())
      .map(([key, customerRows]) => {
        const monthlyGroups = buildMonthlyGroups(customerRows);
        return {
          key,
          customerName: customerRows[0]?.customerName || "-",
          monthlyGroups,
          total: monthlyGroups.reduce((total, group) => total + group.total, 0),
        };
      })
      .sort((left, right) => left.customerName.localeCompare(right.customerName));
  }, [customerId, customerName, isAllCustomers, rows]);

  const grandTotal = useMemo(
    () => customerGroups.reduce((total, group) => total + group.total, 0),
    [customerGroups]
  );

  function handleClosePage() {
    window.close();
    window.setTimeout(() => {
      if (!document.hidden) router.push("/tagihanBelumDibayar");
    }, 150);
  }

  return (
    <>
      <style jsx global>{`
        @page {
          size: A4 portrait;
          margin: 12mm;
        }
      `}</style>

      <main className="export-normal-weight min-h-screen bg-slate-100 px-4 py-4 print:bg-white print:px-0 print:py-0">
        <div className="mx-auto max-w-[1000px] space-y-4 print:max-w-none">
          <header className="sticky top-0 z-50 flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-sm backdrop-blur print:hidden">
            <div>
              <h1 className="text-xl text-slate-900">{t("outstanding.exportPage.title")}</h1>
              <p className="mt-1 text-sm text-slate-600">{t("outstanding.exportPage.description")}</p>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => window.print()} className="rounded-lg bg-sky-700 px-4 py-2 text-sm text-white hover:bg-sky-600">
                {t("common.print")}
              </button>
              <button type="button" onClick={handleClosePage} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
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
            <section className="rounded-2xl bg-white p-6 text-slate-950 shadow-sm print:rounded-none print:p-0 print:shadow-none">
              <div className="text-center">
                <h2 className="text-lg font-semibold uppercase">{t("outstanding.exportPage.reportTitle")}</h2>
                <p className="mt-1 text-sm font-medium uppercase">{customerName}</p>
                <p className="text-sm">{t("outstanding.exportPage.yearPeriod", { year })}</p>
              </div>

              {rows.length === 0 ? (
                <p className="mt-8 border border-slate-300 px-4 py-8 text-center text-sm text-slate-500">
                  {t("outstanding.exportPage.empty")}
                </p>
              ) : (
                <div className="mt-7 space-y-7">
                  {customerGroups.map((customerGroup) => (
                    <section key={customerGroup.key} className="space-y-5">
                      {isAllCustomers ? (
                        <h3 className="border-b-2 border-slate-700 pb-2 text-base font-semibold uppercase">
                          {customerGroup.customerName}
                        </h3>
                      ) : null}

                      {customerGroup.monthlyGroups.map((group) => (
                        <section key={`${customerGroup.key}-${group.key}`} className="break-inside-avoid">
                          <h4 className="mb-2 text-sm font-semibold uppercase">
                            {formatMonthLabel(group.key, locale)}
                          </h4>
                          <table className="w-full table-fixed border-collapse text-sm">
                            <colgroup>
                              <col style={{ width: "26%" }} />
                              <col style={{ width: "34%" }} />
                              <col style={{ width: "40%" }} />
                            </colgroup>
                            <thead>
                              <tr className="bg-slate-100 print:bg-transparent">
                                <th className="border border-slate-400 px-3 py-2 text-left">{t("field.tanggalInvoice")}</th>
                                <th className="border border-slate-400 px-3 py-2 text-left">{t("field.noInvoice")}</th>
                                <th className="border border-slate-400 px-3 py-2 text-right">{t("field.jumlah")}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {group.rows.map((row) => (
                                <tr key={row.id}>
                                  <td className="border border-slate-400 px-3 py-2">{formatTanggal(row.tanggal, locale)}</td>
                                  <td className="border border-slate-400 px-3 py-2">{row.noInvoice || "-"}</td>
                                  <td className="border border-slate-400 px-3 py-2">
                                    <ExportCurrencyValue value={row.grandTotal} locale={locale} />
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot>
                              <tr>
                                <td colSpan={2} className="border border-slate-400 px-3 py-2 text-right font-semibold">
                                  {t("outstanding.exportPage.monthTotal")}
                                </td>
                                <td className="border border-slate-400 px-3 py-2 font-semibold">
                                  <ExportCurrencyValue value={group.total} locale={locale} />
                                </td>
                              </tr>
                            </tfoot>
                          </table>
                        </section>
                      ))}

                      {isAllCustomers ? (
                        <div className="ml-auto grid w-full max-w-md grid-cols-[1fr_1fr] border border-slate-500 text-sm font-semibold">
                          <span className="border-r border-slate-500 px-3 py-2">{t("outstanding.exportPage.customerTotal")}</span>
                          <span className="px-3 py-2"><ExportCurrencyValue value={customerGroup.total} locale={locale} /></span>
                        </div>
                      ) : null}
                    </section>
                  ))}

                  <div className="ml-auto grid w-full max-w-md grid-cols-[1fr_1fr] border border-slate-500 text-sm font-semibold">
                    <span className="border-r border-slate-500 px-3 py-2">{t("outstanding.exportPage.yearTotal")}</span>
                    <span className="px-3 py-2"><ExportCurrencyValue value={grandTotal} locale={locale} /></span>
                  </div>
                </div>
              )}
            </section>
          ) : null}
        </div>
      </main>
    </>
  );
}
