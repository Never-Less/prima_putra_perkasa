"use client";

import { useI18n } from "../../_i18n/provider";
import { FormPreviewStylePage } from "./form-preview-style-page";

type SuratJalanFormRouteProps = {
  itemId?: string;
};

export function SuratJalanFormRoute({ itemId = "" }: SuratJalanFormRouteProps) {
  const { t } = useI18n();

  return (
    <main className="erp-page mx-auto max-w-7xl">
      <section className="erp-panel p-4 sm:p-5">
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
