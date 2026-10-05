"use client";

import { useEffect, useMemo, useRef } from "react";
import type jspreadsheet from "jspreadsheet-ce";
import {
  createEmptyBarangRow,
  ensureTrailingEmptyBarangRow,
  type SuratJalanBarangFormRow,
} from "../_lib/surat-jalan";
import { createSpreadsheetController, type SpreadsheetController } from "../../_lib/spreadsheet-controller";
import { SpreadsheetFrame } from "../../_components/spreadsheet-frame";
import { useI18n } from "../../_i18n/provider";

type SuratJalanBarangSpreadsheetProps = {
  rows: SuratJalanBarangFormRow[];
  disabled?: boolean;
  onRowsChange: (rows: SuratJalanBarangFormRow[]) => void;
};

type SpreadsheetData = jspreadsheet.CellValue[][];

const columnCount = 5;

function toCellText(value: unknown) {
  return String(value ?? "");
}

function normalizeSpreadsheetRow(row: jspreadsheet.CellValue[] = []) {
  return Array.from({ length: columnCount }, (_, index) => toCellText(row[index]));
}

function rowsToSpreadsheetData(rows: SuratJalanBarangFormRow[]): SpreadsheetData {
  const normalizedRows = ensureTrailingEmptyBarangRow(rows);

  return normalizedRows.map((row) => [
    row.nama,
    row.spesifikasi,
    row.kodeDepartemen,
    row.jumlah,
    row.unit,
  ]);
}

function spreadsheetDataToRows(data: SpreadsheetData) {
  const nextRows = data.map((row) => {
    const [nama, spesifikasi, kodeDepartemen, jumlah, unit] = normalizeSpreadsheetRow(row);

    return {
      nama,
      spesifikasi,
      kodeDepartemen,
      jumlah,
      unit,
    };
  });

  return ensureTrailingEmptyBarangRow(nextRows.length > 0 ? nextRows : [createEmptyBarangRow()]);
}

export function SuratJalanBarangSpreadsheet({
  rows,
  disabled = false,
  onRowsChange,
}: SuratJalanBarangSpreadsheetProps) {
  const { t } = useI18n();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const controllerRef = useRef<SpreadsheetController<SuratJalanBarangFormRow> | null>(null);
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

      const controller = createSpreadsheetController({
        root: rootElement,
        rows: rowsRef.current,
        toData: (nextRows: SuratJalanBarangFormRow[]) => rowsToSpreadsheetData(nextRows),
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
            worksheetName: t("suratJalan.form.items.title"),
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
  }, [columns, disabled, t]);

  useEffect(() => {
    controllerRef.current?.replaceRows(rows);
  }, [rows]);

  return (
    <SpreadsheetFrame disabled={disabled} actionsRef={controllerRef}>
      <div className="app-spreadsheet" ref={rootRef} />
    </SpreadsheetFrame>
  );
}
