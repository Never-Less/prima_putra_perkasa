"use client";

import { AlertTriangle, Info, LoaderCircle } from "lucide-react";
import { useEffect, useId, useRef } from "react";

type ConfirmationModalProps = {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel: string;
  isLoading?: boolean;
  variant?: "default" | "warning" | "danger";
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmationModal({
  isOpen,
  title,
  description,
  confirmLabel,
  cancelLabel,
  isLoading = false,
  variant = "default",
  onConfirm,
  onCancel,
}: ConfirmationModalProps) {
  const titleId = useId();
  const descriptionId = useId();
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    cancelButtonRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isLoading) {
        onCancel();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isLoading, isOpen, onCancel]);

  if (!isOpen) {
    return null;
  }

  const confirmButtonClassName =
    variant === "danger"
      ? "erp-button-danger"
      : "erp-button-primary";
  const StatusIcon = variant === "default" ? Info : AlertTriangle;

  return (
    <div
      className="modal-backdrop-enter fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/45 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isLoading) {
          onCancel();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="modal-panel-enter w-full max-w-md rounded-lg border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-800 dark:bg-slate-950"
      >
        <div className="flex items-start gap-3">
          <span
            className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${
              variant === "danger"
                ? "bg-red-50 text-red-600 dark:bg-red-950/60 dark:text-red-300"
                : variant === "warning"
                  ? "bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-300"
                : "bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-300"
            }`}
          >
            <StatusIcon aria-hidden="true" className="h-4 w-4" />
          </span>
          <div>
            <h3 id={titleId} className="text-base font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
            <p id={descriptionId} className="mt-1.5 text-sm leading-6 text-slate-600 dark:text-slate-300">{description}</p>
          </div>
        </div>

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            ref={cancelButtonRef}
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="erp-button w-full sm:w-auto"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`erp-button w-full sm:w-auto ${confirmButtonClassName}`}
          >
            {isLoading ? <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" /> : null}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
