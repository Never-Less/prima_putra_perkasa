"use client";

import { useId } from "react";
import { ExternalLink, Plus, X } from "lucide-react";
import { useI18n } from "../../_i18n/provider";
import { isSupplierDocumentUrl, type SupplierDocumentLink } from "../_lib/supplier-documents";

export function SupplierDocumentLinksEditor({ links, onChange, disabled, error }: {
  links: SupplierDocumentLink[];
  onChange: (links: SupplierDocumentLink[]) => void;
  disabled?: boolean;
  error?: string;
}) {
  const { t } = useI18n();
  const id = useId();
  const invalid = links.some((link) => !link.label.trim() || !isSupplierDocumentUrl(link.url.trim()));
  function update(index: number, field: keyof SupplierDocumentLink, value: string) {
    onChange(links.map((link, i) => i === index ? { ...link, [field]: value } : link));
  }
  return <div className="space-y-3 rounded-xl border border-slate-200 p-4 dark:border-slate-700">
    <h3 className="text-sm font-semibold">{t("supplierOnboarding.documentLinksTitle")}</h3>
    <p id={`${id}-hint`} className="text-xs leading-5 text-slate-500 dark:text-slate-400">{t("supplierOnboarding.documentLinksHint")}</p>
    {links.map((link, index) => <div key={index} className="grid items-end gap-3 sm:grid-cols-[1fr_2fr_auto]">
      <label className="text-sm">{t("supplierOnboarding.documentLinkLabel")}<input required maxLength={100} disabled={disabled} value={link.label} onChange={(event) => update(index, "label", event.target.value)} className="erp-field mt-1 w-full" /></label>
      <label className="text-sm">{t("supplierOnboarding.documentLinkUrl")}<input type="url" required maxLength={1000} disabled={disabled} value={link.url} aria-describedby={`${id}-hint`} onChange={(event) => update(index, "url", event.target.value)} placeholder="https://" className="erp-field mt-1 w-full" /></label>
      <button type="button" disabled={disabled} aria-label={t("supplierOnboarding.removeDocumentLink", { name: link.label || String(index + 1) })} onClick={() => onChange(links.filter((_, i) => i !== index))} className="justify-self-end rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"><X size={18} /></button>
    </div>)}
    <button type="button" disabled={disabled || links.length >= 10} onClick={() => onChange([...links, { label: "", url: "" }])} className="inline-flex items-center gap-2 rounded-lg border border-sky-300 px-3 py-2 text-sm text-sky-700 disabled:opacity-50 dark:border-sky-800 dark:text-sky-200"><Plus size={16} />{t("supplierOnboarding.addDocumentLink")}</button>
    {error || invalid ? <p role="alert" className="text-xs text-red-700 dark:text-red-300">{t(error || "supplierOnboarding.error.documentLinks")}</p> : null}
  </div>;
}

export function SupplierDocumentLinksList({ links }: { links: SupplierDocumentLink[] }) {
  const { t } = useI18n();
  const safeLinks = links.filter((link) => isSupplierDocumentUrl(link.url));
  if (!safeLinks.length) return null;
  return <section className="space-y-2"><h3 className="text-sm font-semibold">{t("supplierOnboarding.documentLinksTitle")}</h3><ul className="space-y-2">{safeLinks.map((link) => <li key={`${link.label}\n${link.url}`}><a href={link.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 text-sm text-sky-700 dark:border-slate-700 dark:text-sky-300"><ExternalLink size={18} className="shrink-0" /><span className="min-w-0 break-words">{link.label}<span className="mt-1 block text-xs text-slate-500">{link.url}</span></span></a></li>)}</ul></section>;
}
