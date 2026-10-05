import type jspreadsheet from "jspreadsheet-ce";

type Data = jspreadsheet.CellValue[][];
type Selection = [number, number, number, number];
type Snapshot<Row> = { rows: Row[]; data: Data; selection: Selection | null };

export type SpreadsheetActions = {
  undo: () => void;
  redo: () => void;
  insertAbove: () => void;
  insertBelow: () => void;
  deleteRows: () => void;
  fillDown: () => void;
  fillRight: () => void;
};

export type SpreadsheetController<Row> = SpreadsheetActions & {
  attach: (worksheet: jspreadsheet.WorksheetInstance) => void;
  capture: () => void;
  replaceRows: (rows: Row[]) => void;
  resetRows: (rows: Row[]) => void;
  destroy: () => void;
  contextMenu: NonNullable<jspreadsheet.SpreadsheetOptions["contextMenu"]>;
};

/** Own the domain-row history: Jspreadsheet.setData resets native history, and
 * matrix-only history cannot restore deleted invoice source references. */
export function createSpreadsheetController<Row>({
  root, rows, toData, fromData, onRowsChange, t, onSubmit,
}: {
  root: HTMLElement;
  rows: Row[];
  toData: (rows: Row[]) => Data;
  fromData: (data: Data, previous: Row[]) => Row[];
  onRowsChange: (rows: Row[]) => void;
  t: (key: string) => string;
  onSubmit?: () => void;
}): SpreadsheetController<Row> {
  let worksheet: jspreadsheet.WorksheetInstance | null = null;
  let applying = false;
  let pending = false;
  let destroyed = false;
  const clone = <T,>(value: T): T => structuredClone(value);
  const signature = (data: Data) => JSON.stringify(data.map((row) => row.map((cell) => String(cell ?? ""))));
  let current: Snapshot<Row> = { rows: clone(rows), data: clone(toData(rows)), selection: null };
  let undoStack: Snapshot<Row>[] = [];
  let redoStack: Snapshot<Row>[] = [];
  const editable = () => worksheet?.options.editable !== false;
  const selection = (): Selection | null => {
    const selected = worksheet?.getSelection();
    return selected ? [...selected] as Selection : null;
  };
  const range = () => {
    const selected = selection();
    return selected ? {
      left: Math.min(selected[0], selected[2]), right: Math.max(selected[0], selected[2]),
      top: Math.min(selected[1], selected[3]), bottom: Math.max(selected[1], selected[3]),
    } : null;
  };

  function render(snapshot: Snapshot<Row>) {
    if (!worksheet || destroyed) return;
    applying = true;
    try {
      if (signature(worksheet.getData(false, true)) !== signature(snapshot.data)) {
        worksheet.setData(clone(snapshot.data));
      }
      const selected = snapshot.selection;
      if (selected) {
        const lastRow = Math.max((worksheet.options.data?.length || 0) - 1, 0);
        const lastColumn = Math.max((worksheet.options.columns?.length || 1) - 1, 0);
        worksheet.updateSelectionFromCoords(
          Math.min(selected[0], lastColumn), Math.min(selected[1], lastRow),
          Math.min(selected[2], lastColumn), Math.min(selected[3], lastRow),
        );
      }
    } finally { applying = false; }
  }

  function normalizedData(nextRows: Row[], minimumRows = 0) {
    const data = clone(toData(nextRows));
    const width = worksheet?.options.columns?.length || data[0]?.length || 1;
    const minimum = Math.max(minimumRows, worksheet?.options.minDimensions?.[1] || 0);
    while (data.length < minimum) data.push(Array.from({ length: width }, () => ""));
    return data;
  }

  function commit(next: Snapshot<Row>, notify: boolean) {
    if (signature(current.data) !== signature(next.data)) {
      undoStack = [...undoStack.slice(-99), clone(current)];
      redoStack = [];
    }
    current = clone(next);
    render(current);
    if (notify) onRowsChange(clone(current.rows));
  }

  function flush() {
    if (!pending || !worksheet || destroyed) return;
    pending = false;
    const rawData = worksheet.getData(false, true);
    const nextRows = fromData(clone(rawData), clone(current.rows));
    commit({ rows: nextRows, data: normalizedData(nextRows, rawData.length), selection: selection() }, true);
  }

  function capture() {
    if (applying || destroyed || pending) return;
    pending = true;
    // A paste may insert rows and then write cells. Treat that as one undo step.
    queueMicrotask(flush);
  }

  function finishEditing() {
    if (worksheet?.edition) worksheet.closeEditor(worksheet.edition[0], true);
    flush();
  }

  function undo() {
    if (!editable()) return;
    finishEditing();
    const previous = undoStack.pop();
    if (!previous) return;
    redoStack.push(clone(current));
    current = previous;
    render(current);
    onRowsChange(clone(current.rows));
  }

  function redo() {
    if (!editable()) return;
    finishEditing();
    const next = redoStack.pop();
    if (!next) return;
    undoStack.push(clone(current));
    current = next;
    render(current);
    onRowsChange(clone(current.rows));
  }

  function insert(before: boolean) {
    if (!worksheet || !editable() || worksheet.options.allowInsertRow === false) return;
    finishEditing();
    const selected = range();
    const index = selected ? (before ? selected.top : selected.bottom) : Math.max((worksheet.options.data?.length || 0) - 1, 0);
    worksheet.insertRow(1, index, before ? 1 : 0);
    capture();
  }

  function deleteRows() {
    if (!worksheet || !editable() || worksheet.options.allowDeleteRow === false) return;
    finishEditing();
    const selected = range();
    if (!selected) return;
    worksheet.deleteRow(selected.top, selected.bottom - selected.top + 1);
    capture();
  }

  function fill(direction: "down" | "right" | "selection") {
    if (!worksheet || !editable()) return;
    finishEditing();
    const selected = range();
    if (!selected) return;
    const changes: Array<{ x: number; y: number; value: jspreadsheet.CellValue }> = [];
    for (let y = selected.top; y <= selected.bottom; y++) {
      for (let x = selected.left; x <= selected.right; x++) {
        if (worksheet.isReadOnly(x, y)) continue;
        if (direction === "down" && y === selected.top) continue;
        if (direction === "right" && x === selected.left) continue;
        changes.push({ x, y, value: worksheet.getValueFromCoords(direction === "down" ? x : selected.left, direction === "right" ? y : selected.top) ?? "" });
      }
    }
    if (changes.length) { worksheet.setValue(changes); capture(); }
  }

  function keydown(event: KeyboardEvent) {
    if (!worksheet || destroyed || event.defaultPrevented) return;
    const target = event.target;
    if (!(target instanceof Node) || !root.contains(target)) return;
    // Keep native text editing, including clipboard and text undo, inside the editor.
    if (worksheet.edition) return;
    const command = event.ctrlKey || event.metaKey;
    const key = event.key.toLowerCase();
    let action: (() => void) | undefined;
    if (command && !event.altKey) {
      if (key === "z") action = event.shiftKey ? redo : undo;
      else if (key === "y") action = redo;
      else if (key === "d") action = () => fill("down");
      else if (key === "r") action = () => fill("right");
      else if (key === "enter") action = onSubmit || (() => fill("selection"));
      else if (key === "+" || (key === "=" && event.shiftKey)) action = () => insert(true);
      else if (key === "-") action = deleteRows;
      else if (key === " ") action = () => { const selected = range(); if (selected) worksheet?.updateSelectionFromCoords(selected.left, 0, selected.right, (worksheet.options.data?.length || 0) - 1); };
    } else if (event.shiftKey && key === " ") {
      action = () => { const selected = range(); if (selected) worksheet?.updateSelectionFromCoords(0, selected.top, (worksheet.options.columns?.length || 1) - 1, selected.bottom); };
    }
    if (action) {
      event.preventDefault();
      event.stopImmediatePropagation();
      action();
    }
  }

  const contextMenu: SpreadsheetController<Row>["contextMenu"] = (_instance, _x, y, _event, items) => {
    flush();
    if (!selection() && y !== null) worksheet?.updateSelectionFromCoords(0, Number(y));
    const menu: jspreadsheet.ContextMenuItem[] = [];
    if (editable()) {
      menu.push(
        { title: t("spreadsheet.undo"), shortcut: "Ctrl+Z", disabled: !undoStack.length, onclick: undo },
        { title: t("spreadsheet.redo"), shortcut: "Ctrl+Y", disabled: !redoStack.length, onclick: redo },
        { type: "line", title: "" },
        { title: t("spreadsheet.insertAbove"), onclick: () => insert(true) },
        { title: t("spreadsheet.insertBelow"), onclick: () => insert(false) },
        { title: t("spreadsheet.deleteRows"), shortcut: "Ctrl+-", onclick: deleteRows },
        { type: "line", title: "" },
      );
    }
    for (const item of items) {
      if (item.shortcut === "Ctrl + C") menu.push({ ...item, title: t("spreadsheet.copy") });
      if (item.shortcut === "Ctrl + V" && editable()) menu.push({ ...item, title: t("spreadsheet.paste") });
    }
    menu.push({ title: t("spreadsheet.selectAll"), shortcut: "Ctrl+A", onclick: () => worksheet?.selectAll() });
    if (editable()) menu.push(
      { type: "line", title: "" },
      { title: t("spreadsheet.fillDown"), shortcut: "Ctrl+D", onclick: () => fill("down") },
      { title: t("spreadsheet.fillRight"), shortcut: "Ctrl+R", onclick: () => fill("right") },
    );
    return menu;
  };

  return {
    undo, redo, insertAbove: () => insert(true), insertBelow: () => insert(false), deleteRows,
    fillDown: () => fill("down"), fillRight: () => fill("right"), capture, contextMenu,
    attach(instance) {
      worksheet = instance;
      current.data = clone(instance.getData(false, true));
      // Native keyboard/menu calls also use our domain-aware history.
      instance.undo = undo;
      instance.redo = redo;
      root.addEventListener("keydown", keydown, true);
    },
    replaceRows(nextRows) {
      if (destroyed) return;
      flush();
      // React echoes may trim trailing blank rows. Keep manually inserted grid rows.
      if (signature(toData(nextRows)) === signature(toData(current.rows))) {
        current.rows = clone(nextRows);
        return;
      }
      commit({ rows: nextRows, data: normalizedData(nextRows), selection: selection() }, false);
    },
    resetRows(nextRows) {
      pending = false;
      undoStack = []; redoStack = [];
      current = { rows: clone(nextRows), data: normalizedData(nextRows), selection: null };
      render(current);
      onRowsChange(clone(nextRows));
    },
    destroy() { destroyed = true; pending = false; root.removeEventListener("keydown", keydown, true); },
  };
}
