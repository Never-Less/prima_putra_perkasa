"use client";

import { useEffect, useMemo, useRef } from "react";
import type jspreadsheet from "jspreadsheet-ce";
import { createSpreadsheetController, type SpreadsheetController } from "../../_lib/spreadsheet-controller";
import { SpreadsheetFrame } from "../../_components/spreadsheet-frame";
import { useI18n } from "../../_i18n/provider";
import {
  createEmptyPurchaseOrderBarangRow,
  ensureTrailingEmptyPurchaseOrderBarangRow,
  formatRupiah,
  type PurchaseOrderBarangFormRow,
} from "../_lib/purchase-order";

type PurchaseOrderBarangSpreadsheetProps = {
  rows: PurchaseOrderBarangFormRow[];
  disabled?: boolean;
  onRowsChange: (rows: PurchaseOrderBarangFormRow[]) => void;
};

type SpreadsheetData = jspreadsheet.CellValue[][];

const columnCount = 6;

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

function rowsToSpreadsheetData(
  rows: PurchaseOrderBarangFormRow[],
  locale: "id" | "en"
): SpreadsheetData {
  const normalizedRows = ensureTrailingEmptyPurchaseOrderBarangRow(rows);

  return normalizedRows.map((row) => {
    const jumlah = parseNumber(row.kuantitas) * parseNumber(row.hargaSatuan);

    return [
      row.namaBarang,
      row.spesifikasi,
      row.kuantitas,
      row.unit,
      row.hargaSatuan,
      formatRupiah(jumlah, locale),
    ];
  });
}

function spreadsheetDataToRows(data: SpreadsheetData) {
  const nextRows = data.map((row) => {
    const [namaBarang, spesifikasi, kuantitas, unit, hargaSatuan] =
      normalizeSpreadsheetRow(row);

    return {
      namaBarang,
      spesifikasi,
      kuantitas: normalizeNumericCell(kuantitas),
      unit,
      hargaSatuan: normalizeNumericCell(hargaSatuan),
    };
  });

  return ensureTrailingEmptyPurchaseOrderBarangRow(
    nextRows.length > 0 ? nextRows : [createEmptyPurchaseOrderBarangRow()]
  );
}

export function PurchaseOrderBarangSpreadsheet({
  rows,
  disabled = false,
  onRowsChange,
}: PurchaseOrderBarangSpreadsheetProps) {
  const { locale, t } = useI18n();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const controllerRef = useRef<SpreadsheetController<PurchaseOrderBarangFormRow> | null>(null);
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
        title: t("field.namaBarang"),
        type: "text",
        width: 300,
      },
      {
        title: t("field.spesifikasi"),
        type: "text",
        width: 340,
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
        width: 155,
      },
      {
        title: t("invoice.excel.column.hargaTotal"),
        type: "text",
        readOnly: true,
        width: 155,
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

      const controller = createSpreadsheetController({
        root: rootElement,
        rows: rowsRef.current,
        toData: (nextRows: PurchaseOrderBarangFormRow[]) => rowsToSpreadsheetData(nextRows, locale),
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
            worksheetName: t("purchaseOrder.form.items.title"),
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
