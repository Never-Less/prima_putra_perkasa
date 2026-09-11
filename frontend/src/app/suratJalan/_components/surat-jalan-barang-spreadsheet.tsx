"use client";

import { useEffect, useMemo, useRef } from "react";
import type jspreadsheet from "jspreadsheet-ce";
import {
  createEmptyBarangRow,
  ensureTrailingEmptyBarangRow,
  type SuratJalanBarangFormRow,
} from "../_lib/surat-jalan";
import { SpreadsheetFrame } from "../../_components/spreadsheet-frame";
import { useI18n } from "../../_i18n/provider";

type SuratJalanBarangSpreadsheetProps = {
  rows: SuratJalanBarangFormRow[];
  disabled?: boolean;
  onRowsChange: (rows: SuratJalanBarangFormRow[]) => void;
};

type SpreadsheetData = jspreadsheet.CellValue[][];

const columnCount = 6;

function toCellText(value: unknown) {
  return String(value ?? "");
}

function normalizeSpreadsheetRow(row: jspreadsheet.CellValue[] = []) {
  return Array.from({ length: columnCount }, (_, index) => toCellText(row[index]));
}

function rowsToSpreadsheetData(rows: SuratJalanBarangFormRow[]): SpreadsheetData {
  const normalizedRows = ensureTrailingEmptyBarangRow(rows);

  return normalizedRows.map((row, index) => [
    row.urutan || String(index + 1),
    row.nama,
    row.spesifikasi,
    row.kodeDepartemen,
    row.jumlah,
    row.unit,
  ]);
}

function spreadsheetDataToRows(data: SpreadsheetData) {
  const nextRows = data.map((row) => {
    const [urutan, nama, spesifikasi, kodeDepartemen, jumlah, unit] = normalizeSpreadsheetRow(row);

    return {
      urutan,
      nama,
      spesifikasi,
      kodeDepartemen,
      jumlah,
      unit,
    };
  });

  return ensureTrailingEmptyBarangRow(nextRows.length > 0 ? nextRows : [createEmptyBarangRow()]);
}

function serializeData(data: SpreadsheetData) {
  return JSON.stringify(data.map(normalizeSpreadsheetRow));
}

export function SuratJalanBarangSpreadsheet({
  rows,
  disabled = false,
  onRowsChange,
}: SuratJalanBarangSpreadsheetProps) {
  const { t } = useI18n();
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
        title: t("field.no"),
        type: "numeric",
        width: 70,
      },
      {
        title: t("field.namaBarang"),
        type: "text",
        width: 240,
      },
      {
        title: t("field.spesifikasi"),
        type: "text",
        width: 320,
      },
      {
        title: t("field.kodeDepartemen"),
        type: "text",
        width: 150,
      },
      {
        title: t("field.jumlah"),
        type: "numeric",
        width: 110,
      },
      {
        title: t("field.unit"),
        type: "text",
        width: 130,
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
      const initialData = rowsToSpreadsheetData(rowsRef.current);

      const syncRowsFromWorksheet = (instance: jspreadsheet.WorksheetInstance) => {
        if (isApplyingDataRef.current) {
          return;
        }

        const nextData = instance.getData(false, true);
        const nextRows = spreadsheetDataToRows(nextData);
        currentDataRef.current = serializeData(nextData);
        rowsRef.current = nextRows;
        onRowsChangeRef.current(nextRows);
      };

      currentDataRef.current = serializeData(initialData);
      isApplyingDataRef.current = true;
      const instances = jspreadsheetFactory(rootRef.current, {
        onafterchanges: syncRowsFromWorksheet,
        oninsertrow: syncRowsFromWorksheet,
        ondeleterow: syncRowsFromWorksheet,
        worksheets: [
          {
            worksheetName: t("suratJalan.form.items.title"),
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
            rowDrag: false,
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
  }, [columns, disabled, t]);

  useEffect(() => {
    const worksheet = worksheetRef.current;

    if (!worksheet) {
      return;
    }

    const nextData = rowsToSpreadsheetData(rows);
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
  }, [rows]);

  return (
    <SpreadsheetFrame disabled={disabled}>
      <div className="app-spreadsheet" ref={rootRef} />
    </SpreadsheetFrame>
  );
}
