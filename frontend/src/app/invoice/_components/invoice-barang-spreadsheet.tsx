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
import { createSpreadsheetController, type SpreadsheetController } from "../../_lib/spreadsheet-controller";
import { SpreadsheetFrame } from "../../_components/spreadsheet-frame";
import { useI18n } from "../../_i18n/provider";
import { decodeHtmlEntities } from "../../_lib/html-entities";

type InvoiceBarangSpreadsheetProps = {
  rows: InvoiceBarangFormRow[];
  disabled?: boolean;
  onRowsChange: (rows: InvoiceBarangFormRow[]) => void;
};

type SpreadsheetData = jspreadsheet.CellValue[][];

const columnCount = 8;

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
    .map((value) => decodeHtmlEntities(value).trim().toLowerCase().replace(/\s+/g, " "))
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

  return normalizedRows.map((row, index) => {
    const jumlah = parseNumber(row.kuantitas) * parseNumber(row.hargaSatuan);

    return [
      row.urutan || String(index + 1),
      spreadsheetNoPoLabel(row),
      row.namaBarang,
      row.spesifikasi,
      row.kuantitas,
      row.unit,
      row.hargaSatuan,
      formatRupiah(jumlah, locale),
    ];
  });
}

function spreadsheetDataToRows(data: SpreadsheetData, previousRows: InvoiceBarangFormRow[]) {
  const sourceQueue = buildSourceQueue(previousRows);
  const nextRows = data.map((row) => {
    const [urutan, noPoManual, namaBarang, spesifikasi, kuantitas, unit, hargaSatuan] = normalizeSpreadsheetRow(row);
    const nextRow: InvoiceBarangFormRow = {
      urutan: normalizeNumericCell(urutan),
      noPoManual: normalizeNoPoCell(noPoManual),
      namaBarang: decodeHtmlEntities(namaBarang),
      spesifikasi: decodeHtmlEntities(spesifikasi),
      kuantitas: normalizeNumericCell(kuantitas),
      unit: decodeHtmlEntities(unit),
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

export function InvoiceBarangSpreadsheet({
  rows,
  disabled = false,
  onRowsChange,
}: InvoiceBarangSpreadsheetProps) {
  const { locale, t } = useI18n();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const controllerRef = useRef<SpreadsheetController<InvoiceBarangFormRow> | null>(null);
  const onRowsChangeRef = useRef(onRowsChange);
  const rowsRef = useRef(rows);

  useEffect(() => {
    onRowsChangeRef.current = onRowsChange;
  }, [onRowsChange]);

  useEffect(() => {
    rowsRef.current = rows;
  }, [rows]);

  const columns = useMemo<NonNullable<jspreadsheet.WorksheetOptions["columns"]>>(
    () => [
      {
        title: t("field.no"),
        type: "numeric",
        width: 70,
      },
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
        type: "numeric",
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

      const applyRowsFromWorksheet = (
        instance: jspreadsheet.WorksheetInstance,
        previousRows: InvoiceBarangFormRow[]
      ) => {
        if (isApplyingDataRef.current) {
          return;
        }

        const nextData = instance.getData(false, true);
        const nextRows = spreadsheetDataToRows(nextData, previousRows);
        currentDataRef.current = serializeData(nextData);
        rowsRef.current = nextRows;
        onRowsChangeRef.current(nextRows);
      };

      const syncRowsFromWorksheet = (instance: jspreadsheet.WorksheetInstance) => {
        applyRowsFromWorksheet(instance, rowsRef.current);
      };

      currentDataRef.current = serializeData(initialData);
      isApplyingDataRef.current = true;
      const controller = createSpreadsheetController({
        root: rootElement,
        rows: rowsRef.current,
        toData: (nextRows: InvoiceBarangFormRow[]) => rowsToSpreadsheetData(nextRows, locale),
        fromData: spreadsheetDataToRows,
        onRowsChange: (nextRows) => { rowsRef.current = nextRows; onRowsChangeRef.current(nextRows); },
        t,
      });

      const instances = jspreadsheetFactory(rootRef.current, {
        onafterchanges: controller.capture,
        oninsertrow: controller.capture,
        ondeleterow: controller.capture,
        contextMenu: controller.contextMenu,
        worksheets: [
          {
            worksheetName: t("invoice.form.items.title"),
            data: initialData,
            columns,
            editable: !disabled,
            allowDeleteColumn: false,
            allowInsertColumn: false,
            allowInsertRow: !disabled,
            allowDeleteRow: !disabled,
            allowManualInsertColumn: false,
            allowManualInsertRow: !disabled,
            allowRenameColumn: false,
            columnDrag: false,
            columnSorting: false,
            rowDrag: false,
            tableOverflow: true,
            tableWidth: "100%",
            minDimensions: [columnCount, 2],
          },
        ],
      });

      controllerRef.current = controller;
      if (instances[0]) controller.attach(instances[0]);
      destroySpreadsheet = () => {
        controller.destroy();
        jspreadsheetFactory.destroy(rootElement as jspreadsheet.JspreadsheetInstanceElement, true);
      };
    });

    return () => {
      isMounted = false;
      destroySpreadsheet?.();

      if (rootElement) {
        rootElement.innerHTML = "";
      }

      controllerRef.current = null;
    };
  }, [columns, disabled, locale, t]);

  useEffect(() => {
    controllerRef.current?.replaceRows(rows);
  }, [locale, rows]);

  return (
    <SpreadsheetFrame disabled={disabled} actionsRef={controllerRef}>
      <div className="app-spreadsheet" ref={rootRef} />
    </SpreadsheetFrame>
  );
}
