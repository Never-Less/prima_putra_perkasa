"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ApiLoadingState } from "../../../_components/api-loading-state";
import { ExportCurrencyValue } from "../../../_components/export-currency-value";
import { formatAppUppercaseDate } from "../../../_lib/date";
import { ApiRequestError } from "../../../_lib/api-client";
import { decodeHtmlEntities } from "../../../_lib/html-entities";
import {
  downloadJspreadsheetXlsxFile,
  sanitizeExcelFileName,
  type JspreadsheetExportWorksheet,
} from "../../../_lib/jspreadsheet-xlsx-export";
import { printDocumentWhenFontsReady } from "../../../_lib/print";
import { formatPaymentTermLabel } from "../../../_lib/payment-term";
import { useI18n } from "../../../_i18n/provider";
import { fetchCustomerById, type CustomerItem } from "../../../customer/_lib/customer";
import {
  fetchInvoiceById,
  invoiceBarangNoPoLabel,
  type InvoiceItem,
} from "../../_lib/invoice";

const companyProfile = {
  name: "CV. PRIMA PUTRA PERKASA",
  addressLines: [
    "Lindeteves Trade Centre Lt. 2 Blok B20 No. 6, Jl. Hayam Wuruk No.127, Jakarta",
    "Tel. 021. 6246441, 62320362",
  ],
};

const meiloonCustomerName = "PT. MEILOON TECHNOLOGY INDONESIA";
const maxxisCustomerName = "PT. MAXXIS INTERNATIONAL INDONESIA";

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

const invoiceExportFontFamily = 'var(--font-geist-sans), "Segoe UI", sans-serif';
const invoiceBaseRowHeight = 21;
const invoiceFooterPageCapacityBuffer = 2;
const defaultInvoiceSinglePageCapacity = 28;
const meiloonInvoiceSinglePageCapacity = 26;
const defaultInvoiceFirstPageCapacity = 36;
const meiloonInvoiceFirstPageCapacity = 32;
const defaultInvoiceMiddlePageCapacity = 45;
const meiloonInvoiceMiddlePageCapacity = 43;
const defaultInvoiceLastPageCapacity = 39 - invoiceFooterPageCapacityBuffer;
const meiloonInvoiceLastPageCapacity = 39 - invoiceFooterPageCapacityBuffer;

type DefaultInvoiceTemplateRow = {
  no: string;
  namaBarang: string;
  qty: string;
  unit: string;
  hargaSatuan: string;
  jumlah: string;
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

type PaginateRowsConfig<T> = {
  singlePageCapacity: number;
  firstPageCapacity: number;
  middlePageCapacity: number;
  lastPageCapacity: number;
  createEmptyRow: () => T;
  estimateRowUnits: (row: T) => number;
};

type InvoicePageCapacities = {
  singlePageCapacity: number;
  firstPageCapacity: number;
  middlePageCapacity: number;
  lastPageCapacity: number;
};

type InvoiceRowMeasurements = {
  defaultRowHeights: number[];
  meiloonRowHeights: number[];
  defaultPageCapacities?: InvoicePageCapacities;
  meiloonPageCapacities?: InvoicePageCapacities;
};

const defaultInvoiceFallbackCapacities: InvoicePageCapacities = {
  singlePageCapacity: defaultInvoiceSinglePageCapacity,
  firstPageCapacity: defaultInvoiceFirstPageCapacity,
  middlePageCapacity: defaultInvoiceMiddlePageCapacity,
  lastPageCapacity: defaultInvoiceLastPageCapacity,
};

const meiloonInvoiceFallbackCapacities: InvoicePageCapacities = {
  singlePageCapacity: meiloonInvoiceSinglePageCapacity,
  firstPageCapacity: meiloonInvoiceFirstPageCapacity,
  middlePageCapacity: meiloonInvoiceMiddlePageCapacity,
  lastPageCapacity: meiloonInvoiceLastPageCapacity,
};

function normalizeCustomerName(value: string) {
  return toUpperText(value);
}

function toExportText(value: unknown) {
  return decodeHtmlEntities(value).trim();
}

function toUpperText(value: unknown) {
  return toExportText(value).toUpperCase();
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
  const text = toExportText(value);
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
  const normalizedNamaBarang = toExportText(namaBarang);
  const normalizedSpesifikasi = toExportText(spesifikasi);

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
  const namaBarang = toExportText(namaBarangValue);
  const spesifikasi = toExportText(spesifikasiValue);

  if (spesifikasi) {
    return {
      namaBarang,
      spesifikasi,
    };
  }

  return splitInvoiceBarangColumns(namaBarang);
}

function estimateWrappedLineCount(value: string, charactersPerLine: number) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  const normalizedCharactersPerLine = Math.max(1, charactersPerLine);

  if (!text) {
    return 1;
  }

  const words = text.split(" ");
  let lines = 1;
  let currentLineLength = 0;

  for (const word of words) {
    const wordLength = word.length;

    if (wordLength >= normalizedCharactersPerLine) {
      if (currentLineLength > 0) {
        lines += 1;
        currentLineLength = 0;
      }

      lines += Math.max(0, Math.ceil(wordLength / normalizedCharactersPerLine) - 1);
      currentLineLength = wordLength % normalizedCharactersPerLine;
      continue;
    }

    if (currentLineLength === 0) {
      currentLineLength = wordLength;
      continue;
    }

    if (currentLineLength + 1 + wordLength > normalizedCharactersPerLine) {
      lines += 1;
      currentLineLength = wordLength;
    } else {
      currentLineLength += 1 + wordLength;
    }
  }

  return lines;
}

function lineCountToRowUnits(lineCount: number) {
  return 1 + Math.max(0, lineCount - 1) * 0.55;
}

function estimateDefaultInvoiceRowUnits(row: DefaultInvoiceTemplateRow) {
  return lineCountToRowUnits(Math.max(1, estimateWrappedLineCount(row.namaBarang, 44)));
}

function estimateMeiloonInvoiceRowUnits(row: MeiloonInvoiceTemplateRow) {
  return lineCountToRowUnits(
    Math.max(
      1,
      estimateWrappedLineCount(row.namaBarang, 20),
      estimateWrappedLineCount(row.spesifikasi, 31)
    )
  );
}

function estimateRowsUnits<T>(rows: T[], estimateRowUnits: (row: T) => number) {
  return rows.reduce((total, row) => total + Math.max(1, estimateRowUnits(row)), 0);
}

function addFillerRowIfNeeded<T>(
  rows: T[],
  capacity: number,
  estimateRowUnits: (row: T) => number,
  createEmptyRow: () => T,
  forceFillerRow = false
) {
  if (
    forceFillerRow ||
    rows.length === 0 ||
    estimateRowsUnits(rows, estimateRowUnits) < capacity
  ) {
    return [...rows, createEmptyRow()];
  }

  return rows;
}

function takeRowsForCapacity<T>(
  rows: T[],
  startIndex: number,
  capacity: number,
  estimateRowUnits: (row: T) => number,
  minimumRemainingRows = 0
) {
  const pageRows: T[] = [];
  const lastAllowedIndex = Math.max(startIndex, rows.length - minimumRemainingRows);
  let nextIndex = startIndex;
  let usedUnits = 0;

  while (nextIndex < lastAllowedIndex) {
    const rowUnits = Math.max(1, estimateRowUnits(rows[nextIndex]));

    if (pageRows.length > 0 && usedUnits + rowUnits > capacity) {
      break;
    }

    pageRows.push(rows[nextIndex]);
    usedUnits += rowUnits;
    nextIndex += 1;
  }

  return {
    pageRows,
    nextIndex,
  };
}

function paginateRows<T>(
  rows: T[],
  config: PaginateRowsConfig<T>
): PaginatedRows<T> {
  const {
    singlePageCapacity,
    firstPageCapacity,
    middlePageCapacity,
    lastPageCapacity,
    createEmptyRow,
    estimateRowUnits,
  } = config;
  const totalUnits = estimateRowsUnits(rows, estimateRowUnits);

  if (rows.length <= 1 || totalUnits <= singlePageCapacity) {
    return {
      isSinglePage: true,
      firstPageRows: addFillerRowIfNeeded(
        rows,
        singlePageCapacity,
        estimateRowUnits,
        createEmptyRow,
        true
      ),
      middlePages: [],
      lastPageRows: [],
    };
  }

  const firstPage = takeRowsForCapacity(
    rows,
    0,
    firstPageCapacity,
    estimateRowUnits
  );
  const middlePages: T[][] = [];
  let nextIndex = firstPage.nextIndex;

  while (
    nextIndex < rows.length &&
    rows.length - nextIndex > 1 &&
    estimateRowsUnits(rows.slice(nextIndex), estimateRowUnits) > lastPageCapacity
  ) {
    const middlePage = takeRowsForCapacity(
      rows,
      nextIndex,
      middlePageCapacity,
      estimateRowUnits
    );

    middlePages.push(
      addFillerRowIfNeeded(
        middlePage.pageRows,
        middlePageCapacity,
        estimateRowUnits,
        createEmptyRow,
        true
      )
    );
    nextIndex = middlePage.nextIndex;
  }

  const lastPageRows = rows.slice(nextIndex);

  return {
    isSinglePage: false,
    firstPageRows: addFillerRowIfNeeded(
      firstPage.pageRows,
      firstPageCapacity,
      estimateRowUnits,
      createEmptyRow,
      true
    ),
    middlePages,
    lastPageRows,
  };
}

function createMeasuredRowUnitEstimator<T>(
  rows: T[],
  rowHeights: number[] | undefined,
  baseRowHeight: number,
  fallbackEstimateRowUnits: (row: T) => number
) {
  if (!rowHeights || rowHeights.length !== rows.length) {
    return fallbackEstimateRowUnits;
  }

  const rowUnitMap = new Map<T, number>();

  rows.forEach((row, index) => {
    const measuredHeight = Number(rowHeights[index] || 0);

    if (Number.isFinite(measuredHeight) && measuredHeight > 0) {
      rowUnitMap.set(row, Math.max(1, measuredHeight / baseRowHeight));
    }
  });

  if (rowUnitMap.size !== rows.length) {
    return fallbackEstimateRowUnits;
  }

  return (row: T) => rowUnitMap.get(row) ?? fallbackEstimateRowUnits(row);
}

function areMeasurementsEqual(current: number[] | undefined, next: number[]) {
  if (!current || current.length !== next.length) {
    return false;
  }

  return current.every((value, index) => Math.abs(value - next[index]) < 0.5);
}

function isValidCapacity(value: number | undefined) {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function arePageCapacitiesEqual(
  current: InvoicePageCapacities | undefined,
  next: InvoicePageCapacities | undefined
) {
  if (!current || !next) {
    return current === next;
  }

  return (
    Math.abs(current.singlePageCapacity - next.singlePageCapacity) < 0.25 &&
    Math.abs(current.firstPageCapacity - next.firstPageCapacity) < 0.25 &&
    Math.abs(current.middlePageCapacity - next.middlePageCapacity) < 0.25 &&
    Math.abs(current.lastPageCapacity - next.lastPageCapacity) < 0.25
  );
}

function resolvePageCapacities(
  measuredCapacities: InvoicePageCapacities | undefined,
  fallbackCapacities: InvoicePageCapacities
) {
  if (
    measuredCapacities &&
    isValidCapacity(measuredCapacities.singlePageCapacity) &&
    isValidCapacity(measuredCapacities.firstPageCapacity) &&
    isValidCapacity(measuredCapacities.middlePageCapacity) &&
    isValidCapacity(measuredCapacities.lastPageCapacity)
  ) {
    return measuredCapacities;
  }

  return fallbackCapacities;
}

function getMeasuredCapacityUnits(
  root: HTMLElement,
  selector: string,
  tableHeaderHeight: number
) {
  const slot = root.querySelector<HTMLElement>(selector);
  const slotHeight = Number(slot?.getBoundingClientRect().height || 0);
  const availableBodyHeight = slotHeight - tableHeaderHeight - 2;

  if (!Number.isFinite(availableBodyHeight) || availableBodyHeight <= 0) {
    return 0;
  }

  return availableBodyHeight / invoiceBaseRowHeight;
}

function createEmptyDefaultInvoiceRow(): DefaultInvoiceTemplateRow {
  return {
    no: "",
    namaBarang: "",
    qty: "",
    unit: "",
    hargaSatuan: "",
    jumlah: "",
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
  fillRemainingHeight?: boolean;
};

function isDefaultInvoiceRowEmpty(row: DefaultInvoiceTemplateRow) {
  return !Object.values(row).some((value) => String(value || "").trim());
}

function isMeiloonInvoiceRowEmpty(row: MeiloonInvoiceTemplateRow) {
  return !Object.values(row).some((value) => String(value || "").trim());
}

type CurrencyTableValueProps = {
  value: string;
  className?: string;
};

function CurrencyTableValue({ value, className = "text-[13px] leading-none" }: CurrencyTableValueProps) {
  const normalizedValue = String(value || "").trim();

  if (!normalizedValue) {
    return null;
  }

  return (
    <ExportCurrencyValue value={normalizedValue} className={`whitespace-nowrap ${className}`.trim()} />
  );
}

function DefaultInvoiceTable({
  rows,
  t,
  className = "",
  fillRemainingHeight = false,
}: DefaultInvoiceTableProps) {
  const filledRows = rows.filter((row) => !isDefaultInvoiceRowEmpty(row));
  const hasFillerRow = filledRows.length < rows.length;

  return (
    <div className={`flex flex-col overflow-hidden border border-black ${className}`.trim()}>
      <table
        className={`${fillRemainingHeight ? "h-full" : ""} w-full table-fixed border-collapse`.trim()}
      >
        <colgroup>
          <col style={{ width: "5%" }} />
          <col style={{ width: "49%" }} />
          <col style={{ width: "6%" }} />
          <col style={{ width: "8%" }} />
          <col style={{ width: "16%" }} />
          <col style={{ width: "16%" }} />
        </colgroup>
        <thead>
          <tr className="border-b border-black">
            <th className="border-r border-black px-1 py-[1px] text-center align-middle text-[13px] leading-none">
              {t("invoice.export.table.no")}
            </th>
            <th className="border-r border-black px-1 py-[1px] text-center align-middle text-[13px] leading-none">
              {t("invoice.export.table.namaBarang")}
            </th>
            <th className="border-r border-black px-1 py-[1px] text-center align-middle text-[13px] leading-none">
              {t("invoice.export.table.qty")}
            </th>
            <th className="border-r border-black px-1 py-[1px] text-center align-middle text-[13px] leading-none">
              {t("invoice.export.table.unit")}
            </th>
            <th className="border-r border-black px-1 py-[1px] text-center align-middle text-[13px] leading-none">
              {t("invoice.export.table.hargaSatuan")}
            </th>
            <th className="px-1 py-[1px] text-center align-middle text-[13px] leading-none">
              {t("invoice.export.table.jumlah")}
            </th>
          </tr>
        </thead>
        <tbody>
          {filledRows.map((row, index) => (
            <tr
              key={`default-invoice-row-${index}`}
              data-invoice-export-row="default"
            >
              <td className="border-r border-black px-1 py-[3px] text-center align-top text-[13px] leading-none">{row.no}</td>
              <td className="whitespace-normal break-words border-r border-black px-1.5 py-[3px] align-top text-[13px] leading-none">
                {row.namaBarang}
              </td>
              <td className="border-r border-black px-1 py-[3px] text-center align-top text-[13px] leading-none">{row.qty}</td>
              <td className="border-r border-black px-1 py-[3px] text-center align-top text-[13px] leading-none">{row.unit}</td>
              <td className="border-r border-black px-1 py-[3px] text-right align-top text-[13px] leading-none">
                <CurrencyTableValue value={row.hargaSatuan} className="text-[13px] leading-none" />
              </td>
              <td className="px-1 py-[3px] text-right align-top text-[13px] leading-none">
                <CurrencyTableValue value={row.jumlah} className="text-[13px] leading-none" />
              </td>
            </tr>
          ))}
          {hasFillerRow ? (
            <tr className={fillRemainingHeight ? "h-full" : "h-[21px]"}>
              <td className="border-r border-black py-[3px]" />
              <td className="border-r border-black py-[3px]" />
              <td className="border-r border-black py-[3px]" />
              <td className="border-r border-black py-[3px]" />
              <td className="border-r border-black py-[3px]" />
              <td className="py-[3px]" />
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}

type MeiloonInvoiceTableProps = CommonTemplateProps & {
  rows: MeiloonInvoiceTemplateRow[];
  className?: string;
  fillRemainingHeight?: boolean;
};

function MeiloonInvoiceTable({
  rows,
  t,
  className = "",
  fillRemainingHeight = false,
}: MeiloonInvoiceTableProps) {
  const filledRows = rows.filter((row) => !isMeiloonInvoiceRowEmpty(row));
  const hasFillerRow = filledRows.length < rows.length;

  return (
    <div className={`flex flex-col overflow-hidden border-2 border-black ${className}`.trim()}>
      <table
        className={`${fillRemainingHeight ? "h-full" : ""} w-full table-fixed border-collapse`.trim()}
      >
        <colgroup>
          <col style={{ width: "4.5%" }} />
          <col style={{ width: "18%" }} />
          <col style={{ width: "22%" }} />
          <col style={{ width: "7%" }} />
          <col style={{ width: "5%" }} />
          <col style={{ width: "14%" }} />
          <col style={{ width: "15%" }} />
          <col style={{ width: "14.5%" }} />
        </colgroup>
        <thead>
          <tr className="border-b-2 border-black">
            <th className="border-r border-black px-1 py-[1px] text-center align-middle text-[13px] leading-none">
              {t("invoice.export.table.no")}
            </th>
            <th className="border-r border-black px-1 py-[1px] text-center align-middle text-[13px] leading-none">
              {t("invoice.export.table.namaBarang")}
            </th>
            <th className="border-r border-black px-1 py-[1px] text-center align-middle text-[13px] leading-none">
              {t("invoice.export.table.spesifikasi")}
            </th>
            <th className="border-r border-black px-1 py-[1px] text-center align-middle text-[13px] leading-none">
              {t("invoice.export.table.unit")}
            </th>
            <th className="border-r border-black px-1 py-[1px] text-center align-middle text-[13px] leading-none">
              {t("invoice.export.table.qty")}
            </th>
            <th className="border-r border-black px-1 py-[1px] text-center align-middle text-[13px] leading-none">
              {t("invoice.export.table.hargaSatuan")}
            </th>
            <th className="border-r border-black px-1 py-[1px] text-center align-middle text-[13px] leading-none">
              {t("invoice.export.table.jumlah")}
            </th>
            <th className="px-1 py-[1px] text-center align-middle text-[13px] leading-none">
              {t("invoice.export.table.noPo")}
            </th>
          </tr>
        </thead>
        <tbody>
          {filledRows.map((row, index) => (
            <tr
              key={`meiloon-invoice-row-${index}`}
              data-invoice-export-row="meiloon"
            >
              <td className="border-r border-black px-1 py-[3px] text-center align-top text-[13px] leading-none">{row.no}</td>
              <td className="whitespace-normal break-words border-r border-black px-1.5 py-[3px] align-top text-[13px] leading-none">
                {row.namaBarang}
              </td>
              <td className="border-r border-black px-1.5 py-[3px] align-top text-[13px] leading-none whitespace-pre-line">{row.spesifikasi}</td>
              <td className="border-r border-black px-1 py-[3px] text-center align-top text-[13px] leading-none">{row.unit}</td>
              <td className="border-r border-black px-1 py-[3px] text-center align-top text-[13px] leading-none">{row.qty}</td>
              <td className="border-r border-black px-1 py-[3px] text-right align-top text-[13px] leading-none">
                <CurrencyTableValue value={row.hargaSatuan} className="text-[13px] leading-none" />
              </td>
              <td className="border-r border-black px-1 py-[3px] text-right align-top text-[13px] leading-none">
                <CurrencyTableValue value={row.jumlah} className="text-[13px] leading-none" />
              </td>
              <td className="px-1 py-[3px] text-center align-top text-[13px] leading-none">{row.noPo}</td>
            </tr>
          ))}
          {hasFillerRow ? (
            <tr className={fillRemainingHeight ? "h-full" : "h-[21px]"}>
              <td className="border-r border-black py-[3px]" />
              <td className="border-r border-black py-[3px]" />
              <td className="border-r border-black py-[3px]" />
              <td className="border-r border-black py-[3px]" />
              <td className="border-r border-black py-[3px]" />
              <td className="border-r border-black py-[3px]" />
              <td className="border-r border-black py-[3px]" />
              <td className="py-[3px]" />
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}

type InvoiceMeasureTemplateVariant = "default" | "meiloon";
type InvoiceMeasurePageKind = "single" | "first" | "middle" | "last";

type InvoiceMeasureHeaderProps = CommonTemplateProps & {
  variant: InvoiceMeasureTemplateVariant;
};

function InvoiceMeasureHeader({ variant, t }: InvoiceMeasureHeaderProps) {
  const isMeiloon = variant === "meiloon";

  if (isMeiloon) {
    return (
      <>
        <div className="flex items-start justify-between gap-8 pt-4">
          <div className="max-w-[58%]">
            <p className="text-[17px]">{companyProfile.name}</p>
            {companyProfile.addressLines.map((line) => (
              <p key={line} className="text-[13px] leading-[1.18]">
                {line}
              </p>
            ))}
          </div>

          <div className="shrink-0 pt-3 text-[13px]">
            <div className="grid grid-cols-[86px_12px_1fr] gap-x-1">
              <span>{t("invoice.export.tanggalLabel")}</span>
              <span>:</span>
              <span>09 JULI 2026</span>
              <span>{t("invoice.export.noInvoiceLabel")}</span>
              <span>:</span>
              <span>B0726/2563</span>
            </div>
          </div>
        </div>

        <div className="mt-1 border-t-2 border-black pt-1">
          <div className="flex items-center justify-between">
            <p className="text-[13px] italic">{t("invoice.export.customerLabel")}</p>
            <p className="text-[17px] italic">{t("invoice.export.title")}</p>
          </div>

          <div className="mt-0.5 w-[50%] border-2 border-black px-1.5 py-0.5">
            <p className="text-[13px] leading-[1.1]">{meiloonInvoiceProfile.name}</p>
            <p className="text-[13px] leading-[1.12]">
              {t("invoice.export.customerNpwpLabel")} : {meiloonInvoiceProfile.npwp}
            </p>
            <p className="whitespace-pre-line text-[13px] leading-[1.12]">
              {meiloonInvoiceProfile.addressLines.join("\n")}
            </p>
            <p className="text-[13px] leading-[1.12]">
              ATTN : {meiloonInvoiceProfile.attnFallback}
            </p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="flex items-start justify-between gap-8 pt-3">
        <div className="max-w-[58%]">
          <p className="text-[17px]">{companyProfile.name}</p>
          {companyProfile.addressLines.map((line) => (
            <p key={line} className="text-[13px] leading-[1.18]">
              {line}
            </p>
          ))}
        </div>

        <div className="shrink-0 pt-2 text-[13px]">
          <div className="grid grid-cols-[86px_12px_1fr] gap-x-1">
            <span>{t("invoice.export.tanggalLabel")}</span>
            <span>:</span>
            <span>09 JULI 2026</span>
            <span>{t("invoice.export.noInvoiceLabel")}</span>
            <span>:</span>
            <span>B0726/2563</span>
          </div>
        </div>
      </div>

      <div className="mt-1 border-t-2 border-black pt-1">
        <div className="flex items-center justify-between">
          <p className="text-[13px] italic">{t("invoice.export.customerLabel")}</p>
          <p className="text-[17px] italic">{t("invoice.export.title")}</p>
        </div>

        <div className="mt-0.5 grid grid-cols-[50%_1fr] gap-3">
          <div className="border border-black px-1.5 py-0.5">
            <p className="text-[13px] leading-[1.1]">PT. DAIJO INDUSTRIAL</p>
            <p className="text-[13px] leading-[1.12]">
              {t("invoice.export.customerNpwpLabel")} : 02.026.689.6-052.000
            </p>
            <p className="whitespace-pre-line text-[13px] leading-[1.12]">
              JL IRIAN RAYA BLOK E-12 KBN UNIT USAHA CAKUNG, SUKAPURA,
              CILINCING, KOTA ADM. JAKARTA UTARA, DKI JAKARTA, 14140
            </p>
          </div>

          <div className="pl-[26%] pt-0.5 text-[13px]">
            <div className="grid grid-cols-[88px_8px_1fr] gap-x-0">
              <span>{t("invoice.export.noPoLabel")}</span>
              <span>:</span>
              <span>26003446</span>
              <span>{t("invoice.export.noSuratJalanLabel")}</span>
              <span>:</span>
              <span>PP/0726/3078</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

type InvoiceMeasureFooterProps = CommonTemplateProps & {
  variant: InvoiceMeasureTemplateVariant;
};

function InvoiceMeasureFooter({ variant, t }: InvoiceMeasureFooterProps) {
  const isMeiloon = variant === "meiloon";
  const borderClass = isMeiloon ? "border-2" : "border";
  const paymentGridClass = isMeiloon
    ? "grid grid-cols-[0.9fr_0.8fr] gap-3"
    : "grid grid-cols-[0.86fr_0.68fr] gap-3";
  const summaryLabel = isMeiloon
    ? t("invoice.export.summary.subtotal")
    : t("invoice.export.default.summary.beforeTaxTotal");

  return (
    <div className={`mt-2 ${paymentGridClass}`}>
      <div className="space-y-2">
        <div className={`${borderClass} border-black px-2 py-1`}>
          <p className="text-[13px]">{t("invoice.export.payment.title")}</p>
          <div className="mt-0.5 grid grid-cols-[52px_10px_1fr] gap-x-1 text-[13px]">
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
          <p className="text-[13px]">{t("invoice.export.noteTitle")}</p>
          <ol className="mt-0.5 list-decimal pl-5 text-[13px] leading-[1.2]">
            <li>{t("invoice.export.note.1")}</li>
            <li>{t("invoice.export.note.2")}</li>
            <li>{t("invoice.export.note.paymentTerm", { paymentTerm: "Net 30 hari" })}</li>
          </ol>
        </div>
      </div>

      <div className="space-y-2">
        <div className={`${borderClass} border-black`}>
          <div className="grid grid-cols-[1fr_150px] border-b border-black text-[13px] last:border-b-0">
            <div className="border-r border-black px-2 py-0.5">{summaryLabel}</div>
            <div className="px-2 py-0.5">
              <CurrencyTableValue value="160.341.000" />
            </div>
          </div>
          <div className="grid grid-cols-[1fr_150px] border-b border-black text-[13px] last:border-b-0">
            <div className="border-r border-black px-2 py-0.5">
              {isMeiloon
                ? t("invoice.export.summary.dppNilaiLain", { ratio: "12/13" })
                : t("invoice.export.summary.ppn", { rate: 11 })}
            </div>
            <div className="px-2 py-0.5">
              <CurrencyTableValue value="17.637.510" />
            </div>
          </div>
          {isMeiloon ? (
            <div className="grid grid-cols-[1fr_150px] border-b border-black text-[13px] last:border-b-0">
              <div className="border-r border-black px-2 py-0.5">
                {t("invoice.export.summary.ppn", { rate: 12 })}
              </div>
              <div className="px-2 py-0.5">
                <CurrencyTableValue value="17.637.510" />
              </div>
            </div>
          ) : null}
          <div className="grid grid-cols-[1fr_150px] text-[13px]">
            <div className="border-r border-black px-2 py-0.5">
              {t("invoice.export.summary.total")}
            </div>
            <div className="px-2 py-0.5">
              <CurrencyTableValue value="177.978.510" />
            </div>
          </div>
        </div>

        <div className={`ml-auto w-[200px] ${isMeiloon ? "pt-5" : "pt-4"} text-center`}>
          <p className="text-[13px]">{t("invoice.export.signature.regards")}</p>
          <div className="h-[96px]" />
        </div>
      </div>
    </div>
  );
}

type InvoiceMeasurePageProps = CommonTemplateProps & {
  variant: InvoiceMeasureTemplateVariant;
  kind: InvoiceMeasurePageKind;
};

function InvoiceMeasurePage({ variant, kind, t }: InvoiceMeasurePageProps) {
  const isMeiloon = variant === "meiloon";
  const pagePadding = isMeiloon ? "px-[5mm] py-[1cm]" : "px-[4mm] py-[1cm]";
  const footerPadding = isMeiloon ? "px-[5mm] pb-[1cm]" : "px-[4mm] pb-[1cm]";
  const slotKey = `${variant}-${kind}`;

  if (kind === "single") {
    return (
      <div className="flex h-[11in] min-h-[11in] flex-col bg-white text-[13px] leading-[1.18]">
        <div className={`${pagePadding} flex min-h-0 flex-1 flex-col`}>
          <InvoiceMeasureHeader variant={variant} t={t} />
          <div
            data-invoice-capacity-slot={slotKey}
            className="mt-1 min-h-0 flex-1"
          />
        </div>
        <div className={`shrink-0 ${footerPadding} text-[13px] leading-[1.18]`}>
          <InvoiceMeasureFooter variant={variant} t={t} />
        </div>
      </div>
    );
  }

  if (kind === "first") {
    return (
      <div className={`flex h-[11in] min-h-[11in] flex-col bg-white ${pagePadding} text-[13px] leading-[1.18]`}>
        <InvoiceMeasureHeader variant={variant} t={t} />
        <div
          data-invoice-capacity-slot={slotKey}
          className="mt-1 min-h-0 flex-1"
        />
      </div>
    );
  }

  if (kind === "last") {
    return (
      <div className={`flex h-[11in] min-h-[11in] flex-col bg-white ${pagePadding} text-[13px] leading-[1.18]`}>
        <div
          data-invoice-capacity-slot={slotKey}
          className="min-h-0 flex-1"
        />
        <InvoiceMeasureFooter variant={variant} t={t} />
      </div>
    );
  }

  return (
    <div className={`flex h-[11in] min-h-[11in] flex-col bg-white ${pagePadding} text-[13px] leading-[1.18]`}>
      <div
        data-invoice-capacity-slot={slotKey}
        className="min-h-0 flex-1"
      />
    </div>
  );
}

type InvoicePaginationMeasureProps = CommonTemplateProps & {
  defaultRows: DefaultInvoiceTemplateRow[];
  meiloonRows: MeiloonInvoiceTemplateRow[];
  onMeasure: (measurements: InvoiceRowMeasurements) => void;
};

function InvoicePaginationMeasure({
  defaultRows,
  meiloonRows,
  onMeasure,
  t,
}: InvoicePaginationMeasureProps) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    let frameId = 0;

    async function measureRows() {
      if (typeof window === "undefined" || typeof document === "undefined") {
        return;
      }

      if ("fonts" in document) {
        await document.fonts.ready;
      }

      frameId = window.requestAnimationFrame(() => {
        if (cancelled || !rootRef.current) {
          return;
        }

        const defaultRowElements = Array.from(
          rootRef.current.querySelectorAll<HTMLElement>(
            '[data-invoice-measure-table="default"] [data-invoice-export-row="default"]'
          )
        );
        const meiloonRowElements = Array.from(
          rootRef.current.querySelectorAll<HTMLElement>(
            '[data-invoice-measure-table="meiloon"] [data-invoice-export-row="meiloon"]'
          )
        );
        const defaultTableHeaderHeight =
          rootRef.current
            .querySelector<HTMLElement>('[data-invoice-measure-table="default"] thead')
            ?.getBoundingClientRect().height || 0;
        const meiloonTableHeaderHeight =
          rootRef.current
            .querySelector<HTMLElement>('[data-invoice-measure-table="meiloon"] thead')
            ?.getBoundingClientRect().height || 0;

        if (
          defaultRowElements.length !== defaultRows.length ||
          meiloonRowElements.length !== meiloonRows.length
        ) {
          return;
        }

        onMeasure({
          defaultRowHeights: defaultRowElements.map((element) =>
            element.getBoundingClientRect().height
          ),
          meiloonRowHeights: meiloonRowElements.map((element) =>
            element.getBoundingClientRect().height
          ),
          defaultPageCapacities: {
            singlePageCapacity: getMeasuredCapacityUnits(
              rootRef.current,
              '[data-invoice-capacity-slot="default-single"]',
              defaultTableHeaderHeight
            ),
            firstPageCapacity: getMeasuredCapacityUnits(
              rootRef.current,
              '[data-invoice-capacity-slot="default-first"]',
              defaultTableHeaderHeight
            ),
            middlePageCapacity: getMeasuredCapacityUnits(
              rootRef.current,
              '[data-invoice-capacity-slot="default-middle"]',
              defaultTableHeaderHeight
            ),
            lastPageCapacity: getMeasuredCapacityUnits(
              rootRef.current,
              '[data-invoice-capacity-slot="default-last"]',
              defaultTableHeaderHeight
            ),
          },
          meiloonPageCapacities: {
            singlePageCapacity: getMeasuredCapacityUnits(
              rootRef.current,
              '[data-invoice-capacity-slot="meiloon-single"]',
              meiloonTableHeaderHeight
            ),
            firstPageCapacity: getMeasuredCapacityUnits(
              rootRef.current,
              '[data-invoice-capacity-slot="meiloon-first"]',
              meiloonTableHeaderHeight
            ),
            middlePageCapacity: getMeasuredCapacityUnits(
              rootRef.current,
              '[data-invoice-capacity-slot="meiloon-middle"]',
              meiloonTableHeaderHeight
            ),
            lastPageCapacity: getMeasuredCapacityUnits(
              rootRef.current,
              '[data-invoice-capacity-slot="meiloon-last"]',
              meiloonTableHeaderHeight
            ),
          },
        });
      });
    }

    void measureRows();

    return () => {
      cancelled = true;

      if (frameId) {
        window.cancelAnimationFrame(frameId);
      }
    };
  }, [defaultRows, meiloonRows, onMeasure, t]);

  return (
    <div
      ref={rootRef}
      aria-hidden="true"
      className="pointer-events-none fixed left-[-10000px] top-0 z-[-1] w-[8.5in] bg-white text-black tracking-[0.05em] print:hidden"
      style={{
        fontFamily: invoiceExportFontFamily,
        visibility: "hidden",
      }}
    >
      <div
        data-invoice-measure-table="default"
        className="w-[8.5in] px-[4mm] py-[1cm] text-[13px] leading-[1.18]"
      >
        <DefaultInvoiceTable rows={defaultRows} t={t} />
      </div>
      <div
        data-invoice-measure-table="meiloon"
        className="w-[8.5in] px-[5mm] py-[1cm] text-[13px] leading-[1.18]"
      >
        <MeiloonInvoiceTable rows={meiloonRows} t={t} />
      </div>

      {(["single", "first", "middle", "last"] as InvoiceMeasurePageKind[]).map((kind) => (
        <InvoiceMeasurePage key={`default-measure-${kind}`} variant="default" kind={kind} t={t} />
      ))}
      {(["single", "first", "middle", "last"] as InvoiceMeasurePageKind[]).map((kind) => (
        <InvoiceMeasurePage key={`meiloon-measure-${kind}`} variant="meiloon" kind={kind} t={t} />
      ))}
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
  const [rowMeasurements, setRowMeasurements] = useState<InvoiceRowMeasurements>({
    defaultRowHeights: [],
    meiloonRowHeights: [],
  });

  const handleInvoiceRowsMeasure = useCallback((nextMeasurements: InvoiceRowMeasurements) => {
    setRowMeasurements((currentMeasurements) => {
      if (
        areMeasurementsEqual(
          currentMeasurements.defaultRowHeights,
          nextMeasurements.defaultRowHeights
        ) &&
        areMeasurementsEqual(
          currentMeasurements.meiloonRowHeights,
          nextMeasurements.meiloonRowHeights
        ) &&
        arePageCapacitiesEqual(
          currentMeasurements.defaultPageCapacities,
          nextMeasurements.defaultPageCapacities
        ) &&
        arePageCapacitiesEqual(
          currentMeasurements.meiloonPageCapacities,
          nextMeasurements.meiloonPageCapacities
        )
      ) {
        return currentMeasurements;
      }

      return nextMeasurements;
    });
  }, []);

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
  const isMaxxisCustomer = useMemo(
    () => normalizeCustomerName(customer?.nama || "") === maxxisCustomerName,
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
  const defaultBeforeTaxTotalLabel = isMaxxisCustomer
    ? t("invoice.export.summary.dpp")
    : t("invoice.export.default.summary.beforeTaxTotal");
  const defaultPpnLabel = isMaxxisCustomer
    ? t("invoice.export.summary.ppnNoRate")
    : t("invoice.export.summary.ppn", { rate: invoice?.ppnRate || 0 });
  const paymentTermNote = t("invoice.export.note.paymentTerm", {
    paymentTerm: formatPaymentTermLabel(invoice?.paymentTerm || { type: "net", netDays: 30, downPaymentPercent: 0, remainingPaymentPercent: 100 }, {
      cashBeforeDelivery: t("paymentTerm.cashBeforeDelivery"),
      cashOnDelivery: t("paymentTerm.cashOnDelivery"),
      days: t("common.days"),
    }),
  });

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
  const defaultPaginatedRows = useMemo(() => {
    const estimateRowUnits = createMeasuredRowUnitEstimator(
      defaultRows,
      rowMeasurements.defaultRowHeights,
      invoiceBaseRowHeight,
      estimateDefaultInvoiceRowUnits
    );
    const pageCapacities = resolvePageCapacities(
      rowMeasurements.defaultPageCapacities,
      defaultInvoiceFallbackCapacities
    );

    return paginateRows(defaultRows, {
        singlePageCapacity: pageCapacities.singlePageCapacity,
        firstPageCapacity: pageCapacities.firstPageCapacity,
        middlePageCapacity: pageCapacities.middlePageCapacity,
        lastPageCapacity: pageCapacities.lastPageCapacity,
        createEmptyRow: createEmptyDefaultInvoiceRow,
        estimateRowUnits,
      });
  }, [defaultRows, rowMeasurements.defaultPageCapacities, rowMeasurements.defaultRowHeights]);

  const meiloonRows = useMemo(() => buildMeiloonTemplateRows(invoice), [invoice]);
  const meiloonPaginatedRows = useMemo(() => {
    const estimateRowUnits = createMeasuredRowUnitEstimator(
      meiloonRows,
      rowMeasurements.meiloonRowHeights,
      invoiceBaseRowHeight,
      estimateMeiloonInvoiceRowUnits
    );
    const pageCapacities = resolvePageCapacities(
      rowMeasurements.meiloonPageCapacities,
      meiloonInvoiceFallbackCapacities
    );

    return paginateRows(meiloonRows, {
        singlePageCapacity: pageCapacities.singlePageCapacity,
        firstPageCapacity: pageCapacities.firstPageCapacity,
        middlePageCapacity: pageCapacities.middlePageCapacity,
        lastPageCapacity: pageCapacities.lastPageCapacity,
        createEmptyRow: createEmptyMeiloonInvoiceRow,
        estimateRowUnits,
      });
  }, [meiloonRows, rowMeasurements.meiloonPageCapacities, rowMeasurements.meiloonRowHeights]);

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

  function handleExportExcel() {
    if (!invoice) {
      return;
    }

    const worksheets: JspreadsheetExportWorksheet[] = [
      {
        name: "Detail Barang",
        rows: [
          [
            t("invoice.excel.column.namaBarang"),
            t("invoice.excel.column.spek"),
            t("invoice.excel.column.qty"),
            t("invoice.excel.column.hargaSatuan"),
            t("invoice.excel.column.hargaTotal"),
          ],
          ...invoice.barang.map((barang) => [
            barang.namaBarang || "-",
            barang.spesifikasi || "-",
            barang.kuantitas,
            barang.hargaSatuan,
            barang.jumlah,
          ]),
        ],
      },
    ];

    downloadJspreadsheetXlsxFile(
      `invoice-${sanitizeExcelFileName(invoice.noInvoice || invoice.id || "detail")}.xlsx`,
      worksheets
    );
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

          .invoice-print-page {
            overflow: hidden !important;
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }

          .invoice-print-page tr {
            break-inside: avoid;
            page-break-inside: avoid;
          }
        }
      `}</style>

      {invoice ? (
        <InvoicePaginationMeasure
          defaultRows={defaultRows}
          meiloonRows={meiloonRows}
          onMeasure={handleInvoiceRowsMeasure}
          t={t}
        />
      ) : null}

      <main className="export-normal-weight min-h-screen bg-slate-200/60 px-3 py-4 print:bg-white print:px-0 print:py-0">
        <div className="mx-auto flex w-full max-w-[8.5in] items-center justify-between gap-3 pb-4 print:hidden">
          <div>
            <h1 className="text-lg text-slate-900">{t("invoice.export.previewTitle")}</h1>
            <p className="text-sm text-slate-600">{t("invoice.export.previewDescription")}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleExportExcel}
              disabled={!invoice}
              className="rounded-lg border border-emerald-300 bg-emerald-700 px-4 py-2 text-sm text-white hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {t("common.exportExcel")}
            </button>
            <button
              type="button"
              onClick={printDocumentWhenFontsReady}
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
            className={`invoice-print-page mx-auto w-full max-w-[8.5in] text-black tracking-[0.05em] print:max-w-none ${
              meiloonPaginatedRows.isSinglePage
                ? "flex h-[11in] min-h-[11in] flex-col bg-white shadow-xl print:h-[11in] print:min-h-[11in] print:shadow-none"
                : "space-y-4 print:space-y-0"
            }`}
            style={{ fontFamily: invoiceExportFontFamily }}
          >
            <div
              className={`invoice-print-page px-[5mm] py-[1cm] text-[13px] leading-[1.18] ${
                meiloonPaginatedRows.isSinglePage
                  ? "flex min-h-0 flex-1 flex-col"
                  : "flex h-[11in] min-h-[11in] flex-col break-after-page bg-white shadow-xl print:break-after-page print:shadow-none"
              }`}
            >
              <div className="flex items-start justify-between gap-8 pt-4">
                <div className="max-w-[58%]">
                  <p className="text-[17px]">{companyProfile.name}</p>
                  {companyProfile.addressLines.map((line) => (
                    <p key={line} className="text-[13px] leading-[1.18]">
                      {line}
                    </p>
                  ))}
                </div>

                <div className="shrink-0 pt-3 text-[13px]">
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
                  <p className="text-[13px] italic">{t("invoice.export.customerLabel")}</p>
                  <p className="text-[17px] italic">{t("invoice.export.title")}</p>
                </div>

                <div className="mt-0.5 w-[50%] border-2 border-black px-1.5 py-0.5">
                  <p className="text-[13px] leading-[1.1]">{meiloonCustomerNameValue || meiloonInvoiceProfile.name}</p>
                  <p className="text-[13px] leading-[1.12]">
                    {t("invoice.export.customerNpwpLabel")} : {String(customer?.npwp || "").trim() || meiloonInvoiceProfile.npwp}
                  </p>
                  <p className="whitespace-pre-line text-[13px] leading-[1.12]">{meiloonCustomerAddress}</p>
                  <p className="text-[13px] leading-[1.12]">ATTN : {meiloonCustomerAttn || meiloonInvoiceProfile.attnFallback}</p>
                </div>
              </div>

              <div className="mt-1 min-h-0 flex-1">
                <MeiloonInvoiceTable
                  rows={meiloonPaginatedRows.firstPageRows}
                  t={t}
                  className="h-full"
                  fillRemainingHeight
                />
              </div>
            </div>

            {meiloonPaginatedRows.isSinglePage ? (
              <div className="shrink-0 px-[5mm] pb-[1cm] text-[13px] leading-[1.18]">
                <div className="mt-2 grid grid-cols-[0.9fr_0.8fr] gap-3">
                  <div className="space-y-2">
                    <div className="border-2 border-black px-2 py-1">
                      <p className="text-[13px]">{t("invoice.export.payment.title")}</p>
                      <div className="mt-0.5 grid grid-cols-[52px_10px_1fr] gap-x-1 text-[13px]">
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
                      <p className="text-[13px]">{t("invoice.export.noteTitle")}</p>
                      <ol className="mt-0.5 list-decimal pl-5 text-[13px] leading-[1.2]">
                        <li>{t("invoice.export.note.1")}</li>
                        <li>{t("invoice.export.note.2")}</li>
                        <li>{paymentTermNote}</li>
                      </ol>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="border-2 border-black">
                      <div className="grid grid-cols-[1fr_150px] border-b border-black text-[13px] last:border-b-0">
                        <div className="border-r border-black px-2 py-1">{t("invoice.export.summary.subtotal")}</div>
                        <div className="px-2 py-1">
                          <CurrencyTableValue value={formatPlainNumber(Number(invoice.subtotal || 0))} />
                        </div>
                      </div>
                      <div className="grid grid-cols-[1fr_150px] border-b border-black text-[13px] last:border-b-0">
                        <div className="border-r border-black px-2 py-1">
                          {t("invoice.export.summary.dppNilaiLain", { ratio: dppRatio })}
                        </div>
                        <div className="px-2 py-1">
                          <CurrencyTableValue value={formatPlainNumber(dppValue)} />
                        </div>
                      </div>
                      <div className="grid grid-cols-[1fr_150px] border-b border-black text-[13px] last:border-b-0">
                        <div className="border-r border-black px-2 py-1">
                          {t("invoice.export.summary.ppn", { rate: meiloonPpnRate })}
                        </div>
                        <div className="px-2 py-1">
                          <CurrencyTableValue value={formatPlainNumber(meiloonPpnAmount)} />
                        </div>
                      </div>
                      <div className="grid grid-cols-[1fr_150px] text-[13px]">
                        <div className="border-r border-black px-2 py-1">{t("invoice.export.summary.total")}</div>
                        <div className="px-2 py-1">
                          <CurrencyTableValue value={formatPlainNumber(Number(invoice.grandTotal || 0))} />
                        </div>
                      </div>
                    </div>

                    <div className="ml-auto w-[200px] pt-5 text-center">
                      <p className="text-[13px]">{t("invoice.export.signature.regards")}</p>
                      <div className="h-[96px]" />
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {meiloonPaginatedRows.middlePages.map((pageRows, pageIndex) => (
                  <div
                    key={`meiloon-middle-page-${pageIndex}`}
                    className="invoice-print-page flex h-[11in] min-h-[11in] flex-col break-after-page bg-white px-[5mm] py-[1cm] text-[13px] leading-[1.18] shadow-xl print:break-after-page print:shadow-none"
                  >
                    <div className="min-h-0 flex-1">
                      <MeiloonInvoiceTable
                        rows={pageRows}
                        t={t}
                        className="h-full"
                        fillRemainingHeight
                      />
                    </div>
                  </div>
                ))}

                <div className="invoice-print-page flex h-[11in] min-h-[11in] flex-col bg-white px-[5mm] py-[1cm] text-[13px] leading-[1.18] shadow-xl print:shadow-none">
                  {meiloonPaginatedRows.lastPageRows.length > 0 ? (
                    <MeiloonInvoiceTable
                      rows={meiloonPaginatedRows.lastPageRows}
                      t={t}
                    />
                  ) : null}

                  <div className="mt-2 grid grid-cols-[0.9fr_0.8fr] gap-3">
                    <div className="space-y-2">
                      <div className="border-2 border-black px-2 py-1">
                        <p className="text-[13px]">{t("invoice.export.payment.title")}</p>
                        <div className="mt-0.5 grid grid-cols-[52px_10px_1fr] gap-x-1 text-[13px]">
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
                        <p className="text-[13px]">{t("invoice.export.noteTitle")}</p>
                        <ol className="mt-0.5 list-decimal pl-5 text-[13px] leading-[1.2]">
                          <li>{t("invoice.export.note.1")}</li>
                          <li>{t("invoice.export.note.2")}</li>
                          <li>{paymentTermNote}</li>
                        </ol>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="border-2 border-black">
                        <div className="grid grid-cols-[1fr_150px] border-b border-black text-[13px] last:border-b-0">
                          <div className="border-r border-black px-2 py-1">{t("invoice.export.summary.subtotal")}</div>
                          <div className="px-2 py-1">
                            <CurrencyTableValue value={formatPlainNumber(Number(invoice.subtotal || 0))} />
                          </div>
                        </div>
                        <div className="grid grid-cols-[1fr_150px] border-b border-black text-[13px] last:border-b-0">
                          <div className="border-r border-black px-2 py-1">
                            {t("invoice.export.summary.dppNilaiLain", { ratio: dppRatio })}
                          </div>
                          <div className="px-2 py-1">
                            <CurrencyTableValue value={formatPlainNumber(dppValue)} />
                          </div>
                        </div>
                        <div className="grid grid-cols-[1fr_150px] border-b border-black text-[13px] last:border-b-0">
                          <div className="border-r border-black px-2 py-1">
                            {t("invoice.export.summary.ppn", { rate: meiloonPpnRate })}
                          </div>
                          <div className="px-2 py-1">
                            <CurrencyTableValue value={formatPlainNumber(meiloonPpnAmount)} />
                          </div>
                        </div>
                        <div className="grid grid-cols-[1fr_150px] text-[13px]">
                          <div className="border-r border-black px-2 py-1">{t("invoice.export.summary.total")}</div>
                          <div className="px-2 py-1">
                            <CurrencyTableValue value={formatPlainNumber(Number(invoice.grandTotal || 0))} />
                          </div>
                        </div>
                      </div>

                      <div className="ml-auto w-[200px] pt-5 text-center">
                        <p className="text-[13px]">{t("invoice.export.signature.regards")}</p>
                        <div className="h-[96px]" />
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </section>
        ) : invoice ? (
          <section
            className={`invoice-print-page mx-auto w-full max-w-[8.5in] text-black tracking-[0.05em] print:max-w-none ${
              defaultPaginatedRows.isSinglePage
                ? "flex h-[11in] min-h-[11in] flex-col bg-white shadow-xl print:h-[11in] print:min-h-[11in] print:shadow-none"
                : "space-y-4 print:space-y-0"
            }`}
            style={{ fontFamily: invoiceExportFontFamily }}
          >
            <div
              className={`invoice-print-page px-[4mm] py-[1cm] text-[13px] leading-[1.18] ${
                defaultPaginatedRows.isSinglePage
                  ? "flex min-h-0 flex-1 flex-col"
                  : "flex h-[11in] min-h-[11in] flex-col break-after-page bg-white shadow-xl print:break-after-page print:shadow-none"
              }`}
            >
              <div className="flex items-start justify-between gap-8 pt-3">
                <div className="max-w-[58%]">
                  <p className="text-[17px]">{companyProfile.name}</p>
                  {companyProfile.addressLines.map((line) => (
                    <p key={line} className="text-[13px] leading-[1.18]">
                      {line}
                    </p>
                  ))}
                </div>

                <div className="shrink-0 pt-2 text-[13px]">
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
                  <p className="text-[13px] italic">{t("invoice.export.customerLabel")}</p>
                  <p className="text-[17px] italic">{t("invoice.export.title")}</p>
                </div>

              <div className="mt-0.5 grid grid-cols-[50%_1fr] gap-3">
                  <div className="border border-black px-1.5 py-0.5">
                    <p className="text-[13px] leading-[1.1]">{customerName || "-"}</p>
                    <p className="text-[13px] leading-[1.12]">
                      {t("invoice.export.customerNpwpLabel")} : {customerNpwp}
                    </p>
                    <p className="whitespace-pre-line text-[13px] leading-[1.12]">{customerAddress || "-"}</p>
                  </div>

                  <div className="pl-[26%] pt-0.5 text-[13px]">
                    <div className="grid grid-cols-[88px_8px_1fr] gap-x-0">
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

              <div className="mt-1 min-h-0 flex-1">
                <DefaultInvoiceTable
                  rows={defaultPaginatedRows.firstPageRows}
                  t={t}
                  className="h-full"
                  fillRemainingHeight
                />
              </div>
            </div>

            {defaultPaginatedRows.isSinglePage ? (
              <div className="shrink-0 px-[4mm] pb-[1cm] text-[13px] leading-[1.18]">
                <div className="mt-2 grid grid-cols-[0.86fr_0.68fr] gap-3">
                  <div className="space-y-2">
                    <div className="border border-black px-2 py-1">
                      <p className="text-[13px]">{t("invoice.export.payment.title")}</p>
                      <div className="mt-0.5 grid grid-cols-[52px_10px_1fr] gap-x-1 text-[13px]">
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
                      <p className="text-[13px]">{t("invoice.export.noteTitle")}</p>
                      <ol className="mt-0.5 list-decimal pl-5 text-[13px] leading-[1.2]">
                        <li>{t("invoice.export.note.1")}</li>
                        <li>{t("invoice.export.note.2")}</li>
                        <li>{paymentTermNote}</li>
                      </ol>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="border border-black">
                      <div className="grid grid-cols-[1fr_150px] border-b border-black text-[13px] last:border-b-0">
                        <div className="border-r border-black px-2 py-0.5">{defaultBeforeTaxTotalLabel}</div>
                        <div className="px-2 py-0.5">
                          <CurrencyTableValue value={formatPlainNumber(Number(invoice.subtotal || 0))} />
                        </div>
                      </div>
                      <div className="grid grid-cols-[1fr_150px] border-b border-black text-[13px] last:border-b-0">
                        <div className="border-r border-black px-2 py-0.5">
                          {defaultPpnLabel}
                        </div>
                        <div className="px-2 py-0.5">
                          <CurrencyTableValue value={formatPlainNumber(Number(invoice.ppnAmount || 0))} />
                        </div>
                      </div>
                      <div className="grid grid-cols-[1fr_150px] text-[13px]">
                        <div className="border-r border-black px-2 py-0.5">{t("invoice.export.summary.total")}</div>
                        <div className="px-2 py-0.5">
                          <CurrencyTableValue value={formatPlainNumber(Number(invoice.grandTotal || 0))} />
                        </div>
                      </div>
                    </div>

                    <div className="ml-auto w-[200px] pt-4 text-center">
                      <p className="text-[13px]">{t("invoice.export.signature.regards")}</p>
                      <div className="h-[96px]" />
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {defaultPaginatedRows.middlePages.map((pageRows, pageIndex) => (
                  <div
                    key={`default-middle-page-${pageIndex}`}
                    className="invoice-print-page flex h-[11in] min-h-[11in] flex-col break-after-page bg-white px-[4mm] py-[1cm] text-[13px] leading-[1.18] shadow-xl print:break-after-page print:shadow-none"
                  >
                    <div className="min-h-0 flex-1">
                      <DefaultInvoiceTable
                        rows={pageRows}
                        t={t}
                        className="h-full"
                        fillRemainingHeight
                      />
                    </div>
                  </div>
                ))}

                <div className="invoice-print-page flex h-[11in] min-h-[11in] flex-col bg-white px-[4mm] py-[1cm] text-[13px] leading-[1.18] shadow-xl print:shadow-none">
                  {defaultPaginatedRows.lastPageRows.length > 0 ? (
                    <DefaultInvoiceTable
                      rows={defaultPaginatedRows.lastPageRows}
                      t={t}
                    />
                  ) : null}

                  <div className="mt-2 grid grid-cols-[0.86fr_0.68fr] gap-3">
                    <div className="space-y-2">
                      <div className="border border-black px-2 py-1">
                        <p className="text-[13px]">{t("invoice.export.payment.title")}</p>
                        <div className="mt-0.5 grid grid-cols-[52px_10px_1fr] gap-x-1 text-[13px]">
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
                        <p className="text-[13px]">{t("invoice.export.noteTitle")}</p>
                        <ol className="mt-0.5 list-decimal pl-5 text-[13px] leading-[1.2]">
                          <li>{t("invoice.export.note.1")}</li>
                          <li>{t("invoice.export.note.2")}</li>
                          <li>{paymentTermNote}</li>
                        </ol>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="border border-black">
                        <div className="grid grid-cols-[1fr_150px] border-b border-black text-[13px] last:border-b-0">
                          <div className="border-r border-black px-2 py-0.5">{defaultBeforeTaxTotalLabel}</div>
                          <div className="px-2 py-0.5">
                            <CurrencyTableValue value={formatPlainNumber(Number(invoice.subtotal || 0))} />
                          </div>
                        </div>
                        <div className="grid grid-cols-[1fr_150px] border-b border-black text-[13px] last:border-b-0">
                          <div className="border-r border-black px-2 py-0.5">
                            {defaultPpnLabel}
                          </div>
                          <div className="px-2 py-0.5">
                            <CurrencyTableValue value={formatPlainNumber(Number(invoice.ppnAmount || 0))} />
                          </div>
                        </div>
                        <div className="grid grid-cols-[1fr_150px] text-[13px]">
                          <div className="border-r border-black px-2 py-0.5">{t("invoice.export.summary.total")}</div>
                          <div className="px-2 py-0.5">
                            <CurrencyTableValue value={formatPlainNumber(Number(invoice.grandTotal || 0))} />
                          </div>
                        </div>
                      </div>

                      <div className="ml-auto w-[200px] pt-4 text-center">
                        <p className="text-[13px]">{t("invoice.export.signature.regards")}</p>
                        <div className="h-[96px]" />
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
