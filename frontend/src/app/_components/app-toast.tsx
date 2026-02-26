"use client";

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

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[80] w-full max-w-sm sm:bottom-6 sm:right-6">
      <div
        role={role}
        aria-live="polite"
        className={`toast-enter pointer-events-auto rounded-xl border px-4 py-3 shadow-lg ${
          isSuccess
            ? "border-emerald-300 bg-emerald-50 text-emerald-900"
            : "border-red-300 bg-red-50 text-red-900"
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm font-medium">{message}</p>
          <button
            type="button"
            onClick={onClose}
            className={`rounded-md border px-2 py-1 text-xs ${
              isSuccess
                ? "border-emerald-400 bg-white text-emerald-900 hover:bg-emerald-100"
                : "border-red-400 bg-white text-red-900 hover:bg-red-100"
            }`}
          >
            {closeLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
