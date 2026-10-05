"use client";

import { ChevronDown } from "lucide-react";
import { useState, type ReactNode } from "react";

type MobileFilterPanelProps = {
  label: string;
  children: ReactNode;
  labelClassName?: string;
};

export function MobileFilterPanel({ label, children, labelClassName = "" }: MobileFilterPanelProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="ppp-filter-panel">
      <button
        type="button"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((current) => !current)}
        className="ppp-filter-toggle mb-3 flex w-full items-center justify-between gap-3 rounded-lg border border-slate-300 bg-white px-3 py-2 text-left text-sm font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 md:hidden"
      >
        <span className="truncate">{label}</span>
        <ChevronDown
          aria-hidden="true"
          className={`h-4 w-4 shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>
      <p className={`ppp-filter-title mb-2 hidden text-sm font-medium md:block ${labelClassName}`}>{label}</p>
      <div className={`ppp-filter-content ${isOpen ? "block" : "hidden"} md:block`}>{children}</div>
    </div>
  );
}
