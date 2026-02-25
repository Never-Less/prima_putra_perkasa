"use client";

import { FormPreviewStylePage } from "../samples/_components/form-preview-style-page";
import { useI18n } from "../_i18n/provider";

export default function SuratJalanPage() {
  const { t } = useI18n();

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <section className="rounded-2xl border border-sky-100 bg-gradient-to-r from-sky-50 to-white p-5 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">{t("nav.suratJalan")}</h1>
        <p className="mt-1 text-sm text-slate-600">
          {t("suratJalan.page.description")}
        </p>
      </section>

      <div className="mt-5">
        <FormPreviewStylePage />
      </div>
    </main>
  );
}
