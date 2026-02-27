"use client";

type PostSaveActionModalProps = {
  isOpen: boolean;
  title: string;
  description: string;
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
      <div className="modal-panel-enter w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
        <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
        <p className="mt-2 text-sm text-slate-600">{description}</p>

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
          >
            {closeLabel}
          </button>
          <button
            type="button"
            onClick={onExport}
            className="rounded-lg border border-sky-300 bg-sky-700 px-4 py-2 text-sm text-white hover:bg-sky-600"
          >
            {exportLabel}
          </button>
          {showCreatePembelianButton ? (
            <button
              type="button"
              onClick={onCreatePembelian}
              className="rounded-lg border border-emerald-300 bg-emerald-600 px-4 py-2 text-sm text-white hover:bg-emerald-500"
            >
              {createPembelianLabel}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
