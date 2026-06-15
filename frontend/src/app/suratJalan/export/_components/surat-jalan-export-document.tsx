"use client";

import { type CSSProperties, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useI18n } from "../../../_i18n/provider";
import { formatAppUppercaseDate } from "../../../_lib/date";
import { type SuratJalanItem } from "../../_lib/surat-jalan";

type ExportCustomer = {
  nama?: string;
  alamat?: string;
  atasNama?: string;
} | null;

const companyProfile = {
  name: "CV. PRIMA PUTRA PERKASA",
  addressLines: [
    "Lindeteves Trade Centre Lt. 2 Blok B20 No. 6, Jl. Hayam Wuruk No.127, Jakarta",
    "Tel. 021. 6246441, 62320362",
  ],
};

const meiloonCustomerName = "PT. MEILOON TECHNOLOGY INDONESIA";
const halfPageRowsPerPage = 8;
const fullPageRowsPerPage = 15;
const halfPageWidth = "24cm";
const halfPageHeight = "14cm";
const fullPageWidth = "21.59cm";
const fullPageHeight = "27.94cm";
const suratJalanExportFontFamily = '"NLQ Sans Serif", Arial, "Helvetica Neue", sans-serif';

export type SuratJalanExportPaperSize = "half" | "full";

type SuratJalanPrintPageStyle = CSSProperties & {
  "--surat-jalan-page-height": string;
  "--surat-jalan-page-width": string;
};

type SuratJalanRowMeasurements = {
  templateRowHeights: number[];
  meiloonRowHeights: number[];
};

type MeiloonColumnWidths = {
  no: string;
  namaBarang: string;
  spesifikasi: string;
  qty: string;
  unit: string;
  kodeDepartemen: string;
  ttdPenerima: string;
  note: string;
};

type DefaultColumnWidths = {
  no: string;
  jumlah: string;
};

const halfMeiloonColumnWidths: MeiloonColumnWidths = {
  no: "4%",
  namaBarang: "18%",
  spesifikasi: "40%",
  qty: "5%",
  unit: "9%",
  kodeDepartemen: "10%",
  ttdPenerima: "10%",
  note: "7%",
};

const fullMeiloonColumnWidths: MeiloonColumnWidths = {
  no: "4%",
  namaBarang: "18%",
  spesifikasi: "38%",
  qty: "5%",
  unit: "9%",
  kodeDepartemen: "10%",
  ttdPenerima: "12%",
  note: "7%",
};

const halfDefaultColumnWidths: DefaultColumnWidths = {
  no: "40px",
  jumlah: "90px",
};

const fullDefaultColumnWidths: DefaultColumnWidths = {
  no: "40px",
  jumlah: "90px",
};

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

function lineCountToSuratJalanRowUnits(lineCount: number) {
  return 1 + Math.max(0, lineCount - 1) * 0.85;
}

function isRowEmpty<T extends object>(row: T) {
  return !Object.values(row).some((value) => String(value || "").trim());
}

function createEmptyTemplateRow(): TemplateRow {
  return {
    no: "",
    namaBarang: "",
    kodeDepartemen: "",
    jumlah: "",
  };
}

function createEmptyMeiloonTemplateRow(): MeiloonTemplateRow {
  return {
    no: "",
    namaBarang: "",
    spesifikasi: "",
    qty: "",
    unit: "",
    kodeDepartemen: "",
    ttdPenerima: "",
    note: "",
  };
}

function estimateDefaultTemplateRowUnits(row: TemplateRow) {
  if (isRowEmpty(row)) {
    return 1;
  }

  return lineCountToSuratJalanRowUnits(
    Math.max(1, estimateWrappedLineCount(row.namaBarang, 74))
  );
}

function estimateMeiloonTemplateRowUnits(row: MeiloonTemplateRow) {
  if (isRowEmpty(row)) {
    return 1;
  }

  return lineCountToSuratJalanRowUnits(
    Math.max(
      1,
      estimateWrappedLineCount(row.namaBarang, 18),
      estimateWrappedLineCount(row.spesifikasi, 38)
    )
  );
}

function estimateRowsUnits<T>(rows: T[], estimateRowUnits: (row: T) => number) {
  return rows.reduce((total, row) => total + Math.max(1, estimateRowUnits(row)), 0);
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

function addFillerRowsByCapacity<T>(
  rows: T[],
  minimumRows: number,
  capacity: number,
  estimateRowUnits: (row: T) => number,
  createEmptyRow: () => T
) {
  const result = [...rows];
  let usedUnits = estimateRowsUnits(result, estimateRowUnits);

  while (result.length < minimumRows && usedUnits + 1 <= capacity) {
    const emptyRow = createEmptyRow();
    result.push(emptyRow);
    usedUnits += Math.max(1, estimateRowUnits(emptyRow));
  }

  return result;
}

function paginateRowsByCapacity<T>(
  rows: T[],
  capacity: number,
  minimumRows: number,
  estimateRowUnits: (row: T) => number,
  createEmptyRow: () => T
) {
  if (rows.length === 0) {
    return [
      addFillerRowsByCapacity([], minimumRows, capacity, estimateRowUnits, createEmptyRow),
    ];
  }

  const pages: T[][] = [];
  let nextIndex = 0;

  while (nextIndex < rows.length) {
    const pageRows: T[] = [];
    let usedUnits = 0;

    while (nextIndex < rows.length) {
      const row = rows[nextIndex];
      const rowUnits = Math.max(1, estimateRowUnits(row));

      if (pageRows.length > 0 && usedUnits + rowUnits > capacity) {
        break;
      }

      pageRows.push(row);
      usedUnits += rowUnits;
      nextIndex += 1;

      if (usedUnits >= capacity) {
        break;
      }
    }

    pages.push(
      addFillerRowsByCapacity(
        pageRows,
        minimumRows,
        capacity,
        estimateRowUnits,
        createEmptyRow
      )
    );
  }

  return pages;
}

function toUpperText(value: string) {
  return String(value || "").trim().toUpperCase();
}

function getSingleLineCustomerNameFontSize(value: string) {
  const length = String(value || "").trim().length;

  if (length > 58) {
    return "10px";
  }

  if (length > 48) {
    return "11px";
  }

  if (length > 40) {
    return "12px";
  }

  if (length > 34) {
    return "13px";
  }

  return "15px";
}

function normalizeCustomerName(value: string) {
  return String(value || "").trim().toUpperCase();
}

function formatTemplateDate(value: string, locale: "id" | "en") {
  return formatAppUppercaseDate(value, locale);
}

function formatExportKendaraan(value: string) {
  return String(value || "")
    .trim()
    .replace(/^\((.*)\)$/, "$1")
    .trim()
    .toUpperCase();
}

function resolveRowsPerPage(paperSize: SuratJalanExportPaperSize) {
  return paperSize === "full" ? fullPageRowsPerPage : halfPageRowsPerPage;
}

function resolvePageHeight(paperSize: SuratJalanExportPaperSize) {
  return paperSize === "full" ? fullPageHeight : halfPageHeight;
}

function resolvePageWidth(paperSize: SuratJalanExportPaperSize) {
  return paperSize === "full" ? fullPageWidth : halfPageWidth;
}

function resolveMeiloonColumnWidths(paperSize: SuratJalanExportPaperSize) {
  return paperSize === "full" ? fullMeiloonColumnWidths : halfMeiloonColumnWidths;
}

function resolveDefaultColumnWidths(paperSize: SuratJalanExportPaperSize) {
  return paperSize === "full" ? fullDefaultColumnWidths : halfDefaultColumnWidths;
}

function buildTemplateRows(
  suratJalan: SuratJalanItem,
  minimumRows = halfPageRowsPerPage
): TemplateRow[] {
  const filledRows = (suratJalan.barang || []).map((barang, index) => {
    const namaBarang = String(barang.nama || "").trim();
    const spesifikasi = String(barang.spesifikasi || "").trim();
    const kodeDepartemen = String(barang.kodeDepartemen || suratJalan.kodeDepartemen || "").trim();
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
  suratJalan: SuratJalanItem,
  minimumRows = halfPageRowsPerPage
): MeiloonTemplateRow[] {
  const filledRows = (suratJalan.barang || []).map((barang, index) => ({
    no: String(index + 1),
    namaBarang: String(barang.nama || "").trim(),
    spesifikasi: String(barang.spesifikasi || "").trim(),
    qty: String(barang.jumlah || "").trim(),
    unit: String(barang.unit || "").trim().toUpperCase(),
    kodeDepartemen: String(barang.kodeDepartemen || suratJalan.kodeDepartemen || "").trim(),
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

type SuratJalanPaginationMeasureProps = {
  templateRows: TemplateRow[];
  meiloonRows: MeiloonTemplateRow[];
  pageWidth: string;
  meiloonColumnWidths: MeiloonColumnWidths;
  defaultColumnWidths: DefaultColumnWidths;
  meiloonRowHeightClass: string;
  defaultRowHeightClass: string;
  onMeasure: (measurements: SuratJalanRowMeasurements) => void;
};

function SuratJalanPaginationMeasure({
  templateRows,
  meiloonRows,
  pageWidth,
  meiloonColumnWidths,
  defaultColumnWidths,
  meiloonRowHeightClass,
  defaultRowHeightClass,
  onMeasure,
}: SuratJalanPaginationMeasureProps) {
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

        const templateRowElements = Array.from(
          rootRef.current.querySelectorAll<HTMLElement>(
            '[data-surat-jalan-measure-table="default"] [data-surat-jalan-export-row="default"]'
          )
        );
        const meiloonRowElements = Array.from(
          rootRef.current.querySelectorAll<HTMLElement>(
            '[data-surat-jalan-measure-table="meiloon"] [data-surat-jalan-export-row="meiloon"]'
          )
        );

        if (
          templateRowElements.length !== templateRows.length ||
          meiloonRowElements.length !== meiloonRows.length
        ) {
          return;
        }

        onMeasure({
          templateRowHeights: templateRowElements.map((element) =>
            element.getBoundingClientRect().height
          ),
          meiloonRowHeights: meiloonRowElements.map((element) =>
            element.getBoundingClientRect().height
          ),
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
  }, [meiloonRows, onMeasure, templateRows]);

  return (
    <div
      ref={rootRef}
      aria-hidden="true"
      className="pointer-events-none fixed left-[-10000px] top-0 z-[-1] bg-white text-black tracking-[0.05em] print:hidden"
      style={{
        fontFamily: suratJalanExportFontFamily,
        visibility: "hidden",
        width: pageWidth,
      }}
    >
      <div
        data-surat-jalan-measure-table="default"
        className="px-[5mm] py-[4mm] text-[15px] leading-[1.18]"
        style={{ width: pageWidth }}
      >
        <div className="border-2 border-black [&_td]:py-[2px] [&_th]:py-[2px]">
          <table className="w-full border-collapse table-fixed">
            <colgroup>
              <col style={{ width: defaultColumnWidths.no }} />
              <col />
              <col style={{ width: defaultColumnWidths.jumlah }} />
            </colgroup>
            <tbody>
              {templateRows.map((row, index) => (
                <tr
                  key={`template-measure-row-${index}`}
                  className={`${defaultRowHeightClass} border-b border-black last:border-b-0`}
                  data-surat-jalan-export-row="default"
                >
                  <td className="border-r border-black px-1 text-center align-middle text-[15px]">{row.no}</td>
                  <td className="border-r border-black px-2 align-middle text-[15px]">
                    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
                      <span className="whitespace-normal break-words leading-[1.15]">
                        {row.namaBarang}
                      </span>
                      <span className="shrink-0">{row.kodeDepartemen}</span>
                    </div>
                  </td>
                  <td className="px-2 text-center align-middle text-[15px]">{row.jumlah}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div
        data-surat-jalan-measure-table="meiloon"
        className="px-[5mm] py-[4mm] text-[15px] leading-[1.18]"
        style={{ width: pageWidth }}
      >
        <div className="border-2 border-black [&_td]:py-[2px] [&_th]:py-[2px]">
          <table className="w-full border-collapse table-fixed">
            <colgroup>
              <col style={{ width: meiloonColumnWidths.no }} />
              <col style={{ width: meiloonColumnWidths.namaBarang }} />
              <col style={{ width: meiloonColumnWidths.spesifikasi }} />
              <col style={{ width: meiloonColumnWidths.qty }} />
              <col style={{ width: meiloonColumnWidths.unit }} />
              <col style={{ width: meiloonColumnWidths.kodeDepartemen }} />
              <col style={{ width: meiloonColumnWidths.ttdPenerima }} />
              <col style={{ width: meiloonColumnWidths.note }} />
            </colgroup>
            <tbody>
              {meiloonRows.map((row, index) => (
                <tr
                  key={`meiloon-measure-row-${index}`}
                  className={`${meiloonRowHeightClass} border-b border-black last:border-b-0`}
                  data-surat-jalan-export-row="meiloon"
                >
                  <td className="border-r border-black px-1 text-center align-middle text-[15px]">{row.no}</td>
                  <td className="whitespace-normal break-words border-r border-black px-1.5 align-middle text-[15px] leading-[1.15]">
                    {row.namaBarang}
                  </td>
                  <td className="border-r border-black px-1.5 align-middle whitespace-pre-line text-[15px] leading-[1.15]">
                    {row.spesifikasi}
                  </td>
                  <td className="border-r border-black px-1 text-center align-middle text-[15px]">{row.qty}</td>
                  <td className="border-r border-black px-1 text-center align-middle text-[15px]">{row.unit}</td>
                  <td className="border-r border-black px-1 text-center align-middle text-[15px]">{row.kodeDepartemen}</td>
                  <td className="border-r border-black px-1 text-center align-middle text-[15px]">{row.ttdPenerima}</td>
                  <td className="px-1 text-center align-middle text-[15px]">{row.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

type SuratJalanExportDocumentProps = {
  suratJalan: SuratJalanItem;
  customer: ExportCustomer;
  paperSize?: SuratJalanExportPaperSize;
  className?: string;
};

export function SuratJalanExportDocument({
  suratJalan,
  customer,
  paperSize = "half",
  className = "",
}: SuratJalanExportDocumentProps) {
  const { t, locale } = useI18n();
  const [rowMeasurements, setRowMeasurements] = useState<SuratJalanRowMeasurements>({
    templateRowHeights: [],
    meiloonRowHeights: [],
  });
  const rowsPerPage = resolveRowsPerPage(paperSize);
  const pageHeight = resolvePageHeight(paperSize);
  const pageWidth = resolvePageWidth(paperSize);
  const meiloonBaseRowHeight = paperSize === "full" ? 38 : 22;
  const defaultBaseRowHeight = paperSize === "full" ? 38 : 23;
  const meiloonRowHeightClass = paperSize === "full" ? "h-[38px]" : "h-[22px]";
  const defaultRowHeightClass = paperSize === "full" ? "h-[38px]" : "h-[23px]";
  const meiloonColumnWidths = resolveMeiloonColumnWidths(paperSize);
  const defaultColumnWidths = resolveDefaultColumnWidths(paperSize);
  const printPageStyle: SuratJalanPrintPageStyle = {
    "--surat-jalan-page-height": pageHeight,
    "--surat-jalan-page-width": pageWidth,
    fontFamily: suratJalanExportFontFamily,
    maxWidth: pageWidth,
    width: pageWidth,
  };
  const templateRows = useMemo(
    () => buildTemplateRows(suratJalan, 0),
    [suratJalan]
  );
  const meiloonTemplateRows = useMemo(
    () => buildMeiloonTemplateRows(suratJalan, 0),
    [suratJalan]
  );
  const templateRowUnitEstimator = useMemo(
    () =>
      createMeasuredRowUnitEstimator(
        templateRows,
        rowMeasurements.templateRowHeights,
        defaultBaseRowHeight,
        estimateDefaultTemplateRowUnits
      ),
    [defaultBaseRowHeight, rowMeasurements.templateRowHeights, templateRows]
  );
  const meiloonRowUnitEstimator = useMemo(
    () =>
      createMeasuredRowUnitEstimator(
        meiloonTemplateRows,
        rowMeasurements.meiloonRowHeights,
        meiloonBaseRowHeight,
        estimateMeiloonTemplateRowUnits
      ),
    [meiloonBaseRowHeight, meiloonTemplateRows, rowMeasurements.meiloonRowHeights]
  );
  const templatePages = useMemo(
    () =>
      paginateRowsByCapacity(
        templateRows,
        rowsPerPage,
        rowsPerPage,
        templateRowUnitEstimator,
        createEmptyTemplateRow
      ),
    [rowsPerPage, templateRowUnitEstimator, templateRows]
  );
  const meiloonTemplatePages = useMemo(
    () =>
      paginateRowsByCapacity(
        meiloonTemplateRows,
        rowsPerPage,
        rowsPerPage,
        meiloonRowUnitEstimator,
        createEmptyMeiloonTemplateRow
      ),
    [meiloonRowUnitEstimator, meiloonTemplateRows, rowsPerPage]
  );
  const handleMeasureRows = useCallback((nextMeasurements: SuratJalanRowMeasurements) => {
    setRowMeasurements((currentMeasurements) => {
      const isSameTemplateMeasurements = areMeasurementsEqual(
        currentMeasurements.templateRowHeights,
        nextMeasurements.templateRowHeights
      );
      const isSameMeiloonMeasurements = areMeasurementsEqual(
        currentMeasurements.meiloonRowHeights,
        nextMeasurements.meiloonRowHeights
      );

      if (isSameTemplateMeasurements && isSameMeiloonMeasurements) {
        return currentMeasurements;
      }

      return nextMeasurements;
    });
  }, []);
  const paginationMeasure = (
    <SuratJalanPaginationMeasure
      templateRows={templateRows}
      meiloonRows={meiloonTemplateRows}
      pageWidth={pageWidth}
      meiloonColumnWidths={meiloonColumnWidths}
      defaultColumnWidths={defaultColumnWidths}
      meiloonRowHeightClass={meiloonRowHeightClass}
      defaultRowHeightClass={defaultRowHeightClass}
      onMeasure={handleMeasureRows}
    />
  );
  const templateDate = useMemo(
    () => formatTemplateDate(suratJalan.tanggal || "", locale),
    [locale, suratJalan.tanggal]
  );
  const rawCustomerName = useMemo(() => String(customer?.nama || "").trim(), [customer?.nama]);
  const rawCustomerAddress = useMemo(
    () => String(customer?.alamat || "").trim(),
    [customer?.alamat]
  );
  const rawCustomerAttn = useMemo(
    () => String(customer?.atasNama || "").trim(),
    [customer?.atasNama]
  );
  const customerName = useMemo(() => toUpperText(customer?.nama || ""), [customer?.nama]);
  const rawCustomerNameFontSize = useMemo(
    () => getSingleLineCustomerNameFontSize(rawCustomerName || meiloonCustomerName),
    [rawCustomerName]
  );
  const customerNameFontSize = useMemo(
    () => getSingleLineCustomerNameFontSize(customerName || "-"),
    [customerName]
  );
  const customerAddress = useMemo(() => toUpperText(customer?.alamat || ""), [customer?.alamat]);
  const customerAttn = useMemo(() => toUpperText(customer?.atasNama || ""), [customer?.atasNama]);
  const kendaraan = useMemo(
    () => formatExportKendaraan(suratJalan.kendaraan || ""),
    [suratJalan.kendaraan]
  );
  const isMeiloonCustomer = useMemo(
    () => normalizeCustomerName(customer?.nama || "") === meiloonCustomerName,
    [customer?.nama]
  );

  if (isMeiloonCustomer) {
    return (
      <>
        {paginationMeasure}
        {meiloonTemplatePages.map((pageRows, pageIndex) => (
      <section
        key={`meiloon-page-${pageIndex}`}
        className={`surat-jalan-print-page mx-auto w-full max-w-[24cm] bg-white text-black shadow-xl print:max-w-none print:overflow-hidden print:shadow-none ${
          pageIndex < meiloonTemplatePages.length - 1
            ? "mb-4 print:mb-0 print:break-after-page"
            : ""
        } ${className}`.trim()}
        style={printPageStyle}
      >
        <div
          className="flex flex-col px-[5mm] py-[4mm] text-[15px] leading-[1.18] tracking-[0.05em]"
          style={{ height: pageHeight }}
        >
          <div className="grid grid-cols-[1fr_1.05fr] gap-4 pt-1">
            <div className="px-1 py-0.5">
              <p className="text-[20px] leading-tight">{companyProfile.name}</p>
              {companyProfile.addressLines.map((line) => (
                <p key={line} className="text-[15px] leading-[1.18]">
                  {line}
                </p>
              ))}
            </div>

            <div className="border-2 border-black px-2 py-1">
              <p className="text-[15px] italic leading-tight">{t("suratJalan.export.kepadaLabel")}</p>
              <p
                className="whitespace-nowrap leading-tight"
                style={{ fontSize: rawCustomerNameFontSize }}
              >
                {rawCustomerName || meiloonCustomerName}
              </p>
              <p className="whitespace-pre-line text-[15px] leading-[1.12]">
                {rawCustomerAddress || customerAddress || "-"}
              </p>
              <p className="mt-0.5 text-[15px] leading-tight">
                {t("suratJalan.export.attnLabel")} : {rawCustomerAttn || customerAttn || "-"}
              </p>
            </div>
          </div>

          <div className="mt-1 flex items-end justify-between gap-4 text-[15px] leading-tight">
            <div className="grid grid-cols-[82px_8px_1fr] gap-x-1">
              <span>{t("suratJalan.export.meiloon.noSjLabel")}</span>
              <span>:</span>
              <span>{suratJalan.noSuratJalan || "-"}</span>
            </div>
            <div className="grid grid-cols-[72px_8px_1fr] gap-x-1">
              <span>{t("suratJalan.export.noPoLabel")}</span>
              <span>:</span>
              <span>{suratJalan.noPo || "-"}</span>
            </div>
            <div className="grid grid-cols-[84px_8px_1fr] gap-x-1">
              <span>{t("suratJalan.export.tanggalLabel")}</span>
              <span>:</span>
              <span>{templateDate}</span>
            </div>
          </div>

          <p className="mt-1 text-[15px] leading-tight">
            {t("suratJalan.export.deliverySentenceStart")}{" "}
            <span className="">{kendaraan || "-"}</span>
          </p>

          <div className="mt-1 border-2 border-black [&_td]:py-[2px] [&_th]:py-[2px]">
            <table className="w-full border-collapse table-fixed">
              <colgroup>
                <col style={{ width: meiloonColumnWidths.no }} />
                <col style={{ width: meiloonColumnWidths.namaBarang }} />
                <col style={{ width: meiloonColumnWidths.spesifikasi }} />
                <col style={{ width: meiloonColumnWidths.qty }} />
                <col style={{ width: meiloonColumnWidths.unit }} />
                <col style={{ width: meiloonColumnWidths.kodeDepartemen }} />
                <col style={{ width: meiloonColumnWidths.ttdPenerima }} />
                <col style={{ width: meiloonColumnWidths.note }} />
              </colgroup>
              <thead>
                <tr className="border-b-2 border-black">
                  <th className="border-r border-black px-1 text-center text-[15px]">
                    {t("suratJalan.export.table.no")}
                  </th>
                  <th className="border-r border-black px-1 text-center text-[15px]">
                    {t("suratJalan.export.table.namaBarang")}
                  </th>
                  <th className="border-r border-black px-1 text-center text-[15px]">
                    {t("suratJalan.export.meiloon.table.spesifikasi")}
                  </th>
                  <th className="border-r border-black px-1 text-center text-[15px] leading-tight">
                    {t("suratJalan.export.meiloon.table.qty")}
                  </th>
                  <th className="border-r border-black px-1 text-center text-[15px]">
                    {t("suratJalan.export.meiloon.table.unit")}
                  </th>
                  <th className="border-r border-black px-1 text-center text-[15px] leading-tight">
                    {t("suratJalan.export.meiloon.table.kodeDepartemen")}
                  </th>
                  <th className="border-r border-black px-1 text-center text-[15px] leading-tight">
                    {t("suratJalan.export.meiloon.table.ttdPenerima")}
                  </th>
                  <th className="px-1 text-center text-[15px] leading-tight">
                    {t("suratJalan.export.meiloon.table.note")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((row, index) => (
                  <tr
                    key={`meiloon-template-row-${index}`}
                    className={`${meiloonRowHeightClass} border-b border-black last:border-b-0`}
                  >
                    <td className="border-r border-black px-1 text-center align-middle text-[15px]">{row.no}</td>
                    <td className="whitespace-normal break-words border-r border-black px-1.5 align-middle text-[15px] leading-[1.15]">
                      {row.namaBarang}
                    </td>
                    <td className="border-r border-black px-1.5 align-middle whitespace-pre-line text-[15px] leading-[1.15]">
                      {row.spesifikasi}
                    </td>
                    <td className="border-r border-black px-1 text-center align-middle text-[15px]">{row.qty}</td>
                    <td className="border-r border-black px-1 text-center align-middle text-[15px]">{row.unit}</td>
                    <td className="border-r border-black px-1 text-center align-middle text-[15px]">{row.kodeDepartemen}</td>
                    <td className="border-r border-black px-1 text-center align-middle text-[15px]">{row.ttdPenerima}</td>
                    <td className="px-1 text-center align-middle text-[15px]">{row.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <footer className="mt-auto shrink-0 pt-1">
            <p className="text-[15px] leading-tight">{t("suratJalan.export.returnPolicy")}</p>

            <div className="mt-0.5 grid grid-cols-3 gap-8 text-center">
              <div>
                <p className="text-[15px]">{t("suratJalan.export.signature.receiver")}</p>
                <div className="mt-[58px] mx-auto w-[105px] border-t-[1.5px] border-black" />
              </div>
              <div>
                <p className="text-[15px]">{t("suratJalan.export.signature.sender")}</p>
                <div className="mt-[58px] mx-auto w-[105px] border-t-[1.5px] border-black" />
              </div>
              <div>
                <p className="text-[15px]">{t("suratJalan.export.signature.regards")}</p>
                <div className="mt-[58px] mx-auto w-[115px] border-t-[1.5px] border-black" />
              </div>
            </div>
          </footer>
        </div>
      </section>
        ))}
      </>
    );
  }

  return (
    <>
      {paginationMeasure}
      {templatePages.map((pageRows, pageIndex) => (
    <section
      key={`default-page-${pageIndex}`}
      className={`surat-jalan-print-page mx-auto w-full max-w-[24cm] bg-white text-black shadow-xl print:max-w-none print:overflow-hidden print:shadow-none ${
        pageIndex < templatePages.length - 1
          ? "mb-4 print:mb-0 print:break-after-page"
          : ""
      } ${className}`.trim()}
      style={printPageStyle}
    >
      <div
        className="flex flex-col px-[5mm] py-[4mm] text-[15px] leading-[1.18] tracking-[0.05em]"
        style={{ height: pageHeight }}
      >
        <div className="grid grid-cols-[0.98fr_1.02fr] gap-5">
          <div className="pt-1">
            <p className="text-[20px] leading-tight">{companyProfile.name}</p>
            {companyProfile.addressLines.map((line) => (
              <p key={line} className="text-[15px] leading-[1.18]">
                {line}
              </p>
            ))}

            <div className="mt-3 grid w-full grid-cols-[150px_8px_1fr] gap-x-1 text-[15px] leading-tight">
              <span className="whitespace-nowrap">{t("suratJalan.export.noSuratJalanLabel")}</span>
              <span>:</span>
              <span className="whitespace-nowrap">{suratJalan.noSuratJalan || "-"}</span>
              <span className="whitespace-nowrap">{t("suratJalan.export.noPoLabel")}</span>
              <span>:</span>
              <span className="whitespace-nowrap">{suratJalan.noPo || "-"}</span>
            </div>
          </div>

          <div className="pt-1">
            <div className="grid grid-cols-[84px_8px_1fr] text-[15px] leading-tight">
              <span>{t("suratJalan.export.tanggalLabel")}</span>
              <span>:</span>
              <span>{templateDate}</span>
            </div>

            <div className="mt-1 min-h-[82px] border-2 border-black px-2.5 py-1.5">
              <p className="text-[15px] italic leading-tight">{t("suratJalan.export.kepadaLabel")}</p>
              <p
                className="whitespace-nowrap leading-tight"
                style={{ fontSize: customerNameFontSize }}
              >
                {customerName || "-"}
              </p>
              <p className="whitespace-pre-line text-[15px] leading-[1.12]">{customerAddress || "-"}</p>
              <p className="mt-0.5 text-[15px] leading-tight">
                {t("suratJalan.export.attnLabel")}: {customerAttn || "-"}
              </p>
            </div>
          </div>
        </div>

        <p className="mt-3 text-[15px] leading-tight">
          {t("suratJalan.export.deliverySentenceStart")}{" "}
          <span className="">{kendaraan || "-"}</span>
        </p>

        <div className="mt-1 border-2 border-black [&_td]:py-[2px] [&_th]:py-[2px]">
          <table className="w-full border-collapse table-fixed">
            <colgroup>
              <col style={{ width: defaultColumnWidths.no }} />
              <col />
              <col style={{ width: defaultColumnWidths.jumlah }} />
            </colgroup>
            <thead>
              <tr className="border-b-2 border-black">
                <th className="border-r border-black px-1 text-center text-[15px]">
                  {t("suratJalan.export.table.no")}
                </th>
                <th className="border-r border-black px-1 text-center text-[15px]">
                  {t("suratJalan.export.table.namaBarang")}
                </th>
                <th className="px-1 text-center text-[15px]">
                  {t("suratJalan.export.table.jumlah")}
                </th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((row, index) => (
                <tr
                  key={`template-row-${index}`}
                  className={`${defaultRowHeightClass} border-b border-black last:border-b-0`}
                >
                  <td className="border-r border-black px-1 text-center align-middle text-[15px]">{row.no}</td>
                  <td className="border-r border-black px-2 align-middle text-[15px]">
                    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
                      <span className="whitespace-normal break-words leading-[1.15]">
                        {row.namaBarang}
                      </span>
                      <span className="shrink-0">{row.kodeDepartemen}</span>
                    </div>
                  </td>
                  <td className="px-2 text-center align-middle text-[15px]">{row.jumlah}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <footer className="mt-auto shrink-0 pt-1">
          <p className="text-[15px] leading-tight">{t("suratJalan.export.returnPolicy")}</p>

          <div className="mt-0.5 grid grid-cols-3 gap-8 text-center">
            <div>
              <p className="text-[15px]">{t("suratJalan.export.signature.receiver")}</p>
              <div className="mt-[58px] mx-auto w-[105px] border-t-[1.5px] border-black" />
            </div>
            <div>
              <p className="text-[15px]">{t("suratJalan.export.signature.sender")}</p>
              <div className="mt-[58px] mx-auto w-[105px] border-t-[1.5px] border-black" />
            </div>
            <div>
              <p className="text-[15px]">{t("suratJalan.export.signature.regards")}</p>
              <div className="mt-[58px] mx-auto w-[115px] border-t-[1.5px] border-black" />
            </div>
          </div>
        </footer>
      </div>
    </section>
      ))}
    </>
  );
}

