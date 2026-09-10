"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, ClipboardList, Copy, Eraser, Keyboard, Loader2, Plus, RotateCcw, Save, Search, Send, TriangleAlert, X } from "lucide-react";
import { useI18n } from "../../_i18n/provider";
import jspreadsheet from "jspreadsheet-ce";
import "jsuites/dist/jsuites.css";
import "jspreadsheet-ce/dist/jspreadsheet.css";

import "./bulk-product-draft.css";
import apiClient, { addProductsBulk } from "../_lib/legacy-price-list-adapter";
import { PriceListImage } from "./price-list-image";

const columns = [
  { key: "no_so", label: "No. SO", type: "text", width: 90 },
  { key: "item_name", label: "Nama Barang", type: "text", width: 220 },
  { key: "specification", label: "Spesifikasi", type: "text", width: 220 },
  { key: "qty", label: "Qty", type: "number", width: 58 },
  { key: "unit", label: "Unit", type: "text", width: 64 },
  { key: "sell_price", label: "Harga Satuan", type: "currency", width: 112 },
  { key: "category", label: "Customer", type: "select", width: 150 },
  { key: "sell_date", label: "Tgl Jual", type: "date", width: 108 },
  { key: "source", label: "Source", type: "text", width: 140 },
  { key: "buy_date", label: "Tgl Beli", type: "date", width: 108 },
  { key: "buy_price", label: "Harga Beli", type: "currency", width: 112 },
  { key: "description", label: "Deskripsi", type: "text", width: 220 },
];

const getSpreadsheetColumnType = (columnType) => {
  if (columnType === "select") return "dropdown";
  if (columnType === "date") return "calendar";
  if (columnType === "number" || columnType === "currency") return "numeric";
  return "text";
};

const emptyRow = () =>
  columns.reduce((row, column) => ({ ...row, [column.key]: "" }), {});

const createRows = (count) => Array.from({ length: count }, emptyRow);

const rowsToSpreadsheetData = (rowsToConvert) =>
  rowsToConvert.map((row) => columns.map((column) => row[column.key] ?? ""));

const spreadsheetDataToRows = (data) =>
  data.map((dataRow = []) =>
    columns.reduce(
      (row, column, columnIndex) => ({
        ...row,
        [column.key]: normalizeCellValue(
          column.key,
          `${dataRow[columnIndex] ?? ""}`
        ),
      }),
      {}
    )
  );

const serializeSpreadsheetData = (data) =>
  JSON.stringify(data.map((row = []) => columns.map((_, index) => `${row[index] ?? ""}`)));

const storageKey = "bulk-product-draft";
const visibleRowStep = 12;
const visibleColumnStep = 5;
const requiredKeys = [
  "item_name",
  "sell_price",
  "sell_date",
  "unit",
  "category",
  "source",
  "buy_date",
  "buy_price",
];

const getCellSelector = (rowIndex, columnIndex) =>
  `[data-bulk-cell="${rowIndex}-${columnIndex}"]`;

const getNormalizedRange = (range) => ({
  startRow: Math.min(range.start.rowIndex, range.end.rowIndex),
  endRow: Math.max(range.start.rowIndex, range.end.rowIndex),
  startColumn: Math.min(range.start.columnIndex, range.end.columnIndex),
  endColumn: Math.max(range.start.columnIndex, range.end.columnIndex),
});

const getLastFilledRowIndex = (rowsToCheck) => {
  const lastFilledRowIndex = rowsToCheck.findLastIndex(isRowFilled);
  return Math.max(0, lastFilledRowIndex);
};

const getClampedCellPosition = (rowIndex, columnIndex, rowCount) => ({
  rowIndex: Math.max(0, Math.min(rowIndex, rowCount - 1)),
  columnIndex: Math.max(0, Math.min(columnIndex, columns.length - 1)),
});

const isRowFilled = (row) =>
  Object.values(row).some((value) => `${value}`.trim());

const isRowReadyForPriceCheck = (row, categoriesToCheck = []) => {
  const customer = `${row.category || ""}`.trim();

  return (
    `${row.item_name || ""}`.trim() &&
    customer &&
    categoriesToCheck.some((category) => category.name === customer)
  );
};

const getProductName = (row) =>
  [
    row.item_name || row.name,
    row.specification,
  ]
    .map((value) => `${value || ""}`.trim())
    .filter(Boolean)
    .join(" ");

const normalizeDuplicateKey = (value) =>
  `${value || ""}`
    .trim()
    .toLowerCase()
    .replace(/\s*[xX]\s*/g, "x")
    .replace(/\s+/g, " ");

const getProductSource = (row) =>
  `${row.source || row.no_so || ""}`.trim();

const getProductBuyPrice = (row) =>
  `${row.buy_price || "0"}`.trim();

const getProductSellDate = (row) => normalizeDate(`${row.sell_date || ""}`);

const getProductBuyDate = (row) => normalizeDate(`${row.buy_date || ""}`);

const isRowValid = (row) =>
  getProductName(row) &&
  requiredKeys.every((key) => {
    if (key === "source") return getProductSource(row);
    if (key === "buy_price") return getProductBuyPrice(row);
    return `${row[key] || ""}`.trim();
  }) &&
  Number(row.sell_price) > 0 &&
  Number(getProductBuyPrice(row)) >= 0 &&
  /^\d{4}-\d{2}-\d{2}$/.test(getProductSellDate(row)) &&
  /^\d{4}-\d{2}-\d{2}$/.test(getProductBuyDate(row));

const getMissingKeys = (row) =>
  requiredKeys.filter((key) => {
    if (key === "sell_price" || key === "buy_price") {
      const value = key === "buy_price" ? getProductBuyPrice(row) : row[key];
      return key === "buy_price"
        ? Number(value) < 0
        : !`${value || ""}`.trim() || Number(value) <= 0;
    }

    if (key === "item_name") return !getProductName(row);
    if (key === "source") return !getProductSource(row);

    if (key === "sell_date") {
      return !/^\d{4}-\d{2}-\d{2}$/.test(getProductSellDate(row));
    }

    if (key === "buy_date") {
      return !/^\d{4}-\d{2}-\d{2}$/.test(getProductBuyDate(row));
    }

    return !`${row[key] || ""}`.trim();
  });

const formatRowsForClipboard = (rowsToCopy) =>
  rowsToCopy
    .map((row) => columns.map((column) => row[column.key] ?? "").join("\t"))
    .join("\n");

const formatRangeForClipboard = (rowsToCopy, range) => {
  const normalizedRange = getNormalizedRange(range);

  return rowsToCopy
    .slice(normalizedRange.startRow, normalizedRange.endRow + 1)
    .map((row) =>
      columns
        .slice(normalizedRange.startColumn, normalizedRange.endColumn + 1)
        .map((column) => row[column.key] ?? "")
        .join("\t")
    )
    .join("\n");
};

const escapeCsvValue = (value) => {
  const text = `${value ?? ""}`;
  if (!/[",\n\r]/.test(text)) return text;
  return `"${text.replace(/"/g, '""')}"`;
};

const formatRowsForCsv = (rowsToExport) =>
  [
    columns.map((column) => escapeCsvValue(column.label)).join(","),
    ...rowsToExport.map((row) =>
      columns
        .map((column) => escapeCsvValue(row[column.key]))
        .join(",")
    ),
  ].join("\r\n");

const normalizeDate = (value) => {
  const text = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;

  const excelSerial = Number(text);
  if (Number.isInteger(excelSerial) && excelSerial > 20000 && excelSerial < 80000) {
    const excelEpoch = Date.UTC(1899, 11, 30);
    return new Date(excelEpoch + excelSerial * 86400000)
      .toISOString()
      .slice(0, 10);
  }

  const separatedMatch = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2}|\d{4})$/);
  if (separatedMatch) {
    const [, firstPart, secondPart, yearPart] = separatedMatch;
    const year =
      yearPart.length === 2 ? `20${yearPart}` : yearPart;
    const firstNumber = Number(firstPart);
    const secondNumber = Number(secondPart);
    const day = firstNumber > 12 ? firstPart : secondPart;
    const month = firstNumber > 12 ? secondPart : firstPart;

    if (secondNumber > 12) {
      return `${year}-${firstPart.padStart(2, "0")}-${secondPart.padStart(2, "0")}`;
    }

    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  const parsedDate = new Date(text);
  if (!Number.isNaN(parsedDate.getTime())) {
    return parsedDate.toISOString().slice(0, 10);
  }

  return text;
};

const formatDisplayDate = (value) => {
  const normalizedDate = normalizeDate(`${value || ""}`);
  return /^\d{4}-\d{2}-\d{2}$/.test(normalizedDate) ? normalizedDate : "-";
};

const normalizeNumber = (value) => {
  const text = `${value || ""}`.trim();
  const numericText = text.replace(/[^\d,.-]/g, "");

  if (!numericText) return "";

  const hasComma = numericText.includes(",");
  const hasDot = numericText.includes(".");
  const lastCommaIndex = numericText.lastIndexOf(",");
  const lastDotIndex = numericText.lastIndexOf(".");

  if (hasComma && hasDot) {
    const decimalSeparator = lastCommaIndex > lastDotIndex ? "," : ".";
    const thousandSeparator = decimalSeparator === "," ? "." : ",";

    return numericText
      .replace(new RegExp(`\\${thousandSeparator}`, "g"), "")
      .replace(decimalSeparator, ".");
  }

  if (hasDot) {
    return numericText.replace(/\./g, "");
  }

  if (hasComma) {
    const parts = numericText.split(",");
    const lastPart = parts[parts.length - 1];

    if (lastPart.length === 3 && parts.length > 1) {
      return numericText.replace(/,/g, "");
    }

    return numericText.replace(",", ".");
  }

  return numericText;
};

const getPasteStartColumnIndex = (pastedRows, columnIndex) => {
  const firstRowColumnCount = pastedRows[0]?.length || 0;

  if (
    columnIndex === 0 &&
    firstRowColumnCount === 5 &&
    pastedRows.every((row) => row.length === 5)
  ) {
    return columns.findIndex((column) => column.key === "item_name");
  }

  return columnIndex;
};

const normalizeCellValue = (columnKey, value) => {
  if (columnKey === "sell_date" || columnKey === "buy_date") {
    return normalizeDate(value);
  }

  if (columnKey === "sell_price" || columnKey === "buy_price" || columnKey === "qty") {
    return normalizeNumber(value);
  }

  return value.trim();
};

const BulkProductDraft = () => {
  const { t, locale } = useI18n();
  const [rows, setRows] = useState(() => {
    try {
      const savedDraft = JSON.parse(localStorage.getItem(storageKey));
      return Array.isArray(savedDraft) && savedDraft.length > 0
        ? savedDraft
        : createRows(12);
    } catch {
      return createRows(12);
    }
  });
  const [categories, setCategories] = useState([]);
  const [status, setStatus] = useState("");
  const [activeCell, setActiveCell] = useState({ rowIndex: 0, columnIndex: 0 });
  const [editingCell, setEditingCell] = useState(null);
  const [selectedRange, setSelectedRange] = useState({
    start: { rowIndex: 0, columnIndex: 0 },
    end: { rowIndex: 0, columnIndex: 0 },
  });
  const [contextMenu, setContextMenu] = useState(null);
  const [priceCheckItems, setPriceCheckItems] = useState([]);
  const [activePriceCheck, setActivePriceCheck] = useState(null);
  const [priceSearchResults, setPriceSearchResults] = useState([]);
  const [isCheckingDuplicates, setIsCheckingDuplicates] = useState(false);
  const [isSearchingPriceList, setIsSearchingPriceList] = useState(false);
  const [selectedCellCount, setSelectedCellCount] = useState(1);
  const isSelectingRef = useRef(false);
  const isProgrammaticFocusRef = useRef(false);
  const activeCellRef = useRef({ rowIndex: 0, columnIndex: 0 });
  const selectionStartRef = useRef({ rowIndex: 0, columnIndex: 0 });
  const selectionAnchorRef = useRef({ rowIndex: 0, columnIndex: 0 });
  const selectedRangeRef = useRef(selectedRange);
  const selectionModeRef = useRef("cell");
  const editStartValueRef = useRef("");
  const undoStackRef = useRef([]);
  const redoStackRef = useRef([]);
  const tableWrapRef = useRef(null);
  const spreadsheetRootRef = useRef(null);
  const spreadsheetRef = useRef(null);
  const isApplyingSpreadsheetDataRef = useRef(false);
  const spreadsheetDataRef = useRef("");
  const rowsRef = useRef(rows);
  const submitRowsRef = useRef(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    activeCellRef.current = activeCell;
  }, [activeCell]);

  useEffect(() => {
    rowsRef.current = rows;
  }, [rows]);

  useEffect(() => {
    selectedRangeRef.current = selectedRange;
  }, [selectedRange]);

  useEffect(() => {
    apiClient
      .get("/category")
      .then((res) => setCategories(res.data))
      .catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    if (rows.length > 0 && isRowFilled(rows[rows.length - 1])) {
      setRows((currentRows) => [...currentRows, emptyRow()]);
    }
  }, [rows]);

  useEffect(() => {
    const rootElement = spreadsheetRootRef.current;
    if (!rootElement) return;

    rootElement.innerHTML = "";
    const initialData = rowsToSpreadsheetData(rowsRef.current);

    const syncRowsFromSpreadsheet = (worksheet) => {
      if (isApplyingSpreadsheetDataRef.current) return;

      const nextData = worksheet.getData(false, true);
      spreadsheetDataRef.current = serializeSpreadsheetData(nextData);
      setRows(spreadsheetDataToRows(nextData));
      clearPriceCheck();
      setStatus("");
    };

    const fillSpreadsheetSelectionDown = () => {
      const worksheet = spreadsheetRef.current;
      if (!worksheet) return;

      const selection = worksheet.getSelection?.();
      if (!selection) return;

      const [leftIndex, topIndex, rightIndex, bottomIndex] = selection;
      const range = {
        start: {
          rowIndex: Math.min(topIndex, bottomIndex),
          columnIndex: Math.min(leftIndex, rightIndex),
        },
        end: {
          rowIndex: Math.max(topIndex, bottomIndex),
          columnIndex: Math.max(leftIndex, rightIndex),
        },
      };

      if (range.end.rowIndex <= range.start.rowIndex) {
        setStatus("Pilih minimal 2 baris untuk fill down.");
        return;
      }

      recordHistory(rowsRef.current);

      const changes = [];
      for (
        let rowIndex = range.start.rowIndex + 1;
        rowIndex <= range.end.rowIndex;
        rowIndex++
      ) {
        for (
          let columnIndex = range.start.columnIndex;
          columnIndex <= range.end.columnIndex;
          columnIndex++
        ) {
          changes.push({
            x: columnIndex,
            y: rowIndex,
            value: worksheet.getValueFromCoords(columnIndex, range.start.rowIndex),
          });
        }
      }

      worksheet.setValue(changes, undefined, true);
      const nextData = worksheet.getData(false, true);
      spreadsheetDataRef.current = serializeSpreadsheetData(nextData);
      setRows(spreadsheetDataToRows(nextData));
      clearPriceCheck();
      setStatus("Fill down.");
    };

    const handleSpreadsheetNativeKeyDown = (event) => {
      if (!(event.ctrlKey || event.metaKey)) {
        return;
      }

      const activeElement = document.activeElement;
      if (!rootElement.contains(event.target) && !rootElement.contains(activeElement)) {
        return;
      }

      if (event.key === "Enter") {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation?.();
        submitRowsRef.current?.();
        return;
      }

      if (event.key.toLowerCase() !== "d") {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation?.();
      fillSpreadsheetSelectionDown();
    };

    spreadsheetDataRef.current = serializeSpreadsheetData(initialData);
    isApplyingSpreadsheetDataRef.current = true;

    const instances = jspreadsheet(rootElement, {
      onafterchanges: syncRowsFromSpreadsheet,
      oninsertrow: syncRowsFromSpreadsheet,
      ondeleterow: syncRowsFromSpreadsheet,
      onselection: (
        _worksheet,
        borderLeftIndex,
        borderTopIndex,
        borderRightIndex,
        borderBottomIndex
      ) => {
        const nextRange = {
          start: {
            rowIndex: Math.min(borderTopIndex, borderBottomIndex),
            columnIndex: Math.min(borderLeftIndex, borderRightIndex),
          },
          end: {
            rowIndex: Math.max(borderTopIndex, borderBottomIndex),
            columnIndex: Math.max(borderLeftIndex, borderRightIndex),
          },
        };
        const selectedRows =
          Math.abs(borderBottomIndex - borderTopIndex) + 1;
        const selectedColumns =
          Math.abs(borderRightIndex - borderLeftIndex) + 1;
        selectedRangeRef.current = nextRange;
        setSelectedRange(nextRange);
        setSelectedCellCount(selectedRows * selectedColumns);
      },
      worksheets: [
        {
          worksheetName: "Multiple Item Draft",
          data: initialData,
          columns: columns.map((column) => ({
            title: column.label,
            type: getSpreadsheetColumnType(column.type),
            source:
              column.type === "select"
                ? categories.map((category) => category.name)
                : undefined,
            options:
              column.type === "date"
                ? { format: "YYYY-MM-DD", readonly: false, today: true }
                : undefined,
            width: column.width,
          })),
          editable: true,
          allowDeleteColumn: false,
          allowInsertColumn: false,
          allowManualInsertColumn: false,
          allowRenameColumn: false,
          columnDrag: false,
          columnSorting: false,
          tableOverflow: true,
          tableWidth: "100%",
          tableHeight: "100%",
          minDimensions: [columns.length, 12],
        },
      ],
    });

    spreadsheetRef.current = instances[0] || null;
    window.requestAnimationFrame(() => {
      isApplyingSpreadsheetDataRef.current = false;
    });
    window.addEventListener("keydown", handleSpreadsheetNativeKeyDown, true);

    return () => {
      window.removeEventListener("keydown", handleSpreadsheetNativeKeyDown, true);
      isApplyingSpreadsheetDataRef.current = false;
      spreadsheetRef.current = null;
      jspreadsheet.destroy(rootElement, true);
      rootElement.innerHTML = "";
    };
  }, [categories]);

  useEffect(() => {
    const worksheet = spreadsheetRef.current;
    if (!worksheet) return;

    const nextData = rowsToSpreadsheetData(rows);
    const serializedNextData = serializeSpreadsheetData(nextData);

    if (serializedNextData === spreadsheetDataRef.current) return;

    isApplyingSpreadsheetDataRef.current = true;
    spreadsheetDataRef.current = serializedNextData;
    worksheet.setData(nextData);
    window.requestAnimationFrame(() => {
      isApplyingSpreadsheetDataRef.current = false;
    });
  }, [rows]);

  useEffect(() => {
    const updateDragSelection = (event) => {
      if (!isSelectingRef.current) return;

      const target = document
        .elementFromPoint(event.clientX, event.clientY)
        ?.closest("[data-bulk-td]");

      if (!target) return;

      const rowIndex = Number(target.dataset.rowIndex);
      const columnIndex = Number(target.dataset.columnIndex);

      if (Number.isNaN(rowIndex) || Number.isNaN(columnIndex)) return;

      setActiveCell({ rowIndex, columnIndex });
      setSelectedRange({
        start: selectionStartRef.current,
        end: { rowIndex, columnIndex },
      });
    };

    const stopSelecting = (event) => {
      updateDragSelection(event);
      isSelectingRef.current = false;
    };

    window.addEventListener("mousemove", updateDragSelection);
    window.addEventListener("mouseup", stopSelecting);
    return () => {
      window.removeEventListener("mousemove", updateDragSelection);
      window.removeEventListener("mouseup", stopSelecting);
    };
  }, []);

  useEffect(() => {
    const closeContextMenu = () => setContextMenu(null);

    window.addEventListener("click", closeContextMenu);
    return () => window.removeEventListener("click", closeContextMenu);
  }, []);

  const filledRows = useMemo(
    () => rows.filter(isRowFilled),
    [rows]
  );

  const isBulkRowValid = useCallback((row) =>
    isRowValid(row) &&
    categories.some((category) => category.name === row.category.trim()),
  [categories]);

  const getBulkMissingKeys = (row) => {
    const missingKeys = getMissingKeys(row);
    const hasKnownCustomer = categories.some(
      (category) => category.name === row.category.trim()
    );

    if (row.category.trim() && !hasKnownCustomer) {
      return [...missingKeys, "category"];
    }

    return missingKeys;
  };

  const invalidRows = useMemo(
    () => filledRows.filter((row) => !isBulkRowValid(row)).length,
    [filledRows, isBulkRowValid]
  );

  const validRows = useMemo(
    () => filledRows.filter(isBulkRowValid),
    [filledRows, isBulkRowValid]
  );

  const priceCheckRowsWithIndex = useMemo(
    () =>
      rows
        .map((row, rowIndex) => ({ row, rowIndex }))
        .filter(({ row }) => isRowReadyForPriceCheck(row, categories)),
    [categories, rows]
  );

  const clearPriceCheck = () => {
    setPriceCheckItems([]);
    setActivePriceCheck(null);
    setPriceSearchResults([]);
  };

  const cloneRows = (rowsToClone) => rowsToClone.map((row) => ({ ...row }));

  const recordHistory = (currentRows) => {
    undoStackRef.current = [...undoStackRef.current.slice(-99), cloneRows(currentRows)];
    redoStackRef.current = [];
  };

  const restoreRows = (rowsToRestore) => {
    setRows(cloneRows(rowsToRestore));
    setStatus("");
  };

  const handleUndo = () => {
    const previousRows = undoStackRef.current.pop();
    if (!previousRows) return;

    redoStackRef.current.push(cloneRows(rows));
    restoreRows(previousRows);
    setStatus("Undo.");
  };

  const handleRedo = () => {
    const nextRows = redoStackRef.current.pop();
    if (!nextRows) return;

    undoStackRef.current.push(cloneRows(rows));
    restoreRows(nextRows);
    setStatus("Redo.");
  };

  const fillSelectionDown = () => {
    const range = getNormalizedRange(selectedRangeRef.current);

    if (range.endRow <= range.startRow) {
      setStatus("Pilih minimal 2 baris untuk fill down.");
      return;
    }

    setRows((currentRows) => {
      recordHistory(currentRows);
      return currentRows.map((row, rowIndex) => {
        if (rowIndex <= range.startRow || rowIndex > range.endRow) {
          return row;
        }

        const nextRow = { ...row };
        for (
          let columnIndex = range.startColumn;
          columnIndex <= range.endColumn;
          columnIndex++
        ) {
          const columnKey = columns[columnIndex].key;
          nextRow[columnKey] = currentRows[range.startRow][columnKey];
        }
        return nextRow;
      });
    });
    setStatus("Fill down.");
  };

  const fillSelectionRight = () => {
    const range = getNormalizedRange(selectedRangeRef.current);

    if (range.endColumn <= range.startColumn) {
      setStatus("Pilih minimal 2 kolom untuk fill right.");
      return;
    }

    setRows((currentRows) => {
      recordHistory(currentRows);
      return currentRows.map((row, rowIndex) => {
        if (rowIndex < range.startRow || rowIndex > range.endRow) {
          return row;
        }

        const nextRow = { ...row };
        const sourceColumnKey = columns[range.startColumn].key;
        for (
          let columnIndex = range.startColumn + 1;
          columnIndex <= range.endColumn;
          columnIndex++
        ) {
          nextRow[columns[columnIndex].key] = currentRows[rowIndex][sourceColumnKey];
        }
        return nextRow;
      });
    });
    setStatus("Fill right.");
  };

  const selectUsedRange = () => {
    selectionModeRef.current = "range";
    selectionAnchorRef.current = { rowIndex: 0, columnIndex: 0 };
    activeCellRef.current = { rowIndex: 0, columnIndex: 0 };
    setActiveCell({ rowIndex: 0, columnIndex: 0 });
    setSelectedRange({
      start: { rowIndex: 0, columnIndex: 0 },
      end: { rowIndex: rows.length - 1, columnIndex: columns.length - 1 },
    });
    window.requestAnimationFrame(() => {
      document.querySelector(getCellSelector(0, 0))?.focus();
    });
    setStatus("Semua cell dipilih.");
  };

  const selectCurrentColumn = (columnIndex) => {
    selectionModeRef.current = "column";
    selectionAnchorRef.current = { rowIndex: 0, columnIndex };
    activeCellRef.current = { rowIndex: 0, columnIndex };
    setActiveCell({ rowIndex: 0, columnIndex });
    setSelectedRange({
      start: { rowIndex: 0, columnIndex },
      end: { rowIndex: rows.length - 1, columnIndex },
    });
    window.requestAnimationFrame(() => {
      isProgrammaticFocusRef.current = true;
      document.querySelector(getCellSelector(0, columnIndex))?.focus({
        preventScroll: true,
      });
      window.requestAnimationFrame(() => {
        isProgrammaticFocusRef.current = false;
      });
    });
    setStatus("Kolom dipilih.");
  };

  const selectCurrentRow = (rowIndex) => {
    selectionModeRef.current = "row";
    selectionAnchorRef.current = { rowIndex, columnIndex: 0 };
    activeCellRef.current = { rowIndex, columnIndex: 0 };
    setActiveCell({ rowIndex, columnIndex: 0 });
    setSelectedRange({
      start: { rowIndex, columnIndex: 0 },
      end: { rowIndex, columnIndex: columns.length - 1 },
    });
    window.requestAnimationFrame(() => {
      isProgrammaticFocusRef.current = true;
      document.querySelector(getCellSelector(rowIndex, 0))?.focus({
        preventScroll: true,
      });
      window.requestAnimationFrame(() => {
        isProgrammaticFocusRef.current = false;
      });
    });
    setStatus("Baris dipilih.");
  };

  const collapseSelectionToActiveCell = () => {
    selectionModeRef.current = "cell";
    selectionAnchorRef.current = activeCell;
    setSelectedRange({
      start: activeCell,
      end: activeCell,
    });
    window.requestAnimationFrame(() => {
      isProgrammaticFocusRef.current = true;
      document
        .querySelector(getCellSelector(activeCell.rowIndex, activeCell.columnIndex))
        ?.focus({ preventScroll: true });
      window.requestAnimationFrame(() => {
        isProgrammaticFocusRef.current = false;
      });
    });
    setStatus("");
  };

  const clearSelectedRange = () => {
    const range = getNormalizedRange(selectedRange);

    setRows((currentRows) => {
      recordHistory(currentRows);
      return currentRows.map((row, rowIndex) => {
        if (rowIndex < range.startRow || rowIndex > range.endRow) {
          return row;
        }

        const nextRow = { ...row };
        for (
          let columnIndex = range.startColumn;
          columnIndex <= range.endColumn;
          columnIndex++
        ) {
          nextRow[columns[columnIndex].key] = "";
        }
        return nextRow;
      });
    });
    clearPriceCheck();
    setStatus(`${selectedCellCount} cell dikosongkan.`);
  };

  const updateCell = (rowIndex, key, value) => {
    setRows((currentRows) => {
      recordHistory(currentRows);
      const nextRows = [...currentRows];
      nextRows[rowIndex] = { ...nextRows[rowIndex], [key]: value };
      return nextRows;
    });
    clearPriceCheck();
    setStatus("");
  };

  const isEditingCell = (rowIndex, columnIndex) =>
    editingCell?.rowIndex === rowIndex && editingCell?.columnIndex === columnIndex;

  const stopEditingCell = () => {
    editStartValueRef.current = "";
    setEditingCell(null);
  };

  const focusCell = (rowIndex, columnIndex, shouldExtendSelection = false) => {
    let nextRowIndex = rowIndex;
    let nextColumnIndex = columnIndex;

    if (nextColumnIndex >= columns.length) {
      nextRowIndex += 1;
      nextColumnIndex = 0;
    }

    if (nextColumnIndex < 0) {
      nextRowIndex -= 1;
      nextColumnIndex = columns.length - 1;
    }

    nextRowIndex = Math.max(0, nextRowIndex);

    if (nextRowIndex >= rows.length) {
      setRows((currentRows) =>
        ensureRowCount(currentRows, nextRowIndex + 1)
      );
    }

    stopEditingCell();
    activeCellRef.current = { rowIndex: nextRowIndex, columnIndex: nextColumnIndex };
    setActiveCell({ rowIndex: nextRowIndex, columnIndex: nextColumnIndex });

    if (!shouldExtendSelection) {
      selectionModeRef.current = "cell";
      selectionAnchorRef.current = {
        rowIndex: nextRowIndex,
        columnIndex: nextColumnIndex,
      };
    }

    setSelectedRange(() =>
      shouldExtendSelection
        ? selectionModeRef.current === "row"
          ? {
              start: {
                rowIndex: selectionAnchorRef.current.rowIndex,
                columnIndex: 0,
              },
              end: {
                rowIndex: nextRowIndex,
                columnIndex: columns.length - 1,
              },
            }
          : selectionModeRef.current === "column"
            ? {
                start: {
                  rowIndex: 0,
                  columnIndex: selectionAnchorRef.current.columnIndex,
                },
                end: {
                  rowIndex: rows.length - 1,
                  columnIndex: nextColumnIndex,
                },
              }
            : {
                start: selectionAnchorRef.current,
                end: { rowIndex: nextRowIndex, columnIndex: nextColumnIndex },
              }
        : {
            start: { rowIndex: nextRowIndex, columnIndex: nextColumnIndex },
            end: { rowIndex: nextRowIndex, columnIndex: nextColumnIndex },
          }
    );

    window.requestAnimationFrame(() => {
      const nextCell = document.querySelector(
        getCellSelector(nextRowIndex, nextColumnIndex)
      );
      isProgrammaticFocusRef.current = true;
      nextCell?.focus({ preventScroll: true });
      if (!shouldExtendSelection) {
        nextCell?.select?.();
      }
      nextCell?.scrollIntoView?.({
        block: "nearest",
        inline: "nearest",
      });
      window.requestAnimationFrame(() => {
        isProgrammaticFocusRef.current = false;
      });
    });
  };

  const extendSelectionBy = (rowStep, columnStep) => {
    const currentCell = activeCellRef.current;
    const target = getClampedCellPosition(
      currentCell.rowIndex + rowStep,
      currentCell.columnIndex + columnStep,
      rows.length
    );

    focusCell(target.rowIndex, target.columnIndex, true);
  };

  const ensureRowCount = (currentRows, desiredCount) => {
    if (currentRows.length >= desiredCount) return currentRows;
    return [...currentRows, ...createRows(desiredCount - currentRows.length)];
  };

  const scrollTableBy = (left = 0, top = 0) => {
    tableWrapRef.current?.scrollBy({
      left,
      top,
      behavior: "smooth",
    });
  };

  const focusSearchInput = () => {
    const searchInput = document.querySelector("[data-global-search]");
    searchInput?.focus();
    searchInput?.select?.();
  };

  const startEditingCell = (rowIndex, columnIndex) => {
    const cell = document.querySelector(getCellSelector(rowIndex, columnIndex));
    editStartValueRef.current = rows[rowIndex]?.[columns[columnIndex]?.key] ?? "";
    setEditingCell({ rowIndex, columnIndex });
    selectCell(rowIndex, columnIndex);
    cell?.focus();

    if (cell?.setSelectionRange) {
      const endPosition = cell.value.length;
      cell.setSelectionRange(endPosition, endPosition);
    }
  };

  const downloadCsv = () => {
    if (filledRows.length === 0) {
      setStatus("Belum ada item untuk didownload.");
      return;
    }

    const blob = new Blob([formatRowsForCsv(filledRows)], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `multiple-item-draft-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    setStatus(`${filledRows.length} baris didownload.`);
  };

  const deleteSelectedRows = () => {
    const range = getNormalizedRange(selectedRange);
    const isFullRowSelection =
      range.startColumn === 0 && range.endColumn === columns.length - 1;

    if (!isFullRowSelection) {
      setStatus("Pilih seluruh baris untuk delete row.");
      return;
    }

    setRows((currentRows) => {
      recordHistory(currentRows);
      const nextRows = currentRows.filter(
        (row, rowIndex) => rowIndex < range.startRow || rowIndex > range.endRow
      );
      return nextRows.length > 0 ? nextRows : createRows(1);
    });

    focusCell(Math.min(range.startRow, rows.length - 1), 0);
    setContextMenu(null);
    setStatus(`${range.endRow - range.startRow + 1} baris dihapus.`);
  };

  const clearSelectedColumns = () => {
    const range = getNormalizedRange(selectedRange);
    const isFullColumnSelection =
      range.startRow === 0 && range.endRow === rows.length - 1;

    if (!isFullColumnSelection) {
      setStatus("Pilih seluruh kolom untuk delete column.");
      return;
    }

    setRows((currentRows) => {
      recordHistory(currentRows);
      return currentRows.map((row) => {
        const nextRow = { ...row };

        for (
          let columnIndex = range.startColumn;
          columnIndex <= range.endColumn;
          columnIndex++
        ) {
          nextRow[columns[columnIndex].key] = "";
        }

        return nextRow;
      });
    });
    setContextMenu(null);
    setStatus(`${range.endColumn - range.startColumn + 1} kolom dikosongkan.`);
  };

  const deleteRowsOrColumns = () => {
    const range = getNormalizedRange(selectedRange);
    const isFullRowSelection =
      range.startColumn === 0 && range.endColumn === columns.length - 1;
    const isFullColumnSelection =
      range.startRow === 0 && range.endRow === rows.length - 1;

    if (isFullRowSelection) {
      deleteSelectedRows();
      return;
    }

    if (isFullColumnSelection) {
      clearSelectedColumns();
      return;
    }

    clearSelectedRange();
  };

  const getCellValue = (rowIndex, columnIndex) =>
    `${rows[rowIndex]?.[columns[columnIndex]?.key] || ""}`.trim();

  const findCtrlArrowTarget = (rowIndex, columnIndex, key) => {
    const directionMap = {
      ArrowDown: { rowStep: 1, columnStep: 0 },
      ArrowUp: { rowStep: -1, columnStep: 0 },
      ArrowRight: { rowStep: 0, columnStep: 1 },
      ArrowLeft: { rowStep: 0, columnStep: -1 },
    };
    const direction = directionMap[key];
    if (!direction) return { rowIndex, columnIndex };

    const rowLimit = rows.length - 1;
    const columnLimit = columns.length - 1;
    const nextCell = (cell) => ({
      rowIndex: cell.rowIndex + direction.rowStep,
      columnIndex: cell.columnIndex + direction.columnStep,
    });
    const isInBounds = (cell) =>
      cell.rowIndex >= 0 &&
      cell.rowIndex <= rowLimit &&
      cell.columnIndex >= 0 &&
      cell.columnIndex <= columnLimit;

    let current = { rowIndex, columnIndex };
    let next = nextCell(current);
    if (!isInBounds(next)) return current;

    const currentHasValue = Boolean(getCellValue(rowIndex, columnIndex));

    if (currentHasValue) {
      while (isInBounds(next) && getCellValue(next.rowIndex, next.columnIndex)) {
        current = next;
        next = nextCell(current);
      }

      return current;
    }

    while (isInBounds(next) && !getCellValue(next.rowIndex, next.columnIndex)) {
      current = next;
      next = nextCell(current);
    }

    return isInBounds(next) ? next : current;
  };

  const applyPastedText = (pastedText, rowIndex, columnIndex) => {
    if (!pastedText) return;

    const pastedRows = pastedText
      .replace(/\r/g, "")
      .split("\n")
      .filter((line) => line.length > 0)
      .map((line) => line.split("\t"));

    setRows((currentRows) => {
      recordHistory(currentRows);
      const pasteStartColumnIndex = getPasteStartColumnIndex(
        pastedRows,
        columnIndex
      );
      const range = getNormalizedRange(selectedRange);
      const shouldFillRange =
        pastedRows.length === 1 &&
        pastedRows[0].length === 1 &&
        selectedCellCount > 1;
      const shouldRepeatClipboardToRange =
        selectedCellCount > 1 &&
        (pastedRows.length < range.endRow - range.startRow + 1 ||
          pastedRows[0].length < range.endColumn - range.startColumn + 1);
      const desiredRowCount = shouldFillRange
        ? range.endRow + 1
        : rowIndex + pastedRows.length;
      const nextRows = ensureRowCount(currentRows, desiredRowCount).map((row) => ({
        ...row,
      }));

      if (shouldFillRange || shouldRepeatClipboardToRange) {
        for (let targetRow = range.startRow; targetRow <= range.endRow; targetRow++) {
          for (
            let targetColumnIndex = range.startColumn;
            targetColumnIndex <= range.endColumn;
            targetColumnIndex++
          ) {
            const targetColumn = columns[targetColumnIndex];
            const sourceRowIndex =
              (targetRow - range.startRow) % pastedRows.length;
            const sourceColumnIndex =
              (targetColumnIndex - range.startColumn) %
              pastedRows[sourceRowIndex].length;
            nextRows[targetRow][targetColumn.key] = normalizeCellValue(
              targetColumn.key,
              pastedRows[sourceRowIndex][sourceColumnIndex]
            );
          }
        }

        return nextRows;
      }

      pastedRows.forEach((pastedRow, pastedRowIndex) => {
        pastedRow.forEach((cellValue, pastedColumnIndex) => {
          const targetColumn = columns[pasteStartColumnIndex + pastedColumnIndex];
          if (!targetColumn) return;
          nextRows[rowIndex + pastedRowIndex][targetColumn.key] =
            normalizeCellValue(targetColumn.key, cellValue);
        });
      });

      return nextRows;
    });
    clearPriceCheck();
    setStatus(
      selectedCellCount > 1 && pastedRows.length === 1 && pastedRows[0].length === 1
        ? `${selectedCellCount} cell diisi.`
        : `${pastedRows.length} baris masuk ke draft.`
    );
  };

  const pasteFromClipboard = async (rowIndex, columnIndex) => {
    try {
      const clipboardText = await navigator.clipboard.readText();
      applyPastedText(clipboardText, rowIndex, columnIndex);
    } catch {
      setStatus("Clipboard tidak bisa dibaca browser.");
    }
  };

  const handlePaste = (rowIndex, columnIndex) => (event) => {
    const pastedText = event.clipboardData.getData("text");
    if (!pastedText) return;

    event.preventDefault();
    applyPastedText(pastedText, rowIndex, columnIndex);
  };

  const handleCopy = (rowIndex, columnIndex) => (event) => {
    const selectedText = window.getSelection().toString();
    if (selectedText) return;

    event.preventDefault();
    event.clipboardData.setData(
      "text/plain",
      selectedCellCount > 1
        ? formatRangeForClipboard(rows, selectedRange)
        : rows[rowIndex][columns[columnIndex].key] ?? ""
    );
    setStatus(
      selectedCellCount > 1
        ? `${selectedCellCount} cell dicopy.`
        : "Cell dicopy."
    );
  };

  const handleCut = (rowIndex, columnIndex) => (event) => {
    const selectedText = window.getSelection().toString();
    if (selectedText) return;

    event.preventDefault();
    event.clipboardData.setData(
      "text/plain",
      selectedCellCount > 1
        ? formatRangeForClipboard(rows, selectedRange)
        : rows[rowIndex][columns[columnIndex].key] ?? ""
    );

    if (selectedCellCount > 1) {
      const range = getNormalizedRange(selectedRange);

      setRows((currentRows) => {
        recordHistory(currentRows);
        return currentRows.map((row, currentRowIndex) => {
          if (currentRowIndex < range.startRow || currentRowIndex > range.endRow) {
            return row;
          }

          const nextRow = { ...row };
          for (
            let currentColumnIndex = range.startColumn;
            currentColumnIndex <= range.endColumn;
            currentColumnIndex++
          ) {
            nextRow[columns[currentColumnIndex].key] = "";
          }
          return nextRow;
        });
      });
      setStatus(`${selectedCellCount} cell dipindah.`);
      return;
    }

    updateCell(rowIndex, columns[columnIndex].key, "");
    setStatus("Cell dipindah.");
  };

  const getSelectedClipboardText = () => {
    const range = getNormalizedRange(selectedRange);

    return selectedCellCount > 1
      ? formatRangeForClipboard(rows, selectedRange)
      : rows[range.startRow][columns[range.startColumn].key] ?? "";
  };

  const copySelectionToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(getSelectedClipboardText());
      setContextMenu(null);
      setStatus(
        selectedCellCount > 1
          ? `${selectedCellCount} cell dicopy.`
          : "Cell dicopy."
      );
    } catch {
      setStatus("Clipboard tidak bisa ditulis browser.");
    }
  };

  const cutSelectionToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(getSelectedClipboardText());
      clearSelectedRange();
      setContextMenu(null);
      setStatus(
        selectedCellCount > 1
          ? `${selectedCellCount} cell dipindah.`
          : "Cell dipindah."
      );
    } catch {
      setStatus("Clipboard tidak bisa ditulis browser.");
    }
  };

  const openContextMenu = (rowIndex, columnIndex, clientX, clientY) => {
    if (!isCellSelected(rowIndex, columnIndex)) {
      selectCell(rowIndex, columnIndex);
    }

    setContextMenu({
      x: clientX,
      y: clientY,
    });
  };

  const handleKeyDown = (rowIndex, columnIndex) => (event) => {
    if (isEditingCell(rowIndex, columnIndex)) {
      if (
        event.shiftKey &&
        ["ArrowDown", "ArrowUp", "ArrowRight", "ArrowLeft"].includes(event.key)
      ) {
        event.preventDefault();
        stopEditingCell();

        if (event.key === "ArrowDown") extendSelectionBy(1, 0);
        if (event.key === "ArrowUp") extendSelectionBy(-1, 0);
        if (event.key === "ArrowRight") extendSelectionBy(0, 1);
        if (event.key === "ArrowLeft") extendSelectionBy(0, -1);
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        const columnKey = columns[columnIndex].key;

        setRows((currentRows) => {
          const nextRows = [...currentRows];
          nextRows[rowIndex] = {
            ...nextRows[rowIndex],
            [columnKey]: editStartValueRef.current,
          };
          return nextRows;
        });
        stopEditingCell();
        return;
      }

      if (event.key === "Enter") {
        event.preventDefault();
        stopEditingCell();
        focusCell(rowIndex + (event.shiftKey ? -1 : 1), columnIndex);
        return;
      }

      if (event.key === "Tab") {
        event.preventDefault();
        stopEditingCell();
        focusCell(rowIndex, columnIndex + (event.shiftKey ? -1 : 1));
        return;
      }

      return;
    }

    if (event.altKey) {
      if (event.key === "Alt") {
        document.querySelector(".navbar_links a, .navbar_links button")?.focus();
        return;
      }

      if (event.key === "PageUp") {
        event.preventDefault();
        scrollTableBy(-tableWrapRef.current?.clientWidth || -600, 0);
        focusCell(rowIndex, Math.max(0, columnIndex - visibleColumnStep), event.shiftKey);
        return;
      }

      if (event.key === "PageDown") {
        event.preventDefault();
        scrollTableBy(tableWrapRef.current?.clientWidth || 600, 0);
        focusCell(
          rowIndex,
          Math.min(columns.length - 1, columnIndex + visibleColumnStep),
          event.shiftKey
        );
        return;
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        focusCell(rowIndex, 0, event.shiftKey);
        setStatus("Worksheet sebelumnya tidak tersedia.");
        return;
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        focusCell(rowIndex, columns.length - 1, event.shiftKey);
        setStatus("Worksheet berikutnya tidak tersedia.");
        return;
      }

      if (event.key === "ArrowDown") {
        setStatus("Filter tidak tersedia di grid ini.");
        return;
      }
    }

    if (event.ctrlKey || event.metaKey) {
      if (event.key.toLowerCase() === "z") {
        event.preventDefault();
        handleUndo();
        return;
      }

      if (event.key.toLowerCase() === "y") {
        event.preventDefault();
        handleRedo();
        return;
      }

      if (event.key.toLowerCase() === "d") {
        event.preventDefault();
        fillSelectionDown();
        return;
      }

      if (event.key.toLowerCase() === "r") {
        event.preventDefault();
        fillSelectionRight();
        return;
      }

      if (event.key.toLowerCase() === "a") {
        event.preventDefault();
        selectUsedRange();
        return;
      }

      if (event.key.toLowerCase() === "f") {
        event.preventDefault();
        focusSearchInput();
        return;
      }

      if (event.key.toLowerCase() === "p") {
        event.preventDefault();
        window.print();
        return;
      }

      if (event.key === " ") {
        event.preventDefault();
        selectCurrentColumn(columnIndex);
        return;
      }

      if (event.key === "Home") {
        event.preventDefault();
        focusCell(0, 0, event.shiftKey);
        return;
      }

      if (event.key === "End") {
        event.preventDefault();
        focusCell(getLastFilledRowIndex(rows), columns.length - 1, event.shiftKey);
        return;
      }

      if (event.key === "ArrowDown") {
        event.preventDefault();
        const target = findCtrlArrowTarget(rowIndex, columnIndex, event.key);
        focusCell(target.rowIndex, target.columnIndex, event.shiftKey);
        return;
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        const target = findCtrlArrowTarget(rowIndex, columnIndex, event.key);
        focusCell(target.rowIndex, target.columnIndex, event.shiftKey);
        return;
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        const target = findCtrlArrowTarget(rowIndex, columnIndex, event.key);
        focusCell(target.rowIndex, target.columnIndex, event.shiftKey);
        return;
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        const target = findCtrlArrowTarget(rowIndex, columnIndex, event.key);
        focusCell(target.rowIndex, target.columnIndex, event.shiftKey);
        return;
      }

      if (event.key.toLowerCase() === "s") {
        event.preventDefault();
        downloadCsv();
        return;
      }

      if (event.key === "Enter") {
        event.preventDefault();
        pasteFromClipboard(rowIndex, columnIndex);
        return;
      }

      if (event.key === "-" || event.key === "Subtract") {
        event.preventDefault();
        deleteRowsOrColumns();
        return;
      }

      return;
    }

    if ((event.shiftKey && event.key === "F10") || event.key === "ContextMenu") {
      event.preventDefault();
      const rect = event.currentTarget.getBoundingClientRect();
      openContextMenu(rowIndex, columnIndex, rect.left + 12, rect.bottom + 4);
      return;
    }

    if (event.shiftKey && event.key === "F11") {
      event.preventDefault();
      setStatus("Worksheet baru belum tersedia di grid ini.");
      return;
    }

    if (event.shiftKey && event.key === " ") {
      event.preventDefault();
      selectCurrentRow(rowIndex);
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      collapseSelectionToActiveCell();
      return;
    }

    if (event.key === "F2") {
      event.preventDefault();
      startEditingCell(rowIndex, columnIndex);
      return;
    }

    if (event.key === "PageUp") {
      event.preventDefault();
      scrollTableBy(0, -tableWrapRef.current?.clientHeight || -420);
      focusCell(Math.max(0, rowIndex - visibleRowStep), columnIndex, event.shiftKey);
      return;
    }

    if (event.key === "PageDown") {
      event.preventDefault();
      scrollTableBy(0, tableWrapRef.current?.clientHeight || 420);
      focusCell(
        Math.min(rows.length - 1, rowIndex + visibleRowStep),
        columnIndex,
        event.shiftKey
      );
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      focusCell(rowIndex + (event.shiftKey ? -1 : 1), columnIndex);
      return;
    }

    if (event.key === "Tab") {
      event.preventDefault();
      focusCell(rowIndex, columnIndex + (event.shiftKey ? -1 : 1));
      return;
    }

    if (event.key === "Home") {
      event.preventDefault();
      focusCell(rowIndex, 0, event.shiftKey);
      return;
    }

    if (event.key === "End") {
      event.preventDefault();
      focusCell(rowIndex, columns.length - 1, event.shiftKey);
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (event.shiftKey) {
        extendSelectionBy(1, 0);
      } else {
        focusCell(rowIndex + 1, columnIndex);
      }
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (event.shiftKey) {
        extendSelectionBy(-1, 0);
      } else {
        focusCell(rowIndex - 1, columnIndex);
      }
      return;
    }

    if (event.key === "ArrowRight") {
      event.preventDefault();
      if (event.shiftKey) {
        extendSelectionBy(0, 1);
      } else {
        focusCell(rowIndex, columnIndex + 1);
      }
      return;
    }

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      if (event.shiftKey) {
        extendSelectionBy(0, -1);
      } else {
        focusCell(rowIndex, columnIndex - 1);
      }
      return;
    }

    if (event.key === "Delete" || event.key === "Backspace") {
      event.preventDefault();
      if (selectedCellCount > 1) {
        clearSelectedRange();
      } else {
        updateCell(rowIndex, columns[columnIndex].key, "");
      }
    }
  };

  const handleSpreadsheetNavigationKeyDown = (rowIndex, columnIndex) => (event) => {
    const navigationKeys = ["ArrowDown", "ArrowUp", "ArrowRight", "ArrowLeft"];
    const isNavigationKey = navigationKeys.includes(event.key);
    const isCtrlNavigation = isNavigationKey && (event.ctrlKey || event.metaKey);

    if (!isNavigationKey && event.key !== "Escape") return;

    if (isEditingCell(rowIndex, columnIndex) && !event.shiftKey && !isCtrlNavigation) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    event.nativeEvent?.stopImmediatePropagation?.();

    activeCellRef.current = { rowIndex, columnIndex };
    setActiveCell({ rowIndex, columnIndex });

    if (event.key === "Escape") {
      collapseSelectionToActiveCell();
      return;
    }

    const directionMap = {
      ArrowDown: { rowStep: 1, columnStep: 0 },
      ArrowUp: { rowStep: -1, columnStep: 0 },
      ArrowRight: { rowStep: 0, columnStep: 1 },
      ArrowLeft: { rowStep: 0, columnStep: -1 },
    };
    const direction = directionMap[event.key];

    if (isCtrlNavigation) {
      const target = findCtrlArrowTarget(rowIndex, columnIndex, event.key);
      focusCell(target.rowIndex, target.columnIndex, event.shiftKey);
      return;
    }

    focusCell(
      rowIndex + direction.rowStep,
      columnIndex + direction.columnStep,
      event.shiftKey
    );
  };

  const handleTableWrapKeyDown = (event) => {
    if (
      !event.shiftKey ||
      !["ArrowDown", "ArrowUp", "ArrowRight", "ArrowLeft"].includes(event.key)
    ) {
      return;
    }

    if (event.target?.dataset?.bulkCell) return;

    event.preventDefault();

    if (event.key === "ArrowDown") extendSelectionBy(1, 0);
    if (event.key === "ArrowUp") extendSelectionBy(-1, 0);
    if (event.key === "ArrowRight") extendSelectionBy(0, 1);
    if (event.key === "ArrowLeft") extendSelectionBy(0, -1);
  };

  const selectCell = (rowIndex, columnIndex, shouldExtendSelection = false) => {
    setActiveCell({ rowIndex, columnIndex });
    if (!shouldExtendSelection) {
      selectionModeRef.current = "cell";
      selectionAnchorRef.current = { rowIndex, columnIndex };
    }

    setSelectedRange(() =>
      shouldExtendSelection
        ? {
            start: selectionAnchorRef.current,
            end: { rowIndex, columnIndex },
          }
        : {
            start: { rowIndex, columnIndex },
            end: { rowIndex, columnIndex },
          }
    );
  };

  const handleCellMouseDown = (rowIndex, columnIndex) => (event) => {
    if (event.button !== 0) return;

    if (event.target.tagName === "SELECT" && !event.shiftKey) {
      isSelectingRef.current = false;
      return;
    }

    event.preventDefault();
    isSelectingRef.current = true;
    selectionStartRef.current = event.shiftKey
      ? selectionAnchorRef.current
      : { rowIndex, columnIndex };
    selectCell(rowIndex, columnIndex, event.shiftKey);

    window.requestAnimationFrame(() => {
      document.querySelector(getCellSelector(rowIndex, columnIndex))?.focus();
    });
  };

  const handleCellMouseUp = () => {
    isSelectingRef.current = false;
  };

  const handleCellFocus = (rowIndex, columnIndex) => () => {
    if (isProgrammaticFocusRef.current) return;
    if (isSelectingRef.current) return;
    selectCell(rowIndex, columnIndex);
  };

  const isCellSelected = (rowIndex, columnIndex) => {
    const range = getNormalizedRange(selectedRange);

    return (
      rowIndex >= range.startRow &&
      rowIndex <= range.endRow &&
      columnIndex >= range.startColumn &&
      columnIndex <= range.endColumn
    );
  };

  const handleCellContextMenu = (rowIndex, columnIndex) => (event) => {
    event.preventDefault();
    openContextMenu(rowIndex, columnIndex, event.clientX, event.clientY);
  };

  const addRows = () => {
    setRows((currentRows) => {
      recordHistory(currentRows);
      return [...currentRows, ...createRows(5)];
    });
    clearPriceCheck();
    setStatus("");
  };

  const removeEmptyRows = () => {
    const compactRows = filledRows.length > 0 ? filledRows : createRows(1);
    recordHistory(rows);
    setRows(compactRows);
    clearPriceCheck();
    setStatus("Baris kosong dibersihkan.");
  };

  const resetDraft = () => {
    recordHistory(rows);
    setRows(createRows(12));
    localStorage.removeItem(storageKey);
    clearPriceCheck();
    setStatus("Draft direset.");
  };

  const saveDraft = () => {
    localStorage.setItem(storageKey, JSON.stringify(filledRows));
    recordHistory(rows);
    setRows(filledRows.length > 0 ? filledRows : createRows(12));
    setStatus("Draft tersimpan.");
  };

  const copyAllFilledRows = async () => {
    if (filledRows.length === 0) return;

    await navigator.clipboard.writeText(formatRowsForClipboard(filledRows));
    setStatus(`${filledRows.length} baris dicopy.`);
  };

  const handleSpreadsheetShortcutKeyDown = (event) => {
    if (!(event.ctrlKey || event.metaKey)) return;

    if (event.key.toLowerCase() === "d") {
      event.preventDefault();
      event.stopPropagation();
      event.nativeEvent?.stopImmediatePropagation?.();
      fillSelectionDown();
    }
  };

  const openPriceListCheck = () => {
    if (priceCheckRowsWithIndex.length === 0) {
      clearPriceCheck();
      setStatus(t("priceList.bulk.priceCheckRequirements"));
      return;
    }

    const groupedByName = new Map();

    priceCheckRowsWithIndex.forEach(({ row, rowIndex }) => {
      const name = getProductName(row);
      const key = `${normalizeDuplicateKey(row.category)}|${normalizeDuplicateKey(name)}`;
      const current = groupedByName.get(key) || {
        name,
        customer: `${row.category || ""}`.trim(),
        rows: [],
      };

      current.rows.push(rowIndex + 1);
      groupedByName.set(key, current);
    });

    const items = [...groupedByName.values()];

    setPriceCheckItems(items);
    setActivePriceCheck(null);
    setPriceSearchResults([]);
    setStatus(t("priceList.bulk.priceCheckReady", { count: items.length }));
  };

  const searchPriceListItem = async (item) => {
    if (!item.customer) {
      setPriceSearchResults([]);
      setStatus("Customer wajib diisi untuk cek price list.");
      return;
    }

    setActivePriceCheck(item);
    setPriceSearchResults([]);
    setIsCheckingDuplicates(true);
    setIsSearchingPriceList(true);
    setStatus(`Search price list: ${item.name}`);

    try {
      const response = await apiClient.get("/product", {
        params: {
          search: item.name,
          category: item.customer,
          perPage: 8,
          page: 1,
        },
      });

      setPriceSearchResults(response.data?.productCards || []);
      setStatus(`${response.data?.productCards?.length || 0} hasil ditemukan.`);
    } catch (err) {
      setPriceSearchResults([]);
      setStatus(err.response?.data?.message || "Search price list gagal.");
    } finally {
      setIsCheckingDuplicates(false);
      setIsSearchingPriceList(false);
    }
  };

  const submitRows = async () => {
    if (isSubmitting) return;

    if (validRows.length === 0) {
      const firstInvalidRowIndex = rows.findIndex(
        (row) => isRowFilled(row) && !isBulkRowValid(row)
      );
      const firstInvalidRow = rows[firstInvalidRowIndex];
      const missingKeys = firstInvalidRow ? getBulkMissingKeys(firstInvalidRow) : [];
      const missingLabels = missingKeys
        .map((key) => columns.find((column) => column.key === key)?.label)
        .filter(Boolean)
        .join(", ");

      setStatus(
        firstInvalidRow
          ? `Baris ${firstInvalidRowIndex + 1} belum lengkap: ${missingLabels}.`
          : "Belum ada item yang bisa disubmit."
      );
      return;
    }

    setIsSubmitting(true);
    setStatus(`Submit ${validRows.length} item...`);

    try {
      await addProductsBulk(
        validRows.map((row) => ({
          name: getProductName(row),
          sell_price: Number(row.sell_price),
          sell_date: getProductSellDate(row),
          unit: row.unit.trim(),
          category: row.category.trim(),
          description: `${row.description || ""}`.trim(),
          productDetails: [
            {
              source: getProductSource(row),
              date: getProductBuyDate(row),
              buy_price: Number(getProductBuyPrice(row)),
            },
          ],
        }))
      );

      const remainingRows = rows.filter(
        (row) => isRowFilled(row) && !isBulkRowValid(row)
      );

      if (remainingRows.length > 0) {
        localStorage.setItem(storageKey, JSON.stringify(remainingRows));
      } else {
        localStorage.removeItem(storageKey);
      }

      setRows(
        remainingRows.length > 0
          ? [...remainingRows, ...createRows(5)]
          : createRows(12)
      );
      clearPriceCheck();
      setStatus(
        `${validRows.length} item berhasil masuk backend${
          invalidRows > 0 ? `, ${invalidRows} baris belum lengkap tetap di draft.` : "."
        }`
      );
    } catch (err) {
      setStatus(err.response?.data?.message || "Submit gagal.");
    } finally {
      setIsSubmitting(false);
    }
  };

  submitRowsRef.current = submitRows;

  return (
    <section className="bulk_page">
      <div className="bulk_header">
        <div className="bulk_heading">
          <span className="bulk_heading_icon"><ClipboardList aria-hidden="true" /></span>
          <div><h2>{t("priceList.bulk.title")}</h2>
          <p>{t("priceList.bulk.description")}</p></div>
        </div>
        <div className="bulk_actions bulk_primary_actions">
          <button type="button" onClick={saveDraft} disabled={isSubmitting}>
            <Save aria-hidden="true" />{t("priceList.bulk.saveDraft")}
          </button>
          <button
            type="button"
            className="submit_action"
            onClick={submitRows}
            disabled={isSubmitting || validRows.length === 0}
          >
            {isSubmitting ? <Loader2 className="bulk_spinner" aria-hidden="true" /> : <Send aria-hidden="true" />}
            {isSubmitting ? t("priceList.bulk.submitting") : t("priceList.bulk.submit", { count: validRows.length })}
          </button>
        </div>
      </div>

      <div className="bulk_stats">
        <div><ClipboardList aria-hidden="true" /><span>{t("priceList.bulk.filled")}<strong>{filledRows.length}</strong></span></div>
        <div className="bulk_stat_ready"><CheckCircle2 aria-hidden="true" /><span>{t("priceList.bulk.ready")}<strong>{validRows.length}</strong></span></div>
        <div className={invalidRows > 0 ? "bulk_stat_warning" : ""}><TriangleAlert aria-hidden="true" /><span>{t("priceList.bulk.incomplete")}<strong>{invalidRows}</strong></span></div>
      </div>

      <div className="bulk_editor">
      <div className="bulk_editor_toolbar">
        <div className="bulk_actions">
          <button type="button" onClick={addRows} disabled={isSubmitting}><Plus aria-hidden="true" />{t("priceList.bulk.addRows")}</button>
          <button type="button" onClick={copyAllFilledRows} disabled={filledRows.length === 0 || isSubmitting}><Copy aria-hidden="true" />{t("priceList.bulk.copyRows")}</button>
          <button type="button" onClick={removeEmptyRows} disabled={isSubmitting}><Eraser aria-hidden="true" />{t("priceList.bulk.removeEmpty")}</button>
          <button type="button" className="bulk_reset_action" onClick={resetDraft} disabled={isSubmitting}><RotateCcw aria-hidden="true" />{t("priceList.bulk.reset")}</button>
        </div>
        <div className="bulk_actions"><button type="button" className="primary_action" onClick={openPriceListCheck} disabled={isCheckingDuplicates || isSubmitting || filledRows.length === 0}>
          {isCheckingDuplicates ? <Loader2 className="bulk_spinner" aria-hidden="true" /> : <Search aria-hidden="true" />}{t("priceList.bulk.checkPrices")}
        </button></div>
      </div>
      <div
        className="bulk_table_wrap"
        ref={tableWrapRef}
        onKeyDownCapture={handleSpreadsheetShortcutKeyDown}
      >
        <div className="app-spreadsheet app-spreadsheet--bulk" ref={spreadsheetRootRef} />
      </div>
      <div className="bulk_editor_footer"><span><Keyboard aria-hidden="true" />{t("priceList.bulk.pasteHint")}</span><span>{t("priceList.bulk.selectedCells", { count: selectedCellCount })}</span></div>
      </div>
      {status && <div className="bulk_status" role="status" aria-live="polite">{status}</div>}

      {priceCheckItems.length > 0 && (
        <div className="price_check_panel">
          <div className="price_check_list">
            <div className="price_check_header">
              <strong>{t("priceList.bulk.draftItems")}</strong>
              <span>{priceCheckItems.length}</span>
            </div>
            <div className="price_check_buttons">
              {priceCheckItems.map((item) => (
                <button
                  type="button"
                  key={`${item.customer}-${item.name}`}
                  className={
                    activePriceCheck?.name === item.name &&
                    activePriceCheck?.customer === item.customer
                      ? "active_price_check"
                      : ""
                  }
                  onClick={() => searchPriceListItem(item)}
                  aria-pressed={activePriceCheck?.name === item.name && activePriceCheck?.customer === item.customer}
                >
                  <span>{item.name}</span>
                  <small>
                    {item.customer} · {t("priceList.bulk.rows", { rows: item.rows.join(", ") })}
                  </small>
                </button>
              ))}
            </div>
          </div>

          <div className="price_check_results">
            <div className="price_check_header">
              <strong>{t("priceList.bulk.results")}</strong>
              <div className="price_check_result_actions"><span>{t("priceList.bulk.resultCount", { count: priceSearchResults.length })}</span><button type="button" onClick={clearPriceCheck} aria-label={t("priceList.bulk.closeResults")}><X aria-hidden="true" /></button></div>
            </div>

            {isSearchingPriceList && <div className="bulk_empty_state" role="status"><Loader2 className="bulk_spinner" aria-hidden="true" /><p>{t("priceList.bulk.searching")}</p></div>}
            {!activePriceCheck && !isSearchingPriceList && <div className="bulk_empty_state"><Search aria-hidden="true" /><p>{t("priceList.bulk.chooseItem")}</p></div>}
            {activePriceCheck && priceSearchResults.length === 0 && !isSearchingPriceList && (
              <div className="bulk_empty_state"><Search aria-hidden="true" /><p>{t("priceList.bulk.noResults", { name: activePriceCheck.name })}</p></div>
            )}

            {priceSearchResults.length > 0 && !isSearchingPriceList && (
              <div className="price_result_scroll">
              <table className="price_result_table">
                <thead>
                  <tr>
                    <th>{t("priceList.field.photo")}</th>
                    <th>{t("priceList.field.namaBarang")}</th>
                    <th>{t("priceList.field.hargaJual")}</th>
                    <th>{t("priceList.field.tanggalJual")}</th>
                    <th>{t("priceList.field.tanggalBeli")}</th>
                  </tr>
                </thead>
                <tbody>
                  {priceSearchResults.map((product) => (
                    <tr key={product._id}>
                      <td>
                        <PriceListImage
                          className="price_result_image"
                          filename={product.images?.[0]}
                          alt={product.name}
                        />
                      </td>
                      <td>{product.name}</td>
                      <td>{new Intl.NumberFormat(locale === "en" ? "en-US" : "id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Number(product.sell_price || 0))}</td>
                      <td>{formatDisplayDate(product.sell_date)}</td>
                      <td>
                        {product.productDetails?.[0]?.date
                          ? formatDisplayDate(product.productDetails[0].date)
                          : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            )}
          </div>
        </div>
      )}
      {contextMenu && (
        <div
          className="bulk_context_menu"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(event) => event.stopPropagation()}
        >
          <button type="button" onClick={copySelectionToClipboard}>
            Copy
          </button>
          <button type="button" onClick={cutSelectionToClipboard}>
            Cut
          </button>
          <button
            type="button"
            onClick={() => {
              clearSelectedRange();
              setContextMenu(null);
            }}
          >
            Clear
          </button>
          <button type="button" onClick={deleteRowsOrColumns}>
            Delete Row/Column
          </button>
        </div>
      )}
    </section>
  );
};

export default BulkProductDraft;
