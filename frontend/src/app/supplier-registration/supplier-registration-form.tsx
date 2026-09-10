"use client";

import { useEffect, useState } from "react";
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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [retry, setRetry] = useState(0);
  const submitted = supplier?.status === "submitted" || supplier?.status === "completed";
  useUnsavedChangesWarning(!submitted && !saving && Object.values(form).some(Boolean), t("common.unsavedChangesWarning"));

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
    event.preventDefault(); setSaving(true); setError(""); setFieldErrors({});
    try {
      await requestSupplierForm(token, form);
      setSupplier((value) => value ? { ...value, status: "submitted" } : value);
      setForm(emptyForm);
    } catch (error) {
      setError(onboardingError(error));
      if (error instanceof ApiRequestError && error.details && typeof error.details === "object") {
        setFieldErrors((error.details as { errors?: Record<string, string> }).errors || {});
      }
    } finally { setSaving(false); }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900 sm:py-12 dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto max-w-2xl">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><p className="text-sm font-bold tracking-wide text-sky-800 dark:text-sky-200">{t("brand.name")}</p><select aria-label={t("supplierOnboarding.language")} value={locale} onChange={(event) => setLocale(event.target.value === "en" ? "en" : "id")} className="erp-field"><option value="id">{t("nav.language.id")}</option><option value="en">{t("nav.language.en")}</option></select></div>
        <section className="rounded-2xl border border-sky-100 bg-white p-5 shadow-sm sm:p-8 dark:border-sky-900 dark:bg-slate-900">
          <h1 className="text-2xl font-semibold">{t("supplierOnboarding.publicTitle")}</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{t("supplierOnboarding.publicDescription")}</p>
          {loading ? <p role="status" className="mt-6">{t("common.loading")}</p> : null}
          {error ? <div role="alert" className="mt-5 rounded-lg bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-200"><p>{t(error)}</p>{!supplier ? <button className="mt-2 underline" onClick={() => setRetry((value) => value + 1)}>{t("common.retry")}</button> : null}</div> : null}
          {!loading && submitted ? <div role="status" className="mt-6 rounded-xl bg-emerald-50 p-5 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200"><h2 className="font-semibold">{t("supplierOnboarding.successTitle")}</h2><p className="mt-2 text-sm leading-6">{t("supplierOnboarding.successDescription", { name: supplier?.namaSupplier || "" })}</p></div> : null}
          {!loading && supplier && !submitted ? <form onSubmit={(event) => void submit(event)} className="mt-6 space-y-5">
            <label className="block text-sm font-medium">{t("field.namaSupplier")}<input readOnly value={supplier.namaSupplier} className="erp-field mt-1 w-full bg-slate-100 dark:bg-slate-800" /></label>
            <fieldset disabled={saving} className="grid gap-5 sm:grid-cols-2">
              {profileFields.map((field) => {
                const { name, label, max } = field;
                const hint = "hint" in field ? field.hint : undefined;
                const number = name === "phone" || name === "whatsapp";
                const errorId = `${name}-error`;
                const shared = { id: name, name, required: true, maxLength: max, value: form[name], onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => { setForm((value) => ({ ...value, [name]: event.target.value })); setFieldErrors((value) => ({ ...value, [name]: "" })); }, className: "erp-field mt-1 w-full", "aria-invalid": Boolean(fieldErrors[name]), "aria-describedby": `${hint ? `${name}-hint ` : ""}${fieldErrors[name] ? errorId : ""}`.trim() || undefined };
                return <div key={name} className={name === "alamat" || name === "productCategories" || name === "productBrands" ? "sm:col-span-2" : ""}>
                  <label htmlFor={name} className="text-sm font-medium">{t(label)} <span aria-hidden="true">*</span></label>
                  {name === "alamat" ? <textarea {...shared} rows={3} autoComplete="street-address" /> : <input {...shared} type={name === "email" ? "email" : "text"} inputMode={number ? "numeric" : name === "email" ? "email" : undefined} pattern={number ? "[0-9]{7,15}" : name === "npwp" ? "(?:[0-9]{15,16}|[0-9]{2}\\.[0-9]{3}\\.[0-9]{3}\\.[0-9]\\-[0-9]{3}\\.[0-9]{3})" : undefined} autoComplete={name === "email" ? "email" : name === "picName" ? "name" : number ? "tel" : "off"} />}
                  {hint ? <p id={`${name}-hint`} className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">{t(hint)}</p> : null}
                  {fieldErrors[name] ? <p id={errorId} className="mt-1 text-xs text-red-700 dark:text-red-300">{t(fieldErrors[name])}</p> : null}
                </div>;
              })}
            </fieldset>
            <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">{t("supplierOnboarding.submitHint")}</p>
            <button type="submit" disabled={saving} className="w-full rounded-lg bg-sky-700 px-4 py-3 text-sm font-semibold text-white hover:bg-sky-600 disabled:opacity-50">{t(saving ? "common.loading" : "supplierOnboarding.submit")}</button>
          </form> : null}
        </section>
      </div>
    </main>
  );
}
