type ExcelHtmlCellValue = string | number | null | undefined;

export type ExcelHtmlWorksheet = {
  name: string;
  rows: ExcelHtmlCellValue[][];
};

function escapeExcelHtml(value: ExcelHtmlCellValue) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function sanitizeWorksheetName(value: string) {
  const name = String(value || "Sheet").replace(/[\\/?*[\]:]/g, " ").trim();
  return (name || "Sheet").slice(0, 31);
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

function toExcelHtmlCell(value: ExcelHtmlCellValue, isHeader = false) {
  const tagName = isHeader ? "th" : "td";
  const style =
    typeof value === "number"
      ? ' style="mso-number-format:\\"#,##0\\"; text-align: right;"'
      : "";

  return `<${tagName}${style}>${escapeExcelHtml(value)}</${tagName}>`;
}

function toExcelHtmlTable(worksheet: ExcelHtmlWorksheet) {
  return `
    <h2>${escapeExcelHtml(sanitizeWorksheetName(worksheet.name))}</h2>
    <table border="1">
      <tbody>
        ${worksheet.rows
          .map((row, rowIndex) => {
            const isHeader = rowIndex === 0;
            return `<tr>${row.map((cell) => toExcelHtmlCell(cell, isHeader)).join("")}</tr>`;
          })
          .join("")}
      </tbody>
    </table>
    <br />
  `;
}

export function downloadExcelHtmlFile(fileName: string, worksheets: ExcelHtmlWorksheet[]) {
  const content = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      body { font-family: Arial, sans-serif; }
      table { border-collapse: collapse; margin-bottom: 18px; }
      th { background: #e2e8f0; font-weight: 700; }
      th, td { border: 1px solid #64748b; padding: 6px 8px; vertical-align: top; }
      h2 { margin: 0 0 8px; }
    </style>
  </head>
  <body>
    ${worksheets.map((worksheet) => toExcelHtmlTable(worksheet)).join("")}
  </body>
</html>`;
  const blob = new Blob([content], {
    type: "application/vnd.ms-excel;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = sanitizeExcelFileName(fileName).endsWith(".xls")
    ? sanitizeExcelFileName(fileName)
    : `${sanitizeExcelFileName(fileName)}.xls`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
