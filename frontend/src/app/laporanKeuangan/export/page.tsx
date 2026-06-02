"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ApiLoadingState } from "../../_components/api-loading-state";
import { ExportCurrencyValue } from "../../_components/export-currency-value";
import { useI18n } from "../../_i18n/provider";
import { ApiRequestError } from "../../_lib/api-client";
import { fetchCustomerRows } from "../../customer/_lib/customer";
import {
  calculatePembelianStockTotalByMonth,
  fetchPembelianRows,
  filterPembelianStockRowsByMonth,
  type PembelianItem,
} from "../../pembelian/_lib/pembelian";
import {
  defaultInvoiceFilter,
  fetchInvoiceExportRows,
  type InvoiceItem,
} from "../../invoice/_lib/invoice";
import {
  calculateLaporanKeuanganMonthSummary,
  fetchLaporanKeuangan,
  formatLaporanKeuanganMonth,
  getCurrentMonthValue,
  getCurrentYearValue,
  getMonthDateRange,
  getYearMonthValues,
  type LaporanKeuanganItem,
  type LaporanKeuanganMonthSummary,
} from "../_lib/laporan-keuangan";

type ExcelPrimitiveCellValue = string | number | null | undefined;
type ExcelCellValue =
  | ExcelPrimitiveCellValue
  | {
      value: ExcelPrimitiveCellValue;
      styleId?: number;
    };

type ExcelWorksheetData = {
  name: string;
  rows: ExcelCellValue[][];
  columnWidths?: number[];
  merges?: string[];
};

type FinancialReportRowKind =
  | "invoice"
  | "invoiceDetail"
  | "stock"
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
  isHutang?: boolean;
  note?: string;
};

type PurchaseReportRow = {
  hutang: boolean;
  ppn: boolean;
  supplierName: string;
  total: number;
};

type ReportMode = "monthly" | "yearly";

const excelStyleIds = {
  tableText: 1,
  tableTextIndent: 2,
  tableNumber: 3,
  header: 4,
  boldText: 5,
  boldNumber: 6,
  grossText: 7,
  grossNumber: 8,
  operationalTotalText: 9,
  operationalTotalNumber: 10,
  netProfitText: 11,
  netProfitNumber: 12,
  hutangStatus: 13,
  lunasStatus: 14,
  spacer: 15,
} as const;

function styledExcelCell(value: ExcelPrimitiveCellValue, styleId: number): ExcelCellValue {
  return { value, styleId };
}

function isStyledExcelCell(value: ExcelCellValue): value is { value: ExcelPrimitiveCellValue; styleId?: number } {
  return typeof value === "object" && value !== null && "value" in value;
}

function getExcelCellValue(value: ExcelCellValue) {
  return isStyledExcelCell(value) ? value.value : value;
}

function getExcelCellStyleId(value: ExcelCellValue) {
  return isStyledExcelCell(value) ? value.styleId : undefined;
}

function isEmptyExcelCell(value: ExcelCellValue) {
  const cellValue = getExcelCellValue(value);
  return (cellValue === null || cellValue === undefined) && getExcelCellStyleId(value) === undefined;
}

function escapeExcelXml(value: ExcelPrimitiveCellValue) {
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
  const cellValue = getExcelCellValue(value);
  const styleId = getExcelCellStyleId(value);
  const styleAttribute = styleId === undefined ? "" : ` s="${styleId}"`;

  if (cellValue === null || cellValue === undefined) {
    return `<c r="${cellReference}"${styleAttribute}/>`;
  }

  if (typeof cellValue === "number" && Number.isFinite(cellValue)) {
    return `<c r="${cellReference}"${styleAttribute}><v>${cellValue}</v></c>`;
  }

  return `<c r="${cellReference}"${styleAttribute} t="inlineStr"><is><t>${escapeExcelXml(cellValue)}</t></is></c>`;
}

function toExcelRows(rows: ExcelCellValue[][]) {
  return rows
    .map(
      (row, rowIndex) =>
        `<row r="${rowIndex + 1}">${row
          .map((value, columnIndex) => (isEmptyExcelCell(value) ? "" : toExcelCell(value, columnIndex, rowIndex)))
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
  <sheetViews>
    <sheetView showGridLines="0" workbookViewId="0"/>
  </sheetViews>
  ${toExcelColumnsXml(worksheet.columnWidths)}
  <sheetData>${toExcelRows(worksheet.rows)}</sheetData>
  ${toExcelMergesXml(worksheet.merges)}
</worksheet>`;
}

function createExcelStylesXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <numFmts count="1">
    <numFmt numFmtId="164" formatCode="_-&quot;Rp&quot;* #,##0_-;[Red]_-&quot;Rp&quot;* -#,##0_-;_-&quot;Rp&quot;* &quot;-&quot;_-;_-@_-"/>
  </numFmts>
  <fonts count="4">
    <font><sz val="11"/><color rgb="FF0F172A"/><name val="Calibri"/><family val="2"/></font>
    <font><b/><sz val="11"/><color rgb="FF020617"/><name val="Calibri"/><family val="2"/></font>
    <font><b/><sz val="11"/><color rgb="FFB91C1C"/><name val="Calibri"/><family val="2"/></font>
    <font><b/><sz val="11"/><color rgb="FF047857"/><name val="Calibri"/><family val="2"/></font>
  </fonts>
  <fills count="6">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFFFF7ED"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFBAE6FD"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFFFEDD5"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFFEF3C7"/><bgColor indexed="64"/></patternFill></fill>
  </fills>
  <borders count="2">
    <border><left/><right/><top/><bottom/><diagonal/></border>
    <border>
      <left style="thin"><color rgb="FF334155"/></left>
      <right style="thin"><color rgb="FF334155"/></right>
      <top style="thin"><color rgb="FF334155"/></top>
      <bottom style="thin"><color rgb="FF334155"/></bottom>
      <diagonal/>
    </border>
  </borders>
  <cellStyleXfs count="1">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0"/>
  </cellStyleXfs>
  <cellXfs count="16">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1"><alignment vertical="top"/></xf>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyAlignment="1" applyBorder="1"><alignment vertical="top" indent="2"/></xf>
    <xf numFmtId="164" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyAlignment="1" applyBorder="1"><alignment horizontal="right" vertical="top"/></xf>
    <xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyAlignment="1" applyBorder="1" applyFill="1" applyFont="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="1" fillId="0" borderId="1" xfId="0" applyBorder="1" applyFont="1"><alignment vertical="top"/></xf>
    <xf numFmtId="164" fontId="1" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyAlignment="1" applyBorder="1" applyFont="1"><alignment horizontal="right" vertical="top"/></xf>
    <xf numFmtId="0" fontId="1" fillId="3" borderId="1" xfId="0" applyBorder="1" applyFill="1" applyFont="1"><alignment vertical="top"/></xf>
    <xf numFmtId="164" fontId="1" fillId="3" borderId="1" xfId="0" applyNumberFormat="1" applyAlignment="1" applyBorder="1" applyFill="1" applyFont="1"><alignment horizontal="right" vertical="top"/></xf>
    <xf numFmtId="0" fontId="1" fillId="4" borderId="1" xfId="0" applyBorder="1" applyFill="1" applyFont="1"><alignment vertical="top"/></xf>
    <xf numFmtId="164" fontId="1" fillId="4" borderId="1" xfId="0" applyNumberFormat="1" applyAlignment="1" applyBorder="1" applyFill="1" applyFont="1"><alignment horizontal="right" vertical="top"/></xf>
    <xf numFmtId="0" fontId="1" fillId="5" borderId="1" xfId="0" applyBorder="1" applyFill="1" applyFont="1"><alignment vertical="top"/></xf>
    <xf numFmtId="164" fontId="1" fillId="5" borderId="1" xfId="0" applyNumberFormat="1" applyAlignment="1" applyBorder="1" applyFill="1" applyFont="1"><alignment horizontal="right" vertical="top"/></xf>
    <xf numFmtId="0" fontId="2" fillId="0" borderId="1" xfId="0" applyAlignment="1" applyBorder="1" applyFont="1"><alignment horizontal="center" vertical="top"/></xf>
    <xf numFmtId="0" fontId="3" fillId="0" borderId="1" xfId="0" applyAlignment="1" applyBorder="1" applyFont="1"><alignment horizontal="center" vertical="top"/></xf>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1"><alignment vertical="top"/></xf>
  </cellXfs>
  <cellStyles count="1">
    <cellStyle name="Normal" xfId="0" builtinId="0"/>
  </cellStyles>
  <dxfs count="0"/>
  <tableStyles count="0" defaultTableStyle="TableStyleMedium2" defaultPivotStyle="PivotStyleLight16"/>
</styleSheet>`;
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
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
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
  <Relationship Id="rIdStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`,
    },
    {
      path: "xl/styles.xml",
      content: createExcelStylesXml(),
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

function toOptionalAmount(value: number) {
  return value === 0 ? undefined : value;
}

function calculatePembelianTotal(row: PembelianItem) {
  return Number(row.nilaiNota || 0);
}

function getFinancialReportExcelStyles(row: FinancialReportRow) {
  if (row.kind === "grossProfit") {
    return {
      text: excelStyleIds.grossText,
      number: excelStyleIds.grossNumber,
    };
  }

  if (row.kind === "operationalTotal") {
    return {
      text: excelStyleIds.operationalTotalText,
      number: excelStyleIds.operationalTotalNumber,
    };
  }

  if (row.kind === "netProfit") {
    return {
      text: excelStyleIds.netProfitText,
      number: excelStyleIds.netProfitNumber,
    };
  }

  if (row.kind === "total" || row.kind === "grandTotal") {
    return {
      text: excelStyleIds.boldText,
      number: excelStyleIds.boldNumber,
    };
  }

  if (row.kind === "spacer") {
    return {
      text: excelStyleIds.spacer,
      number: excelStyleIds.spacer,
    };
  }

  return {
    text: excelStyleIds.tableText,
    number: excelStyleIds.tableNumber,
  };
}

function toFinancialReportExcelRow(row: FinancialReportRow): ExcelCellValue[] {
  const styles = getFinancialReportExcelStyles(row);
  const descriptionStyle =
    row.kind === "invoiceDetail" || row.kind === "stock"
      ? excelStyleIds.tableTextIndent
      : styles.text;
  const bayarStyle = row.bayar
    ? row.isHutang
      ? excelStyleIds.hutangStatus
      : excelStyleIds.lunasStatus
    : styles.text;

  return [
    styledExcelCell(row.date || null, styles.text),
    styledExcelCell(row.description || null, descriptionStyle),
    styledExcelCell(row.debet, styles.number),
    styledExcelCell(row.kreditPpn, styles.number),
    styledExcelCell(row.kreditNonPpn, styles.number),
    styledExcelCell(row.bayar || null, bayarStyle),
    styledExcelCell(row.note || null, styles.text),
  ];
}

export default function LaporanKeuanganExportPage() {
  const { locale, t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const reportMode: ReportMode =
    searchParams.get("mode") === "yearly" ? "yearly" : "monthly";
  const bulan = String(searchParams.get("bulan") || "").trim() || getCurrentMonthValue();
  const tahun = String(searchParams.get("tahun") || "").trim() || getCurrentYearValue();
  const [item, setItem] = useState<LaporanKeuanganItem | null>(null);
  const [invoiceRows, setInvoiceRows] = useState<InvoiceItem[]>([]);
  const [pembelianRows, setPembelianRows] = useState<PembelianItem[]>([]);
  const [yearlyRows, setYearlyRows] = useState<LaporanKeuanganMonthSummary[]>([]);
  const [customerLabelMap, setCustomerLabelMap] = useState<Map<string, string>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const monthLabel = useMemo(
    () => formatLaporanKeuanganMonth(bulan, locale),
    [bulan, locale]
  );
  const invoiceGrandTotal = useMemo(() => {
    return invoiceRows.reduce((total, row) => total + Number(row.grandTotal || 0), 0);
  }, [invoiceRows]);
  const purchaseRowsByInvoiceId = useMemo(() => {
    const map = new Map<string, PurchaseReportRow[]>();

    pembelianRows.forEach((row) => {
      const invoiceId = String(row.idInvoice || "").trim();

      if (!invoiceId) {
        return;
      }

      const rowTotal = calculatePembelianTotal(row);

      if (rowTotal <= 0) {
        return;
      }

      const supplierName = String(row.namaSupplier || "").trim() || "-";
      const currentRows = map.get(invoiceId) || [];

      map.set(invoiceId, [
        ...currentRows,
        {
          hutang: Boolean(row.hutang),
          ppn: Boolean(row.ppn),
          supplierName,
          total: rowTotal,
        },
      ]);
    });

    return map;
  }, [pembelianRows]);
  const purchaseTotalByInvoiceId = useMemo(() => {
    const map = new Map<string, number>();

    purchaseRowsByInvoiceId.forEach((rows, invoiceId) => {
      map.set(
        invoiceId,
        rows.reduce((total, row) => total + row.total, 0)
      );
    });

    return map;
  }, [purchaseRowsByInvoiceId]);
  const purchaseTotal = useMemo(() => {
    return invoiceRows.reduce(
      (total, row) => total + (purchaseTotalByInvoiceId.get(row.id) || 0),
      0
    );
  }, [invoiceRows, purchaseTotalByInvoiceId]);
  const stockPembelianRows = useMemo(() => {
    return filterPembelianStockRowsByMonth(pembelianRows, bulan);
  }, [bulan, pembelianRows]);
  const stockBarangTotal = useMemo(() => {
    return calculatePembelianStockTotalByMonth(pembelianRows, bulan);
  }, [bulan, pembelianRows]);
  const grossProfit = invoiceGrandTotal - purchaseTotal;
  const totalBiayaOperasional = item?.totalBiayaOperasional || 0;
  const netProfit = grossProfit - totalBiayaOperasional;
  const yearlyTotals = useMemo<LaporanKeuanganMonthSummary>(() => {
    return yearlyRows.reduce(
      (total, row) => ({
        bulan: tahun,
        totalInvoice: total.totalInvoice + row.totalInvoice,
        totalPembelian: total.totalPembelian + row.totalPembelian,
        totalStockBarang: total.totalStockBarang + row.totalStockBarang,
        grossProfit: total.grossProfit + row.grossProfit,
        totalBiayaOperasional:
          total.totalBiayaOperasional + row.totalBiayaOperasional,
        netProfit: total.netProfit + row.netProfit,
      }),
      {
        bulan: tahun,
        totalInvoice: 0,
        totalPembelian: 0,
        totalStockBarang: 0,
        grossProfit: 0,
        totalBiayaOperasional: 0,
        netProfit: 0,
      }
    );
  }, [tahun, yearlyRows]);
  const exportSummary =
    reportMode === "yearly"
      ? yearlyTotals
      : {
          bulan,
          totalInvoice: invoiceGrandTotal,
          totalPembelian: purchaseTotal,
          totalStockBarang: stockBarangTotal,
          grossProfit,
          totalBiayaOperasional,
          netProfit,
        };
  const reportPeriodLabel = reportMode === "yearly" ? tahun : monthLabel;
  const purchasePpnTotal = useMemo(() => {
    return invoiceRows.reduce((total, row) => {
      const invoicePurchases = purchaseRowsByInvoiceId.get(row.id) || [];
      return (
        total +
        invoicePurchases.reduce(
          (invoiceTotal, purchase) => invoiceTotal + (purchase.ppn ? purchase.total : 0),
          0
        )
      );
    }, 0);
  }, [invoiceRows, purchaseRowsByInvoiceId]);
  const purchaseNonPpnTotal = purchaseTotal - purchasePpnTotal;
  const stockPpnTotal = stockPembelianRows.reduce(
    (total, row) => total + (row.ppn ? calculatePembelianTotal(row) : 0),
    0
  );
  const stockNonPpnTotal = stockBarangTotal - stockPpnTotal;
  const financialReportRows = useMemo(() => {
    const rows: FinancialReportRow[] = [];

    invoiceRows.forEach((row) => {
      const grandTotal = Number(row.grandTotal || 0);
      const invoicePurchases = purchaseRowsByInvoiceId.get(row.id) || [];
      const customerName = customerLabelMap.get(row.idCustomer) || row.idCustomer || "-";

      rows.push({
        kind: "invoice",
        date: formatSpreadsheetDate(row.tanggal),
        description: `${customerName} (${row.noInvoice || "-"})`,
        debet: grandTotal,
      });

      invoicePurchases.forEach((purchase) => {
        rows.push({
          kind: "invoiceDetail",
          description: `${t("nav.pembelian")} - ${purchase.supplierName}`,
          kreditPpn: purchase.ppn ? purchase.total : undefined,
          kreditNonPpn: purchase.ppn ? undefined : purchase.total,
          bayar: purchase.hutang ? t("field.hutang").toUpperCase() : t("field.lunas").toUpperCase(),
          isHutang: purchase.hutang,
        });
      });

      rows.push({ kind: "spacer" });
    });

    rows.push({
      kind: "total",
      description: t("laporanKeuangan.report.totalJumlah"),
      debet: invoiceGrandTotal,
      kreditPpn: toOptionalAmount(purchasePpnTotal),
      kreditNonPpn: toOptionalAmount(purchaseNonPpnTotal),
    });
    rows.push({
      kind: "grandTotal",
      description: t("laporanKeuangan.report.grandTotal"),
      debet: invoiceGrandTotal,
      kreditNonPpn: purchaseTotal,
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
      description: t("field.stockBarang").toUpperCase(),
    });

    stockPembelianRows.forEach((row) => {
      const rowTotal = calculatePembelianTotal(row);

      if (rowTotal <= 0) {
        return;
      }

      rows.push({
        kind: "stock",
        date: formatSpreadsheetDate(row.tanggalNota),
        description: `${t("field.stockBarang")} - ${row.namaSupplier || "-"}`,
        kreditPpn: row.ppn ? rowTotal : undefined,
        kreditNonPpn: row.ppn ? undefined : rowTotal,
        bayar: row.hutang ? t("field.hutang").toUpperCase() : t("field.lunas").toUpperCase(),
        isHutang: row.hutang,
        note: row.noNota || undefined,
      });
    });

    rows.push({
      kind: "total",
      description: t("field.stockBarang").toUpperCase(),
      kreditPpn: toOptionalAmount(stockPpnTotal),
      kreditNonPpn: toOptionalAmount(stockNonPpnTotal),
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
    invoiceGrandTotal,
    invoiceRows,
    item,
    netProfit,
    purchaseNonPpnTotal,
    purchasePpnTotal,
    purchaseTotal,
    purchaseRowsByInvoiceId,
    stockNonPpnTotal,
    stockPembelianRows,
    stockPpnTotal,
    t,
    totalBiayaOperasional,
  ]);

  useEffect(() => {
    const previousTitle = document.title;
    document.title =
      reportMode === "yearly" ? `laporan-keuangan-${tahun}` : `laporan-keuangan-${bulan}`;

    return () => {
      document.title = previousTitle;
    };
  }, [bulan, reportMode, tahun]);

  useEffect(() => {
    let isCancelled = false;

    async function loadExportData() {
      setIsLoading(true);
      setErrorMessage("");

      try {
        if (reportMode === "yearly") {
          const monthValues = getYearMonthValues(tahun);

          if (monthValues.length === 0) {
            if (!isCancelled) {
              setItem(null);
              setInvoiceRows([]);
              setPembelianRows([]);
              setYearlyRows([]);
              setCustomerLabelMap(new Map());
            }

            return;
          }

          const [laporanKeuanganItems, invoiceRowsByMonth, pembelians] = await Promise.all([
            Promise.all(monthValues.map((monthValue) => fetchLaporanKeuangan(monthValue))),
            Promise.all(
              monthValues.map((monthValue) => {
                const { tanggalDari, tanggalSampai } = getMonthDateRange(monthValue);

                return fetchInvoiceExportRows({
                  ...defaultInvoiceFilter,
                  tanggalDari,
                  tanggalSampai,
                });
              })
            ),
            fetchPembelianRows(),
          ]);

          if (isCancelled) {
            return;
          }

          setItem(null);
          setInvoiceRows([]);
          setPembelianRows(pembelians);
          setYearlyRows(
            monthValues.map((monthValue, index) =>
              calculateLaporanKeuanganMonthSummary({
                bulan: monthValue,
                invoiceRows: invoiceRowsByMonth[index] || [],
                laporanKeuangan: laporanKeuanganItems[index] || null,
                pembelianRows: pembelians,
              })
            )
          );
          setCustomerLabelMap(new Map());
          return;
        }

        const { tanggalDari, tanggalSampai } = getMonthDateRange(bulan);
        const [laporanKeuangan, invoices, customers, pembelians] = await Promise.all([
          fetchLaporanKeuangan(bulan),
          fetchInvoiceExportRows({
            ...defaultInvoiceFilter,
            tanggalDari,
            tanggalSampai,
          }),
          fetchCustomerRows(),
          fetchPembelianRows(),
        ]);

        if (isCancelled) {
          return;
        }

        setItem(laporanKeuangan);
        setInvoiceRows(invoices);
        setPembelianRows(pembelians);
        setYearlyRows([]);
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
  }, [bulan, reportMode, t, tahun]);

  function handleClosePage() {
    window.close();

    window.setTimeout(() => {
      if (!document.hidden) {
        router.push("/laporanKeuangan");
      }
    }, 150);
  }

  function handleExportExcel() {
    if (reportMode === "yearly") {
      const reportRows: ExcelCellValue[][] = [
        [
          styledExcelCell(t("field.bulan"), excelStyleIds.header),
          styledExcelCell(t("field.totalInvoice"), excelStyleIds.header),
          styledExcelCell(t("field.totalPembelian"), excelStyleIds.header),
          styledExcelCell(t("field.stockBarang"), excelStyleIds.header),
          styledExcelCell(t("field.grossProfit"), excelStyleIds.header),
          styledExcelCell(t("field.totalBiayaOperasional"), excelStyleIds.header),
          styledExcelCell(t("field.netProfit"), excelStyleIds.header),
        ],
        ...yearlyRows.map((row) => [
          styledExcelCell(formatLaporanKeuanganMonth(row.bulan, locale), excelStyleIds.tableText),
          styledExcelCell(row.totalInvoice, excelStyleIds.tableNumber),
          styledExcelCell(row.totalPembelian, excelStyleIds.tableNumber),
          styledExcelCell(row.totalStockBarang, excelStyleIds.tableNumber),
          styledExcelCell(row.grossProfit, excelStyleIds.tableNumber),
          styledExcelCell(row.totalBiayaOperasional, excelStyleIds.tableNumber),
          styledExcelCell(row.netProfit, excelStyleIds.tableNumber),
        ]),
        [
          styledExcelCell(t("laporanKeuangan.yearlyTable.total"), excelStyleIds.boldText),
          styledExcelCell(yearlyTotals.totalInvoice, excelStyleIds.boldNumber),
          styledExcelCell(yearlyTotals.totalPembelian, excelStyleIds.boldNumber),
          styledExcelCell(yearlyTotals.totalStockBarang, excelStyleIds.boldNumber),
          styledExcelCell(yearlyTotals.grossProfit, excelStyleIds.boldNumber),
          styledExcelCell(yearlyTotals.totalBiayaOperasional, excelStyleIds.boldNumber),
          styledExcelCell(yearlyTotals.netProfit, excelStyleIds.boldNumber),
        ],
      ];

      downloadExcelFile(`laporan-keuangan-${tahun}.xlsx`, [
        {
          name: `Laporan ${tahun}`,
          rows: reportRows,
          columnWidths: [22, 18, 18, 18, 18, 24, 18],
        },
      ]);
      return;
    }

    const reportRows: ExcelCellValue[][] = [
      [
        styledExcelCell(t("laporanKeuangan.report.date"), excelStyleIds.header),
        styledExcelCell(t("laporanKeuangan.report.description"), excelStyleIds.header),
        styledExcelCell(t("laporanKeuangan.report.debet"), excelStyleIds.header),
        styledExcelCell(t("laporanKeuangan.report.kredit"), excelStyleIds.header),
        styledExcelCell(null, excelStyleIds.header),
        styledExcelCell(t("laporanKeuangan.report.bayar"), excelStyleIds.header),
        styledExcelCell(t("laporanKeuangan.report.note"), excelStyleIds.header),
      ],
      [
        styledExcelCell(null, excelStyleIds.header),
        styledExcelCell(null, excelStyleIds.header),
        styledExcelCell(null, excelStyleIds.header),
        styledExcelCell(t("field.ppn"), excelStyleIds.header),
        styledExcelCell(t("laporanKeuangan.report.nonPpn"), excelStyleIds.header),
        styledExcelCell(null, excelStyleIds.header),
        styledExcelCell(null, excelStyleIds.header),
      ],
      ...financialReportRows.map((row) => toFinancialReportExcelRow(row)),
    ];

    downloadExcelFile(`laporan-keuangan-${bulan}.xlsx`, [
      {
        name: "Laporan Keuangan",
        rows: reportRows,
        columnWidths: [9, 60, 16, 12, 12, 10, 18],
        merges: ["A1:A2", "B1:B2", "C1:C2", "D1:E1", "F1:F2", "G1:G2"],
      },
    ]);
  }

  return (
    <>
      <style jsx global>{`
        @page {
          size: letter portrait;
          margin: 12mm;
        }

        @media print {
          .laporan-keuangan-export,
          .laporan-keuangan-export * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>

      <main className="laporan-keuangan-export min-h-screen bg-slate-100 px-4 py-4 print:bg-white print:px-0 print:py-0">
        <div className="mx-auto max-w-[900px] space-y-4 print:max-w-none">
          <header className="flex flex-wrap items-start justify-between gap-3 rounded-2xl bg-white p-4 shadow-sm print:hidden">
            <div>
              <h1 className="text-xl font-semibold text-slate-900">{t("laporanKeuangan.exportPage.title")}</h1>
              <p className="mt-1 text-sm text-slate-600">
                {t(
                  reportMode === "yearly"
                    ? "laporanKeuangan.exportPage.yearlyDescription"
                    : "laporanKeuangan.exportPage.description"
                )}
              </p>
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
                  <p className="mt-1 text-sm text-slate-600">{reportPeriodLabel}</p>
                </div>
                <div className="rounded-lg border border-slate-300 px-3 py-2 text-right">
                  <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">
                    {t("field.netProfit")}
                  </p>
                  <p className={`mt-1 text-lg font-semibold ${exportSummary.netProfit >= 0 ? "text-slate-900" : "text-red-700"}`}>
                    <ExportCurrencyValue value={exportSummary.netProfit} locale={locale} />
                  </p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-6">
                <div className="rounded-lg border border-slate-300 px-3 py-2">
                  <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">{t("field.totalInvoice")}</p>
                  <p className="mt-1 font-semibold text-slate-900">
                    <ExportCurrencyValue value={exportSummary.totalInvoice} locale={locale} />
                  </p>
                </div>
                <div className="rounded-lg border border-slate-300 px-3 py-2">
                  <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">{t("field.totalPembelian")}</p>
                  <p className="mt-1 font-semibold text-slate-900">
                    <ExportCurrencyValue value={exportSummary.totalPembelian} locale={locale} />
                  </p>
                </div>
                <div className="rounded-lg border border-slate-300 px-3 py-2">
                  <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">{t("field.stockBarang")}</p>
                  <p className="mt-1 font-semibold text-slate-900">
                    <ExportCurrencyValue value={exportSummary.totalStockBarang} locale={locale} />
                  </p>
                </div>
                <div className="rounded-lg border border-slate-300 px-3 py-2">
                  <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">{t("field.grossProfit")}</p>
                  <p className="mt-1 font-semibold text-slate-900">
                    <ExportCurrencyValue value={exportSummary.grossProfit} locale={locale} />
                  </p>
                </div>
                <div className="rounded-lg border border-slate-300 px-3 py-2">
                  <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">{t("field.totalBiayaOperasional")}</p>
                  <p className="mt-1 font-semibold text-slate-900">
                    <ExportCurrencyValue value={exportSummary.totalBiayaOperasional} locale={locale} />
                  </p>
                </div>
                <div className="rounded-lg border border-slate-300 px-3 py-2">
                  <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">{t("field.netProfit")}</p>
                  <p className={`mt-1 font-semibold ${exportSummary.netProfit >= 0 ? "text-slate-900" : "text-red-700"}`}>
                    <ExportCurrencyValue value={exportSummary.netProfit} locale={locale} />
                  </p>
                </div>
              </div>

              {reportMode === "yearly" ? (
                <div className="overflow-x-auto border border-slate-300 print:overflow-visible">
                  <table className="w-full min-w-[1020px] table-fixed border-collapse text-sm text-slate-900 print:text-[11px]">
                    <thead className="bg-amber-50 text-center font-semibold uppercase">
                      <tr>
                        <th className="w-40 border border-slate-400 px-2 py-2">{t("field.bulan")}</th>
                        <th className="w-36 border border-slate-400 px-2 py-2">{t("field.totalInvoice")}</th>
                        <th className="w-36 border border-slate-400 px-2 py-2">{t("field.totalPembelian")}</th>
                        <th className="w-36 border border-slate-400 px-2 py-2">{t("field.stockBarang")}</th>
                        <th className="w-36 border border-slate-400 px-2 py-2">{t("field.grossProfit")}</th>
                        <th className="w-44 border border-slate-400 px-2 py-2">{t("field.totalBiayaOperasional")}</th>
                        <th className="w-36 border border-slate-400 px-2 py-2">{t("field.netProfit")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {yearlyRows.map((row) => (
                        <tr key={row.bulan}>
                          <td className="truncate border border-slate-300 px-2 py-1 align-top font-medium">
                            {formatLaporanKeuanganMonth(row.bulan, locale)}
                          </td>
                          <td className="truncate border border-slate-300 px-2 py-1 align-top">
                            <ExportCurrencyValue value={row.totalInvoice} locale={locale} />
                          </td>
                          <td className="truncate border border-slate-300 px-2 py-1 align-top">
                            <ExportCurrencyValue value={row.totalPembelian} locale={locale} />
                          </td>
                          <td className="truncate border border-slate-300 px-2 py-1 align-top">
                            <ExportCurrencyValue value={row.totalStockBarang} locale={locale} />
                          </td>
                          <td className="truncate border border-slate-300 px-2 py-1 align-top">
                            <ExportCurrencyValue value={row.grossProfit} locale={locale} />
                          </td>
                          <td className="truncate border border-slate-300 px-2 py-1 align-top">
                            <ExportCurrencyValue value={row.totalBiayaOperasional} locale={locale} />
                          </td>
                          <td className={`truncate border border-slate-300 px-2 py-1 align-top font-semibold ${
                            row.netProfit >= 0 ? "text-slate-900" : "text-red-700"
                          }`}>
                            <ExportCurrencyValue value={row.netProfit} locale={locale} />
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-amber-100 font-semibold">
                        <td className="truncate border border-slate-300 px-2 py-1 align-top">
                          {t("laporanKeuangan.yearlyTable.total")}
                        </td>
                        <td className="truncate border border-slate-300 px-2 py-1 align-top">
                          <ExportCurrencyValue value={yearlyTotals.totalInvoice} locale={locale} />
                        </td>
                        <td className="truncate border border-slate-300 px-2 py-1 align-top">
                          <ExportCurrencyValue value={yearlyTotals.totalPembelian} locale={locale} />
                        </td>
                        <td className="truncate border border-slate-300 px-2 py-1 align-top">
                          <ExportCurrencyValue value={yearlyTotals.totalStockBarang} locale={locale} />
                        </td>
                        <td className="truncate border border-slate-300 px-2 py-1 align-top">
                          <ExportCurrencyValue value={yearlyTotals.grossProfit} locale={locale} />
                        </td>
                        <td className="truncate border border-slate-300 px-2 py-1 align-top">
                          <ExportCurrencyValue value={yearlyTotals.totalBiayaOperasional} locale={locale} />
                        </td>
                        <td className={`truncate border border-slate-300 px-2 py-1 align-top ${
                          yearlyTotals.netProfit >= 0 ? "text-slate-900" : "text-red-700"
                        }`}>
                          <ExportCurrencyValue value={yearlyTotals.netProfit} locale={locale} />
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="overflow-x-auto border border-slate-300 print:overflow-visible">
                  <table className="w-full min-w-[900px] table-fixed border-collapse text-sm text-slate-900 print:text-[11px]">
                    <colgroup>
                      <col style={{ width: "8%" }} />
                      <col style={{ width: "35%" }} />
                      <col style={{ width: "14%" }} />
                      <col style={{ width: "11%" }} />
                      <col style={{ width: "11%" }} />
                      <col style={{ width: "9%" }} />
                      <col style={{ width: "12%" }} />
                    </colgroup>
                    <thead className="bg-amber-50 text-center font-semibold uppercase">
                      <tr>
                        <th rowSpan={2} className="border border-slate-400 px-2 py-2">{t("laporanKeuangan.report.date")}</th>
                        <th rowSpan={2} className="border border-slate-400 px-2 py-2">{t("laporanKeuangan.report.description")}</th>
                        <th rowSpan={2} className="border border-slate-400 px-2 py-2">{t("laporanKeuangan.report.debet")}</th>
                        <th colSpan={2} className="border border-slate-400 px-2 py-1">{t("laporanKeuangan.report.kredit")}</th>
                        <th rowSpan={2} className="border border-slate-400 px-2 py-2">{t("laporanKeuangan.report.bayar")}</th>
                        <th rowSpan={2} className="border border-slate-400 px-2 py-2">{t("laporanKeuangan.report.note")}</th>
                      </tr>
                      <tr>
                        <th className="border border-slate-400 px-2 py-1">{t("field.ppn")}</th>
                        <th className="border border-slate-400 px-2 py-1">{t("laporanKeuangan.report.nonPpn")}</th>
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
                            <td className="truncate border border-slate-300 px-2 py-1 align-top">{row.date || ""}</td>
                            <td className={`truncate border border-slate-300 px-2 py-1 align-top ${
                              row.kind === "invoiceDetail" || row.kind === "stock" ? "pl-8" : ""
                            }`} title={row.description || ""}>
                              {row.description || ""}
                            </td>
                            <td className="truncate border border-slate-300 px-2 py-1 align-top">
                              <ExportCurrencyValue value={row.debet} locale={locale} />
                            </td>
                            <td className="truncate border border-slate-300 px-2 py-1 align-top">
                              <ExportCurrencyValue value={row.kreditPpn} locale={locale} />
                            </td>
                            <td className="truncate border border-slate-300 px-2 py-1 align-top">
                              <ExportCurrencyValue value={row.kreditNonPpn} locale={locale} />
                            </td>
                            <td
                              className={`truncate border border-slate-300 px-2 py-1 align-top ${
                                row.isHutang
                                  ? "font-semibold text-red-700"
                                  : row.bayar
                                    ? "font-semibold text-emerald-700"
                                    : ""
                              }`}
                            >
                              {row.bayar || ""}
                            </td>
                            <td className="truncate border border-slate-300 px-2 py-1 align-top" title={row.note || ""}>{row.note || ""}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          ) : null}
        </div>
      </main>
    </>
  );
}
