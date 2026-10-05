"use client";

import { useEffect, useState } from "react";
import { Building2, ContactRound, Tags, Files, CheckCircle2, ArrowRight } from "lucide-react";
import { SupplierTagInput } from "../supplier/_components/supplier-tag-input";
import { normalizeSupplierNumberInput, supplierNpwpPattern } from "../supplier/_lib/supplier-contact";
import { SupplierDocumentLinksEditor } from "../supplier/_components/supplier-document-links";
import { type SupplierDocumentLink, isSupplierDocumentUrl } from "../supplier/_lib/supplier-documents";
import { SupplierDocumentPicker } from "../supplier/_components/supplier-documents";
import { supplierRequestBody, splitSupplierTags } from "../supplier/_lib/supplier-documents";
import { useI18n } from "../_i18n/provider";
import { ApiRequestError } from "../_lib/api-client";
import { useUnsavedChangesWarning } from "../_hooks/use-unsaved-changes-warning";
import { onboardingError, profileFields, requestSupplierForm, type OnboardingStatus } from "../supplier/_lib/supplier-onboarding";

const emptyForm = { alamat: "", npwp: "", picName: "", phone: "", whatsapp: "", email: "", productCategories: "", productBrands: "" };

export function SupplierRegistrationForm() {
  const { t, locale, setLocale } = useI18n();
  const [token, setToken] = useState("");
  const [supplier, setSupplier] = useState<{ namaSupplier: string; status: OnboardingStatus } | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [files, setFiles] = useState<File[]>([]);
  const [documentLinks, setDocumentLinks] = useState<SupplierDocumentLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [retry, setRetry] = useState(0);
  const submitted = supplier?.status === "submitted" || supplier?.status === "completed";
  useUnsavedChangesWarning(!submitted && !saving && (Object.values(form).some(Boolean) || files.length > 0 || documentLinks.length > 0), t("common.unsavedChangesWarning"));

  useEffect(() => {
    let active = true;
    const value = window.location.hash.slice(1);
    async function load() {
      setLoading(true); setError(""); setToken(value);
      try {
        if (!/^[a-f0-9]{64}$/.test(value)) { setError("supplierOnboarding.error.invalidLink"); return; }
        const response = await requestSupplierForm<{ namaSupplier: string; status: OnboardingStatus }>(value);
        if (active) setSupplier(response);
      } catch (error) { if (active) setError(onboardingError(error)); } finally { if (active) setLoading(false); }
    }
    void load();
    return () => { active = false; };
  }, [retry]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (documentLinks.some((link) => !link.label.trim() || !isSupplierDocumentUrl(link.url.trim()))) { setFieldErrors({ documentLinks: "supplierOnboarding.error.documentLinks" }); return; }
    setSaving(true); setError(""); setFieldErrors({});
    try {
      await requestSupplierForm(token, supplierRequestBody({ ...form, documentLinks, productCategories: splitSupplierTags(form.productCategories), productBrands: splitSupplierTags(form.productBrands) }, files));
      setSupplier((value) => value ? { ...value, status: "submitted" } : value);
      setForm(emptyForm);
      setFiles([]);
      setDocumentLinks([]);
    } catch (error) {
      setError(onboardingError(error));
      if (error instanceof ApiRequestError && error.details && typeof error.details === "object") {
        setFieldErrors((error.details as { errors?: Record<string, string> }).errors || {});
      }
    } finally { setSaving(false); }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-sky-50 via-slate-50 to-slate-100 px-4 py-8 text-slate-900 sm:py-12 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900 dark:text-slate-100">
      <div className="mx-auto max-w-3xl">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><p className="text-sm font-bold tracking-wide text-sky-800 dark:text-sky-200">{t("brand.name")}</p><select aria-label={t("supplierOnboarding.language")} value={locale} onChange={(event) => setLocale(event.target.value === "en" ? "en" : "id")} className="erp-field rounded-lg px-3 py-2 text-sm"><option value="id">{t("nav.language.id")}</option><option value="en">{t("nav.language.en")}</option></select></div>
        <section className="overflow-hidden rounded-2xl border border-sky-100 bg-white p-5 shadow-lg shadow-sky-950/5 sm:p-8 dark:border-sky-900 dark:bg-slate-900">
          <div className="mb-5 inline-flex rounded-2xl bg-sky-100 p-3 text-sky-700 dark:bg-sky-950 dark:text-sky-300"><Building2 size={28} aria-hidden="true" /></div>
          <h1 className="text-2xl font-semibold">{t("supplierOnboarding.publicTitle")}</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{t("supplierOnboarding.publicDescription")}</p>
          {loading ? <p role="status" className="mt-6">{t("common.loading")}</p> : null}
          {error ? <div role="alert" className="mt-5 rounded-lg bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-200"><p>{t(error)}</p>{!supplier ? <button className="mt-2 underline" onClick={() => setRetry((value) => value + 1)}>{t("common.retry")}</button> : null}</div> : null}
          {!loading && submitted ? <div role="status" className="mt-6 rounded-xl bg-emerald-50 p-5 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200"><CheckCircle2 size={32} className="mb-3" aria-hidden="true" /><h2 className="font-semibold">{t("supplierOnboarding.successTitle")}</h2><p className="mt-2 text-sm leading-6">{t("supplierOnboarding.successDescription", { name: supplier?.namaSupplier || "" })}</p></div> : null}
          {!loading && supplier && !submitted ? <form onSubmit={(event) => void submit(event)} className="mt-6 space-y-5">
            <div className="rounded-xl border border-sky-100 bg-sky-50/70 p-4 dark:border-sky-900 dark:bg-sky-950/30"><label className="block text-xs font-medium text-sky-800 dark:text-sky-200">{t("field.namaSupplier")}<input readOnly value={supplier.namaSupplier} className="mt-1 w-full bg-transparent text-lg font-semibold text-slate-900 outline-none dark:text-white" /></label><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t("supplierOnboarding.companyLocked")}</p></div>
            {([
              { title: "companySection", description: "companyDescription", icon: Building2, fields: ["alamat", "npwp"] },
              { title: "contactSection", description: "contactDescription", icon: ContactRound, fields: ["picName", "phone", "whatsapp", "email"] },
              { title: "productsSection", description: "productsDescription", icon: Tags, fields: ["productCategories", "productBrands"] },
            ]).map((group) => <fieldset key={group.title} disabled={saving} className="rounded-xl border border-slate-200 p-4 sm:p-5 dark:border-slate-800">
              <legend className="flex items-center gap-2 px-2 text-base font-semibold"><group.icon size={18} className="text-sky-600 dark:text-sky-300" aria-hidden="true" />{t(`supplierOnboarding.${group.title}`)}</legend>
              <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">{t(`supplierOnboarding.${group.description}`)}</p>
              <div className="grid gap-5 sm:grid-cols-2">{profileFields.filter((field) => group.fields.includes(field.name)).map((field) => {
                const { name, label, max } = field;
                const hint = "hint" in field ? field.hint : undefined;
                const number = name === "phone" || name === "whatsapp";
                const numeric = number || name === "npwp";
                const errorId = `${name}-error`;
                const shared = { id: name, name, required: true, maxLength: max, value: form[name], onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => { setForm((value) => ({ ...value, [name]: numeric ? normalizeSupplierNumberInput(event.target.value, name) : event.target.value })); setFieldErrors((value) => ({ ...value, [name]: "" })); }, className: "erp-field mt-2 w-full rounded-lg px-3 py-2.5 text-sm", "aria-invalid": Boolean(fieldErrors[name]), "aria-describedby": `${hint ? `${name}-hint ` : ""}${fieldErrors[name] ? errorId : ""}`.trim() || undefined };
                return <div key={name} className={name === "alamat" || name === "productCategories" || name === "productBrands" ? "sm:col-span-2" : ""}>
                  <label htmlFor={name} className="text-sm font-medium">{t(label)} <span aria-hidden="true">*</span></label>
                  {name === "productCategories" || name === "productBrands" ? <SupplierTagInput id={name} value={form[name]} required disabled={saving} invalid={Boolean(fieldErrors[name])} describedBy={shared["aria-describedby"]} onChange={(value) => { setForm((prev) => ({ ...prev, [name]: value })); setFieldErrors((prev) => ({ ...prev, [name]: "" })); }} /> : name === "alamat" ? <textarea {...shared} rows={3} autoComplete="street-address" /> : <input {...shared} type={name === "email" ? "email" : number ? "tel" : "text"} inputMode={numeric ? "numeric" : name === "email" ? "email" : undefined} pattern={number ? "[0-9]{7,15}" : name === "npwp" ? supplierNpwpPattern : undefined} autoComplete={name === "email" ? "email" : name === "picName" ? "name" : number ? "tel" : "off"} />}
                  {hint ? <p id={`${name}-hint`} className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">{t(hint)}</p> : null}
                  {fieldErrors[name] ? <p id={errorId} className="mt-1 text-xs text-red-700 dark:text-red-300">{t(fieldErrors[name])}</p> : null}
                </div>;
              })}</div>
            </fieldset>)}
            <fieldset disabled={saving} className="rounded-xl border border-slate-200 p-4 sm:p-5 dark:border-slate-800"><legend className="flex flex-wrap items-center gap-2 px-2 text-base font-semibold"><Files size={18} className="text-sky-600 dark:text-sky-300" aria-hidden="true" />{t("supplierOnboarding.documentsTitle")}<span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-normal text-slate-500 dark:bg-slate-800 dark:text-slate-400">{t("supplierOnboarding.optional")}</span></legend><p className="mb-4 text-sm text-slate-500 dark:text-slate-400">{t("supplierOnboarding.documentsDescription")}</p><SupplierDocumentPicker files={files} onChange={setFiles} disabled={saving} /><div className="mt-4"><SupplierDocumentLinksEditor links={documentLinks} onChange={(links) => { setDocumentLinks(links); setFieldErrors((prev) => ({ ...prev, documentLinks: "" })); }} disabled={saving} error={fieldErrors.documentLinks} /></div></fieldset>
            <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">{t("supplierOnboarding.submitHint")}</p>
            <button type="submit" disabled={saving} className="flex w-full items-center justify-center gap-2 rounded-xl bg-sky-700 px-4 py-3.5 text-sm font-semibold text-white shadow-sm hover:bg-sky-600 disabled:opacity-50">{t(saving ? "common.loading" : "supplierOnboarding.submit")}<ArrowRight size={18} aria-hidden="true" /></button>
          </form> : null}
        </section>
      </div>
    </main>
  );
}
