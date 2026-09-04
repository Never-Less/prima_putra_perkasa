"use client";

type PostSaveActionModalProps = {
  isOpen: boolean;
  title: string;
  description: string;
  showExportButton?: boolean;
  showCreatePembelianButton: boolean;
  exportLabel: string;
  createPembelianLabel: string;
  closeLabel: string;
  onExport: () => void;
  onCreatePembelian: () => void;
  onClose: () => void;
};

export function PostSaveActionModal({
  isOpen,
  title,
  description,
  showExportButton = true,
  showCreatePembelianButton,
  exportLabel,
  createPembelianLabel,
  closeLabel,
  onExport,
  onCreatePembelian,
  onClose,
}: PostSaveActionModalProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="modal-backdrop-enter fixed inset-0 z-[72] flex items-center justify-center bg-slate-900/35 p-4">
      <div className="modal-panel-enter w-full max-w-md rounded-lg border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-800 dark:bg-slate-950">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{description}</p>

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800 sm:w-auto"
          >
            {closeLabel}
          </button>
          {showExportButton ? (
            <button
              type="button"
              onClick={onExport}
              className="w-full rounded-lg border border-sky-300 bg-sky-700 px-4 py-2 text-sm text-white hover:bg-sky-600 dark:border-sky-700 dark:bg-sky-500 dark:text-slate-950 dark:hover:bg-sky-400 sm:w-auto"
            >
              {exportLabel}
            </button>
          ) : null}
          {showCreatePembelianButton ? (
            <button
              type="button"
              onClick={onCreatePembelian}
              className="w-full rounded-lg border border-emerald-300 bg-emerald-600 px-4 py-2 text-sm text-white hover:bg-emerald-500 dark:border-emerald-700 dark:bg-emerald-500 dark:text-slate-950 dark:hover:bg-emerald-400 sm:w-auto"
            >
              {createPembelianLabel}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
