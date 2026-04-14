"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ApiLoadingState } from "../../../_components/api-loading-state";
import { ApiRequestError } from "../../../_lib/api-client";
import { useI18n } from "../../../_i18n/provider";
import { fetchCustomerById, type CustomerItem } from "../../../customer/_lib/customer";
import { fetchSuratJalanById, type SuratJalanItem } from "../../_lib/surat-jalan";

const companyProfile = {
  name: "CV. PRIMA PUTRA PERKASA",
  addressLines: [
    "Jl. Hayam Wuruk No.127",
    "Lindeteves Trade Centre Lt. 2 Blok B20 No. 6",
    "Tel. 021. 6246441, 62320362",
  ],
};

const meiloonCustomerName = "PT. MEILOON TECHNOLOGY INDONESIA";

type TemplateRow = {
  no: string;
  namaBarang: string;
  kodeDepartemen: string;
  jumlah: string;
};

type MeiloonTemplateRow = {
  no: string;
  namaBarang: string;
  spesifikasi: string;
  qty: string;
  unit: string;
  kodeDepartemen: string;
  ttdPenerima: string;
  note: string;
};

function toUpperText(value: string) {
  return String(value || "").trim().toUpperCase();
}

function normalizeCustomerName(value: string) {
  return String(value || "").trim().toUpperCase();
}

function formatTemplateDate(value: string, locale: "id" | "en") {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  const formatted = date.toLocaleDateString(locale === "en" ? "en-US" : "id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return formatted.toUpperCase();
}

function buildTemplateRows(suratJalan: SuratJalanItem | null, minimumRows = 8): TemplateRow[] {
  const kodeDepartemen = String(suratJalan?.kodeDepartemen || "").trim();
  const filledRows = (suratJalan?.barang || []).map((barang, index) => {
    const namaBarang = String(barang.nama || "").trim();
    const spesifikasi = String(barang.spesifikasi || "").trim();
    const namaBarangDisplay =
      namaBarang && spesifikasi ? `${namaBarang} (${spesifikasi})` : namaBarang;

    return {
      no: String(index + 1),
      namaBarang: namaBarangDisplay,
      kodeDepartemen,
      jumlah: `${barang.jumlah} ${String(barang.unit || "").trim().toUpperCase()}`.trim(),
    };
  });

  const totalRows = Math.max(minimumRows, filledRows.length);
  const rows = [...filledRows];

  while (rows.length < totalRows) {
    rows.push({
      no: "",
      namaBarang: "",
      kodeDepartemen: "",
      jumlah: "",
    });
  }

  return rows;
}

function buildMeiloonTemplateRows(
  suratJalan: SuratJalanItem | null,
  minimumRows = 8
): MeiloonTemplateRow[] {
  const kodeDepartemen = String(suratJalan?.kodeDepartemen || "").trim();
  const filledRows = (suratJalan?.barang || []).map((barang, index) => ({
    no: String(index + 1),
    namaBarang: String(barang.nama || "").trim(),
    spesifikasi: String(barang.spesifikasi || "").trim(),
    qty: String(barang.jumlah || "").trim(),
    unit: String(barang.unit || "").trim().toUpperCase(),
    kodeDepartemen,
    ttdPenerima: "",
    note: "",
  }));

  const totalRows = Math.max(minimumRows, filledRows.length);
  const rows = [...filledRows];

  while (rows.length < totalRows) {
    rows.push({
      no: "",
      namaBarang: "",
      spesifikasi: "",
      qty: "",
      unit: "",
      kodeDepartemen: "",
      ttdPenerima: "",
      note: "",
    });
  }

  return rows;
}

export default function SuratJalanExportPage() {
  const { t, locale } = useI18n();
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

  const templateRows = useMemo(() => buildTemplateRows(suratJalan), [suratJalan]);
  const meiloonTemplateRows = useMemo(() => buildMeiloonTemplateRows(suratJalan), [suratJalan]);
  const templateDate = useMemo(() => formatTemplateDate(suratJalan?.tanggal || "", locale), [locale, suratJalan?.tanggal]);
  const rawCustomerName = useMemo(() => String(customer?.nama || "").trim(), [customer?.nama]);
  const rawCustomerAddress = useMemo(() => String(customer?.alamat || "").trim(), [customer?.alamat]);
  const rawCustomerAttn = useMemo(() => String(customer?.atasNama || "").trim(), [customer?.atasNama]);
  const customerName = useMemo(() => toUpperText(customer?.nama || ""), [customer?.nama]);
  const customerAddress = useMemo(() => toUpperText(customer?.alamat || ""), [customer?.alamat]);
  const customerAttn = useMemo(() => toUpperText(customer?.atasNama || ""), [customer?.atasNama]);
  const kendaraan = useMemo(() => String(suratJalan?.kendaraan || "").trim().toUpperCase(), [suratJalan?.kendaraan]);
  const isMeiloonCustomer = useMemo(
    () => normalizeCustomerName(customer?.nama || "") === meiloonCustomerName,
    [customer?.nama]
  );

  return (
    <>
      <style jsx global>{`
        @page {
          size: A4 portrait;
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
        <div className="mx-auto flex w-full max-w-[210mm] items-center justify-between gap-3 pb-4 print:hidden">
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
              onClick={() => {
                window.close();
                router.push("/suratJalan");
              }}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              {t("common.close")}
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="mx-auto max-w-[210mm] print:hidden">
            <ApiLoadingState />
          </div>
        ) : errorMessage ? (
          <section className="mx-auto max-w-[210mm] rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 print:hidden">
            <p>{errorMessage}</p>
          </section>
        ) : suratJalan && isMeiloonCustomer ? (
          <section
            className="mx-auto w-full max-w-[210mm] bg-white text-black shadow-xl print:max-w-none print:shadow-none"
            style={{
              fontFamily: "Arial, Helvetica, sans-serif",
            }}
          >
            <div className="min-h-[297mm] px-[6mm] py-[8mm] text-[14px] leading-[1.22]">
              <div className="grid grid-cols-2 gap-6 pt-7">
                <div className="border-2 border-black px-2 py-1">
                  <p className="text-[19px] font-bold">{companyProfile.name}</p>
                  {companyProfile.addressLines.map((line) => (
                    <p key={line} className="text-[13px] leading-[1.22]">
                      {line}
                    </p>
                  ))}
                </div>

                <div className="border-2 border-black px-2 py-1">
                  <p className="text-[19px] font-bold">{rawCustomerName || meiloonCustomerName}</p>
                  <p className="whitespace-pre-line text-[13px] leading-[1.24]">
                    {rawCustomerAddress || customerAddress || "-"}
                  </p>
                  <p className="mt-1 text-[14px] font-bold">
                    {t("suratJalan.export.attnLabel")} : {rawCustomerAttn || customerAttn || "-"}
                  </p>
                </div>
              </div>

              <div className="mt-1 flex items-end justify-between gap-4 text-[18px] font-bold leading-tight">
                <div className="grid grid-cols-[78px_12px_1fr] gap-x-1">
                  <span>{t("suratJalan.export.meiloon.noSjLabel")}</span>
                  <span>:</span>
                  <span>{suratJalan.noSuratJalan || "-"}</span>
                </div>
                <div className="grid grid-cols-[72px_12px_1fr] gap-x-1">
                  <span>{t("suratJalan.export.noPoLabel")}</span>
                  <span>:</span>
                  <span>{suratJalan.noPo || "-"}</span>
                </div>
                <div className="grid grid-cols-[90px_12px_1fr] gap-x-1">
                  <span>{t("suratJalan.export.tanggalLabel")}</span>
                  <span>:</span>
                  <span>{templateDate}</span>
                </div>
              </div>

              <p className="mt-1 text-[13px]">
                {t("suratJalan.export.deliverySentenceStart")}{" "}
                <span className="font-bold">({kendaraan || "-"})</span>
              </p>

              <div className="mt-1 border-2 border-black">
                <table className="w-full border-collapse table-fixed">
                  <colgroup>
                    <col style={{ width: "36px" }} />
                    <col style={{ width: "22%" }} />
                    <col style={{ width: "38%" }} />
                    <col style={{ width: "5%" }} />
                    <col style={{ width: "8%" }} />
                    <col style={{ width: "12%" }} />
                    <col style={{ width: "10%" }} />
                    <col style={{ width: "6%" }} />
                  </colgroup>
                  <thead>
                    <tr className="border-b-2 border-black">
                      <th className="border-r border-black px-1 text-center text-[14px] font-bold">
                        {t("suratJalan.export.table.no")}
                      </th>
                      <th className="border-r border-black px-1 text-center text-[14px] font-bold">
                        {t("suratJalan.export.table.namaBarang")}
                      </th>
                      <th className="border-r border-black px-1 text-center text-[14px] font-bold">
                        {t("suratJalan.export.meiloon.table.spesifikasi")}
                      </th>
                      <th className="border-r border-black px-1 text-center text-[11px] font-bold leading-tight">
                        {t("suratJalan.export.meiloon.table.qty")}
                      </th>
                      <th className="border-r border-black px-1 text-center text-[14px] font-bold">
                        {t("suratJalan.export.meiloon.table.unit")}
                      </th>
                      <th className="border-r border-black px-1 text-center text-[11px] font-bold leading-tight">
                        {t("suratJalan.export.meiloon.table.kodeDepartemen")}
                      </th>
                      <th className="border-r border-black px-1 text-center text-[11px] font-bold leading-tight">
                        {t("suratJalan.export.meiloon.table.ttdPenerima")}
                      </th>
                      <th className="px-1 text-center text-[11px] font-bold leading-tight">
                        {t("suratJalan.export.meiloon.table.note")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {meiloonTemplateRows.map((row, index) => (
                      <tr
                        key={`meiloon-template-row-${index}`}
                        className="h-[23px] border-b border-black last:border-b-0"
                      >
                        <td className="border-r border-black px-1 text-center align-top">{row.no}</td>
                        <td className="border-r border-black px-1.5 align-top">{row.namaBarang}</td>
                        <td className="border-r border-black px-1.5 align-top whitespace-pre-line">
                          {row.spesifikasi}
                        </td>
                        <td className="border-r border-black px-1 text-center align-top">{row.qty}</td>
                        <td className="border-r border-black px-1 text-center align-top">{row.unit}</td>
                        <td className="border-r border-black px-1 text-center align-top">{row.kodeDepartemen}</td>
                        <td className="border-r border-black px-1 text-center align-top">{row.ttdPenerima}</td>
                        <td className="px-1 text-center align-top">{row.note}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <p className="mt-0.5 text-[13px] font-bold">{t("suratJalan.export.returnPolicy")}</p>

              <div className="mt-0.5 grid grid-cols-3 gap-8 text-center">
                <div>
                  <p className="text-[15px] font-bold">{t("suratJalan.export.signature.receiver")}</p>
                  <div className="mt-[72px] mx-auto w-[120px] border-t-[1.5px] border-black" />
                </div>
                <div>
                  <p className="text-[15px] font-bold">{t("suratJalan.export.signature.sender")}</p>
                  <div className="mt-[72px] mx-auto w-[120px] border-t-[1.5px] border-black" />
                </div>
                <div>
                  <p className="text-[15px] font-bold">{t("suratJalan.export.signature.regards")}</p>
                  <div className="mt-[72px] mx-auto w-[130px] border-t-[1.5px] border-black" />
                </div>
              </div>
            </div>
          </section>
        ) : suratJalan ? (
          <section
            className="mx-auto w-full max-w-[210mm] bg-white text-black shadow-xl print:max-w-none print:shadow-none"
            style={{
              fontFamily: "Arial, Helvetica, sans-serif",
            }}
          >
            <div className="min-h-[297mm] px-[7mm] py-[9mm] text-[14px] leading-[1.22]">
              <div className="grid grid-cols-[1.15fr_0.85fr] gap-5">
                <div className="pt-7">
                  <p className="text-[19px] font-bold">{companyProfile.name}</p>
                  {companyProfile.addressLines.map((line) => (
                    <p key={line} className="text-[13px]">
                      {line}
                    </p>
                  ))}

                  <div className="mt-5 grid w-full grid-cols-[190px_12px_1fr] gap-x-2 text-[18px] font-bold leading-tight">
                    <span>{t("suratJalan.export.noSuratJalanLabel")}</span>
                    <span>:</span>
                    <span>{suratJalan.noSuratJalan || "-"}</span>
                    <span>{t("suratJalan.export.noPoLabel")}</span>
                    <span>:</span>
                    <span>{suratJalan.noPo || "-"}</span>
                  </div>
                </div>

                <div className="pt-7">
                  <div className="grid grid-cols-[120px_12px_1fr] text-[18px] font-bold leading-tight">
                    <span>{t("suratJalan.export.tanggalLabel")}</span>
                    <span>:</span>
                    <span>{templateDate}</span>
                  </div>

                  <div className="mt-1 border-2 border-black px-2 py-1.5">
                    <p className="text-[14px] italic">{t("suratJalan.export.kepadaLabel")}</p>
                    <p className="text-[18px] font-bold leading-tight">{customerName || "-"}</p>
                    <p className="whitespace-pre-line text-[13px] leading-[1.24]">{customerAddress || "-"}</p>
                    <p className="mt-1 text-[14px] font-bold">
                      {t("suratJalan.export.attnLabel")}: {customerAttn || "-"}
                    </p>
                  </div>
                </div>
              </div>

              <p className="mt-6 text-[13px]">
                {t("suratJalan.export.deliverySentenceStart")}{" "}
                <span className="font-bold">({kendaraan || "-"})</span>
              </p>

              <div className="mt-1 border-2 border-black">
                <table className="w-full border-collapse table-fixed">
                  <colgroup>
                    <col style={{ width: "28px" }} />
                    <col />
                    <col style={{ width: "100px" }} />
                  </colgroup>
                  <thead>
                    <tr className="border-b-2 border-black">
                      <th className="border-r border-black px-1 text-center text-[14px] font-bold">
                        {t("suratJalan.export.table.no")}
                      </th>
                      <th className="border-r border-black px-1 text-center text-[14px] font-bold">
                        {t("suratJalan.export.table.namaBarang")}
                      </th>
                      <th className="px-1 text-center text-[14px] font-bold">
                        {t("suratJalan.export.table.jumlah")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {templateRows.map((row, index) => (
                      <tr key={`template-row-${index}`} className="h-[23px] border-b border-black last:border-b-0">
                        <td className="border-r border-black px-1 text-center align-middle">{row.no}</td>
                        <td className="border-r border-black px-2 align-middle">
                          <div className="flex items-center justify-between gap-3">
                            <span className="truncate">{row.namaBarang}</span>
                            <span className="shrink-0">{row.kodeDepartemen}</span>
                          </div>
                        </td>
                        <td className="px-2 text-center align-middle">{row.jumlah}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <p className="mt-0.5 text-[13px] font-bold">{t("suratJalan.export.returnPolicy")}</p>

              <div className="mt-0.5 grid grid-cols-3 gap-8 text-center">
                <div>
                  <p className="text-[15px] font-bold">{t("suratJalan.export.signature.receiver")}</p>
                  <div className="mt-[76px] mx-auto w-[120px] border-t-[1.5px] border-black" />
                </div>
                <div>
                  <p className="text-[15px] font-bold">{t("suratJalan.export.signature.sender")}</p>
                  <div className="mt-[76px] mx-auto w-[120px] border-t-[1.5px] border-black" />
                </div>
                <div>
                  <p className="text-[15px] font-bold">{t("suratJalan.export.signature.regards")}</p>
                  <div className="mt-[76px] mx-auto w-[130px] border-t-[1.5px] border-black" />
                </div>
              </div>
            </div>
          </section>
        ) : null}
      </main>
    </>
  );
}
