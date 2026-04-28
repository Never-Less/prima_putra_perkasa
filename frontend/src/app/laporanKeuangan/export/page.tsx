"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ApiLoadingState } from "../../_components/api-loading-state";
import { useI18n } from "../../_i18n/provider";
import { ApiRequestError } from "../../_lib/api-client";
import { fetchCustomerRows } from "../../customer/_lib/customer";
import {
  defaultInvoiceFilter,
  fetchInvoiceExportRows,
  type InvoiceItem,
} from "../../invoice/_lib/invoice";
import {
  fetchLaporanKeuangan,
  formatLaporanKeuanganCurrency,
  formatLaporanKeuanganMonth,
  getCurrentMonthValue,
  getMonthDateRange,
  type LaporanKeuanganItem,
} from "../_lib/laporan-keuangan";

type ExcelCellValue = string | number | null | undefined;

type ExcelWorksheetData = {
  name: string;
  rows: ExcelCellValue[][];
  columnWidths?: number[];
  merges?: string[];
};

type FinancialReportRowKind =
  | "invoice"
  | "invoiceDetail"
  | "total"
  | "grandTotal"
  | "grossProfit"
  | "section"
  | "operational"
  | "operationalTotal"
  | "netProfit"
  | "spacer";

type FinancialReportRow = {
  kind: FinancialReportRowKind;
  date?: string;
  description?: string;
  debet?: number;
  kreditPpn?: number;
  kreditNonPpn?: number;
  bayar?: string;
  note?: string;
};

function escapeExcelXml(value: ExcelCellValue) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function toExcelColumnName(index: number) {
  let columnName = "";
  let value = index + 1;

  while (value > 0) {
    const modulo = (value - 1) % 26;
    columnName = String.fromCharCode(65 + modulo) + columnName;
    value = Math.floor((value - modulo) / 26);
  }

  return columnName;
}

function toExcelCell(value: ExcelCellValue, columnIndex: number, rowIndex: number) {
  const cellReference = `${toExcelColumnName(columnIndex)}${rowIndex + 1}`;

  if (typeof value === "number" && Number.isFinite(value)) {
    return `<c r="${cellReference}"><v>${value}</v></c>`;
  }

  return `<c r="${cellReference}" t="inlineStr"><is><t>${escapeExcelXml(value)}</t></is></c>`;
}

function toExcelRows(rows: ExcelCellValue[][]) {
  return rows
    .map(
      (row, rowIndex) =>
        `<row r="${rowIndex + 1}">${row
          .map((value, columnIndex) => (value === null || value === undefined ? "" : toExcelCell(value, columnIndex, rowIndex)))
          .join("")}</row>`
    )
    .join("");
}

function toExcelColumnsXml(columnWidths?: number[]) {
  if (!columnWidths?.length) {
    return "";
  }

  return `<cols>${columnWidths
    .map(
      (width, index) =>
        `<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"/>`
    )
    .join("")}</cols>`;
}

function toExcelMergesXml(merges?: string[]) {
  if (!merges?.length) {
    return "";
  }

  return `<mergeCells count="${merges.length}">${merges
    .map((merge) => `<mergeCell ref="${escapeExcelXml(merge)}"/>`)
    .join("")}</mergeCells>`;
}

function toExcelWorksheetXml(worksheet: ExcelWorksheetData) {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  ${toExcelColumnsXml(worksheet.columnWidths)}
  <sheetData>${toExcelRows(worksheet.rows)}</sheetData>
  ${toExcelMergesXml(worksheet.merges)}
</worksheet>`;
}

function writeUint16(view: DataView, offset: number, value: number) {
  view.setUint16(offset, value, true);
}

function writeUint32(view: DataView, offset: number, value: number) {
  view.setUint32(offset, value, true);
}

const crc32Table = (() => {
  const table = new Uint32Array(256);

  for (let i = 0; i < table.length; i += 1) {
    let value = i;

    for (let j = 0; j < 8; j += 1) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }

    table[i] = value >>> 0;
  }

  return table;
})();

function getCrc32(bytes: Uint8Array) {
  let crc = 0xffffffff;

  for (const byte of bytes) {
    crc = crc32Table[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }

  return (crc ^ 0xffffffff) >>> 0;
}

function concatBytes(chunks: Uint8Array[]) {
  const totalLength = chunks.reduce((total, chunk) => total + chunk.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;

  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }

  return result;
}

function createStoredZip(files: Array<{ path: string; content: string }>) {
  const encoder = new TextEncoder();
  const fileChunks: Uint8Array[] = [];
  const centralDirectoryChunks: Uint8Array[] = [];
  let offset = 0;

  for (const file of files) {
    const pathBytes = encoder.encode(file.path);
    const contentBytes = encoder.encode(file.content);
    const crc32 = getCrc32(contentBytes);
    const localHeader = new Uint8Array(30 + pathBytes.length);
    const localHeaderView = new DataView(localHeader.buffer);

    writeUint32(localHeaderView, 0, 0x04034b50);
    writeUint16(localHeaderView, 4, 20);
    writeUint16(localHeaderView, 6, 0);
    writeUint16(localHeaderView, 8, 0);
    writeUint16(localHeaderView, 10, 0);
    writeUint16(localHeaderView, 12, 0);
    writeUint32(localHeaderView, 14, crc32);
    writeUint32(localHeaderView, 18, contentBytes.length);
    writeUint32(localHeaderView, 22, contentBytes.length);
    writeUint16(localHeaderView, 26, pathBytes.length);
    writeUint16(localHeaderView, 28, 0);
    localHeader.set(pathBytes, 30);

    fileChunks.push(localHeader, contentBytes);

    const centralDirectoryHeader = new Uint8Array(46 + pathBytes.length);
    const centralDirectoryView = new DataView(centralDirectoryHeader.buffer);

    writeUint32(centralDirectoryView, 0, 0x02014b50);
    writeUint16(centralDirectoryView, 4, 20);
    writeUint16(centralDirectoryView, 6, 20);
    writeUint16(centralDirectoryView, 8, 0);
    writeUint16(centralDirectoryView, 10, 0);
    writeUint16(centralDirectoryView, 12, 0);
    writeUint16(centralDirectoryView, 14, 0);
    writeUint32(centralDirectoryView, 16, crc32);
    writeUint32(centralDirectoryView, 20, contentBytes.length);
    writeUint32(centralDirectoryView, 24, contentBytes.length);
    writeUint16(centralDirectoryView, 28, pathBytes.length);
    writeUint16(centralDirectoryView, 30, 0);
    writeUint16(centralDirectoryView, 32, 0);
    writeUint16(centralDirectoryView, 34, 0);
    writeUint16(centralDirectoryView, 36, 0);
    writeUint32(centralDirectoryView, 38, 0);
    writeUint32(centralDirectoryView, 42, offset);
    centralDirectoryHeader.set(pathBytes, 46);
    centralDirectoryChunks.push(centralDirectoryHeader);

    offset += localHeader.length + contentBytes.length;
  }

  const centralDirectoryOffset = offset;
  const centralDirectory = concatBytes(centralDirectoryChunks);
  const endOfCentralDirectory = new Uint8Array(22);
  const endOfCentralDirectoryView = new DataView(endOfCentralDirectory.buffer);

  writeUint32(endOfCentralDirectoryView, 0, 0x06054b50);
  writeUint16(endOfCentralDirectoryView, 4, 0);
  writeUint16(endOfCentralDirectoryView, 6, 0);
  writeUint16(endOfCentralDirectoryView, 8, files.length);
  writeUint16(endOfCentralDirectoryView, 10, files.length);
  writeUint32(endOfCentralDirectoryView, 12, centralDirectory.length);
  writeUint32(endOfCentralDirectoryView, 16, centralDirectoryOffset);
  writeUint16(endOfCentralDirectoryView, 20, 0);

  return concatBytes([...fileChunks, centralDirectory, endOfCentralDirectory]);
}

function createExcelWorkbookBlob(worksheets: ExcelWorksheetData[]) {
  const files = [
    {
      path: "[Content_Types].xml",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  ${worksheets
    .map(
      (_worksheet, index) =>
        `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`
    )
    .join("")}
</Types>`,
    },
    {
      path: "_rels/.rels",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`,
    },
    {
      path: "xl/workbook.xml",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    ${worksheets
      .map(
        (worksheet, index) =>
          `<sheet name="${escapeExcelXml(worksheet.name)}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`
      )
      .join("")}
  </sheets>
</workbook>`,
    },
    {
      path: "xl/_rels/workbook.xml.rels",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  ${worksheets
    .map(
      (_worksheet, index) =>
        `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`
    )
    .join("")}
</Relationships>`,
    },
    ...worksheets.map((worksheet, index) => ({
      path: `xl/worksheets/sheet${index + 1}.xml`,
      content: toExcelWorksheetXml(worksheet),
    })),
  ];

  return new Blob([createStoredZip(files)], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

function downloadExcelFile(fileName: string, worksheets: ExcelWorksheetData[]) {
  const blob = createExcelWorkbookBlob(worksheets);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function formatSpreadsheetDate(value: string) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value.slice(0, 10);
  }

  const day = date.getDate();
  const month = new Intl.DateTimeFormat("en-US", { month: "short" }).format(date);

  return `${day}-${month}`;
}

function formatAccountingNumber(value: number | undefined, locale: "id" | "en") {
  if (value === undefined) {
    return "";
  }

  return new Intl.NumberFormat(locale === "en" ? "en-US" : "id-ID", {
    maximumFractionDigits: 0,
  }).format(value);
}

function toOptionalAmount(value: number) {
  return value === 0 ? undefined : value;
}

function formatInvoiceBarangDescription(barang: InvoiceItem["barang"][number]) {
  const parts = [barang.namaBarang, barang.spesifikasi].map((value) => value.trim()).filter(Boolean);
  const quantity = [barang.kuantitas, barang.unit].filter(Boolean).join(" ");
  const description = parts.join(" - ");

  return quantity ? `${description} (${quantity})` : description;
}

export default function LaporanKeuanganExportPage() {
  const { locale, t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const bulan = String(searchParams.get("bulan") || "").trim() || getCurrentMonthValue();
  const [item, setItem] = useState<LaporanKeuanganItem | null>(null);
  const [invoiceRows, setInvoiceRows] = useState<InvoiceItem[]>([]);
  const [customerLabelMap, setCustomerLabelMap] = useState<Map<string, string>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const monthLabel = useMemo(
    () => formatLaporanKeuanganMonth(bulan, locale),
    [bulan, locale]
  );
  const grossProfit = useMemo(() => {
    return invoiceRows.reduce((total, row) => total + Number(row.grandTotal || 0), 0);
  }, [invoiceRows]);
  const totalBiayaOperasional = item?.totalBiayaOperasional || 0;
  const netProfit = grossProfit - totalBiayaOperasional;
  const invoicePpnTotal = useMemo(() => {
    return invoiceRows.reduce((total, row) => total + Number(row.ppnAmount || 0), 0);
  }, [invoiceRows]);
  const invoiceNonPpnTotal = Math.max(0, grossProfit - invoicePpnTotal);
  const financialReportRows = useMemo(() => {
    const rows: FinancialReportRow[] = [];

    invoiceRows.forEach((row) => {
      const grandTotal = Number(row.grandTotal || 0);
      const ppnAmount = Number(row.ppnAmount || 0);
      const nonPpnAmount = Math.max(0, grandTotal - ppnAmount);
      const customerName = customerLabelMap.get(row.idCustomer) || row.idCustomer || "-";

      rows.push({
        kind: "invoice",
        date: formatSpreadsheetDate(row.tanggal),
        description: `${customerName} (${row.noInvoice || "-"})`,
        debet: grandTotal,
        kreditPpn: toOptionalAmount(ppnAmount),
        kreditNonPpn: toOptionalAmount(nonPpnAmount),
      });

      row.barang.forEach((barang) => {
        rows.push({
          kind: "invoiceDetail",
          description: formatInvoiceBarangDescription(barang),
        });
      });

      rows.push({ kind: "spacer" });
    });

    rows.push({
      kind: "total",
      description: t("laporanKeuangan.report.totalJumlah"),
      debet: grossProfit,
      kreditPpn: toOptionalAmount(invoicePpnTotal),
      kreditNonPpn: toOptionalAmount(invoiceNonPpnTotal),
    });
    rows.push({
      kind: "grandTotal",
      description: t("laporanKeuangan.report.grandTotal"),
      debet: grossProfit,
      kreditNonPpn: grossProfit,
    });
    rows.push({ kind: "spacer" });
    rows.push({
      kind: "grossProfit",
      description: t("field.grossProfit").toUpperCase(),
      kreditNonPpn: grossProfit,
    });
    rows.push({ kind: "spacer" });
    rows.push({
      kind: "section",
      description: t("laporanKeuangan.report.biayaOperasional"),
    });

    item?.rincianBiaya.forEach((row) => {
      rows.push({
        kind: "operational",
        description: row.namaBiaya,
        kreditNonPpn: row.jumlah,
      });
    });

    rows.push({ kind: "spacer" });
    rows.push({
      kind: "operationalTotal",
      description: t("field.totalBiayaOperasional").toUpperCase(),
      kreditNonPpn: totalBiayaOperasional,
    });
    rows.push({ kind: "spacer" });
    rows.push({
      kind: "netProfit",
      description: t("field.netProfit").toUpperCase(),
      kreditNonPpn: netProfit,
    });

    return rows;
  }, [
    customerLabelMap,
    grossProfit,
    invoiceNonPpnTotal,
    invoicePpnTotal,
    invoiceRows,
    item,
    netProfit,
    t,
    totalBiayaOperasional,
  ]);

  useEffect(() => {
    const previousTitle = document.title;
    document.title = `laporan-keuangan-${bulan}`;

    return () => {
      document.title = previousTitle;
    };
  }, [bulan]);

  useEffect(() => {
    let isCancelled = false;

    async function loadExportData() {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const { tanggalDari, tanggalSampai } = getMonthDateRange(bulan);
        const [laporanKeuangan, invoices, customers] = await Promise.all([
          fetchLaporanKeuangan(bulan),
          fetchInvoiceExportRows({
            ...defaultInvoiceFilter,
            tanggalDari,
            tanggalSampai,
          }),
          fetchCustomerRows(),
        ]);

        if (isCancelled) {
          return;
        }

        setItem(laporanKeuangan);
        setInvoiceRows(invoices);
        setCustomerLabelMap(
          new Map(customers.map((customer) => [customer.id, customer.nama || customer.id]))
        );
      } catch (error) {
        if (isCancelled) {
          return;
        }

        if (error instanceof ApiRequestError) {
          setErrorMessage(error.message || t("laporanKeuangan.exportPage.loadError"));
        } else {
          setErrorMessage(t("laporanKeuangan.exportPage.loadError"));
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
  }, [bulan, t]);

  function handleClosePage() {
    window.close();

    window.setTimeout(() => {
      if (!document.hidden) {
        router.push("/laporanKeuangan");
      }
    }, 150);
  }

  function handleExportExcel() {
    const reportRows: ExcelCellValue[][] = [
      [
        t("laporanKeuangan.report.date"),
        t("laporanKeuangan.report.description"),
        t("laporanKeuangan.report.debet"),
        t("laporanKeuangan.report.kredit"),
        null,
        t("laporanKeuangan.report.bayar"),
        t("laporanKeuangan.report.note"),
      ],
      [null, null, null, t("field.ppn"), t("laporanKeuangan.report.nonPpn"), null, null],
      ...financialReportRows.map((row) => [
        row.date || null,
        row.description || null,
        row.debet,
        row.kreditPpn,
        row.kreditNonPpn,
        row.bayar || null,
        row.note || null,
      ]),
    ];

    downloadExcelFile(`laporan-keuangan-${bulan}.xlsx`, [
      {
        name: "Laporan Keuangan",
        rows: reportRows,
        columnWidths: [12, 48, 16, 16, 16, 12, 28],
        merges: ["A1:A2", "B1:B2", "C1:C2", "D1:E1", "F1:F2", "G1:G2"],
      },
    ]);
  }

  return (
    <>
      <style jsx global>{`
        @page {
          size: A4 portrait;
          margin: 12mm;
        }
      `}</style>

      <main className="min-h-screen bg-slate-100 px-4 py-4 print:bg-white print:px-0 print:py-0">
        <div className="mx-auto max-w-[900px] space-y-4 print:max-w-none">
          <header className="flex flex-wrap items-start justify-between gap-3 rounded-2xl bg-white p-4 shadow-sm print:hidden">
            <div>
              <h1 className="text-xl font-semibold text-slate-900">{t("laporanKeuangan.exportPage.title")}</h1>
              <p className="mt-1 text-sm text-slate-600">{t("laporanKeuangan.exportPage.description")}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExportExcel}
                disabled={isLoading || Boolean(errorMessage)}
                className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {t("common.exportExcel")}
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="rounded-lg bg-sky-700 px-4 py-2 text-sm font-medium text-white hover:bg-sky-600"
              >
                {t("common.print")}
              </button>
              <button
                type="button"
                onClick={handleClosePage}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
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
            <section className="space-y-4 rounded-2xl bg-white p-4 shadow-sm print:rounded-none print:p-0 print:shadow-none">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-300 pb-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                    {t("brand.name")}
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-slate-900">
                    {t("laporanKeuangan.exportPage.heading")}
                  </h2>
                  <p className="mt-1 text-sm text-slate-600">{monthLabel}</p>
                </div>
                <div className="rounded-lg border border-slate-300 px-3 py-2 text-right">
                  <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">
                    {t("field.netProfit")}
                  </p>
                  <p className={`mt-1 text-lg font-semibold ${netProfit >= 0 ? "text-slate-900" : "text-red-700"}`}>
                    {formatLaporanKeuanganCurrency(netProfit, locale)}
                  </p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border border-slate-300 px-3 py-2">
                  <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">{t("field.grossProfit")}</p>
                  <p className="mt-1 font-semibold text-slate-900">{formatLaporanKeuanganCurrency(grossProfit, locale)}</p>
                </div>
                <div className="rounded-lg border border-slate-300 px-3 py-2">
                  <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">{t("field.totalBiayaOperasional")}</p>
                  <p className="mt-1 font-semibold text-slate-900">{formatLaporanKeuanganCurrency(totalBiayaOperasional, locale)}</p>
                </div>
                <div className="rounded-lg border border-slate-300 px-3 py-2">
                  <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">{t("field.netProfit")}</p>
                  <p className={`mt-1 font-semibold ${netProfit >= 0 ? "text-slate-900" : "text-red-700"}`}>
                    {formatLaporanKeuanganCurrency(netProfit, locale)}
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto border border-slate-300 print:overflow-visible">
                <table className="w-full min-w-[980px] border-collapse text-sm text-slate-900 print:text-[11px]">
                  <thead className="bg-amber-50 text-center font-semibold uppercase">
                    <tr>
                      <th rowSpan={2} className="w-24 border border-slate-400 px-2 py-2">{t("laporanKeuangan.report.date")}</th>
                      <th rowSpan={2} className="min-w-80 border border-slate-400 px-2 py-2">{t("laporanKeuangan.report.description")}</th>
                      <th rowSpan={2} className="w-32 border border-slate-400 px-2 py-2">{t("laporanKeuangan.report.debet")}</th>
                      <th colSpan={2} className="border border-slate-400 px-2 py-1">{t("laporanKeuangan.report.kredit")}</th>
                      <th rowSpan={2} className="w-20 border border-slate-400 px-2 py-2">{t("laporanKeuangan.report.bayar")}</th>
                      <th rowSpan={2} className="w-48 border border-slate-400 px-2 py-2">{t("laporanKeuangan.report.note")}</th>
                    </tr>
                    <tr>
                      <th className="w-32 border border-slate-400 px-2 py-1">{t("field.ppn")}</th>
                      <th className="w-32 border border-slate-400 px-2 py-1">{t("laporanKeuangan.report.nonPpn")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {financialReportRows.map((row, index) => {
                      const isSpacer = row.kind === "spacer";
                      const rowClassName =
                        row.kind === "grossProfit"
                          ? "bg-sky-200 font-semibold"
                          : row.kind === "operationalTotal"
                            ? "bg-orange-100 font-semibold"
                            : row.kind === "netProfit"
                              ? "bg-amber-100 font-semibold"
                              : row.kind === "total" || row.kind === "grandTotal"
                                ? "font-semibold"
                                : "";

                      return (
                        <tr key={`${row.kind}-${index}`} className={`${rowClassName} ${isSpacer ? "h-6" : ""}`}>
                          <td className="border border-slate-300 px-2 py-1 align-top">{row.date || ""}</td>
                          <td className={`border border-slate-300 px-2 py-1 align-top ${row.kind === "invoiceDetail" ? "pl-8" : ""}`}>
                            {row.description || ""}
                          </td>
                          <td className="border border-slate-300 px-2 py-1 text-right align-top">
                            {formatAccountingNumber(row.debet, locale)}
                          </td>
                          <td className="border border-slate-300 px-2 py-1 text-right align-top">
                            {formatAccountingNumber(row.kreditPpn, locale)}
                          </td>
                          <td className="border border-slate-300 px-2 py-1 text-right align-top">
                            {formatAccountingNumber(row.kreditNonPpn, locale)}
                          </td>
                          <td className="border border-slate-300 px-2 py-1 align-top">{row.bayar || ""}</td>
                          <td className="border border-slate-300 px-2 py-1 align-top">{row.note || ""}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}
        </div>
      </main>
    </>
  );
}
