import type jspreadsheet from "jspreadsheet-ce";
import * as XLSX from "xlsx";

type JspreadsheetExportCellValue = jspreadsheet.CellValue | null | undefined;

export type JspreadsheetExportWorksheet = {
  name: string;
  rows: JspreadsheetExportCellValue[][];
};

type JspreadsheetExportColumn = NonNullable<jspreadsheet.WorksheetOptions["columns"]>[number];

type JspreadsheetExportOptions = {
  worksheetName: string;
  columns: JspreadsheetExportColumn[];
  data: JspreadsheetExportCellValue[][];
};

function sanitizeWorksheetName(value: string, fallback = "Sheet") {
  const name = String(value || fallback).replace(/[\\/?*[\]:]/g, " ").trim();
  return (name || fallback).slice(0, 31);
}

export function sanitizeExcelFileName(value: string, fallback = "export") {
  const fileName = String(value || "")
    .trim()
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return fileName || fallback;
}

function normalizeCellValue(value: JspreadsheetExportCellValue) {
  return value ?? "";
}

function toJspreadsheetWorksheetOptions(worksheet: JspreadsheetExportWorksheet): JspreadsheetExportOptions {
  const [headers = [], ...dataRows] = worksheet.rows;

  return {
    worksheetName: sanitizeWorksheetName(worksheet.name),
    columns: headers.map((header) => ({
      title: String(normalizeCellValue(header)),
      type: "text",
    })),
    data: dataRows.map((row) => row.map(normalizeCellValue)),
  };
}

function getColumnWidths(rows: JspreadsheetExportCellValue[][]) {
  const columnCount = rows.reduce((max, row) => Math.max(max, row.length), 0);

  return Array.from({ length: columnCount }, (_, columnIndex) => {
    const maxLength = rows.reduce((max, row) => {
      const length = String(normalizeCellValue(row[columnIndex])).length;
      return Math.max(max, length);
    }, 10);

    return { wch: Math.min(Math.max(maxLength + 2, 10), 48) };
  });
}

export function downloadJspreadsheetXlsxFile(fileName: string, worksheets: JspreadsheetExportWorksheet[]) {
  const workbook = XLSX.utils.book_new();

  worksheets.forEach((worksheet, index) => {
    const jsWorksheet = toJspreadsheetWorksheetOptions(worksheet);
    const headers = jsWorksheet.columns.map((column) => column.title || "");
    const dataRows = jsWorksheet.data;
    const rows = [headers, ...dataRows];
    const sheet = XLSX.utils.aoa_to_sheet(rows);

    sheet["!cols"] = getColumnWidths(rows);
    XLSX.utils.book_append_sheet(
      workbook,
      sheet,
      jsWorksheet.worksheetName || `Sheet${index + 1}`
    );
  });

  const sanitizedName = sanitizeExcelFileName(fileName.replace(/\.xlsx$/i, ""));
  XLSX.writeFile(workbook, `${sanitizedName}.xlsx`, {
    bookType: "xlsx",
    compression: true,
  });
}
