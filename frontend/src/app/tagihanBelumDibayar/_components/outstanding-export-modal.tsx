"use client";

import { Download } from "lucide-react";
import { useEffect, useId, useRef } from "react";
import type { CustomerItem } from "../../customer/_lib/customer";
import { useI18n } from "../../_i18n/provider";

type OutstandingExportModalProps = {
  isOpen: boolean;
  years: string[];
  customers: CustomerItem[];
  selectedYear: string;
  selectedCustomerId: string;
  onYearChange: (value: string) => void;
  onCustomerChange: (value: string) => void;
  onExport: () => void;
  onCancel: () => void;
};

export function OutstandingExportModal({
  isOpen,
  years,
  customers,
  selectedYear,
  selectedCustomerId,
  onYearChange,
  onCustomerChange,
  onExport,
  onCancel,
}: OutstandingExportModalProps) {
  const { t } = useI18n();
  const titleId = useId();
  const descriptionId = useId();
  const customerSelectRef = useRef<HTMLSelectElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    customerSelectRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  const canExport = Boolean(selectedYear && selectedCustomerId);

  return (
    <div
      className="modal-backdrop-enter fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/45 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="modal-panel-enter w-full max-w-lg rounded-lg border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-800 dark:bg-slate-950"
      >
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-300">
            <Download aria-hidden="true" className="h-4 w-4" />
          </span>
          <div>
            <h2 id={titleId} className="text-base font-semibold text-slate-900 dark:text-slate-100">
              {t("outstanding.exportModal.title")}
            </h2>
            <p id={descriptionId} className="mt-1.5 text-sm leading-6 text-slate-600 dark:text-slate-300">
              {t("outstanding.exportModal.description")}
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="text-sm text-slate-700 dark:text-slate-200">
            {t("field.tahun")}
            <select
              value={selectedYear}
              onChange={(event) => onYearChange(event.target.value)}
              className="erp-field mt-1 w-full"
            >
              {years.map((year) => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </label>

          <label className="text-sm text-slate-700 dark:text-slate-200">
            {t("field.namaCustomer")}
            <select
              ref={customerSelectRef}
              value={selectedCustomerId}
              onChange={(event) => onCustomerChange(event.target.value)}
              className="erp-field mt-1 w-full"
            >
              <option value="">{t("outstanding.exportModal.selectCustomer")}</option>
              <option value="all">{t("outstanding.exportModal.allCustomers")}</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>{customer.nama}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onCancel} className="erp-button w-full sm:w-auto">
            {t("common.cancel")}
          </button>
          <button
            type="button"
            onClick={onExport}
            disabled={!canExport}
            className="erp-button erp-button-primary w-full disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          >
            {t("outstanding.exportModal.openExport")}
          </button>
        </div>
      </div>
    </div>
  );
}
