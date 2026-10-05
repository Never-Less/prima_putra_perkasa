"use client";

import { X } from "lucide-react";
import { useI18n } from "../../_i18n/provider";
import { splitSupplierTags } from "../_lib/supplier-documents";

export function SupplierTagInput({ id, value, onChange, placeholder, required, disabled, invalid, describedBy }: {
  id: string; value: string; onChange: (value: string) => void; placeholder?: string;
  required?: boolean; disabled?: boolean; invalid?: boolean; describedBy?: string;
}) {
  const { t } = useI18n();
  const parts = value.split(/[,\n]/);
  const draft = parts.pop() || "";
  const tags = splitSupplierTags(parts.join(","));
  const values = splitSupplierTags(value);
  const tooLong = values.length > 50 || values.some((tag) => tag.length > 100);
  const commit = () => onChange(values.length ? `${values.join(",")},` : "");
  return <div className="mt-2">
    <div className={`flex min-h-14 flex-wrap items-center gap-2 rounded-xl border bg-white p-2.5 shadow-sm transition focus-within:border-sky-500 focus-within:ring-2 focus-within:ring-sky-500/15 dark:bg-slate-900 ${invalid || tooLong ? "border-red-400" : "border-slate-200 dark:border-slate-700"}`}>
      {tags.map((tag, index) => <span key={tag.toLocaleLowerCase()} className="inline-flex max-w-full items-center gap-1 rounded-lg bg-sky-50 py-1 pl-2.5 pr-1 text-sm font-medium text-sky-800 ring-1 ring-inset ring-sky-200 dark:bg-sky-950 dark:text-sky-200 dark:ring-sky-800">
        <span className="break-all">{tag}</span>
        <button type="button" disabled={disabled} aria-label={t("supplierOnboarding.removeTag", { name: tag })} onClick={() => onChange(`${tags.filter((_, i) => i !== index).join(",")}${tags.length > 1 ? "," : ""}${draft}`)} className="rounded-md p-1 hover:bg-sky-100 focus-visible:outline-2 focus-visible:outline-sky-600 disabled:opacity-50 dark:hover:bg-sky-900"><X size={14} aria-hidden="true" /></button>
      </span>)}
      <input id={id} value={draft} disabled={disabled} required={required && !tags.length} placeholder={placeholder || t("supplierOnboarding.tagPlaceholder")} aria-invalid={invalid || tooLong} aria-describedby={[describedBy, `${id}-tags-hint`, tooLong ? `${id}-tags-error` : ""].filter(Boolean).join(" ")} className="min-w-0 flex-[1_1_160px] bg-transparent px-1 py-1.5 text-sm outline-none placeholder:text-slate-400"
        onChange={(event) => onChange(`${tags.length ? `${tags.join(",")},` : ""}${event.target.value.replace(/\n/g, ",")}`)} onBlur={commit}
        onKeyDown={(event) => {
          if (event.nativeEvent.isComposing) return;
          if (event.key === "Enter" || event.key === ",") { event.preventDefault(); commit(); }
          if (event.key === "Backspace" && !draft && tags.length) { event.preventDefault(); onChange(tags.length > 1 ? `${tags.slice(0, -1).join(",")},` : ""); }
        }} />
    </div>
    <div id={`${id}-tags-hint`} className="mt-2 flex justify-between gap-3 text-xs leading-5 text-slate-500 dark:text-slate-400"><span>{t("supplierOnboarding.tagHint")}</span><span className="shrink-0 tabular-nums">{values.length}/50</span></div>
    {tooLong ? <p id={`${id}-tags-error`} role="alert" className="mt-1 text-xs text-red-600">{t("supplierOnboarding.tagLimit")}</p> : null}
  </div>;
}
