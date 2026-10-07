"use client";

import { useState } from "react";
import { useI18n } from "../../_i18n/provider";
import { ConfirmationModal } from "../../_components/confirmation-modal";
import { requestUnsavedChangesConfirmation } from "../../_hooks/use-unsaved-changes-warning";
import { type SupplierItem } from "../_lib/supplier";
import { generateSupplierLink, onboardingError, profileFields, supplierOnboardingAction } from "../_lib/supplier-onboarding";
import { SupplierDocumentLinksList } from "./supplier-document-links";
import { SupplierDocumentList } from "./supplier-documents";

const buttonClass = "rounded-lg border border-sky-300 px-4 py-2 text-sm font-medium text-sky-800 hover:bg-sky-50 disabled:opacity-50 dark:border-sky-800 dark:text-sky-200 dark:hover:bg-slate-800";

export function SupplierOnboardingPanel({ item, onChanged, onCompleted }: {
  item: SupplierItem;
  onChanged: () => Promise<void>;
  onCompleted: () => void;
}) {
  const { t, locale } = useI18n();
  const [link, setLink] = useState("");
  const [linkExpiresAt, setLinkExpiresAt] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [confirmGenerate, setConfirmGenerate] = useState(false);
  const [hutang, setHutang] = useState(item.hutang);
  const [lamaHutang, setLamaHutang] = useState(String(item.lamaHutang || ""));
  const onboarding = item.onboarding;
  const status = onboarding.status;
  const pending = onboarding.pendingData;
  const expired = Boolean(onboarding.expiresAt && new Date(onboarding.expiresAt).getTime() < Date.now());
  const formatDate = (value: string) => new Date(value).toLocaleString(locale === "en" ? "en-GB" : "id-ID");

  async function run(action: () => Promise<void>) {
    if (!await requestUnsavedChangesConfirmation(t("common.unsavedChangesWarning"))) return;
    setBusy(true); setError(""); setNotice("");
    try { await action(); } catch (error) { setError(t(onboardingError(error))); } finally { setBusy(false); }
  }

  async function generate() {
    setConfirmGenerate(false);
    await run(async () => {
      const result = await generateSupplierLink(item.id);
      // Fragment keeps the capability out of frontend request/access-log URLs.
      setLink(`${window.location.origin}/supplier-registration#${result.token}`);
      setLinkExpiresAt(result.expiresAt);
      await onChanged();
    });
  }

  return (
    <section className="space-y-4 rounded-2xl border border-sky-200 bg-white p-5 shadow-sm dark:border-sky-900 dark:bg-slate-950">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h2 className="text-lg font-semibold">{t("supplierOnboarding.title")}</h2><p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{t("supplierOnboarding.description")}</p></div>
        <span className="rounded-full bg-sky-100 px-3 py-1 text-sm text-sky-900 dark:bg-sky-950 dark:text-sky-200">{t(`supplierOnboarding.status.${status}`)}</span>
      </div>
      <dl className="grid gap-2 text-sm sm:grid-cols-2">
        {(["generatedAt", "sentAt", "submittedAt", "completedAt", "expiresAt"] as const).map((key) => onboarding[key] ? <div key={key}><dt className="text-slate-500">{t(`supplierOnboarding.${key}`)}</dt><dd>{formatDate(onboarding[key]!)}</dd></div> : null)}
      </dl>
      {expired && (status === "generated" || status === "sent") ? <p className="text-sm text-amber-700 dark:text-amber-300">{t("supplierOnboarding.expired")}</p> : null}
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={busy} className={buttonClass} onClick={() => status === "notGenerated" ? void generate() : setConfirmGenerate(true)}>{t(status === "notGenerated" ? "supplierOnboarding.generate" : "supplierOnboarding.regenerate")}</button>
        {status === "generated" && !expired ? <button type="button" disabled={busy} className={buttonClass} onClick={() => void run(async () => { await supplierOnboardingAction(item.id, "sent", { generatedAt: onboarding.generatedAt }); await onChanged(); setNotice(t("supplierOnboarding.markedSent")); })}>{t("supplierOnboarding.markSent")}</button> : null}
        <button type="button" disabled={busy} className={buttonClass} onClick={() => void run(onChanged)}>{t("supplierOnboarding.refresh")}</button>
      </div>
      {link && linkExpiresAt === onboarding.expiresAt && !expired && (status === "generated" || status === "sent") ? <div className="space-y-2 rounded-xl bg-sky-50 p-4 dark:bg-sky-950/40">
        <label className="block text-sm font-medium">{t("supplierOnboarding.link")}<input readOnly value={link} onFocus={(event) => event.target.select()} className="erp-field mt-1 w-full" /></label>
        <p className="text-sm text-slate-600 dark:text-slate-300">{t("supplierOnboarding.shareHint")}</p>
        <button type="button" className={buttonClass} onClick={() => { void navigator.clipboard.writeText(link).then(() => setNotice(t("supplierOnboarding.copied"))).catch(() => setError(t("supplierOnboarding.copyFailed"))); }}>{t("supplierOnboarding.copy")}</button>
        <a href={link} target="_blank" rel="noreferrer" className={`${buttonClass} ml-2 inline-block`}>{t("supplierOnboarding.open")}</a>
      </div> : null}
      {status === "submitted" && pending ? <form className="space-y-4 border-t border-slate-200 pt-4 dark:border-slate-800" onSubmit={(event) => { event.preventDefault(); void run(async () => {
        await supplierOnboardingAction(item.id, "approve", { submittedAt: onboarding.submittedAt, hutang, lamaHutang: hutang ? Number(lamaHutang) : null });
        onCompleted();
      }); }}>
        <h3 className="font-semibold">{t("supplierOnboarding.reviewTitle")}</h3>
        <p className="text-sm text-slate-600 dark:text-slate-300">{t("supplierOnboarding.reviewHint")}</p>
        <dl className="grid gap-4 rounded-xl bg-slate-50 p-4 sm:grid-cols-2 dark:bg-slate-900">
          {profileFields.map(({ name, label }) => <div key={name} className="min-w-0"><dt className="text-sm text-slate-500">{t(label)}</dt><dd className="mt-1 whitespace-pre-wrap break-words text-sm">{Array.isArray(pending[name]) ? <div className="flex flex-wrap gap-1.5">{pending[name].map((tag) => <span key={tag} className="rounded-lg bg-sky-100 px-2 py-1 text-sky-800 dark:bg-sky-950 dark:text-sky-200">{tag}</span>)}</div> : name === "supplierType" && pending[name] ? t(`supplierOnboarding.type.${pending[name]}`) : pending[name] || "-"}</dd></div>)}
        </dl>
        {pending.documents?.length ? <section className="space-y-3"><h3 className="text-sm font-semibold">{t("supplierOnboarding.documentsTitle")}</h3><SupplierDocumentList supplierId={item.id} documents={pending.documents} /></section> : null}
        <SupplierDocumentLinksList links={pending.documentLinks || []} />
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm">{t("field.hutang")}<select className="erp-field mt-1 w-full" value={String(hutang)} onChange={(event) => setHutang(event.target.value === "true")}><option value="false">{t("common.false")}</option><option value="true">{t("common.true")}</option></select></label>
          <label className="text-sm">{t("field.lamaHutang")}<input className="erp-field mt-1 w-full" type="number" min={1} step={1} required={hutang} disabled={!hutang} value={hutang ? lamaHutang : ""} onChange={(event) => setLamaHutang(event.target.value)} /></label>
        </div>
        <button type="submit" disabled={busy} className="rounded-lg bg-sky-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{t(busy ? "common.loading" : "supplierOnboarding.approve")}</button>
      </form> : null}
      {error ? <p role="alert" className="text-sm text-red-700 dark:text-red-300">{error}</p> : null}
      {notice ? <p role="status" className="text-sm text-emerald-700 dark:text-emerald-300">{notice}</p> : null}
      <ConfirmationModal isOpen={confirmGenerate} cancelLabel={t("common.cancel")} title={t("supplierOnboarding.regenerate")} description={t("supplierOnboarding.regenerateHint")} confirmLabel={t("supplierOnboarding.regenerate")} onConfirm={() => void generate()} onCancel={() => setConfirmGenerate(false)} />
    </section>
  );
}
