"use client";

import { useEffect, useMemo, useRef } from "react";
import type jspreadsheet from "jspreadsheet-ce";
import {
  createEmptyInvoiceBarangRow,
  ensureTrailingEmptyInvoiceBarangRow,
  formatRupiah,
  invoiceBarangNoPoLabel,
  type InvoiceBarangFormRow,
  type InvoiceBarangSource,
} from "../_lib/invoice";
import { useI18n } from "../../_i18n/provider";

type InvoiceBarangSpreadsheetProps = {
  rows: InvoiceBarangFormRow[];
  disabled?: boolean;
  onRowsChange: (rows: InvoiceBarangFormRow[]) => void;
};

type SpreadsheetData = jspreadsheet.CellValue[][];

const columnCount = 7;

function toCellText(value: unknown) {
  return String(value ?? "");
}

function normalizeSpreadsheetRow(row: jspreadsheet.CellValue[] = []) {
  return Array.from({ length: columnCount }, (_, index) => toCellText(row[index]));
}

function normalizeNumericText(value: string) {
  const text = value.replace(/rp\.?/gi, "").replace(/\s+/g, "").trim();

  if (!text) {
    return "";
  }

  const idThousandsPattern = /^-?\d{1,3}(\.\d{3})+(,\d+)?$/;
  const enThousandsPattern = /^-?\d{1,3}(,\d{3})+(\.\d+)?$/;
  const decimalCommaPattern = /^-?\d+,\d+$/;

  if (idThousandsPattern.test(text)) {
    return text.replace(/\./g, "").replace(",", ".");
  }

  if (enThousandsPattern.test(text)) {
    return text.replace(/,/g, "");
  }

  if (decimalCommaPattern.test(text)) {
    return text.replace(",", ".");
  }

  return text.replace(/[^\d.-]/g, "");
}

function parseNumber(value: string) {
  const parsed = Number(normalizeNumericText(value));
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatRupiahCell(value: string | number, locale: "id" | "en") {
  const parsed = typeof value === "number" ? value : parseNumber(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return "";
  }

  const numberLocale = locale === "en" ? "en-US" : "id-ID";
  return `Rp. ${new Intl.NumberFormat(numberLocale, {
    maximumFractionDigits: 0,
  }).format(parsed)}`;
}

function normalizeNumericCell(value: string) {
  const normalized = normalizeNumericText(value);

  if (!normalized) {
    return "";
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? String(parsed) : "";
}

function normalizeNoPoCell(value: string) {
  const normalized = value.trim();
  return normalized === "-" ? "" : normalized;
}

function spreadsheetNoPoLabel(row: InvoiceBarangFormRow) {
  if (row.sources.length > 0) {
    return invoiceBarangNoPoLabel(row);
  }

  return normalizeNoPoCell(row.noPoManual);
}

function getInvoiceRowKey(row: InvoiceBarangFormRow) {
  return [
    spreadsheetNoPoLabel(row),
    row.namaBarang,
    row.spesifikasi,
    row.unit,
  ]
    .map((value) => String(value || "").trim().toLowerCase().replace(/\s+/g, " "))
    .join("::");
}

function buildSourceQueue(rows: InvoiceBarangFormRow[]) {
  const sourceQueue = new Map<string, InvoiceBarangSource[][]>();

  rows.forEach((row) => {
    if (row.sources.length === 0) {
      return;
    }

    const key = getInvoiceRowKey(row);
    const currentQueue = sourceQueue.get(key) || [];
    currentQueue.push(row.sources);
    sourceQueue.set(key, currentQueue);
  });

  return sourceQueue;
}

function resolveSources(
  sourceQueue: Map<string, InvoiceBarangSource[][]>,
  row: InvoiceBarangFormRow
) {
  const key = getInvoiceRowKey(row);
  const queue = sourceQueue.get(key);

  if (!queue || queue.length === 0) {
    return [];
  }

  return queue.shift() || [];
}

function rowsToSpreadsheetData(rows: InvoiceBarangFormRow[], locale: "id" | "en"): SpreadsheetData {
  const normalizedRows = ensureTrailingEmptyInvoiceBarangRow(rows);

  return normalizedRows.map((row) => {
    const jumlah = parseNumber(row.kuantitas) * parseNumber(row.hargaSatuan);

    return [
      spreadsheetNoPoLabel(row),
      row.namaBarang,
      row.spesifikasi,
      row.kuantitas,
      row.unit,
      formatRupiahCell(row.hargaSatuan, locale),
      formatRupiah(jumlah, locale),
    ];
  });
}

function spreadsheetDataToRows(data: SpreadsheetData, previousRows: InvoiceBarangFormRow[]) {
  const sourceQueue = buildSourceQueue(previousRows);
  const nextRows = data.map((row) => {
    const [noPoManual, namaBarang, spesifikasi, kuantitas, unit, hargaSatuan] = normalizeSpreadsheetRow(row);
    const nextRow: InvoiceBarangFormRow = {
      noPoManual: normalizeNoPoCell(noPoManual),
      namaBarang,
      spesifikasi,
      kuantitas: normalizeNumericCell(kuantitas),
      unit,
      hargaSatuan: normalizeNumericCell(hargaSatuan),
      sources: [],
    };

    return {
      ...nextRow,
      sources: resolveSources(sourceQueue, nextRow),
    };
  });

  return ensureTrailingEmptyInvoiceBarangRow(nextRows.length > 0 ? nextRows : [createEmptyInvoiceBarangRow()]);
}

function serializeData(data: SpreadsheetData) {
  return JSON.stringify(data.map(normalizeSpreadsheetRow));
}

export function InvoiceBarangSpreadsheet({
  rows,
  disabled = false,
  onRowsChange,
}: InvoiceBarangSpreadsheetProps) {
  const { locale, t } = useI18n();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const worksheetRef = useRef<jspreadsheet.WorksheetInstance | null>(null);
  const isApplyingDataRef = useRef(false);
  const onRowsChangeRef = useRef(onRowsChange);
  const rowsRef = useRef(rows);
  const currentDataRef = useRef("");

  useEffect(() => {
    onRowsChangeRef.current = onRowsChange;
  }, [onRowsChange]);

  useEffect(() => {
    rowsRef.current = rows;
  }, [rows]);

  const columns = useMemo<NonNullable<jspreadsheet.WorksheetOptions["columns"]>>(
    () => [
      {
        title: t("field.noPo"),
        type: "text",
        width: 150,
      },
      {
        title: t("field.namaBarang"),
        type: "text",
        width: 260,
      },
      {
        title: t("field.spesifikasi"),
        type: "text",
        width: 320,
      },
      {
        title: t("invoice.excel.column.qty"),
        type: "numeric",
        width: 95,
      },
      {
        title: t("field.unit"),
        type: "text",
        width: 110,
      },
      {
        title: t("invoice.excel.column.hargaSatuan"),
        type: "text",
        width: 150,
      },
      {
        title: t("invoice.excel.column.hargaTotal"),
        type: "text",
        readOnly: true,
        width: 150,
      },
    ],
    [t]
  );

  useEffect(() => {
    let isMounted = true;
    const rootElement = rootRef.current;
    let destroySpreadsheet: (() => void) | null = null;

    if (!rootElement) {
      return;
    }

    rootElement.innerHTML = "";

    void import("jspreadsheet-ce").then((module) => {
      if (!isMounted || !rootRef.current) {
        return;
      }

      const jspreadsheetFactory =
        (module as unknown as { default?: jspreadsheet.JSpreadsheet }).default ||
        (module as unknown as jspreadsheet.JSpreadsheet);
      const initialData = rowsToSpreadsheetData(rowsRef.current, locale);

      const syncRowsFromWorksheet = (instance: jspreadsheet.WorksheetInstance) => {
        if (isApplyingDataRef.current) {
          return;
        }

        const nextData = instance.getData(false, true);
        currentDataRef.current = serializeData(nextData);
        onRowsChangeRef.current(spreadsheetDataToRows(nextData, rowsRef.current));
      };

      currentDataRef.current = serializeData(initialData);
      isApplyingDataRef.current = true;
      const instances = jspreadsheetFactory(rootRef.current, {
        onafterchanges: syncRowsFromWorksheet,
        oninsertrow: syncRowsFromWorksheet,
        ondeleterow: syncRowsFromWorksheet,
        worksheets: [
          {
            worksheetName: t("invoice.form.items.title"),
            data: initialData,
            columns,
            editable: !disabled,
            allowDeleteColumn: false,
            allowInsertColumn: false,
            allowInsertRow: false,
            allowManualInsertColumn: false,
            allowManualInsertRow: false,
            allowRenameColumn: false,
            columnDrag: false,
            columnSorting: false,
            tableOverflow: true,
            tableWidth: "100%",
            minDimensions: [columnCount, 2],
          },
        ],
      });

      worksheetRef.current = instances[0] || null;
      destroySpreadsheet = () =>
        jspreadsheetFactory.destroy(rootElement as jspreadsheet.JspreadsheetInstanceElement, true);
      window.requestAnimationFrame(() => {
        isApplyingDataRef.current = false;
      });
    });

    return () => {
      isMounted = false;
      isApplyingDataRef.current = false;
      destroySpreadsheet?.();

      if (rootElement) {
        rootElement.innerHTML = "";
      }

      worksheetRef.current = null;
    };
  }, [columns, disabled, locale, t]);

  useEffect(() => {
    const worksheet = worksheetRef.current;

    if (!worksheet) {
      return;
    }

    const nextData = rowsToSpreadsheetData(rows, locale);
    const serializedNextData = serializeData(nextData);

    if (serializedNextData === currentDataRef.current) {
      return;
    }

    isApplyingDataRef.current = true;
    currentDataRef.current = serializedNextData;
    worksheet.setData(nextData);
    window.requestAnimationFrame(() => {
      isApplyingDataRef.current = false;
    });
  }, [locale, rows]);

  return (
    <div
      className={`surat-jalan-barang-spreadsheet mt-2 overflow-hidden rounded-lg border border-sky-200 bg-white text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 ${
        disabled ? "pointer-events-none opacity-70" : ""
      }`}
    >
      <div ref={rootRef} />
    </div>
  );
}
