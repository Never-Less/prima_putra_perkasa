"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PackingListSelectionTable } from "../../_components/packing-list-selection-table";
import { ApiLoadingState } from "../../../_components/api-loading-state";
import { useI18n } from "../../../_i18n/provider";
import { usePageTitle } from "../../../_hooks/use-page-title";
import { buildListRouteWithPagination, normalizeReturnPaginationQueryState } from "../../../_lib/pagination";
import { printDocumentWhenFontsReady } from "../../../_lib/print";
import { fetchCustomerById, type CustomerItem } from "../../../customer/_lib/customer";
import { fetchSuratJalanById, formatTanggal, sortSuratJalanBarangByUrutan, type SuratJalanItem } from "../../_lib/surat-jalan";

type PackingData = {
  key: string;
  rows: SuratJalanItem[];
  customers: Map<string, CustomerItem>;
  error: string;
};

export default function PackingListPage() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const idsKey = Array.from(new Set((searchParams.get("packingIds") || "").split(",").filter(Boolean))).join(",");
  const ids = useMemo(() => idsKey ? idsKey.split(",") : [], [idsKey]);
  const [data, setData] = useState<PackingData | null>(null);
  const [retry, setRetry] = useState(0);
  const isLoading = ids.length > 0 && data?.key !== idsKey;
  const rows = data?.key === idsKey ? data.rows : [];
  const customers = data?.key === idsKey ? data.customers : new Map<string, CustomerItem>();
  const error = data?.key === idsKey ? data.error : "";
  const canPrint = !isLoading && !error && rows.length > 0;

  usePageTitle("packingList.title");

  useEffect(() => {
    let active = true;
    if (!ids.length) return;

    async function load() {
      try {
        const results = await Promise.all(ids.map(fetchSuratJalanById));
        if (results.some((row) => !row)) throw new Error("missing");
        const documents = results.filter((row): row is SuratJalanItem => Boolean(row));
        const customerIds = Array.from(new Set(documents.map((row) => row.idCustomer)));
        const customerResults = await Promise.all(customerIds.map(fetchCustomerById));
        if (customerResults.some((customer) => !customer)) throw new Error("missing");
        const customerMap = new Map<string, CustomerItem>();
        customerResults.forEach((customer) => {
          if (customer) customerMap.set(customer.id, customer);
        });
        if (active) setData({ key: idsKey, rows: documents, customers: customerMap, error: "" });
      } catch (err) {
        if (active) setData({
          key: idsKey, rows: [], customers: new Map(),
          error: err instanceof Error && err.message === "missing" ? "packingList.missing" : "packingList.loadError",
        });
      }
    }
    void load();
    return () => { active = false; };
  }, [ids, idsKey, retry]);

  function changeSelection(selectedIds: string[]) {
    const query = new URLSearchParams(searchParams.toString());
    if (selectedIds.length) query.set("packingIds", selectedIds.join(","));
    else query.delete("packingIds");
    router.push(`/suratJalan/export/packing-list?${query.toString()}`, { scroll: false });
  }

  function backToList() {
    const listState = Object.fromEntries(Array.from(searchParams.entries()).filter(
      ([key]) => !key.startsWith("packing") && !["returnPage", "returnLimit", "id"].includes(key),
    ));
    router.push(buildListRouteWithPagination("/suratJalan", normalizeReturnPaginationQueryState({
      returnPage: searchParams.get("returnPage"), returnLimit: searchParams.get("returnLimit"),
    }, { page: 1, limit: 10 }), listState));
  }

  const summary = t("packingList.summary", {
    documents: rows.length,
    customers: new Set(rows.map((row) => row.idCustomer)).size,
    items: rows.reduce((total, row) => total + row.barang.length, 0),
  });

  return (
    <main className="packing-list-page min-h-screen bg-slate-100 px-3 py-5 text-slate-950 dark:bg-slate-950 dark:text-slate-100 print:bg-white print:p-0 print:text-black">
      <div className="mx-auto mb-5 max-w-7xl space-y-4 print:hidden">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold">{t("packingList.title")}</h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{t("packingList.description")}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="erp-button" onClick={backToList}>{t("packingList.back")}</button>
            <button type="button" className="erp-button erp-button-primary" disabled={!canPrint} onClick={() => void printDocumentWhenFontsReady()}>
              {t("packingList.print")}
            </button>
          </div>
        </div>
        <PackingListSelectionTable selectedIds={ids} onSelectionChange={changeSelection} />
        {isLoading ? <ApiLoadingState /> : null}
        {error ? (
          <div role="alert" className="rounded border border-red-300 p-3 text-sm text-red-600">
            {t(error)}
            <button type="button" className="ml-3 underline" onClick={() => { setData(null); setRetry((value) => value + 1); }}>{t("packingList.retry")}</button>
          </div>
        ) : null}
        {!ids.length ? <p className="text-sm">{t("packingList.empty")}</p> : null}
      </div>

      {canPrint ? (
        <article className="packing-list-document mx-auto max-w-[192mm] bg-white p-3 text-black shadow-sm print:max-w-none print:p-0 print:shadow-none">
          <header className="mb-2 border-b border-black pb-2">
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
              <h2 className="text-base font-bold">{t("packingList.title")}</h2>
              <p className="font-semibold">{t("brand.name")}</p>
            </div>
            <div className="mt-1 flex flex-wrap justify-between gap-x-3 gap-y-1">
              <p>{summary}</p>
              <p>{t("packingList.dispatchDate")}</p>
            </div>
            <p className="mt-1">{t("packingList.instructions")}</p>
          </header>
          {rows.map((row, documentIndex) => {
            const customer = customers.get(row.idCustomer);
            return (
              <section key={row.id} className="mb-2">
                <div className="overflow-x-auto print:overflow-visible">
                  <table className="packing-list-table w-full min-w-[660px] table-fixed border-collapse print:min-w-0">
                    <colgroup>
                      {["4%", "40%", "9%", "9%", "7%", "10%", "5%", "16%"].map((width, index) => <col key={index} style={{ width }} />)}
                    </colgroup>
                    <thead>
                      <tr>
                        <th colSpan={8} className="border border-slate-500 bg-slate-100 px-1 py-1 text-left font-normal">
                          <div className="flex flex-wrap justify-between gap-x-3">
                            <strong>{documentIndex + 1}. {t("field.noSuratJalan")}: {row.noSuratJalan}</strong>
                            <span>{t("field.tanggal")}: {formatTanggal(row.tanggal, locale)} · {t("field.noPo")}: {row.noPo}</span>
                          </div>
                          <div>{t("packingList.destination")}: <strong>{customer?.nama}</strong> · {t("field.kendaraan")}: {row.kendaraan || "—"}</div>
                          <div className="whitespace-pre-line">{t("packingList.address")}: {customer?.alamat || "—"}</div>
                        </th>
                      </tr>
                      <tr>
                        {["field.no", "field.namaBarang", "field.kodeDepartemen", "packingList.expected", "field.unit", "packingList.actual", "packingList.check", "packingList.notes"].map((key) => (
                          <th key={key} className="border border-slate-500 px-1 py-1 text-left">{t(key)}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {sortSuratJalanBarangByUrutan(row.barang).map((item, index) => (
                        <tr key={`${item.id}-${index}`}>
                          <td className="text-center">{index + 1}</td>
                          <td><span className="font-medium">{item.nama}</span>{item.spesifikasi ? <span className="whitespace-pre-line">{` (${item.spesifikasi})`}</span> : null}</td>
                          <td>{item.kodeDepartemen || "—"}</td>
                          <td className="text-right">{item.jumlah.toLocaleString(locale === "id" ? "id-ID" : "en-US")}</td>
                          <td>{item.unit}</td>
                          <td />
                          <td><span className="mx-auto block h-3 w-3 border border-black" /></td>
                          <td />
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            );
          })}
          <footer className="packing-list-signatures mt-3 grid grid-cols-3 gap-4 text-center">
            {["packingList.admin", "packingList.operations", "packingList.driver"].map((key) => (
              <div key={key}><p>{t(key)}</p><div className="mx-3 mt-8 border-t border-black pt-1">{t("packingList.nameSignature")}</div></div>
            ))}
          </footer>
        </article>
      ) : null}
      <style jsx global>{`
        .packing-list-document { font-size: 11px; line-height: 1.25; }
        .packing-list-table { font-size: inherit; line-height: inherit; }
        .packing-list-table th, .packing-list-table td { overflow-wrap: anywhere; }
        .packing-list-table tbody td { border: 1px solid #64748b; padding: 3px 4px; vertical-align: top; }
        @media print {
          @page { size: A4 portrait; margin: 9mm; }
          html, body { background: white !important; }
          .packing-list-table thead { display: table-header-group; }
          .packing-list-table tr, .packing-list-signatures { break-inside: avoid; }
          .packing-list-table th { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
        }
      `}</style>
    </main>
  );
}
