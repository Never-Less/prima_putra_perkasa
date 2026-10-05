"use client";

import { useId, useRef, useState } from "react";
import { Download, FileText, UploadCloud, X } from "lucide-react";
import { useI18n } from "../../_i18n/provider";
import { requestApiBlob } from "../../_lib/api-client";
import { maxSupplierFiles, maxSupplierFileSize, type SupplierDocument } from "../_lib/supplier-documents";

const fileSize = (size: number) => size < 1024 * 1024 ? `${Math.max(1, Math.round(size / 1024))} KB` : `${(size / (1024 * 1024)).toFixed(2)} MB`;

export function SupplierDocumentPicker({ files, onChange, disabled }: { files: File[]; onChange: (files: File[]) => void; disabled?: boolean }) {
  const { t } = useI18n();
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  function addFiles(incoming: File[]) {
    if (disabled) return;
    const additions = incoming.filter((file, index) => !files.some((old) => old.name === file.name && old.size === file.size && old.lastModified === file.lastModified)
      && incoming.findIndex((other) => other.name === file.name && other.size === file.size && other.lastModified === file.lastModified) === index);
    if (files.length + additions.length > maxSupplierFiles || additions.some((file) => !/\.pdf$/i.test(file.name) || (file.type && file.type !== "application/pdf") || !file.size || file.size > maxSupplierFileSize)) {
      setError("supplierOnboarding.error.documents"); return;
    }
    setError(""); onChange([...files, ...additions]);
  }
  return <div className="space-y-3">
    <input ref={input} type="file" multiple accept="application/pdf,.pdf" className="sr-only" tabIndex={-1} disabled={disabled} aria-label={t("supplierOnboarding.chooseDocuments")} onChange={(event) => { addFiles(Array.from(event.target.files || [])); event.target.value = ""; }} />
    <button type="button" disabled={disabled} onClick={() => input.current?.click()} aria-describedby={`${id}-hint`} onDragOver={(event) => { event.preventDefault(); if (!disabled) setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); setDragging(false); addFiles(Array.from(event.dataTransfer.files)); }} className={`flex w-full flex-col items-center rounded-xl border-2 border-dashed px-4 py-7 text-center transition focus-visible:outline-2 focus-visible:outline-sky-600 disabled:cursor-not-allowed disabled:opacity-50 ${dragging ? "border-sky-500 bg-sky-100 dark:bg-sky-950" : "border-sky-200 bg-sky-50/50 hover:border-sky-400 hover:bg-sky-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"}`}>
      <span className="mb-3 rounded-xl bg-white p-3 text-sky-600 shadow-sm dark:bg-slate-800 dark:text-sky-300"><UploadCloud size={24} aria-hidden="true" /></span>
      <span className="text-sm font-semibold text-sky-900 dark:text-sky-100">{t("supplierOnboarding.chooseDocuments")}</span>
      <span className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t("supplierOnboarding.dropDocuments")}</span>
    </button>
    <p id={`${id}-hint`} className="text-xs leading-5 text-slate-500 dark:text-slate-400">{t("supplierOnboarding.documentsHint")}</p>
    {files.length ? <ul className="space-y-2">{files.map((file, index) => <li key={`${file.name}-${index}`} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
      <FileText size={22} aria-hidden="true" className="shrink-0 text-sky-600" /><div className="min-w-0 flex-1"><p className="break-words text-sm font-medium">{file.name}</p><p className="mt-0.5 text-xs text-slate-500">{fileSize(file.size)} · {t("supplierOnboarding.fileReady")}</p></div>
      <button type="button" disabled={disabled} aria-label={t("supplierOnboarding.removeDocument", { name: file.name })} className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-50" onClick={() => { onChange(files.filter((_, i) => i !== index)); setError(""); }}><X size={18} aria-hidden="true" /></button>
    </li>)}</ul> : null}
    {error ? <p role="alert" className="text-sm text-red-700 dark:text-red-300">{t(error)}</p> : null}
  </div>;
}

export function SupplierDocumentList({ supplierId, documents }: { supplierId: string; documents: SupplierDocument[] }) {
  const { t } = useI18n();
  const [busy, setBusy] = useState("");
  const [error, setError] = useState(false);
  async function download(document: SupplierDocument) {
    setBusy(document.id); setError(false);
    try {
      const blob = await requestApiBlob(`/api/suppliers/${encodeURIComponent(supplierId)}/documents/${encodeURIComponent(document.id)}`);
      const url = URL.createObjectURL(blob);
      const link = window.document.createElement("a");
      link.href = url; link.download = document.name; window.document.body.appendChild(link); link.click(); link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch { setError(true); } finally { setBusy(""); }
  }
  if (!documents.length) return null;
  return <div className="space-y-2"><ul className="space-y-2">{documents.map((document) => <li key={document.id} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
    <FileText size={22} aria-hidden="true" className="shrink-0 text-sky-600" /><div className="min-w-0 flex-1"><p className="break-words text-sm font-medium">{document.name}</p><p className="text-xs text-slate-500">{fileSize(document.size)}</p></div><button type="button" disabled={Boolean(busy)} onClick={() => void download(document)} aria-label={t("supplierOnboarding.downloadDocument", { name: document.name })} className="flex shrink-0 items-center gap-2 rounded-lg p-2 text-sm text-sky-700 hover:bg-sky-50 disabled:opacity-50 dark:text-sky-300 dark:hover:bg-sky-950"><Download size={18} aria-hidden="true" /><span className="hidden sm:inline">{t(busy === document.id ? "common.loading" : "supplierOnboarding.download")}</span></button>
  </li>)}</ul>{error ? <p role="alert" className="text-sm text-red-700 dark:text-red-300">{t("supplierOnboarding.error.download")}</p> : null}</div>;
}
