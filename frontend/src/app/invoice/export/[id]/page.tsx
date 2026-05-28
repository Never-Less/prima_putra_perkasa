"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ApiLoadingState } from "../../../_components/api-loading-state";
import { formatAppUppercaseDate } from "../../../_lib/date";
import { ApiRequestError } from "../../../_lib/api-client";
import { useI18n } from "../../../_i18n/provider";
import { fetchCustomerById, type CustomerItem } from "../../../customer/_lib/customer";
import { fetchInvoiceById, invoiceBarangNoPoLabel, type InvoiceItem } from "../../_lib/invoice";

const companyProfile = {
  name: "CV. PRIMA PUTRA PERKASA",
  addressLines: [
    "Jl. Hayam Wuruk No.127",
    "Lindeteves Trade Centre Lt. 2 Blok B20 No. 6",
    "Tel. 021. 6246441, 62320362",
  ],
};

const meiloonCustomerName = "PT. MEILOON TECHNOLOGY INDONESIA";

const paymentProfile = {
  nama: "CV. PRIMA PUTRA PERKASA",
  rekening: "588-511-9945",
  bank: "BCA (CABANG LTC GLODOK)",
};

const meiloonInvoiceProfile = {
  name: "PT. MEILOON TECHNOLOGY INDONESIA",
  npwp: "93.743.796.0-036.000",
  addressLines: [
    "Jl. Raya Subang Pagaden, Kawasan Industri Taifa,",
    "Gunung Sembung, Pagaden, Kabupaten Subang,",
    "Jawa Barat 41252 - Indonesia",
  ],
  attnFallback: "Mr. Pangzi Wang / Bu. Marchia",
};

type DefaultInvoiceTemplateRow = {
  no: string;
  namaBarang: string;
  qty: string;
  unit: string;
  hargaSatuan: string;
  jumlah: string;
  noPo: string;
};

type MeiloonInvoiceTemplateRow = {
  no: string;
  namaBarang: string;
  spesifikasi: string;
  unit: string;
  qty: string;
  hargaSatuan: string;
  jumlah: string;
  noPo: string;
};

type PaginatedRows<T> = {
  isSinglePage: boolean;
  firstPageRows: T[];
  middlePages: T[][];
  lastPageRows: T[];
};

function normalizeCustomerName(value: string) {
  return String(value || "").trim().toUpperCase();
}

function toUpperText(value: string) {
  return String(value || "").trim().toUpperCase();
}

function roundCurrency(value: number) {
  return Math.round(Number(value || 0));
}

function formatPlainNumber(value: number) {
  return new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: 0,
  }).format(roundCurrency(value));
}

function formatQuantity(value: number) {
  if (!Number.isFinite(value)) {
    return "";
  }

  if (Number.isInteger(value)) {
    return String(value);
  }

  return new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: 2,
  }).format(value);
}

function formatTemplateDate(value: string, locale: "id" | "en") {
  return formatAppUppercaseDate(value, locale);
}

function splitInvoiceBarangColumns(value: string) {
  const text = String(value || "").trim();
  const match = text.match(/^(.*)\s+\(([^()]*)\)$/);

  if (!match) {
    return {
      namaBarang: text,
      spesifikasi: "",
    };
  }

  return {
    namaBarang: String(match[1] || "").trim(),
    spesifikasi: String(match[2] || "").trim(),
  };
}

function formatInvoiceBarangLabel(namaBarang: string, spesifikasi = "") {
  const normalizedNamaBarang = String(namaBarang || "").trim();
  const normalizedSpesifikasi = String(spesifikasi || "").trim();

  if (!normalizedNamaBarang) {
    return "";
  }

  if (!normalizedSpesifikasi) {
    return normalizedNamaBarang;
  }

  return `${normalizedNamaBarang} (${normalizedSpesifikasi})`;
}

function resolveInvoiceBarangColumns(
  namaBarangValue: string,
  spesifikasiValue = ""
) {
  const namaBarang = String(namaBarangValue || "").trim();
  const spesifikasi = String(spesifikasiValue || "").trim();

  if (spesifikasi) {
    return {
      namaBarang,
      spesifikasi,
    };
  }

  return splitInvoiceBarangColumns(namaBarang);
}

function chunkRows<T>(rows: T[], chunkSize: number) {
  const chunks: T[][] = [];

  for (let index = 0; index < rows.length; index += chunkSize) {
    chunks.push(rows.slice(index, index + chunkSize));
  }

  return chunks;
}

function padRows<T>(rows: T[], totalRows: number, createEmptyRow: () => T) {
  const paddedRows = [...rows];

  while (paddedRows.length < totalRows) {
    paddedRows.push(createEmptyRow());
  }

  return paddedRows;
}

function paginateRows<T>(
  rows: T[],
  config: {
    firstPageCapacity: number;
    middlePageCapacity: number;
    lastPageCapacity: number;
    createEmptyRow: () => T;
  }
): PaginatedRows<T> {
  const { firstPageCapacity, middlePageCapacity, lastPageCapacity, createEmptyRow } = config;

  if (rows.length <= firstPageCapacity) {
    return {
      isSinglePage: true,
      firstPageRows: padRows(rows, firstPageCapacity, createEmptyRow),
      middlePages: [],
      lastPageRows: [],
    };
  }

  const lastPageRows = rows.slice(-lastPageCapacity);
  const headRows = rows.slice(0, -lastPageCapacity);
  const firstPageRows = headRows.slice(0, firstPageCapacity);
  const middleRows = headRows.slice(firstPageCapacity);

  return {
    isSinglePage: false,
    firstPageRows: padRows(firstPageRows, firstPageCapacity, createEmptyRow),
    middlePages: chunkRows(middleRows, middlePageCapacity).map((pageRows) =>
      padRows(pageRows, middlePageCapacity, createEmptyRow)
    ),
    lastPageRows: padRows(lastPageRows, lastPageCapacity, createEmptyRow),
  };
}

function createEmptyDefaultInvoiceRow(): DefaultInvoiceTemplateRow {
  return {
    no: "",
    namaBarang: "",
    qty: "",
    unit: "",
    hargaSatuan: "",
    jumlah: "",
    noPo: "",
  };
}

function createEmptyMeiloonInvoiceRow(): MeiloonInvoiceTemplateRow {
  return {
    no: "",
    namaBarang: "",
    spesifikasi: "",
    unit: "",
    qty: "",
    hargaSatuan: "",
    jumlah: "",
    noPo: "",
  };
}

function buildDefaultTemplateRows(invoice: InvoiceItem | null) {
  return (invoice?.barang || []).map((barang, index) => ({
    no: String(index + 1),
    namaBarang: formatInvoiceBarangLabel(barang.namaBarang, barang.spesifikasi),
    qty: formatQuantity(Number(barang.kuantitas || 0)),
    unit: toUpperText(barang.unit),
    hargaSatuan: formatPlainNumber(Number(barang.hargaSatuan || 0)),
    jumlah: formatPlainNumber(Number(barang.jumlah || 0)),
    noPo: invoiceBarangNoPoLabel(barang, invoice?.noPoList || []),
  }));
}

function buildMeiloonTemplateRows(invoice: InvoiceItem | null) {
  return (invoice?.barang || []).map((barang, index) => {
    const { namaBarang, spesifikasi } = resolveInvoiceBarangColumns(
      barang.namaBarang,
      barang.spesifikasi
    );

    return {
      no: String(index + 1),
      namaBarang,
      spesifikasi,
      unit: toUpperText(barang.unit),
      qty: formatQuantity(Number(barang.kuantitas || 0)),
      hargaSatuan: formatPlainNumber(Number(barang.hargaSatuan || 0)),
      jumlah: formatPlainNumber(Number(barang.jumlah || 0)),
      noPo: invoiceBarangNoPoLabel(barang, invoice?.noPoList || []),
    };
  });
}

type CommonTemplateProps = {
  t: (key: string, params?: Record<string, string | number>) => string;
};

type DefaultInvoiceTableProps = CommonTemplateProps & {
  rows: DefaultInvoiceTemplateRow[];
  className?: string;
};

type CurrencyTableValueProps = {
  value: string;
};

function CurrencyTableValue({ value }: CurrencyTableValueProps) {
  const normalizedValue = String(value || "").trim();

  if (!normalizedValue) {
    return null;
  }

  return (
    <span className="inline-block whitespace-nowrap text-[10px] leading-none">{normalizedValue}</span>
  );
}

function DefaultInvoiceTable({ rows, t, className = "" }: DefaultInvoiceTableProps) {
  return (
    <div className={`flex flex-col border border-black ${className}`.trim()}>
      <table className="w-full border-collapse table-fixed">
        <colgroup>
          <col style={{ width: "36px" }} />
          <col />
          <col style={{ width: "50px" }} />
          <col style={{ width: "38px" }} />
          <col style={{ width: "66px" }} />
          <col style={{ width: "74px" }} />
          <col style={{ width: "74px" }} />
        </colgroup>
        <thead>
          <tr className="border-b border-black">
            <th className="border-r border-black px-1 py-0.5 text-center text-[11px] font-bold">
              {t("invoice.export.table.no")}
            </th>
            <th className="border-r border-black px-1 py-0.5 text-center text-[11px] font-bold">
              {t("invoice.export.table.namaBarang")}
            </th>
            <th className="border-r border-black px-1 py-0.5 text-center text-[11px] font-bold">
              {t("invoice.export.table.qty")}
            </th>
            <th className="border-r border-black px-1 py-0.5 text-center text-[11px] font-bold">
              {t("invoice.export.table.unit")}
            </th>
            <th className="border-r border-black px-1 py-0.5 text-center text-[11px] font-bold leading-tight">
              {t("invoice.export.table.hargaSatuan")}
            </th>
            <th className="px-1 py-0.5 text-center text-[11px] font-bold">
              {t("invoice.export.table.jumlah")}
            </th>
            <th className="border-l border-black px-1 py-0.5 text-center text-[11px] font-bold">
              {t("invoice.export.table.noPo")}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={`default-invoice-row-${index}`} className="h-[24px]">
              <td className="px-1 text-center align-middle text-[11px]">{row.no}</td>
              <td className="whitespace-normal break-words px-1.5 align-middle text-[11px] leading-[1.15]">
                {row.namaBarang}
              </td>
              <td className="px-1 text-center align-middle text-[11px]">{row.qty}</td>
              <td className="px-1 text-center align-middle text-[11px]">{row.unit}</td>
              <td className="px-1 py-0.5 text-right align-middle text-[11px]">
                <CurrencyTableValue value={row.hargaSatuan} />
              </td>
              <td className="px-1 py-0.5 text-right align-middle text-[11px]">
                <CurrencyTableValue value={row.jumlah} />
              </td>
              <td className="border-l border-black px-1 text-center align-middle text-[10px]">{row.noPo}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

type MeiloonInvoiceTableProps = CommonTemplateProps & {
  rows: MeiloonInvoiceTemplateRow[];
  className?: string;
};

function MeiloonInvoiceTable({ rows, t, className = "" }: MeiloonInvoiceTableProps) {
  return (
    <div className={`flex flex-col border-2 border-black ${className}`.trim()}>
      <table className="w-full border-collapse table-fixed">
        <colgroup>
          <col style={{ width: "30px" }} />
          <col style={{ width: "19%" }} />
          <col style={{ width: "31%" }} />
          <col style={{ width: "7%" }} />
          <col style={{ width: "5%" }} />
          <col style={{ width: "13%" }} />
          <col style={{ width: "13%" }} />
          <col style={{ width: "12%" }} />
        </colgroup>
        <thead>
          <tr className="border-b-2 border-black">
            <th className="border-r border-black px-1 py-0.5 text-center text-[12px] font-bold">
              {t("invoice.export.table.no")}
            </th>
            <th className="border-r border-black px-1 py-0.5 text-center text-[12px] font-bold">
              {t("invoice.export.table.namaBarang")}
            </th>
            <th className="border-r border-black px-1 py-0.5 text-center text-[12px] font-bold">
              {t("invoice.export.table.spesifikasi")}
            </th>
            <th className="border-r border-black px-1 py-0.5 text-center text-[12px] font-bold">
              {t("invoice.export.table.unit")}
            </th>
            <th className="border-r border-black px-1 py-0.5 text-center text-[12px] font-bold">
              {t("invoice.export.table.qty")}
            </th>
            <th className="border-r border-black px-1 py-0.5 text-center text-[12px] font-bold leading-tight">
              {t("invoice.export.table.hargaSatuan")}
            </th>
            <th className="border-r border-black px-1 py-0.5 text-center text-[12px] font-bold">
              {t("invoice.export.table.jumlah")}
            </th>
            <th className="px-1 py-0.5 text-center text-[12px] font-bold">
              {t("invoice.export.table.noPo")}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={`meiloon-invoice-row-${index}`} className="h-[19px]">
              <td className="px-1 text-center align-middle text-[11px]">{row.no}</td>
              <td className="whitespace-normal break-words px-1.5 align-middle text-[11px] leading-[1.15]">
                {row.namaBarang}
              </td>
              <td className="px-1.5 align-middle text-[11px] leading-[1.15] whitespace-pre-line">{row.spesifikasi}</td>
              <td className="px-1 text-center align-middle text-[11px]">{row.unit}</td>
              <td className="px-1 text-center align-middle text-[11px]">{row.qty}</td>
              <td className="px-1 py-0.5 text-right align-middle text-[11px]">
                <CurrencyTableValue value={row.hargaSatuan} />
              </td>
              <td className="px-1 py-0.5 text-right align-middle text-[11px]">
                <CurrencyTableValue value={row.jumlah} />
              </td>
              <td className="px-1 text-center align-middle text-[10px]">{row.noPo}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function InvoiceExportPage() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const invoiceId = String(params?.id || "").trim();
  const [invoice, setInvoice] = useState<InvoiceItem | null>(null);
  const [customer, setCustomer] = useState<CustomerItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadExportData() {
      if (!invoiceId) {
        if (mounted) {
          setErrorMessage(t("invoice.export.invalidId"));
          setIsLoading(false);
        }
        return;
      }

      setIsLoading(true);
      setErrorMessage("");

      try {
        const invoiceData = await fetchInvoiceById(invoiceId);

        if (!invoiceData) {
          if (mounted) {
            setErrorMessage(t("invoice.export.notFound"));
            setIsLoading(false);
          }
          return;
        }

        let customerData: CustomerItem | null = null;

        if (invoiceData.idCustomer) {
          try {
            customerData = await fetchCustomerById(invoiceData.idCustomer);
          } catch {
            customerData = null;
          }
        }

        if (!mounted) {
          return;
        }

        setInvoice(invoiceData);
        setCustomer(customerData);
      } catch (error) {
        if (!mounted) {
          return;
        }

        if (error instanceof ApiRequestError) {
          setErrorMessage(error.message || t("invoice.export.loadError"));
        } else {
          setErrorMessage(t("invoice.export.loadError"));
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
  }, [invoiceId, t]);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    const previousTitle = document.title;
    const noInvoice = String(invoice?.noInvoice || "").trim();

    if (noInvoice) {
      document.title = noInvoice;
    }

    return () => {
      document.title = previousTitle;
    };
  }, [invoice?.noInvoice]);

  const isMeiloonCustomer = useMemo(
    () => normalizeCustomerName(customer?.nama || "") === meiloonCustomerName,
    [customer?.nama]
  );
  const templateDate = useMemo(() => formatTemplateDate(invoice?.tanggal || "", locale), [invoice?.tanggal, locale]);
  const customerName = useMemo(() => toUpperText(customer?.nama || ""), [customer?.nama]);
  const customerAddress = useMemo(() => toUpperText(customer?.alamat || ""), [customer?.alamat]);
  const noSuratJalanLabel = useMemo(
    () =>
      (invoice?.noSuratJalan || [])
        .map((item) => String(item || "").trim())
        .filter(Boolean)
        .join(", "),
    [invoice?.noSuratJalan]
  );
  const customerNpwp = useMemo(() => String(customer?.npwp || "").trim() || "-", [customer?.npwp]);

  const meiloonCustomerNameValue = useMemo(
    () => String(customer?.nama || meiloonInvoiceProfile.name).trim(),
    [customer?.nama]
  );
  const meiloonCustomerAddress = useMemo(() => {
    const address = String(customer?.alamat || "").trim();

    if (address) {
      return address;
    }

    return meiloonInvoiceProfile.addressLines.join("\n");
  }, [customer?.alamat]);
  const meiloonCustomerAttn = useMemo(
    () => String(customer?.atasNama || meiloonInvoiceProfile.attnFallback).trim(),
    [customer?.atasNama]
  );

  const defaultRows = useMemo(() => buildDefaultTemplateRows(invoice), [invoice]);
  const defaultPaginatedRows = useMemo(
    () =>
      paginateRows(defaultRows, {
        firstPageCapacity: 15,
        middlePageCapacity: 28,
        lastPageCapacity: 10,
        createEmptyRow: createEmptyDefaultInvoiceRow,
      }),
    [defaultRows]
  );

  const meiloonRows = useMemo(() => buildMeiloonTemplateRows(invoice), [invoice]);
  const meiloonPaginatedRows = useMemo(
    () =>
      paginateRows(meiloonRows, {
        firstPageCapacity: 23,
        middlePageCapacity: 33,
        lastPageCapacity: 10,
        createEmptyRow: createEmptyMeiloonInvoiceRow,
      }),
    [meiloonRows]
  );

  const dppValue = useMemo(() => {
    if (!invoice?.isPpn) {
      return roundCurrency(Number(invoice?.subtotal || 0));
    }

    const rate = Number(invoice?.ppnRate || 0);

    if (rate <= 0) {
      return roundCurrency(Number(invoice?.subtotal || 0));
    }

    return roundCurrency((Number(invoice?.subtotal || 0) * rate) / (rate + 1));
  }, [invoice?.isPpn, invoice?.ppnRate, invoice?.subtotal]);

  const dppRatio = useMemo(() => {
    const rate = Number(invoice?.ppnRate || 0);

    if (rate <= 0) {
      return "-";
    }

    return `${rate}/${rate + 1}`;
  }, [invoice?.ppnRate]);

  const meiloonPpnRate = useMemo(() => {
    if (!invoice?.isPpn) {
      return Number(invoice?.ppnRate || 0);
    }

    const rate = Number(invoice?.ppnRate || 0);

    if (rate <= 0) {
      return 0;
    }

    return rate + 1;
  }, [invoice?.isPpn, invoice?.ppnRate]);

  const meiloonPpnAmount = useMemo(() => {
    if (!invoice?.isPpn) {
      return 0;
    }

    const rate = Number(invoice?.ppnRate || 0);

    if (rate <= 0) {
      return roundCurrency(Number(invoice?.ppnAmount || 0));
    }

    return roundCurrency((dppValue * (rate + 1)) / 100);
  }, [dppValue, invoice?.isPpn, invoice?.ppnAmount, invoice?.ppnRate]);

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
        }
      `}</style>

      <main className="min-h-screen bg-slate-200/60 px-3 py-4 print:bg-white print:px-0 print:py-0">
        <div className="mx-auto flex w-full max-w-[8.5in] items-center justify-between gap-3 pb-4 print:hidden">
          <div>
            <h1 className="text-lg font-semibold text-slate-900">{t("invoice.export.previewTitle")}</h1>
            <p className="text-sm text-slate-600">{t("invoice.export.previewDescription")}</p>
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
                router.push("/invoice");
              }}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              {t("common.close")}
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="mx-auto max-w-[8.5in] print:hidden">
            <ApiLoadingState />
          </div>
        ) : errorMessage ? (
          <section className="mx-auto max-w-[8.5in] rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 print:hidden">
            <p>{errorMessage}</p>
          </section>
        ) : invoice && isMeiloonCustomer ? (
          <section
            className="mx-auto flex h-[11in] min-h-[11in] w-full max-w-[8.5in] flex-col bg-white text-black shadow-xl print:h-[11in] print:min-h-[11in] print:max-w-none print:shadow-none"
            style={{ fontFamily: "Arial, Helvetica, sans-serif" }}
          >
            <div
              className={`px-[5mm] py-[7mm] text-[13px] leading-[1.18] ${
                meiloonPaginatedRows.isSinglePage ? "flex min-h-0 flex-1 flex-col" : "min-h-[11in] break-after-page print:break-after-page"
              }`}
            >
              <div className="flex items-start justify-between gap-8 pt-4">
                <div className="max-w-[58%]">
                  <p className="text-[18px] font-bold">{companyProfile.name}</p>
                  {companyProfile.addressLines.map((line) => (
                    <p key={line} className="text-[12px] leading-[1.18]">
                      {line}
                    </p>
                  ))}
                </div>

                <div className="shrink-0 pt-3 text-[14px] font-bold">
                  <div className="grid grid-cols-[86px_12px_1fr] gap-x-1">
                    <span>{t("invoice.export.tanggalLabel")}</span>
                    <span>:</span>
                    <span>{templateDate}</span>
                    <span>{t("invoice.export.noInvoiceLabel")}</span>
                    <span>:</span>
                    <span>{invoice.noInvoice || "-"}</span>
                  </div>
                </div>
              </div>

              <div className="mt-1 border-t-2 border-black pt-1">
                <div className="flex items-center justify-between">
                  <p className="text-[12px] italic">{t("invoice.export.customerLabel")}</p>
                  <p className="text-[18px] font-bold italic">{t("invoice.export.title")}</p>
                </div>

                <div className="mt-0.5 w-[68%] border-2 border-black px-2 py-1">
                  <p className="text-[14px] font-bold">{meiloonCustomerNameValue || meiloonInvoiceProfile.name}</p>
                  <p className="text-[12px] leading-[1.18]">
                    {t("invoice.export.customerNpwpLabel")} : {String(customer?.npwp || "").trim() || meiloonInvoiceProfile.npwp}
                  </p>
                  <p className="whitespace-pre-line text-[12px] leading-[1.18]">{meiloonCustomerAddress}</p>
                  <p className="text-[12px] leading-[1.18]">ATTN : {meiloonCustomerAttn || meiloonInvoiceProfile.attnFallback}</p>
                </div>
              </div>

              <div className={`mt-1 ${meiloonPaginatedRows.isSinglePage ? "min-h-0 flex-1" : ""}`.trim()}>
                <MeiloonInvoiceTable
                  rows={meiloonPaginatedRows.firstPageRows}
                  t={t}
                  className={meiloonPaginatedRows.isSinglePage ? "h-full" : ""}
                />
              </div>
            </div>

            {meiloonPaginatedRows.isSinglePage ? (
              <div className="shrink-0 px-[5mm] pb-[7mm] text-[13px] leading-[1.18]">
                <div className="mt-2 grid grid-cols-[1.05fr_0.65fr] gap-3">
                  <div className="space-y-2">
                    <div className="border-2 border-black px-2 py-1">
                      <p className="text-[12px] font-bold">{t("invoice.export.payment.title")}</p>
                      <div className="mt-0.5 grid grid-cols-[52px_10px_1fr] gap-x-1 text-[12px]">
                        <span>{t("invoice.export.payment.nameLabel")}</span>
                        <span>:</span>
                        <span>{paymentProfile.nama}</span>
                        <span>{t("invoice.export.payment.accountLabel")}</span>
                        <span>:</span>
                        <span>{paymentProfile.rekening}</span>
                        <span>{t("invoice.export.payment.bankLabel")}</span>
                        <span>:</span>
                        <span>{paymentProfile.bank}</span>
                      </div>
                    </div>

                    <div>
                      <p className="text-[12px] font-bold">{t("invoice.export.noteTitle")}</p>
                      <ol className="mt-0.5 list-decimal pl-5 text-[11px] leading-[1.2]">
                        <li>{t("invoice.export.note.1")}</li>
                        <li>{t("invoice.export.note.2")}</li>
                        <li>{t("invoice.export.note.3")}</li>
                      </ol>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="border-2 border-black">
                      <div className="grid grid-cols-[1fr_120px] border-b border-black text-[12px] font-bold last:border-b-0">
                        <div className="border-r border-black px-2 py-1">{t("invoice.export.summary.subtotal")}</div>
                        <div className="px-2 py-1 text-right">{formatPlainNumber(Number(invoice.subtotal || 0))}</div>
                      </div>
                      <div className="grid grid-cols-[1fr_120px] border-b border-black text-[12px] font-bold last:border-b-0">
                        <div className="border-r border-black px-2 py-1">
                          {t("invoice.export.summary.dppNilaiLain", { ratio: dppRatio })}
                        </div>
                        <div className="px-2 py-1 text-right">{formatPlainNumber(dppValue)}</div>
                      </div>
                      <div className="grid grid-cols-[1fr_120px] border-b border-black text-[12px] font-bold last:border-b-0">
                        <div className="border-r border-black px-2 py-1">
                          {t("invoice.export.summary.ppn", { rate: meiloonPpnRate })}
                        </div>
                        <div className="px-2 py-1 text-right">{formatPlainNumber(meiloonPpnAmount)}</div>
                      </div>
                      <div className="grid grid-cols-[1fr_120px] text-[12px] font-bold">
                        <div className="border-r border-black px-2 py-1">{t("invoice.export.summary.total")}</div>
                        <div className="px-2 py-1 text-right">{formatPlainNumber(Number(invoice.grandTotal || 0))}</div>
                      </div>
                    </div>

                    <div className="ml-auto w-[200px] pt-4 text-center">
                      <p className="text-[14px] font-bold">{t("invoice.export.signature.regards")}</p>
                      <div className="h-[72px]" />
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {meiloonPaginatedRows.middlePages.map((pageRows, pageIndex) => (
                  <div
                    key={`meiloon-middle-page-${pageIndex}`}
                    className="min-h-[11in] break-after-page px-[5mm] py-[7mm] text-[13px] leading-[1.18] print:break-after-page"
                  >
                    <MeiloonInvoiceTable rows={pageRows} t={t} />
                  </div>
                ))}

                <div className="min-h-[11in] px-[5mm] py-[7mm] text-[13px] leading-[1.18]">
                  <MeiloonInvoiceTable rows={meiloonPaginatedRows.lastPageRows} t={t} />

                  <div className="mt-2 grid grid-cols-[1.05fr_0.65fr] gap-3">
                    <div className="space-y-2">
                      <div className="border-2 border-black px-2 py-1">
                        <p className="text-[12px] font-bold">{t("invoice.export.payment.title")}</p>
                        <div className="mt-0.5 grid grid-cols-[52px_10px_1fr] gap-x-1 text-[12px]">
                          <span>{t("invoice.export.payment.nameLabel")}</span>
                          <span>:</span>
                          <span>{paymentProfile.nama}</span>
                          <span>{t("invoice.export.payment.accountLabel")}</span>
                          <span>:</span>
                          <span>{paymentProfile.rekening}</span>
                          <span>{t("invoice.export.payment.bankLabel")}</span>
                          <span>:</span>
                          <span>{paymentProfile.bank}</span>
                        </div>
                      </div>

                      <div>
                        <p className="text-[12px] font-bold">{t("invoice.export.noteTitle")}</p>
                        <ol className="mt-0.5 list-decimal pl-5 text-[11px] leading-[1.2]">
                          <li>{t("invoice.export.note.1")}</li>
                          <li>{t("invoice.export.note.2")}</li>
                          <li>{t("invoice.export.note.3")}</li>
                        </ol>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="border-2 border-black">
                        <div className="grid grid-cols-[1fr_120px] border-b border-black text-[12px] font-bold last:border-b-0">
                          <div className="border-r border-black px-2 py-1">{t("invoice.export.summary.subtotal")}</div>
                          <div className="px-2 py-1 text-right">{formatPlainNumber(Number(invoice.subtotal || 0))}</div>
                        </div>
                        <div className="grid grid-cols-[1fr_120px] border-b border-black text-[12px] font-bold last:border-b-0">
                          <div className="border-r border-black px-2 py-1">
                            {t("invoice.export.summary.dppNilaiLain", { ratio: dppRatio })}
                          </div>
                          <div className="px-2 py-1 text-right">{formatPlainNumber(dppValue)}</div>
                        </div>
                        <div className="grid grid-cols-[1fr_120px] border-b border-black text-[12px] font-bold last:border-b-0">
                          <div className="border-r border-black px-2 py-1">
                            {t("invoice.export.summary.ppn", { rate: meiloonPpnRate })}
                          </div>
                          <div className="px-2 py-1 text-right">{formatPlainNumber(meiloonPpnAmount)}</div>
                        </div>
                        <div className="grid grid-cols-[1fr_120px] text-[12px] font-bold">
                          <div className="border-r border-black px-2 py-1">{t("invoice.export.summary.total")}</div>
                          <div className="px-2 py-1 text-right">{formatPlainNumber(Number(invoice.grandTotal || 0))}</div>
                        </div>
                      </div>

                      <div className="ml-auto w-[200px] pt-4 text-center">
                        <p className="text-[14px] font-bold">{t("invoice.export.signature.regards")}</p>
                        <div className="h-[72px]" />
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </section>
        ) : invoice ? (
          <section
            className="mx-auto flex h-[11in] min-h-[11in] w-full max-w-[8.5in] flex-col bg-white text-black shadow-xl print:h-[11in] print:min-h-[11in] print:max-w-none print:shadow-none"
            style={{ fontFamily: "Arial, Helvetica, sans-serif" }}
          >
            <div
              className={`px-[4mm] py-[6mm] text-[13px] leading-[1.18] ${
                defaultPaginatedRows.isSinglePage ? "flex min-h-0 flex-1 flex-col" : "min-h-[11in] break-after-page print:break-after-page"
              }`}
            >
              <div className="flex items-start justify-between gap-8 pt-3">
                <div className="max-w-[58%]">
                  <p className="text-[18px] font-bold">{companyProfile.name}</p>
                  {companyProfile.addressLines.map((line) => (
                    <p key={line} className="text-[12px] leading-[1.18]">
                      {line}
                    </p>
                  ))}
                </div>

                <div className="shrink-0 pt-2 text-[14px] font-bold">
                  <div className="grid grid-cols-[86px_12px_1fr] gap-x-1">
                    <span>{t("invoice.export.tanggalLabel")}</span>
                    <span>:</span>
                    <span>{templateDate}</span>
                    <span>{t("invoice.export.noInvoiceLabel")}</span>
                    <span>:</span>
                    <span>{invoice.noInvoice || "-"}</span>
                  </div>
                </div>
              </div>

              <div className="mt-1 border-t-2 border-black pt-1">
                <div className="flex items-center justify-between">
                  <p className="text-[12px] italic">{t("invoice.export.customerLabel")}</p>
                  <p className="text-[18px] font-bold italic">{t("invoice.export.title")}</p>
                </div>

              <div className="mt-0.5 grid grid-cols-[1.08fr_0.72fr] gap-3">
                  <div className="border border-black px-2 py-1">
                    <p className="text-[14px] font-bold">{customerName || "-"}</p>
                    <p className="text-[12px] leading-[1.18]">
                      {t("invoice.export.customerNpwpLabel")} : {customerNpwp}
                    </p>
                    <p className="whitespace-pre-line text-[12px] leading-[1.18]">{customerAddress || "-"}</p>
                  </div>

                  <div className="pt-0.5 text-[14px] font-bold">
                    <div className="grid grid-cols-[88px_12px_1fr] gap-x-1">
                      <span>{t("invoice.export.noPoLabel")}</span>
                      <span>:</span>
                      <span>{invoice.noPo || "-"}</span>
                      <span>{t("invoice.export.noSuratJalanLabel")}</span>
                      <span>:</span>
                      <span>{noSuratJalanLabel || "-"}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className={`mt-1 ${defaultPaginatedRows.isSinglePage ? "min-h-0 flex-1" : ""}`.trim()}>
                <DefaultInvoiceTable
                  rows={defaultPaginatedRows.firstPageRows}
                  t={t}
                  className={defaultPaginatedRows.isSinglePage ? "h-full" : ""}
                />
              </div>
            </div>

            {defaultPaginatedRows.isSinglePage ? (
              <div className="shrink-0 px-[4mm] pb-[6mm] text-[13px] leading-[1.18]">
                <div className="mt-2 grid grid-cols-[1fr_0.48fr] gap-3">
                  <div className="space-y-2">
                    <div className="border border-black px-2 py-1">
                      <p className="text-[12px] font-bold">{t("invoice.export.payment.title")}</p>
                      <div className="mt-0.5 grid grid-cols-[52px_10px_1fr] gap-x-1 text-[12px] font-bold">
                        <span>{t("invoice.export.payment.nameLabel")}</span>
                        <span>:</span>
                        <span>{paymentProfile.nama}</span>
                        <span>{t("invoice.export.payment.accountLabel")}</span>
                        <span>:</span>
                        <span>{paymentProfile.rekening}</span>
                        <span>{t("invoice.export.payment.bankLabel")}</span>
                        <span>:</span>
                        <span>{paymentProfile.bank}</span>
                      </div>
                    </div>

                    <div>
                      <p className="text-[12px] font-bold">{t("invoice.export.noteTitle")}</p>
                      <ol className="mt-0.5 list-decimal pl-5 text-[11px] font-bold leading-[1.2]">
                        <li>{t("invoice.export.note.1")}</li>
                        <li>{t("invoice.export.note.2")}</li>
                        <li>{t("invoice.export.note.3")}</li>
                      </ol>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="border border-black">
                      <div className="grid grid-cols-[1fr_120px] border-b border-black text-[12px] last:border-b-0">
                        <div className="border-r border-black px-2 py-0.5">{t("invoice.export.default.summary.beforeTaxTotal")}</div>
                        <div className="px-2 py-0.5 text-right">{formatPlainNumber(Number(invoice.subtotal || 0))}</div>
                      </div>
                      <div className="grid grid-cols-[1fr_120px] border-b border-black text-[12px] last:border-b-0">
                        <div className="border-r border-black px-2 py-0.5">
                          {t("invoice.export.summary.ppn", { rate: invoice.ppnRate })}
                        </div>
                        <div className="px-2 py-0.5 text-right">{formatPlainNumber(Number(invoice.ppnAmount || 0))}</div>
                      </div>
                      <div className="grid grid-cols-[1fr_120px] text-[12px] font-bold">
                        <div className="border-r border-black px-2 py-0.5">{t("invoice.export.summary.total")}</div>
                        <div className="px-2 py-0.5 text-right">{formatPlainNumber(Number(invoice.grandTotal || 0))}</div>
                      </div>
                    </div>

                    <div className="ml-auto w-[200px] pt-1 text-center">
                      <p className="text-[14px] font-bold">{t("invoice.export.signature.regards")}</p>
                      <div className="h-[62px]" />
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {defaultPaginatedRows.middlePages.map((pageRows, pageIndex) => (
                  <div
                    key={`default-middle-page-${pageIndex}`}
                    className="min-h-[11in] break-after-page px-[4mm] py-[6mm] text-[13px] leading-[1.18] print:break-after-page"
                  >
                    <DefaultInvoiceTable rows={pageRows} t={t} />
                  </div>
                ))}

                <div className="min-h-[11in] px-[4mm] py-[6mm] text-[13px] leading-[1.18]">
                  <DefaultInvoiceTable rows={defaultPaginatedRows.lastPageRows} t={t} />

                  <div className="mt-2 grid grid-cols-[1fr_0.48fr] gap-3">
                    <div className="space-y-2">
                      <div className="border border-black px-2 py-1">
                        <p className="text-[12px] font-bold">{t("invoice.export.payment.title")}</p>
                        <div className="mt-0.5 grid grid-cols-[52px_10px_1fr] gap-x-1 text-[12px] font-bold">
                          <span>{t("invoice.export.payment.nameLabel")}</span>
                          <span>:</span>
                          <span>{paymentProfile.nama}</span>
                          <span>{t("invoice.export.payment.accountLabel")}</span>
                          <span>:</span>
                          <span>{paymentProfile.rekening}</span>
                          <span>{t("invoice.export.payment.bankLabel")}</span>
                          <span>:</span>
                          <span>{paymentProfile.bank}</span>
                        </div>
                      </div>

                      <div>
                        <p className="text-[12px] font-bold">{t("invoice.export.noteTitle")}</p>
                        <ol className="mt-0.5 list-decimal pl-5 text-[11px] font-bold leading-[1.2]">
                          <li>{t("invoice.export.note.1")}</li>
                          <li>{t("invoice.export.note.2")}</li>
                          <li>{t("invoice.export.note.3")}</li>
                        </ol>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="border border-black">
                        <div className="grid grid-cols-[1fr_120px] border-b border-black text-[12px] last:border-b-0">
                          <div className="border-r border-black px-2 py-0.5">{t("invoice.export.default.summary.beforeTaxTotal")}</div>
                          <div className="px-2 py-0.5 text-right">{formatPlainNumber(Number(invoice.subtotal || 0))}</div>
                        </div>
                        <div className="grid grid-cols-[1fr_120px] border-b border-black text-[12px] last:border-b-0">
                          <div className="border-r border-black px-2 py-0.5">
                            {t("invoice.export.summary.ppn", { rate: invoice.ppnRate })}
                          </div>
                          <div className="px-2 py-0.5 text-right">{formatPlainNumber(Number(invoice.ppnAmount || 0))}</div>
                        </div>
                        <div className="grid grid-cols-[1fr_120px] text-[12px] font-bold">
                          <div className="border-r border-black px-2 py-0.5">{t("invoice.export.summary.total")}</div>
                          <div className="px-2 py-0.5 text-right">{formatPlainNumber(Number(invoice.grandTotal || 0))}</div>
                        </div>
                      </div>

                      <div className="ml-auto w-[200px] pt-1 text-center">
                        <p className="text-[14px] font-bold">{t("invoice.export.signature.regards")}</p>
                        <div className="h-[62px]" />
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </section>
        ) : null}
      </main>
    </>
  );
}
