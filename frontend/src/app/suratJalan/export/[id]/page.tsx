"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ApiLoadingState } from "../../../_components/api-loading-state";
import { ApiRequestError } from "../../../_lib/api-client";
import { useI18n } from "../../../_i18n/provider";
import { fetchCustomerById, type CustomerItem } from "../../../customer/_lib/customer";
import { fetchSuratJalanById, type SuratJalanItem } from "../../_lib/surat-jalan";
import { SuratJalanExportDocument } from "../_components/surat-jalan-export-document";

export default function SuratJalanExportPage() {
  const { t } = useI18n();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const suratJalanId = String(params?.id || "").trim();
  const [suratJalan, setSuratJalan] = useState<SuratJalanItem | null>(null);
  const [customer, setCustomer] = useState<CustomerItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadExportData() {
      if (!suratJalanId) {
        if (mounted) {
          setErrorMessage(t("suratJalan.export.invalidId"));
          setIsLoading(false);
        }
        return;
      }

      setIsLoading(true);
      setErrorMessage("");

      try {
        const suratJalanData = await fetchSuratJalanById(suratJalanId);

        if (!suratJalanData) {
          if (mounted) {
            setErrorMessage(t("suratJalan.export.notFound"));
            setIsLoading(false);
          }
          return;
        }

        let customerData: CustomerItem | null = null;

        if (suratJalanData.idCustomer) {
          try {
            customerData = await fetchCustomerById(suratJalanData.idCustomer);
          } catch {
            customerData = null;
          }
        }

        if (!mounted) {
          return;
        }

        setSuratJalan(suratJalanData);
        setCustomer(customerData);
      } catch (error) {
        if (!mounted) {
          return;
        }

        if (error instanceof ApiRequestError) {
          setErrorMessage(error.message || t("suratJalan.export.loadError"));
        } else {
          setErrorMessage(t("suratJalan.export.loadError"));
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
  }, [suratJalanId, t]);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    const previousTitle = document.title;
    const noSuratJalan = String(suratJalan?.noSuratJalan || "").trim();

    if (noSuratJalan) {
      document.title = noSuratJalan;
    }

    return () => {
      document.title = previousTitle;
    };
  }, [suratJalan?.noSuratJalan]);

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
          size: 24cm 12cm;
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
        }
      `}</style>

      <main className="min-h-screen bg-slate-200/60 px-3 py-4 print:bg-white print:px-0 print:py-0">
        <div className="mx-auto flex w-full max-w-[24cm] items-center justify-between gap-3 pb-4 print:hidden">
          <div>
            <h1 className="text-lg font-semibold text-slate-900">{t("suratJalan.export.previewTitle")}</h1>
            <p className="text-sm text-slate-600">{t("suratJalan.export.previewDescription")}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
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
        ) : suratJalan ? (
          <SuratJalanExportDocument suratJalan={suratJalan} customer={customer} />
        ) : null}
      </main>
    </>
  );
}
