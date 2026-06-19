import type jspreadsheet from "jspreadsheet-ce";

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

function escapeExcelXml(value: JspreadsheetExportCellValue) {
  return String(normalizeCellValue(value))
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

function toExcelCell(value: JspreadsheetExportCellValue, columnIndex: number, rowIndex: number) {
  const cellReference = `${toExcelColumnName(columnIndex)}${rowIndex + 1}`;
  const normalizedValue = normalizeCellValue(value);

  if (typeof normalizedValue === "number" && Number.isFinite(normalizedValue)) {
    return `<c r="${cellReference}"><v>${normalizedValue}</v></c>`;
  }

  return `<c r="${cellReference}" t="inlineStr"><is><t>${escapeExcelXml(normalizedValue)}</t></is></c>`;
}

function toExcelRows(rows: JspreadsheetExportCellValue[][]) {
  return rows
    .map(
      (row, rowIndex) =>
        `<row r="${rowIndex + 1}">${row
          .map((value, columnIndex) => toExcelCell(value, columnIndex, rowIndex))
          .join("")}</row>`
    )
    .join("");
}

function toExcelColumnsXml(rows: JspreadsheetExportCellValue[][]) {
  const widths = getColumnWidths(rows);

  if (!widths.length) {
    return "";
  }

  return `<cols>${widths
    .map(
      (width, index) =>
        `<col min="${index + 1}" max="${index + 1}" width="${width.wch}" customWidth="1"/>`
    )
    .join("")}</cols>`;
}

function toExcelWorksheetXml(rows: JspreadsheetExportCellValue[][]) {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  ${toExcelColumnsXml(rows)}
  <sheetData>${toExcelRows(rows)}</sheetData>
</worksheet>`;
}

function createExcelStylesXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="1">
    <font><sz val="11"/><color rgb="FF0F172A"/><name val="Calibri"/><family val="2"/></font>
  </fonts>
  <fills count="2">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
  </fills>
  <borders count="1">
    <border><left/><right/><top/><bottom/><diagonal/></border>
  </borders>
  <cellStyleXfs count="1">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0"/>
  </cellStyleXfs>
  <cellXfs count="1">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
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

function createExcelWorkbookBlob(worksheets: JspreadsheetExportWorksheet[]) {
  const normalizedWorksheets = worksheets.map((worksheet) => {
    const jsWorksheet = toJspreadsheetWorksheetOptions(worksheet);
    const headers = jsWorksheet.columns.map((column) => column.title || "");

    return {
      name: jsWorksheet.worksheetName,
      rows: [headers, ...jsWorksheet.data],
    };
  });
  const files = [
    {
      path: "[Content_Types].xml",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
  ${normalizedWorksheets
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
    ${normalizedWorksheets
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
  ${normalizedWorksheets
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
    ...normalizedWorksheets.map((worksheet, index) => ({
      path: `xl/worksheets/sheet${index + 1}.xml`,
      content: toExcelWorksheetXml(worksheet.rows),
    })),
  ];

  return new Blob([createStoredZip(files)], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

export function downloadJspreadsheetXlsxFile(fileName: string, worksheets: JspreadsheetExportWorksheet[]) {
  const sanitizedName = sanitizeExcelFileName(fileName.replace(/\.xlsx$/i, ""));
  const blob = createExcelWorkbookBlob(worksheets);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `${sanitizedName}.xlsx`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
