"use client";

import { CircleAlert, CircleCheck, X } from "lucide-react";
import { useEffect } from "react";

type AppToastProps = {
  isOpen: boolean;
  message: string;
  variant: "success" | "error";
  closeLabel: string;
  onClose: () => void;
  autoCloseMs?: number;
  toastKey?: number;
};

export function AppToast({
  isOpen,
  message,
  variant,
  closeLabel,
  onClose,
  autoCloseMs = 2800,
  toastKey = 0,
}: AppToastProps) {
  useEffect(() => {
    if (!isOpen || !message) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      onClose();
    }, autoCloseMs);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [autoCloseMs, isOpen, message, onClose, toastKey]);

  if (!isOpen || !message) {
    return null;
  }

  const isSuccess = variant === "success";
  const role = isSuccess ? "status" : "alert";
  const StatusIcon = isSuccess ? CircleCheck : CircleAlert;

  return (
    <div className="pointer-events-none fixed bottom-4 left-4 right-4 z-[80] w-auto sm:bottom-6 sm:left-auto sm:right-6 sm:w-full sm:max-w-sm">
      <div
        role={role}
        aria-live="polite"
        className={`toast-enter pointer-events-auto rounded-lg border px-3 py-3 shadow-lg ${
          isSuccess
            ? "border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-100"
            : "border-red-300 bg-red-50 text-red-900 dark:border-red-900 dark:bg-red-950/60 dark:text-red-100"
        }`}
      >
        <div className="flex items-start gap-3">
          <StatusIcon aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
          <p className="min-w-0 flex-1 text-sm font-medium leading-5">{message}</p>
          <button
            type="button"
            onClick={onClose}
            aria-label={closeLabel}
            title={closeLabel}
            className="-mr-1 -mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-md hover:bg-black/5 dark:hover:bg-white/10"
          >
            <X aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
