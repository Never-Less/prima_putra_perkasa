"use client";

import { usePageTitle } from "../../../_hooks/use-page-title";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ApiLoadingState } from "../../../_components/api-loading-state";
import { ApiRequestError } from "../../../_lib/api-client";
import { printDocumentWhenFontsReady } from "../../../_lib/print";
import { useI18n } from "../../../_i18n/provider";
import { fetchCustomerById, type CustomerItem } from "../../../customer/_lib/customer";
import { fetchSuratJalanByNoPo, type SuratJalanItem } from "../../_lib/surat-jalan";
import {
  SuratJalanExportDocument,
  type SuratJalanExportPaperSize,
} from "../_components/surat-jalan-export-document";

export default function SuratJalanNoPoExportPage() {
  const { t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const noPo = useMemo(() => String(searchParams.get("noPo") || "").trim(), [searchParams]);
  const [rows, setRows] = useState<SuratJalanItem[]>([]);
  const [customerMap, setCustomerMap] = useState<Map<string, CustomerItem>>(new Map());
  const [paperSize, setPaperSize] = useState<SuratJalanExportPaperSize>("half");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadExportData() {
      if (!noPo) {
        if (mounted) {
          setErrorMessage(t("suratJalan.export.invalidNoPo"));
          setIsLoading(false);
        }
        return;
      }

      setIsLoading(true);
      setErrorMessage("");

      try {
        const suratJalanRows = await fetchSuratJalanByNoPo(noPo);

        if (!mounted) {
          return;
        }

        if (suratJalanRows.length === 0) {
          setRows([]);
          setCustomerMap(new Map());
          setErrorMessage(t("suratJalan.export.noPoNotFound"));
          setIsLoading(false);
          return;
        }

        const customerIds = Array.from(
          new Set(
            suratJalanRows
              .map((row) => String(row.idCustomer || "").trim())
              .filter(Boolean)
          )
        );
        const customerResults = await Promise.allSettled(
          customerIds.map(async (customerId) => ({
            customerId,
            customer: await fetchCustomerById(customerId),
          }))
        );

        if (!mounted) {
          return;
        }

        const nextCustomerMap = new Map<string, CustomerItem>();

        customerResults.forEach((result) => {
          if (result.status !== "fulfilled" || !result.value.customer) {
            return;
          }

          nextCustomerMap.set(result.value.customerId, result.value.customer);
        });

        setRows(suratJalanRows);
        setCustomerMap(nextCustomerMap);
      } catch (error) {
        if (!mounted) {
          return;
        }

        if (error instanceof ApiRequestError) {
          setErrorMessage(error.message || t("suratJalan.export.loadNoPoError"));
        } else {
          setErrorMessage(t("suratJalan.export.loadNoPoError"));
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    void loadExportData();

    return () => {
      mounted = false;
    };
  }, [noPo, t]);

  usePageTitle("nav.suratJalan", noPo);

  function handleClosePage() {
    window.close();

    window.setTimeout(() => {
      if (!document.hidden) {
        router.push("/suratJalan");
      }
    }, 150);
  }

  return (
    <>
      <style jsx global>{`
        @page {
          size: letter portrait;
          margin: 0;
        }

        @media print {
          html,
          body {
            background: #ffffff !important;
          }

          body {
            margin: 0;
            padding: 0;
          }

          .surat-jalan-print-page {
            width: var(--surat-jalan-page-width, 24cm) !important;
            height: var(--surat-jalan-page-height, 14cm) !important;
            max-width: none !important;
            overflow: hidden !important;
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }

          .surat-jalan-print-page tr {
            break-inside: avoid;
            page-break-inside: avoid;
          }
        }
      `}</style>

      <main className="export-normal-weight min-h-screen bg-slate-200/60 px-3 py-4 print:bg-white print:px-0 print:py-0">
        <div className="mx-auto flex w-full max-w-[24cm] items-center justify-between gap-3 pb-4 print:hidden">
          <div>
            <h1 className="text-lg text-slate-900">
              {t("suratJalan.export.noPoPreviewTitle")}
            </h1>
            <p className="text-sm text-slate-600">
              {t("suratJalan.export.noPoPreviewDescription", {
                noPo: noPo || "-",
                count: rows.length,
              })}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-slate-700">
                {t("suratJalan.export.paperSizeLabel")}
              </span>
              <div className="flex rounded-lg border border-slate-300 bg-white p-1">
                {(["half", "full"] as const).map((value) => {
                  const isActive = paperSize === value;

                  return (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={isActive}
                      onClick={() => setPaperSize(value)}
                      className={`rounded-md px-3 py-1.5 text-sm ${
                        isActive
                          ? "bg-sky-700 text-white"
                          : "text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      {t(
                        value === "half"
                          ? "suratJalan.export.paperSize.half"
                          : "suratJalan.export.paperSize.full"
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
            <button
              type="button"
              onClick={printDocumentWhenFontsReady}
              className="rounded-lg border border-sky-300 bg-sky-700 px-4 py-2 text-sm text-white hover:bg-sky-600"
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
        </div>

        {isLoading ? (
          <div className="mx-auto max-w-[24cm] print:hidden">
            <ApiLoadingState />
          </div>
        ) : errorMessage ? (
          <section className="mx-auto max-w-[24cm] rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 print:hidden">
            <p>{errorMessage}</p>
          </section>
        ) : (
          <div className="space-y-4 print:space-y-0">
            {rows.map((row, index) => (
              <div
                key={row.id}
                style={{
                  breakAfter: index < rows.length - 1 ? "page" : "auto",
                }}
                className="print:break-inside-avoid"
              >
                <SuratJalanExportDocument
                  suratJalan={row}
                  customer={customerMap.get(row.idCustomer) || null}
                  paperSize={paperSize}
                />
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  );
}

