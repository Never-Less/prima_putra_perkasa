"use client";

import { useI18n } from "../../_i18n/provider";
import { FormPreviewStylePage } from "./form-preview-style-page";

type SuratJalanFormRouteProps = {
  itemId?: string;
};

export function SuratJalanFormRoute({ itemId = "" }: SuratJalanFormRouteProps) {
  const { t } = useI18n();

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <section className="rounded-2xl border border-sky-100 bg-gradient-to-r from-sky-50 to-white p-4 shadow-sm dark:border-slate-800 dark:from-slate-900 dark:to-slate-950 sm:p-5">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100 sm:text-2xl">
          {t("nav.suratJalan")}
        </h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-600 dark:text-slate-300">
          {t("suratJalan.page.description")}
        </p>
      </section>

      <div className="mt-5">
        <FormPreviewStylePage mode="form" itemId={itemId} />
      </div>
    </main>
  );
}
